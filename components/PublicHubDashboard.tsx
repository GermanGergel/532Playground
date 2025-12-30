import React, { useMemo, useState, useRef, useEffect } from 'react';
import { useApp } from '../context';
import { calculateAllStats, PlayerStats } from '../services/statistics';
import { NewsItem, Player, PlayerTier, Team } from '../types';
import { TrophyIcon, Zap, History as HistoryIcon, Users, AwardIcon, StarIcon, Target } from '../icons';
import { useTranslation } from './ui';
import { convertCountryCodeAlpha3ToAlpha2 } from '../utils/countries';

// --- LOCAL ICONS ---
const MapPinIcon = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
);
const ClockIcon = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
);
const CloudRainIcon = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242"/><path d="M16 14v6"/><path d="M8 14v6"/><path d="M12 16v6"/></svg>
);
const TermometerIcon = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M14 4v10.54a4 4 0 1 1-4 0V4a2 2 0 0 1 4 0Z"/></svg>
);

// --- STANDBY COMPONENT ---
const StandbyScreen: React.FC = () => {
    const t = useTranslation();
    return (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black overflow-hidden rounded-[2.5rem]">
            {/* Animated Scanning Circle */}
            <div className="absolute w-[600px] h-[600px] border border-[#00F2FE]/20 rounded-full animate-ping-slow"></div>
            <div className="absolute w-[400px] h-[400px] border border-[#00F2FE]/10 rounded-full animate-ping-slower"></div>
            
            <div className="relative z-10 flex flex-col items-center gap-6">
                <div className="text-center space-y-4">
                    <h2 className="font-orbitron text-3xl md:text-5xl font-black text-white tracking-[0.3em] uppercase opacity-90">
                        STANDBY
                    </h2>
                    <div className="flex items-center justify-center gap-3">
                        <div className="h-px w-8 bg-[#00F2FE]/40"></div>
                        <span className="font-chakra text-sm font-bold text-[#00F2FE] tracking-[0.5em] animate-pulse">SEARCHING FOR BROADCAST</span>
                        <div className="h-px w-8 bg-[#00F2FE]/40"></div>
                    </div>
                </div>
                
                <p className="max-w-xs text-center text-[10px] font-mono text-white/30 uppercase tracking-[0.2em] leading-loose mt-8">
                    {t.hubAwaitingStats}<br/>SYSTEM IDLE. AWAITING UPLINK SIGNAL...
                </p>
            </div>

            <style dangerouslySetInnerHTML={{ __html: `
                @keyframes ping-slow { 0% { transform: scale(0.8); opacity: 0.5; } 100% { transform: scale(1.5); opacity: 0; } }
                .animate-ping-slow { animation: ping-slow 4s cubic-bezier(0, 0, 0.2, 1) infinite; }
                .animate-ping-slower { animation: ping-slow 6s cubic-bezier(0, 0, 0.2, 1) infinite; }
            `}} />
        </div>
    );
};

// --- DASHBOARD UI HELPERS ---

