
import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Page, Button, useTranslation } from '../components';
import { Player } from '../types';
import { getSessionAnthemUrl, loadSinglePlayerFromDB } from '../db';
import { PublicPlayerCard } from '../components/PublicPlayerCard';
import { useApp } from '../context';
import { Language } from '../translations/index';

const MusicLoader: React.FC<{ onInteract: () => void }> = ({ onInteract }) => {
    const t = useTranslation();
    return (
        <div 
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#1A1D24] cursor-pointer group select-none"
            onClick={onInteract}
        >
            <div className="relative flex flex-col items-center justify-center w-64 h-64 transition-transform duration-300 group-active:scale-95">
                {/* Rotating Ring */}
                <div className="absolute inset-0 animate-spin" style={{ animationDuration: '3s' }}>
                    <svg viewBox="0 0 100 100" className="w-full h-full">
                        <defs><linearGradient id="ringGradient" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stopColor="#00F2FE" stopOpacity="1" /><stop offset="100%" stopColor="#00F2FE" stopOpacity="0" /></linearGradient></defs>
                        <circle cx="50" cy="50" r="48" fill="none" stroke="url(#ringGradient)" strokeWidth="2" strokeLinecap="round" strokeDasharray="200 300" />
                    </svg>
                </div>
                
                {/* Content - Branded UNIT */}
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
                
                {/* CTA Text */}
                <p className="absolute -bottom-8 text-lg font-bold text-white animate-pulse tracking-widest text-center whitespace-nowrap drop-shadow-[0_0_5px_rgba(0,242,254,0.5)]">
                    {t.clickToEnter.toUpperCase()}
                </p>
            </div>
        </div>
    );
};


