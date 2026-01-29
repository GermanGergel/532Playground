
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

        // 4. CHART SELF-HEALING (Advanced "Hidden Valley" Detection)
        // Fixes the 79 -> 78 (Penalty) -> 79 (Played) scenario where the chart shows a flat 79->79 line.
        if (migratedPlayer.historyData && migratedPlayer.historyData.length > 0 && migratedPlayer.lastRatingChange) {
            const lastEntry = migratedPlayer.historyData[migratedPlayer.historyData.length - 1];
            const prevRating = Math.round(migratedPlayer.lastRatingChange.previousRating);
            const currentRating = Math.round(migratedPlayer.rating);
            const lastHistoryRating = Math.round(lastEntry.rating);

            // SCENARIO A: Player is currently lower than chart (Penalty just happened)
            // Chart: 79, Player: 78.
            if (lastHistoryRating !== currentRating) {
                const currentWinRate = migratedPlayer.totalGames > 0 
                    ? Math.round((migratedPlayer.totalWins / migratedPlayer.totalGames) * 100) 
                    : 0;

                const patchEntry: PlayerHistoryEntry = {
                    date: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit' }),
                    rating: migratedPlayer.rating,
                    winRate: currentWinRate, 
                    goals: 0,
                    assists: 0
                };
                
                migratedPlayer.historyData.push(patchEntry);
                if (migratedPlayer.historyData.length > 12) migratedPlayer.historyData.shift();
                
                console.log(`Chart Repair (Type A): Appended missing tip for ${migratedPlayer.nickname}.`);
                dataRepaired = true;
            }
            
            // SCENARIO B: The "Hidden Dip" (Already recovered)
            // Player: 79. Chart Last: 79. LastChange says: "I grew from 78!". 
            // This means we missed the 78 in the history.
            else if (currentRating > prevRating && lastHistoryRating > prevRating) {
                // We verify that the history doesn't already contain the dip at the end
                // We check the 2nd to last entry if it exists
                const secondLastEntry = migratedPlayer.historyData.length > 1 ? migratedPlayer.historyData[migratedPlayer.historyData.length - 2] : null;
                
                // If the second to last is ALSO high (e.g. 79), then we definitely missed the 78 in the middle.
                if (!secondLastEntry || Math.round(secondLastEntry.rating) > prevRating) {
                    const dipEntry: PlayerHistoryEntry = {
                        date: 'Penalty', // Marker for the chart
                        rating: prevRating, // The missing 78
                        winRate: lastEntry.winRate,
                        goals: 0,
                        assists: 0
                    };

                    // Insert BEFORE the last entry (which is the recovery point)
                    // [..., 79, 79] becomes [..., 79, 78, 79]
                    migratedPlayer.historyData.splice(migratedPlayer.historyData.length - 1, 0, dipEntry);
                    
                    // Ensure length limit
                    if (migratedPlayer.historyData.length > 12) migratedPlayer.historyData.shift();

                    console.log(`Chart Repair (Type B): Injected missing dip (78) for ${migratedPlayer.nickname}.`);
                    dataRepaired = true;
                }
            }
        }

        // 5. AUTO-HEAL MONTHLY STATS (Fixes the "51 vs 22" bug)
        const realMonthly = calculatePlayerMonthlyStats(p.id, history);
        
        if (
            migratedPlayer.monthlyGoals !== realMonthly.goals || 
            migratedPlayer.monthlyAssists !== realMonthly.assists ||
            migratedPlayer.monthlyWins !== realMonthly.wins ||
            migratedPlayer.monthlyGames !== realMonthly.games
        ) {
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
