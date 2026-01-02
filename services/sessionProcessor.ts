
import { Session, Player, NewsItem, BadgeType, SessionStatus, PlayerRecords, PlayerHistoryEntry, PlayerForm } from '../types';
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
    // FIX: Explicitly type the result array as Player[] to avoid inference issues with optional/calculated fields.
    let playersWithUpdatedStats: Player[] = oldPlayers.map(player => {
        const sessionStats = playerStatsMap.get(player.id);
        const floor = player.initialRating || 68;
        
        if (sessionStats) {
            // PLAYER PLAYED
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
            // PLAYER MISSED
            const currentMissed = (player.consecutiveMissedSessions || 0) + 1;
            let currentRating = player.rating;
            let actualPenaltyDelta = 0;

            // Apply penalty every 3rd missed session
            if (currentMissed > 0 && currentMissed % 3 === 0) {
                if (currentRating > floor) {
                    // Penalty is -1.0, but restricted by the floor
                    const targetRating = Math.max(floor, currentRating - 1);
                    actualPenaltyDelta = targetRating - currentRating;
                    currentRating = targetRating;
                }
            }

            // FIX: Explicitly typed the mapped object as Player to satisfy the map return type.
            const updatedPlayer: Player = {
                ...player,
                consecutiveMissedSessions: currentMissed,
                rating: Math.round(currentRating),
                tier: getTierForRating(Math.round(currentRating)),
            };

            if (actualPenaltyDelta < 0) {
                updatedPlayer.lastRatingChange = {
                    previousRating: player.rating,
                    teamPerformance: 0,
                    individualPerformance: 0,
                    badgeBonus: 0,
                    finalChange: actualPenaltyDelta,
                    newRating: Math.round(currentRating),
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
                    statsSnapshot: { rating: Math.round(currentRating), tier: getTierForRating(Math.round(currentRating)) },
                    priority: 5
                });
            }

            return updatedPlayer;
        }
    });

    // --- 2. CALCULATE RATINGS ---
    // FIX: Added Player[] type to the result and cast the form property to PlayerForm to resolve union type incompatibility.
    let playersWithCalculatedRatings: Player[] = playersWithUpdatedStats.map(player => {
        const sessionStats = playerStatsMap.get(player.id);
        if (sessionStats) {
            const badgesEarnedThisSession = calculateEarnedBadges(player, sessionStats, session, allPlayersStats);
            const { delta, breakdown } = calculateRatingUpdate(player, sessionStats, session, badgesEarnedThisSession);
            
            // PROTECT FLOOR during gameplay too
            const floor = player.initialRating || 68;
            const rawNewRating = Math.round(breakdown.newRating);
            const unifiedNewRating = Math.max(floor, rawNewRating);
            const finalChange = unifiedNewRating - player.rating;
            
            const updatedBadges: Partial<Record<BadgeType, number>> = { ...player.badges };
            badgesEarnedThisSession.forEach(badge => {
                updatedBadges[badge] = (updatedBadges[badge] || 0) + 1;
            });

            return { 
                ...player, 
                rating: unifiedNewRating, 
                tier: getTierForRating(unifiedNewRating), 
                form: (finalChange >= 0.5 ? 'hot_streak' : finalChange <= -0.5 ? 'cold_streak' : 'stable') as PlayerForm,
                badges: updatedBadges,
                lastRatingChange: { 
                    ...breakdown, 
                    finalChange: Number(finalChange.toFixed(1)), 
                    newRating: unifiedNewRating, 
                    badgesEarned: badgesEarnedThisSession 
                },
            } as Player;
        }
        return player;
    });

    const newGameplayNews = generateNewsUpdates(oldPlayers, playersWithCalculatedRatings, participatedIds);
    const updatedNewsFeed = manageNewsFeedSize([...newGameplayNews, ...penaltyNews, ...newsFeed]);

    return {
        updatedPlayers: playersWithCalculatedRatings,
        playersToSave: playersWithCalculatedRatings,
        finalSession: { ...session, status: SessionStatus.Completed },
        updatedNewsFeed,
    };
};
