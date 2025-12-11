
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
    
    // List to hold penalty news items
    const penaltyNews: NewsItem[] = [];

    // --- 1. UPDATE PLAYERS (Participation & Inactivity Logic) ---
    let playersWithUpdatedStats = oldPlayers.map(player => {
        const sessionStats = playerStatsMap.get(player.id);
        
        if (sessionStats) {
            // PLAYER PARTICIPATED
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
                // Reset inactivity counter because they played
                consecutiveMissedSessions: 0, 
            };
            return updatedPlayer;
        } else {
            // PLAYER MISSED SESSION (Rating Decay Logic)
            const currentMissed = (player.consecutiveMissedSessions || 0) + 1;
            let newRating = player.rating;
            let decayApplied = false;

            // Rule: Every 3 missed sessions, deduct 1 point.
            if (currentMissed > 0 && currentMissed % 3 === 0) {
                newRating = Math.max(0, newRating - 1); // Deduct 1 point, but not below 0
                decayApplied = true;
                
                // Add news item about penalty
                penaltyNews.push({
                    id: newId(),
                    playerId: player.id,
                    playerName: player.nickname,
                    playerPhoto: player.photo,
                    type: 'penalty',
                    message: `${player.nickname} lost 1 rating point due to inactivity.`,
                    subMessage: '#Inactivity #RatingDecay #ComeBack',
                    timestamp: new Date().toISOString(),
                    isHot: false,
                    statsSnapshot: { rating: newRating, tier: getTierForRating(newRating) }
                });
            }

            return {
                ...player,
                consecutiveMissedSessions: currentMissed,
                rating: newRating,
                tier: getTierForRating(newRating), // Update tier if rating dropped
                // If rating changed due to decay, we could potentially update lastRatingChange, 
                // but usually we leave that for actual gameplay updates.
            };
        }
    });

    // --- 2. CALCULATE RATINGS, BADGES, and FORM (Only for participants) ---
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
            
            // Session Trend (Win Rates)
            const sessionHistory = [...(player.sessionHistory || [])];
            const sessionWinRate = sessionStats.gamesPlayed > 0 ? Math.round((sessionStats.wins / sessionStats.gamesPlayed) * 100) : 0;
            if (sessionStats.gamesPlayed > 0) {
                sessionHistory.push({ winRate: sessionWinRate });
            }
            if (sessionHistory.length > 5) sessionHistory.shift();
            
            // --- NEW: LONG TERM HISTORY FOR CHART ---
            // Format: "DD.MM"
            const dateStr = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit' });
            
            const newHistoryEntry: PlayerHistoryEntry = {
                date: dateStr,
                rating: newRating,
                winRate: sessionWinRate,
                goals: player.totalGoals, // Cumulative goals for growth chart
                assists: player.totalAssists
            };
            
            const historyData = [...(player.historyData || [])];
            historyData.push(newHistoryEntry);
            
            // Keep last 12 sessions for chart scrolling
            if (historyData.length > 12) historyData.shift();
            // ----------------------------------------

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
                rating: newRating, 
                tier: newTier, 
                form: newForm,
                badges: updatedBadges,
                sessionHistory: sessionHistory,
                historyData: historyData, // Saved here
                lastRatingChange: { ...breakdown, badgesEarned: badgesEarnedThisSession },
                records: newRecords,
            };
        }
        return player;
    });

    // --- 3. GENERATE NEWS ---
    // Standard news for participants
    const newGameplayNews = generateNewsUpdates(oldPlayers, playersWithCalculatedRatings);
    
    // Combine gameplay news with penalty news
    const allNewNews = [...newGameplayNews, ...penaltyNews];

    const updatedNewsFeed = allNewNews.length > 0
        ? manageNewsFeedSize([...allNewNews, ...newsFeed])
        : newsFeed;

    // --- 4. PREPARE FINAL DATA ---
    const finalSession: Session = { 
        ...session, 
        status: SessionStatus.Completed,
    };

    const playersToSave = playersWithCalculatedRatings;

    return {
        updatedPlayers: playersWithCalculatedRatings,
        playersToSave,
        finalSession,
        updatedNewsFeed,
    };
};
