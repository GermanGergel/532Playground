
import React from 'react';
import { Session, Player, NewsItem } from './types';
import { Language } from './translations/index';
import { 
    saveLocalPlayers, 
    saveActiveSessionToDB, 
    saveLocalHistory,
    saveLanguageToDB,
    saveLocalNews,
    saveActiveVoicePackToDB
} from './db';
import { initializeAppState } from './services/appInitializer';
import { useMatchTimer } from './hooks/useMatchTimer';

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
}

const AppContext = React.createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isLoading, setIsLoading] = React.useState(true);
  const [activeSession, setActiveSession] = React.useState<Session | null>(null);
  const [allPlayers, setAllPlayers] = React.useState<Player[]>([]);
  const [history, setHistory] = React.useState<Session[]>([]);
  const [newsFeed, setNewsFeed] = React.useState<NewsItem[]>([]);
  const [language, setLanguageState] = React.useState<Language>('en');
  const [activeVoicePack, setActiveVoicePackState] = React.useState<number>(1);

  // --- GLOBAL TIMER LOGIC ---
  const { displayTime } = useMatchTimer(activeSession, setActiveSession, activeVoicePack);

  // --- INITIAL DATA LOAD ---
  React.useEffect(() => {
    const initApp = async () => {
        try {
            const initialState = await initializeAppState();
            setActiveSession(initialState.session);
            
            // Only set if we actually got data, to prevent wiping state on error
            if (initialState.players.length > 0) setAllPlayers(initialState.players);
            if (initialState.history.length > 0) setHistory(initialState.history);
            if (initialState.newsFeed.length > 0) setNewsFeed(initialState.newsFeed);
            
            setLanguageState(initialState.language);
            setActiveVoicePackState(initialState.activeVoicePack);
        } catch (error) {
            console.error("Critical error loading data:", error);
        } finally {
            setTimeout(() => {
                setIsLoading(false);
            }, 1000);
        }
    };

    initApp();
  }, []);

  // --- PERSISTENCE EFFECT HOOKS (Save to LOCAL CACHE ONLY) ---
  // These hooks now ensure that state is always saved to IndexedDB for offline support.
  // Actual Cloud syncing is done explicitly in action handlers (e.g. handleFinishSession)
  // to avoid "Supabase Save History Error" (Payload Too Large) and infinite loops.

  React.useEffect(() => {
    if(!isLoading) {
        saveActiveSessionToDB(activeSession);
    }
  }, [activeSession, isLoading]);

  React.useEffect(() => {
    if(!isLoading && history.length > 0) {
        saveLocalHistory(history);
    }
  }, [history, isLoading]);

  React.useEffect(() => {
    if(!isLoading && allPlayers.length > 0) {
        saveLocalPlayers(allPlayers);
    }
  }, [allPlayers, isLoading]);

  React.useEffect(() => {
    if(!isLoading && newsFeed.length > 0) {
        saveLocalNews(newsFeed);
    }
  }, [newsFeed, isLoading]);
  
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
  };

  if(isLoading) {
    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#1A1D24]">
            <div className="relative flex flex-col items-center justify-center w-64 h-64">
                <div className="absolute inset-0 animate-spin" style={{ animationDuration: '2s' }}>
                    <svg viewBox="0 0 100 100" className="w-full h-full">
                        <defs>
                            <linearGradient id="ringGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                                <stop offset="0%" stopColor="#00F2FE" stopOpacity="1" />
                                <stop offset="100%" stopColor="#00F2FE" stopOpacity="0" />
                            </linearGradient>
                        </defs>
                        <circle cx="50" cy="50" r="48" fill="none" stroke="url(#ringGradient)" strokeWidth="2" strokeLinecap="round" strokeDasharray="200 300" />
                    </svg>
                </div>
                <div className="flex flex-col items-center justify-center z-10">
                    <h1 className="text-5xl font-black text-[#00F2FE] tracking-tighter" style={{ textShadow: '0 0 15px rgba(0, 242, 254, 0.5)' }}>
                        532
                    </h1>
                    <h2 className="text-xl font-bold text-white tracking-[0.2em] mt-1">
                        PLAYGROUND
                    </h2>
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
