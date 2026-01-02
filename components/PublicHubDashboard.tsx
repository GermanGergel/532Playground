import React, { useMemo, useState, useRef, useEffect } from 'react';
import { useApp } from '../context';
import { calculateAllStats, PlayerStats } from '../services/statistics';
import { NewsItem, Player, Team, WeatherCondition } from '../types';
import { TrophyIcon, Zap, History as HistoryIcon, Users, AwardIcon, Target } from '../icons';
import { useTranslation } from '../ui';
import { convertCountryCodeAlpha3ToAlpha2 } from '../utils/countries';
import { TeamAvatar } from './avatars';

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

// --- STANDBY SCREEN ---
const StandbyScreen: React.FC = () => {
    const t = useTranslation();
    return (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black overflow-hidden rounded-[2.5rem]">
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
                
                <p className="max-w-xs text-center text-[10px] font-mono text-white/30 uppercase tracking-[0.2em] mt-8">
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
        bgStyleClass = 'bg-[#020308] border-white/10';
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
            <div className="absolute inset-0 opacity-[0.03] pointer-events-none z-0" style={{ 
                backgroundImage: `linear-gradient(45deg, #fff 25%, transparent 25%, transparent 50%, #fff 50%, #fff 75%, transparent 75%, transparent)`,
                backgroundSize: '4px 4px'
            }}></div>

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

const TacticalRosters: React.FC<{ teams: Team[], players: Player[], session: any, t: any }> = ({ teams, players, session, t }) => (
    <div className="flex h-full w-full divide-x divide-white/10 bg-black/20">
        {teams.map((team) => {
            const teamPlayers = team.playerIds.map(pid => players.find(p => p.id === pid)).filter(Boolean) as Player[];
            const avgOvr = teamPlayers.length > 0 ? Math.round(teamPlayers.reduce((sum, p) => sum + p.rating, 0) / teamPlayers.length) : 0;
            
            // Sync with Standings logic
            let goalsFor = 0;
            let goalsAgainst = 0;
            let playerScoredGoals = 0; // only goals by team members for synergy ratio
            let assistedGoals = 0;

            session.games.filter((g: any) => g.status === 'finished').forEach((g: any) => {
                if (g.team1Id === team.id) {
                    goalsFor += g.team1Score;
                    goalsAgainst += g.team2Score;
                } else if (g.team2Id === team.id) {
                    goalsFor += g.team2Score;
                    goalsAgainst += g.team1Score;
                }

                // For synergy we only count goals actually scored by players (exclude own goals by opponent)
                const teamMemberGoals = g.goals.filter((goal: any) => goal.teamId === team.id && !goal.isOwnGoal);
                playerScoredGoals += teamMemberGoals.length;
                assistedGoals += teamMemberGoals.filter((goal: any) => goal.assistantId).length;
            });

            const synergy = playerScoredGoals > 0 ? Math.round((assistedGoals / playerScoredGoals) * 100) : 0;
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
                                <div key={pid} className="flex-1 flex items-center bg-white/[0.02] rounded-lg px-3 border border-transparent transition-all min-h-[24px]">
                                    <span className="font-mono text-[8px] text-white/20 w-4 shrink-0">{(idx + 1)}</span>
                                    <span className="text-[10px] font-black text-slate-400 uppercase truncate flex-grow">{p?.nickname || 'UNKNOWN'}</span>
                                </div>
                            );
                        })}
                    </div>
                    
                    <div className="py-2 border-t border-white/5 bg-black/40 flex items-center divide-x divide-white/10">
                        <div className="flex-1 flex flex-col items-center justify-center">
                            <span className="text-[12px] font-black text-slate-200 leading-none">{goalsFor}</span>
                            <span className="text-[6px] text-white/30 uppercase font-bold tracking-widest mt-0.5">{t.thGF}</span>
                        </div>
                        <div className="flex-1 flex flex-col items-center justify-center">
                            <span className="text-[12px] font-black text-slate-200 leading-none">{goalsAgainst}</span>
                            <span className="text-[6px] text-white/30 uppercase font-bold tracking-widest mt-0.5">{t.thGA}</span>
                        </div>
                        <div className="flex-1 flex flex-col items-center justify-center">
                            <span className={`text-[12px] font-black leading-none ${synergyColor}`}>
                                {synergy}%
                            </span>
                            <span className="text-[6px] text-white/30 uppercase font-bold tracking-widest mt-0.5">SYNERGY</span>
                        </div>
                    </div>
                </div>
            );
        })}
    </div>
);

