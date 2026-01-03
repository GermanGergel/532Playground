
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context';
// FIX: Added PlayerTier to imports from types
import { Player, PlayerStatus, PlayerForm, SkillType, PlayerTier } from '../types';
import { TrophyIcon, Users, History as HistoryIcon, BarChartDynamic, StarIcon, ChevronLeft, Zap, WhatsApp, YouTubeIcon, InstagramIcon, TikTokIcon, FacebookIcon, XCircle, Home, LayoutDashboard, AwardIcon, Target, InfoIcon } from '../icons';
import { PlayerAvatar, TeamAvatar } from '../components/avatars';
import { Language } from '../translations/index';
import { BadgeDisplay, BadgeIcon, sortBadgesByPriority } from '../features';
import { useTranslation } from '../ui';
import { convertCountryCodeAlpha3ToAlpha2 } from '../utils/countries';
import { ClubIntelligenceDashboard } from '../components/ClubIntelligenceDashboard';
import { RadioPlayer } from '../components/RadioPlayer';
import { sortPlayersByRating } from '../services/statistics';

// --- TYPE DEFINITIONS ---
// FIX: Defined missing DashboardViewType
type DashboardViewType = 'dashboard' | 'roster' | 'archive' | 'tournaments' | 'league' | 'info' | 'duel';

// --- CONSTANTS ---
// FIX: Defined TIER_COLORS for CinematicCard
const TIER_COLORS = {
    [PlayerTier.Legend]: '#d946ef',
    [PlayerTier.Elite]: '#fbbf24',
    [PlayerTier.Pro]: '#E2E8F0',
    [PlayerTier.Regular]: '#00F2FE'
};

// --- SUB-COMPONENTS ---

const skillAbbreviations: Record<SkillType, string> = {
    goalkeeper: 'GK', power_shot: 'PS', technique: 'TQ', defender: 'DF', 
    playmaker: 'PM', finisher: 'FN', versatile: 'VS', tireless_motor: 'TM', leader: 'LD',
};

const StaticSoccerBall: React.FC = () => (
    <div className="relative w-9 h-9 md:w-10 md:h-10 shrink-0 z-20 pointer-events-none ml-3">
        <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-[0_4px_12px_rgba(0,0,0,0.9)] overflow-visible">
            <defs>
                <radialGradient id="ballShading" cx="40%" cy="35%" r="65%"><stop offset="0%" stopColor="#ffffff" /><stop offset="50%" stopColor="#e2e8f0" /><stop offset="85%" stopColor="#94a3b8" /><stop offset="100%" stopColor="#1e293b" /></radialGradient>
                <linearGradient id="hatBodyGradient" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#ff4d4d" /><stop offset="40%" stopColor="#e60000" /><stop offset="100%" stopColor="#990000" /></linearGradient>
                <radialGradient id="pompomGradient" cx="40%" cy="35%" r="50%"><stop offset="0%" stopColor="#ffffff" /><stop offset="70%" stopColor="#f1f5f9" /><stop offset="100%" stopColor="#cbd5e1" /></radialGradient>
                <filter id="hatShadow" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur in="SourceAlpha" stdDeviation="1.5" /><feOffset dx="0" dy="2" result="offsetblur" /><feComponentTransfer><feFuncA type="linear" slope="0.4" /></feComponentTransfer><feMerge><feMergeNode /><feMergeNode in="SourceGraphic" /></feMerge></filter>
                <filter id="furTexture"><feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="4" result="noise" /><feDisplacementMap in="SourceGraphic" in2="noise" scale="1.5" /></filter>
            </defs>
            <circle cx="50" cy="50" r="48" fill="url(#ballShading)" />
            <g stroke="#000" strokeWidth="0.8" fill="none" opacity="0.25">
                <path d="M50 32 L68 45 L61 66 L39 66 L32 45 Z" /><path d="M50 32 L50 2" /><path d="M68 45 L95 38" /><path d="M61 66 L82 92" /><path d="M39 66 L18 92" /><path d="M32 45 L5 38" /><path d="M18 92 Q 50 98 82 92" /><path d="M5 38 Q 4 15 50 2" /><path d="M95 38 Q 96 15 50 2" />
            </g>
            <text x="51" y="52" textAnchor="middle" fill="#0f172a" className="font-aldrich font-black uppercase" style={{ fontSize: '17px', letterSpacing: '-0.02em', transform: 'scaleX(0.85) rotate(-3deg)', transformOrigin: 'center' }}>SELECT</text>
            <text x="50" y="61" textAnchor="middle" fill="#475569" className="font-chakra font-black uppercase" style={{ fontSize: '3.2px', letterSpacing: '0.1em', opacity: 0.8, transform: 'rotate(-3deg)', transformOrigin: 'center' }}>Professional Futsal</text>
            <ellipse cx="40" cy="25" rx="20" ry="10" fill="white" opacity="0.3" transform="rotate(-15, 40, 25)" />
            <g transform="translate(0, -25)" filter="url(#hatShadow)">
                <path d="M 18 42 L 18 20 C 18 -15, 88 -18, 90 25 L 82 42 Z" fill="url(#hatBodyGradient)" stroke="#7f1d1d" strokeWidth="0.3" />
                <path d="M 22 25 C 22 -5, 75 -10, 80 20" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" opacity="0.1" />
                <circle cx="90" cy="25" r="8.5" fill="url(#pompomGradient)" stroke="#94a3b8" strokeWidth="0.1" /><circle cx="90" cy="25" r="8.5" fill="black" opacity="0.05" transform="translate(-1, 1)" />
                <circle cx="90" cy="25" r="8.5" fill="black" opacity="0.05" transform="translate(-1, 1)" />
                <g filter="url(#furTexture)"><path d="M 8 40 Q 50 25 92 40 Q 96 48 92 55 Q 50 40 8 55 Q 4 48 8 40 Z" fill="#FFFFFF" stroke="#f1f5f9" strokeWidth="0.2" /></g>
                <path d="M 12 48 Q 50 38 88 48" fill="none" stroke="#cbd5e1" strokeWidth="0.5" opacity="0.3" />
            </g>
        </svg>
    </div>
);

