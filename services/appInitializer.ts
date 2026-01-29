
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
import { calculatePlayerMonthlyStats } from './statistics';

interface InitialAppState {
    session: Session | null;
    players: Player[];
    history: Session[];
    newsFeed: NewsItem[];
    language: Language;
    activeVoicePack: number;
}

export const initializeAppState = async (): Promise<InitialAppState> => {
    // 1. LOAD DATA IN PARALLEL (Optimized)
    const [loadedSession, loadedPlayersData, loadedHistoryData, loadedNews, loadedLang, loadedPack] = await Promise.all([
        loadActiveSessionFromDB(),
        loadPlayersFromDB(),
        loadHistoryFromDB(), // Load History early to use for repairs
        loadNewsFromDB(10),
        loadLanguageFromDB(),
        loadActiveVoicePackFromDB()
    ]);

    let initialPlayers: Player[] = Array.isArray(loadedPlayersData) ? loadedPlayersData : [];
    const history: Session[] = Array.isArray(loadedHistoryData) ? loadedHistoryData : [];
    
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
        if (migratedPlayer.lastRatingChange && migratedPlayer.lastRatingChange.newRating !== migratedPlayer.rating) {
            migratedPlayer.lastRatingChange.newRating = migratedPlayer.rating;
            migratedPlayer.lastRatingChange.finalChange = migratedPlayer.rating - migratedPlayer.lastRatingChange.previousRating;
            dataRepaired = true;
        }

        // 4. CHART SELF-HEALING (Fixing the "Missing Dip" Bug)
        if (migratedPlayer.historyData && migratedPlayer.historyData.length > 0) {
            const lastEntry = migratedPlayer.historyData[migratedPlayer.historyData.length - 1];
            
            // If the rating on the chart (lastEntry) doesn't match the actual player rating
            // (e.g., chart says 79, but player is 78 due to a penalty that wasn't logged)
            if (Math.round(lastEntry.rating) !== Math.round(migratedPlayer.rating)) {
                
                // Calculate current win rate to prevent the line from crashing to 0 on the second axis
                const currentWinRate = migratedPlayer.totalGames > 0 
                    ? Math.round((migratedPlayer.totalWins / migratedPlayer.totalGames) * 100) 
                    : 0;

                const patchEntry: PlayerHistoryEntry = {
                    date: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit' }),
                    rating: migratedPlayer.rating,
                    winRate: currentWinRate, // Use career average to keep visual consistency
                    goals: 0,
                    assists: 0
                };
                
                migratedPlayer.historyData.push(patchEntry);
                if (migratedPlayer.historyData.length > 12) migratedPlayer.historyData.shift();
                
                console.log(`Chart Self-Healing: Patched history for ${migratedPlayer.nickname}. Chart synced to ${migratedPlayer.rating}.`);
                dataRepaired = true;
            }
        }

        // 5. AUTO-HEAL MONTHLY STATS (Fixes the "51 vs 22" bug)
        // We recalculate true monthly stats from history and overwrite the "dirty" DB value.
        const realMonthly = calculatePlayerMonthlyStats(p.id, history);
        
        if (
            migratedPlayer.monthlyGoals !== realMonthly.goals || 
            migratedPlayer.monthlyAssists !== realMonthly.assists ||
            migratedPlayer.monthlyWins !== realMonthly.wins ||
            migratedPlayer.monthlyGames !== realMonthly.games
        ) {
            // Only log if the difference is significant to avoid console spam
            if (Math.abs(migratedPlayer.monthlyGoals - realMonthly.goals) > 0) {
                console.log(`Repairing stats for ${p.nickname}: DB says ${migratedPlayer.monthlyGoals}G, History says ${realMonthly.goals}G`);
            }
            
            migratedPlayer.monthlyGoals = realMonthly.goals;
            migratedPlayer.monthlyAssists = realMonthly.assists;
            migratedPlayer.monthlyWins = realMonthly.wins;
            migratedPlayer.monthlyGames = realMonthly.games;
            migratedPlayer.monthlySessionsPlayed = realMonthly.sessions;
            dataRepaired = true;
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
        console.log("AppInitializer: Player data repaired. Syncing to DB...");
        // This acts as the "Self-Healing" mechanism
        savePlayersToDB(initialPlayers).catch(e => console.warn("Background repair sync failed", e));
    }

    return {
        session: loadedSession || null,
        players: initialPlayers,
        history: history,
        newsFeed: Array.isArray(loadedNews) ? loadedNews : [],
        language: loadedLang || 'en',
        activeVoicePack: loadedPack || 1,
    };
};
