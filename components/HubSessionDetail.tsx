
import React, { useMemo, useState } from 'react';
import { Session, WeatherCondition } from '../types';
import { calculateAllStats, PlayerStats } from '../services/statistics';
import { TeamAvatar } from './avatars'; 
import { ChevronLeft, TrophyIcon, Users, History as HistoryIcon, Target, AwardIcon, YouTubeIcon } from '../icons';
import { useTranslation } from '../ui';

interface HubSessionDetailProps {
    session: Session;
    onBack: () => void;
    isEmbedded?: boolean;
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

const ArchiveEnvironmentWidget: React.FC<{ topPlayers: PlayerStats[], session: Session, t: any }> = ({ topPlayers, session, t }) => {
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

    // Logic for Video Link (Consistent with Dashboard)
    const videoKey = `video_link_${session.id}`;
    const videoLink = localStorage.getItem(videoKey);

    return (
        <div className="flex flex-col h-full overflow-hidden">
            <div className="flex flex-col gap-3 shrink-0 mb-4">
                
                {/* ROW 1: LOCATION + YOUTUBE */}
                <div className="flex items-stretch gap-3">
                    <div className="flex-1 min-w-0 flex items-center gap-3 bg-white/[0.02] border border-white/5 rounded-2xl p-3 shadow-sm">
                        <div className="w-10 h-10 rounded-xl bg-[#00F2FE]/10 border border-[#00F2FE]/30 flex items-center justify-center text-[#00F2FE] shrink-0">
                            <MapPinIcon className="w-5 h-5" />
                        </div>
                        <div className="flex flex-col min-w-0">
                            <span className="text-[8px] font-black text-white/30 uppercase tracking-[0.2em] mb-0.5">{t.hubLocation}</span>
                            {mapsLink ? (
                                <a 
                                    href={mapsLink} 
                                    target="_blank" 
                                    rel="noopener noreferrer" 
                                    className="group/loc flex items-center gap-1 font-chakra font-bold text-sm text-slate-200 uppercase tracking-wide truncate hover:text-[#00F2FE] transition-colors"
                                >
                                    <span className="truncate border-b border-white/10 group-hover/loc:border-[#00F2FE]/40">{data.location}</span>
                                    <svg className="w-3 h-3 opacity-30 group-hover/loc:opacity-100 transition-opacity" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3"/></svg>
                                </a>
                            ) : (
                                <span className="font-chakra font-bold text-sm text-slate-200 uppercase tracking-wide truncate">{data.location}</span>
                            )}
                        </div>
                    </div>

                    {/* NEW: YOUTUBE BLOCK (SYMMETRICAL TO WEATHER) */}
                    <div 
                        onClick={() => videoLink && window.open(videoLink, '_blank')}
                        className={`w-28 shrink-0 flex items-center justify-center rounded-2xl border shadow-sm transition-all duration-300
                            ${videoLink 
                                ? 'bg-red-900/20 border-red-500/20 cursor-pointer hover:bg-red-900/40 hover:border-red-500/40 hover:shadow-[0_0_15px_rgba(220,38,38,0.2)] group' 
                                : 'bg-white/5 border-white/5 opacity-20 cursor-default'
                            }`}
                    >
                        <YouTubeIcon 
                            className={`w-6 h-6 transition-transform duration-300 ${videoLink ? 'text-red-500 drop-shadow-[0_0_8px_rgba(220,38,38,0.5)] group-hover:scale-110' : 'text-white'}`} 
                        />
                    </div>
                </div>
                
                {/* ROW 2: TIME + WEATHER */}
                <div className="flex items-stretch gap-3">
                    <div className="flex-1 min-w-0 flex items-center gap-3 bg-white/[0.02] border border-white/5 rounded-2xl p-3 shadow-sm">
                        <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white/50 shrink-0">
                            <ClockIcon className="w-5 h-5" />
                        </div>
                        <div className="flex flex-col justify-center">
                            <span className="text-[8px] font-black text-white/30 uppercase tracking-[0.2em] mb-0.5">{t.hubTimeFrame}</span>
                            <span className="font-mono font-bold text-sm text-slate-200 tracking-widest">{data.time}</span>
                        </div>
                    </div>
                    <div className="w-28 shrink-0 flex items-center justify-between px-3 bg-indigo-900/20 rounded-2xl border border-indigo-500/20 shadow-sm">
                        <div className="flex flex-col items-start justify-center">
                            <span className="font-russo text-xl text-slate-200 leading-none">{data.temp}</span>
                            <span className="text-[8px] font-bold text-indigo-300 uppercase tracking-wider mt-0.5">{data.condition}</span>
                        </div>
                        <div className="scale-110">{getWeatherIcon(data.condition)}</div>
                    </div>
                </div>
            </div>

            <div className="flex-grow flex flex-col min-h-0">
                <div className="flex items-center gap-2 mb-2 opacity-90 shrink-0 pl-1">
                    <TrophyIcon className="w-3.5 h-3.5 text-[#FFD700]" />
                    <span className="text-[9px] font-black text-white/50 uppercase tracking-[0.25em]">{t.hubSessionLeaders} (IMPACT)</span>
                </div>
                
                <div className="flex-grow flex flex-col gap-2 min-h-0">
                    {topPlayers.slice(0, 3).map((stat, idx) => {
                        const impact = getImpactScore(stat);
                        return (
                            <div key={stat.player.id} className="flex-1 flex items-center justify-between px-4 rounded-2xl bg-white/[0.03] border border-white/5 relative overflow-hidden group hover:bg-white/[0.05] transition-colors">
                                <div className={`absolute left-0 top-0 bottom-0 w-1 ${idx === 0 ? 'bg-[#FFD700]' : idx === 1 ? 'bg-slate-300' : 'bg-amber-700'}`}></div>

                                <div className="flex items-center gap-4 pl-2">
                                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center border text-sm shadow-lg
                                        ${idx === 0 ? 'bg-[#FFD700]/10 border-[#FFD700]/30' : 
                                          idx === 1 ? 'bg-slate-300/10 border-slate-300/30' : 
                                          'bg-amber-700/10 border-amber-700/30'}`}>
                                        {idx === 0 ? '🥇' : idx === 1 ? '🥈' : '🥉'}
                                    </div>
                                    <div className="flex flex-col justify-center">
                                        <span className={`font-russo text-xs uppercase tracking-wide truncate max-w-[140px] leading-none ${idx === 0 ? 'text-white' : 'text-slate-300'}`}>
                                            {stat.player.nickname || 'Unknown'}
                                        </span>
                                        {idx === 0 && <span className="text-[8px] font-bold text-[#FFD700] tracking-widest uppercase mt-1">{t.badgeBonusMvp}</span>}
                                    </div>
                                </div>
                                <div className="flex flex-col items-end justify-center bg-black/20 px-3 py-1.5 rounded-xl border border-white/5 min-w-[75px]">
                                    <span className="font-mono font-black text-base text-white leading-none tracking-tight">{impact.toFixed(1)}</span>
                                    <span className="text-[8px] text-[#00F2FE] font-black tracking-widest uppercase mt-0.5">PTS</span>
                                </div>
                            </div>
                        );
                    })}
                    {topPlayers.length === 0 && (
                        <div className="flex-1 flex items-center justify-center text-white/20 text-xs font-bold uppercase tracking-widest border border-white/5 rounded-2xl bg-white/[0.01]">
                            No Stats Available
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

const HubCard: React.FC<{ title: React.ReactNode; icon: React.ReactNode; children: React.ReactNode; className?: string; bodyClassName?: string; accent?: string; }> = ({ title, icon, children, className = "", bodyClassName = "", accent = "#fff" }) => {
    return (
        <div className={`relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0d1117] to-[#010409] border border-white/[0.06] shadow-[0_25px_50px_-12px_rgba(0,0,0,0.9),inset_0_1px_1px_rgba(255,255,255,0.05)] group/bento flex flex-col ${className}`}>
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

export const HubSessionDetail: React.FC<HubSessionDetailProps> = ({ session, onBack, isEmbedded = false }) => {
    const t = useTranslation();
    const [activeTab, setActiveTab] = useState<'players' | 'matches'>('players');
    const [expandedMatchId, setExpandedMatchId] = useState<string | null>(null);
    const { teamStats, allPlayersStats } = useMemo(() => calculateAllStats(session), [session]);
    
    const sortedByImpact = useMemo(() => {
        return [...allPlayersStats].sort((a, b) => getImpactScore(b) - getImpactScore(a));
    }, [allPlayersStats]);

    const sortedByStats = useMemo(() => [...allPlayersStats].sort((a, b) => (b.goals + b.assists) - (a.goals + a.assists)), [allPlayersStats]);
    const finishedGames = session.games.filter(g => g.status === 'finished');
    
    const thClass = "py-2 text-white/40 uppercase tracking-tighter text-[9px] font-black text-center sticky top-0 bg-[#12161b] backdrop-blur-md z-10 border-b border-white/5";
    const tdBase = "py-2 text-center text-[11px] font-bold transition-colors";

    return (
        <div className={`${isEmbedded ? 'relative h-full w-full' : 'absolute inset-0 z-30'} flex flex-col animate-in slide-in-from-right duration-500 overflow-hidden ${!isEmbedded ? 'rounded-[2.5rem]' : ''}`}>
            {!isEmbedded && (
                <div className="absolute inset-0 z-0 pointer-events-none">
                    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#0a1121] via-[#01040a] to-black"></div>
                    <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]"></div>
                </div>
            )}
            
            {!isEmbedded && (
                <div className="pt-5 pb-3 px-8 flex items-center justify-between shrink-0 z-10">
                    <button onClick={onBack} className="flex items-center gap-3 group transition-all ml-4 md:ml-40 hover:scale-110 active:scale-95">
                        <div className="p-2.5 rounded-full bg-white/5 border border-white/10 shadow-lg group-hover:border-[#00F2FE] group-hover:text-[#00F2FE] group-hover:bg-[#00F2FE]/10 transition-all">
                            <ChevronLeft className="w-4 h-4 text-white group-hover:text-[#00F2FE]" />
                        </div>
                    </button>
                </div>
            )}

            <div className={`flex-grow ${isEmbedded ? 'p-4' : 'px-2 md:px-6 pb-4'} overflow-hidden relative z-10 flex flex-col`}>
                <div className="max-w-6xl mx-auto w-full h-full flex flex-col gap-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch w-full h-full min-h-0">
                        <div className="flex flex-col gap-4 w-full h-full min-h-0">
                            <HubCard title={t.teamStandings} icon={<TrophyIcon />} accent="#FFD700" className="shrink-0 max-h-[45%] flex flex-col">
                                <div className="p-1 overflow-y-auto custom-hub-scrollbar">
                                    <table className="w-full table-fixed border-collapse">
                                        <thead>
                                            <tr>
                                                <th className={`${thClass} w-[6%]`}>#</th>
                                                <th className={`${thClass} w-[26%] text-center`}>{t.team.toUpperCase()}</th>
                                                <th className={`${thClass} w-[7%]`}>{t.thP}</th>
                                                <th className={`${thClass} w-[7%]`}>{t.thW}</th>
                                                <th className={`${thClass} w-[7%]`}>{t.thD}</th>
                                                <th className={`${thClass} w-[7%]`}>{t.thL}</th>
                                                <th className={`${thClass} w-[10%]`}>{t.thGF}</th>
                                                <th className={`${thClass} w-[10%]`}>{t.thGA}</th>
                                                <th className={`${thClass} w-[10%]`}>{t.thGD}</th>
                                                <th className={`${thClass} w-[10%] text-white bg-white/[0.03]`}>PTS</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {teamStats.map((stat, idx) => (
                                                <tr key={stat.team.id} className="group border-b border-white/5 last:border-0 transition-all duration-300">
                                                    <td className={`${tdBase} text-white/30 bg-white/[0.02]`}>{idx + 1}</td>
                                                    <td className="py-2 flex justify-center">
                                                        <SubtleDashboardAvatar team={stat.team} size="xxs" isLight={true} />
                                                    </td>
                                                    <td className={`${tdBase} text-slate-300`}>{stat.gamesPlayed}</td>
                                                    <td className={`${tdBase} text-slate-300`}>{stat.wins}</td>
                                                    <td className={`${tdBase} text-slate-300`}>{stat.draws}</td>
                                                    <td className={`${tdBase} text-slate-300`}>{stat.losses}</td>
                                                    <td className={`${tdBase} text-slate-300`}>{stat.goalsFor}</td>
                                                    <td className={`${tdBase} text-slate-300`}>{stat.goalsAgainst}</td>
                                                    <td className={`${tdBase} text-white/40`}>{stat.goalDifference > 0 ? `+${stat.goalDifference}` : stat.goalDifference}</td>
                                                    <td className={`${tdBase} text-[12px] font-black text-white bg-white/[0.03]`}>{stat.points}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </HubCard>
                            <HubCard title={t.hubMatchReport} icon={<Target />} accent="#00F2FE" className="w-full flex-grow min-h-0" bodyClassName="p-4">
                                <ArchiveEnvironmentWidget topPlayers={sortedByImpact} session={session} t={t} />
                            </HubCard>
                        </div>
                        <div className="w-full h-full min-h-0">
                            <HubCard title={
                                <div className="flex items-center gap-4 md:gap-8 px-4 md:px-6">
                                    <button onClick={() => { setActiveTab('players'); setExpandedMatchId(null); }} className={`font-russo text-[8px] md:text-[9px] uppercase tracking-widest transition-all ${activeTab === 'players' ? 'text-[#00F2FE]' : 'text-white/20'}`}>{t.playerStatistics}</button>
                                    <div className="w-px h-3 bg-white/10"></div>
                                    <button onClick={() => { setActiveTab('matches'); setExpandedMatchId(null); }} className={`font-russo text-[8px] md:text-[9px] uppercase tracking-widest transition-all ${activeTab === 'matches' ? 'text-[#00F2FE]' : 'text-white/20'}`}>{t.gameHistory}</button>
                                </div>
                            } icon={activeTab === 'players' ? <Users /> : <HistoryIcon />} accent="#00F2FE" className="h-full flex flex-col" bodyClassName="flex flex-col h-full min-h-0 relative">
                                <div className="flex-grow overflow-y-auto custom-hub-scrollbar p-1 pb-10">
                                    {activeTab === 'players' ? (
                                        <table className="w-full table-fixed border-collapse">
                                            <thead>
                                                <tr>
                                                    <th className={`${thClass} w-[10%]`}>#</th>
                                                    <th className={`${thClass} w-[50%] text-left pl-4`}>{t.players.toUpperCase()}</th>
                                                    <th className={`${thClass} w-[12%]`}>{t.thG}</th>
                                                    <th className={`${thClass} w-[12%]`}>{t.thA}</th>
                                                    <th className={`${thClass} w-[16%] text-white`}>{t.thTotal}</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {sortedByStats.map((ps, idx) => (
                                                    <tr key={ps.player.id} className="group border-b border-white/5 last:border-0 hover:bg-white/[0.02] transition-colors">
                                                        <td className={`${tdBase} text-white/30 font-mono`}>{idx + 1}</td>
                                                        <td className="py-2 text-left pl-4 relative overflow-hidden">
                                                            <div 
                                                                className="absolute left-0 top-1/2 -translate-y-1/2 w-[2px] h-3 rounded-full"
                                                                style={{ 
                                                                    backgroundColor: ps.team.color,
                                                                    boxShadow: `0 0 8px ${ps.team.color}`
                                                                }}
                                                            />
                                                            <span className="text-slate-300 font-bold uppercase truncate text-[11px] block w-full pl-3 transition-colors group-hover:text-white">{ps.player.nickname || 'Unknown'}</span>
                                                        </td>
                                                        <td className={`${tdBase} text-white/70 font-mono`}>{ps.goals}</td>
                                                        <td className={`${tdBase} text-white/70 font-mono`}>{ps.assists}</td>
                                                        <td className={`${tdBase} text-white font-black text-[12px]`}>{ps.goals + ps.assists}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    ) : (
                                        <table className="w-full table-fixed border-collapse">
                                            <thead>
                                                <tr>
                                                    <th className={`${thClass} w-[15%]`}>#</th>
                                                    <th className={`${thClass} w-[25%] text-center`}>{t.hubHome}</th>
                                                    <th className={`${thClass} w-[35%] text-center`}>{t.hubResult}</th>
                                                    <th className={`${thClass} w-[25%] text-center`}>{t.hubAway}</th>
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
                                                            <td className="py-2 text-center">
                                                                <div className="flex justify-center"><TeamAvatar team={session.teams.find(t => t.id === game.team1Id) || {}} size="xxs" isLight={true} /></div>
                                                            </td>
                                                            <td className="py-2 text-center">
                                                                <span className="font-bold text-[11px] md:text-[12px] text-slate-200 tabular-nums tracking-tighter bg-white/5 px-2 py-1 rounded transition-colors group-hover:text-white group-hover:bg-[#00F2FE]/10">{game.team1Score} : {game.team2Score}</span>
                                                            </td>
                                                            <td className="py-2 text-center">
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
                                                                                                    {scorer?.nickname || (goal.isOwnGoal ? t.ownGoal : 'Unknown')}
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
                                {/* ЭФФЕКТ МЯГКОГО СКРЫТИЯ - Obsidian Black (#01040a) */}
                                <div className="absolute bottom-0 left-0 right-0 h-4 bg-gradient-to-t from-[#01040a] to-transparent z-20 pointer-events-none"></div>
                            </HubCard>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
