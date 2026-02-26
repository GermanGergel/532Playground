import React, { useMemo, useState } from 'react';
import { useApp } from '../context';
import { calculateAllStats, PlayerStats } from '../services/statistics';
import { NewsItem, Player, Team, WeatherCondition, ClubNewsItem } from '../types';
import { TrophyIcon, Zap, History as HistoryIcon, Users, AwardIcon, Target, YouTubeIcon } from '../icons';
import { useTranslation } from '../ui';
import { convertCountryCodeAlpha3ToAlpha2 } from '../utils/countries';
import { TeamAvatar } from './avatars';
import { NewsCarousel } from './NewsCarousel';

// --- LOCAL ICONS FOR WIDGET ---
const MapPinIcon = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
);
const ClockIcon = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
);
const CloudRainIcon = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242"/><path d="M16 14v6"/><path d="M8 14v6"/><path d="M12 16v6"/></svg>
);
const CloudIcon = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M17.5 19c0-1.7-1.3-3-3-3h-1.1c-.2-3.4-3.1-6-6.5-6-3.8 0-6.8 3.1-6.8 7s3 7 6.8 7h8a4 4 0 0 0 2.6-7.3Z"/></svg>
);
const MoonIcon = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>
);
const TermometerIcon = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M14 4v10.54a4 4 0 1 1-4 0V4a2 2 0 0 1 4 0Z"/></svg>
);