export const PublicProfileScreen: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const t = useTranslation();
    const navigate = useNavigate();
    const [player, setPlayer] = React.useState<Player | null>(null);
    const [isLoading, setIsLoading] = React.useState(true);
    const [isRefreshing, setIsRefreshing] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);
    const { language, setLanguage } = useApp();

    const [anthemUrl, setAnthemUrl] = React.useState<string | null>(null);
    const [userInteracted, setUserInteracted] = React.useState(false);
    const audioRef = React.useRef<HTMLAudioElement | null>(null);

    const [lastUpdated, setLastUpdated] = React.useState<Date | null>(null);
    const [cooldownExpiry, setCooldownExpiry] = React.useState<number>(0);
    const [timeRemaining, setTimeRemaining] = React.useState('');

    React.useEffect(() => {
        if (!id) return;
        const lastRefresh = localStorage.getItem(`lastRefresh_${id}`);
        if (lastRefresh) {
            setCooldownExpiry(parseInt(lastRefresh, 10) + 24 * 60 * 60 * 1000);
        }
    }, [id]);

    React.useEffect(() => {
        const updateTimer = () => {
            const remaining = cooldownExpiry - Date.now();
            if (remaining > 0) {
                const hours = Math.floor(remaining / (1000 * 60 * 60));
                const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
                setTimeRemaining(`${hours}h ${minutes}m`);
            } else {
                setTimeRemaining('');
            }
        };

        if (cooldownExpiry > 0) {
            updateTimer();
            const interval = setInterval(updateTimer, 30000); // Update every 30s
            return () => clearInterval(interval);
        }
    }, [cooldownExpiry]);


    const fetchPlayerAndMusic = async (forceRefresh: boolean = false) => {
        if (!id) return;
        
        if (forceRefresh) {
            if (Date.now() < cooldownExpiry) return; // Cooldown active, block refresh
            setIsRefreshing(true);
        } else {
            setIsLoading(true);
        }

        try {
            const [playerData, musicUrl] = await Promise.all([
                loadSinglePlayerFromDB(id, forceRefresh),
                getSessionAnthemUrl()
            ]);

            if (playerData) {
                const rawRecords = (playerData.records || {}) as any;
                playerData.records = {
                    bestGoalsInSession: rawRecords.bestGoalsInSession || { value: 0, sessionId: '' },
                    bestAssistsInSession: rawRecords.bestAssistsInSession || { value: 0, sessionId: '' },
                    bestWinRateInSession: rawRecords.bestWinRateInSession || { value: 0, sessionId: '' },
                };

                if (!playerData.badges) {
                    playerData.badges = {};
                }
                
                setPlayer(playerData);
                setLastUpdated(new Date());

                if (forceRefresh) {
                    const now = Date.now();
                    localStorage.setItem(`lastRefresh_${id}`, String(now));
                    setCooldownExpiry(now + 24 * 60 * 60 * 1000);
                }

            } else {
                setError("Player not found.");
            }
            setAnthemUrl(musicUrl);

        } catch (err) {
            console.error("Failed to load data:", err);
            setError("An error occurred while fetching data.");
        } finally {
            if (forceRefresh) setIsRefreshing(false);
            else setTimeout(() => setIsLoading(false), 500);
        }
    };

    React.useEffect(() => {
        if (!id) {
            setError("No player ID provided.");
            setIsLoading(false);
            return;
        }
        fetchPlayerAndMusic(false);
    }, [id]);

    React.useEffect(() => {
        if (userInteracted && anthemUrl && !audioRef.current) {
            const audio = new Audio(anthemUrl);
            audio.loop = true;
            audio.play().catch(e => console.error("Audio play failed:", e));
            audioRef.current = audio;
        }
        
        return () => {
            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current = null;
            }
        };
    }, [userInteracted, anthemUrl]);

    const handleInteraction = () => {
        setUserInteracted(true);
    };

    const showMusicLoader = !isLoading && anthemUrl && !userInteracted;

    const LanguageSwitcher = () => {
        const langButtonClass = (lang: Language) => `px-2 py-0.5 rounded-md text-[10px] font-bold transition-colors ${language === lang ? 'gradient-bg text-dark-bg' : 'bg-dark-surface hover:bg-white/10'}`;
        return (
            <div className="flex items-center gap-1 bg-dark-bg p-1 rounded-lg border border-white/10 shadow-lg">
                <button onClick={() => setLanguage('en')} className={langButtonClass('en')}>EN</button>
                <button onClick={() => setLanguage('ua')} className={langButtonClass('ua')}>UA</button>
                <button onClick={() => setLanguage('vn')} className={langButtonClass('vn')}>VN</button>
                <button onClick={() => setLanguage('ru')} className={langButtonClass('ru')}>RU</button>
            </div>
        );
    };

    if (showMusicLoader) {
        return <MusicLoader onInteract={handleInteraction} />;
    }

    const isCooldownActive = Date.now() < cooldownExpiry;
    const isDisabled = isRefreshing || isLoading || isCooldownActive;

    return (
        <Page>
            {/* Center Header Controls */}
            <div className="flex flex-col items-center justify-center w-full mb-8 relative z-10 pt-2">
                
                {/* 1. Language Switcher */}
                <LanguageSwitcher />

                {/* 2. Update Button & Text (Directly Below) */}
                <div className="flex flex-col items-center mt-4">
                    <button 
                        onClick={() => fetchPlayerAndMusic(true)}
                        disabled={isDisabled}
                        className={`
                            px-6 py-1.5 rounded-full text-[10px] font-bold tracking-[0.15em] uppercase transition-all duration-300 border
                            ${isDisabled 
                                ? 'border-white/5 text-white/20 cursor-not-allowed bg-transparent' 
                                : 'border-[#00F2FE] text-[#00F2FE] hover:bg-[#00F2FE]/10 shadow-[0_0_15px_rgba(0,242,254,0.15)] active:scale-95'
                            }
                        `}
                    >
                        {isRefreshing ? 'UPDATING...' : 'UPDATE DATA'}
                    </button>
                    
                    <span className="text-[8px] font-mono text-dark-text-secondary/50 mt-1.5 uppercase tracking-wider text-center">
                        {timeRemaining 
                            ? `NEXT UPDATE: ${timeRemaining}` 
                            : 'AVAILABLE ONCE PER 24H'
                        }
                    </span>
                </div>
            </div>
            
            {isLoading && (
                 <div className="flex items-center justify-center pt-10">
                    <div className="relative flex flex-col items-center justify-center w-48 h-48">
                        <div className="absolute inset-0 animate-spin" style={{ animationDuration: '2s' }}>
                            <svg viewBox="0 0 100 100" className="w-full h-full">
                                <defs><linearGradient id="ringGradient" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stopColor="#00F2FE" stopOpacity="1" /><stop offset="100%" stopColor="#00F2FE" stopOpacity="0" /></linearGradient></defs>
                                <circle cx="50" cy="50" r="48" fill="none" stroke="url(#ringGradient)" strokeWidth="2" strokeLinecap="round" strokeDasharray="200 300"/>
                            </svg>
                        </div>
                        <div className="flex flex-col items-center justify-center z-10">
                            <h1 
                                className="text-4xl font-black uppercase leading-none font-russo tracking-[0.1em] animate-pulse"
                                style={{ 
                                    background: 'linear-gradient(180deg, #48CFCB 0%, #083344 100%)',
                                    WebkitBackgroundClip: 'text',
                                    WebkitTextFillColor: 'transparent',
                                    filter: `
                                        drop-shadow(1px 1px 0px #0E7490) 
                                        drop-shadow(2px 2px 0px #000000) 
                                        drop-shadow(0 0 10px rgba(72, 207, 203, 0.3))
                                    `,
                                }}
                            >
                                UNIT
                            </h1>
                        </div>
                    </div>
                </div>
            )}

            {error && (
                <div className="text-center mt-10">
                    <p className="text-lg text-red-400">{error}</p>
                    <button onClick={() => navigate(-1)} className="mt-4 text-dark-accent-start">Go Back</button>
                </div>
            )}

            {!isLoading && !error && player && (
                <PublicPlayerCard player={player} />
            )}
        </Page>
    );
};
