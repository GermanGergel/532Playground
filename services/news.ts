
import { Player, NewsItem, NewsType, PlayerTier, BadgeType } from '../types';
import { newId } from '../screens/utils';

// --- NEWS GENERATOR SERVICE ---

const getNewsPriority = (item: Omit<NewsItem, 'id' | 'timestamp'>): number => {
    switch(item.type) {
        case 'tier_up':
            return (item.statsSnapshot?.tier === PlayerTier.Legend || item.statsSnapshot?.tier === PlayerTier.Elite) ? 10 : 8;
        case 'badge':
            return item.isHot ? 9 : 7;
        case 'milestone':
            const milestoneValue = parseInt(item.message.match(/\d+/)?.[0] || '0', 10);
            return milestoneValue >= 100 ? 8 : 6;
        default:
            return 0;
    }
}

export const generateNewsUpdates = (oldPlayers: Player[], newPlayers: Player[]): NewsItem[] => {
    const potentialNews: Omit<NewsItem, 'id' | 'timestamp'>[] = [];
    const timestamp = new Date().toISOString();

    const oldPlayerMap = new Map(oldPlayers.map(p => [p.id, p]));

    newPlayers.forEach(newPlayer => {
        const oldPlayer = oldPlayerMap.get(newPlayer.id);
        if (!oldPlayer) return;

        checkMilestone(potentialNews, newPlayer, oldPlayer.totalGoals, newPlayer.totalGoals, [50, 100, 200, 300, 400, 500, 1000], 'Goals', 'GOAL MACHINE');
        checkMilestone(potentialNews, newPlayer, oldPlayer.totalAssists, newPlayer.totalAssists, [50, 100, 150, 200, 300], 'Assists', 'THE ARCHITECT');
        checkMilestone(potentialNews, newPlayer, oldPlayer.totalWins, newPlayer.totalWins, [50, 100, 200, 300], 'Wins', 'BORN WINNER');
        checkMilestone(potentialNews, newPlayer, oldPlayer.totalSessionsPlayed, newPlayer.totalSessionsPlayed, [50, 100, 200], 'Sessions', 'CLUB LEGEND');

        const oldRank = getTierRank(oldPlayer.tier);
        const newRank = getTierRank(newPlayer.tier);
        
        if (newRank > oldRank && newRank >= 3) {
            potentialNews.push({
                playerId: newPlayer.id,
                playerName: newPlayer.nickname,
                type: 'tier_up',
                message: `${newPlayer.nickname} promoted to ${newPlayer.tier.toUpperCase()}`,
                subMessage: `#LevelUp #${newPlayer.tier}`,
                isHot: newPlayer.tier === PlayerTier.Legend || newPlayer.tier === PlayerTier.Elite,
                statsSnapshot: { rating: newPlayer.rating, tier: newPlayer.tier }
            });
        }

        const oldBadges = Object.keys(oldPlayer.badges || {}).length;
        const newBadges = Object.keys(newPlayer.badges || {}).length;
        
        if (newBadges > oldBadges) {
            const earned = (Object.keys(newPlayer.badges || {}) as BadgeType[]).filter(b => !(oldPlayer.badges || {})[b]);
            earned.forEach(badge => {
                const config = getBadgeNewsConfig(badge);
                if (config) {
                    potentialNews.push({
                        playerId: newPlayer.id,
                        playerName: newPlayer.nickname,
                        type: 'badge',
                        message: `${newPlayer.nickname} unlocked ${config.name}`,
                        subMessage: `${config.hashtags}`,
                        isHot: config.isHot,
                        statsSnapshot: { rating: newPlayer.rating, tier: newPlayer.tier }
                    });
                }
            });
        }
    });

    const sortedNews = potentialNews
        .map(item => ({ ...item, priority: getNewsPriority(item) }))
        .sort((a, b) => b.priority - a.priority);
        
    return sortedNews.slice(0, 10).map(item => ({
        ...item,
        id: newId(),
        timestamp: timestamp
    }));
};

/**
 * ОЧИСТКА ЛЕНТЫ.
 * Оставляет новости ТОЛЬКО за последние 24 часа.
 * Старые сессии больше не будут отображаться.
 */
export const manageNewsFeedSize = (currentFeed: NewsItem[]): NewsItem[] => {
    const now = Date.now();
    const ONE_DAY_MS = 24 * 60 * 60 * 1000;

    return currentFeed
        .filter(item => {
            const itemTs = new Date(item.timestamp).getTime();
            // СТРОГО: Только то, что произошло за последние 24 часа.
            return (now - itemTs) < ONE_DAY_MS;
        })
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, 50); // Лимит количества на всякий случай
};

// Helpers
const checkMilestone = (news: Omit<NewsItem, 'id' | 'timestamp'>[], player: Player, oldVal: number, newVal: number, milestones: number[], label: string, title: string) => {
    milestones.forEach(m => {
        if (oldVal < m && newVal >= m) {
            news.push({
                playerId: player.id,
                playerName: player.nickname,
                type: 'milestone',
                message: `${title}: ${player.nickname} hit ${m} ${label}!`,
                subMessage: `#Milestone #${m}${label}`,
                isHot: m >= 100,
                statsSnapshot: { rating: player.rating, tier: player.tier }
            });
        }
    });
};

const getTierRank = (tier: PlayerTier): number => {
    switch (tier) {
        case PlayerTier.Legend: return 5;
        case PlayerTier.Elite: return 4;
        case PlayerTier.Strong: return 3;
        case PlayerTier.Average: return 2;
        case PlayerTier.Developing: return 1;
        default: return 0;
    }
};

const getBadgeNewsConfig = (badge: BadgeType): { name: string, hashtags: string, isHot: boolean } | null => {
    const map: Partial<Record<BadgeType, { name: string, hashtags: string, isHot: boolean }>> = {
        dynasty: { name: "DYNASTY", hashtags: "#Invincible", isHot: true },
        career_100_wins: { name: "CENTURION", hashtags: "#100Wins", isHot: true },
        career_150_influence: { name: "ICON", hashtags: "#Legend", isHot: true },
        career_super_veteran: { name: "SUPER VETERAN", hashtags: "#Loyalty", isHot: true },
        club_legend_goals: { name: "CLUB LEGEND", hashtags: "#Goals", isHot: true },
        club_legend_assists: { name: "CLUB LEGEND", hashtags: "#Assists", isHot: true },
        comeback_kings: { name: "Comeback King", hashtags: "#NeverGiveUp", isHot: true },
        double_agent: { name: "DOUBLE AGENT", hashtags: "#Mercenary", isHot: true },
        iron_lung: { name: "IRON LUNG", hashtags: "#Stamina", isHot: true },
        mvp: { name: "MVP", hashtags: "#SessionBest", isHot: false },
        goleador: { name: "Goleador", hashtags: "#Scorer", isHot: false },
        assistant: { name: "Assistant", hashtags: "#Playmaker", isHot: false },
        sniper: { name: "Sniper", hashtags: "#Clutch", isHot: false },
        fortress: { name: "Fortress", hashtags: "#CleanSheet", isHot: false },
    };
    return map[badge] || null;
};
