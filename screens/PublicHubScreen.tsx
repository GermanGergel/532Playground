import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context';
import { Player, PlayerStatus, PlayerForm, SkillType, PlayerTier } from '../types';
import { TrophyIcon, Users, History as HistoryIcon, BarChartDynamic, StarIcon, ChevronLeft, Zap, WhatsApp, YouTubeIcon, InstagramIcon, TikTokIcon, XCircle, Home, LayoutDashboard, AwardIcon, Target, InfoIcon } from '../icons';
import { PlayerAvatar, TeamAvatar } from '../components/avatars';
import { Language } from '../translations/index';
import { BadgeDisplay, BadgeIcon, sortBadgesByPriority } from '../features';
import { useTranslation } from '../ui';
import { convertCountryCodeAlpha3ToAlpha2 } from '../utils/countries';
import { ClubIntelligenceDashboard } from '../components/ClubIntelligenceDashboard';
import { RadioPlayer } from '../components/RadioPlayer';
import { SquadOfTheMonthBadge } from '../components/SquadOfTheMonthBadge';
import { TeamOfTheMonthModal } from '../components/TeamOfTheMonthModal';
import { MiniSquadBadge } from '../components/MiniSquadBadge';
import { BallDecorations } from '../components/BallDecorations';

// --- SUB-COMPONENTS ---

const skillAbbreviations: Record<SkillType, string> = {
    goalkeeper: 'GK', power_shot: 'PS', technique: 'TQ', defender: 'DF', 
    playmaker: 'PM', finisher: 'FN', versatile: 'VS', tireless_motor: 'TM', leader: 'LD',
};

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

