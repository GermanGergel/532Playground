
import { Session, Player, NewsItem, SessionStatus, PlayerRecords } from '../types';
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
    
    const sessionDate = new Date(session.date);
    const sessionMonthKey = `${sessionDate.getFullYear()}-${sessionDate.getMonth()}`;

    // 1. Сначала подготавливаем базовые инкременты (Месячная статка и пропуски)
    const playersWithUpdatedStats: Player[] = oldPlayers.map(player => {
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
                goals: 0, assists: 0, games: 0, wins: 0, sessions: 0
            };

            return {
                ...player,
                monthlyGames: baseMonthly.games + sessionStats.gamesPlayed,
                monthlyGoals: baseMonthly.goals + sessionStats.goals,
                monthlyAssists: baseMonthly.assists + sessionStats.assists,
                monthlyWins: baseMonthly.wins + sessionStats.wins,
                monthlySessionsPlayed: baseMonthly.sessions + 1,
                
                lastPlayedAt: session.date,
                consecutiveMissedSessions: 0,
            };
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
                    teamPerformance: 0, individualPerformance: 0, badgeBonus: 0,
                    finalChange: actualPenaltyDelta,
                    newRating: Math.round(newRating),
                    badgesEarned: []
                };

                penaltyNews.push({
                    id: newId(), playerId: player.id, playerName: player.nickname,
                    type: 'penalty',
                    message: `${player.nickname} received inactivity penalty (${actualPenaltyDelta.toFixed(1)} OVR)`,
                    subMessage: `#Inactive #${currentMissed}Missed`,
                    timestamp: timestamp, isHot: false,
                    statsSnapshot: { rating: Math.round(newRating), tier: getTierForRating(Math.round(newRating)) },
                    priority: 5
                });

                const dateStr = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit' });
                const currentWinRate = player.totalGames > 0 ? Math.round((player.totalWins / player.totalGames) * 100) : 0;
                
                const penaltyHistoryEntry = {
                    date: dateStr, rating: Math.round(newRating), winRate: currentWinRate, goals: 0, assists: 0
                };
                
                const historyData = [...(player.historyData || [])];
                historyData.push(penaltyHistoryEntry);
                if (historyData.length > 12) historyData.shift();
                updatedPlayer.historyData = historyData;
            }

            return updatedPlayer;
        }
    });

    // 2. Рассчитываем рейтинг и награды
    let playersWithCalculatedRatings: Player[] = playersWithUpdatedStats.map(updatedPlayer => {
        const sessionStats = playerStatsMap.get(updatedPlayer.id);
        const originalPlayer = oldPlayers.find(p => p.id === updatedPlayer.id);
        
        if (sessionStats && originalPlayer) {
            const badgesEarnedThisSession = calculateEarnedBadges(originalPlayer, sessionStats, session, allPlayersStats);
            const { breakdown } = calculateRatingUpdate(originalPlayer, sessionStats, session, badgesEarnedThisSession);
            
            const floor = originalPlayer.initialRating || 68;
            const unifiedNewRating = Math.max(floor, Math.round(breakdown.newRating));
            const finalChange = unifiedNewRating - originalPlayer.rating;
            
            let newForm: 'hot_streak' | 'stable' | 'cold_streak' = 'stable';
            if (finalChange >= 0.5) newForm = 'hot_streak';
            else if (finalChange <= -0.5) newForm = 'cold_streak';
            
            const updatedBadges = { ...updatedPlayer.badges };
            badgesEarnedThisSession.forEach(badge => {
                updatedBadges[badge] = (updatedBadges[badge] || 0) + 1;
            });
            
            const sessionHistory = [...(updatedPlayer.sessionHistory || [])];
            const sessionWinRate = sessionStats.gamesPlayed > 0 ? Math.round((sessionStats.wins / sessionStats.gamesPlayed) * 100) : 0;
            if (sessionStats.gamesPlayed > 0) sessionHistory.push({ winRate: sessionWinRate });
            if (sessionHistory.length > 5) sessionHistory.shift();
            
            const dateStr = new Date(session.date).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit' });
            const newHistoryEntry = {
                date: dateStr, rating: unifiedNewRating, winRate: sessionWinRate, goals: sessionStats.goals, assists: sessionStats.assists
            };
            
            const historyData = [...(updatedPlayer.historyData || [])];
            historyData.push(newHistoryEntry);
            if (historyData.length > 12) historyData.shift();

            const safePlayerRecords = (updatedPlayer.records || {}) as any;
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
                ...updatedPlayer, 
                rating: unifiedNewRating, 
                tier: getTierForRating(unifiedNewRating), 
                form: newForm,
                badges: updatedBadges,
                sessionHistory,
                historyData,
                lastRatingChange: { ...breakdown, finalChange, newRating: unifiedNewRating, badgesEarned: badgesEarnedThisSession },
                records: newRecords,
            };
        }
        return updatedPlayer;
    });

    // 3. ОБНОВЛЯЕМ КАРЬЕРНУЮ СТАТИСТИКУ (INCREMENTAL UPDATE)
    // Вместо полной пересборки из истории (которая может быть неполной), 
    // мы просто прибавляем результаты текущей сессии к существующим итогам.
    playersWithCalculatedRatings = playersWithCalculatedRatings.map(player => {
        const sessionStats = playerStatsMap.get(player.id);
        if (sessionStats) {
            return {
                ...player,
                totalGoals: (player.totalGoals || 0) + sessionStats.goals,
                totalAssists: (player.totalAssists || 0) + sessionStats.assists,
                totalGames: (player.totalGames || 0) + sessionStats.gamesPlayed,
                totalWins: (player.totalWins || 0) + sessionStats.wins,
                totalDraws: (player.totalDraws || 0) + sessionStats.draws,
                totalLosses: (player.totalLosses || 0) + sessionStats.losses,
                totalSessionsPlayed: (player.totalSessionsPlayed || 0) + 1
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
