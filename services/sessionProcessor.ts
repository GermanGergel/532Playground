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

    const { allPlayersStats } = calculateAllStats(session, oldPlayers);
    const playerStatsMap = new Map(allPlayersStats.map(stat => [stat.player.id, stat]));
    
    const playersToSave: Player[] = [];
    
    // --- 1. UPDATE PLAYER LIFETIME STATS ---
    const updatedPlayers = oldPlayers.map(player => {
        // IDEMPOTENCY CHECK: If this session has already been processed for this player, skip them.
        if (player.processedSessionIds?.includes(session.id)) {
            return player;
        }

        const sessionStats = playerStatsMap.get(player.id);
        if (!sessionStats) {
            return player; // Player didn't participate, no changes needed.
        }

        const playerWithUpdatedStats: Player = {
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

        // --- 2. CALCULATE RATINGS, BADGES, and FORM ---
        const badgesEarnedThisSession = calculateEarnedBadges(playerWithUpdatedStats, sessionStats, session, allPlayersStats);
        
        const { delta, breakdown } = calculateRatingUpdate(playerWithUpdatedStats, sessionStats, session, badgesEarnedThisSession);
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
        
        const oldRecords = player.records || {
            bestGoalsInSession: { value: 0, sessionId: '' },
            bestAssistsInSession: { value: 0, sessionId: '' },
            bestWinRateInSession: { value: 0, sessionId: '' },
        };
    
        const newRecords: PlayerRecords = {
            bestGoalsInSession: sessionStats.goals >= oldRecords.bestGoalsInSession.value
                ? { value: sessionStats.goals, sessionId: session.id }
                : oldRecords.bestGoalsInSession,
            bestAssistsInSession: sessionStats.assists >= oldRecords.bestAssistsInSession.value
                ? { value: sessionStats.assists, sessionId: session.id }
                : oldRecords.bestAssistsInSession,
            bestWinRateInSession: sessionWinRate >= oldRecords.bestWinRateInSession.value
                ? { value: sessionWinRate, sessionId: session.id }
                : oldRecords.bestWinRateInSession,
        };
        
        const finalPlayer = { 
            ...playerWithUpdatedStats, 
            rating: newRating, 
            tier: newTier, 
            form: newForm,
            badges: updatedBadges,
            sessionHistory: sessionHistory,
            lastRatingChange: { ...breakdown, badgesEarned: badgesEarnedThisSession },
            records: newRecords,
            processedSessionIds: [...(player.processedSessionIds || []), session.id],
        };
        
        playersToSave.push(finalPlayer);
        return finalPlayer;
    });


    // --- 3. GENERATE NEWS ---
    const newNewsItems = generateNewsUpdates(oldPlayers, updatedPlayers);
    const updatedNewsFeed = newNewsItems.length > 0
        ? manageNewsFeedSize([...newNewsItems, ...newsFeed])
        : newsFeed;

    // --- 4. PREPARE FINAL DATA ---
    const finalSession: Session = { 
        ...session, 
        status: SessionStatus.Completed,
    };

    return {
        updatedPlayers,
        playersToSave,
        finalSession,
        updatedNewsFeed,
    };
};