const FormArrowIndicator: React.FC<{ form: PlayerForm }> = ({ form }) => {
    const config = {
        hot_streak: { color: '#4CFF5F' }, stable: { color: '#A9B1BD' }, cold_streak: { color: '#FF4136' },
    };
    const currentForm = config[form] || config.stable;
    const commonProps: React.SVGProps<SVGSVGElement> = {
        width: "22", height: "22", viewBox: "0 0 24 24", fill: "none", stroke: currentForm.color,
        strokeWidth: "3", strokeLinecap: "round", strokeLinejoin: "round",
    };
    switch (form) {
        case 'hot_streak': return <svg {...commonProps}><path d="M12 19V5m-6 7l6-6 6 6"/></svg>;
        case 'cold_streak': return <svg {...commonProps}><path d="M12 5v14M5 12l7 7 7-7"/></svg>;
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

const HangingTag: React.FC<{ digit: string; label: string; height: number; delay: string; pulseDuration: string }> = ({ digit, label, height, delay, pulseDuration }) => (
    <div className="relative flex flex-col items-center group/fiber">
        <span 
            className="font-blackops text-2xl md:text-3xl text-[#00F2FE] tracking-tighter z-10 leading-none" 
            style={{ 
                textShadow: '0 0 10px rgba(0,242,254,0.6)',
                filter: 'url(#grungeFilter)' 
            }}
        >
            {digit}
        </span>
        <div className="absolute top-[26px] w-[0.5px] bg-[#00F2FE]/10 origin-top animate-pendant-swing" style={{ height: `${height}px`, animationDelay: delay, boxShadow: '0 0 3px rgba(0,242,254,0.1)' }}>
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-full pt-1">
                <div className="relative flex flex-col items-center">
                    <div className="absolute inset-0 blur-[8px] bg-[#00F2FE]/20 rounded-full scale-[2.5] pointer-events-none opacity-40"></div>
                    <span className="relative text-[7px] font-black tracking-[0.15em] text-[#00F2FE] whitespace-nowrap uppercase italic" style={{ textShadow: '0 0 8px rgba(0,242,254,0.8)' }}>{label}</span>
                </div>
            </div>
        </div>
    </div>
);

const NavHubButton: React.FC<{ 
    title: string; 
    icon: React.ReactNode; 
    isActive: boolean; 
    onClick: () => void; 
    isDisabled?: boolean;
}> = ({ title, icon, isActive, onClick, isDisabled }) => (
    <button 
        onClick={isDisabled ? undefined : onClick}
        className={`flex flex-col items-center justify-center gap-1 transition-all duration-300 h-full min-w-[50px] group
            ${isDisabled ? 'opacity-10 cursor-not-allowed grayscale' : 'cursor-pointer hover:scale-110'}`}
    >
        <div className={`w-8 h-8 rounded-full border flex items-center justify-center transition-all duration-300 
            ${isActive 
                ? 'text-[#00F2FE] border-[#00F2FE] bg-[#00F2FE]/10 shadow-[0_0_15px_rgba(0,242,254,0.5),inset_0_0_6px_rgba(0,242,254,0.2)]' 
                : 'text-white/60 border-white/20 shadow-[0_0_10px_rgba(255,255,255,0.2)] hover:border-white/40 hover:text-white hover:shadow-[0_0_15px_rgba(255,255,255,0.3)]'
            }`}>
            {React.cloneElement(icon as React.ReactElement<any>, { className: "w-4 h-4" })}
        </div>
        <span className={`text-[6px] font-black tracking-widest uppercase transition-colors ${isActive ? 'text-[#00F2FE]' : 'text-white/30 group-hover:text-white/60'}`}>
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
        'archive': t.navHistory, 
        'info': t.information 
    };

    const navContainerClass = `
        fixed top-3 left-1/2 -translate-x-1/2 z-[150] 
        flex items-center justify-between
        w-full max-w-[1450px] px-6 py-0 
        bg-black/85 backdrop-blur-xl rounded-2xl border border-white/10
        shadow-[0_8px_20px_-6px_rgba(0,0,0,0.5),0_0_15px_rgba(0,242,254,0.1),inset_0_1px_0_rgba(255,255,255,0.05)] 
        h-[42px] md:h-[54px] transition-all duration-300
    `;

    return (
        <nav className={navContainerClass}>
            <svg className="absolute w-0 h-0 invisible">
                <filter id="grungeFilter">
                    <feTurbulence type="fractalNoise" baseFrequency="0.25" numOctaves="3" result="noise" />
                    <feDisplacementMap in="SourceGraphic" in2="noise" scale="3" xChannelSelector="R" yChannelSelector="G" />
                    <feComponentTransfer>
                        <feFuncA type="linear" slope="0.9" />
                    </feComponentTransfer>
                </filter>
            </svg>

            <style dangerouslySetInnerHTML={{ __html: `
                @keyframes pendant-swing { 0% { transform: rotate(-0.5deg); } 50% { transform: rotate(0.5deg); } 100% { transform: rotate(-0.5deg); } }
                .animate-pendant-swing { animation: pendant-swing 5s ease-in-out infinite; }
            `}} />
            
            <div className="flex items-center gap-4 shrink-0 h-full">
                <div className="flex items-center">
                    <HangingTag digit="5" label="PLAYERS" height={20} delay="0s" pulseDuration="2.8s" />
                    <HangingTag digit="3" label="SQUADS" height={50} delay="1.5s" pulseDuration="4.2s" />
                    <HangingTag digit="2" label="GOALS" height={80} delay="0.8s" pulseDuration="3.7s" />
                    
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
                            <div className="flex flex-col items-center justify-center w-full">
                                {activeTab === 'archive' && archiveViewDate ? (
                                    <div className="flex flex-col items-center">
                                        <span className="font-russo text-lg md:text-3xl text-white tracking-tighter uppercase block leading-none truncate w-full" style={{ textShadow: '0 0 25px rgba(255, 255, 255, 0.2)' }}>
                                            {archiveViewDate}
                                        </span>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center">
                                        <span className="font-russo text-lg md:text-3xl text-white tracking-tighter uppercase block leading-none truncate w-full" style={{ textShadow: '0 0 25px rgba(255, 255, 255, 0.2)' }}>
                                            {tabTitles[activeTab] || 'DASHBOARD'}
                                        </span>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="w-full h-full">
                        <MotivationalTicker />
                    </div>
                )}
            </div>
            
            <div className="flex items-center gap-1 md:gap-3 shrink-0 h-full py-1">
                {isDashboardOpen && (
                    <div className="flex items-center gap-2 md:gap-4 mr-2 h-full animate-in fade-in slide-in-from-right-3 duration-500">
                        <div className="mr-3 flex items-center border-r border-white/10 pr-4 gap-3">
                            <MiniSquadBadge onClick={onOpenTotm} className="w-[42px] h-[42px] md:w-[54px] md:h-[54px] -my-1 mr-3" />

                            <button 
                                onClick={onHomeClick}
                                className="flex flex-col items-center justify-center gap-1 transition-all duration-300 group cursor-pointer hover:scale-110"
                                title="Home"
                            >
                                <div className="w-8 h-8 rounded-full border flex items-center justify-center transition-all duration-300 text-white/60 border-white/20 shadow-[0_0_10px_rgba(255,255,255,0.2)] hover:border-white/40 hover:text-white hover:shadow-[0_0_15px_rgba(255,255,255,0.3)]">
                                    <Home className="w-4 h-4" />
                                </div>
                                <span className="text-[6px] font-black tracking-widest uppercase text-white/30 group-hover:text-white/60 transition-colors">
                                    {t.navHome}
                                </span>
                            </button>
                            <RadioPlayer />
                        </div>
                        <NavHubButton title={t.hubDashboardBtn} icon={<LayoutDashboard />} isActive={activeTab === 'dashboard'} onClick={() => onTabChange('dashboard')} />
                        <NavHubButton title={t.playerHub} icon={<Users />} isActive={activeTab === 'roster' || activeTab === 'duel'} onClick={() => onTabChange('roster')} />
                        <NavHubButton title={t.navHistory} icon={<HistoryIcon />} isActive={activeTab === 'archive'} onClick={() => onTabChange('archive')} />
                        <NavHubButton title={t.information} icon={<InfoIcon />} isActive={activeTab === 'info'} onClick={() => onTabChange('info')} />
                    </div>
                )}
                <div className="flex items-center gap-2 group h-full relative" ref={dropdownRef}>
                    {!isDashboardOpen && (
                        <div className="hidden md:flex flex-col items-end justify-center h-full animate-in fade-in duration-500 pr-2">
                            <span className="text-[8px] font-black tracking-[0.2em] text-white/30 uppercase group-hover:text-white transition-colors cursor-default leading-none">Language</span>
                        </div>
                    )}
                    <div className="relative h-full flex items-center justify-center">
                        {isDashboardOpen ? (
                            <button onClick={() => setIsLangOpen(!isLangOpen)} className={`flex flex-col items-center justify-center gap-1 transition-all duration-300 h-full min-w-[50px] group cursor-pointer hover:scale-110`}>
                                <div className={`w-8 h-8 rounded-full border flex items-center justify-center transition-all duration-300 ${isLangOpen ? 'text-[#00F2FE]' : 'text-white/60 border-white/10 shadow-[0_0_10px_rgba(255,255,255,0.1)]' }`}>
                                    <span className="font-black text-[10px] uppercase leading-none">{language}</span>
                                </div>
                                <span className={`text-[6px] font-black tracking-widest uppercase transition-colors ${isLangOpen ? 'text-[#00F2FE]' : 'text-white/30 group-hover:text-white/60'}`}>LANG</span>
                            </button>
                        ) : (
                            <button onClick={() => setIsLangOpen(!isLangOpen)} className="w-8 h-8 rounded-full border border-white/20 bg-black/60 flex items-center justify-center transition-all shadow-[0_0_10px_rgba(255,255,255,0.15)] hover:border-white/60 hover:bg-white/5 hover:shadow-[0_0_15px_rgba(255,255,255,0.3)] group/lang">
                                <span className="text-[9px] font-black text-white/80 group-hover/lang:text-white uppercase leading-none transition-colors" style={{ textShadow: '0 0 5px rgba(255,255,255,0.3)' }}>{language}</span>
                            </button>
                        )}
                        {isLangOpen && (
                            <div className="absolute left-1/2 -translate-x-1/2 w-9 bg-[#05070a] border border-white/10 rounded-full shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-1 duration-200 z-[250]" style={{ top: isDashboardOpen ? 'calc(100% - 2px)' : '100%', marginTop: isDashboardOpen ? '0' : '8px' }}>
                                <div className="py-1 flex flex-col items-center gap-1">
                                    {languages.map((lang) => (
                                        <button key={lang.code} onClick={() => { setLanguage(lang.code); setIsLangOpen(false); }} className={`w-7 h-7 rounded-full flex items-center justify-center transition-all duration-300 ${language === lang.code ? 'bg-[#00F2FE]/10 text-[#00F2FE] border border-[#00F2FE]/30 shadow-[0_0_8px_rgba(0,242,254,0.2)]' : 'text-white/40 hover:text-white hover:bg-white/10' }`}><span className="text-[8px] font-black uppercase leading-none">{lang.label}</span></button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </nav>
    );
};

const DispersingWord: React.FC<{ words: string[] }> = ({ words }) => {
    const [index, setIndex] = useState(0);
    const [state, setState] = useState<'entering' | 'active' | 'exiting'>('entering');
    useEffect(() => {
        const cycle = async () => {
            setState('entering');
            setTimeout(() => setState('active'), 1200);
            setTimeout(() => { setState('exiting'); setTimeout(() => { setIndex((prev) => (prev + 1) % words.length); }, 1200); }, 5000);
        };
        cycle();
        const interval = setInterval(cycle, 6500);
        return () => clearInterval(interval);
    }, [words.length]);
    const getStyles = () => {
        switch (state) {
            case 'entering': return "scale-[0.4] opacity-0 blur-[40px] translate-z-[-200px]";
            case 'active': return "scale-[1.1] opacity-100 blur-0 translate-z-0";
            case 'exiting': return "scale-[0.8] opacity-0 blur-[30px] translate-z-[-100px]";
            default: return "";
        }
    };
    return (
        <span className="relative inline-block h-[1.1em] min-w-[280px] md:min-w-[500px] align-top text-center perspective-1000 px-10">
            <span className={`block px-4 text-transparent bg-clip-text bg-gradient-to-b from-[#00F2FE] to-[#00F2FE]/30 transition-all duration-[1200ms] ease-[cubic-bezier(0.2,0,0.2,1)] ${getStyles()}`} style={{ textShadow: state === 'active' ? '0 0 30px rgba(0, 242, 254, 0.5)' : 'none' }}>{words[index]}</span>
            {state === 'active' && (<span className="absolute inset-0 px-4 text-transparent bg-clip-text bg-gradient-to-b from-[#00F2FE] to-transparent pointer-events-none z-0 opacity-20" style={{ filter: 'blur(20px)', WebkitTextFillColor: 'transparent' }}>{words[index]}</span>)}
        </span>
    );
};

const HeroTitle: React.FC = () => {
    const t = useTranslation();
    const words = ["GAME", "LEGACY", "VICTORY"];
    return (
        <div className="text-center mt-32 md:mt-44 mb-12 md:mb-16 relative">
            <div className="inline-block relative">
                <h1 className="font-russo text-4xl md:text-[9rem] leading-[1.1] uppercase tracking-tighter drop-shadow-2xl">
                    <span className="text-transparent bg-clip-text bg-gradient-to-b from-white to-white/20">DEFINE YOUR</span> <br />
                    <DispersingWord words={words} />
                </h1>
                <div className="mt-8 mb-10 max-w-lg mx-auto px-4">
                    <p className="font-chakra text-[10px] md:text-xs text-white/50 font-medium uppercase tracking-[0.3em] lifestyle-relaxed leading-loose">
                        {t.hubWelcomeText}
                    </p>
                </div>
                <div className="mt-6 h-px w-48 md:w-64 bg-gradient-to-r from-transparent via-[#00F2FE] to-transparent mx-auto opacity-60 shadow-[0_0_10px_#00F2FE]"></div>
            </div>
        </div>
    );
};

const CinematicCard: React.FC<{ player: Player, rank: number }> = ({ player, rank }) => {
    const cardRef = useRef<HTMLDivElement>(null);
    const { totmPlayerIds } = useApp();
    const t = useTranslation();
    const isFirst = rank === 1;
    const [isBadgeModalOpen, setIsBadgeModalOpen] = useState(false);
    const countryCodeAlpha2 = useMemo(() => player.countryCode ? convertCountryCodeAlpha3ToAlpha2(player.countryCode) : null, [player.countryCode]);
    const podiumGlowStyle = useMemo(() => {
        const glows: Record<number, string> = { 1: '0 25px 40px -20px rgba(255, 215, 0, 0.5)', 2: '0 20px 35px -15px rgba(192, 192, 192, 0.5)', 3: '0 20px 35px -15px rgba(205, 127, 50, 0.6)' };
        return { boxShadow: glows[rank] || 'none' };
    }, [rank]);
    
    const topBadges = useMemo(() => sortBadgesByPriority(player.badges || {}).slice(0, 5), [player.badges]);

    // Check TOTM
    const isTotm = totmPlayerIds.has(player.id);

    useEffect(() => {
        const card = cardRef.current; if (!card) return;
        const handleMouseMove = (e: MouseEvent) => { const rect = card.getBoundingClientRect(); const x = e.clientX - rect.left; const y = e.clientY - rect.top; card.style.setProperty('--mouse-x', `${x}px`); card.style.setProperty('--mouse-y', `${y}px`); };
        card.addEventListener('mousemove', handleMouseMove);
        return () => { card.addEventListener('mousemove', handleMouseMove); };
    }, []);
    return (
        <div style={podiumGlowStyle} className={`relative group ${isFirst ? 'scale-105 z-20' : 'scale-90 md:scale-100 z-10'} rounded-3xl transition-shadow duration-300`}>
            <div ref={cardRef} className={`interactive-card relative ${isFirst ? 'w-[280px] h-[390px]' : 'w-[260px] h-[360px]'} rounded-3xl p-4 overflow-hidden text-white bg-dark-surface border border-white/10`}>
                {player.playerCard && (<div className="absolute inset-0 w-full h-full bg-cover bg-no-repeat" style={{ backgroundImage: `url(${player.playerCard})`, backgroundPosition: 'center 5%' }}/>)}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent"></div>
                
                {!isBadgeModalOpen && (
                    <div className="absolute top-24 left-4 z-20 flex flex-col gap-4">
                        <div className="space-y-4">
                            {(player.skills || []).map(skill => (
                                <div key={skill} className="flex items-center gap-2" title={t[`skill_${skill}` as keyof typeof t] || skill}>
                                    <StarIcon className="w-4 h-4 text-[#00F2FE]" />
                                    <span className="font-bold text-xs text-white tracking-wider">{skillAbbreviations[skill]}</span>
                                </div>
                            ))}
                        </div>
                        {isTotm && (
                            <div className="animate-in fade-in zoom-in duration-500">
                                <MiniSquadBadge size="w-10 h-10" />
                            </div>
                        )}
                    </div>
                )}

                <div className="relative z-10 h-full flex flex-col justify-between p-1">
                     <div className="flex justify-between items-start">
                        <div>
                            <p style={{ color: '#00F2FE' }} className="text-base font-black leading-none">532</p>
                            <p className="text-white text-[7px] font-bold tracking-[0.15em] font-chakra leading-none mt-1">PLAYGROUND</p>
                            {countryCodeAlpha2 && (<img src={`https://flagcdn.com/w40/${countryCodeAlpha2.toLowerCase()}.png`} alt={`${player.countryCode} flag`} className="w-6 h-auto mt-3 rounded-sm" />)}
                        </div>
                        <div className="flex flex-col items-center max-w-[50%]">
                            <div className="text-4xl font-black leading-none" style={{color: '#00F2FE', textShadow: 'none' }}>{player.rating}</div>
                            <p className="font-bold text-white tracking-widest text-sm mt-2">OVR</p>
                            <div className="mt-1"><FormArrowIndicator form={player.form} /></div>
                            
                            {player.badges && Object.keys(player.badges).length > 0 && (
                                <BadgeDisplay badges={player.badges} limit={6} onOpenChange={setIsBadgeModalOpen} />
                            )}
                        </div>
                    </div>
                    <div className="text-center flex-shrink-0 relative z-30 pb-1">
                        <h1 className="text-4xl font-black uppercase tracking-tight drop-shadow-lg leading-none mb-1">
                            {player.nickname} {player.surname}
                        </h1>
                    </div>
                </div>
            </div>
        </div>
    );
};

const CinematicStatCard: React.FC<{ value: string | number; label: string; }> = ({ value, label }) => (
    <div className="w-full md:flex-1 max-w-xs md:max-w-none h-40">
        <div className="relative rounded-3xl overflow-hidden bg-white/[0.03] border border-white/10 shadow-2xl h-full backdrop-blur-md">
            <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-40"></div>
            <div className="absolute top-0 left-0 right-0 h-16 bg-gradient-to-b from-white/5 to-transparent blur-xl"></div>
            <div className="relative h-full z-10 flex flex-col items-center justify-center gap-2">
                <span className="font-russo font-black text-6xl md:text-7xl text-white tracking-widest leading-none">{value}</span>
                <span className="font-chakra font-bold text-xs text-white/50 uppercase tracking-[0.2em]">{label}</span>
            </div>
        </div>
    </div>
);

// Define allowed view types to match Club Intelligence Dashboard and avoid TS2322
type DashboardViewType = 'info' | 'dashboard' | 'roster' | 'archive' | 'duel' | 'tournaments' | 'league';

const PodiumSpot = ({ p, rank, height, color, delay, t }: { p?: any, rank: number, height: string, color: string, delay: string, t: any }) => (
    <div className={`flex flex-col items-center justify-end h-full ${delay} animate-in fade-in slide-in-from-bottom-8 duration-1000 fill-mode-both relative`}>
        {p && (
            <div className="mb-3 relative z-20 flex flex-col items-center w-full px-1">
                 <div className={`relative rounded-lg overflow-hidden border border-white/20 shadow-lg flex flex-col shrink-0 ${rank === 1 ? 'w-[110px] h-[155px] md:w-[135px] md:h-[185px] z-20' : 'w-[115px] h-[130px] md:w-[115px] md:h-[155px] z-10'}`}>
                    {p.player.playerCard ? <div className="absolute inset-0 bg-cover bg-no-repeat" style={{ backgroundImage: `url(${p.player.playerCard})`, backgroundPosition: 'center 5%' }} /> : <div className="absolute inset-0 bg-gradient-to-b from-slate-700 to-slate-900" />}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent"></div>
                    <div className="relative z-10 h-full flex flex-col justify-between p-1.5">
                        <div className="flex justify-between items-start w-full">
                            {p.player.countryCode && <img src={`https://flagcdn.com/w40/${convertCountryCodeAlpha3ToAlpha2(p.player.countryCode)?.toLowerCase()}.png`} className="w-3 h-auto rounded-sm opacity-90" alt="" />}
                            <div className="flex flex-col items-end leading-none">
                                <span className="font-russo text-lg text-[#00F2FE]">{p.player.rating}</span>
                                <span className="text-[5px] font-black text-white">OVR</span>
                            </div>
                        </div>
                        <div className="w-full text-center pb-1"><span className="text-white font-russo text-[10px] uppercase truncate px-1">{p.player.nickname}</span></div>
                    </div>
                </div>
            </div>
        )}
        {!p && (
            <div className="mb-12 opacity-10">
                <div className="w-12 h-16 rounded border-2 border-dashed border-white/30"></div>
            </div>
        )}
        
        <div className="w-full relative overflow-hidden backdrop-blur-md rounded-t-xl flex flex-col items-center justify-center pt-2 pb-1.5 z-10" style={{ height: height, background: `linear-gradient(to bottom, ${color}35, ${color}08, transparent)`, borderTop: `2px solid ${color}` }}>
            {p && (
                <div className="relative z-10 flex flex-col items-center">
                    <span className="font-russo text-xl text-white leading-none tracking-tighter">{p.score.toFixed(1)}</span>
                    <span className="text-[5.5px] font-black text-white/50 uppercase tracking-[0.2em] mt-1">{t.hubImpact}</span>
                </div>
            )}
        </div>
    </div>
);

const SessionPodium: React.FC<{ players: any[], t: any }> = ({ players, t }) => {
    const p1 = players.find(p => p.rank === 1);
    const p2 = players.find(p => p.rank === 2);
    const p3 = players.find(p => p.rank === 3);

    return (
        <div className="flex items-end justify-center gap-3 h-full px-4 relative">
            <div className="w-[115px] md:w-[165px] h-full flex flex-col justify-end z-10 shrink-0">
                <PodiumSpot p={p2} rank={2} height="90px" color="#94a3b8" delay="delay-100" t={t} />
            </div>
            <div className="w-[115px] md:w-[165px] h-full flex flex-col justify-end z-20 pb-4 shrink-0">
                <PodiumSpot p={p1} rank={1} height="130px" color="#FFD700" delay="delay-0" t={t} />
            </div>
            <div className="w-[115px] md:w-[165px] h-full flex flex-col justify-end z-10 shrink-0">
                <PodiumSpot p={p3} rank={3} height="75px" color="#CD7F32" delay="delay-200" t={t} />
            </div>
        </div>
    );
};

export const PublicHubScreen: React.FC = () => {
    const navigate = useNavigate();
    const { allPlayers, history } = useApp();
    const [isDashboardOpen, setIsDashboardOpen] = useState(false);
    
    // -- NEW: State for Team of the Month Modal --
    const [isTotmOpen, setIsTotmOpen] = useState(false);
    
    const [dashboardView, setDashboardView] = useState<DashboardViewType>('dashboard');
    const [archiveViewDate, setArchiveViewDate] = useState<string | null>(null);

    // DETERMINING ENVIRONMENT
    const isDev = useMemo(() => {
        return window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    }, []);

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
        const sorted = [...confirmedRealPlayers].sort((a, b) => {
            if (b.rating !== a.rating) return b.rating - a.rating;
            const scoreA = (a.totalGoals || 0) + (a.totalAssists || 0);
            const scoreB = (b.totalGoals || 0) + (b.totalAssists || 0);
            if (scoreB !== scoreA) return scoreB - scoreA;
            const wrA = a.totalGames > 0 ? (a.totalWins / a.totalGames) : 0;
            const wrB = b.totalGames > 0 ? (b.totalWins / b.totalGames) : 0;
            if (wrB !== wrA) return wrB - wrA;
            return (b.totalGames || 0) - (a.totalGames || 0);
        });
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
        // Facebook removed
        youtube: "https://youtube.com/@playground532?si=_NqI_aOcvmjlSMFn",
        instagram: "https://www.instagram.com/532playground?igsh=MTdzdHpwMjY3aHN4cg%3D%3D&utm_source=qr",
        tiktok: "https://www.tiktok.com/@532playground",
    };

    const handleTabChange = (tab: any) => {
        setDashboardView(tab as DashboardViewType);
    };

    // ОПРЕДЕЛЕНИЕ ЦВЕТА ПОДЛОЖКИ - УНИФИЦИРОВАНО НА САМЫЙ ТЕМНЫЙ
    const getBottomPatchColor = () => {
        if (dashboardView === 'archive' || dashboardView === 'dashboard' || dashboardView === 'roster' || dashboardView === 'info') return '#01040a';
        return '#0a0c10';
    };

    return (
        <div className="min-h-screen text-white relative selection:bg-[#00F2FE] selection:text-black bg-[#0a0c10] pt-px overscroll-none">
            
            {/* -- MODAL: Team of the Month -- */}
            <TeamOfTheMonthModal isOpen={isTotmOpen} onClose={() => setIsTotmOpen(false)} />

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
                    setDashboardView('dashboard');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                onOpenTotm={() => setIsTotmOpen(true)}
            />

            <div 
                className={`fixed inset-0 z-[60] transform transition-all duration-700 ease-in-out flex pt-20 pb-8 md:pb-12 overflow-y-auto overscroll-none 
                ${isDashboardOpen ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0 pointer-events-none'}
                `}
                style={{ backgroundColor: getBottomPatchColor() }}
            >
                <div className="relative max-w-[1450px] w-full mx-auto px-0 z-10">
                    <ClubIntelligenceDashboard currentView={dashboardView} setView={setDashboardView} onArchiveViewChange={setArchiveViewDate} />
                </div>

                {/* ГЛОБАЛЬНАЯ НАКЛАДКА ДЛЯ БЕСШОВНОГО ПЕРЕХОДА (ПОДЛОЖКА) - ОПУЩЕНА НИЖЕ */}
                <div 
                    className="fixed bottom-0 left-0 right-0 h-16 z-[110] pointer-events-none opacity-0 transition-all duration-700 delay-300" 
                    style={{ 
                        opacity: isDashboardOpen ? 1 : 0,
                        background: `linear-gradient(to top, ${getBottomPatchColor()} 50%, ${getBottomPatchColor()}cc 80%, transparent 100%)`
                    }}
                ></div>
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

                <div className="mt-24 md:mt-32 pb-12">
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
                    <footer className="relative pb-8 pt-0 bg-transparent">
                        <div className="text-center px-4">
                            
                            {!isDashboardOpen && (
                                <div className="flex justify-center mb-6 -mt-4 relative z-20 animate-in fade-in zoom-in duration-700">
                                    <SquadOfTheMonthBadge 
                                        onClick={() => setIsTotmOpen(true)} 
                                        className="cursor-pointer"
                                    />
                                </div>
                            )}

                            <div className="mt-10 mb-24">
                                <button 
                                    onClick={() => setIsDashboardOpen(true)} 
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
                                <a href={SOCIAL_LINKS.tiktok} target="_blank" rel="noopener noreferrer" className="text-white/40 hover:text-white transition-colors"><TikTokIcon className="w-7 h-7" /></a>
                            </div>
                        </div>
                    </footer>
                </div>
            </div>
        </div>
    );
};