const FormArrowIndicator: React.FC<{ form: PlayerForm }> = ({ form }) => {
    const config = {
        hot_streak: { color: '#4CFF5F' }, stable: { color: '#A9B1BD' }, cold_streak: { color: '#FF4136' },
    };
    const currentForm = config[form] || config.stable;
    const commonProps: React.SVGProps<SVGSVGElement> = {
        width: "24", height: "24", viewBox: "0 0 24 24", fill: "none", stroke: currentForm.color,
        strokeWidth: "2.5", strokeLinecap: "round", strokeLinejoin: "round",
    };
    switch (form) {
        case 'hot_streak': return <svg {...commonProps}><path d="M12 19V5m-6 7l6-6 6 6"/></svg>;
        case 'cold_streak': return <svg {...commonProps}><path d="M12 5v14M12 5v14M5 12l7 7 7-7"/></svg>;
        default: return <svg {...commonProps}><path d="M5 12h14m-6-6l6 6-6 6"/></svg>;
    }
};

const NoLeadersPlaceholder: React.FC = () => {
    const t = useTranslation();
    return (
        <div className="w-full max-w-2xl mx-auto py-20 flex flex-col items-center justify-center relative">
            <div className="absolute inset-0 bg-[#00F2FE]/5 blur-[60px] rounded-full animate-pulse"></div>
            <div className="relative z-10 flex flex-col items-center gap-6 opacity-30">
                <div className="w-20 h-20 rounded-full border-2 border-dashed border-[#00F2FE] animate-spin-slow flex items-center justify-center">
                    <TrophyIcon className="w-10 h-10 text-[#00F2FE]" />
                </div>
                <div className="text-center">
                    <h3 className="font-orbitron text-lg font-black text-white tracking-[0.4em] uppercase">
                        {t.hubAwaitingStats}
                    </h3>
                    <p className="font-chakra text-[10px] text-white/50 tracking-[0.2em] mt-2 uppercase">
                        {t.hubAnalyzingPerformance}
                    </p>
                </div>
            </div>
            <style dangerouslySetInnerHTML={{ __html: `
                @keyframes spin-slow { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                .animate-spin-slow { animation: spin-slow 15s linear infinite; }
            `}} />
        </div>
    );
};

