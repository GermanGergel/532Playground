
import { Session, Player, NewsItem, BadgeType } from '../types';
import { Language } from '../translations/index';
import {
    loadPlayersFromDB,
    loadActiveSessionFromDB,
    loadHistoryFromDB,
    loadLanguageFromDB,
    loadNewsFromDB,
    saveNewsToDB,
    syncAndCacheAudioAssets,
    loadActiveVoicePackFromDB
} from '../db';

interface InitialAppState {
    session: Session | null;
    players: Player[];
    history: Session[];
    newsFeed: NewsItem[];
    language: Language;
    activeVoicePack: number;
}

/**
 * Loads all initial data from the database, performs any necessary data migrations,
 * and returns the complete initial state for the application.
 */
export const initializeAppState = async (): Promise<InitialAppState> => {
    // Run audio sync in the background without blocking the main data load
    // This will quietly check cloud timestamps and download new audio only if needed.
    syncAndCacheAudioAssets();

    // 1. Load Active Session
    const loadedSession = await loadActiveSessionFromDB() || null;
    if (loadedSession) {
        // Ensure data structure integrity for legacy sessions
        loadedSession.playerPool = loadedSession.playerPool || [];
        loadedSession.teams = loadedSession.teams || [];
        loadedSession.games = loadedSession.games || [];
        loadedSession.eventLog = loadedSession.eventLog || [];
    }

    // 2. Load Players and perform migrations
    const loadedPlayersData = await loadPlayersFromDB();
    let initialPlayers: Player[] = Array.isArray(loadedPlayersData) ? loadedPlayersData : [];
    
    // Migration loop to ensure all required fields exist on player objects
    initialPlayers = initialPlayers.map(p => {
        let badges: Partial<Record<BadgeType, number>> = {};
        // Badge data migration from string array to object counter for older data
        if (Array.isArray(p.badges)) {
            p.badges.forEach((badge: BadgeType) => {
                badges[badge] = (badges[badge] || 0) + 1;
            });
        } else if (p.badges) { // Already an object
            badges = p.badges;
        }

        // Deep merge records to ensure no sub-property is missing
        // Cast to any to handle migration from old data where records might be undefined/empty
        const rawRecords = (p.records || {}) as any;
        const safeRecords = {
            bestGoalsInSession: rawRecords.bestGoalsInSession || { value: 0, sessionId: '' },
            bestAssistsInSession: rawRecords.bestAssistsInSession || { value: 0, sessionId: '' },
            bestWinRateInSession: rawRecords.bestWinRateInSession || { value: 0, sessionId: '' },
        };

        return {
            ...p,
            badges,
            totalSessionsPlayed: (p.totalSessionsPlayed ?? Math.round(p.totalGames / 15)) || 0,
            monthlySessionsPlayed: (p.monthlySessionsPlayed ?? Math.round(p.monthlyGames / 15)) || 0,
            lastRatingChange: p.lastRatingChange || undefined,
            sessionHistory: p.sessionHistory || [], 
            records: safeRecords,
        };
    });

    // 3. Load History and perform migrations
    // TRAFFIC OPTIMIZATION: Only load the absolutely latest session (limit: 1).
    // The user can load more by visiting the History screen.
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

    // 4. Load News Feed & EMERGENCY CLEANUP for Egress Leak
    // TRAFFIC OPTIMIZATION: Only load the last 10 news items (approx 1 session worth).
    const loadedNews = await loadNewsFromDB(10);
    let initialNewsFeed = Array.isArray(loadedNews) ? loadedNews : [];
    
    // Check for "heavy" news items (base64 images) that cause 5GB egress issues
    let hasBadData = false;
    initialNewsFeed = initialNewsFeed.map(item => {
        if (item.playerPhoto && item.playerPhoto.startsWith('data:')) {
            hasBadData = true;
            // Clean the data: remove the base64 string
            return { ...item, playerPhoto: undefined };
        }
        return item;
    });

    if (hasBadData) {
        console.log("🧹 Cleaning massive Base64 data from News Feed to save bandwidth...");
        // Save the cleaned data back to Supabase immediately to stop the egress bleeding
        saveNewsToDB(initialNewsFeed);
    }

    // 5. Load Language
    const loadedLang = await loadLanguageFromDB() || 'en';

    // 6. Load Active Voice Pack
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
