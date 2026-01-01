
import React, { useMemo, useState } from 'react';
import { Session, WeatherCondition } from '../types';
import { calculateAllStats, PlayerStats } from '../services/statistics';
import { TeamAvatar } from './avatars'; 
import { ChevronLeft, TrophyIcon, Users, History as HistoryIcon, Target, AwardIcon } from '../icons';
import { useTranslation } from './ui';

interface HubSessionDetailProps {
    session: Session;
    onBack: () => void;
}

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

// --- IMPACT SCORE LOGIC (Synced with Dashboard) ---
const getImpactScore = (stats: PlayerStats): number => {
    let score = 0;
    const nonCleanSheetWins = stats.wins - (stats.cleanSheetWins || 0);

    score += nonCleanSheetWins * 2.0;
    score += (stats.cleanSheetWins || 0) * 2.5;
    score += stats.draws * 0.5;
    score += stats.goals * 1.0;
    score += stats.assists * 1.0;
    score -= stats.ownGoals * 1.0;

    return score;
};

const ArchiveEnvironmentWidget: React.FC<{ topPlayers: PlayerStats[], session: Session }> = ({ topPlayers, session }) => {
    const data = {
        location: session.location || "PITCH DATA UNAVAILABLE",
        time: session.timeString || "19:30 - 21:00",
        temp: session.weather ? `${session.weather.temperature}°C` : "26°C",
        condition: session.weather?.condition ? session.weather.condition.toUpperCase() : "CLEAR"
    };

    const getWeatherIcon = (cond: WeatherCondition | string) => {
        const c = cond.toLowerCase();
        if (c.includes('rain')) return <CloudRainIcon className="w-5 h-5 text-white/80" />;
        if (c.includes('cloud')) return <CloudIcon className="w-5 h-5 text-white/80" />;
        return <MoonIcon className="w-5 h-5 text-white/80" />;
    };

    return (
        <div className="flex flex-col h-full overflow-hidden">
            {/* COMPACT TOP INFO SECTION */}
            <div className="grid grid-cols-1 gap-2 shrink-0">
                <div className="flex items-center gap-2 bg-white/[0.02] border border-white/5 rounded-xl p-2">
                    <div className="w-8 h-8 rounded-lg bg-[#00F2FE]/10 border border-[#00F2FE]/30 flex items-center justify-center text-[#00F2FE] shrink-0"><MapPinIcon className="w-4 h-4" /></div>
                    <div className="flex flex-col min-w-0">
                        <span className="text-[7px] font-black text-white/30 uppercase tracking-[0.2em]">LOCATION</span>
                        <span className="font-chakra font-bold text-xs text-white uppercase tracking-wide truncate">{data.location}</span>
                    </div>
                </div>
                
                <div className="flex items-center justify-between gap-2">
                    <div className="flex-grow flex items-center gap-2 bg-white/[0.02] border border-white/5 rounded-xl p-2">
                        <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-white/50 shrink-0"><ClockIcon className="w-4 h-4" /></div>
                        <div className="flex flex-col">
                            <span className="text-[7px] font-black text-white/30 uppercase tracking-[0.2em]">TIME</span>
                            <span className="font-mono font-bold text-xs text-white tracking-widest">{data.time}</span>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-2 px-3 h-12 bg-indigo-900/20 rounded-xl border border-indigo-500/20 shrink-0">
                        <div className="flex flex-col items-end">
                            <span className="font-russo text-lg text-white leading-none">{data.temp}</span>
                            <span className="text-[6px] font-bold text-indigo-300 uppercase tracking-wider">{data.condition}</span>
                        </div>
                        {getWeatherIcon(data.condition)}
                    </div>
                </div>
            </div>

            {/* SYNCED LEADERS SECTION (Using Impact Score) */}
            <div className="mt-3 flex-grow flex flex-col min-h-0">
                <div className="flex items-center gap-2 mb-1.5 opacity-80 shrink-0">
                    <TrophyIcon className="w-2.5 h-2.5 text-[#FFD700]" />
                    <span className="text-[8px] font-black text-white/40 uppercase tracking-[0.2em]">SESSION LEADERS (IMPACT)</span>
                </div>
                
                <div className="flex-grow overflow-y-auto custom-hub-scrollbar pr-0.5">
                    <div className="flex flex-col gap-1">
                        {topPlayers.slice(0, 3).map((stat, idx) => {
                            const impact = getImpactScore(stat);
                            return (
                                <div key={stat.player.id} className="flex items-center justify-between p-2 rounded-xl bg-white/[0.03] border border-white/5 hover:bg-white/[0.05] transition-colors">
                                    <div className="flex items-center gap-2.5">
                                        <div className="w-5 h-5 rounded-lg bg-black/40 flex items-center justify-center border border-white/5 text-[10px]">
                                            {idx === 0 ? '🥇' : idx === 1 ? '🥈' : '🥉'}
                                        </div>
                                        <span className={`font-russo text-[10px] uppercase tracking-wide truncate max-w-[120px] ${idx === 0 ? 'text-[#FFD700]' : idx === 1 ? 'text-slate-300' : 'text-amber-700'}`}>
                                            {stat.player.nickname || 'Unknown'}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-1.5 shrink-0 bg-black/20 px-2 py-1 rounded-lg border border-white/5">
                                        <span className="font-mono font-black text-[11px] text-white leading-none">{impact.toFixed(1)}</span>
                                        <span className="text-[6px] text-[#00F2FE] font-black tracking-widest uppercase">PTS</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
};

const HubCard: React.FC<{ title: React.ReactNode; icon: React.ReactNode; children: React.ReactNode; className?: string; bodyClassName?: string; accent?: string; }> = ({ title, icon, children, className = "", bodyClassName = "", accent = "#fff" }) => {
    return (
        <div className={`relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#161b22] to-[#0a0d14] border border-white/[0.06] shadow-[0_25px_50px_-12px_rgba(0,0,0,0.9),inset_0_1px_1px_rgba(255,255,255,0.05)] group/bento flex flex-col ${className}`}>
            <div className="absolute inset-0 opacity-[0.03] pointer-events-none z-0" style={{ backgroundImage: `linear-gradient(45deg, #fff 25%, transparent 25%, transparent 50%, #fff 50%, #fff 75%, transparent 75%, transparent)`, backgroundSize: '4px 4px' }}></div>
            <div className="absolute -top-10 -left-10 w-40 h-40 bg-[#00F2FE]/[0.03] rounded-full blur-[40px] pointer-events-none z-0 animate-pulse" style={{ animationDuration: '4s' }}></div>
            <div className="relative py-2.5 px-5 flex items-center justify-between shrink-0 bg-transparent border-b border-white/5 z-10">
                 <div className="flex items-center gap-3 relative z-10 w-full">
                    <div className="w-5 h-5 rounded-md flex items-center justify-center shadow-sm border bg-white/10 border-white/20 text-white" style={{ color: accent }}>
                        {React.cloneElement(icon as React.ReactElement<any>, { className: "w-3 h-3" })}
                    </div>
                    <div className="flex-grow">{typeof title === 'string' ? <h3 className="font-russo text-[11px] uppercase tracking-widest text-white">{title}</h3> : title}</div>
                 </div>
            </div>
            <div className={`relative overflow-hidden flex flex-col z-10 flex-grow ${bodyClassName}`}>{children}</div>
        </div>
    );
};

export const HubSessionDetail: React.FC<HubSessionDetailProps> = ({ session, onBack }) => {
    const t = useTranslation();
    const [activeTab, setActiveTab] = useState<'players' | 'matches'>('players');
    const { teamStats, allPlayersStats } = useMemo(() => calculateAllStats(session), [session]);
    
    const sortedByImpact = useMemo(() => {
        return [...allPlayersStats].sort((a, b) => getImpactScore(b) - getImpactScore(a));
    }, [allPlayersStats]);

    const sortedByStats = useMemo(() => [...allPlayersStats].sort((a, b) => (b.goals + b.assists) - (a.goals + a.assists)), [allPlayersStats]);
    
    const finishedGames = session.games.filter(g => g.status === 'finished');
    
    const thClass = "py-2 text-white/40 uppercase tracking-tighter text-[8px] font-black text-center sticky top-0 bg-transparent backdrop-blur-sm z-10 border-b border-white/5";
    const tdBase = "py-1.5 text-center text-[10px] font-bold transition-colors";

    return (
        <div className="absolute inset-0 z-30 flex flex-col animate-in slide-in-from-right duration-500 overflow-hidden rounded-[2.5rem]">
            <div className="pt-5 pb-3 px-8 flex items-center justify-between shrink-0 z-10">
                <button onClick={onBack} className="flex items-center gap-3 group transition-all ml-4 md:ml-40 hover:scale-110 active:scale-95">
                    <div className="p-2.5 rounded-full bg-white/5 border border-white/10 shadow-lg group-hover:border-[#00F2FE] group-hover:text-[#00F2FE] group-hover:bg-[#00F2FE]/10 transition-all">
                        <ChevronLeft className="w-4 h-4 text-white group-hover:text-[#00F2FE]" />
                    </div>
                </button>
            </div>
            <div className="flex-grow px-2 md:px-6 pb-4 overflow-hidden relative z-10 flex flex-col">
                <div className="max-w-6xl mx-auto w-full h-full flex flex-col gap-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch w-full h-full min-h-0">
                        <div className="flex flex-col gap-4 w-full h-full min-h-0">
                            <HubCard title="TEAM STANDINGS" icon={<TrophyIcon />} accent="#FFD700" className="shrink-0 max-h-[45%] flex flex-col">
                                <div className="p-1 overflow-y-auto custom-hub-scrollbar">
                                    <table className="w-full table-fixed border-collapse">
                                        <thead>
                                            <tr>
                                                <th className={`${thClass} w-[12%]`}>#</th>
                                                <th className={`${thClass} w-[28%] text-left pl-3`}>TEAM</th>
                                                <th className={`${thClass} w-[10%]`}>P</th>
                                                <th className={`${thClass} w-[10%]`}>W</th>
                                                <th className={`${thClass} w-[10%]`}>D</th>
                                                <th className={`${thClass} w-[10%]`}>L</th>
                                                <th className={`${thClass} w-[10%]`}>GD</th>
                                                <th className={`${thClass} w-[10%] text-white`}>PTS</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {teamStats.map((stat, idx) => (
                                                <tr key={stat.team.id} className="group border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors">
                                                    <td className={`${tdBase} text-white/30 bg-white/5`}>{idx + 1}</td>
                                                    <td className={`${tdBase} text-left pl-3`}>
                                                        <div className="flex items-center justify-start gap-2">
                                                            <TeamAvatar team={stat.team} size="xxs" isLight={true} />
                                                            <span className="text-[9px] font-black tracking-tight text-slate-300 uppercase group-hover:text-white transition-colors">
                                                                SQUAD
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td className={`${tdBase} text-slate-300`}>{stat.gamesPlayed}</td>
                                                    <td className={`${tdBase} text-slate-300`}>{stat.wins}</td>
                                                    <td className={`${tdBase} text-slate-300`}>{stat.draws}</td>
                                                    <td className={`${tdBase} text-slate-300`}>{stat.losses}</td>
                                                    <td className={`${tdBase} text-white/40`}>{stat.goalDifference > 0 ? `+${stat.goalDifference}` : stat.goalDifference}</td>
                                                    <td className={`${tdBase} text-white bg-white/5 font-black text-[11px]`}>{stat.points}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </HubCard>
                            <HubCard title="MATCH REPORT" icon={<Target />} accent="#00F2FE" className="w-full flex-grow min-h-0" bodyClassName="p-4">
                                <ArchiveEnvironmentWidget topPlayers={sortedByImpact} session={session} />
                            </HubCard>
                        </div>
                        <div className="w-full h-full min-h-0">
                            <HubCard title={
                                <div className="flex items-center gap-4 md:gap-6">
                                    <button onClick={() => setActiveTab('players')} className={`font-russo text-[8px] md:text-[9px] uppercase tracking-widest transition-all ${activeTab === 'players' ? 'text-[#00F2FE]' : 'text-white/20'}`}>PLAYER STATISTICS</button>
                                    <div className="w-px h-3 bg-white/10"></div>
                                    <button onClick={() => setActiveTab('matches')} className={`font-russo text-[8px] md:text-[9px] uppercase tracking-widest transition-all ${activeTab === 'matches' ? 'text-[#00F2FE]' : 'text-white/20'}`}>MATCH HISTORY</button>
                                </div>
                            } icon={activeTab === 'players' ? <Users /> : <HistoryIcon />} accent="#00F2FE" className="h-full flex flex-col" bodyClassName="flex flex-col h-full min-h-0">
                                <div className="flex-grow overflow-y-auto custom-hub-scrollbar p-1">
                                    {activeTab === 'players' ? (
                                        <table className="w-full table-fixed border-collapse">
                                            <thead>
                                                <tr>
                                                    <th className={`${thClass} w-[10%]`}>#</th>
                                                    <th className={`${thClass} w-[50%] text-left pl-4`}>PLAYER</th>
                                                    <th className={`${thClass} w-[12%]`}>G</th>
                                                    <th className={`${thClass} w-[12%]`}>A</th>
                                                    <th className={`${thClass} w-[16%] text-white`}>TOT</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {sortedByStats.map((ps, idx) => (
                                                    <tr key={ps.player.id} className="group hover:bg-white/5 transition-colors border-b border-white/5 last:border-0">
                                                        <td className={`${tdBase} text-white/30 font-mono`}>{idx + 1}</td>
                                                        <td className="py-2 text-left pl-4 relative overflow-hidden group-hover:bg-white/5">
                                                            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[2px] h-3 rounded-r-full" style={{ backgroundColor: ps.team.color }} />
                                                            <span className="text-slate-300 font-bold uppercase truncate text-[10px] block w-full pl-2 group-hover:text-white transition-colors">{ps.player.nickname || 'Unknown'}</span>
                                                        </td>
                                                        <td className={`${tdBase} text-white/70 font-mono`}>{ps.goals}</td>
                                                        <td className={`${tdBase} text-white/70 font-mono`}>{ps.assists}</td>
                                                        <td className={`${tdBase} text-white font-black text-[11px]`}>{ps.goals + ps.assists}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    ) : (
                                        <table className="w-full table-fixed border-collapse">
                                            <thead>
                                                <tr>
                                                    <th className={`${thClass} w-[15%]`}>#</th>
                                                    <th className={`${thClass} w-[25%] text-center`}>HOME</th>
                                                    <th className={`${thClass} w-[35%] text-center`}>RESULT</th>
                                                    <th className={`${thClass} w-[25%] text-center`}>AWAY</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {finishedGames.map((game) => (
                                                    <tr key={game.id} className="group hover:bg-white/5 transition-colors border-b border-white/5 last:border-0">
                                                        <td className={`${tdBase} text-white/30 font-mono`}>{game.gameNumber}</td>
                                                        <td className="py-2.5 text-center">
                                                            <div className="flex justify-center"><TeamAvatar team={session.teams.find(t => t.id === game.team1Id) || {}} size="xxs" isLight={true} /></div>
                                                        </td>
                                                        <td className="py-2.5 text-center">
                                                            <span className="font-bold text-[11px] md:text-[12px] text-slate-200 tabular-nums tracking-tighter bg-white/5 px-2 py-1 rounded">{game.team1Score} : {game.team2Score}</span>
                                                        </td>
                                                        <td className="py-2.5 text-center">
                                                            <div className="flex justify-center"><TeamAvatar team={session.teams.find(t => t.id === game.team2Id) || {}} size="xxs" isLight={true} /></div>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    )}
                                </div>
                            </HubCard>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
