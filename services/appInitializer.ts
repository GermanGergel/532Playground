
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
    if (loadedSession) {
        loadedSession.playerPool = loadedSession.playerPool || [];
        loadedSession.teams = loadedSession.teams || [];
        loadedSession.games = loadedSession.games || [];
        loadedSession.eventLog = loadedSession.eventLog || [];
    }

    const loadedPlayersData = await loadPlayersFromDB();
    let initialPlayers: Player[] = Array.isArray(loadedPlayersData) ? loadedPlayersData : [];
    
    let dataRepaired = false;

    initialPlayers = initialPlayers.map(p => {
        const migratedPlayer = { ...p };

        // --- SILENT RATING RECONCILIATION ---
        // Fix mismatch: if main rating differs from the one in last analysis, trust analysis
        if (migratedPlayer.lastRatingChange && typeof migratedPlayer.lastRatingChange.newRating === 'number') {
            const expectedRating = Math.round(migratedPlayer.lastRatingChange.newRating);
            if (migratedPlayer.rating !== expectedRating) {
                migratedPlayer.rating = expectedRating;
                dataRepaired = true;
            }
        }

        // Force integer rating globally
        if (typeof migratedPlayer.rating === 'number' && !Number.isInteger(migratedPlayer.rating)) {
            migratedPlayer.rating = Math.round(migratedPlayer.rating);
            dataRepaired = true;
        }

        let badges: Partial<Record<BadgeType, number>> = {};
        if (Array.isArray(migratedPlayer.badges)) {
            (migratedPlayer.badges as unknown as BadgeType[]).forEach((badge: BadgeType) => {
                badges[badge] = (badges[badge] || 0) + 1;
            });
            migratedPlayer.badges = badges;
            dataRepaired = true;
        }

        const existingRecords = migratedPlayer.records as any;
        let newRecords: PlayerRecords | null = null;
        if (existingRecords && typeof existingRecords === 'object' && !Array.isArray(existingRecords)) {
            newRecords = {
                bestGoalsInSession: (existingRecords.bestGoalsInSession && typeof existingRecords.bestGoalsInSession.value === 'number') 
                    ? existingRecords.bestGoalsInSession 
                    : { value: 0, sessionId: '' },
                bestAssistsInSession: (existingRecords.bestAssistsInSession && typeof existingRecords.bestAssistsInSession.value === 'number') 
                    ? existingRecords.bestAssistsInSession 
                    : { value: 0, sessionId: '' },
                bestWinRateInSession: (existingRecords.bestWinRateInSession && typeof existingRecords.bestWinRateInSession.value === 'number') 
                    ? existingRecords.bestWinRateInSession 
                    : { value: 0, sessionId: '' },
            };
        }
        if (!newRecords) {
            newRecords = {
                bestGoalsInSession: { value: 0, sessionId: '' },
                bestAssistsInSession: { value: 0, sessionId: '' },
                bestWinRateInSession: { value: 0, sessionId: '' },
            };
            dataRepaired = true;
        }
        migratedPlayer.records = newRecords;

        migratedPlayer.totalSessionsPlayed = (migratedPlayer.totalSessionsPlayed ?? Math.round(migratedPlayer.totalGames / 15)) || 0;
        migratedPlayer.monthlySessionsPlayed = (migratedPlayer.monthlySessionsPlayed ?? Math.round(migratedPlayer.monthlyGames / 15)) || 0;
        migratedPlayer.sessionHistory = migratedPlayer.sessionHistory || []; 
        migratedPlayer.consecutiveMissedSessions = migratedPlayer.consecutiveMissedSessions || 0;

        if (!migratedPlayer.historyData || migratedPlayer.historyData.length === 0) {
            const currentWinRate = migratedPlayer.totalGames > 0 
                ? Math.round((migratedPlayer.totalWins / migratedPlayer.totalGames) * 100) 
                : 0;
            const initialHistoryEntry: PlayerHistoryEntry = {
                date: 'Start',
                rating: migratedPlayer.rating,
                winRate: currentWinRate,
                goals: migratedPlayer.totalGoals,
                assists: migratedPlayer.totalAssists
            };
            migratedPlayer.historyData = [initialHistoryEntry];
            dataRepaired = true;
        }

        return migratedPlayer as Player;
    });

    // Save repaired data back to DB in background
    if (dataRepaired) {
        savePlayersToDB(initialPlayers).catch(e => console.warn("Background migration sync failed", e));
    }

    const loadedHistoryData = await loadHistoryFromDB(1);
    let initialHistory: Session[] = [];
    if (Array.isArray(loadedHistoryData)) {
        initialHistory = loadedHistoryData.map((s: any) => ({
            ...s,
            teams: s.teams || [],
            games: s.games || [],
            playerPool: s.playerPool || [],
            eventLog: s.eventLog || []
        }));
    }

    const loadedNews = await loadNewsFromDB(10);
    let initialNewsFeed = Array.isArray(loadedNews) ? loadedNews : [];
    
    let hasBadNewsData = false;
    initialNewsFeed = initialNewsFeed.map(item => {
        if (item.playerPhoto && item.playerPhoto.startsWith('data:')) {
            hasBadNewsData = true;
            return { ...item, playerPhoto: undefined };
        }
        return item;
    });

    if (hasBadNewsData) {
        saveNewsToDB(initialNewsFeed);
    }

    const loadedLang = await loadLanguageFromDB() || 'en';
    const loadedPack = await loadActiveVoicePackFromDB() || 1;

    return {
        session: loadedSession,
        players: initialPlayers,
        history: initialHistory,
        newsFeed: initialNewsFeed,
        language: loadedLang,
        activeVoicePack: loadedPack,
    };
};