// FIX: Added the missing PublicHubDashboard component and exported it to resolve the import error in ClubIntelligenceDashboard.tsx
export const PublicHubDashboard: React.FC = () => {
    const { history, allPlayers } = useApp();
    const t = useTranslation();

    const currentSession = useMemo(() => history[0], [history]);

    if (!currentSession) {
        return <StandbyScreen />;
    }

    const { teamStats } = useMemo(() => calculateAllStats(currentSession), [currentSession]);

    const thClass = "py-2 text-white/40 uppercase tracking-tighter text-[8px] font-black text-center sticky top-0 bg-transparent backdrop-blur-sm z-10 border-b border-white/5";
    const tdBase = "py-1.5 text-center text-[10px] font-bold transition-colors";

    return (
        <div className="h-full flex flex-col gap-4 p-4 overflow-y-auto custom-hub-scrollbar pb-32">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Standings Card */}
                <HubCard title="TEAM STANDINGS" icon={<TrophyIcon />} variant="standings" accent="#FFD700" className="h-[300px]">
                    <div className="p-1 overflow-y-auto custom-hub-scrollbar h-full">
                        <table className="w-full table-fixed border-collapse">
                            <thead>
                                <tr>
                                    <th className={`${thClass} w-[10%]`}>#</th>
                                    <th className={`${thClass} w-[30%] text-left pl-3`}>TEAM</th>
                                    <th className={`${thClass} w-[10%]`}>P</th>
                                    <th className={`${thClass} w-[10%]`}>W</th>
                                    <th className={`${thClass} w-[10%]`}>D</th>
                                    <th className={`${thClass} w-[10%]`}>L</th>
                                    <th className={`${thClass} w-[20%] text-white`}>PTS</th>
                                </tr>
                            </thead>
                            <tbody>
                                {teamStats.map((stat, idx) => (
                                    <tr key={stat.team.id} className="group border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors">
                                        <td className={`${tdBase} text-white/30 bg-white/5`}>{idx + 1}</td>
                                        <td className={`${tdBase} text-left pl-3`}>
                                            <div className="flex items-center justify-start gap-2">
                                                <SubtleDashboardAvatar team={stat.team} />
                                                <span className="text-[9px] font-black tracking-tight text-slate-300 uppercase group-hover:text-white transition-colors">
                                                    SQUAD
                                                </span>
                                            </div>
                                        </td>
                                        <td className={`${tdBase} text-slate-300`}>{stat.gamesPlayed}</td>
                                        <td className={`${tdBase} text-slate-300`}>{stat.wins}</td>
                                        <td className={`${tdBase} text-slate-300`}>{stat.draws}</td>
                                        <td className={`${tdBase} text-slate-300`}>{stat.losses}</td>
                                        <td className={`${tdBase} text-white bg-white/5 font-black text-[11px]`}>{stat.points}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </HubCard>

                {/* Squads Card */}
                <HubCard title="SESSION SQUADS" icon={<Users />} variant="dark" className="h-[300px]">
                    <TacticalRosters teams={currentSession.teams} players={allPlayers} session={currentSession} t={t} />
                </HubCard>

                {/* Intelligence Card - Environment and Details */}
                <HubCard title="ENVIRONMENT" icon={<Target />} accent="#00F2FE" className="h-[300px]" bodyClassName="p-4">
                    <div className="flex flex-col gap-4">
                        <div className="flex items-center gap-3 bg-white/[0.02] border border-white/5 rounded-xl p-3">
                            <MapPinIcon className="w-5 h-5 text-[#00F2FE]" />
                            <div className="flex flex-col">
                                <span className="text-[8px] font-black text-white/30 uppercase tracking-widest">LOCATION</span>
                                <span className="font-chakra font-bold text-sm text-slate-200 uppercase">{currentSession.location || "Club Ground"}</span>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 bg-white/[0.02] border border-white/5 rounded-xl p-3">
                            <ClockIcon className="w-5 h-5 text-[#00F2FE]" />
                            <div className="flex flex-col">
                                <span className="text-[8px] font-black text-white/30 uppercase tracking-widest">TIME</span>
                                <span className="font-mono font-bold text-sm text-slate-200">{currentSession.timeString || "19:30 - 21:00"}</span>
                            </div>
                        </div>
                        {currentSession.weather && (
                            <div className="flex items-center justify-between bg-indigo-900/10 border border-indigo-500/20 rounded-xl p-3">
                                <div className="flex items-center gap-3">
                                    <TermometerIcon className="w-5 h-5 text-indigo-400" />
                                    <div className="flex flex-col">
                                        <span className="text-[8px] font-black text-white/30 uppercase tracking-widest">CONDITION</span>
                                        <span className="font-russo text-sm text-slate-200">{currentSession.weather.temperature}°C {currentSession.weather.condition.toUpperCase()}</span>
                                    </div>
                                </div>
                                <CloudIcon className="w-6 h-6 text-indigo-300/50" />
                            </div>
                        )}
                    </div>
                </HubCard>
            </div>
        </div>
    );
};
