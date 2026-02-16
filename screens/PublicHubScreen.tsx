
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context';
import { Player, PlayerStatus, PlayerForm, SkillType, PlayerTier } from '../types';
import { TrophyIcon, Users, History as HistoryIcon, BarChartDynamic, StarIcon, ChevronLeft, Zap, WhatsApp, YouTubeIcon, TikTokIcon, XCircle, Home, LayoutDashboard, AwardIcon, Target, InfoIcon, GoleadorBadgeIcon, AssistantBadgeIcon, VeteranBadgeIcon, MvpBadgeIcon, WinLeaderBadgeIcon } from '../icons';
import { PlayerAvatar, TeamAvatar } from '../components/avatars';
import { Language } from '../translations/index';
import { BadgeIcon, sortBadgesByPriority } from '../features';
import { useTranslation } from '../ui';
import { convertCountryCodeAlpha3ToAlpha2 } from '../utils/countries';
import { ClubIntelligenceDashboard } from '../components/ClubIntelligenceDashboard';
import { RadioPlayer } from '../components/RadioPlayer';
import { SquadOfTheMonthBadge } from '../components/SquadOfTheMonthBadge';
import { TeamOfTheMonthModal } from '../components/TeamOfTheMonthModal';
import { MiniSquadBadge } from '../components/MiniSquadBadge';
import { BallDecorations } from '../components/BallDecorations';
import { CinematicCard, HeaderAtmosphere } from '../components/PublicHubScreen';

// --- SUB-COMPONENTS ---

