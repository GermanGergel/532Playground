
import { Player, NewsItem, NewsType, PlayerTier, BadgeType } from '../types';
import { newId } from '../screens/utils';

// --- NEWS GENERATOR SERVICE ---

const STANDARD_HASHTAGS = "#532Playground #ClubNews";

// Determines if a change is significant enough to be news
export const generateNewsUpdates = (oldPlayers: Player[], newPlayers: Player[]): NewsItem[] => {
    const news: NewsItem[] = [];
    const timestamp = new Date().toISOString();

    // Map old players for easy lookup
    const oldPlayerMap = new Map(oldPlayers.map(p => [p.id, p]));

    newPlayers.forEach(newPlayer => {
        const oldPlayer = oldPlayerMap.get(newPlayer.id);
        if (!oldPlayer) return; // New player added, skip for now to avoid spam

        // 1. MILESTONES (Goals/Assists/Wins)
        checkMilestone(news, newPlayer, oldPlayer.totalGoals, newPlayer.totalGoals, [50, 100, 150, 200, 300, 400, 500], 'Goals', 'GOAL MACHINE');
        checkMilestone(news, newPlayer, oldPlayer.totalAssists, newPlayer.totalAssists, [50, 100, 150, 200, 300], 'Assists', 'THE ARCHITECT');
        checkMilestone(news, newPlayer, oldPlayer.totalWins, newPlayer.totalWins, [50, 100, 200], 'Wins', 'BORN WINNER');
        checkMilestone(news, newPlayer, oldPlayer.totalSessionsPlayed, newPlayer.totalSessionsPlayed, [50, 100], 'Sessions', 'CLUB VETERAN');

        // 2. TIER CHANGE (Promotion only)
        if (getTierRank(newPlayer.tier) > getTierRank(oldPlayer.tier)) {
            news.push({
                id: newId(),
                playerId: newPlayer.id,
                playerName: newPlayer.nickname,
                playerPhoto: newPlayer.photo,
                type: 'tier_up',
                message: `${newPlayer.nickname} has been promoted to ${newPlayer.tier.toUpperCase()} tier!`,
                subMessage: `${STANDARD_HASHTAGS} #LevelUp #${newPlayer.tier} #532Elite`,
                timestamp,
                isHot: newPlayer.tier === PlayerTier.Legend || newPlayer.tier === PlayerTier.Elite,
                statsSnapshot: { rating: newPlayer.rating, tier: newPlayer.tier }
            });
        }

        // 3. RATING SURGE (Big jump in one session)
        const ratingDiff = newPlayer.rating - oldPlayer.rating;
        if (ratingDiff >= 1.5) {
             news.push({
                id: newId(),
                playerId: newPlayer.id,
                playerName: newPlayer.nickname,
                playerPhoto: newPlayer.photo,
                type: 'rating_surge',
                message: `${newPlayer.nickname} creates chaos! Rating skyrocketed by +${ratingDiff.toFixed(1)} in one session.`,
                subMessage: `${STANDARD_HASHTAGS} #OnFire #Unstoppable #RatingBoost`,
                timestamp,
                isHot: true,
                statsSnapshot: { rating: newPlayer.rating, tier: newPlayer.tier }
            });
        }

        // 4. RARE BADGES EARNED
        const oldBadges = Object.keys(oldPlayer.badges || {}).length;
        const newBadges = Object.keys(newPlayer.badges || {}).length;
        
        if (newBadges > oldBadges) {
            // Find which badges are new
            const earned = (Object.keys(newPlayer.badges || {}) as BadgeType[]).filter(b => !(oldPlayer.badges || {})[b]);
            
            earned.forEach(badge => {
                const config = getBadgeNewsConfig(badge);
                if (config) {
                    news.push({
                        id: newId(),
                        playerId: newPlayer.id,
                        playerName: newPlayer.nickname,
                        playerPhoto: newPlayer.photo,
                        type: 'badge',
                        message: `${newPlayer.nickname} unlocked the ${config.name} badge!`,
                        subMessage: `${STANDARD_HASHTAGS} ${config.hashtags}`,
                        timestamp,
                        isHot: config.isHot,
                        statsSnapshot: { rating: newPlayer.rating, tier: newPlayer.tier }
                    });
                }
            });
        }

        // 5. FORM CHANGE (Cold -> Hot)
        if (oldPlayer.form !== 'hot_streak' && newPlayer.form === 'hot_streak') {
             news.push({
                id: newId(),
                playerId: newPlayer.id,
                playerName: newPlayer.nickname,
                playerPhoto: newPlayer.photo,
                type: 'hot_streak',
                message: `${newPlayer.nickname} is heating up! Currently on a HOT STREAK.`,
                subMessage: `${STANDARD_HASHTAGS} #HotStreak #InForm`,
                timestamp,
                isHot: false, // Standard news
                statsSnapshot: { rating: newPlayer.rating, tier: newPlayer.tier }
            });
        }
    });

    return news;
};

// --- FEED MANAGEMENT (Cleanup) ---

export const manageNewsFeedSize = (currentFeed: NewsItem[]): NewsItem[] => {
    const now = Date.now();
    const HOT_NEWS_TTL = 30 * 24 * 60 * 60 * 1000; // 30 Days
    const REGULAR_NEWS_TTL = 7 * 24 * 60 * 60 * 1000; // 7 Days
    const MAX_ITEMS = 50;

    // 1. Filter by Expiry
    const filteredFeed = currentFeed.filter(item => {
        const itemTime = new Date(item.timestamp).getTime();
        const age = now - itemTime;
        const ttl = item.isHot ? HOT_NEWS_TTL : REGULAR_NEWS_TTL;
        return age < ttl;
    });

    // 2. Sort by newest first
    const sortedFeed = filteredFeed.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    // 3. Limit to MAX_ITEMS
    return sortedFeed.slice(0, MAX_ITEMS);
};


// Helper for milestones
const checkMilestone = (
    news: NewsItem[], 
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
                id: newId(),
                playerId: player.id,
                playerName: player.nickname,
                playerPhoto: player.photo,
                type: 'milestone',
                message: `${title}: ${player.nickname} reached ${m} career ${label}!`,
                subMessage: `${STANDARD_HASHTAGS} #Milestone #${m}${label}`,
                timestamp: new Date().toISOString(),
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

const getBadgeNewsConfig = (badge: BadgeType): { name: string, hashtags: string, isHot: boolean } | null => {
    const map: Partial<Record<BadgeType, { name: string, hashtags: string, isHot: boolean }>> = {
        dynasty: { name: "DYNASTY", hashtags: "#Invincible #Dynasty", isHot: true },
        mvp: { name: "MVP", hashtags: "#MVP #SessionBest", isHot: false },
        club_legend_goals: { name: "CLUB LEGEND (Goals)", hashtags: "#Legend #Goals", isHot: true },
        club_legend_assists: { name: "CLUB LEGEND (Assists)", hashtags: "#Legend #Assists", isHot: true },
        perfect_finish: { name: "Perfect Finish", hashtags: "#Clinical", isHot: false },
        comeback_kings: { name: "Comeback King", hashtags: "#NeverGiveUp", isHot: true },
    };
    return map[badge] || null;
};
