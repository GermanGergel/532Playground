
import { Session, Player, NewsItem, BadgeType, SessionStatus, PlayerRecords, PlayerHistoryEntry } from '../types';
import { calculateAllStats } from './statistics';
import { calculateEarnedBadges, calculateRatingUpdate, getTierForRating } from './rating';
import { generateNewsUpdates, manageNewsFeedSize } from './news';
import { newId } from '../screens/utils';

interface ProcessedSessionResult {
    updatedPlayers: Player[];
    playersToSave: Player[];
    finalSession: Session;
    updatedNewsFeed: NewsItem[];
}

/**
 * Takes a finished session and all player/news data, processes all calculations
 * (stats, ratings, badges, news), and returns the updated data structures.
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
    
    const penaltyNews: NewsItem[] = [];

    // --- 1. UPDATE PLAYERS (Participation & Inactivity Logic) ---
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
                consecutiveMissedSessions: 0, 
            };
            return updatedPlayer;
        } else {
            const currentMissed = (player.consecutiveMissedSessions || 0) + 1;
            let newRating = player.rating;

            if (currentMissed > 0 && currentMissed % 3 === 0) {
                newRating = Math.max(0, newRating - 1); 
            }

            return {
                ...player,
                consecutiveMissedSessions: currentMissed,
                rating: Math.round(newRating),
                tier: getTierForRating(Math.round(newRating)),
            };
        }
    });

    // --- 2. CALCULATE RATINGS, BADGES, and FORM ---
    let playersWithCalculatedRatings = playersWithUpdatedStats.map(player => {
        const sessionStats = playerStatsMap.get(player.id);
        if (sessionStats) {
            const badgesEarnedThisSession = calculateEarnedBadges(player, sessionStats, session, allPlayersStats);
            
            const { delta, breakdown } = calculateRatingUpdate(player, sessionStats, session, badgesEarnedThisSession);
            
            // --- UNIFIED RATING FIX ---
            // Calculate once to ensure card header and analysis block are 100% in sync
            const unifiedNewRating = Math.round(breakdown.newRating);
            
            let newForm: 'hot_streak' | 'stable' | 'cold_streak' = 'stable';
            if (delta >= 0.5) newForm = 'hot_streak';
            else if (delta <= -0.5) newForm = 'cold_streak';
            
            const newTier = getTierForRating(unifiedNewRating);

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
            
            const dateStr = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit' });
            
            const newHistoryEntry: PlayerHistoryEntry = {
                date: dateStr,
                rating: unifiedNewRating,
                winRate: sessionWinRate,
                goals: sessionStats.goals,
                assists: sessionStats.assists
            };
            
            const historyData = [...(player.historyData || [])];
            historyData.push(newHistoryEntry);
            if (historyData.length > 12) historyData.shift();

            const getSafeRecord = (rec: any) => (rec && typeof rec.value === 'number') ? rec : { value: 0, sessionId: '' };
            const safePlayerRecords = (player.records || {}) as any;

            const oldGoalsRec = getSafeRecord(safePlayerRecords.bestGoalsInSession);
            const oldAssistsRec = getSafeRecord(safePlayerRecords.bestAssistsInSession);
            const oldWinRateRec = getSafeRecord(safePlayerRecords.bestWinRateInSession);
        
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
                rating: unifiedNewRating, 
                tier: newTier, 
                form: newForm,
                badges: updatedBadges,
                sessionHistory: sessionHistory,
                historyData: historyData,
                // Synchronize breakdown object as well
                lastRatingChange: { ...breakdown, newRating: unifiedNewRating, badgesEarned: badgesEarnedThisSession },
                records: newRecords,
            };
        }
        return player;
    });

    const newGameplayNews = generateNewsUpdates(oldPlayers, playersWithCalculatedRatings);
    const allNewNews = [...newGameplayNews, ...penaltyNews];
    const updatedNewsFeed = allNewNews.length > 0
        ? manageNewsFeedSize([...allNewNews, ...newsFeed])
        : newsFeed;

    const finalSession: Session = { 
        ...session, 
        status: SessionStatus.Completed,
    };

    return {
        updatedPlayers: playersWithCalculatedRatings,
        playersToSave: playersWithCalculatedRatings,
        finalSession,
        updatedNewsFeed,
    };
};