const CinematicBackground: React.FC = () => (
    <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden bg-[#0a0c10]">
        {/* 1. Base Layer - Deep Obsidian */}
        <div className="absolute inset-0 bg-[#0a0c10]"></div>
        
        {/* 2. Static Noise for texture (stays fixed) */}
        <div className="absolute inset-0 opacity-[0.03] mix-blend-overlay pointer-events-none">
            <svg className='w-full h-full'>
                <filter id='hubNoise'>
                    <feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch' />
                </filter>
                <rect width='100%' height='100%' filter='url(#hubNoise)' />
            </svg>
        </div>
    </div>
);

const StaticSoccerBall: React.FC = () => {
    return (
        <div className="relative w-9 h-9 md:w-10 md:h-10 shrink-0 z-20 pointer-events-none ml-3">
            <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-[0_4px_12px_rgba(0,0,0,0.9)] overflow-visible">
                <defs>
                    <radialGradient id="ballShading" cx="40%" cy="35%" r="65%"><stop offset="0%" stopColor="#ffffff" /><stop offset="50%" stopColor="#e2e8f0" /><stop offset="85%" stopColor="#94a3b8" /><stop offset="100%" stopColor="#1e293b" /></radialGradient>
                    <filter id="hatShadow" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur in="SourceAlpha" stdDeviation="1.5" /><feOffset dx="0" dy="2" result="offsetblur" /><feComponentTransfer><feFuncA type="linear" slope="0.4" /></feComponentTransfer><feMerge><feMergeNode /><feMergeNode in="SourceGraphic" /></feMerge></filter>
                </defs>
                <circle cx="50" cy="50" r="48" fill="url(#ballShading)" />
                <g stroke="#000" strokeWidth="0.8" fill="none" opacity="0.25">
                    <path d="M50 32 L68 45 L61 66 L39 66 L32 45 Z" /><path d="M50 32 L50 2" /><path d="M68 45 L95 38" /><path d="M61 66 L82 92" /><path d="M39 66 L18 92" /><path d="M32 45 L5 38" /><path d="M18 92 Q 50 98 82 92" /><path d="M5 38 Q 4 15 50 2" /><path d="M95 38 Q 96 15 50 2" />
                </g>
                <text x="51" y="52" textAnchor="middle" fill="#0f172a" className="font-aldrich font-black uppercase" style={{ fontSize: '17px', letterSpacing: '-0.02em', transform: 'scaleX(0.85) rotate(-3deg)', transformOrigin: 'center' }}>SELECT</text>
                <text x="50" y="61" textAnchor="middle" fill="#475569" className="font-chakra font-black uppercase" style={{ fontSize: '3.2px', letterSpacing: '0.1em', opacity: 0.8, transform: 'rotate(-3deg)', transformOrigin: 'center' }}>Professional Futsal</text>
                <ellipse cx="40" cy="25" rx="20" ry="10" fill="white" opacity="0.3" transform="rotate(-15, 40, 25)" />
            </svg>
        </div>
    );
};

// --- TREND INDICATOR ---
const TrendArrow: React.FC<{ form: PlayerForm }> = ({ form }) => {
    if (form === 'hot_streak') return <span className="text-[#4CFF5F] text-[10px] drop-shadow-[0_0_5px_rgba(76,255,95,0.8)]">▲</span>;
    if (form === 'cold_streak') return <span className="text-[#FF4136] text-[10px] drop-shadow-[0_0_5px_rgba(255,65,54,0.8)]">▼</span>;
    return <span className="text-white/20 text-[10px] font-bold">•</span>;
};

// --- CHASE LIST COMPONENT (THE 4-PLAYER TAIL) ---
const ChaseList: React.FC<{ 
    players: Player[]; 
    valueKey: keyof Player | 'grandMaster' | 'winRate'; 
    accentColor: string; 
}> = ({ players, valueKey, accentColor }) => {
    
    const scrollRef = useRef<HTMLDivElement>(null);
    const [showTopFade, setShowTopFade] = useState(false);
    const [showBottomFade, setShowBottomFade] = useState(players.length > 4);

    const getValue = (p: Player) => {
        if (valueKey === 'grandMaster') return (p.totalGoals || 0) + (p.totalAssists || 0);
        if (valueKey === 'winRate') return p.totalGames > 0 ? `${Math.round((p.totalWins / p.totalGames) * 100)}%` : '0%';
        const val = p[valueKey as keyof Player];
        if (typeof val === 'number' || typeof val === 'string') return val;
        return 0;
    };

    const handleScroll = () => {
        if (scrollRef.current) {
            const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
            setShowTopFade(scrollTop > 10);
            setShowBottomFade(scrollHeight - scrollTop - clientHeight > 10);
        }
    };

    useEffect(() => {
        if (scrollRef.current) {
            const { scrollHeight, clientHeight } = scrollRef.current;
            setShowBottomFade(scrollHeight > clientHeight);
        }
    }, [players]);

    return (
        <div 
            className="w-full bg-[#0a0c10]/95 backdrop-blur-md rounded-b-2xl border-l border-r border-b overflow-hidden relative group/list"
            style={{ borderColor: `${accentColor}33` }}
        >
            {/* Top Fade Gradient */}
            <div 
                className={`absolute top-0 left-0 right-0 h-6 bg-gradient-to-b from-[#0a0c10] to-transparent z-20 pointer-events-none transition-opacity duration-300 ${showTopFade ? 'opacity-100' : 'opacity-0'}`}
            ></div>

            {/* Scrollable container with fixed max height */}
            <div 
                ref={scrollRef}
                onScroll={handleScroll}
                className="max-h-[160px] overflow-y-auto touch-pan-y pb-2 no-scrollbar relative z-10"
            >
                {players.map((p, index) => (
                    <div 
                        key={p.id} 
                        className="flex items-center justify-between px-4 py-2 border-t border-white/5 hover:bg-white/5 transition-colors"
                    >
                        <div className="flex items-center gap-3 min-w-0">
                            <span className="text-[10px] font-mono font-bold text-white/30 w-4 text-right pr-1">{index + 2}.</span>
                            <div className="flex items-center gap-2 min-w-0">
                                <span className="text-[10px] font-bold text-white uppercase truncate tracking-wider">
                                    {p.nickname}
                                </span>
                            </div>
                        </div>
                        
                        <div className="flex items-center gap-3">
                            <span className="font-mono text-xs font-bold text-white/90">
                                {getValue(p)}
                            </span>
                            <div className="w-3 flex justify-center">
                                <TrendArrow form={p.form} />
                            </div>
                        </div>
                    </div>
                ))}
                
                {players.length === 0 && (
                    <div className="py-3 text-center">
                        <span className="text-[8px] text-white/20 uppercase tracking-widest">No Contenders</span>
                    </div>
                )}
            </div>

            {/* Bottom Fade Gradient */}
            <div 
                className={`absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-[#0a0c10] to-transparent z-20 pointer-events-none transition-opacity duration-300 ${showBottomFade ? 'opacity-100' : 'opacity-0'}`}
            ></div>
        </div>
    );
};

// --- LEGEND CARD ---
const LegendCard: React.FC<{ 
    title: string; 
    player: Player; 
    value: number | string; 
    icon: React.ReactNode; 
    label: string;
    accentColor?: string;
    className?: string; 
}> = ({ title, player, value, icon, label, accentColor = "#FFD700", className = "" }) => (
    <div className={`relative group w-full h-36 md:h-40 rounded-2xl overflow-hidden bg-black border transition-all duration-500 active:scale-95 ${className}`} style={{ borderColor: `${accentColor}33`, boxShadow: `0 10px 30px -15px rgba(0,0,0,1)` }}>
        {/* PIXEL GRID OVERLAY */}
        <div className="absolute inset-0 opacity-[0.15] pointer-events-none z-0" style={{ 
            backgroundImage: `radial-gradient(${accentColor} 0.5px, transparent 0)`,
            backgroundSize: '2px 2px'
        }}></div>
        
        <div className="absolute top-0 right-0 w-28 md:w-36 h-full z-0 pointer-events-none">
            {player.playerCard ? (
                <div 
                    className="w-full h-full bg-cover bg-top"
                    style={{ backgroundImage: `url(${player.playerCard})` }}
                />
            ) : (
                <div className="w-full h-full bg-gradient-to-b from-gray-800 to-black"></div>
            )}
            <div className="absolute inset-0 bg-gradient-to-r from-black via-black/40 to-transparent"></div>
        </div>

        <div className="absolute inset-0 pointer-events-none z-10" style={{ background: `linear-gradient(to bottom right, ${accentColor}10, transparent)` }}></div>
        <div className="absolute top-0 left-0 right-0 h-px z-10" style={{ background: `linear-gradient(to right, transparent, ${accentColor}66, transparent)` }}></div>

        <div className="relative z-20 p-4 h-full flex flex-col justify-between">
            <div className="flex justify-between items-start">
                <div className="flex flex-col relative z-20 max-w-[70%]">
                    <span className="text-[5px] md:text-[6px] font-black tracking-[0.2em] uppercase mb-0.5 opacity-90 truncate" style={{ color: accentColor }}>{title}</span>
                    <h3 className="font-russo text-sm md:text-base text-white uppercase tracking-tighter truncate drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] leading-none">
                        {player.nickname}
                    </h3>
                </div>
            </div>

            <div className="flex items-end justify-between">
                <div className="flex flex-col">
                    <span className="font-russo text-2xl md:text-3xl text-white tracking-widest leading-none drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                        {value}
                    </span>
                    <span className="text-[6px] md:text-[7px] font-black text-white/50 uppercase tracking-[0.3em] mt-1">{label}</span>
                </div>
            </div>
            
            <div className="absolute bottom-2 right-2 opacity-10 scale-125 text-white z-10">
                {icon}
            </div>
        </div>
    </div>
);

const NoLeadersPlaceholder: React.FC = () => { const t = useTranslation(); return (<div className="w-full max-w-2xl mx-auto py-20 flex flex-col items-center justify-center relative"><div className="absolute inset-0 bg-[#00F2FE]/5 blur-[60px] rounded-full animate-pulse"></div><div className="relative z-10 flex flex-col items-center gap-6 opacity-30"><div className="w-20 h-20 rounded-full border-2 border-dashed border-[#00F2FE] animate-spin-slow flex items-center justify-center"><TrophyIcon className="w-10 h-10 text-[#00F2FE]" /></div><div className="text-center"><h3 className="font-orbitron text-lg font-black text-white tracking-[0.4em] uppercase">{t.hubAwaitingStats}</h3><p className="font-chakra text-[10px] text-white/50 tracking-[0.2em] mt-2 uppercase">{t.hubAnalyzingPerformance}</p></div></div><style dangerouslySetInnerHTML={{ __html: ` @keyframes spin-slow { from { transform: rotate(0deg); } to { transform: rotate(360deg); } } .animate-spin-slow { animation: spin-slow 15s linear infinite; } `}} /></div>); };

const NavHubButton: React.FC<{ title: string; icon: React.ReactNode; isActive: boolean; onClick: () => void; isDisabled?: boolean; }> = ({ title, icon, isActive, onClick, isDisabled }) => (
    <button 
        onClick={isDisabled ? undefined : onClick} 
        className={`flex flex-col items-center justify-center gap-1 transition-all duration-300 h-full min-w-[64px] group ${isDisabled ? 'opacity-10 cursor-not-allowed grayscale' : 'cursor-pointer hover:scale-110'}`}
    >
        <div className={`w-8 h-8 rounded-full border flex items-center justify-center transition-all duration-300 ${isActive ? 'text-[#00F2FE] border-[#00F2FE] bg-[#00F2FE]/10 shadow-[0_0_15px_rgba(0,242,254,0.5),inset_0_0_6px_rgba(0,242,254,0.2)]' : 'text-white/60 border-white/20 shadow-[0_0_10px_rgba(255,255,255,0.05)] hover:border-white/40 hover:text-white'}`}>
            {React.cloneElement(icon as React.ReactElement<any>, { className: "w-4 h-4" })}
        </div>
        <span className={`text-[6px] font-black tracking-widest uppercase transition-colors text-center px-1 truncate w-full ${isActive ? 'text-[#00F2FE]' : 'text-white/30 group-hover:text-white/60'}`}>
            {title}
        </span>
    </button>
);

const HubNav: React.FC<{ 
    isDashboardOpen: boolean; 
    sessionDate?: string; 
    activeTab: string; 
    onTabChange: (tab: any) => void; 
    archiveViewDate: string | null; 
    onHomeClick: () => void; 
    onOpenTotm: () => void; 
}> = ({ isDashboardOpen, sessionDate, activeTab, onTabChange, archiveViewDate, onHomeClick, onOpenTotm }) => { 
    const { language, setLanguage } = useApp(); 
    const t = useTranslation(); 
    const [isLangOpen, setIsLangOpen] = useState(false); 
    const dropdownRef = useRef<HTMLDivElement>(null); 
    const languages: { code: Language; label: string }[] = [ { code: 'en', label: 'EN' }, { code: 'ua', label: 'UA' }, { code: 'vn', label: 'VN' }, { code: 'ru', label: 'RU' } ]; 

    useEffect(() => { 
        const handleClickOutside = (event: MouseEvent) => { if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) { setIsLangOpen(false); } }; 
        document.addEventListener('mousedown', handleClickOutside); 
        return () => document.removeEventListener('mousedown', handleClickOutside); 
    }, []); 

    const tabTitles: Record<string, string> = { 
        'dashboard': t.hubDashboardBtn, 
        'roster': t.playerHub, 
        'tournaments': t.navTournaments,
        'archive': t.navHistory, 
        'info': t.information 
    }; 
    
    const navContainerClass = ` fixed top-3 left-1/2 -translate-x-1/2 z-[150] flex items-center justify-between w-full max-w-[1450px] px-6 py-0 bg-black/85 backdrop-blur-xl rounded-2xl border border-white/10 shadow-[0_8px_20px_-6px_rgba(0,0,0,0.5),0_0_15px_rgba(0,242,254,0.1),inset_0_1px_0_rgba(255,255,255,0.05)] h-[48px] md:h-[64px] transition-all duration-300 `; 

    return (
        <nav className={navContainerClass}>
            <div className="flex items-center gap-4 shrink-0 h-full">
                <div className="flex items-center">
                    <span className="font-blackops text-2xl md:text-3xl text-[#00F2FE] tracking-tighter leading-none" style={{ textShadow: '0 0 10px rgba(0,242,254,0.6)' }}>UNIT</span>
                    <div className="h-4 w-px bg-white/15 ml-3 md:ml-4"></div>
                    <div className="flex flex-col space-y-0.5 ml-2">
                        <span className="font-black text-[9px] tracking-[0.15em] text-white uppercase leading-none">Club</span>
                        <span className="font-black text-[7px] tracking-[0.15em] text-white/30 uppercase leading-none">Center</span>
                    </div>
                    <StaticSoccerBall />
                </div>
            </div>

            <div className="flex-grow h-full flex items-center justify-center pl-[20px] pr-[20px] overflow-hidden min-w-0">
                {isDashboardOpen ? (
                    <div className="animate-in slide-in-from-bottom-2 fade-in duration-500 flex flex-col items-center justify-center pointer-events-none text-center w-full min-w-0">
                        {activeTab === 'dashboard' ? (
                            <>
                                <span className="font-russo text-[7px] text-[#00F2FE] tracking-[0.3em] uppercase leading-none opacity-80 mb-0.5">SESSION BROADCAST</span>
                                <span className="font-chakra text-sm md:text-lg font-bold text-white tracking-widest leading-none truncate w-full">{sessionDate || 'LIVE'}</span>
                            </>
                        ) : (
                            <div className="flex flex-col items-center">
                                {activeTab === 'archive' && archiveViewDate ? (
                                    <span className="font-russo text-lg md:text-3xl text-white tracking-tighter uppercase block leading-none truncate w-full">{archiveViewDate}</span>
                                ) : (
                                    <span className="font-russo text-lg md:text-3xl text-white tracking-tighter uppercase block leading-none truncate w-full">{tabTitles[activeTab] || 'DASHBOARD'}</span>
                                )}
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="flex items-center justify-center animate-in fade-in zoom-in duration-700">
                        <MiniSquadBadge onClick={onOpenTotm} className="w-[42px] h-[42px] md:w-[50px] md:h-[50px]" />
                    </div>
                )}
            </div>

            <div className="flex items-center gap-3 md:gap-5 shrink-0 h-full py-1">
                {/* Всегда видимые кнопки навигации */}
                <div className="flex items-center gap-2 md:gap-5 mr-2 h-full">
                    {isDashboardOpen && (
                        <div className="mr-2 flex items-center border-r border-white/10 pr-3 h-full">
                            <button onClick={onHomeClick} className="flex flex-col items-center justify-center gap-1 transition-all duration-300 group cursor-pointer hover:scale-110 h-full min-w-[50px]" title="Home">
                                <div className="w-8 h-8 rounded-full border flex items-center justify-center transition-all duration-300 text-white/60 border-white/20 shadow-[0_0_10px_rgba(255,255,255,0.05)] hover:border-white/40 hover:text-white">
                                    <Home className="w-4 h-4" />
                                </div>
                                <span className="text-[6px] font-black tracking-widest uppercase text-white/30 group-hover:text-white/60 transition-colors">{t.navHome}</span>
                            </button>
                        </div>
                    )}
                    
                    <RadioPlayer />
                    
                    <NavHubButton title={t.hubDashboardBtn} icon={<LayoutDashboard />} isActive={isDashboardOpen && activeTab === 'dashboard'} onClick={() => onTabChange('dashboard')} />
                    <NavHubButton title={t.playerHub} icon={<Users />} isActive={isDashboardOpen && (activeTab === 'roster' || activeTab === 'duel')} onClick={() => onTabChange('roster')} />
                    <NavHubButton title={t.navTournaments} icon={<TrophyIcon />} isActive={isDashboardOpen && activeTab === 'tournaments'} onClick={() => onTabChange('tournaments')} />
                    <NavHubButton title={t.navHistory} icon={<HistoryIcon />} isActive={isDashboardOpen && activeTab === 'archive'} onClick={() => onTabChange('archive')} />
                    <NavHubButton title={t.information} icon={<InfoIcon />} isActive={isDashboardOpen && activeTab === 'info'} onClick={() => onTabChange('info')} />
                </div>
                
                <div className="flex flex-col items-center justify-center group h-full relative" ref={dropdownRef}>
                    <button onClick={() => setIsLangOpen(!isLangOpen)} className="w-8 h-8 rounded-full border border-white/20 bg-black/60 flex items-center justify-center transition-all shadow-[0_0_10px_rgba(255,255,255,0.15)] hover:border-white/60 hover:bg-white/5 group/lang">
                        <span className="text-[9px] font-black text-white/80 group-hover/lang:text-white uppercase leading-none">{language}</span>
                    </button>
                    <span className="text-[6px] font-black tracking-widest text-white/30 uppercase group-hover:text-white/60 transition-colors cursor-default leading-none mt-1 text-center truncate max-w-[50px]">{t.language}</span>

                    {isLangOpen && (
                        <div className="absolute left-1/2 -translate-x-1/2 w-9 bg-[#05070a] border border-white/10 rounded-full shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-1 duration-200 z-[250]" style={{ top: 'calc(100% + 4px)' }}>
                            <div className="py-1 flex flex-col items-center gap-1">
                                {languages.map((lang) => (
                                    <button key={lang.code} onClick={() => { setLanguage(lang.code); setIsLangOpen(false); }} className={`w-7 h-7 rounded-full flex items-center justify-center transition-all duration-300 ${language === lang.code ? 'bg-[#00F2FE]/10 text-[#00F2FE] border border-[#00F2FE]/30 shadow-[0_0_8px_rgba(0,242,254,0.2)]' : 'text-white/40 hover:text-white hover:bg-white/10' }`}>
                                        <span className="text-[8px] font-black uppercase leading-none">{lang.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </nav>
    ); 
};

const DispersingWord: React.FC<{ words: string[] }> = ({ words }) => { const [index, setIndex] = useState(0); const [state, setState] = useState<'entering' | 'active' | 'exiting'>('entering'); useEffect(() => { const cycle = async () => { setState('entering'); setTimeout(() => setState('active'), 1200); setTimeout(() => { setState('exiting'); setTimeout(() => { setIndex((prev) => (prev + 1) % words.length); }, 1200); }, 5000); }; cycle(); const interval = setInterval(cycle, 6500); return () => clearInterval(interval); }, [words.length]); const getStyles = () => { switch (state) { case 'entering': return "scale-[0.4] opacity-0 blur-[40px] translate-z-[-200px]"; case 'active': return "scale-[1.1] opacity-100 blur-0 translate-z-0"; case 'exiting': return "scale-[0.8] opacity-0 blur-[30px] translate-z-[-100px]"; default: return ""; } }; return (<span className="relative inline-block h-[1.1em] min-w-[280px] md:min-w-[500px] align-top text-center perspective-1000 px-10"><span className={`block px-4 text-transparent bg-clip-text bg-gradient-to-b from-[#00F2FE] to-[#00F2FE]/30 transition-all duration-[1200ms] ease-[cubic-bezier(0.2,0,0.2,1)] ${getStyles()}`} style={{ textShadow: state === 'active' ? '0 0 30px rgba(0, 242, 254, 0.5)' : 'none' }}>{words[index]}</span>{state === 'active' && (<span className="absolute inset-0 px-4 text-transparent bg-clip-text bg-gradient-to-b from-[#00F2FE] to-transparent pointer-events-none z-0 opacity-20" style={{ filter: 'blur(20px)', WebkitMaskImage: 'transparent' }}>{words[index]}</span>)}</span>); };
const HeroTitle: React.FC = () => { const t = useTranslation(); const words = ["GAME", "LEGACY", "VICTORY"]; return (<div className="text-center mt-32 md:mt-44 mb-12 md:mb-16 relative"><div className="inline-block relative"><h1 className="font-russo text-4xl md:text-[9rem] leading-[1.1] uppercase tracking-tighter drop-shadow-2xl"><span className="text-transparent bg-clip-text bg-gradient-to-b from-white to-white/20">DEFINE YOUR</span> <br /><DispersingWord words={words} /></h1><div className="mt-8 mb-10 max-w-lg mx-auto px-4"><p className="font-chakra text-[10px] md:text-xs text-white/50 font-medium uppercase tracking-[0.3em] lifestyle-relaxed leading-loose">{t.hubWelcomeText}</p></div><div className="mt-6 h-px w-48 md:w-64 bg-gradient-to-r from-transparent via-[#00F2FE] to-transparent mx-auto opacity-60 shadow-[0_0_10px_#00F2FE]"></div></div></div>); };
const CinematicStatCard: React.FC<{ value: string | number; label: string; }> = ({ value, label }) => (<div className="w-full md:flex-1 max-w-xs md:max-w-none h-40"><div className="relative rounded-3xl overflow-hidden bg-white/[0.03] border border-white/10 shadow-2xl h-full backdrop-blur-md"><div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-40"></div><div className="absolute top-0 left-0 right-0 h-16 bg-gradient-to-b from-white/5 to-transparent blur-xl"></div><div className="relative h-full z-10 flex flex-col items-center justify-center gap-2"><span className="font-russo font-black text-6xl md:text-7xl text-white tracking-widest leading-none">{value}</span><span className="font-chakra font-bold text-xs text-white/50 uppercase tracking-[0.2em]">{label}</span></div></div></div>);
type DashboardViewType = 'info' | 'dashboard' | 'roster' | 'archive' | 'duel' | 'tournaments' | 'league';

export const PublicHubScreen: React.FC = () => {
    const navigate = useNavigate();
    const { allPlayers, history } = useApp();
    const [isDashboardOpen, setIsDashboardOpen] = useState(false);
    const [isTotmOpen, setIsTotmOpen] = useState(false);
    const [dashboardView, setDashboardView] = useState<DashboardViewType>('dashboard');
    const [archiveViewDate, setArchiveViewDate] = useState<string | null>(null);

    const t = useTranslation();

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

    const legends = useMemo(() => {
        const confirmed = allPlayers.filter(p => p.status === PlayerStatus.Confirmed);
        if (confirmed.length === 0) return null;
        const sortedScorers = [...confirmed].sort((a, b) => { if (b.totalGoals !== a.totalGoals) return b.totalGoals - a.totalGoals; return b.rating - a.rating; });
        const sortedArchitects = [...confirmed].sort((a, b) => { if (b.totalAssists !== a.totalAssists) return b.totalAssists - a.totalAssists; return b.rating - a.rating; });
        const sortedGrandMasters = [...confirmed].sort((a, b) => { const gaA = (a.totalGoals || 0) + (a.totalAssists || 0); const gaB = (b.totalGoals || 0) + (b.totalAssists || 0); if (gaB !== gaA) return gaB - gaA; return b.rating - a.rating; });
        const eligibleWinRate = confirmed.filter(p => (p.totalSessionsPlayed || 0) >= 10);
        const sortedConquerors = [...eligibleWinRate].sort((a, b) => { const wrA = a.totalGames > 0 ? (a.totalWins / a.totalGames) : 0; const wrB = b.totalGames > 0 ? (b.totalWins / b.totalGames) : 0; if (wrB !== wrA) return wrB - wrA; return b.totalGames - a.totalGames; });
        return { scorers: sortedScorers, architects: sortedArchitects, grandMasters: sortedGrandMasters, conquerors: sortedConquerors };
    }, [allPlayers]);

    const displayData = useMemo(() => {
        const confirmedRealPlayers = allPlayers.filter(p => p.status === PlayerStatus.Confirmed);
        const sorted = [...confirmedRealPlayers].sort((a, b) => { if (b.rating !== a.rating) return b.rating - a.rating; const scoreA = (a.totalGoals || 0) + (a.totalAssists || 0); const scoreB = (b.totalGoals || 0) + (b.totalAssists || 0); if (scoreB !== scoreA) return scoreB - scoreA; const wrA = a.totalGames > 0 ? (a.totalWins / a.totalGames) : 0; const wrB = b.totalGames > 0 ? (b.totalWins / b.totalGames) : 0; if (wrB !== wrA) return wrB - wrA; return (b.totalGames || 0) - (a.totalGames || 0); });
        return { top: sorted.slice(0, 3) };
    }, [allPlayers]);
    
    const clubStats = useMemo(() => {
        const confirmedPlayers = allPlayers.filter(p => p.status === PlayerStatus.Confirmed);
        const totalPlayers = confirmedPlayers.length;
        const totalSessions = (history.length || 0);
        const avgRating = totalPlayers > 0 ? Math.round(confirmedPlayers.reduce((sum, p) => sum + p.rating, 0) / totalPlayers) : 0;
        return { totalPlayers, totalSessions, avgRating };
    }, [allPlayers, history]);
    
    const SOCIAL_LINKS = { whatsapp: "https://chat.whatsapp.com/CAJnChuM4lQFf3s2YUnhQr", youtube: "https://www.youtube.com/@UnitFootball", tiktok: "https://www.tiktok.com/@532club?_r=1", };
    const handleTabChange = (tab: DashboardViewType) => { 
        setDashboardView(tab); 
        setIsDashboardOpen(true);
    };
    const getBottomPatchColor = () => { if (dashboardView === 'archive' || dashboardView === 'dashboard' || dashboardView === 'roster' || dashboardView === 'info') return '#01040a'; return '#0a0c10'; };

    return (
        <div className="fixed inset-0 w-full h-full bg-[#0a0c10] text-white selection:bg-[#00F2FE] selection:text-black overflow-hidden overscroll-none">
            <CinematicBackground />
            <TeamOfTheMonthModal isOpen={isTotmOpen} onClose={() => setIsTotmOpen(false)} />
            <style dangerouslySetInnerHTML={{__html: ` html, body, #root { height: 100%; overflow: hidden; position: fixed; width: 100%; overscroll-behavior: none; touch-action: none; } `}} />
            <div className={`fixed top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-50 z-[110]`}></div>
            
            <HubNav 
                isDashboardOpen={isDashboardOpen} 
                sessionDate={latestSessionDate} 
                activeTab={dashboardView} 
                onTabChange={handleTabChange} 
                archiveViewDate={archiveViewDate} 
                onHomeClick={() => { setIsDashboardOpen(false); setDashboardView('dashboard'); }} 
                onOpenTotm={() => setIsTotmOpen(true)} 
            />

            <div className={`fixed inset-0 z-[60] transform transition-all duration-700 ease-in-out flex pt-20 pb-8 md:pb-12 overflow-y-auto overscroll-none touch-pan-y ${isDashboardOpen ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0 pointer-events-none'} `} style={{ backgroundColor: getBottomPatchColor() }}>
                <div className="relative max-w-[1450px] w-full mx-auto px-0 z-10"><ClubIntelligenceDashboard currentView={dashboardView} setView={setDashboardView} onArchiveViewChange={setArchiveViewDate} /></div>
                <div className="fixed bottom-0 left-0 right-0 h-16 z-[110] pointer-events-none opacity-0 transition-all duration-700 delay-300" style={{ opacity: isDashboardOpen ? 1 : 0, background: `linear-gradient(to top, ${getBottomPatchColor()} 50%, ${getBottomPatchColor()}cc 80%, transparent 100%)` }}></div>
            </div>

            <div className={`absolute inset-0 overflow-y-auto overscroll-none touch-pan-y z-10 w-full px-6 md:px-12 transition-all duration-1000 ${isDashboardOpen ? 'opacity-0 scale-95 translate-y-[-100px] pointer-events-none' : 'opacity-100 scale-100 translate-y-0'}`}>
                <HeaderAtmosphere />
                
                <div className="relative z-10">
                    <HeroTitle />
                    <div className="text-center mb-12 md:mb-20"><TrophyIcon className="w-8 h-8 md:w-10 md:h-10 mx-auto mb-4 text-[#00F2FE]" /><h2 className="font-orbitron text-xl md:text-3xl font-black uppercase tracking-[0.2em] text-white/80" style={{ textShadow: '0 0 15px rgba(255, 255, 255, 0.2)'}}>{t.hubLeadersTitle}</h2></div>
                    {displayData.top.length > 0 ? (<div className="flex flex-wrap items-end justify-center gap-4 md:gap-8 w-full"><div className="order-2 md:order-1">{displayData.top[1] && <CinematicCard player={displayData.top[1]} rank={2} />}</div><div className="order-1 md:order-2">{displayData.top[0] && <CinematicCard player={displayData.top[0]} rank={1} />}</div><div className="order-3 md:order-3">{displayData.top[2] && <CinematicCard player={displayData.top[2]} rank={3} />}</div></div>) : (<NoLeadersPlaceholder />)}
                    {legends && (
                        <div className="mt-24 md:mt-32">
                            <div className="text-center mb-12 md:mb-20"><p className="font-orbitron text-sm md:text-base font-black text-[#FFD700] tracking-[0.5em] uppercase" style={{ textShadow: '0 0 15px rgba(255, 215, 0, 0.4)'}}>Hall of Fame Records</p></div>
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 w-full max-w-[1400px] mx-auto px-2 md:px-4 items-start">
                                <div className="flex flex-col w-full">
                                    {legends.scorers[0] && (<LegendCard title="ETERNAL GOLDEN BOOT" player={legends.scorers[0]} value={legends.scorers[0].totalGoals} icon={<GoleadorBadgeIcon />} label="CAREER GOALS" accentColor="#FFD700" className="rounded-b-none border-b-0" />)}
                                    <ChaseList players={legends.scorers.slice(1, 10)} valueKey="totalGoals" accentColor="#FFD700" />
                                </div>
                                <div className="flex flex-col w-full">
                                    {legends.architects[0] && (<LegendCard title="LEGACY ARCHITECT" player={legends.architects[0]} value={legends.architects[0].totalAssists} icon={<AssistantBadgeIcon />} label="CAREER ASSISTS" accentColor="#00BFFF" className="rounded-b-none border-b-0" />)}
                                    <ChaseList players={legends.architects.slice(1, 10)} valueKey="totalAssists" accentColor="#00BFFF" />
                                </div>
                                <div className="flex flex-col w-full">
                                    {legends.grandMasters[0] && (<LegendCard title="GRAND MASTER" player={legends.grandMasters[0]} value={(legends.grandMasters[0].totalGoals || 0) + (legends.grandMasters[0].totalAssists || 0)} icon={<MvpBadgeIcon />} label="GOALS + ASSISTS" accentColor="#D946EF" className="rounded-b-none border-b-0" />)}
                                    <ChaseList players={legends.grandMasters.slice(1, 10)} valueKey="grandMaster" accentColor="#D946EF" />
                                </div>
                                <div className="flex flex-col w-full">
                                    {legends.conquerors[0] ? (<LegendCard title="THE CONQUEROR" player={legends.conquerors[0]} value={`${Math.round((legends.conquerors[0].totalWins / legends.conquerors[0].totalGames) * 100)}%`} icon={<WinLeaderBadgeIcon />} label="HIGHEST WIN RATE" accentColor="#4CFF5F" className="rounded-b-none border-b-0" />) : (<div className="h-40 bg-black/50 rounded-2xl border border-white/5 flex items-center justify-center"><span className="text-[10px] text-white/30 uppercase tracking-widest">NO DATA</span></div>)}
                                    {legends.conquerors.length > 1 && (<ChaseList players={legends.conquerors.slice(1, 10)} valueKey="winRate" accentColor="#4CFF5F" />)}
                                </div>
                            </div>
                        </div>
                    )}
                    <div className="mt-24 md:mt-32">
                        <div className="text-center mb-12 md:mb-20"><h2 className="font-orbitron text-lg md:text-2xl font-black uppercase tracking-[0.15em] text-white/80" style={{ textShadow: '0 0 15px rgba(255, 255, 255, 0.2)'}}>{t.hubVitalsTitle}</h2></div>
                        <div className="flex flex-col md:flex-row items-center justify-center gap-6 w-full max-w-4xl mx-auto"><CinematicStatCard value={clubStats.totalPlayers} label={t.hubStatsMembers} /><CinematicStatCard value={clubStats.totalSessions} label={t.hubSessionsPlayed} /><CinematicStatCard value={clubStats.avgRating} label={t.hubAvgRating} /></div>
                    </div>
                    
                    <div className="relative z-10 bg-transparent pb-8 mt-20">
                        <footer className="relative pb-8 pt-0 bg-transparent">
                            <div className="text-center px-4">
                                <h2 className="font-orbitron text-2xl md:text-3xl font-black uppercase tracking-[0.2em] text-white/90" style={{ textShadow: '0 0 15px rgba(255, 255, 255, 0.2)'}}>{t.hubJoinSquad}</h2>
                                <p className="font-chakra text-xs text-white/50 mt-2 mb-6">Connect with us on WhatsApp to book your slot.</p>
                                <a href={SOCIAL_LINKS.whatsapp} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center gap-3 bg-transparent text-[#25D366] font-bold text-lg py-3 px-8 rounded-xl shadow-[0_0_15px_rgba(37,211,102,0.4)] hover:shadow-[0_0_25px_rgba(37,211,102,0.6)] hover:bg-[#25D366]/10 transition-all transform hover:scale-[1.02] active:scale-95 mb-8"><WhatsApp className="w-5 h-5 fill-current" />WhatsApp</a>
                                <div className="flex justify-center gap-10"><a href={SOCIAL_LINKS.youtube} target="_blank" rel="noopener noreferrer" className="text-white/40 hover:text-white transition-colors"><YouTubeIcon className="w-7 h-7" /></a><a href={SOCIAL_LINKS.tiktok} target="_blank" rel="noopener noreferrer" className="text-white/40 hover:text-white transition-colors"><TikTokIcon className="w-7 h-7" /></a></div>
                            </div>
                        </footer>
                    </div>
                </div>
            </div>
        </div>
    );
};
