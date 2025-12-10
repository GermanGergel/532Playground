
import { Session, Player, NewsItem, BadgeType, SessionStatus, PlayerRecords } from '../types';
import { calculateAllStats } from './statistics';
import { calculateEarnedBadges, calculateRatingUpdate, getTierForRating } from './rating';
import { generateNewsUpdates, manageNewsFeedSize } from './news';

interface ProcessedSessionResult {
    updatedPlayers: Player[];
    playersToSave: Player[];
    finalSession: Session;
    updatedNewsFeed: NewsItem[];
}

/**
 * Takes a finished session and all player/news data, processes all calculations
 * (stats, ratings, badges, news), and returns the updated data structures,
 * ready to be saved to the database and state.
 * This function is "pure" and does not have side effects.
 */
export const processFinishedSession = ({
    session,
    oldPlayers,
    newsFeed,
}: {
    session: Session;
    oldPlayers: Player[];
    newsFeed: NewsItem[];
}): ProcessedSessionResult => {

    const { allPlayersStats } = calculateAllStats(session);
    const playerStatsMap = new Map(allPlayersStats.map(stat => [stat.player.id, stat]));
    
    // --- 1. UPDATE PLAYER LIFETIME STATS ---
    let playersWithUpdatedStats = oldPlayers.map(player => {
        const sessionStats = playerStatsMap.get(player.id);
        if (sessionStats) {
            const updatedPlayer: Player = {
                ...player,
                totalGames: player.totalGames + sessionStats.gamesPlayed,
                totalGoals: player.totalGoals + sessionStats.goals,
                totalAssists: player.totalAssists + sessionStats.assists,
                totalWins: player.totalWins + sessionStats.wins,
                totalDraws: player.totalDraws + sessionStats.draws,
                totalLosses: player.totalLosses + sessionStats.losses,
                totalSessionsPlayed: (player.totalSessionsPlayed || 0) + 1,
                monthlyGames: player.monthlyGames + sessionStats.gamesPlayed,
                monthlyGoals: player.monthlyGoals + sessionStats.goals,
                monthlyAssists: player.monthlyAssists + sessionStats.assists,
                monthlyWins: player.monthlyWins + sessionStats.wins,
                monthlySessionsPlayed: (player.monthlySessionsPlayed || 0) + 1,
                lastPlayedAt: new Date().toISOString(),
            };
            return updatedPlayer;
        }
        return player;
    });

    // --- 2. CALCULATE RATINGS, BADGES, and FORM ---
    let playersWithCalculatedRatings = playersWithUpdatedStats.map(player => {
        const sessionStats = playerStatsMap.get(player.id);
        if (sessionStats) {
            const badgesEarnedThisSession = calculateEarnedBadges(player, sessionStats, session, allPlayersStats);
            
            const { delta, breakdown } = calculateRatingUpdate(player, sessionStats, session, badgesEarnedThisSession);
            const newRating = Math.round(player.rating + delta);
            
            let newForm: 'hot_streak' | 'stable' | 'cold_streak' = 'stable';
            if (delta >= 0.5) newForm = 'hot_streak';
            else if (delta <= -0.5) newForm = 'cold_streak';
            
            const newTier = getTierForRating(newRating);

            const updatedBadges: Partial<Record<BadgeType, number>> = { ...player.badges };
            badgesEarnedThisSession.forEach(badge => {
                updatedBadges[badge] = (updatedBadges[badge] || 0) + 1;
            });
            
            const sessionHistory = [...(player.sessionHistory || [])];
            const sessionWinRate = sessionStats.gamesPlayed > 0 ? Math.round((sessionStats.wins / sessionStats.gamesPlayed) * 100) : 0;
            if (sessionStats.gamesPlayed > 0) {
                sessionHistory.push({ winRate: sessionWinRate });
            }
            if (sessionHistory.length > 5) sessionHistory.shift();
            
            // FIX: Robust check for existing records to prevent crashes
            const getSafeRecord = (rec: any) => (rec && typeof rec.value === 'number') ? rec : { value: 0, sessionId: '' };
            
            const oldGoalsRec = getSafeRecord(player.records?.bestGoalsInSession);
            const oldAssistsRec = getSafeRecord(player.records?.bestAssistsInSession);
            const oldWinRateRec = getSafeRecord(player.records?.bestWinRateInSession);
        
            const newRecords: PlayerRecords = {
                bestGoalsInSession: sessionStats.goals >= oldGoalsRec.value
                    ? { value: sessionStats.goals, sessionId: session.id }
                    : oldGoalsRec,
                bestAssistsInSession: sessionStats.assists >= oldAssistsRec.value
                    ? { value: sessionStats.assists, sessionId: session.id }
                    : oldAssistsRec,
                bestWinRateInSession: sessionWinRate >= oldWinRateRec.value
                    ? { value: sessionWinRate, sessionId: session.id }
                    : oldWinRateRec,
            };

            return { 
                ...player, 
                rating: newRating, 
                tier: newTier, 
                form: newForm,
                badges: updatedBadges,
                sessionHistory: sessionHistory,
                lastRatingChange: { ...breakdown, badgesEarned: badgesEarnedThisSession },
                records: newRecords,
            };
        }
        return player;
    });

    // --- 3. GENERATE NEWS ---
    const newNewsItems = generateNewsUpdates(oldPlayers, playersWithCalculatedRatings);
    const updatedNewsFeed = newNewsItems.length > 0
        ? manageNewsFeedSize([...newNewsItems, ...newsFeed])
        : newsFeed;

    // --- 4. PREPARE FINAL DATA ---
    const finalSession: Session = { 
        ...session, 
        status: SessionStatus.Completed,
    };

    const playersToSave = playersWithCalculatedRatings.filter(p => playerStatsMap.has(p.id));

    return {
        updatedPlayers: playersWithCalculatedRatings,
        playersToSave,
        finalSession,
        updatedNewsFeed,
    };
};
