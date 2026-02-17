
import React from 'react';
import { Session, Player, GameStatus, RotationMode, Team, Game, Goal, SessionStatus, EventLogEntry, EventType, StartRoundPayload, GoalPayload, PlayerStatus, PlayerTier, BadgeType, NewsItem } from './types';
import { Language } from './translations/index';
import { 
    savePlayersToDB, 
    saveActiveSessionToDB, 
    saveHistoryToDB,
    saveLanguageToDB,
    saveNewsToDB,
    saveActiveVoicePackToDB,
    loadHistoryFromDB,
    loadNewsFromDB,
    fetchRemotePlayers
} from './db';
import { initializeAppState } from './services/appInitializer';
import { useMatchTimer } from './hooks/useMatchTimer';
import { getTotmPlayerIds } from './services/statistics';

export type SortBy = 'rating' | 'name' | 'date';

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
  activeVoicePack: number;
  setActiveVoicePack: (packNumber: number) => void;
  isLoading: boolean;
  displayTime: number; 
  fetchHistory: (limit?: number) => Promise<void>;
  fetchFullNews: () => Promise<void>;
  
  // Player Database Persistent State
  playerDbSort: SortBy;
  setPlayerDbSort: React.Dispatch<React.SetStateAction<SortBy>>;
  playerDbSearch: string;
  setPlayerDbSearch: React.Dispatch<React.SetStateAction<string>>;

  // Global TOTM Cache
  totmPlayerIds: Set<string>;
}

