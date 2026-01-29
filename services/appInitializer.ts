
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
        loadHistoryFromDB(), 
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

        // 4. CHART REPAIR: THE "V-SHAPE" RESTORER
        // Problem: History shows [78, 78, 79] (Flatline then Jump). 
        // Reality: It was [79, 78, 79] (Peak -> Penalty -> Recovery).
        // The first '78' was likely an overwrite error or missing entry.
        if (migratedPlayer.historyData && migratedPlayer.historyData.length >= 2) {
            const h = migratedPlayer.historyData;
            const lastIdx = h.length - 1;
            
            const current = h[lastIdx];     // 79 (Today)
            const prev = h[lastIdx - 1];    // 78 (Penalty state)
            
            // Check if we have a "Growth" event (79 > 78)
            if (current.rating > prev.rating) {
                
                // CASE 1: We have 3+ points. [..., 78, 78, 79] -> Change to [..., 79, 78, 79]
                if (h.length >= 3) {
                    const prePrev = h[lastIdx - 2]; // The suspicious 78
                    
                    // If the point BEFORE the penalty is the SAME as the penalty (flatline),
                    // but we just grew to a higher level...
                    // It is highly likely that prePrev SHOULD have been the higher level.
                    if (Math.round(prePrev.rating) === Math.round(prev.rating)) {
                        console.log(`Chart Repair (V-Shape): Lifting historical point for ${migratedPlayer.nickname} from ${prePrev.rating} to ${current.rating}`);
                        
                        // Lift the pre-penalty point to match current recovery level (restoring the peak)
                        prePrev.rating = current.rating; 
                        dataRepaired = true;
                    }
                }
                
                // CASE 2: We only have 2 points [78, 79]. 
                // We are missing the start context. We assume they started high.
                // Insert a "Virtual Start" of 79 before the 78.
                else if (h.length === 2) {
                     const newStart: PlayerHistoryEntry = {
                        date: 'Start',
                        rating: current.rating, // Restore the 79
                        winRate: prev.winRate,
                        goals: 0,
                        assists: 0
                    };
                    migratedPlayer.historyData = [newStart, prev, current];
                    console.log(`Chart Repair (V-Shape Start): Injected start peak for ${migratedPlayer.nickname}`);
                    dataRepaired = true;
                }
            }
        }

        // 5. AUTO-HEAL MONTHLY STATS
        const realMonthly = calculatePlayerMonthlyStats(p.id, history);
        if (
            migratedPlayer.monthlyGoals !== realMonthly.goals || 
            migratedPlayer.monthlyAssists !== realMonthly.assists ||
            migratedPlayer.monthlyWins !== realMonthly.wins ||
            migratedPlayer.monthlyGames !== realMonthly.games
        ) {
            migratedPlayer.monthlyGoals = realMonthly.goals;
            migratedPlayer.monthlyAssists = realMonthly.assists;
            migratedPlayer.monthlyWins = realMonthly.wins;
            migratedPlayer.monthlyGames = realMonthly.games;
            migratedPlayer.monthlySessionsPlayed = realMonthly.sessions;
            dataRepaired = true;
        }

        // Standard migrations
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
        console.log("AppInitializer: Player data repaired (V-Shape Scan). Syncing to DB...");
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
