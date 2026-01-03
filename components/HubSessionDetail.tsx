
import React, { useMemo, useState } from 'react';
import { Session, WeatherCondition } from '../types';
import { calculateAllStats, PlayerStats } from '../services/statistics';
import { TeamAvatar } from './avatars'; 
import { ChevronLeft, TrophyIcon, Users, History as HistoryIcon, Target, AwardIcon } from '../icons';
import { useTranslation } from '../ui';

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

// --- DASHBOARD UI HELPERS ---

const SubtleDashboardAvatar: React.FC<{ team: any; size?: string; isLight?: boolean }> = ({ team }) => {
    const color = team?.color || '#A9B1BD';
    return (
        <div className="relative flex items-center justify-center shrink-0">
            <div 
                className="w-6 h-6 rounded-full flex items-center justify-center transition-all duration-500 bg-black/40 opacity-90"
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

// --- IMPACT SCORE LOGIC ---
const getImpactScore = (stats: PlayerStats): number => {
    let score = 0;
    const nonCleanSheetWins = stats.wins - (stats.cleanSheetWins || 0);
    score += nonCleanSheetWins * 2.0;
    score += (stats.cleanSheetWins || 0) * 2.5;
    score += stats.draws * 0.5;
    score += stats.goals * 1.0;
    score += stats.assists * 1.0;
    score += stats.ownGoals * -1.0;
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
        if (c.includes('rain')) return <CloudRainIcon className="w-5 h-5 text-slate-200/80" />;
        if (c.includes('cloud')) return <CloudIcon className="w-5 h-5 text-slate-200/80" />;
        return <MoonIcon className="w-5 h-5 text-slate-200/80" />;
    };

    const mapsLink = session.location 
        ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(session.location)}` 
        : null;

    return (
        <div className="flex flex-col h-full overflow-hidden">
            <div className="grid grid-cols-1 gap-2 shrink-0">
                <div className="flex items-center gap-2 bg-white/[0.02] border border-white/5 rounded-xl p-2">
                    <div className="w-8 h-8 rounded-lg bg-[#00F2FE]/10 border border-[#00F2FE]/30 flex items-center justify-center text-[#00F2FE] shrink-0"><MapPinIcon className="w-4 h-4" /></div>
                    <div className="flex flex-col min-w-0">
                        <span className="text-[7px] font-black text-white/30 uppercase tracking-[0.2em]">LOCATION</span>
                        {mapsLink ? (
                            <a 
                                href={mapsLink} 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                className="group/loc flex items-center gap-1 font-chakra font-bold text-xs text-slate-200 uppercase tracking-wide truncate hover:text-[#00F2FE] transition-colors"
                            >
                                <span className="truncate border-b border-white/5 group-hover/loc:border-[#00F2FE]/40">{data.location}</span>
                                <svg className="w-2.5 h-2.5 opacity-30 group-hover/loc:opacity-100 transition-opacity" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3"/></svg>
                            </a>
                        ) : (
                            <span className="font-chakra font-bold text-xs text-slate-200 uppercase tracking-wide truncate">{data.location}</span>
                        )}
                    </div>
                </div>
                
                <div className="flex items-center justify-between gap-2">
                    <div className="flex-grow flex items-center gap-2 bg-white/[0.02] border border-white/5 rounded-xl p-2">
                        <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-white/50 shrink-0"><ClockIcon className="w-4 h-4" /></div>
                        <div className="flex flex-col">
                            <span className="text-[7px] font-black text-white/30 uppercase tracking-[0.2em]">TIME</span>
                            <span className="font-mono font-bold text-xs text-slate-200 tracking-widest">{data.time}</span>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-2 px-3 h-12 bg-indigo-900/20 rounded-xl border border-indigo-500/20 shrink-0">
                        <div className="flex flex-col items-end">
                            <span className="font-russo text-lg text-slate-200 leading-none">{data.temp}</span>
                            <span className="text-[6px] font-bold text-indigo-300 uppercase tracking-wider">{data.condition}</span>
                        </div>
                        {getWeatherIcon(data.condition)}
                    </div>
                </div>
            </div>

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
                                <div key={stat.player.id} className="flex items-center justify-between p-2 rounded-xl bg-white/[0.03] border border-white/5">
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
            <div className="relative py-2.5 px-5 flex items-center shrink-0 bg-transparent border-b border-white/5 z-10 justify-between">
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
    const [expandedMatchId, setExpandedMatchId] = useState<string | null>(null);
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
            <div className="absolute inset-0 z-0 pointer-events-none">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#0a1121] via-[#01040a] to-black"></div>
                <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]"></div>
            </div>
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
                                                <th className={`${thClass} w-[6%]`}>#</th>
                                                <th className={`${thClass} w-[18%] text-left pl-3`}>TEAM</th>
                                                <th className={`${thClass} w-[7%]`}>P</th>
                                                <th className={`${thClass} w-[7%]`}>W</th>
                                                <th className={`${thClass} w-[7%]`}>D</th>
                                                <th className={`${thClass} w-[7%]`}>L</th>
                                                <th className={`${thClass} w-[9%]`}>{t.thGF}</th>
                                                <th className={`${thClass} w-[9%]`}>{t.thGA}</th>
                                                <th className={`${thClass} w-[12%]`}>GD</th>
                                                <th className={`${thClass} w-[18%] text-white`}>PTS</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {teamStats.map((stat, idx) => (
                                                <tr key={stat.team.id} className="group border-b border-white/5 last:border-0 transition-colors">
                                                    <td className={`${tdBase} text-white/30 bg-white/5`}>{idx + 1}</td>
                                                    <td className={`${tdBase} text-left pl-3`}>
                                                        <div className="flex items-center justify-start gap-2">
                                                            <SubtleDashboardAvatar team={stat.team} size="xxs" isLight={true} />
                                                            <span className="text-[9px] font-black tracking-tight text-slate-300 uppercase">
                                                                SQUAD
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td className={`${tdBase} text-slate-300`}>{stat.gamesPlayed}</td>
                                                    <td className={`${tdBase} text-slate-300`}>{stat.wins}</td>
                                                    <td className={`${tdBase} text-slate-300`}>{stat.draws}</td>
                                                    <td className={`${tdBase} text-slate-300`}>{stat.losses}</td>
                                                    <td className={`${tdBase} text-slate-300`}>{stat.goalsFor}</td>
                                                    <td className={`${tdBase} text-slate-300`}>{stat.goalsAgainst}</td>
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
                                <div className="flex items-center gap-4 md:gap-8 px-4 md:px-6">
                                    <button onClick={() => { setActiveTab('players'); setExpandedMatchId(null); }} className={`font-russo text-[8px] md:text-[9px] uppercase tracking-widest transition-all ${activeTab === 'players' ? 'text-[#00F2FE]' : 'text-white/20'}`}>PLAYER STATISTICS</button>
                                    <div className="w-px h-3 bg-white/10"></div>
                                    <button onClick={() => { setActiveTab('matches'); setExpandedMatchId(null); }} className={`font-russo text-[8px] md:text-[9px] uppercase tracking-widest transition-all ${activeTab === 'matches' ? 'text-[#00F2FE]' : 'text-white/20'}`}>MATCH HISTORY</button>
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
                                                    <tr key={ps.player.id} className="group border-b border-white/5 last:border-0">
                                                        <td className={`${tdBase} text-white/30 font-mono`}>{idx + 1}</td>
                                                        <td className="py-2 text-left pl-4 relative overflow-hidden">
                                                            <div 
                                                                className="absolute left-0 top-1/2 -translate-y-1/2 w-[1.5px] h-3 rounded-full"
                                                                style={{ 
                                                                    backgroundColor: ps.team.color,
                                                                    boxShadow: `0 0 8px ${ps.team.color}`
                                                                }}
                                                            />
                                                            <span className="text-slate-300 font-bold uppercase truncate text-[10px] block w-full pl-2 transition-colors">{ps.player.nickname || 'Unknown'}</span>
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
                                                {finishedGames.map((game) => {
                                                    const totalScore = game.team1Score + game.team2Score;
                                                    return (
                                                    <React.Fragment key={game.id}>
                                                        <tr 
                                                            className={`group border-b border-white/5 last:border-0 transition-transform duration-300 will-change-transform ${totalScore > 0 ? 'hover:scale-[1.03] hover:relative hover:z-20 cursor-pointer hover:bg-white/5' : 'cursor-default'} ${expandedMatchId === game.id ? 'bg-white/5' : ''}`}
                                                            onClick={() => totalScore > 0 && setExpandedMatchId(expandedMatchId === game.id ? null : game.id)}
                                                        >
                                                            <td className={`${tdBase} text-white/30 font-mono`}>{game.gameNumber}</td>
                                                            <td className="py-2.5 text-center">
                                                                <div className="flex justify-center"><TeamAvatar team={session.teams.find(t => t.id === game.team1Id) || {}} size="xxs" isLight={true} /></div>
                                                            </td>
                                                            <td className="py-2.5 text-center">
                                                                <span className="font-bold text-[11px] md:text-[12px] text-slate-200 tabular-nums tracking-tighter bg-white/5 px-2 py-1 rounded transition-colors group-hover:text-white group-hover:bg-[#00F2FE]/10">{game.team1Score} : {game.team2Score}</span>
                                                            </td>
                                                            <td className="py-2.5 text-center">
                                                                <div className="flex justify-center"><TeamAvatar team={session.teams.find(t => t.id === game.team2Id) || {}} size="xxs" isLight={true} /></div>
                                                            </td>
                                                        </tr>
                                                        {expandedMatchId === game.id && (
                                                            <tr className="bg-white/[0.03] animate-in slide-in-from-top-2 fade-in duration-300">
                                                                <td colSpan={4} className="p-3">
                                                                    <div className="flex flex-col gap-2">
                                                                        {game.goals.length > 0 ? (
                                                                            game.goals.map((goal, gIdx) => {
                                                                                const scorer = session.playerPool.find(p => p.id === goal.scorerId);
                                                                                const assistant = session.playerPool.find(p => p.id === goal.assistantId);
                                                                                const team = session.teams.find(t => t.id === goal.teamId);
                                                                                return (
                                                                                    <div key={goal.id} className="flex items-center gap-3 px-2 py-1 border-l-2" style={{ borderColor: team?.color || '#fff' }}>
                                                                                        <div className="shrink-0">
                                                                                            {goal.isOwnGoal ? (
                                                                                                <span className="text-[10px] filter drop-shadow-[0_0_5px_rgba(239,68,68,0.5)]">🧤</span>
                                                                                            ) : (
                                                                                                <span className="text-[10px] filter drop-shadow-[0_0_5px_rgba(0,242,254,0.5)]">⚽</span>
                                                                                            )}
                                                                                        </div>
                                                                                        <div className="flex flex-col min-w-0">
                                                                                            <div className="flex flex-wrap items-baseline gap-x-2">
                                                                                                <span className="text-[11px] font-black uppercase text-slate-200 tracking-wide truncate">
                                                                                                    {scorer?.nickname || (goal.isOwnGoal ? 'Own Goal' : 'Unknown')}
                                                                                                </span>
                                                                                                {assistant && (
                                                                                                    <span className="text-[8px] font-bold text-white/30 uppercase italic shrink-0">
                                                                                                        {t.assistant}: {assistant.nickname}
                                                                                                    </span>
                                                                                                )}
                                                                                            </div>
                                                                                        </div>
                                                                                    </div>
                                                                                );
                                                                            })
                                                                        ) : (
                                                                            <div className="text-center py-2">
                                                                                <span className="text-[8px] font-black text-white/20 uppercase tracking-[0.3em]">No goal events recorded</span>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        )}
                                                    </React.Fragment>
                                                );
                                                })}
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
