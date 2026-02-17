import { Session, Player, NewsItem, BadgeType, SessionStatus } from '../types';
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

    const { allPlayersStats } = calculateAllStats(session, oldPlayers);
    const playerStatsMap = new Map(allPlayersStats.map(stat => [stat.player.id, stat]));
    
    const participatedIds = new Set(allPlayersStats.map(s => s.player.id));
    const penaltyNews: NewsItem[] = [];
    const timestamp = new Date().toISOString();
    
    const sessionDate = new Date(session.date);
    const sessionMonthKey = `${sessionDate.getFullYear()}-${sessionDate.getMonth()}`;

    // 1. UPDATE PLAYERS
    let playersWithUpdatedStats = oldPlayers.map(player => {
        const sessionStats = playerStatsMap.get(player.id);
        const floor = player.initialRating || 68;
        
        // Если игрок был в сессии и РЕАЛЬНО играл
        if (sessionStats && sessionStats.gamesPlayed > 0) {
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
        } else {
            // Игрока не было
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

            // Добавляем точку в историю ТОЛЬКО если был штраф (чтобы график отразил падение)
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

                const dateStr = new Date(session.date).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit' });
                const historyData = [...(player.historyData || [])];
                historyData.push({ date: dateStr, rating: Math.round(newRating), winRate: 0, goals: 0, assists: 0 });
                if (historyData.length > 12) historyData.shift();
                updatedPlayer.historyData = historyData;
            }

            return updatedPlayer;
        }
    });

    // 2. CALCULATE RATINGS & BADGES (Только для активных участников)
    let playersWithCalculatedRatings = playersWithUpdatedStats.map(player => {
        const sessionStats = playerStatsMap.get(player.id);
        if (sessionStats && sessionStats.gamesPlayed > 0) {
            const badgesEarnedThisSession = calculateEarnedBadges(player, sessionStats, session, allPlayersStats);
            const { breakdown } = calculateRatingUpdate(player, sessionStats, session, badgesEarnedThisSession);
            
            const floor = player.initialRating || 68;
            const unifiedNewRating = Math.max(floor, Math.round(breakdown.newRating));
            const finalChange = unifiedNewRating - player.rating;
            
            let newForm: 'hot_streak' | 'stable' | 'cold_streak' = 'stable';
            if (finalChange >= 0.5) newForm = 'hot_streak';
            else if (finalChange <= -0.5) newForm = 'cold_streak';
            
            const updatedBadges: Partial<Record<BadgeType, number>> = { ...player.badges };
            badgesEarnedThisSession.forEach(badge => {
                updatedBadges[badge] = (updatedBadges[badge] || 0) + 1;
            });
            
            const sessionHistory = [...(player.sessionHistory || [])];
            const sessionWinRate = sessionStats.gamesPlayed > 0 ? Math.round((sessionStats.wins / sessionStats.gamesPlayed) * 100) : 0;
            sessionHistory.push({ winRate: sessionWinRate });
            if (sessionHistory.length > 5) sessionHistory.shift();
            
            const dateStr = new Date(session.date).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit' });
            const historyData = [...(player.historyData || [])];
            historyData.push({ date: dateStr, rating: unifiedNewRating, winRate: sessionWinRate, goals: sessionStats.goals, assists: sessionStats.assists });
            if (historyData.length > 12) historyData.shift();

            return { 
                ...player, 
                rating: unifiedNewRating, 
                tier: getTierForRating(unifiedNewRating), 
                form: newForm,
                badges: updatedBadges,
                sessionHistory,
                historyData,
                lastRatingChange: { ...breakdown, finalChange, newRating: unifiedNewRating, badgesEarned: badgesEarnedThisSession },
            };
        }
        return player;
    });

    const newGameplayNews = generateNewsUpdates(oldPlayers, playersWithCalculatedRatings, participatedIds);
    const allNewNews = [...newGameplayNews, ...penaltyNews];

    return {
        updatedPlayers: playersWithCalculatedRatings,
        playersToSave: playersWithCalculatedRatings,
        finalSession: { ...session, status: SessionStatus.Completed },
        updatedNewsFeed: allNewNews.length > 0 ? manageNewsFeedSize([...allNewNews, ...newsFeed]) : newsFeed,
    };
};