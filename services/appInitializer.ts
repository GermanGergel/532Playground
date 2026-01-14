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
import { get, set } from 'idb-keyval';
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

    // --- REFINED MONTHLY STATS RESET LOGIC ---
    try {
        const now = new Date();
        const lastResetTimestamp = await get<number>('lastMonthlyResetTimestamp');

        // Condition for reset:
        // 1. It's the first time ever we run this logic (lastResetTimestamp is null).
        // OR
        // 2. The month/year of the last reset is different from the current month/year.
        const lastResetDate = lastResetTimestamp ? new Date(lastResetTimestamp) : null;
        if (!lastResetDate || now.getMonth() !== lastResetDate.getMonth() || now.getFullYear() !== lastResetDate.getFullYear()) {
            console.log(!lastResetDate ? "Initial stat reset performed." : "New month detected, resetting stats.");
            initialPlayers = initialPlayers.map(player => ({
                ...player,
                monthlyGoals: 0,
                monthlyAssists: 0,
                monthlyGames: 0,
                monthlyWins: 0,
                monthlySessionsPlayed: 0,
            }));
            dataRepaired = true; // Use this flag to trigger a save.
            await set('lastMonthlyResetTimestamp', now.getTime());
        }
    } catch (e) {
        console.error("Failed to process monthly stat reset:", e);
    }
    // --- END OF REFINED LOGIC ---

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
        // Если рейтинг изменился (штрафом или вручную), но анализ или график отстают — лечим
        if (migratedPlayer.lastRatingChange && migratedPlayer.lastRatingChange.newRating !== migratedPlayer.rating) {
            migratedPlayer.lastRatingChange.newRating = migratedPlayer.rating;
            migratedPlayer.lastRatingChange.finalChange = migratedPlayer.rating - migratedPlayer.lastRatingChange.previousRating;
            dataRepaired = true;
        }

        if (migratedPlayer.historyData && migratedPlayer.historyData.length > 0) {
            const lastEntry = migratedPlayer.historyData[migratedPlayer.historyData.length - 1];
            if (lastEntry.rating !== migratedPlayer.rating) {
                lastEntry.rating = migratedPlayer.rating;
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
        savePlayersToDB(initialPlayers).catch(e => console.warn("Background repair/reset sync failed", e));
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