const AppContext = React.createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isLoading, setIsLoading] = React.useState(true);
  
  // Safety lock: Don't auto-save to DB until we have confirmed sync with cloud
  const [isSaveEnabled, setIsSaveEnabled] = React.useState(false);

  const [activeSession, setActiveSession] = React.useState<Session | null>(null);
  const [allPlayers, setAllPlayers] = React.useState<Player[]>([]);
  const [history, setHistory] = React.useState<Session[]>([]);
  const [newsFeed, setNewsFeed] = React.useState<NewsItem[]>([]);
  const [language, setLanguageState] = React.useState<Language>('en');
  const [activeVoicePack, setActiveVoicePackState] = React.useState<number>(1);

  // Persistent UI State for Player Database
  const [playerDbSort, setPlayerDbSort] = React.useState<SortBy>('date');
  const [playerDbSearch, setPlayerDbSearch] = React.useState<string>('');

  // --- GLOBAL timer LOGIC ---
  const { displayTime } = useMatchTimer(activeSession, setActiveSession, activeVoicePack);

  // --- CALCULATE TOTM ONCE (Optimized) ---
  const totmPlayerIds = React.useMemo(() => {
      if (allPlayers.length < 5 || history.length === 0) return new Set<string>();
      return getTotmPlayerIds(history, allPlayers);
  }, [history, allPlayers]); // Only recalculate when history/players change

  // --- INITIAL DATA LOAD ---
  React.useEffect(() => {
    const initApp = async () => {
        try {
            // 1. Initial Load (Likely Local Cache)
            const initialState = await initializeAppState();
            setActiveSession(initialState.session);
            setAllPlayers(initialState.players);
            setHistory(initialState.history);
            setNewsFeed(initialState.newsFeed);
            setLanguageState(initialState.language);
            setActiveVoicePackState(initialState.activeVoicePack);
            
            // Remove Loading Screen quickly for UX
            setTimeout(() => setIsLoading(false), 500);

            // 2. BACKGROUND SYNC (Crucial for fixing the "65 vs 68" issue)
            // We do NOT enable saving yet. We wait for Cloud data.
            setTimeout(async () => {
                try {
                    const remotePlayers = await fetchRemotePlayers();
                    if (remotePlayers && remotePlayers.length > 0) {
                        console.log("Context: Overwriting local players with fresh Cloud data.");
                        setAllPlayers(remotePlayers);
                    }
                } catch (e) {
                    console.error("Background sync failed", e);
                } finally {
                    // 3. ENABLE SAVING
                    console.log("Context: Save Guard Lifted. Auto-save enabled.");
                    setIsSaveEnabled(true);
                }
            }, 1000);

        } catch (error) {
            console.error("Critical error loading data:", error);
            setIsLoading(false);
            setIsSaveEnabled(true); 
        }
    };

    initApp();
  }, []);

  // --- LAZY LOADING METHODS ---
  const fetchHistory = React.useCallback(async (limit?: number) => {
      const dbHistory = await loadHistoryFromDB(limit);
      if (dbHistory) {
          setHistory(prev => {
              const demoItems = prev.filter(s => s.id.startsWith('demo_'));
              const dbIds = new Set(dbHistory.map(s => s.id));
              const uniqueDemoItems = demoItems.filter(d => !dbIds.has(d.id));
              return [...uniqueDemoItems, ...dbHistory].sort((a, b) => 
                  new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
              );
          });
      }
  }, []);

  const fetchFullNews = React.useCallback(async () => {
      const fullNews = await loadNewsFromDB(); // No limit = full fetch
      if (fullNews) {
          setNewsFeed(prev => {
              const demoNews = prev.filter(n => n.id.startsWith('demo_'));
              const dbIds = new Set(fullNews.map(n => n.id));
              const uniqueDemoNews = demoNews.filter(dn => !dbIds.has(dn.id));
              return [...uniqueDemoNews, ...fullNews].sort((a, b) => 
                  new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
              );
          });
      }
  }, []);

  // --- PERSISTENCE EFFECT HOOKS (Save to DB) ---
  React.useEffect(() => {
    if(!isLoading && isSaveEnabled) {
        savePlayersToDB(allPlayers);
    }
  }, [allPlayers, isLoading, isSaveEnabled]);

  React.useEffect(() => {
    if(!isLoading && isSaveEnabled) {
        saveActiveSessionToDB(activeSession);
    }
  }, [activeSession, isLoading, isSaveEnabled]);

  React.useEffect(() => {
    if(!isLoading && isSaveEnabled) {
        saveHistoryToDB(history);
    }
  }, [history, isLoading, isSaveEnabled]);

  React.useEffect(() => {
    if(!isLoading && isSaveEnabled) {
        saveNewsToDB(newsFeed);
    }
  }, [newsFeed, isLoading, isSaveEnabled]);
  
  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    saveLanguageToDB(lang);
  };

  const setActiveVoicePack = (packNumber: number) => {
    setActiveVoicePackState(packNumber);
    saveActiveVoicePackToDB(packNumber);
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
    activeVoicePack,
    setActiveVoicePack,
    isLoading,
    displayTime,
    fetchHistory,
    fetchFullNews,
    playerDbSort,
    setPlayerDbSort,
    playerDbSearch,
    setPlayerDbSearch,
    totmPlayerIds // Exposed to all components
  };

  if(isLoading) {
    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#1A1D24]">
            <div className="relative flex flex-col items-center justify-center w-64 h-64">
                <div className="absolute inset-0 animate-spin" style={{ animationDuration: '2.5s' }}>
                    <svg viewBox="0 0 100 100" className="w-full h-full filter drop-shadow-[0_0_8px_rgba(0,242,254,0.4)]">
                        <defs>
                            <linearGradient id="ringGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                                <stop offset="0%" stopColor="#00F2FE" stopOpacity="1" />
                                <stop offset="100%" stopColor="#00F2FE" stopOpacity="0" />
                            </linearGradient>
                        </defs>
                        <circle 
                            cx="50" cy="50" r="48" 
                            fill="none" 
                            stroke="url(#ringGradient)" 
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeDasharray="180 300"
                        />
                    </svg>
                </div>
                
                {/* Эффект свечения за текстом */}
                <div className="absolute w-32 h-32 bg-dark-accent-start/10 blur-[40px] rounded-full animate-pulse"></div>

                <div className="flex flex-col items-center justify-center z-10">
                    <h1 
                      className="text-6xl font-black uppercase leading-none font-russo tracking-[0.1em] animate-pulse"
                      style={{ 
                          background: 'linear-gradient(180deg, #48CFCB 0%, #083344 100%)',
                          WebkitBackgroundClip: 'text',
                          WebkitTextFillColor: 'transparent',
                          filter: `
                              drop-shadow(1px 1px 0px #0E7490) 
                              drop-shadow(2px 2px 0px #000000) 
                              drop-shadow(0 0 20px rgba(72, 207, 203, 0.3))
                          `,
                      }}
                    >
                        UNIT
                    </h1>
                </div>
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