const SubtleDashboardAvatar: React.FC<{ team: any; size?: string; isLight?: boolean }> = ({ team }) => {
    const color = team?.color || '#A9B1BD';
    return (
        <div className="group/avatar relative flex items-center justify-center shrink-0">
            <div 
                className="w-6 h-6 rounded-full flex items-center justify-center transition-all duration-500 bg-black/40 opacity-90 group-hover/avatar:opacity-100 group-hover/avatar:scale-110"
                style={{ 
                    border: `1px solid ${color}`,
                    boxShadow: `0 0 5px ${color}66, 0 0 1.5px ${color}`, 
                }}
            >
                {team?.logo ? (
                    <img src={team.logo} className="w-full h-full rounded-full object-cover" alt="" />
                ) : (
                    <svg className="w-[55%] h-[55%]" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M20.38 3.46L16 2a4 4 0 0 0-8 0L3.62 3.46a2 2 0 0 0-1.34 2.23l.58 3.47a1 1 0 0 0 .99 .84H6v10c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V10h2.15a1 1 0 0 0 .99-.84l.58-3.47a2 2 0 0 0-1.34-2.23z" fill={color} fillOpacity="0.35" stroke={color} strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                )}
            </div>
        </div>
    );
};

const HubCard: React.FC<{ 
    title: React.ReactNode; 
    icon: React.ReactNode; 
    children: React.ReactNode; 
    className?: string;
    accent?: string;
    variant?: 'default' | 'dark' | 'midnight' | 'glass' | 'ocean' | 'elite' | 'standings' | 'obsidian';
    bodyClassName?: string;
    headerExtra?: React.ReactNode;
    align?: 'left' | 'right';
}> = ({ title, icon, children, className = "", accent = "#00F2FE", variant = 'default', bodyClassName = "", headerExtra, align = 'left' }) => {
    const isElite = variant === 'elite';
    const isStandings = variant === 'standings';
    const isRight = align === 'right';

    let bgStyleClass = 'bg-white/80 backdrop-blur-2xl border-slate-200'; 
    let headerStyleClass = 'bg-gradient-to-b from-white to-slate-50/50 border-b border-slate-100'; 
    let titleColor = 'text-slate-800';
    let iconBg = 'bg-white border-slate-100';

    if (variant === 'dark') {
        headerStyleClass = 'border-b border-white/10';
        titleColor = 'text-white';
        iconBg = 'bg-white/10 border-white/20';
    } else if (isElite) {
        bgStyleClass = 'bg-[#010413] border-white/10';
        headerStyleClass = 'bg-transparent !border-0';
        titleColor = 'text-white'; 
        iconBg = 'bg-white/5 border-white/10 text-[#FFD700]';
    } else if (isStandings) {
        bgStyleClass = 'bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#0f172a] via-[#020617] to-black border-white/10';
        headerStyleClass = 'bg-transparent !border-0';
        titleColor = 'text-white';
        iconBg = 'bg-white/10 border-white/20 text-white';
    }

    return (
        <div className={`relative overflow-hidden rounded-[1.5rem] flex flex-col border ${bgStyleClass} ${className} group/card`}>
            {/* --- TEXTURE LAYERS (Added from HubPlayerIntel) --- */}
            {/* Dynamic Mesh Texture Overlay */}
            <div className="absolute inset-0 opacity-[0.03] pointer-events-none z-0" style={{ 
                backgroundImage: `linear-gradient(45deg, #fff 25%, transparent 25%, transparent 50%, #fff 50%, #fff 75%, transparent 75%, transparent)`,
                backgroundSize: '4px 4px'
            }}></div>

            {/* Pulsing Ambient Light */}
            <div className="absolute -top-10 -left-10 w-40 h-40 bg-[#00F2FE]/[0.03] rounded-full blur-[40px] pointer-events-none z-0 animate-pulse" style={{ animationDuration: '4s' }}></div>
            
            {/* Hover Shine Effect */}
            <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/[0.01] to-transparent opacity-0 group-hover/card:opacity-100 transition-opacity duration-700 z-0"></div>
            {/* ------------------------------------------------ */}

            <div className={`relative z-10 py-1.5 px-4 flex items-center justify-between shrink-0 ${headerStyleClass} ${isRight ? 'flex-row-reverse' : ''}`}>
                 <div className={`flex items-center gap-2 relative z-10 ${isRight ? 'flex-row-reverse' : ''}`}>
                    <div className={`w-4 h-4 rounded-md flex items-center justify-center shadow-sm border ${iconBg}`} style={{ color: accent }}>
                        {React.cloneElement(icon as React.ReactElement, { className: "w-2.5 h-2.5" })}
                    </div>
                    {typeof title === 'string' ? <h3 className={`font-russo text-[10px] uppercase tracking-widest ${titleColor}`}>{title}</h3> : title}
                 </div>
                 {headerExtra && <div className="relative z-10">{headerExtra}</div>}
            </div>
            <div className={`flex-grow relative overflow-hidden flex flex-col z-10 ${bodyClassName || 'p-0'}`}>
                {children}
            </div>
        </div>
    );
};

const TacticalRosters: React.FC<{ teams: Team[], players: Player[], session: any, t: any }> = ({ teams, players, session, t }) => (
    <div className="flex h-full w-full divide-x divide-white/10 bg-black/20">
        {teams.map((team) => {
            const teamPlayers = team.playerIds.map(pid => players.find(p => p.id === pid)).filter(Boolean) as Player[];
            const avgOvr = teamPlayers.length > 0 ? Math.round(teamPlayers.reduce((sum, p) => sum + p.rating, 0) / teamPlayers.length) : 0;
            
            // Calculate Goals & Synergy
            let goals = 0;
            let assistedGoals = 0;
            session.games.filter((g: any) => g.status === 'finished').forEach((g: any) => {
                const teamGoals = g.goals.filter((goal: any) => goal.teamId === team.id && !goal.isOwnGoal);
                goals += teamGoals.length;
                assistedGoals += teamGoals.filter((goal: any) => goal.assistantId).length;
            });

            const synergy = goals > 0 ? Math.round((assistedGoals / goals) * 100) : 0;
            const synergyColor = synergy >= 60 ? 'text-[#4CFF5F]' : synergy <= 30 ? 'text-orange-400' : 'text-[#00F2FE]';

            return (
                <div key={team.id} className="flex-1 flex flex-col min-w-0">
                    <div className="h-10 border-b border-white/5 flex items-end justify-center pb-2 relative overflow-hidden" style={{ background: `linear-gradient(to bottom, ${team.color}25, transparent)` }}>
                         <div className="flex items-center gap-1 bg-black/40 px-2 py-0.5 rounded text-[8px] font-black tracking-widest border border-white/10 text-white/60">
                            <span>OVR</span> <span className="text-white">{avgOvr}</span>
                         </div>
                    </div>
                    <div className="flex-grow flex flex-col p-1 gap-1 overflow-hidden">
                        {team.playerIds.map((pid, idx) => {
                            const p = players.find(player => player.id === pid);
                            return (
                                <div key={pid} className="group/unit flex-1 flex items-center bg-white/[0.02] rounded-lg px-3 border border-transparent hover:border-white/10 transition-all min-h-[24px]">
                                    <span className="font-mono text-[8px] text-white/20 w-4 shrink-0">{(idx + 1)}</span>
                                    <span className="text-[10px] font-black text-slate-400 uppercase truncate flex-grow">{p?.nickname || 'UNKNOWN'}</span>
                                </div>
                            );
                        })}
                    </div>
                    
                    {/* FOOTER STATS: GOALS & SYNERGY */}
                    <div className="py-2 border-t border-white/5 bg-black/40 flex items-center divide-x divide-white/10">
                        <div className="flex-1 flex flex-col items-center justify-center">
                            <span className="text-[12px] font-black text-slate-200 leading-none">{goals}</span>
                            <span className="text-[5px] text-white/30 uppercase font-bold tracking-widest mt-0.5">{t.hubGoals}</span>
                        </div>
                        <div className="flex-1 flex flex-col items-center justify-center">
                            <span className={`text-[12px] font-black leading-none ${synergyColor}`}>
                                {synergy}%
                            </span>
                            <span className="text-[5px] text-white/30 uppercase font-bold tracking-widest mt-0.5">SYNERGY</span>
                        </div>
                    </div>
                </div>
            );
        })}
    </div>
);

interface TopPlayerStats {
    player: Player;
    score: number;
    rank: 1 | 2 | 3;
}

const SessionPodium: React.FC<{ players: TopPlayerStats[], t: any }> = ({ players, t }) => {
    const p1 = players.find(p => p.rank === 1);
    const p2 = players.find(p => p.rank === 2);
    const p3 = players.find(p => p.rank === 3);

    const MiniCard = ({ p }: { p: TopPlayerStats }) => {
        const countryCodeAlpha2 = useMemo(() => p.player.countryCode ? convertCountryCodeAlpha3ToAlpha2(p.player.countryCode) : null, [p.player.countryCode]);
        const sizeClasses = p.rank === 1 ? 'w-[100px] h-[140px] md:w-[120px] md:h-[165px] z-20' : 'w-[85px] h-[115px] md:w-[100px] md:h-[135px] z-10';
        return (
            <div className={`relative rounded-lg overflow-hidden border border-white/20 shadow-lg flex flex-col shrink-0 ${sizeClasses}`}>
                {p.player.playerCard ? <div className="absolute inset-0 bg-cover bg-no-repeat" style={{ backgroundImage: `url(${p.player.playerCard})`, backgroundPosition: 'center 5%' }} /> : <div className="absolute inset-0 bg-gradient-to-b from-slate-700 to-slate-900" />}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent"></div>
                <div className="relative z-10 h-full flex flex-col justify-between p-1.5">
                    <div className="flex justify-between items-start w-full">
                        {countryCodeAlpha2 && <img src={`https://flagcdn.com/w40/${countryCodeAlpha2.toLowerCase()}.png`} className="w-3 h-auto rounded-sm opacity-90" alt="" />}
                        <div className="flex flex-col items-end leading-none">
                            <span className="font-russo text-lg text-[#00F2FE]">{p.player.rating}</span>
                            <span className="text-[5px] font-black text-white">OVR</span>
                        </div>
                    </div>
                    <div className="w-full text-center pb-1"><span className="text-white font-russo text-[10px] uppercase truncate px-1">{p.player.nickname}</span></div>
                </div>
            </div>
        );
    };

    const PodiumSpot = ({ p, rank, height, color, delay }: { p?: TopPlayerStats, rank: number, height: string, color: string, delay: string }) => (
        <div className={`flex flex-col items-center justify-end h-full ${delay} animate-in fade-in slide-in-from-bottom-8 duration-1000 fill-mode-both`}>
            {p ? <div className="mb-3 relative z-20 flex flex-col items-center w-full px-1"><MiniCard p={p} /></div> : <div className="mb-12 opacity-10"><div className="w-12 h-16 rounded border-2 border-dashed border-white/30"></div></div>}
            <div className="w-full relative overflow-hidden backdrop-blur-md rounded-t-xl flex flex-col items-center justify-center pt-2 pb-1" style={{ height: height, background: `linear-gradient(to bottom, ${color}35, ${color}08, transparent)`, borderTop: `2px solid ${color}` }}>
                {p && <div className="relative z-10 flex flex-col items-center"><span className="font-russo text-xl text-white leading-none">{p.score.toFixed(1)}</span><span className="text-[6px] font-black text-white/40 uppercase tracking-widest mt-0.5">{t.hubImpact}</span></div>}
            </div>
        </div>
    );

    return (
        <div className="flex items-end justify-center gap-3 h-full px-4 relative">
            <div className="w-[100px] md:w-[125px] h-full flex flex-col justify-end z-10"><PodiumSpot p={p2} rank={2} height="90px" color="#94a3b8" delay="delay-100" /></div>
            <div className="w-[100px] md:w-[125px] h-full flex flex-col justify-end z-20 pb-4"><PodiumSpot p={p1} rank={1} height="130px" color="#FFD700" delay="delay-0" /></div>
            <div className="w-[100px] md:w-[125px] h-full flex flex-col justify-end z-10"><PodiumSpot p={p3} rank={3} height="60px" color="#CD7F32" delay="delay-200" /></div>
        </div>
    );
};

const NewsVanguardCard: React.FC<{ item: NewsItem }> = ({ item }) => (
    <div className="mb-3 relative px-1 animate-in fade-in slide-in-from-right-4 duration-500">
        <div className="relative rounded-2xl overflow-hidden p-3.5 border border-white/5 bg-gradient-to-br from-[#161a21] to-[#0c0e12]">
            <div className="absolute top-3.5 left-0 w-1 h-6 rounded-r-full bg-[#00F2FE]" style={{ boxShadow: '0 0 8px #00F2FE' }}></div>
            <div className="flex items-center justify-between gap-3 pl-2">
                <div className="flex-grow min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                        <span className="text-[7px] font-black tracking-[0.2em] uppercase px-1.5 py-0.5 rounded-sm bg-white/5 text-[#00F2FE]">{item.type.replace('_', ' ')}</span>
                        <span className="text-[7px] font-mono text-white/20">{new Date(item.timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
                    </div>
                    <h4 className="text-[12px] font-black text-slate-200 uppercase truncate">{item.playerName}</h4>
                    <p className="text-[10px] text-white/40 leading-tight mt-1 truncate italic font-chakra border-l border-white/5 pl-2">{item.message.replace(item.playerName, '').trim() || item.subMessage}</p>
                </div>
                {item.isHot && <Zap className="w-3.5 h-3.5 text-[#00F2FE] animate-pulse" />}
            </div>
        </div>
    </div>
);

const getImpactScore = (stats: PlayerStats): number => {
    let score = 0;
    score += stats.wins * 3.0;
    score += stats.draws * 1.0;
    score += stats.cleanSheets * 2.5; 
    score += stats.goals * 1.5;
    score += stats.assists * 1.2;
    score -= stats.ownGoals * 2.0;
    return score;
};

const MatchEnvironmentWidget: React.FC<{ session: any, t: any }> = ({ session, t }) => (
    <div className="flex flex-col h-full justify-between py-2">
        <div className="flex items-start gap-3 border-b border-white/5 pb-4">
            <div className="w-10 h-10 rounded-xl bg-[#00F2FE]/10 border border-[#00F2FE]/30 flex items-center justify-center text-[#00F2FE] shrink-0"><MapPinIcon className="w-5 h-5" /></div>
            <div className="flex flex-col pt-0.5"><span className="text-[9px] font-black text-white/30 uppercase tracking-[0.2em] mb-1">{t.hubLocation}</span><span className="font-chakra font-bold text-base text-white uppercase tracking-wide truncate max-w-[200px]">{session.location || "PITCH DATA UNAVAILABLE"}</span></div>
        </div>
        <div className="flex items-center gap-3 border-b border-white/5 py-4">
            <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white/50 shrink-0"><ClockIcon className="w-5 h-5" /></div>
            <div className="flex flex-col"><span className="text-[9px] font-black text-white/30 uppercase tracking-[0.2em] mb-1">{t.hubTimeFrame}</span><span className="font-mono font-bold text-xl text-white tracking-widest">{session.timeString || "19:30 - 21:00"}</span></div>
        </div>
        <div className="flex-grow flex flex-col justify-end pt-2">
            <div className="relative rounded-2xl bg-gradient-to-br from-indigo-900/40 to-black border border-indigo-500/20 p-4 flex items-center justify-between overflow-hidden">
                {/* --- ADDED TEXTURE OVERLAY HERE (UPDATED to match Archive Cards) --- */}
                <div className="absolute inset-0 opacity-[0.05] pointer-events-none z-0 bg-[url('https://www.transparenttextures.com/patterns/diagonal-striped-brick.png')]"></div>
                
                <div className="relative z-10 flex flex-col">
                    <span className="text-[9px] font-black text-indigo-300 uppercase tracking-[0.2em] mb-1">{t.hubWeather}</span>
                    <div className="flex items-baseline gap-1"><span className="font-russo text-4xl text-white leading-none">{session.weather?.temperature || 26}°C</span><TermometerIcon className="w-4 h-4 text-white/40" /></div>
                    <span className="font-chakra text-xs text-indigo-200 font-bold uppercase tracking-wider mt-1">{session.weather?.condition || "CLEAR"}</span>
                </div>
                <div className="relative z-10"><CloudRainIcon className="w-16 h-16 text-white" /></div>
            </div>
        </div>
    </div>
);

// --- MAIN DASHBOARD EXPORT ---

export const PublicHubDashboard: React.FC = () => {
    const { history, newsFeed } = useApp();
    const t = useTranslation();
    const [activeRightTab, setActiveRightTab] = useState<'players' | 'games'>('players');

    const session = history[0];
    
    // --- STANDBY TRIGGER ---
    if (!session) return <StandbyScreen />;

    const { teamStats, allPlayersStats } = calculateAllStats(session);
    const sortedAllPlayers = [...allPlayersStats].sort((a, b) => getImpactScore(b) - getImpactScore(a));

    const top3Players: TopPlayerStats[] = sortedAllPlayers
        .filter(p => p.gamesPlayed > 0)
        .slice(0, 3)
        .map((p, i) => ({ player: p.player, score: getImpactScore(p), rank: (i + 1) as any }));

    const finishedGames = [...session.games]
        .filter(g => g.status === 'finished')
        .sort((a, b) => a.gameNumber - b.gameNumber);

    const thStandings = "py-2 text-white/40 uppercase tracking-tighter text-[8px] font-black text-center sticky top-0 bg-[#1e293b]/50 backdrop-blur-sm z-10 border-b border-white/5";

    return (
        <div className="h-full flex flex-col animate-in fade-in duration-700 w-full relative p-2 md:p-3">
            <div className="absolute inset-0 z-0 pointer-events-none rounded-[2rem] overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#0f172a] via-[#020617] to-black"></div>
                <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]"></div>
            </div>

            <div className="flex-grow grid grid-cols-12 gap-4 min-h-0 items-start relative z-10">
                <div className="col-span-12 md:col-span-9 flex flex-col gap-4 h-full min-h-[600px]">
                    <div className="flex-[4] min-h-0 shrink-0 animate-in fade-in slide-in-from-bottom-4 duration-1000 delay-200 flex gap-3">
                         <HubCard title={t.hubSessionLeaders} align="right" icon={<AwardIcon />} accent="#FFD700" variant="elite" className="flex-[2] h-full min-h-[350px]" bodyClassName="flex flex-col bg-transparent">
                            <div className="flex-grow relative"><SessionPodium players={top3Players} t={t} /></div>
                        </HubCard>
                        <HubCard title={t.hubMatchReport} icon={<Target />} accent="#00F2FE" variant="standings" className="flex-1 h-full min-h-[350px]" bodyClassName="flex flex-col p-5"><MatchEnvironmentWidget session={session} t={t} /></HubCard>
                    </div>

                    <div className="flex-[3] min-h-0 shrink-0 grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <HubCard title={t.hubSessionNews} icon={<Zap />} accent="#00F2FE" variant="standings" className="h-full min-h-0" bodyClassName="p-0 flex flex-col">
                            <div className="flex-grow relative overflow-hidden">
                                <div className="absolute inset-0 overflow-y-auto custom-hub-scrollbar p-3 bg-black/10">
                                    {newsFeed.slice(0, 15).map(item => <NewsVanguardCard key={item.id} item={item} />)}
                                    {newsFeed.length === 0 && <p className="text-center py-10 opacity-20 text-[10px] tracking-widest uppercase">No Intel Updates</p>}
                                </div>
                                <div className="absolute top-0 left-0 right-0 h-6 bg-gradient-to-b from-[#0f172a] to-transparent z-20" />
                                <div className="absolute bottom-0 left-0 right-0 h-6 bg-gradient-to-t from-[#020617] to-transparent z-20" />
                            </div>
                        </HubCard>
                        <HubCard title={t.hubSessionSquads} icon={<Target />} variant="standings" className="h-full min-h-0" bodyClassName="flex flex-col"><TacticalRosters teams={session.teams} players={session.playerPool} session={session} t={t} /></HubCard>
                    </div>
                </div>

                <div className="col-span-12 md:col-span-3 flex flex-col gap-4 h-full min-h-[600px]">
                    <HubCard title={t.hubTeamStandings} icon={<TrophyIcon />} variant="standings" className="shrink-0" bodyClassName="flex flex-col">
                        <div className="p-1"><table className="w-full table-fixed border-collapse">
                                <thead><tr className="bg-white/5 border-b border-white/10"><th className={`${thStandings} w-[12%]`}>#</th><th className={`${thStandings} w-[28%]`}>{t.team}</th><th className={`${thStandings} w-[10%]`}>{t.thP}</th><th className={`${thStandings} w-[10%]`}>{t.thW}</th><th className={`${thStandings} w-[10%]`}>{t.thD}</th><th className={`${thStandings} w-[10%]`}>{t.thL}</th><th className={`${thStandings} w-[10%]`}>{t.thGD}</th><th className={`${thStandings} w-[10%]`}>{t.hubPoints}</th></tr></thead>
                                <tbody>{teamStats.map((stat, idx) => (<tr key={stat.team.id} className="border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors"><td className="py-1.5 text-center text-[9px] font-bold text-white/30 bg-white/5">{idx + 1}</td><td className="py-1.5 flex justify-center"><SubtleDashboardAvatar team={stat.team} size="xxs" isLight /></td><td className="py-1.5 text-center text-[10px] font-bold text-slate-300">{stat.gamesPlayed}</td><td className="py-1.5 text-center text-[10px] font-bold text-slate-300">{stat.wins}</td><td className="py-1.5 text-center text-[10px] font-bold text-slate-300">{stat.draws}</td><td className="py-1.5 text-center text-[10px] font-bold text-slate-300">{stat.losses}</td><td className="py-1.5 text-center text-[10px] font-bold text-white/40">{stat.goalDifference > 0 ? `+${stat.goalDifference}` : stat.goalDifference}</td><td className="py-1.5 text-center text-[12px] font-bold text-white bg-white/5">{stat.points}</td></tr>))}</tbody>
                            </table></div>
                    </HubCard>
                    <HubCard title={<div className="flex gap-14"><button onClick={() => setActiveRightTab('players')} className={`font-russo text-[10px] uppercase tracking-widest ${activeRightTab === 'players' ? 'text-[#00F2FE]' : 'text-white/20'}`}>{t.hubPlayers}</button><button onClick={() => setActiveRightTab('games')} className={`font-russo text-[10px] uppercase tracking-widest ${activeRightTab === 'games' ? 'text-[#00F2FE]' : 'text-white/20'}`}>{t.hubGames}</button></div>} icon={activeRightTab === 'players' ? <Users /> : <HistoryIcon />} variant="standings" accent="#00F2FE" className="flex-grow min-h-0 h-[450px]" bodyClassName="flex flex-col h-full">
                        <div className="flex-grow overflow-y-auto custom-hub-scrollbar h-full">
                            {activeRightTab === 'players' ? (
                                <table className="w-full table-fixed border-collapse">
                                    <thead><tr><th className={`${thStandings} w-[10%]`}>#</th><th className={`${thStandings} text-left pl-3 w-[45%]`}>{t.players}</th><th className={`${thStandings} w-[15%]`}>{t.thG}</th><th className={`${thStandings} w-[15%]`}>{t.thA}</th><th className={`${thStandings} w-[15%]`}>{t.thTotal}</th></tr></thead>
                                    <tbody>{sortedAllPlayers.map((ps, idx) => (<tr key={ps.player.id} className="border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors group"><td className="py-2 text-center text-[9px] font-bold text-white/30 bg-white/[0.02]">{idx + 1}</td><td className="py-2 text-left pl-3 relative overflow-hidden"><div className="absolute left-0 top-1/2 -translate-y-1/2 w-[0.5px] h-4" style={{ backgroundColor: ps.team.color }} /><span className="text-slate-300 font-bold uppercase truncate text-[11px] block w-full pl-1.5">{ps.player.nickname}</span></td><td className="py-2 text-center text-[10px] font-bold text-white/60">{ps.goals}</td><td className="py-2 text-center text-[10px] font-bold text-white/60">{ps.assists}</td><td className="py-2 text-center text-[12px] font-bold text-white bg-white/[0.03]">{ps.goals + ps.assists}</td></tr>))}</tbody>
                                </table>
                            ) : (
                                <table className="w-full table-fixed border-collapse">
                                    <thead><tr><th className={`${thStandings} w-[15%]`}>#</th><th className={`${thStandings} w-[20%]`}>{t.hubHome}</th><th className={`${thStandings} w-[45%]`}>{t.hubResult}</th><th className={`${thStandings} w-[20%]`}>{t.hubAway}</th></tr></thead>
                                    <tbody>{finishedGames.map((game) => (<tr key={game.id} className="border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors border-b border-white/5 last:border-0"><td className="py-3 text-center text-[9px] font-bold text-white/30">{game.gameNumber}</td><td className="py-3 text-center"><SubtleDashboardAvatar team={session.teams.find((t:any) => t.id === game.team1Id)} size="xxs" isLight /></td><td className="py-3 text-center font-bold text-[12px] text-slate-200">{game.team1Score}:{game.team2Score}</td><td className="py-3 text-center"><SubtleDashboardAvatar team={session.teams.find((t:any) => t.id === game.team2Id)} size="xxs" isLight /></td></tr>))}</tbody>
                                </table>
                            )}
                        </div>
                    </HubCard>
                </div>
            </div>
        </div>
    );
};