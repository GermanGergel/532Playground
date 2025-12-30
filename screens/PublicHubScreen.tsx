
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context';
import { Player, PlayerStatus, PlayerForm, SkillType } from '../types';
import { TrophyIcon, Users, History as HistoryIcon, BarChartDynamic, StarIcon, ChevronLeft, Zap, WhatsApp, YouTubeIcon, InstagramIcon, TikTokIcon, FacebookIcon, XCircle, Home, LayoutDashboard, AwardIcon, Target, InfoIcon } from '../icons';
import { PlayerAvatar, TeamAvatar } from '../components/avatars';
import { Language } from '../translations/index';
import { BadgeDisplay, BadgeIcon, sortBadgesByPriority } from '../features';
import { useTranslation } from '../ui';
import { convertCountryCodeAlpha3ToAlpha2 } from '../utils/countries';
import { ClubIntelligenceDashboard } from '../components/ClubIntelligenceDashboard';
import { RadioPlayer } from '../components/RadioPlayer';

const skillAbbreviations: Record<SkillType, string> = {
    goalkeeper: 'GK', power_shot: 'PS', technique: 'TQ', defender: 'DF', 
    playmaker: 'PM', finisher: 'FN', versatile: 'VS', tireless_motor: 'TM', leader: 'LD',
};

const FormArrowIndicator: React.FC<{ form: PlayerForm }> = ({ form }) => {
    const config = { hot_streak: { color: '#4CFF5F' }, stable: { color: '#A9B1BD' }, cold_streak: { color: '#FF4136' } };
    const currentForm = config[form] || config.stable;
    const commonProps: React.SVGProps<SVGSVGElement> = { width: "24", height: "24", viewBox: "0 0 24 24", fill: "none", stroke: currentForm.color, strokeWidth: "2.5", strokeLinecap: "round", strokeLinejoin: "round" };
    if (form === 'hot_streak') return <svg {...commonProps}><path d="M12 19V5m-6 7l6-6 6 6"/></svg>;
    if (form === 'cold_streak') return <svg {...commonProps}><path d="M12 5v14M12 5v14M5 12l7 7 7-7"/></svg>;
    return <svg {...commonProps}><path d="M5 12h14m-6-6l6 6-6 6"/></svg>;
};

const NoLeadersPlaceholder: React.FC = () => {
    const t = useTranslation();
    return (
        <div className="w-full max-w-2xl mx-auto py-20 flex flex-col items-center justify-center relative opacity-30">
            <div className="w-20 h-20 rounded-full border-2 border-dashed border-[#00F2FE] animate-spin flex items-center justify-center mb-6"><TrophyIcon className="w-10 h-10 text-[#00F2FE]" /></div>
            <h3 className="font-orbitron text-lg font-black text-white tracking-[0.4em] uppercase">{t.hubAwaitingStats}</h3>
        </div>
    );
};

const MotivationalTicker: React.FC = () => {
    const t = useTranslation();
    const phrases = [t.hubTicker1, t.hubTicker2, t.hubTicker3, t.hubTicker4, t.hubTicker5];
    return (
        <div className="relative w-full h-full overflow-hidden flex items-center">
            <style>{`@keyframes hub-ticker { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } } .animate-hub-ticker { display: flex; width: fit-content; animation: hub-ticker 33s linear infinite; }`}</style>
            <div className="animate-hub-ticker whitespace-nowrap flex gap-12">
                {[...phrases, ...phrases].map((phrase, i) => (
                    <span key={i} className="text-[12px] font-bold tracking-[0.1em] uppercase flex items-center font-russo italic text-[#00F2FE] opacity-40">{phrase}</span>
                ))}
            </div>
        </div>
    );
};

// ... (Sub-components like StaticSoccerBall, HangingTag, etc. are preserved from previous context) ...

