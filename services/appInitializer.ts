
import { Session, Player, NewsItem, BadgeType, PlayerRecords, PlayerHistoryEntry, RatingBreakdown } from '../types';
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

// Global logic to run penalty analysis
export const runInactivityAudit = (players: Player[], history: Session[]): { updatedPlayers: Player[], modified: boolean } => {
    if (history.length === 0) return { updatedPlayers: players, modified: false };
    
    let modified = false;
    const completedSessions = history
        .filter(s => s.status === 'completed')
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const updatedPlayers = players.map(p => {
        if (p.status !== 'confirmed') return p;
        
        const playerLastPlayedAt = p.lastPlayedAt || p.createdAt;
        const lastPlayedTime = new Date(playerLastPlayedAt).getTime();
        
        // Count how many completed sessions happened AFTER the player's last appearance
        const missedSessionsSinceLastPlay = completedSessions.filter(s => 
            new Date(s.date).getTime() > lastPlayedTime
        ).length;

        // Penalty logic: -1 OVR for every 3 missed
        const expectedTotalPenalty = Math.floor(missedSessionsSinceLastPlay / 3);
        const floor = p.initialRating || 68;

        // If missed sessions >= 3 and the last rating change isn't already reflecting THIS penalty level
        // We trigger an update if the count has reached a new multiple of 3.
        if (missedSessionsSinceLastPlay >= 3 && (!p.lastRatingChange?.isPenalty || p.consecutiveMissedSessions !== missedSessionsSinceLastPlay)) {
             if (p.rating > floor) {
                const prevRating = p.rating;
                const newRating = Math.max(floor, prevRating - 1);
                
                if (newRating < prevRating) {
                    modified = true;
                    return {
                        ...p,
                        rating: newRating,
                        tier: getTierForRating(newRating),
                        consecutiveMissedSessions: missedSessionsSinceLastPlay,
                        lastRatingChange: {
                            previousRating: prevRating,
                            newRating: newRating,
                            finalChange: -1,
                            teamPerformance: 0,
                            individualPerformance: 0,
                            badgeBonus: 0,
                            badgesEarned: [],
                            isPenalty: true
                        }
                    };
                }
             }
        }
        
        // Even if no rating penalty, update the counter for internal logic
        if (p.consecutiveMissedSessions !== missedSessionsSinceLastPlay) {
            return { ...p, consecutiveMissedSessions: missedSessionsSinceLastPlay };
        }

        return p;
    });

    return { updatedPlayers, modified };
};

export const initializeAppState = async (): Promise<InitialAppState> => {
    const loadedSession = await loadActiveSessionFromDB() || null;
    const loadedHistoryData = await loadHistoryFromDB(30) || []; // Load more history for auditing
    const loadedPlayersData = await loadPlayersFromDB();
    let initialPlayers: Player[] = Array.isArray(loadedPlayersData) ? loadedPlayersData : [];
    
    // Run retroactive audit
    const audit = runInactivityAudit(initialPlayers, loadedHistoryData);
    initialPlayers = audit.updatedPlayers;

    if (audit.modified) {
        savePlayersToDB(initialPlayers).catch(e => console.warn("Initial sync failed", e));
    }

    const loadedNews = await loadNewsFromDB(15);
    const initialNewsFeed = Array.isArray(loadedNews) ? loadedNews : [];
    const loadedLang = await loadLanguageFromDB() || 'en';
    const loadedPack = await loadActiveVoicePackFromDB() || 1;

    return {
        session: loadedSession,
        players: initialPlayers,
        history: loadedHistoryData,
        newsFeed: initialNewsFeed,
        language: loadedLang,
        activeVoicePack: loadedPack,
    };
};