// --- TACTICAL SOCCER BACKGROUND (CHALK STYLE) ---
const SoccerTacticsBackground: React.FC = () => (
    <div className="absolute inset-0 z-0 pointer-events-none opacity-[0.25]">
        <svg width="100%" height="100%" viewBox="0 0 800 450" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
                <marker id="arrowhead-chalk" markerWidth="10" markerHeight="7" refX="0" refY="3.5" orient="auto">
                    <polygon points="0 0, 10 3.5, 0 7" fill="rgba(255,255,255,0.8)" />
                </marker>
                <filter id="chalkEffect">
                    <feGaussianBlur in="SourceGraphic" stdDeviation="0.6" />
                </filter>
            </defs>
            
            <g stroke="white" strokeWidth="2" fill="none" filter="url(#chalkEffect)" strokeOpacity="0.5">
                <line x1="400" y1="0" x2="400" y2="450" />
                <circle cx="400" cy="225" r="55" />
                <circle cx="400" cy="225" r="2.5" fill="white" fillOpacity="0.5" />
                <rect x="0" y="145" width="70" height="160" />
                <rect x="0" y="195" width="25" height="60" />
                <path d="M 70 185 Q 95 225 70 265" />
                <rect x="730" y="145" width="70" height="160" />
                <rect x="775" y="195" width="25" height="60" />
                <path d="M 730 185 Q 705 225 730 265" />
            </g>

            <g fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" filter="url(#chalkEffect)" strokeOpacity="0.6">
                <circle cx="230" cy="80" r="10" />
                <path d="M 245 85 Q 310 95 340 120" markerEnd="url(#arrowhead-chalk)" />
                <g transform="translate(355, 125) rotate(45)">
                    <line x1="-8" y1="0" x2="8" y2="0" /><line x1="0" y1="-8" x2="0" y2="8" />
                </g>
                <g transform="translate(80, 225) rotate(45)">
                    <line x1="-8" y1="0" x2="8" y2="0" /><line x1="0" y1="-8" x2="0" y2="8" />
                </g>
                <path d="M 100 240 Q 150 280 230 330" strokeDasharray="6 6" markerEnd="url(#arrowhead-chalk)" />
                <g transform="translate(245, 340) rotate(45)">
                    <line x1="-8" y1="0" x2="8" y2="0" /><line x1="0" y1="-8" x2="0" y2="8" />
                </g>
                <g transform="translate(560, 90) rotate(45)">
                    <line x1="-8" y1="0" x2="8" y2="0" /><line x1="0" y1="-8" x2="0" y2="8" />
                </g>
                <path d="M 575 100 Q 640 110 700 90" strokeDasharray="6 6" markerEnd="url(#arrowhead-chalk)" />
                <g transform="translate(715, 80) rotate(45)">
                    <line x1="-8" y1="0" x2="8" y2="0" /><line x1="0" y1="-8" x2="0" y2="8" />
                </g>
                <circle cx="580" cy="380" r="10" />
                <path d="M 600 375 Q 650 350 710 360" markerEnd="url(#arrowhead-chalk)" />
                <circle cx="730" cy="365" r="10" />
                <g transform="translate(420, 190) rotate(45)">
                    <line x1="-10" y1="0" x2="10" y2="0" /><line x1="0" y1="-10" x2="0" y2="10" />
                </g>
            </g>
        </svg>
    </div>
);

// --- STANDBY SCREEN ---
const StandbyScreen: React.FC = () => {
    const t = useTranslation();
    return (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black overflow-hidden rounded-[2.5rem]">
            <div className="absolute w-[600px] h-[600px] border border-[#00F2FE]/20 rounded-full animate-ping-slow"></div>
            <div className="absolute w-[400px] h-[400px] border border-[#00F2FE]/10 rounded-full animate-ping-slower"></div>
            <div className="relative z-10 flex flex-col items-center gap-6">
                <div className="text-center space-y-4">
                    <h2 className="font-orbitron text-3xl md:text-5xl font-black text-white tracking-[0.3em] uppercase opacity-90">STANDBY</h2>
                    <div className="flex items-center justify-center gap-3">
                        <div className="h-px w-8 bg-[#00F2FE]/40"></div>
                        <span className="font-chakra text-sm font-bold text-[#00F2FE] tracking-[0.5em] animate-pulse">SEARCHING FOR BROADCAST</span>
                        <div className="h-px w-8 bg-[#00F2FE]/40"></div>
                    </div>
                </div>
                <p className="max-w-xs text-center text-[10px] font-mono text-white/30 uppercase tracking-[0.2em] mt-8">
                    {t.hubAwaitingStats}<br/>SYSTEM IDLE. AWAITING UPLINK SIGNAL...
                </p>
            </div>
        </div>
    );
};

// --- DASHBOARD UI HELPERS ---

const SubtleDashboardAvatar: React.FC<{ team: any; size?: string; isLight?: boolean; customEmblem?: string }> = ({ team, customEmblem }) => {
    const color = team?.color || '#A9B1BD';
    const logo = customEmblem || team?.logo;
    return (
        <div className="relative flex items-center justify-center shrink-0">
            <div className="w-[36px] h-[36px] rounded-full flex items-center justify-center overflow-hidden">
                {logo ? (
                    <img src={logo} className="w-full h-full object-cover" alt="" />
                ) : (
                    <svg className="w-[70%] h-[70%]" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
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
        bgStyleClass = 'bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-[#050608] via-[#010101] to-black border-white/5';
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
        <div className={`relative overflow-hidden rounded-[1.5rem] flex flex-col border ${bgStyleClass} ${className}`}>
            <div className="absolute inset-0 opacity-[0.03] pointer-events-none z-0" style={{ backgroundImage: `linear-gradient(45deg, #fff 25%, transparent 25%, transparent 50%, #fff 50%, #fff 75%, transparent 75%, transparent)`, backgroundSize: '4px 4px' }}></div>
            {isElite && <SoccerTacticsBackground />}
            <div className={`absolute -top-10 -left-10 w-40 h-40 ${isElite ? 'bg-[#00F2FE]/[0.05]' : 'bg-[#00F2FE]/[0.03]'} rounded-full blur-[45px] pointer-events-none z-0 animate-pulse`} style={{ animationDuration: '6s' }}></div>
            <div className={`relative z-10 py-1.5 px-4 flex items-center shrink-0 ${headerStyleClass} ${isRight ? 'flex-row-reverse justify-start' : 'justify-between'}`}>
                 <div className={`flex items-center gap-2 relative z-10 ${isRight ? 'flex-row-reverse' : ''}`}>
                    <div className={`w-4 h-4 rounded-md flex items-center justify-center shadow-sm border ${iconBg} shrink-0`} style={{ color: accent }}>
                        {React.cloneElement(icon as React.ReactElement<any>, { className: "w-2.5 h-2.5" })}
                    </div>
                    <div>
                        {typeof title === 'string' ? <h3 className={`font-russo text-[10px] uppercase tracking-widest ${titleColor}`}>{title}</h3> : title}
                    </div>
                 </div>
                 {headerExtra && <div className="relative z-10">{headerExtra}</div>}
            </div>
            <div className={`flex-grow relative overflow-hidden flex flex-col z-10 ${bodyClassName || 'p-0'}`}>
                {children}
            </div>
        </div>
    );
};

const TacticalRosters: React.FC<{ teams: Team[], players: Player[], session: any, teamStats: any[], t: any }> = ({ teams, players, session, teamStats, t }) => (
    <div className="flex h-full w-full overflow-x-auto custom-hub-scrollbar bg-black/20">
        {teams.map((team) => {
            const teamPlayers = team.playerIds.map(pid => players.find(p => p.id === pid)).filter(Boolean) as Player[];
            const avgOvr = teamPlayers.length > 0 ? Math.round(teamPlayers.reduce((sum, p) => sum + p.rating, 0) / teamPlayers.length) : 0;
            const stats = teamStats.find(ts => ts.team.id === team.id);
            const gf = stats?.goalsFor || 0;
            const ga = stats?.goalsAgainst || 0;
            let assistedGoals = 0;
            session.games.filter((g: any) => g.status === 'finished').forEach((g: any) => {
                assistedGoals += g.goals.filter((goal: any) => goal.teamId === team.id && goal.assistantId).length;
            });
            const synergy = gf > 0 ? Math.round((assistedGoals / gf) * 100) : 0;
            const synergyColor = synergy >= 60 ? 'text-[#4CFF5F]' : synergy <= 30 ? 'text-orange-400' : 'text-[#00F2FE]';
            return (
                <div key={team.id} className="flex-1 flex flex-col min-w-[33.33%] border-r border-white/10 last:border-r-0">
                    <div className="h-10 border-b border-white/5 flex items-end justify-center pb-2 relative overflow-hidden" style={{ background: `linear-gradient(to bottom, ${team.color}25, transparent)` }}>
                         <div className="flex items-center gap-1 bg-black/40 px-2 py-0.5 rounded text-[8px] font-black tracking-widest border border-white/10 text-white/60">
                            <span>OVR</span> <span className="text-white">{avgOvr}</span>
                         </div>
                    </div>
                    <div className="flex-grow flex flex-col p-1 gap-1 overflow-hidden">
                        {team.playerIds.map((pid, idx) => {
                            const p = players.find(player => player.id === pid);
                            return (
                                <div key={pid} className="flex-1 flex items-center bg-white/[0.02] rounded-lg px-3 border border-transparent transition-all min-h-[24px]">
                                    <span className="font-mono text-[8px] text-white/20 w-4 shrink-0">{(idx + 1)}</span>
                                    <span className="text-[10px] font-black text-slate-400 uppercase truncate flex-grow">{p?.nickname || 'UNKNOWN'}</span>
                                </div>
                            );
                        })}
                    </div>
                    <div className="py-2 border-t border-white/5 bg-black/40 flex items-center divide-x divide-white/10">
                        <div className="flex-1 flex flex-col items-center justify-center">
                            <span className="text-[12px] font-black text-slate-200 leading-none">{gf}</span>
                            <span className="text-[5px] text-white/30 uppercase font-bold tracking-widest mt-0.5">{t.thGF}</span>
                        </div>
                        <div className="flex-1 flex flex-col items-center justify-center">
                            <span className="text-[12px] font-black text-slate-200 leading-none">{ga}</span>
                            <span className="text-[5px] text-white/30 uppercase font-bold tracking-widest mt-0.5">{t.thGA}</span>
                        </div>
                        <div className="flex-1 flex flex-col items-center justify-center">
                            <span className={`text-[12px] font-black leading-none ${synergyColor}`}>{synergy}%</span>
                            <span className="text-[5px] text-white/30 uppercase font-bold tracking-widest mt-0.5">SYN</span>
                        </div>
                    </div>
                </div>
            );
        })}
    </div>
);

interface TopPlayerStats { player: Player; score: number; rank: 1 | 2 | 3; }

// --- MEMOIZED SESSION PODIUM ---
const SessionPodium = React.memo(({ players, t }: { players: TopPlayerStats[], t: any }) => {
    const p1 = players.find(p => p.rank === 1);
    const p2 = players.find(p => p.rank === 2);
    const p3 = players.find(p => p.rank === 3);
    
    const PodiumSpot = ({ p, rank, height, color, delay }: { p?: TopPlayerStats, rank: number, height: string, color: string, delay: string }) => (
        <div className={`flex flex-col items-center justify-end h-full ${delay} animate-in fade-in slide-in-from-bottom-8 duration-1000 fill-mode-both relative`}>
            {p ? (
                <div className="mb-3 relative z-20 flex flex-col items-center w-full px-1">
                     <div className={`relative rounded-lg overflow-hidden border border-white/20 shadow-lg flex flex-col shrink-0 ${rank === 1 ? 'w-[110px] h-[155px] md:w-[135px] md:h-[185px] z-20' : 'w-[115px] h-[130px] md:w-[115px] md:h-[155px] z-10'}`}>
                        {p.player.playerCard ? (
                            <div 
                                className="absolute inset-0 bg-cover bg-no-repeat"
                                style={{ 
                                    backgroundImage: `url(${p.player.playerCard})`, 
                                    backgroundPosition: 'center 5%'
                                }}
                            />
                        ) : (
                            <div className="absolute inset-0 bg-gradient-to-b from-slate-700 to-slate-900" />
                        )}
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
            ) : (
                <div className="mb-12 opacity-10"><div className="w-12 h-16 rounded border-2 border-dashed border-white/30"></div></div>
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
    return (
        <div className="flex items-end justify-center gap-3 h-full px-4 relative">
            <div className="w-[115px] md:w-[165px] h-full flex flex-col justify-end z-10 shrink-0"><PodiumSpot p={p2} rank={2} height="90px" color="#94a3b8" delay="delay-100" /></div>
            <div className="w-[115px] md:w-[165px] h-full flex flex-col justify-end z-20 pb-4 shrink-0"><PodiumSpot p={p1} rank={1} height="130px" color="#FFD700" delay="delay-0" /></div>
            <div className="w-[115px] md:w-[165px] h-full flex flex-col justify-end z-10 shrink-0"><PodiumSpot p={p3} rank={3} height="75px" color="#CD7F32" delay="delay-200" /></div>
        </div>
    );
});

const NewsVanguardCard: React.FC<{ item: NewsItem }> = ({ item }) => {
    return (
        <div className="mb-3 relative px-1 animate-in fade-in slide-in-from-right-4 duration-500">
            <div className="relative rounded-2xl overflow-hidden p-3.5 border border-indigo-500/20 bg-gradient-to-br from-indigo-900/40 to-black">
                <div className="absolute inset-0 opacity-[0.05] pointer-events-none z-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]"></div>
                <div className="absolute top-3.5 left-0 w-1.5 h-7 rounded-r-full bg-[#818cf8]" style={{ boxShadow: '0 0 10px #818cf8' }}></div>
                <div className="relative z-10 flex flex-col gap-1 pl-3">
                    <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-[7px] font-black tracking-[0.2em] uppercase px-1.5 py-0.5 rounded-sm bg-white/5 text-indigo-300">{item.type.replace('_', ' ')}</span>
                        <div className="flex items-center gap-1.5 ml-2">
                             <span className="text-[7px] font-mono text-white/20">{new Date(item.timestamp).toLocaleDateString([], {day:'2-digit', month:'2-digit'})}</span>
                            <span className="text-[7px] font-mono text-white/40">{new Date(item.timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
                        </div>
                        {item.isHot && <Zap className="w-3 h-3 text-indigo-400 animate-pulse" />}
                    </div>
                    <div className="flex items-baseline gap-2 overflow-hidden">
                        <h4 className="text-[14px] font-black text-slate-100 uppercase shrink-0 tracking-wide">{item.playerName}</h4>
                        <p className="text-[12px] text-indigo-100/60 leading-tight truncate italic font-chakra">{item.message.replace(item.playerName, '').trim() || item.subMessage}</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

const getImpactScore = (stats: PlayerStats): number => {
    let score = 0;
    const nonCleanSheetWins = stats.wins - (stats.cleanSheetWins || 0);
    score += nonCleanSheetWins * 1.0;
    score += (stats.cleanSheetWins || 0) * 1.5;
    score += stats.draws * 0.5;
    score += stats.goals * 1.0;
    score += stats.assists * 1.0;
    score -= stats.ownGoals * 1.0;
    return score;
};

const MatchEnvironmentWidget: React.FC<{ session: any, t: any }> = ({ session, t }) => {
    const getWeatherIcon = (cond: WeatherCondition | string = 'clear') => {
        const c = cond.toLowerCase();
        if (c.includes('rain') || c.includes('storm')) return <CloudRainIcon className="w-16 h-16 text-slate-200/90" />;
        if (c.includes('cloud') || c.includes('fog')) return <CloudIcon className="w-16 h-16 text-slate-200/90" />;
        return <MoonIcon className="w-16 h-16 text-slate-200/90" />;
    };
    const mapsLink = session.location ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(session.location)}` : null;
    const videoLink = session.videoUrl;

    return (
        <div className="flex flex-col h-full justify-between py-1">
            <div className="flex items-start gap-3 border-b border-white/5 pb-2 mb-1">
                <div className="w-9 h-9 rounded-xl bg-[#00F2FE]/10 border border-[#00F2FE]/30 flex items-center justify-center text-[#00F2FE] shrink-0">
                    <MapPinIcon className="w-4 h-4" />
                </div>
                <div className="flex flex-col pt-0.5 min-w-0">
                    <span className="text-[8px] font-black text-white/30 uppercase tracking-[0.2em] mb-0.5">{t.hubLocation}</span>
                    {mapsLink ? (
                        <a href={mapsLink} target="_blank" rel="noopener noreferrer" className="group/loc flex items-center gap-1 font-chakra font-bold text-sm text-slate-200 uppercase tracking-wide truncate max-w-[180px] md:max-w-[220px] hover:text-[#00F2FE] transition-colors">
                            <span className="truncate border-b border-white/10 group-hover/loc:border-[#00F2FE]/50">{session.location}</span>
                            <svg className="w-3 h-3 opacity-30 group-hover/loc:opacity-100 transition-opacity" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3"/></svg>
                        </a>
                    ) : ( <span className="font-chakra font-bold text-sm text-slate-200 uppercase tracking-wide truncate max-w-[180px] md:max-w-[220px]">PITCH DATA UNAVAILABLE</span> )}
                </div>
            </div>

            <div className="flex items-center gap-3 border-b border-white/5 py-2 mb-1">
                <div className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white/50 shrink-0">
                    <ClockIcon className="w-4 h-4" />
                </div>
                <div className="flex flex-col">
                    <span className="text-[8px] font-black text-white/30 uppercase tracking-[0.2em] mb-0.5">{t.hubTimeFrame}</span>
                    <span className="font-mono font-bold text-lg text-slate-200 tracking-widest">{session.timeString || "19:30 - 21:00"}</span>
                </div>
            </div>

            <div 
                className={`flex items-center gap-3 border-b border-white/5 py-2 mb-1 rounded-lg px-2 -mx-2 transition-colors ${videoLink ? 'group cursor-pointer hover:bg-white/5' : 'opacity-50 cursor-default'}`}
                onClick={() => videoLink ? window.open(videoLink, '_blank') : null}
            >
                <div className="w-9 h-9 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500 shrink-0 shadow-[0_0_12px_rgba(239,68,68,0.25)]">
                    <YouTubeIcon className="w-4 h-4 fill-current" />
                </div>
                <div className="flex flex-col">
                    <span className="text-[8px] font-black text-white/30 uppercase tracking-[0.2em] mb-0.5">MEDIA</span>
                    <span className={`font-chakra font-bold text-sm tracking-wide transition-colors ${videoLink ? 'text-slate-200 group-hover:text-[#00F2FE]' : 'text-white/20'}`}>
                        {videoLink ? 'WATCH VIDEO' : 'NO FOOTAGE'}
                    </span>
                </div>
            </div>

            <div className="flex-grow flex flex-col justify-end pt-2">
                <div className="relative rounded-2xl bg-gradient-to-br from-indigo-900/40 to-black border border-indigo-500/20 p-4 flex items-center justify-between overflow-hidden">
                    <div className="absolute inset-0 opacity-[0.05] pointer-events-none z-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]"></div>
                    <div className="relative z-10 flex flex-col">
                        <span className="text-[9px] font-black text-indigo-300 uppercase tracking-[0.2em] mb-1">{t.hubWeather}</span>
                        <div className="flex items-baseline gap-1"><span className="font-russo text-4xl text-slate-200 leading-none">{session.weather?.temperature || 26}°C</span><TermometerIcon className="w-4 h-4 text-white/40" /></div>
                        <span className="font-chakra text-xs text-indigo-200 font-bold uppercase tracking-wider mt-1">{session.weather?.condition || "CLEAR"}</span>
                    </div>
                    <div className="relative z-10">{getWeatherIcon(session.weather?.condition)}</div>
                </div>
            </div>
        </div>
    );
};

// --- MAIN DASHBOARD EXPORT ---

export const PublicHubDashboard: React.FC<{ customTeamEmblems?: Record<string, string>; clubNews?: ClubNewsItem[] }> = ({ customTeamEmblems = {}, clubNews = [] }) => {
    const { history, newsFeed, allPlayers } = useApp();
    const t = useTranslation();
    const [activeRightTab, setActiveRightTab] = useState<'players' | 'games'>('players');
    const [expandedMatchId, setExpandedMatchId] = useState<string | null>(null);
    const session = history[0];

    const handleTabChange = (tab: 'players' | 'games') => {
        setActiveRightTab(tab);
        setExpandedMatchId(null);
    };

    const { teamStats, allPlayersStats: rawPlayersStats } = useMemo(() => {
        if (!session) return { teamStats: [], allPlayersStats: [] };
        return calculateAllStats(session);
    }, [session]);

    const allPlayersStats = useMemo(() => {
        return rawPlayersStats.map(stat => {
            const latestPlayer = allPlayers.find(p => p.id === stat.player.id);
            return { ...stat, player: latestPlayer || stat.player };
        });
    }, [rawPlayersStats, allPlayers]);

    const sortedForPodium = useMemo(() => [...allPlayersStats].sort((a, b) => getImpactScore(b) - getImpactScore(a)), [allPlayersStats]);
    const sortedForTable = useMemo(() => [...allPlayersStats].sort((a, b) => (b.goals + b.assists) - (a.goals + a.assists)), [allPlayersStats]);
    
    const top3PodiumPlayers: TopPlayerStats[] = useMemo(() => sortedForPodium
        .filter(p => p.gamesPlayed > 0)
        .slice(0, 3)
        .map((p, i) => ({ player: p.player, score: getImpactScore(p), rank: (i + 1) as 1 | 2 | 3 })), [sortedForPodium]);

    if (!session) return <StandbyScreen />;

    const finishedGames = [...session.games].filter(g => g.status === 'finished').sort((a, b) => a.gameNumber - b.gameNumber);
    
    const thStandings = "py-2 text-white/40 uppercase tracking-tighter text-[8px] font-black text-center sticky top-0 bg-[#01040a] z-20 border-b border-white/5";
    const tdBase = "py-1.5 text-center text-[10px] font-bold transition-colors";

    return (
        <div className="h-full flex flex-col animate-in fade-in duration-700 w-full relative p-2 md:p-3 overflow-hidden">
            <div className="flex-grow grid grid-cols-12 gap-4 min-h-0 items-stretch relative z-10 overflow-hidden">
                <div className="col-span-12 md:col-span-9 flex flex-col gap-4 h-full min-h-[600px] overflow-hidden">
                    <div className="flex-[4] min-h-0 shrink-0 animate-in fade-in slide-in-from-bottom-4 duration-1000 delay-200 flex gap-3">
                         <NewsCarousel news={clubNews} className="flex-[2] h-full min-h-[350px]">
                            <HubCard title={t.hubSessionLeaders} align="right" icon={<AwardIcon />} accent="#FFD700" variant="elite" className="w-full h-full" bodyClassName="flex flex-col bg-transparent">
                                <div className="flex-grow relative z-10"><SessionPodium players={top3PodiumPlayers} t={t} /></div>
                            </HubCard>
                         </NewsCarousel>
                        <HubCard title={t.hubMatchReport} icon={<Target />} accent="#00F2FE" variant="standings" className="flex-1 h-full min-h-[350px]" bodyClassName="flex flex-col p-5"><MatchEnvironmentWidget session={session} t={t} /></HubCard>
                    </div>
                    <div className="flex-[3] min-h-0 shrink-0 grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <HubCard title={t.hubSessionNews} icon={<Zap />} accent="#00F2FE" variant="standings" className="h-full min-h-0" bodyClassName="p-0 flex flex-col relative">
                            <div className="absolute bottom-0 left-0 right-0 h-3 bg-gradient-to-t from-[#01040a] to-transparent z-20 pointer-events-none"></div>
                            <div className="flex-grow relative overflow-y-auto custom-hub-scrollbar p-3 bg-black/10">
                                <div className="py-2">
                                    {newsFeed.slice(0, 15).map(item => <NewsVanguardCard key={item.id} item={item} />)}
                                    {newsFeed.length === 0 && <p className="text-center py-10 opacity-20 text-[10px] tracking-widest uppercase">No Intel Updates</p>}
                                </div>
                            </div>
                        </HubCard>
                        <HubCard title={t.hubSessionSquads} icon={<Target />} variant="standings" className="h-full min-h-0" bodyClassName="flex flex-col">
                            <TacticalRosters teams={session.teams} players={session.playerPool} session={session} teamStats={teamStats} t={t} />
                        </HubCard>
                    </div>
                </div>
                <div className="col-span-12 md:col-span-3 flex flex-col gap-4 h-full min-h-[600px] overflow-hidden">
                    <HubCard title={t.teamStandings} icon={<TrophyIcon />} variant="standings" className="shrink-0" bodyClassName="flex flex-col">
                        <div className={`p-1 h-[140px] overscroll-contain touch-pan-y ${teamStats.length > 3 ? 'overflow-y-auto custom-hub-scrollbar' : 'overflow-hidden'}`}>
                            <table className="w-full table-fixed border-collapse">
                                <thead>
                                    <tr className="bg-white/5 border-b border-white/10">
                                        <th className={`${thStandings} w-[5%]`}>#</th>
                                        <th className={`${thStandings} w-[30%]`}>{t.team}</th>
                                        <th className={`${thStandings} w-[7%]`}>{t.thP}</th>
                                        <th className={`${thStandings} w-[7%]`}>{t.thW}</th>
                                        <th className={`${thStandings} w-[7%]`}>{t.thD}</th>
                                        <th className={`${thStandings} w-[7%]`}>{t.thL}</th>
                                        <th className={`${thStandings} w-[9%]`}>{t.thGF}</th>
                                        <th className={`${thStandings} w-[9%]`}>{t.thGA}</th>
                                        <th className={`${thStandings} w-[9%]`}>{t.thGD}</th>
                                        <th className={`${thStandings} w-[10%] text-white bg-white/[0.03]`}>PTS</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {teamStats.map((stat, idx) => (
                                        <tr key={stat.team.id} className="group border-b border-white/5 last:border-0 transition-all duration-300">
                                            <td className="py-1.5 text-center text-[9px] font-bold text-white/30 bg-white/[0.02] relative overflow-hidden">{idx + 1}</td>
                                            <td className="py-0 flex justify-center"><SubtleDashboardAvatar team={stat.team} size="xxs" isLight customEmblem={customTeamEmblems[stat.team.color || '']} /></td>
                                            <td className="py-1.5 text-center text-[10px] font-bold text-slate-300">{stat.gamesPlayed}</td>
                                            <td className="py-1.5 text-center text-[10px] font-bold text-slate-300">{stat.wins}</td>
                                            <td className="py-1.5 text-center text-[10px] font-bold text-slate-300">{stat.draws}</td>
                                            <td className="py-1.5 text-center text-[10px] font-bold text-slate-300">{stat.losses}</td>
                                            <td className="py-1.5 text-center text-[10px] font-bold text-slate-300">{stat.goalsFor}</td>
                                            <td className="py-1.5 text-center text-[10px] font-bold text-slate-300">{stat.goalsAgainst}</td>
                                            <td className="py-1.5 text-center text-[10px] font-bold text-white/40">{stat.goalDifference > 0 ? `+${stat.goalDifference}` : stat.goalDifference}</td>
                                            <td className="py-1.5 text-center text-[12px] font-black text-white bg-white/[0.03]">{stat.points}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </HubCard>
                    <HubCard 
                        title={ <button onClick={() => handleTabChange('players')} className={`font-russo text-[10px] uppercase tracking-widest transition-all duration-300 ${activeRightTab === 'players' ? 'text-[#00F2FE]' : 'opacity-20 hover:opacity-50'}`}>{t.hubPlayers}</button> } 
                        headerExtra={ <button onClick={() => handleTabChange('games')} className={`font-russo text-[10px] uppercase tracking-widest transition-all duration-300 ${activeRightTab === 'games' ? 'text-[#00F2FE]' : 'opacity-20 hover:opacity-50'}`}>{t.hubGames}</button> }
                        icon={activeRightTab === 'players' ? <Users /> : <HistoryIcon />} 
                        variant="standings" accent="#00F2FE" className="flex-grow min-h-0" bodyClassName="flex flex-col h-full min-h-0 relative"
                    >
                        <div className="absolute bottom-0 left-0 right-0 h-3 bg-gradient-to-t from-[#01040a] to-transparent z-20 pointer-events-none"></div>
                        <div className="flex-grow overflow-y-auto custom-hub-scrollbar h-full">
                            <div className="py-2">
                                {activeRightTab === 'players' ? (
                                    <div className="animate-in fade-in duration-500">
                                        <table className="w-full table-fixed border-collapse">
                                            <thead><tr><th className={`${thStandings} w-[10%]`}>#</th><th className={`${thStandings} text-left pl-3 w-[50%]`}>{t.players}</th><th className={`${thStandings} w-[15%]`}>{t.thG}</th><th className={`${thStandings} w-[15%]`}>{t.thA}</th><th className={`${thStandings} w-[10%] text-white bg-white/[0.03]`}>TOT</th></tr></thead>
                                            <tbody>{sortedForTable.map((ps, idx) => (
                                                <tr key={ps.player.id} className="group border-b border-white/5 last:border-0 transition-all duration-300">
                                                    <td className="py-2 text-center text-[9px] font-bold text-white/30 bg-white/[0.02] relative overflow-hidden">{idx + 1}</td>
                                                    <td className="py-2 text-left pl-3 relative overflow-hidden"><div className="absolute left-0 top-1/2 -translate-y-1/2 w-[1.5px] h-3 rounded-full" style={{ backgroundColor: ps.team.color, boxShadow: `0 0 8px ${ps.team.color}` }} /><span className="text-slate-300 font-bold uppercase truncate text-[11px] block w-full pl-2 transition-colors">{ps.player.nickname || 'Unknown'}</span></td>
                                                    <td className="py-2 text-center text-[10px] font-bold text-white/70 font-mono">{ps.goals}</td>
                                                    <td className="py-2 text-center text-[10px] font-bold text-white/70 font-mono">{ps.assists}</td>
                                                    <td className="py-2 text-center text-[12px] font-black text-white bg-white/[0.03]">{ps.goals + ps.assists}</td>
                                                </tr>))}
                                            </tbody>
                                        </table>
                                    </div>
                                ) : (
                                    <div className="animate-in fade-in duration-500">
                                        <table className="w-full table-fixed border-collapse">
                                            <thead><tr><th className={`${thStandings} w-[15%]`}>#</th><th className={`${thStandings} w-[25%] text-center`}>{t.hubHome}</th><th className={`${thStandings} w-[35%] text-center`}>{t.hubResult}</th><th className={`${thStandings} w-[25%] text-center`}>{t.hubAway}</th></tr></thead>
                                            <tbody>{finishedGames.map((game) => {
                                                const totalScore = game.team1Score + game.team2Score;
                                                return (
                                                <React.Fragment key={game.id}>
                                                    <tr className={`group border-b border-white/5 last:border-0 transition-all duration-300 ${totalScore > 0 ? 'hover:bg-white/[0.04] cursor-pointer' : 'cursor-default'} ${expandedMatchId === game.id ? 'bg-[#00F2FE]/5' : ''}`} onClick={() => (totalScore > 0 && setExpandedMatchId(expandedMatchId === game.id ? null : game.id))} >
                                                        <td className={`${tdBase} text-white/30 font-mono relative overflow-hidden`}>{game.gameNumber}</td>
                                                        <td className="py-0 text-center">
                                                            <div className="flex justify-center">
                                                                <SubtleDashboardAvatar 
                                                                    team={session.teams.find(t => t.id === game.team1Id) || {}} 
                                                                    customEmblem={customTeamEmblems[session.teams.find(t => t.id === game.team1Id)?.color || '']}
                                                                />
                                                            </div>
                                                        </td>
                                                        <td className="py-2.5 text-center"><span className="font-bold text-[11px] md:text-[12px] text-slate-200 tabular-nums tracking-tighter bg-white/5 px-2 py-1 rounded transition-colors group-hover:text-white group-hover:bg-[#00F2FE]/10">{game.team1Score} : {game.team2Score}</span></td>
                                                        <td className="py-0 text-center">
                                                            <div className="flex justify-center">
                                                                <SubtleDashboardAvatar 
                                                                    team={session.teams.find(t => t.id === game.team2Id) || {}} 
                                                                    customEmblem={customTeamEmblems[session.teams.find(t => t.id === game.team2Id)?.color || '']}
                                                                />
                                                            </div>
                                                        </td>
                                                    </tr>
                                                    {expandedMatchId === game.id && (
                                                        <tr className="bg-white/[0.03] animate-in slide-in-from-top-2 fade-in duration-300">
                                                            <td colSpan={4} className="p-3">
                                                                <div className="flex flex-col gap-2">
                                                                    {game.goals.length > 0 ? (
                                                                        game.goals.map((goal) => {
                                                                            const scorer = session.playerPool.find(p => p.id === goal.scorerId);
                                                                            const assistant = session.playerPool.find(p => p.id === goal.assistantId);
                                                                            const team = session.teams.find(t => t.id === goal.teamId);
                                                                            return (
                                                                                <div key={goal.id} className="flex items-center gap-2 px-3 py-1 relative">
                                                                                    <div className="w-[1px] h-2.5 rounded-full shrink-0" style={{ backgroundColor: team?.color || '#fff', boxShadow: `0 0 6px ${team?.color || '#fff'}` }}></div>
                                                                                    <div className="shrink-0 ml-1">{goal.isOwnGoal ? ( <span className="text-[10px]">🧤</span> ) : ( <span className="text-[10px]">⚽</span> )}</div>
                                                                                    <div className="flex flex-col min-w-0"><div className="flex flex-wrap items-baseline gap-x-2"><span className="text-[11px] font-black uppercase text-slate-200 tracking-wide truncate">{scorer?.nickname || (goal.isOwnGoal ? t.ownGoal : 'Unknown')}</span>{assistant && ( <span className="text-[8px] font-bold text-white/20 uppercase italic shrink-0">{t.assistant}: {assistant.nickname}</span> )}</div></div>
                                                                                </div>
                                                                            );
                                                                        })
                                                                    ) : ( <div className="text-center py-2"><span className="text-[8px] font-black text-white/20 uppercase tracking-[0.3em]">No goal events recorded</span></div> )}
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    )}
                                                </React.Fragment>
                                            )})}</tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        </div>
                    </HubCard>
                </div>
            </div>
        </div>
    );
};