
import { Session, Player, NewsItem, BadgeType, PlayerRecords } from '../types';
import { Language } from '../translations/index';
import {
    loadPlayersFromDB,
    loadActiveSessionFromDB,
    loadHistoryFromDB,
    loadLanguageFromDB,
    loadNewsFromDB,
    saveNewsToDB,
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
    // Note: Audio sync is now deferred to the VoiceSettingsScreen to save bandwidth on startup.

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
        const migratedPlayer = { ...p };

        // Badge data migration from string array to object counter for older data
        let badges: Partial<Record<BadgeType, number>> = {};
        if (Array.isArray(migratedPlayer.badges)) {
            (migratedPlayer.badges as unknown as BadgeType[]).forEach((badge: BadgeType) => {
                badges[badge] = (badges[badge] || 0) + 1;
            });
        } else if (migratedPlayer.badges) { // Already an object
            badges = migratedPlayer.badges;
        }
        migratedPlayer.badges = badges;

        // FINAL SAFER RECORDS MIGRATION:
        // This logic is non-destructive. It ensures the main `records` object exists,
        // and then ensures each sub-property exists, only adding defaults if a property is missing.
        // This prevents overwriting valid data with zeros.
        if (!migratedPlayer.records) {
            migratedPlayer.records = {} as PlayerRecords;
        }
        migratedPlayer.records.bestGoalsInSession = migratedPlayer.records.bestGoalsInSession || { value: 0, sessionId: '' };
        migratedPlayer.records.bestAssistsInSession = migratedPlayer.records.bestAssistsInSession || { value: 0, sessionId: '' };
        migratedPlayer.records.bestWinRateInSession = migratedPlayer.records.bestWinRateInSession || { value: 0, sessionId: '' };

        // Add other missing fields with default values
        migratedPlayer.totalSessionsPlayed = (migratedPlayer.totalSessionsPlayed ?? Math.round(migratedPlayer.totalGames / 15)) || 0;
        migratedPlayer.monthlySessionsPlayed = (migratedPlayer.monthlySessionsPlayed ?? Math.round(migratedPlayer.monthlyGames / 15)) || 0;
        migratedPlayer.lastRatingChange = migratedPlayer.lastRatingChange || undefined;
        migratedPlayer.sessionHistory = migratedPlayer.sessionHistory || []; 
        migratedPlayer.consecutiveMissedSessions = migratedPlayer.consecutiveMissedSessions || 0;

        return migratedPlayer as Player;
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
