
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

        // 1. SAFE RATING FLOOR MIGRATION
        if (migratedPlayer.initialRating === undefined || migratedPlayer.initialRating === null) {
            migratedPlayer.initialRating = 68; // New club standard
            dataRepaired = true;
        }
        
        // Ensure rating is not below floor
        if (migratedPlayer.rating < 68) {
            migratedPlayer.rating = 68;
            dataRepaired = true;
        }

        // --- RETROSPECTIVE PENALTY CHECK ---
        // If a player already has 3+ missed sessions in the DB but the rating hasn't been lowered yet
        // We look at consecutiveMissedSessions and apply -1 for every 3.
        const floor = migratedPlayer.initialRating || 68;
        if (migratedPlayer.consecutiveMissedSessions && migratedPlayer.consecutiveMissedSessions >= 3) {
            const expectedDeduction = Math.floor(migratedPlayer.consecutiveMissedSessions / 3);
            
            // Trigger penalty UI if they are in penalty state and have no analysis or rating is still too high
            if (migratedPlayer.rating > floor && (!migratedPlayer.lastRatingChange || migratedPlayer.lastRatingChange.finalChange >= 0)) {
                 const penaltyVal = -1.0;
                 migratedPlayer.rating = Math.max(floor, migratedPlayer.rating + penaltyVal);
                 migratedPlayer.lastRatingChange = {
                    previousRating: migratedPlayer.rating - penaltyVal,
                    teamPerformance: 0,
                    individualPerformance: 0,
                    badgeBonus: 0,
                    finalChange: penaltyVal,
                    newRating: migratedPlayer.rating,
                    badgesEarned: []
                };
                dataRepaired = true;
            }
        }

        if (typeof migratedPlayer.rating === 'number' && !Number.isInteger(migratedPlayer.rating)) {
            migratedPlayer.rating = Math.round(migratedPlayer.rating);
            dataRepaired = true;
        }

        const correctTier = getTierForRating(migratedPlayer.rating);
        if (migratedPlayer.tier !== correctTier) {
            migratedPlayer.tier = correctTier;
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

    if (dataRepaired) {
        savePlayersToDB(initialPlayers).catch(e => console.warn("Background migration sync failed", e));
    }

    const loadedHistoryData = await loadHistoryFromDB(10);
    let initialHistory: Session[] = [];
    if (Array.isArray(loadedHistoryData) && loadedHistoryData.length > 0) {
        initialHistory = loadedHistoryData.map((s: any) => ({
            ...s,
            teams: s.teams || [],
            games: s.games || [],
            playerPool: s.playerPool || [],
            eventLog: s.eventLog || []
        }));
    } else {
        initialHistory = [];
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
