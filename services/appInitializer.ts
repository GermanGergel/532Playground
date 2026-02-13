import { Session, Player, NewsItem, BadgeType, PlayerRecords, PlayerHistoryEntry } from '../types';
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
    const loadedPlayersData = await loadPlayersFromDB();
    let initialPlayers: Player[] = Array.isArray(loadedPlayersData) ? loadedPlayersData : [];
    
    let dataRepaired = false;

    initialPlayers = initialPlayers.map(p => {
        const migratedPlayer = { ...p } as any;

        // 1. УСТАНОВКА ПОЛА (FLOOR)
        if (migratedPlayer.initialRating === undefined || migratedPlayer.initialRating === null) {
            migratedPlayer.initialRating = 68; // Стандартный пол клуба
            dataRepaired = true;
        }
        
        const floor = migratedPlayer.initialRating;

        // 2. ПРИНУДИТЕЛЬНОЕ СОБЛЮДЕНИЕ ПОЛА
        if (migratedPlayer.rating < floor) {
            migratedPlayer.rating = floor;
            dataRepaired = true;
        }

        // 3. RULE MIGRATION: REVERSE PENALTY (3 -> 5)
        // Check if player has 3 or 4 misses and HAS NOT been migrated to v5 rule yet
        if (!migratedPlayer.migrated_penalty_v5 && (migratedPlayer.consecutiveMissedSessions === 3 || migratedPlayer.consecutiveMissedSessions === 4)) {
            const lastChange = migratedPlayer.lastRatingChange;
            
            // Check if last change looks like an inactivity penalty (OVR drop with no match stats)
            const isPenaltyEntry = lastChange && 
                lastChange.finalChange < 0 && 
                lastChange.teamPerformance === 0 && 
                lastChange.individualPerformance === 0;

            if (isPenaltyEntry) {
                console.log(`Migration v5: Reversing penalty for ${migratedPlayer.nickname}`);
                
                // Return 1 point (standard penalty amount)
                migratedPlayer.rating += 1;
                
                // Reset last change so it doesn't show "Penalty applied" in card analysis
                migratedPlayer.lastRatingChange = undefined; 

                // Adjust tier based on new rating
                migratedPlayer.tier = getTierForRating(migratedPlayer.rating);

                // Mark as migrated so we don't add +1 again on next app start
                migratedPlayer.migrated_penalty_v5 = true;
                
                dataRepaired = true;
            }
        }

        // Стандартные миграции
        if (typeof migratedPlayer.rating === 'number' && !Number.isInteger(migratedPlayer.rating)) {
            migratedPlayer.rating = Math.round(migratedPlayer.rating);
            dataRepaired = true;
        }

        const correctTier = getTierForRating(migratedPlayer.rating);
        if (migratedPlayer.tier !== correctTier) {
            migratedPlayer.tier = correctTier;
            dataRepaired = true;
        }

        return migratedPlayer as Player;
    });

    if (dataRepaired) {
        savePlayersToDB(initialPlayers).catch(e => console.warn("Background repair sync failed", e));
    }

    const loadedHistoryData = await loadHistoryFromDB();
    const loadedNews = await loadNewsFromDB(10);
    const loadedLang = await loadLanguageFromDB() || 'en';
    const loadedPack = await loadActiveVoicePackFromDB() || 1;

    return {
        session: loadedSession,
        players: initialPlayers,
        history: Array.isArray(loadedHistoryData) ? loadedHistoryData : [],
        newsFeed: Array.isArray(loadedNews) ? loadedNews : [],
        language: loadedLang,
        activeVoicePack: loadedPack,
    };
};