const MotivationalTicker: React.FC = () => {
    const phrases = [
        "DATA BUILDS LEGENDS •",
        "NUMBERS NEVER LIE •",
        "THE PITCH DECIDES EVERYTHING •",
        "PERFORMANCE OVER HYPE •",
        "PROVEN, NOT PROMISED •",
        "532 — WHERE ELITES PLAY"
    ];
    return (
        <div className="relative w-full h-full overflow-hidden flex items-center">
            <style dangerouslySetInnerHTML={{ __html: `
                @keyframes hub-ticker {
                    0% { transform: translateX(0); }
                    100% { transform: translateX(-50%); }
                }
                .animate-hub-ticker {
                    display: flex;
                    width: fit-content;
                    animation: hub-ticker 45s linear infinite;
                }
            `}} />
            <div className="animate-hub-ticker whitespace-nowrap flex gap-16">
                {[...phrases, ...phrases].map((phrase, i) => (
                    <span 
                        key={i} 
                        className="text-[14px] md:text-[16px] font-bold tracking-[0.1em] uppercase flex items-center font-inter-tight italic text-transparent bg-clip-text bg-gradient-to-b from-white to-white/20" 
                        style={{ textShadow: `0 0 15px rgba(255, 255, 255, 0.05)` }}
                    >
                        {phrase}
                    </span>
                ))}
            </div>
        </div>
    );
};

// FIX: Added missing HubNav component
const HubNav: React.FC<{ 
    isDashboardOpen: boolean; 
    sessionDate: string; 
    activeTab: DashboardViewType;
    onTabChange: (tab: DashboardViewType) => void;
    archiveViewDate: string | null;
    onHomeClick: () => void;
}> = ({ isDashboardOpen, sessionDate, activeTab, onTabChange, archiveViewDate, onHomeClick }) => {
    const t = useTranslation();
    const navItems: { id: DashboardViewType; label: string; icon: any }[] = [
        { id: 'dashboard', label: t.hubDashboardBtn, icon: LayoutDashboard },
        { id: 'roster', label: t.hubPlayers, icon: Users },
        { id: 'archive', label: t.navHistory, icon: HistoryIcon },
        { id: 'info', label: t.information, icon: InfoIcon },
    ];

    return (
        <nav className="fixed top-0 left-0 right-0 h-16 bg-[#0a0c10]/80 backdrop-blur-xl border-b border-white/5 z-[100] flex items-center justify-between px-6">
            <div className="flex items-center gap-4 cursor-pointer" onClick={onHomeClick}>
                <div className="flex flex-col items-start">
                    <span className="text-xl font-black text-[#00F2FE] leading-none">532</span>
                    <span className="text-[6px] font-bold text-white tracking-[0.2em]">HUB</span>
                </div>
            </div>

            {isDashboardOpen ? (
                <div className="flex items-center gap-1 md:gap-4">
                    {navItems.map(item => (
                        <button
                            key={item.id}
                            onClick={() => onTabChange(item.id)}
                            className={`px-3 py-1.5 rounded-lg flex items-center gap-2 transition-all ${activeTab === item.id ? 'bg-[#00F2FE]/10 text-[#00F2FE] border border-[#00F2FE]/20' : 'text-white/40 hover:text-white/60'}`}
                        >
                            <item.icon className="w-3.5 h-3.5" />
                            <span className="text-[10px] font-black uppercase tracking-widest hidden sm:block">{item.label}</span>
                        </button>
                    ))}
                </div>
            ) : (
                <div className="flex flex-col items-end">
                    <span className="text-[10px] font-black text-white/80 uppercase tracking-widest leading-none">{t.hubTicker1}</span>
                    <span className="text-[7px] font-mono text-white/30 uppercase mt-1 tracking-wider">{sessionDate}</span>
                </div>
            )}
            
            <div className="flex items-center gap-4">
                <RadioPlayer />
                {!isDashboardOpen && (
                   <button 
                       onClick={() => onTabChange('dashboard')} 
                       className="bg-[#00F2FE] text-black font-black text-[10px] px-4 py-2 rounded-lg tracking-widest uppercase hover:scale-105 active:scale-95 transition-all"
                   >
                       {t.hubDashboardBtn}
                   </button>
                )}
                {isDashboardOpen && (
                   <button 
                       onClick={onHomeClick} 
                       className="text-white/40 hover:text-white transition-colors"
                   >
                       <XCircle className="w-6 h-6" />
                   </button>
                )}
            </div>
        </nav>
    );
};

// FIX: Added missing HeroTitle component
const HeroTitle: React.FC = () => {
    const t = useTranslation();
    return (
        <div className="mt-16 mb-12 flex flex-col items-center">
            <StaticSoccerBall />
            <div className="text-center mt-6">
                <h1 className="text-6xl md:text-8xl font-black italic tracking-tighter text-white" style={{ textShadow: '0 0 30px rgba(255, 255, 255, 0.1)' }}>
                    <span className="text-[#00F2FE]">532</span> HUB
                </h1>
                <p className="text-[10px] md:text-xs font-chakra font-bold text-white/40 uppercase tracking-[0.6em] mt-4 max-w-sm mx-auto leading-relaxed text-center px-4">
                    {t.hubWelcomeText}
                </p>
            </div>
        </div>
    );
};

