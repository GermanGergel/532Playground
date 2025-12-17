
import { Player, NewsItem, NewsType, PlayerTier, BadgeType } from '../types';
import { newId } from '../screens/utils';

// --- NEWS GENERATOR SERVICE ---

// Helper to assign a priority to a news item
const getNewsPriority = (item: Omit<NewsItem, 'id' | 'timestamp'>): number => {
    switch(item.type) {
        case 'tier_up':
            // Priority for Legend/Elite promotions
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

// Determines if a change is significant enough to be news
export const generateNewsUpdates = (oldPlayers: Player[], newPlayers: Player[]): NewsItem[] => {
    const potentialNews: Omit<NewsItem, 'id' | 'timestamp'>[] = [];
    const timestamp = new Date().toISOString();

    const oldPlayerMap = new Map(oldPlayers.map(p => [p.id, p]));

    newPlayers.forEach(newPlayer => {
        const oldPlayer = oldPlayerMap.get(newPlayer.id);
        if (!oldPlayer) return;

        // 1. MILESTONES (STRICTER THRESHOLDS)
        // Only celebrate significant numbers to avoid spam
        checkMilestone(potentialNews, newPlayer, oldPlayer.totalGoals, newPlayer.totalGoals, [50, 100, 200, 300, 400, 500, 1000], 'Goals', 'GOAL MACHINE');
        checkMilestone(potentialNews, newPlayer, oldPlayer.totalAssists, newPlayer.totalAssists, [50, 100, 150, 200, 300], 'Assists', 'THE ARCHITECT');
        checkMilestone(potentialNews, newPlayer, oldPlayer.totalWins, newPlayer.totalWins, [50, 100, 200, 300], 'Wins', 'BORN WINNER');
        checkMilestone(potentialNews, newPlayer, oldPlayer.totalSessionsPlayed, newPlayer.totalSessionsPlayed, [50, 100, 200], 'Sessions', 'CLUB LEGEND');

        // 2. TIER CHANGE (High Level Promotions Only)
        // We filter out low-level promotions (e.g. Developing -> Average) to reduce noise.
        // Only showing promotions to Strong, Elite, or Legend.
        const oldRank = getTierRank(oldPlayer.tier);
        const newRank = getTierRank(newPlayer.tier);
        
        // Rank 3 is Strong, 4 is Elite, 5 is Legend. 
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

        // 3. RARE BADGES EARNED
        // We only generate news for specific, high-value badges configured in `getBadgeNewsConfig`
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

        // 4. FORM CHANGE REMOVED
        // "Hot Streak" news removed to reduce "trash" updates as requested.
    });

    // Sort by priority and take strictly the top 5 most important events
    const sortedNews = potentialNews
        .map(item => ({ ...item, priority: getNewsPriority(item) }))
        .sort((a, b) => b.priority - a.priority);
        
    return sortedNews.slice(0, 5).map(item => ({
        ...item,
        id: newId(),
        timestamp: timestamp
    }));
};

// --- FEED MANAGEMENT (Aggressive Cleanup) ---

export const manageNewsFeedSize = (currentFeed: NewsItem[]): NewsItem[] => {
    const now = Date.now();
    const HOT_NEWS_TTL = 30 * 24 * 60 * 60 * 1000; // 30 Days for important stuff
    
    // Rule: We only keep the VERY LATEST 5 "regular" items. 
    // Anything older than the top 5 regulars is considered "trash" from previous sessions.
    const REGULAR_ITEMS_LIMIT = 5;

    // 1. Separate Hot and Regular
    let hotItems = currentFeed.filter(item => item.isHot);
    let regularItems = currentFeed.filter(item => !item.isHot);

    // 2. Filter Hot by Time (30 days)
    hotItems = hotItems.filter(item => {
        const age = now - new Date(item.timestamp).getTime();
        return age < HOT_NEWS_TTL;
    });

    // 3. Filter Regular by Count (Strict Limit: 5)
    // Sort by newest first
    regularItems.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    // Keep only the newest ones
    regularItems = regularItems.slice(0, REGULAR_ITEMS_LIMIT);

    // 4. Combine and Sort
    const finalFeed = [...hotItems, ...regularItems].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return finalFeed;
};


// Helper for milestones
const checkMilestone = (
    news: Omit<NewsItem, 'id' | 'timestamp'>[], 
    player: Player, 
    oldVal: number, 
    newVal: number, 
    milestones: number[], 
    label: string, 
    title: string
) => {
    milestones.forEach(m => {
        if (oldVal < m && newVal >= m) {
            news.push({
                playerId: player.id,
                playerName: player.nickname,
                type: 'milestone',
                message: `${title}: ${player.nickname} hit ${m} ${label}!`,
                subMessage: `#Milestone #${m}${label}`,
                isHot: m >= 100, // 100+ is hot
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

// ONLY High-Value Badges generate news now. Common ones are ignored.
const getBadgeNewsConfig = (badge: BadgeType): { name: string, hashtags: string, isHot: boolean } | null => {
    const map: Partial<Record<BadgeType, { name: string, hashtags: string, isHot: boolean }>> = {
        // ULTRA RARE (Hot News)
        dynasty: { name: "DYNASTY", hashtags: "#Invincible", isHot: true },
        career_100_wins: { name: "CENTURION", hashtags: "#100Wins", isHot: true },
        career_150_influence: { name: "ICON", hashtags: "#Legend", isHot: true },
        career_super_veteran: { name: "SUPER VETERAN", hashtags: "#Loyalty", isHot: true },
        
        // HARD TO GET (Hot News)
        club_legend_goals: { name: "CLUB LEGEND", hashtags: "#Goals", isHot: true },
        club_legend_assists: { name: "CLUB LEGEND", hashtags: "#Assists", isHot: true },
        comeback_kings: { name: "Comeback King", hashtags: "#NeverGiveUp", isHot: true },
        double_agent: { name: "DOUBLE AGENT", hashtags: "#Mercenary", isHot: true },
        iron_lung: { name: "IRON LUNG", hashtags: "#Stamina", isHot: true },

        // SESSION BESTS (Regular News - No Spam)
        mvp: { name: "MVP", hashtags: "#SessionBest", isHot: false },
        goleador: { name: "Goleador", hashtags: "#Scorer", isHot: false }, // 7 Goals is hard
        assistant: { name: "Assistant", hashtags: "#Playmaker", isHot: false }, // 6 Assists is hard
        sniper: { name: "Sniper", hashtags: "#Clutch", isHot: false },
        fortress: { name: "Fortress", hashtags: "#CleanSheet", isHot: false },
        
        // Removed: First Blood, Duplet, Maestro (Too common)
    };
    return map[badge] || null;
};
