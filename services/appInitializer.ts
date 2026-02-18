
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
import { auditLifetimeWinRates } from './statistics';

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
    const loadedHistoryData = await loadHistoryFromDB() || [];
    const loadedPlayersData = await loadPlayersFromDB();
    let initialPlayers: Player[] = Array.isArray(loadedPlayersData) ? loadedPlayersData : [];
    
    let dataRepaired = false;

    // 1. ПРИМЕНЯЕМ АУДИТ ВИНРЕЙТА (ТИХИЙ ПЕРЕСЧЕТ)
    // Мы пересчитываем Wins/Draws/Losses, но НЕ МЕНЯЕМ totalGames.
    const historyToAudit = Array.isArray(loadedHistoryData) ? loadedHistoryData : [];
    if (initialPlayers.length > 0 && historyToAudit.length > 0) {
        const auditedPlayers = auditLifetimeWinRates(initialPlayers, historyToAudit);
        
        // Сравниваем только Wins, Draws и Losses. 
        // totalGames в аудите зафиксирован на старом значении, поэтому сравнивать его нет смысла.
        const needsUpdate = auditedPlayers.some((p, i) => 
            p.totalWins !== initialPlayers[i].totalWins || 
            p.totalDraws !== initialPlayers[i].totalDraws ||
            p.totalLosses !== initialPlayers[i].totalLosses
        );
        
        if (needsUpdate) {
            console.log("App Init: WinRT Audit completed. Victory counts synchronized with history logs.");
            initialPlayers = auditedPlayers;
            dataRepaired = true;
        }
    }

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
        if (!migratedPlayer.migrated_penalty_v5 && (migratedPlayer.consecutiveMissedSessions === 3 || migratedPlayer.consecutiveMissedSessions === 4)) {
            const lastChange = migratedPlayer.lastRatingChange;
            const isPenaltyEntry = lastChange && 
                lastChange.finalChange < 0 && 
                lastChange.teamPerformance === 0 && 
                lastChange.individualPerformance === 0;

            if (isPenaltyEntry) {
                console.log(`Migration v5: Reversing penalty for ${migratedPlayer.nickname}`);
                migratedPlayer.rating += 1;
                migratedPlayer.lastRatingChange = undefined; 
                migratedPlayer.tier = getTierForRating(migratedPlayer.rating);
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

    const loadedNews = await loadNewsFromDB(10);
    const loadedLang = await loadLanguageFromDB() || 'en';
    const loadedPack = await loadActiveVoicePackFromDB() || 1;

    return {
        session: loadedSession,
        players: initialPlayers,
        history: historyToAudit,
        newsFeed: Array.isArray(loadedNews) ? loadedNews : [],
        language: loadedLang,
        activeVoicePack: loadedPack,
    };
};
