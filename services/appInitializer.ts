
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
    const loadedPlayersData = await loadPlayersFromDB();
    let initialPlayers: Player[] = Array.isArray(loadedPlayersData) ? loadedPlayersData : [];
    
    let dataRepaired = false;

    initialPlayers = initialPlayers.map(p => {
        const migratedPlayer = { ...p };

        // 1. SAFE RATING FLOOR MIGRATION
        if (migratedPlayer.initialRating === undefined || migratedPlayer.initialRating === null) {
            migratedPlayer.initialRating = 68; // Default Club Floor
            dataRepaired = true;
        }
        
        const floor = migratedPlayer.initialRating;

        // 2. ENFORCE FLOOR (Repair legacy data where rating < floor)
        if (migratedPlayer.rating < floor) {
            migratedPlayer.rating = floor;
            // Clean up last session breakdown if it was showing a sub-floor rating
            if (migratedPlayer.lastRatingChange) {
                migratedPlayer.lastRatingChange.newRating = floor;
                migratedPlayer.lastRatingChange.finalChange = floor - migratedPlayer.lastRatingChange.previousRating;
            }
            dataRepaired = true;
        }

        // 3. RETROSPECTIVE PENALTY FIX
        // Ensure UI displays correctly for those who should be in penalty state
        if (migratedPlayer.consecutiveMissedSessions && migratedPlayer.consecutiveMissedSessions >= 3) {
            // Only trigger penalty UI if they don't already have one or have gameplay-based positive change
            if (!migratedPlayer.lastRatingChange || (migratedPlayer.lastRatingChange.finalChange >= 0 && migratedPlayer.rating > floor)) {
                 // We don't necessarily re-deduct here to avoid double-taxing,
                 // but we ensure the object exists for the UI logic in Club Hub
                 migratedPlayer.lastRatingChange = migratedPlayer.lastRatingChange || {
                    previousRating: Math.min(99, migratedPlayer.rating + 1),
                    teamPerformance: 0,
                    individualPerformance: 0,
                    badgeBonus: 0,
                    finalChange: -1.0,
                    newRating: migratedPlayer.rating,
                    badgesEarned: []
                };
                dataRepaired = true;
            }
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

        let badges: Partial<Record<BadgeType, number>> = {};
        if (Array.isArray(migratedPlayer.badges)) {
            (migratedPlayer.badges as unknown as BadgeType[]).forEach((badge: BadgeType) => {
                badges[badge] = (badges[badge] || 0) + 1;
            });
            migratedPlayer.badges = badges;
            dataRepaired = true;
        }

        migratedPlayer.totalSessionsPlayed = (migratedPlayer.totalSessionsPlayed ?? Math.round(migratedPlayer.totalGames / 15)) || 0;
        migratedPlayer.sessionHistory = migratedPlayer.sessionHistory || []; 
        migratedPlayer.consecutiveMissedSessions = migratedPlayer.consecutiveMissedSessions || 0;

        return migratedPlayer as Player;
    });

    if (dataRepaired) {
        savePlayersToDB(initialPlayers).catch(e => console.warn("Background migration sync failed", e));
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
