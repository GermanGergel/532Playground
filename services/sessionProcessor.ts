
import { Session, Player, NewsItem, BadgeType, SessionStatus, PlayerRecords, PlayerHistoryEntry, RatingBreakdown, PlayerForm } from '../types';
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
    
    const participatedIds = new Set(allPlayersStats.map(s => s.player.id));
    const penaltyNews: NewsItem[] = [];
    const timestamp = new Date().toISOString();

    // --- 1. UPDATE PLAYERS (Participation & Inactivity Logic) ---
    let playersWithUpdatedStats: Player[] = oldPlayers.map(player => {
        const sessionStats = playerStatsMap.get(player.id);
        
        // Define the hard floor for this specific player
        const floor = player.initialRating !== undefined ? player.initialRating : 68;

        if (sessionStats) {
            return {
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
            } as Player;
        } else {
            const currentMissed = (player.consecutiveMissedSessions || 0) + 1;
            let currentRating = player.rating;
            let penaltyApplied = false;
            let penaltyBreakdown: RatingBreakdown | undefined = undefined;

            // Apply penalty only if rating is ABOVE the set floor
            if (currentMissed > 0 && currentMissed % 3 === 0) {
                if (currentRating > floor) {
                    const oldRating = currentRating;
                    currentRating -= 1;
                    // Final safety check after subtraction
                    currentRating = Math.max(floor, currentRating);
                    
                    if (currentRating < oldRating) {
                        penaltyApplied = true;
                        penaltyBreakdown = {
                            previousRating: oldRating,
                            teamPerformance: 0,
                            individualPerformance: 0,
                            badgeBonus: 0,
                            finalChange: -1.0,
                            newRating: currentRating,
                            badgesEarned: [],
                            type: 'penalty' as const
                        };
                    }
                }
            }

            if (penaltyApplied) {
                penaltyNews.push({
                    id: newId(),
                    playerId: player.id,
                    playerName: player.nickname,
                    type: 'penalty',
                    message: `${player.nickname} received inactivity penalty (-1 OVR)`,
                    subMessage: `#Inactive #${currentMissed}Missed`,
                    timestamp: timestamp,
                    isHot: false,
                    statsSnapshot: { rating: currentRating, tier: getTierForRating(currentRating) },
                    priority: 5
                });
            }

            return {
                ...player,
                consecutiveMissedSessions: currentMissed,
                rating: Math.round(currentRating),
                tier: getTierForRating(Math.round(currentRating)),
                lastRatingChange: penaltyApplied ? penaltyBreakdown : player.lastRatingChange
            } as Player;
        }
    });

    // --- 2. CALCULATE RATINGS FOR PLAYERS WHO ACTUALLY PLAYED ---
    let playersWithCalculatedRatings: Player[] = playersWithUpdatedStats.map(player => {
        const sessionStats = playerStatsMap.get(player.id);
        if (sessionStats) {
            const badgesEarnedThisSession = calculateEarnedBadges(player, sessionStats, session, allPlayersStats);
            const { delta, breakdown } = calculateRatingUpdate(player, sessionStats, session, badgesEarnedThisSession);
            
            // Apply Rating Floor (Personal initial value or 68)
            const floor = player.initialRating || 68;
            const unifiedNewRating = Math.max(floor, Math.round(breakdown.newRating));
            
            let newForm: PlayerForm = 'stable';
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

            return { 
                ...player, 
                rating: unifiedNewRating, 
                tier: newTier, 
                form: newForm,
                badges: updatedBadges,
                sessionHistory: sessionHistory,
                historyData: historyData,
                lastRatingChange: { 
                    ...breakdown, 
                    newRating: unifiedNewRating, 
                    badgesEarned: badgesEarnedThisSession, 
                    type: 'match' as const 
                },
                records: player.records,
            } as Player;
        }
        return player;
    });

    const newGameplayNews = generateNewsUpdates(oldPlayers, playersWithCalculatedRatings, participatedIds);
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
