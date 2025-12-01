import React from 'react';
import { Session, Player, GameStatus, RotationMode, Team, Game, Goal, SessionStatus, EventLogEntry, EventType, StartRoundPayload, GoalPayload, PlayerStatus, PlayerTier, BadgeType, NewsItem } from './types';
import { Language } from './translations';
import { 
    loadPlayersFromDB, savePlayersToDB, 
    loadActiveSessionFromDB, saveActiveSessionToDB, 
    loadHistoryFromDB, saveHistoryToDB,
    loadLanguageFromDB, saveLanguageToDB,
    loadNewsFromDB, saveNewsToDB
} from './db';
import { useGlobalTimer } from './hooks/useGlobalTimer';

interface AppContextType {
  activeSession: Session | null;
  setActiveSession: React.Dispatch<React.SetStateAction<Session | null>>;
  allPlayers: Player[];
  setAllPlayers: React.Dispatch<React.SetStateAction<Player[]>>;
  history: Session[];
  setHistory: React.Dispatch<React.SetStateAction<Session[]>>;
  newsFeed: NewsItem[];
  setNewsFeed: React.Dispatch<React.SetStateAction<NewsItem[]>>;
  language: Language;
  setLanguage: (lang: Language) => void;
  isLoading: boolean;
  displayTime: number;
}

const AppContext = React.createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isLoading, setIsLoading] = React.useState(true);
  const [activeSession, setActiveSession] = React.useState<Session | null>(null);
  const [allPlayers, setAllPlayers] = React.useState<Player[]>([]);
  const [history, setHistory] = React.useState<Session[]>([]);
  const [newsFeed, setNewsFeed] = React.useState<NewsItem[]>([]);
  const [language, setLanguageState] = React.useState<Language>('en');

  const { displayTime } = useGlobalTimer(activeSession, setActiveSession);

  // --- INITIAL DATA LOAD (Async from IndexedDB with LocalStorage Migration) ---
  React.useEffect(() => {
    const initApp = async () => {
        try {
            // 1. Load Active Session
            let loadedSession = await loadActiveSessionFromDB();
            if (loadedSession) {
                // Ensure data structure integrity
                if (!loadedSession.playerPool) loadedSession.playerPool = [];
                if (!loadedSession.teams) loadedSession.teams = [];
                if (!loadedSession.games) loadedSession.games = [];
                if (!loadedSession.eventLog) loadedSession.eventLog = [];
                setActiveSession(loadedSession);
            }

            // 2. Load Players
            let loadedPlayers = await loadPlayersFromDB();
            
            let initialPlayers: Player[] = Array.isArray(loadedPlayers) ? loadedPlayers : [];
            
            // Migration loop to ensure fields exist on real players
            initialPlayers = initialPlayers.map(p => {
                // Badge data migration from string array to object counter
                let badges: Partial<Record<BadgeType, number>> = {};
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
                };
            });
            
            setAllPlayers(initialPlayers);

            // 3. Load History
            let loadedHistory = await loadHistoryFromDB();
            
            let initialHistory: Session[] = [];
            if (Array.isArray(loadedHistory)) {
                initialHistory = loadedHistory.map((s: any) => ({
                    ...s,
                    teams: s.teams || [],
                    games: s.games || [],
                    playerPool: s.playerPool || [],
                    eventLog: s.eventLog || []
                }));
            }
            
            setHistory(initialHistory);

            // 4. Load News Feed
            let loadedNews = await loadNewsFromDB();
            if (Array.isArray(loadedNews)) {
                setNewsFeed(loadedNews);
            }

            // 5. Load Language
            const loadedLang = await loadLanguageFromDB();
            if (loadedLang) {
                setLanguageState(loadedLang);
            }

        } catch (error) {
            console.error("Critical error loading data:", error);
        } finally {
            setIsLoading(false);
        }
    };

    initApp();
  }, []);

  // --- PERSISTENCE EFFECT HOOKS (Save to DB) ---

  React.useEffect(() => {
    if(!isLoading) {
        saveActiveSessionToDB(activeSession);
    }
  }, [activeSession, isLoading]);

  React.useEffect(() => {
    if(!isLoading) {
        savePlayersToDB(allPlayers);
    }
  }, [allPlayers, isLoading]);

  React.useEffect(() => {
    if(!isLoading) {
        saveHistoryToDB(history);
    }
  }, [history, isLoading]);

  React.useEffect(() => {
    if(!isLoading) {
        saveNewsToDB(newsFeed);
    }
  }, [newsFeed, isLoading]);
  
  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    saveLanguageToDB(lang);
  };

  const value = {
    activeSession,
    setActiveSession,
    allPlayers,
    setAllPlayers,
    history,
    setHistory,
    newsFeed,
    setNewsFeed,
    language,
    setLanguage,
    isLoading,
    displayTime,
  };

  if(isLoading) {
    return (
        <div className="flex items-center justify-center h-screen bg-dark-bg">
            <div className="flex flex-col items-center gap-4">
                 <div className="w-12 h-12 border-4 border-dark-accent-start border-t-transparent rounded-full animate-spin"></div>
                 <div className="text-xl font-bold text-dark-text animate-pulse">Loading 532 Playground...</div>
            </div>
        </div>
    );
  }

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useApp = (): AppContextType => {
  const context = React.useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};