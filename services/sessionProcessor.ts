
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
    
    // Собираем ID всех, кто реально был на поле в этой сессии
    const participatedIds = new Set(allPlayersStats.map(s => s.player.id));
    
    // Временный массив для новостей о штрафах
    const penaltyNews: NewsItem[] = [];
    const timestamp = new Date().toISOString();

    // --- 1. UPDATE PLAYERS (Participation & Inactivity Logic) ---
    let playersWithUpdatedStats = oldPlayers.map(player => {
        const sessionStats = playerStatsMap.get(player.id);
        
        if (sessionStats) {
            // PLAYER PLAYED: Update stats normally
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
                consecutiveMissedSessions: 0, // Reset inactivity counter
            };
            return updatedPlayer;
        } else {
            // PLAYER MISSED: Check for inactivity penalty
            const currentMissed = (player.consecutiveMissedSessions || 0) + 1;
            let newRating = player.rating;
            let penaltyApplied = false;

            // Apply penalty every 3rd missed session (3, 6, 9...)
            if (currentMissed > 0 && currentMissed % 3 === 0) {
                // Определяем "пол" (нижнюю границу). 
                // Это СТРОГО стартовый рейтинг игрока. Если его нет в базе (старый аккаунт), берем 68.
                const floor = player.initialRating !== undefined ? player.initialRating : 68;

                // Рейтинг падает, ТОЛЬКО если он сейчас выше стартового.
                // Если рейтинг 73, а старт был 70 -> падает до 72.
                // Если рейтинг 70, а старт был 70 -> НЕ падает.
                if (newRating > floor) {
                    newRating -= 1;
                    penaltyApplied = true;
                }
            }

            // Generate Penalty News for transparency
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
                    statsSnapshot: { rating: newRating, tier: getTierForRating(newRating) },
                    priority: 5
                });
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
            
            // Apply Rating Floor (cannot drop below starting rating even if performance was poor)
            const floor = player.initialRating || 68;
            const unifiedNewRating = Math.max(floor, Math.round(breakdown.newRating));
            
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
                lastRatingChange: { ...breakdown, newRating: unifiedNewRating, badgesEarned: badgesEarnedThisSession },
                records: newRecords,
            };
        }
        return player;
    });

    // Генерируем новости только для ПРИСУТСТВУЮЩИХ (participatedIds)
    const newGameplayNews = generateNewsUpdates(oldPlayers, playersWithCalculatedRatings, participatedIds);
    
    // Объединяем новости игры и новости штрафов
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