// FIX: Added missing CinematicCard component
const CinematicCard: React.FC<{ player: Player; rank: number }> = ({ player, rank }) => {
    const t = useTranslation();
    const tierColor = TIER_COLORS[player.tier] || '#00F2FE';
    const countryCodeAlpha2 = player.countryCode ? convertCountryCodeAlpha3ToAlpha2(player.countryCode) : null;
    
    return (
        <div className={`relative group transition-all duration-700 hover:scale-105 ${rank === 1 ? 'w-[280px] md:w-[320px] h-[400px] md:h-[460px] z-20' : 'w-[220px] md:w-[260px] h-[320px] md:h-[380px] z-10'}`}>
            <div className="absolute inset-0 rounded-[2rem] overflow-hidden border border-white/10 shadow-2xl bg-[#161b22]">
                {player.playerCard && (
                    <div className="absolute inset-0 bg-cover bg-no-repeat grayscale-[0.2] group-hover:grayscale-0 transition-all duration-700" style={{ backgroundImage: `url(${player.playerCard})`, backgroundPosition: 'center 5%' }} />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent"></div>
                <div className="absolute inset-0 p-6 flex flex-col justify-between">
                    <div className="flex justify-between items-start">
                        <div className="flex flex-col">
                            <span className="text-2xl font-black text-[#00F2FE] leading-none">532</span>
                            {countryCodeAlpha2 && <img src={`https://flagcdn.com/w80/${countryCodeAlpha2.toLowerCase()}.png`} className="w-6 h-auto mt-2 rounded-sm" alt="" />}
                        </div>
                        <div className="flex flex-col items-end">
                            <span className="text-4xl font-black text-[#00F2FE] leading-none">{player.rating}</span>
                            <span className="text-[8px] font-black tracking-widest text-white/50 mt-1 uppercase">OVR</span>
                        </div>
                    </div>
                    <div className="text-center">
                        <div className="inline-block px-3 py-1 rounded-full bg-white/5 border border-white/10 backdrop-blur-md mb-3">
                            <span className="text-[10px] font-black uppercase tracking-widest text-white/80">{rank === 1 ? '🥇 LEADER' : rank === 2 ? '🥈 CONTENDER' : '🥉 ELITE'}</span>
                        </div>
                        <h3 className="text-3xl font-russo uppercase tracking-tighter text-white drop-shadow-lg leading-none">{player.nickname}</h3>
                        <p className="text-[8px] font-black text-white/40 uppercase tracking-[0.4em] mt-2 italic">{player.tier}</p>
                    </div>
                </div>
            </div>
            <div className={`absolute -top-3 -right-3 w-10 h-10 rounded-full flex items-center justify-center border-2 z-30 shadow-xl ${rank === 1 ? 'bg-[#FFD700] border-white text-black' : 'bg-[#0a0c10] border-white/20 text-white'}`}>
                <span className="font-russo font-bold text-lg">#{rank}</span>
            </div>
        </div>
    );
};

// FIX: Added missing CinematicStatCard component
const CinematicStatCard: React.FC<{ value: number; label: string }> = ({ value, label }) => (
    <div className="flex-1 w-full md:w-auto p-8 rounded-[2rem] bg-white/[0.02] border border-white/5 flex flex-col items-center justify-center group hover:bg-white/[0.04] hover:border-[#00F2FE]/20 transition-all duration-500">
        <span className="text-5xl md:text-7xl font-russo font-black text-white/90 mb-2 group-hover:text-[#00F2FE] transition-colors">{value}</span>
        <div className="h-px w-8 bg-white/10 group-hover:w-16 group-hover:bg-[#00F2FE]/50 transition-all duration-500 mb-2"></div>
        <span className="text-[10px] font-black text-white/30 uppercase tracking-[0.3em] group-hover:text-white/60 transition-colors">{label}</span>
    </div>
);


export const PublicHubScreen: React.FC = () => {
    const navigate = useNavigate();
    const { allPlayers, history } = useApp();
    const [isDashboardOpen, setIsDashboardOpen] = useState(false);
    
    // TYPED STATE: dashboardView now strictly follows DashboardViewType
    const [dashboardView, setDashboardView] = useState<DashboardViewType>('dashboard');
    const [archiveViewDate, setArchiveViewDate] = useState<string | null>(null);

    useEffect(() => {
        if (isDashboardOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => { document.body.style.overflow = ''; };
    }, [isDashboardOpen]);

    const latestSessionDate = useMemo(() => {
        if (!history || history.length === 0) return '';
        return new Date(history[0].date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
    }, [history]);

    const displayData = useMemo(() => {
        const confirmedRealPlayers = allPlayers.filter(p => p.status === PlayerStatus.Confirmed);
        
        // --- UPDATED TO USE UNIFIED SORTING LOGIC ---
        const sorted = sortPlayersByRating(confirmedRealPlayers);
        
        return { top: sorted.slice(0, 3) };
    }, [allPlayers]);
    
    const clubStats = useMemo(() => {
        const confirmedPlayers = allPlayers.filter(p => p.status === PlayerStatus.Confirmed);
        const totalPlayers = confirmedPlayers.length;
        const totalSessions = history.length + 1; 
        const avgRating = totalPlayers > 0 ? Math.round(confirmedPlayers.reduce((sum, p) => sum + p.rating, 0) / totalPlayers) : 0;
        return { totalPlayers, totalSessions, avgRating };
    }, [allPlayers, history]);
    
    const t = useTranslation();

    const SOCIAL_LINKS = {
        whatsapp: "https://chat.whatsapp.com/CAJnChuM4lQFf3s2YUnhQr",
        facebook: "https://www.facebook.com/share/g/1ANVC1p1K5/",
        youtube: "https://youtube.com/@playground532?si=_NqI_aOcvmjlSMFn",
        instagram: "https://www.instagram.com/532playground?igsh=MTdzdHpwMjY3aHN4cg%3D%3D&utm_source=qr",
        tiktok: "https://www.tiktok.com/@532playground",
    };

    // Helper for safe tab changes
    const handleTabChange = (tab: any) => {
        setDashboardView(tab as DashboardViewType);
        if (!isDashboardOpen) setIsDashboardOpen(true); // Ensure dashboard opens when a tab is selected
    };

    return (
        <div className="min-h-screen text-white relative selection:bg-[#00F2FE] selection:text-black bg-[#0a0c10] pt-px overscroll-none">
            <style dangerouslySetInnerHTML={{__html: `html, body { background-color: #0a0c10; overscroll-behavior-y: none; }`}} />
            
            <div className={`fixed top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-50 z-[110]`}></div>
            
            <HubNav 
                isDashboardOpen={isDashboardOpen} 
                sessionDate={latestSessionDate} 
                activeTab={dashboardView}
                onTabChange={handleTabChange}
                archiveViewDate={archiveViewDate}
                onHomeClick={() => {
                    setIsDashboardOpen(false);
                    setDashboardView('dashboard'); // Reset to default view
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
            />

            {/* DASHBOARD OVERLAY - FIXED BACKGROUND APPLIED HERE */}
            <div 
                className={`fixed inset-0 z-[60] transform transition-all duration-700 ease-in-out flex pt-20 pb-8 md:pb-12 overflow-y-auto overscroll-none 
                ${isDashboardOpen ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0 pointer-events-none'}
                bg-[#0a0c10]
                `}
            >
                {/* No Texture Overlay - Pure Clean Background */}
                <div className="relative max-w-[1450px] w-full mx-auto px-0 z-10">
                    <ClubIntelligenceDashboard currentView={dashboardView} setView={setDashboardView} onArchiveViewChange={setArchiveViewDate} />
                </div>
            </div>

            <div className={`relative z-10 w-full px-6 md:px-12 transition-all duration-1000 ${isDashboardOpen ? 'opacity-0 scale-95 translate-y-[-100px] pointer-events-none' : 'opacity-100 scale-100 translate-y-0'}`}>
                <HeroTitle />
                
                <div className="text-center mb-12 md:mb-20">
                    <TrophyIcon className="w-8 h-8 md:w-10 md:h-10 mx-auto mb-4 text-[#00F2FE]" style={{ filter: 'drop-shadow(0 0 10px rgba(0, 242, 254, 0.7))' }} />
                    <h2 className="font-orbitron text-xl md:text-3xl font-black uppercase tracking-[0.2em] text-white/80" style={{ textShadow: '0 0 15px rgba(255, 255, 255, 0.2)'}}>{t.hubLeadersTitle}</h2>
                </div>

                {displayData.top.length > 0 ? (
                    <div className="flex flex-wrap items-end justify-center gap-4 md:gap-8 w-full">
                        <div className="order-2 md:order-1">{displayData.top[1] && <CinematicCard player={displayData.top[1]} rank={2} />}</div>
                        <div className="order-1 md:order-2">{displayData.top[0] && <CinematicCard player={displayData.top[0]} rank={1} />}</div>
                        <div className="order-3 md:order-3">{displayData.top[2] && <CinematicCard player={displayData.top[2]} rank={3} />}</div>
                    </div>
                ) : (
                    <NoLeadersPlaceholder />
                )}

                <div className="mt-24 md:mt-32 pb-24">
                    <div className="text-center mb-12 md:mb-20">
                        <h2 className="font-orbitron text-lg md:text-2xl font-black uppercase tracking-[0.15em] text-white/80" style={{ textShadow: '0 0 15px rgba(255, 255, 255, 0.2)'}}>{t.hubVitalsTitle}</h2>
                    </div>
                     <div className="flex flex-col md:flex-row items-center justify-center gap-6 w-full max-w-4xl mx-auto">
                        <CinematicStatCard value={clubStats.totalPlayers} label={t.hubStatsMembers} />
                        <CinematicStatCard value={clubStats.totalSessions} label={t.hubSessionsPlayed} />
                        <CinematicStatCard value={clubStats.avgRating} label={t.hubAvgRating} />
                    </div>
                </div>
                
                <div className="relative z-10 bg-transparent pb-8">
                    <footer className="relative py-8 bg-transparent">
                        <div className="text-center px-4">
                            <div className="mt-10 mb-24">
                                <button 
                                    onClick={() => {
                                        setIsDashboardOpen(true);
                                        setDashboardView('dashboard');
                                    }} 
                                    className="mx-auto block bg-transparent text-[#00F2FE] font-bold text-lg py-3.5 px-10 rounded-xl shadow-[0_0_20px_rgba(0,242,254,0.4)] hover:shadow-[0_0_30px_rgba(0,242,254,0.6)] hover:bg-[#00F2FE]/10 transition-all transform hover:scale-[1.05] active:scale-95 group border border-[#00F2FE]/20"
                                >
                                    <span className="font-chakra font-black text-xl uppercase tracking-[0.25em] group-hover:text-white transition-colors">{t.hubDashboardBtn}</span>
                                </button>
                            </div>

                            <h2 className="font-orbitron text-2xl md:text-3xl font-black uppercase tracking-[0.2em] text-white/90" style={{ textShadow: '0 0 15px rgba(255, 255, 255, 0.2)'}}>{t.hubJoinSquad}</h2>
                            <p className="font-chakra text-xs text-white/50 mt-2 mb-6">Connect with us on WhatsApp to book your slot.</p>
                            
                            <a href={SOCIAL_LINKS.whatsapp} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center gap-3 bg-transparent text-[#25D366] font-bold text-lg py-3 px-8 rounded-xl shadow-[0_0_15px_rgba(37,211,102,0.4)] hover:shadow-[0_0_25px_rgba(37,211,102,0.6)] hover:bg-[#25D366]/10 transition-all transform hover:scale-[1.02] active:scale-95 mb-8">
                                <WhatsApp className="w-5 h-5 fill-current" />
                                WhatsApp
                            </a>

                            <div className="flex justify-center gap-10">
                                <a href={SOCIAL_LINKS.youtube} target="_blank" rel="noopener noreferrer" className="text-white/40 hover:text-white transition-colors"><YouTubeIcon className="w-7 h-7" /></a>
                                <a href={SOCIAL_LINKS.instagram} target="_blank" rel="noopener noreferrer" className="text-white/40 hover:text-white transition-colors"><InstagramIcon className="w-7 h-7" /></a>
                                <a href={SOCIAL_LINKS.facebook} target="_blank" rel="noopener noreferrer" className="text-white/40 hover:text-white transition-colors"><FacebookIcon className="w-7 h-7" /></a>
                                <a href={SOCIAL_LINKS.tiktok} target="_blank" rel="noopener noreferrer" className="text-white/40 hover:text-white transition-colors"><TikTokIcon className="w-7 h-7" /></a>
                            </div>
                        </div>
                    </footer>
                </div>
            </div>
        </div>
    );
};
