import { Session, Player, NewsItem, BadgeType } from '../types';
import { Language } from '../translations/index';
import {
    loadPlayersFromDB,
    loadActiveSessionFromDB,
    loadHistoryFromDB,
    loadLanguageFromDB,
    loadNewsFromDB,
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

        return {
            ...p,
            badges,
            totalSessionsPlayed: (p.totalSessionsPlayed ?? Math.round(p.totalGames / 15)) || 0,
            monthlySessionsPlayed: (p.monthlySessionsPlayed ?? Math.round(p.monthlyGames / 15)) || 0,
            lastRatingChange: p.lastRatingChange || undefined,
            sessionHistory: p.sessionHistory || [], // CRITICAL FIX: Ensure sessionHistory is always an array.
            records: p.records || {
                bestGoalsInSession: { value: 0, sessionId: '' },
                bestAssistsInSession: { value: 0, sessionId: '' },
                bestWinRateInSession: { value: 0, sessionId: '' },
            },
        };
    });

    // 3. Load History and perform migrations
    const loadedHistoryData = await loadHistoryFromDB();
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

    // 4. Load News Feed
    const loadedNews = await loadNewsFromDB();
    const initialNewsFeed = Array.isArray(loadedNews) ? loadedNews : [];

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