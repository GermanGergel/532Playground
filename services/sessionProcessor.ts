
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
 * Принудительный пересчет статистики для исторической сессии.
 * Используется для восстановления данных, если автоматический расчет не сработал.
 */
export const recalculateHistoricalSession = (
    session: Session,
    currentPlayers: Player[]
): Player[] => {
    const { allPlayersStats } = calculateAllStats(session);
    const playerStatsMap = new Map(allPlayersStats.map(stat => [stat.player.id, stat]));
    
    return currentPlayers.map(player => {
        const sessionStats = playerStatsMap.get(player.id);
        if (!sessionStats) return player;

        // 1. Вычисляем бейджи и дельту рейтинга
        const badgesEarned = calculateEarnedBadges(player, sessionStats, session, allPlayersStats);
        const { breakdown } = calculateRatingUpdate(player, sessionStats, session, badgesEarned);
        
        const floor = player.initialRating || 68;
        const unifiedNewRating = Math.max(floor, Math.round(breakdown.newRating));
        const finalChange = unifiedNewRating - player.rating;

        // 2. Обновляем бейджи (инкрементально)
        const updatedBadges = { ...player.badges };
        badgesEarned.forEach(badge => {
            updatedBadges[badge] = (updatedBadges[badge] || 0) + 1;
        });

        // 3. Обновляем историю рейтинга
        const dateStr = new Date(session.date).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit' });
        const historyEntry: PlayerHistoryEntry = {
            date: dateStr,
            rating: unifiedNewRating,
            winRate: sessionStats.gamesPlayed > 0 ? Math.round((sessionStats.wins / sessionStats.gamesPlayed) * 100) : 0,
            goals: sessionStats.goals,
            assists: sessionStats.assists
        };

        const updatedHistory = [...(player.historyData || [])];
        // Проверяем, нет ли уже записи за эту дату, чтобы не дублировать при повторном нажатии
        if (!updatedHistory.find(h => h.date === dateStr)) {
            updatedHistory.push(historyEntry);
        }
        if (updatedHistory.length > 12) updatedHistory.shift();

        return {
            ...player,
            totalGoals: player.totalGoals + sessionStats.goals,
            totalAssists: player.totalAssists + sessionStats.assists,
            totalGames: player.totalGames + sessionStats.gamesPlayed,
            totalWins: player.totalWins + sessionStats.wins,
            totalSessionsPlayed: (player.totalSessionsPlayed || 0) + 1,
            rating: unifiedNewRating,
            tier: getTierForRating(unifiedNewRating),
            badges: updatedBadges,
            historyData: updatedHistory,
            lastRatingChange: {
                ...breakdown,
                finalChange,
                newRating: unifiedNewRating,
                badgesEarned
            }
        };
    });
};

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
    
    const sessionDate = new Date(session.date);
    const sessionMonthKey = `${sessionDate.getFullYear()}-${sessionDate.getMonth()}`;

    let playersWithUpdatedStats = oldPlayers.map(player => {
        const sessionStats = playerStatsMap.get(player.id);
        const floor = player.initialRating || 68;
        
        if (sessionStats) {
            const lastPlayedDate = player.lastPlayedAt ? new Date(player.lastPlayedAt) : new Date(0);
            const lastPlayedMonthKey = `${lastPlayedDate.getFullYear()}-${lastPlayedDate.getMonth()}`;
            const isSameMonth = sessionMonthKey === lastPlayedMonthKey;

            const baseMonthly = isSameMonth ? {
                goals: player.monthlyGoals,
                assists: player.monthlyAssists,
                games: player.monthlyGames,
                wins: player.monthlyWins,
                sessions: player.monthlySessionsPlayed || 0
            } : {
                goals: 0,
                assists: 0,
                games: 0,
                wins: 0,
                sessions: 0
            };

            const updatedPlayer: Player = {
                ...player,
                totalGames: player.totalGames + sessionStats.gamesPlayed,
                totalGoals: player.totalGoals + sessionStats.goals,
                totalAssists: player.totalAssists + sessionStats.assists,
                totalWins: player.totalWins + sessionStats.wins,
                totalDraws: player.totalDraws + sessionStats.draws,
                totalLosses: player.totalLosses + sessionStats.losses,
                totalSessionsPlayed: (player.totalSessionsPlayed || 0) + 1,
                
                monthlyGames: baseMonthly.games + sessionStats.gamesPlayed,
                monthlyGoals: baseMonthly.goals + sessionStats.goals,
                monthlyAssists: baseMonthly.assists + sessionStats.assists,
                monthlyWins: baseMonthly.wins + sessionStats.wins,
                monthlySessionsPlayed: baseMonthly.sessions + 1,
                
                lastPlayedAt: session.date,
                consecutiveMissedSessions: 0,
            };
            return updatedPlayer;
        } else {
            const currentMissed = (player.consecutiveMissedSessions || 0) + 1;
            let newRating = player.rating;
            let actualPenaltyDelta = 0;
            const isImmune = !!player.isImmuneToPenalty;

            if (!isImmune && currentMissed > 0 && currentMissed % 5 === 0) {
                if (newRating > floor) {
                    const targetRating = Math.max(floor, newRating - 1);
                    actualPenaltyDelta = targetRating - newRating;
                    newRating = targetRating;
                }
            }

            const updatedPlayer = {
                ...player,
                consecutiveMissedSessions: currentMissed,
                rating: Math.round(newRating),
                tier: getTierForRating(Math.round(newRating)),
            };

            if (actualPenaltyDelta < 0) {
                updatedPlayer.lastRatingChange = {
                    previousRating: player.rating,
                    teamPerformance: 0,
                    individualPerformance: 0,
                    badgeBonus: 0,
                    finalChange: actualPenaltyDelta,
                    newRating: Math.round(newRating),
                    badgesEarned: []
                };

                penaltyNews.push({
                    id: newId(),
                    playerId: player.id,
                    playerName: player.nickname,
                    type: 'penalty',
                    message: `${player.nickname} received inactivity penalty (${actualPenaltyDelta.toFixed(1)} OVR)`,
                    subMessage: `#Inactive #${currentMissed}Missed`,
                    timestamp: timestamp,
                    isHot: false,
                    statsSnapshot: { rating: Math.round(newRating), tier: getTierForRating(Math.round(newRating)) },
                    priority: 5
                });

                const dateStr = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit' });
                const currentWinRate = player.totalGames > 0 ? Math.round((player.totalWins / player.totalGames) * 100) : 0;
                
                const penaltyHistoryEntry: PlayerHistoryEntry = {
                    date: dateStr,
                    rating: Math.round(newRating),
                    winRate: currentWinRate,
                    goals: 0,
                    assists: 0
                };
                
                const historyData = [...(player.historyData || [])];
                historyData.push(penaltyHistoryEntry);
                if (historyData.length > 12) historyData.shift();
                updatedPlayer.historyData = historyData;
            }

            return updatedPlayer;
        }
    });

    let playersWithCalculatedRatings = playersWithUpdatedStats.map(player => {
        const sessionStats = playerStatsMap.get(player.id);
        if (sessionStats) {
            const badgesEarnedThisSession = calculateEarnedBadges(player, sessionStats, session, allPlayersStats);
            const { delta, breakdown } = calculateRatingUpdate(player, sessionStats, session, badgesEarnedThisSession);
            
            const floor = player.initialRating || 68;
            const rawNewRating = Math.round(breakdown.newRating);
            const unifiedNewRating = Math.max(floor, rawNewRating);
            const finalChange = unifiedNewRating - player.rating;
            
            let newForm: 'hot_streak' | 'stable' | 'cold_streak' = 'stable';
            if (finalChange >= 0.5) newForm = 'hot_streak';
            else if (finalChange <= -0.5) newForm = 'cold_streak';
            
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

            const safePlayerRecords = (player.records || {}) as any;
            const getSafeValue = (rec: any) => (rec && typeof rec.value === 'number') ? rec : { value: 0, sessionId: '' };

            const newRecords: PlayerRecords = {
                bestGoalsInSession: sessionStats.goals >= getSafeValue(safePlayerRecords.bestGoalsInSession).value
                    ? { value: sessionStats.goals, sessionId: session.id }
                    : getSafeValue(safePlayerRecords.bestGoalsInSession),
                bestAssistsInSession: sessionStats.assists >= getSafeValue(safePlayerRecords.bestAssistsInSession).value
                    ? { value: sessionStats.assists, sessionId: session.id }
                    : getSafeValue(safePlayerRecords.bestAssistsInSession),
                bestWinRateInSession: sessionWinRate >= getSafeValue(safePlayerRecords.bestWinRateInSession).value
                    ? { value: sessionWinRate, sessionId: session.id }
                    : getSafeValue(safePlayerRecords.bestWinRateInSession),
            };

            return { 
                ...player, 
                rating: unifiedNewRating, 
                tier: newTier, 
                form: newForm,
                badges: updatedBadges,
                sessionHistory,
                historyData,
                lastRatingChange: { ...breakdown, finalChange, newRating: unifiedNewRating, badgesEarned: badgesEarnedThisSession },
                records: newRecords,
            };
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
