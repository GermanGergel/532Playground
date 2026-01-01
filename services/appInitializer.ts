
import { Session, Player, NewsItem, BadgeType, PlayerRecords, PlayerHistoryEntry, RatingBreakdown } from '../types';
import { Language } from '../translations/index';
import {
    loadPlayersFromDB,
    loadActiveSessionFromDB,
    loadHistoryFromDB,
    loadLanguageFromDB,
    loadNewsFromDB,
    saveNewsToDB,
    loadActiveVoicePackFromDB,
    savePlayersToDB
} from '../db';
import { getTierForRating } from './rating';

interface InitialAppState {
    session: Session | null;
    players: Player[];
    history: Session[];
    newsFeed: NewsItem[];
    language: Language;
    activeVoicePack: number;
}

export const initializeAppState = async (): Promise<InitialAppState> => {
    const loadedSession = await loadActiveSessionFromDB() || null;
    const loadedHistoryData = await loadHistoryFromDB(20) || [];
    const loadedPlayersData = await loadPlayersFromDB();
    let initialPlayers: Player[] = Array.isArray(loadedPlayersData) ? loadedPlayersData : [];
    
    let dataRepaired = false;

    // --- RETROACTIVE PENALTY CHECK ---
    // This ensures players who haven't played in a while get penalized immediately on app load
    initialPlayers = initialPlayers.map(p => {
        const migratedPlayer = { ...p };

        // 1. Basic Migration & Floor Setup
        if (migratedPlayer.initialRating === undefined || migratedPlayer.initialRating === null) {
            migratedPlayer.initialRating = 68;
            dataRepaired = true;
        }
        
        if (migratedPlayer.rating < 68) {
            migratedPlayer.rating = 68;
            dataRepaired = true;
        }

        // 2. Inactivity analysis based on history
        if (loadedHistoryData.length > 0 && migratedPlayer.status === 'confirmed') {
            const lastPlayedDate = new Date(migratedPlayer.lastPlayedAt || migratedPlayer.createdAt).getTime();
            const missedSessionsCount = loadedHistoryData.filter(s => 
                s.status === 'completed' && 
                new Date(s.date).getTime() > lastPlayedDate
            ).length;

            migratedPlayer.consecutiveMissedSessions = missedSessionsCount;

            // If they missed 3+ and their last rating change isn't already a penalty
            // OR if the rating is currently higher than it should be based on skips
            if (missedSessionsCount >= 3 && (!migratedPlayer.lastRatingChange?.isPenalty)) {
                const penaltyAmount = Math.floor(missedSessionsCount / 3);
                const floor = migratedPlayer.initialRating || 68;
                
                // We only apply -1 per 3 sessions, but let's see if we should trigger the UI block
                if (migratedPlayer.rating > floor) {
                    const prevRating = migratedPlayer.rating;
                    const newRating = Math.max(floor, prevRating - 1);
                    
                    if (newRating < prevRating) {
                        migratedPlayer.rating = newRating;
                        migratedPlayer.lastRatingChange = {
                            previousRating: prevRating,
                            newRating: newRating,
                            finalChange: -1,
                            teamPerformance: 0,
                            individualPerformance: 0,
                            badgeBonus: 0,
                            badgesEarned: [],
                            isPenalty: true
                        };
                        dataRepaired = true;
                    }
                }
            }
        }

        // 3. Recalculate Tier
        const correctTier = getTierForRating(migratedPlayer.rating);
        if (migratedPlayer.tier !== correctTier) {
            migratedPlayer.tier = correctTier;
            dataRepaired = true;
        }

        // 4. Badges & Records Cleanup
        let badges: Partial<Record<BadgeType, number>> = {};
        if (Array.isArray(migratedPlayer.badges)) {
            (migratedPlayer.badges as unknown as BadgeType[]).forEach((badge: BadgeType) => {
                badges[badge] = (badges[badge] || 0) + 1;
            });
            migratedPlayer.badges = badges;
            dataRepaired = true;
        }

        const existingRecords = migratedPlayer.records as any;
        if (!existingRecords || typeof existingRecords !== 'object') {
            migratedPlayer.records = {
                bestGoalsInSession: { value: 0, sessionId: '' },
                bestAssistsInSession: { value: 0, sessionId: '' },
                bestWinRateInSession: { value: 0, sessionId: '' },
            };
            dataRepaired = true;
        }

        return migratedPlayer as Player;
    });

    if (dataRepaired) {
        savePlayersToDB(initialPlayers).catch(e => console.warn("Sync failed", e));
    }

    const loadedNews = await loadNewsFromDB(15);
    const initialNewsFeed = Array.isArray(loadedNews) ? loadedNews : [];
    const loadedLang = await loadLanguageFromDB() || 'en';
    const loadedPack = await loadActiveVoicePackFromDB() || 1;

    return {
        session: loadedSession,
        players: initialPlayers,
        history: loadedHistoryData,
        newsFeed: initialNewsFeed,
        language: loadedLang,
        activeVoicePack: loadedPack,
    };
};
