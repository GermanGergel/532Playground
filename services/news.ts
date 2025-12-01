

import { Player, NewsItem, NewsType, PlayerTier, BadgeType } from '../types';
import { newId } from '../screens/utils';

// --- NEWS GENERATOR SERVICE ---

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
        checkMilestone(news, newPlayer, oldPlayer.totalGoals, newPlayer.totalGoals, [50, 100, 150, 200, 300, 400, 500], 'Goals');
        checkMilestone(news, newPlayer, oldPlayer.totalAssists, newPlayer.totalAssists, [50, 100, 150, 200, 300], 'Assists');
        checkMilestone(news, newPlayer, oldPlayer.totalWins, newPlayer.totalWins, [50, 100, 200], 'Wins');
        checkMilestone(news, newPlayer, oldPlayer.totalSessionsPlayed, newPlayer.totalSessionsPlayed, [50, 100], 'Sessions');

        // 2. TIER CHANGE (Promotion only)
        if (getTierRank(newPlayer.tier) > getTierRank(oldPlayer.tier)) {
            news.push({
                id: newId(),
                playerId: newPlayer.id,
                playerName: newPlayer.nickname,
                playerPhoto: newPlayer.photo,
                type: 'tier_up',
                message: '', // Backward compatibility
                messageKey: 'news_tier_up_message',
                subMessageKey: 'news_tier_up_sub',
                params: { tier: newPlayer.tier.toUpperCase() },
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
                message: '',
                messageKey: 'news_rating_surge_message',
                subMessageKey: 'news_rating_surge_sub',
                params: { ratingDiff: ratingDiff.toFixed(1) },
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
                        message: '',
                        messageKey: 'news_badge_message',
                        subMessageKey: config.subMessageKey,
                        params: { badgeName: config.name },
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
                message: '',
                messageKey: 'news_hot_streak_message',
                subMessageKey: 'news_hot_streak_sub',
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
    label: string
) => {
    milestones.forEach(m => {
        if (oldVal < m && newVal >= m) {
            const lowerLabel = label.toLowerCase();
            news.push({
                id: newId(),
                playerId: player.id,
                playerName: player.nickname,
                playerPhoto: player.photo,
                type: 'milestone',
                message: '', // backward compatibility
                messageKey: 'news_milestone_message',
                subMessageKey: 'news_milestone_sub',
                params: {
                    titleKey: `news_milestone_title_${lowerLabel}`,
                    milestone: m,
                    label: lowerLabel,
                },
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

const getBadgeNewsConfig = (badge: BadgeType): { name: string, subMessageKey: string, isHot: boolean } | null => {
    const map: Partial<Record<BadgeType, { name: string, subMessageKey: string, isHot: boolean }>> = {
        dynasty: { name: "DYNASTY", subMessageKey: "news_badge_dynasty_sub", isHot: true },
        mvp: { name: "MVP", subMessageKey: "news_badge_mvp_sub", isHot: false },
        club_legend_goals: { name: "CLUB LEGEND (Goals)", subMessageKey: "news_badge_club_legend_goals_sub", isHot: true },
        club_legend_assists: { name: "CLUB LEGEND (Assists)", subMessageKey: "news_badge_club_legend_assists_sub", isHot: true },
        perfect_finish: { name: "Perfect Finish", subMessageKey: "news_badge_perfect_finish_sub", isHot: false },
        comeback_kings: { name: "Comeback King", subMessageKey: "news_badge_comeback_kings_sub", isHot: true },
    };
    return map[badge] || null;
};