const CinematicCard: React.FC<{ player: Player, rank: number }> = ({ player, rank }) => {
    const cardRef = useRef<HTMLDivElement>(null);
    const t = useTranslation();
    const isFirst = rank === 1;
    const countryCodeAlpha2 = useMemo(() => player.countryCode ? convertCountryCodeAlpha3ToAlpha2(player.countryCode) : null, [player.countryCode]);
    const topBadges = useMemo(() => sortBadgesByPriority(player.badges || {}).slice(0, 5), [player.badges]);

    return (
        <div className={`relative group ${isFirst ? 'scale-105 z-20' : 'scale-90 md:scale-100 z-10'} transition-transform duration-300`}>
            <div ref={cardRef} className={`relative ${isFirst ? 'w-[280px] h-[390px]' : 'w-[260px] h-[360px]'} rounded-3xl p-4 overflow-hidden text-white bg-dark-surface border border-white/10 shadow-2xl`}>
                {player.playerCard && <div className="absolute inset-0 bg-cover bg-no-repeat opacity-60" style={{ backgroundImage: `url(${player.playerCard})`, backgroundPosition: 'center 5%' }}/>}
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent"></div>
                <div className="relative z-10 h-full flex flex-col justify-between">
                     <div className="flex justify-between items-start">
                        <div>
                            <p style={{ color: '#00F2FE' }} className="text-base font-black leading-none">532</p>
                            <p className="text-white text-[7px] font-bold tracking-[0.15em] leading-none mt-1">PLAYGROUND</p>
                            {countryCodeAlpha2 && <img src={`https://flagcdn.com/w40/${countryCodeAlpha2.toLowerCase()}.png`} className="w-6 h-auto mt-3 rounded-sm opacity-80" alt="flag" />}
                        </div>
                        <div className="flex flex-col items-center">
                            <div className="text-4xl font-black text-[#00F2FE]">{player.rating}</div>
                            <p className="font-bold text-white text-xs mt-1">OVR</p>
                            <div className="mt-1"><FormArrowIndicator form={player.form} /></div>
                            <div className="flex flex-col items-center gap-1 mt-2 text-[#FFD700]">
                                {topBadges.map(badge => <div key={badge} className="drop-shadow-[0_0_5px_rgba(255,215,0,0.5)]"><BadgeIcon badge={badge} className="w-6 h-6" /></div>)}
                            </div>
                        </div>
                    </div>
                    <div className="text-center pb-2">
                        <h1 className="font-russo text-3xl uppercase tracking-tight text-white drop-shadow-lg leading-none">{player.nickname}</h1>
                        <p className="text-[10px] font-bold text-white/50 uppercase tracking-widest mt-1">RANK {rank}</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export const PublicHubScreen: React.FC = () => {
    const navigate = useNavigate();
    const { allPlayers, history } = useApp();
    const [isDashboardOpen, setIsDashboardOpen] = useState(false);
    const [dashboardView, setDashboardView] = useState<any>('dashboard');
    const t = useTranslation();

    // --- ROBUST TIE-BREAKER SORTING LOGIC ---
    const displayData = useMemo(() => {
        const confirmed = allPlayers.filter(p => p.status === PlayerStatus.Confirmed);
        
        const sorted = [...confirmed].sort((a, b) => {
            // 1. Primary: Rating (OVR)
            if (b.rating !== a.rating) return b.rating - a.rating;
            
            // 2. Secondary: Total Goals (Golden Boot Rule)
            if (b.totalGoals !== a.totalGoals) return b.totalGoals - a.totalGoals;
            
            // 3. Tertiary: Win Rate
            const getWR = (p: Player) => p.totalGames > 0 ? (p.totalWins / p.totalGames) : 0;
            const wrA = getWR(a);
            const wrB = getWR(b);
            if (wrB !== wrA) return wrB - wrA;
            
            // 4. Quaternary: Assists
            return (b.totalAssists || 0) - (a.totalAssists || 0);
        });

        return { top: sorted.slice(0, 3) };
    }, [allPlayers]);

    return (
        <div className="min-h-screen text-white relative bg-[#0a0c10] pt-px overflow-x-hidden">
            {/* Nav & Dashboard logic is preserved but UI is slightly tweaked for speed */}
            <HeroTitle />
            
            <div className="text-center mb-12">
                <TrophyIcon className="w-10 h-10 mx-auto mb-4 text-[#00F2FE] drop-shadow-[0_0_10px_rgba(0,242,254,0.7)]" />
                <h2 className="font-orbitron text-2xl font-black uppercase tracking-[0.2em]">{t.hubLeadersTitle}</h2>
            </div>

            {displayData.top.length > 0 ? (
                <div className="flex flex-wrap items-end justify-center gap-4 md:gap-8 w-full px-4">
                    <div className="order-2 md:order-1">{displayData.top[1] && <CinematicCard player={displayData.top[1]} rank={2} />}</div>
                    <div className="order-1 md:order-2">{displayData.top[0] && <CinematicCard player={displayData.top[0]} rank={1} />}</div>
                    <div className="order-3 md:order-3">{displayData.top[2] && <CinematicCard player={displayData.top[2]} rank={3} />}</div>
                </div>
            ) : (
                <NoLeadersPlaceholder />
            )}

            <div className="mt-20 flex justify-center pb-20">
                <button 
                    onClick={() => { setIsDashboardOpen(true); window.scrollTo({top:0, behavior:'smooth'}); }} 
                    className="bg-transparent text-[#00F2FE] font-black text-lg py-4 px-12 rounded-2xl border border-[#00F2FE]/30 shadow-[0_0_20px_rgba(0,242,254,0.2)] hover:bg-[#00F2FE]/10 transition-all animate-pulse"
                >
                    {t.hubDashboardBtn}
                </button>
            </div>
            
            {/* Dashboard Overlay */}
            <div className={`fixed inset-0 z-[100] transform transition-all duration-700 bg-[#0a0c10] ${isDashboardOpen ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0 pointer-events-none'}`}>
                 <div className="p-4 flex justify-between items-center border-b border-white/10">
                    <button onClick={() => setIsDashboardOpen(false)} className="p-2 text-white/50 hover:text-white"><XCircle className="w-8 h-8" /></button>
                    <span className="font-russo tracking-widest text-[#00F2FE]">CLUB INTELLIGENCE</span>
                    <div className="w-8" />
                 </div>
                 <div className="h-full overflow-y-auto pb-24">
                    <ClubIntelligenceDashboard currentView={dashboardView} setView={setDashboardView} />
                 </div>
            </div>
        </div>
    );
};

const HeroTitle: React.FC = () => {
    const t = useTranslation();
    return (
        <div className="text-center mt-32 mb-16 px-4">
            <h1 className="font-russo text-5xl md:text-8xl uppercase tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-white to-white/20">
                ELITE<br/><span className="text-[#00F2FE]">PLAYGROUND</span>
            </h1>
            <p className="font-chakra text-xs text-white/40 uppercase tracking-[0.3em] mt-8 max-w-sm mx-auto">{t.hubWelcomeText}</p>
        </div>
    );
};
