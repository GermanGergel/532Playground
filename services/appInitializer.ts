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
        const migratedPlayer = { ...p };

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

        // 3. СИНХРОНИЗАЦИЯ ГРАФИКА И АНАЛИЗА
        // REMOVED: Aggressive history overwrite logic caused chart flattening bugs during penalties.
        // We now trust the historyData as the "truth" of the past, even if it differs from current rating.

        // 4. RULE MIGRATION: REVERSE PENALTY (3 -> 5)
        // If player has 3 or 4 misses and has a penalty change of -1, we give it back
        if (migratedPlayer.consecutiveMissedSessions === 3 || migratedPlayer.consecutiveMissedSessions === 4) {
            const lastChange = migratedPlayer.lastRatingChange;
            // Check if last change was a typical penalty (final -1, zero game stats)
            if (lastChange && 
                lastChange.finalChange === -1 && 
                lastChange.teamPerformance === 0 && 
                lastChange.individualPerformance === 0 &&
                lastChange.badgeBonus === 0) {
                
                console.log(`Migration: Reversing penalty for ${migratedPlayer.nickname}`);
                
                // Return point
                migratedPlayer.rating += 1;
                
                // Reset last change so it doesn't show "Penalty applied" in card analysis
                migratedPlayer.lastRatingChange = undefined; 

                // Adjust tier
                migratedPlayer.tier = getTierForRating(migratedPlayer.rating);

                // Clean up history chart entry if the last one was the penalty
                if (migratedPlayer.historyData && migratedPlayer.historyData.length > 0) {
                    const lastHist = migratedPlayer.historyData[migratedPlayer.historyData.length - 1];
                    // If it matches a penalty entry (no goals/assists and low rating)
                    if (lastHist.goals === 0 && lastHist.assists === 0 && lastHist.rating < migratedPlayer.rating) {
                        migratedPlayer.historyData.pop();
                    }
                }
                
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