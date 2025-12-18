
import { 
    loadPlayersFromDB, 
    loadActiveSessionFromDB, 
    loadHistoryFromDB, 
    loadNewsFromDB, 
    loadLanguageFromDB, 
    loadActiveVoicePackFromDB,
    savePlayersToDB
} from '../db';
import { Player, Session, NewsItem } from '../types';
import { Language } from '../translations/index';

export const initializeAppState = async () => {
    const playersRaw = await loadPlayersFromDB();
    let initialPlayers: Player[] = playersRaw || [];
    
    const session: Session | null = (await loadActiveSessionFromDB()) || null;
    const history: Session[] = (await loadHistoryFromDB(10)) || [];
    const newsFeed: NewsItem[] = (await loadNewsFromDB(20)) || [];
    const language: Language = (await loadLanguageFromDB()) as Language || 'en';
    const activeVoicePack: number = (await loadActiveVoicePackFromDB()) || 1;

    let needsSync = false;

    // Migration loop to ensure all required fields exist and ratings are consistent
    initialPlayers = initialPlayers.map(p => {
        const migratedPlayer = { ...p };

        // --- CRITICAL FIX: Reconciliation logic ---
        // If player has a record of their last rating change, make sure the main rating matches it.
        // This fixes the "70 on card vs 72 in analysis" issue automatically.
        if (migratedPlayer.lastRatingChange && migratedPlayer.lastRatingChange.newRating !== undefined) {
            const actualNewRating = Math.round(migratedPlayer.lastRatingChange.newRating);
            if (migratedPlayer.rating !== actualNewRating) {
                migratedPlayer.rating = actualNewRating;
                needsSync = true;
            }
        }

        // Ensure overall rating is always an integer
        const roundedRating = Math.round(migratedPlayer.rating || 60);
        if (migratedPlayer.rating !== roundedRating) {
            migratedPlayer.rating = roundedRating;
            needsSync = true;
        }

        // Badge data migration from string array to object counter for older data
        if (Array.isArray(migratedPlayer.badges)) {
            const badgeObj: Partial<Record<string, number>> = {};
            (migratedPlayer.badges as any[]).forEach(b => {
                badgeObj[b] = (badgeObj[b] || 0) + 1;
            });
            migratedPlayer.badges = badgeObj as any;
            needsSync = true;
        } else if (!migratedPlayer.badges) {
            migratedPlayer.badges = {};
            needsSync = true;
        }

        if (!migratedPlayer.skills) {
            migratedPlayer.skills = [];
            needsSync = true;
        }
        
        if (!migratedPlayer.records) {
            migratedPlayer.records = {
                bestGoalsInSession: { value: 0, sessionId: '' },
                bestAssistsInSession: { value: 0, sessionId: '' },
                bestWinRateInSession: { value: 0, sessionId: '' },
            };
            needsSync = true;
        }

        return migratedPlayer;
    });

    // If we fixed any data issues during load, push it back to the database silently
    if (needsSync) {
        savePlayersToDB(initialPlayers).catch(e => console.warn("Background migration sync failed", e));
    }

    return {
        players: initialPlayers,
        session,
        history,
        newsFeed,
        language,
        activeVoicePack
    };
};
