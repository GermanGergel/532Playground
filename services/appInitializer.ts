
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

        // 1. ENSURE RATING FLOOR (Standard 68)
        if (migratedPlayer.initialRating === undefined || migratedPlayer.initialRating === null) {
            migratedPlayer.initialRating = 68;
            dataRepaired = true;
        }
        
        const floor = migratedPlayer.initialRating;

        // 2. REPAIR BROKEN RATINGS (If 66 -> Make 68)
        if (migratedPlayer.rating < floor) {
            console.log(`Repairing ${migratedPlayer.nickname}: ${migratedPlayer.rating} -> ${floor}`);
            migratedPlayer.rating = floor;
            dataRepaired = true;
        }

        // 3. SYNC ANALYSIS OBJECT (The source of the "68 vs 66" visual bug)
        if (migratedPlayer.lastRatingChange) {
            let analysisChanged = false;
            
            // If the analysis 'new' rating doesn't match the actual OVR, force it
            if (migratedPlayer.lastRatingChange.newRating !== migratedPlayer.rating) {
                migratedPlayer.lastRatingChange.newRating = migratedPlayer.rating;
                analysisChanged = true;
            }

            // Recalculate delta to look natural
            const correctDelta = migratedPlayer.lastRatingChange.newRating - migratedPlayer.lastRatingChange.previousRating;
            if (Math.abs(migratedPlayer.lastRatingChange.finalChange - correctDelta) > 0.01) {
                migratedPlayer.lastRatingChange.finalChange = Number(correctDelta.toFixed(1));
                analysisChanged = true;
            }

            if (analysisChanged) dataRepaired = true;
        }

        // 4. CLEANUP FRACTIONS
        if (typeof migratedPlayer.rating === 'number' && !Number.isInteger(migratedPlayer.rating)) {
            migratedPlayer.rating = Math.round(migratedPlayer.rating);
            dataRepaired = true;
        }

        // 5. SYNC TIER
        const correctTier = getTierForRating(migratedPlayer.rating);
        if (migratedPlayer.tier !== correctTier) {
            migratedPlayer.tier = correctTier;
            dataRepaired = true;
        }

        return migratedPlayer as Player;
    });

    if (dataRepaired) {
        savePlayersToDB(initialPlayers).catch(e => console.warn("Auto-repair failed to sync", e));
    }

    const loadedHistoryData = await loadHistoryFromDB(10);
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
