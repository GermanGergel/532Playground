
import React, { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context';
import { calculateAllStats, PlayerStats } from '../services/statistics';
import { NewsItem, Player, Team, WeatherCondition, Session } from '../types';
import { TrophyIcon, Zap, History as HistoryIcon, Users, AwardIcon, Target, StarIcon } from '../icons';
import { useTranslation } from '../ui';
import { convertCountryCodeAlpha3ToAlpha2 } from '../utils/countries';
import { TeamAvatar } from './avatars';

// --- TYPES ---
interface TopPlayerStats {
    player: Player;
    score: number;
    rank: 1 | 2 | 3;
}

// --- HELPERS ---
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

// --- COMPONENTS ---

// FIX: Added SubtleDashboardAvatar to resolve 'Cannot find name' error.
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

// FIX: Added HubCard to resolve 'Cannot find name' error.
const HubCard: React.FC<{
    title: React.ReactNode;
    icon: React.ReactNode;
    children: React.ReactNode;
    className?: string;
    bodyClassName?: string;
    accent?: string;
    align?: 'left' | 'right' | 'center';
    variant?: 'standings' | 'elite';
    headerExtra?: React.ReactNode;
}> = ({ title, icon, children, className = "", bodyClassName = "", accent = "#fff", align = 'left', variant = 'standings', headerExtra }) => {
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
                    {headerExtra && <div className="ml-auto">{headerExtra}</div>}
                 </div>
            </div>
            <div className={`relative overflow-hidden flex flex-col z-10 flex-grow ${bodyClassName}`}>{children}</div>
        </div>
    );
};

// FIX: Added PodiumSpot to resolve dependencies in SessionPodium.
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

// FIX: Added SessionPodium to resolve 'Cannot find name' error.
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

// FIX: Added StandbyScreen to resolve 'Cannot find name' error.
const StandbyScreen: React.FC = () => {
    const t = useTranslation();
    return (
        <div className="h-full flex flex-col items-center justify-center opacity-20">
            <TrophyIcon className="w-32 h-32 mb-6" />
            <span className="font-orbitron text-xl uppercase tracking-[0.5em] font-black">{t.hubAwaitingStats}</span>
        </div>
    );
};

// FIX: Added MatchEnvironmentWidget to resolve 'Cannot find name' error.
const MatchEnvironmentWidget: React.FC<{ session: Session, t: any }> = ({ session, t }) => {
    const data = {
        location: session.location || "PITCH DATA UNAVAILABLE",
        time: session.timeString || "19:30 - 21:00",
        temp: session.weather ? `${session.weather.temperature}°C` : "26°C",
        condition: session.weather?.condition ? session.weather.condition.toUpperCase() : "CLEAR"
    };

    return (
        <div className="flex flex-col h-full justify-around">
            <div className="flex items-center gap-4 bg-white/[0.03] p-4 rounded-2xl border border-white/5">
                <div className="w-12 h-12 rounded-xl bg-[#00F2FE]/10 border border-[#00F2FE]/30 flex items-center justify-center text-[#00F2FE]">
                    <Target className="w-6 h-6" />
                </div>
                <div>
                    <p className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em]">{t.hubLocation}</p>
                    <p className="font-chakra font-bold text-sm text-slate-200 uppercase">{data.location}</p>
                </div>
            </div>
            <div className="flex items-center gap-4 bg-white/[0.03] p-4 rounded-2xl border border-white/5">
                <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white/50">
                    <HistoryIcon className="w-6 h-6" />
                </div>
                <div>
                    <p className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em]">{t.hubTimeFrame}</p>
                    <p className="font-mono font-bold text-sm text-slate-200 tracking-widest">{data.time}</p>
                </div>
            </div>
            <div className="flex items-center gap-4 bg-indigo-900/20 p-4 rounded-2xl border border-indigo-500/20">
                <div className="text-3xl">
                    {data.condition.includes('RAIN') ? '🌧️' : data.condition.includes('CLOUD') ? '☁️' : '🌙'}
                </div>
                <div>
                    <p className="text-[10px] font-black text-indigo-300/50 uppercase tracking-[0.2em]">{t.hubWeather}</p>
                    <p className="font-russo text-xl text-slate-200">{data.temp} <span className="text-[10px] text-indigo-300 font-bold ml-1">{data.condition}</span></p>
                </div>
            </div>
        </div>
    );
};

// FIX: Added NewsVanguardCard to resolve 'Cannot find name' error.
const NewsVanguardCard: React.FC<{ item: NewsItem }> = ({ item }) => {
    return (
        <div className="mb-3 last:mb-0 relative group/news p-3 rounded-2xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.05] hover:border-white/10 transition-all">
            <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-black/40 flex items-center justify-center shrink-0 border border-white/5">
                    {item.isHot ? <Zap className="w-4 h-4 text-[#00F2FE]" /> : <StarIcon className="w-4 h-4 text-white/20" />}
                </div>
                <div className="min-w-0 flex-grow">
                    <div className="flex justify-between items-center mb-0.5">
                        <span className="font-chakra font-black text-[11px] text-white uppercase truncate">{item.playerName}</span>
                        <span className="font-mono text-[7px] text-white/20">{new Date(item.timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
                    </div>
                    <p className="text-[10px] text-white/40 truncate leading-none uppercase tracking-wide">{item.message.replace(item.playerName, '').trim() || item.subMessage}</p>
                </div>
            </div>
        </div>
    );
};

// FIX: Added TacticalRosters to resolve 'Cannot find name' error.
const TacticalRosters: React.FC<{ teams: Team[], players: Player[], session: Session, teamStats: any[], t: any }> = ({ teams, players, session, teamStats, t }) => {
    return (
        <div className="flex-grow overflow-y-auto custom-hub-scrollbar p-3 space-y-4">
            {teams.map(team => {
                const stats = teamStats.find(ts => ts.team.id === team.id);
                const roster = team.playerIds.map(id => players.find(p => p.id === id)).filter(Boolean) as Player[];
                return (
                    <div key={team.id} className="relative p-3 rounded-2xl bg-white/[0.02] border border-white/5">
                        <div className="flex items-center justify-between mb-3 border-b border-white/5 pb-2">
                            <div className="flex items-center gap-2">
                                <SubtleDashboardAvatar team={team} isLight />
                                <span className="font-russo text-[10px] text-white uppercase tracking-wider">{team.name}</span>
                            </div>
                            <div className="flex gap-3">
                                <div className="flex flex-col items-center">
                                    <span className="text-[10px] font-black text-white leading-none">{stats?.points || 0}</span>
                                    <span className="text-[6px] text-white/20 uppercase font-black">PTS</span>
                                </div>
                                <div className="flex flex-col items-center">
                                    <span className="text-[10px] font-black text-white leading-none">{stats?.goalsFor || 0}</span>
                                    <span className="text-[6px] text-white/20 uppercase font-black">GF</span>
                                </div>
                            </div>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                            {roster.map(p => (
                                <div key={p.id} className="px-2 py-1 rounded-full bg-white/5 border border-white/5">
                                    <span className="text-[9px] font-bold text-slate-300 uppercase">{p.nickname}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

export const PublicHubDashboard: React.FC = () => {
    const { history, newsFeed, allPlayers } = useApp();
    const t = useTranslation();
    
    const [activeRightTab, setActiveRightTab] = useState<'players' | 'games'>('players');
    const [expandedMatchId, setExpandedMatchId] = useState<string | null>(null);
    
    // Presentation Mode (Tabs)
    const [isAutoSwitching, setIsAutoSwitching] = useState(true);
    const [autoSwitchProgress, setAutoSwitchProgress] = useState(0);

    const session = history[0];

    // --- INFINITE AUTO SWITCH LOGIC (TABS) ---
    useEffect(() => {
        if (!isAutoSwitching || !session) return;

        let phaseStartTime = Date.now() + 3000; 
        const DURATION = 10000; 
        
        const timer = setInterval(() => {
            const now = Date.now();
            if (now < phaseStartTime) return;

            let elapsed = now - phaseStartTime;
            let progress = (elapsed / DURATION) * 100;
            
            if (progress >= 100) {
                setActiveRightTab(prev => {
                    const next = prev === 'players' ? 'games' : 'players';
                    phaseStartTime = Date.now();
                    return next;
                });
                setAutoSwitchProgress(0);
                setExpandedMatchId(null); 
            } else {
                setAutoSwitchProgress(progress);
            }
        }, 50);

        return () => clearInterval(timer);
    }, [isAutoSwitching, session]);

    const handleManualTabChange = (tab: 'players' | 'games') => {
        setIsAutoSwitching(false); 
        setActiveRightTab(tab);
        setExpandedMatchId(null);
    };

    if (!session) return <StandbyScreen />;

    const { teamStats, allPlayersStats: rawPlayersStats } = calculateAllStats(session);

    const allPlayersStats = useMemo(() => {
        return rawPlayersStats.map(stat => {
            const latestPlayer = allPlayers.find(p => p.id === stat.player.id);
            return { ...stat, player: latestPlayer || stat.player };
        });
    }, [rawPlayersStats, allPlayers]);

    const sortedForPodium = [...allPlayersStats].sort((a, b) => getImpactScore(b) - getImpactScore(a));
    const sortedForTable = [...allPlayersStats].sort((a, b) => (b.goals + b.assists) - (a.goals + a.assists));

    const top3PodiumPlayers: TopPlayerStats[] = sortedForPodium
        .filter(p => p.gamesPlayed > 0)
        .slice(0, 3)
        .map((p, i) => ({
            player: p.player,
            score: getImpactScore(p),
            rank: (i + 1) as 1 | 2 | 3
        }));

    const finishedGames = [...session.games]
        .filter(g => g.status === 'finished')
        .sort((a, b) => a.gameNumber - b.gameNumber);

    const thStandings = "py-2 text-white/40 uppercase tracking-tighter text-[8px] font-black text-center sticky top-0 bg-[#05070a] backdrop-blur-sm z-10 border-b border-white/5";
    const tdBase = "py-1.5 text-center text-[10px] font-bold transition-colors";

    return (
        <div className="h-full flex flex-col animate-in fade-in duration-700 w-full relative p-2 md:p-3 overflow-hidden">
            <div className="flex-grow grid grid-cols-12 gap-4 min-h-0 items-stretch relative z-10 overflow-hidden">
                <div className="col-span-12 md:col-span-9 flex flex-col gap-4 h-full min-h-[600px] overflow-hidden">
                    <div className="flex-[4] min-h-0 shrink-0 animate-in fade-in slide-in-from-bottom-4 duration-1000 delay-200 flex gap-3">
                         <HubCard title={t.hubSessionLeaders} align="right" icon={<AwardIcon />} accent="#FFD700" variant="elite" className="flex-[2] h-full min-h-[350px]" bodyClassName="flex flex-col bg-transparent">
                            <div className="flex-grow relative"><SessionPodium players={top3PodiumPlayers} t={t} /></div>
                        </HubCard>
                        <HubCard title={t.hubMatchReport} icon={<Target />} accent="#00F2FE" variant="standings" className="flex-1 h-full min-h-[350px]" bodyClassName="flex flex-col p-5"><MatchEnvironmentWidget session={session} t={t} /></HubCard>
                    </div>

                    <div className="flex-[3] min-h-0 shrink-0 grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <HubCard title={t.hubSessionNews} icon={<Zap />} accent="#00F2FE" variant="standings" className="h-full min-h-0" bodyClassName="p-0 flex flex-col relative">
                            {/* SCROLL FADE - UNIFIED h-10 */}
                            <div className="absolute bottom-0 left-0 right-0 h-10 bg-gradient-to-t from-[#05070a] via-[#05070a]/60 to-transparent z-20 pointer-events-none"></div>
                            
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
                    <HubCard title={t.hubTeamStandings} icon={<TrophyIcon />} variant="standings" className="shrink-0" bodyClassName="flex flex-col">
                        <div className="p-1">
                            <table className="w-full table-fixed border-collapse">
                                <thead>
                                    <tr className="bg-white/5 border-b border-white/10">
                                        <th className={`${thStandings} w-[6%]`}>#</th>
                                        <th className={`${thStandings} w-[26%]`}>{t.team}</th>
                                        <th className={`${thStandings} w-[7%]`}>{t.thP}</th>
                                        <th className={`${thStandings} w-[7%]`}>{t.thW}</th>
                                        <th className={`${thStandings} w-[7%]`}>{t.thD}</th>
                                        <th className={`${thStandings} w-[7%]`}>{t.thL}</th>
                                        <th className={`${thStandings} w-[10%]`}>{t.thGF}</th>
                                        <th className={`${thStandings} w-[10%]`}>{t.thGA}</th>
                                        <th className={`${thStandings} w-[10%]`}>{t.thGD}</th>
                                        <th className={`${thStandings} w-[10%] text-white bg-white/[0.03]`}>PTS</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {teamStats.map((stat, idx) => (
                                        <tr key={stat.team.id} className="group border-b border-white/5 last:border-0 transition-all duration-300">
                                            <td className="py-1.5 text-center text-[9px] font-bold text-white/30 bg-white/[0.02] relative overflow-hidden">
                                                {idx + 1}
                                            </td>
                                            <td className="py-1.5 flex justify-center"><SubtleDashboardAvatar team={stat.team} size="xxs" isLight /></td>
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
                        title={
                            <div className="relative group/tab">
                                <button 
                                    onClick={() => handleManualTabChange('players')} 
                                    className={`font-russo text-[10px] uppercase tracking-widest transition-all duration-300 ${activeRightTab === 'players' ? 'text-[#00F2FE]' : 'opacity-20 hover:opacity-50'}`}
                                >
                                    {t.hubPlayers}
                                </button>
                                {isAutoSwitching && activeRightTab === 'players' && (
                                    <div className="absolute -bottom-1 left-0 h-[1.5px] bg-[#00F2FE] transition-all duration-75 shadow-[0_0_5px_#00F2FE]" style={{ width: `${autoSwitchProgress}%` }} />
                                )}
                            </div>
                        } 
                        headerExtra={
                            <div className="relative group/tab">
                                <button 
                                    onClick={() => handleManualTabChange('games')} 
                                    className={`font-russo text-[10px] uppercase tracking-widest transition-all duration-300 ${activeRightTab === 'games' ? 'text-[#00F2FE]' : 'opacity-20 hover:opacity-50'}`}
                                >
                                    {t.hubGames}
                                </button>
                                {isAutoSwitching && activeRightTab === 'games' && (
                                    <div className="absolute -bottom-1 left-0 h-[1.5px] bg-[#00F2FE] transition-all duration-75 shadow-[0_0_5px_#00F2FE]" style={{ width: `${autoSwitchProgress}%` }} />
                                )}
                            </div>
                        }
                        icon={activeRightTab === 'players' ? <Users /> : <HistoryIcon />} 
                        variant="standings" 
                        accent="#00F2FE" 
                        className="flex-grow min-h-0" 
                        bodyClassName="flex flex-col h-full min-h-0 relative"
                    >
                        {/* SCROLL FADE - UNIFIED h-10 */}
                        <div className="absolute bottom-0 left-0 right-0 h-10 bg-gradient-to-t from-[#05070a] via-[#05070a]/60 to-transparent z-20 pointer-events-none"></div>

                        <div className="flex-grow overflow-y-auto custom-hub-scrollbar h-full">
                            <div className="py-2">
                                {activeRightTab === 'players' ? (
                                    <div className="animate-in fade-in duration-500">
                                        <table className="w-full table-fixed border-collapse">
                                            <thead><tr><th className={`${thStandings} w-[10%]`}>#</th><th className={`${thStandings} text-left pl-3 w-[50%]`}>{t.players}</th><th className={`${thStandings} w-[15%]`}>{t.thG}</th><th className={`${thStandings} w-[15%]`}>{t.thA}</th><th className={`${thStandings} w-[10%] text-white bg-white/[0.03]`}>TOT</th></tr></thead>
                                            <tbody>{sortedForTable.map((ps, idx) => (
                                                <tr key={ps.player.id} className="group border-b border-white/5 last:border-0 transition-all duration-300">
                                                    <td className="py-2 text-center text-[9px] font-bold text-white/30 bg-white/[0.02] relative overflow-hidden">
                                                        {idx + 1}
                                                    </td>
                                                    <td className="py-2 text-left pl-3 relative overflow-hidden">
                                                        <div 
                                                            className="absolute left-0 top-1/2 -translate-y-1/2 w-[1.5px] h-3 rounded-full"
                                                            style={{ 
                                                                backgroundColor: ps.team.color,
                                                                boxShadow: `0 0 8px ${ps.team.color}`
                                                            }}
                                                        />
                                                        <span className="text-slate-300 font-bold uppercase truncate text-[11px] block w-full pl-2 transition-colors">{ps.player.nickname || 'Unknown'}</span>
                                                    </td>
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
                                                    <tr 
                                                        className={`group border-b border-white/5 last:border-0 transition-all duration-300 ${totalScore > 0 ? 'hover:bg-white/[0.04] cursor-pointer' : 'cursor-default'} ${expandedMatchId === game.id ? 'bg-[#00F2FE]/5' : ''}`}
                                                        onClick={() => totalScore > 0 && setExpandedMatchId(expandedMatchId === game.id ? null : game.id)}
                                                    >
                                                        <td className={`${tdBase} text-white/30 font-mono relative overflow-hidden`}>
                                                            {game.gameNumber}
                                                        </td>
                                                        <td className="py-2.5 text-center"><div className="flex justify-center"><TeamAvatar team={session.teams.find(t => t.id === game.team1Id) || {}} size="xxs" isLight={true} /></div></td>
                                                        <td className="py-2.5 text-center"><span className="font-bold text-[11px] md:text-[12px] text-slate-200 tabular-nums tracking-tighter bg-white/5 px-2 py-1 rounded transition-colors group-hover:text-white group-hover:bg-[#00F2FE]/10">{game.team1Score} : {game.team2Score}</span></td>
                                                        <td className="py-2.5 text-center"><div className="flex justify-center"><TeamAvatar team={session.teams.find(t => t.id === game.team2Id) || {}} size="xxs" isLight={true} /></div></td>
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
                                                                                <div key={goal.id} className="flex items-center gap-2 px-3 py-1 relative">
                                                                                    <div 
                                                                                        className="w-[1px] h-2.5 rounded-full shrink-0" 
                                                                                        style={{ 
                                                                                            backgroundColor: team?.color || '#fff',
                                                                                            boxShadow: `0 0 6px ${team?.color || '#fff'}`
                                                                                        }}
                                                                                    ></div>
                                                                                    <div className="shrink-0 ml-1">
                                                                                        {goal.isOwnGoal ? (
                                                                                            <span className="text-[10px]">🧤</span>
                                                                                        ) : (
                                                                                            <span className="text-[10px]">⚽</span>
                                                                                        )}
                                                                                    </div>
                                                                                    <div className="flex flex-col min-w-0">
                                                                                        <div className="flex flex-wrap items-baseline gap-x-2">
                                                                                            <span className="text-[11px] font-black uppercase text-slate-200 tracking-wide truncate">
                                                                                                {scorer?.nickname || (goal.isOwnGoal ? t.ownGoal : 'Unknown')}
                                                                                            </span>
                                                                                            {assistant && (
                                                                                                <span className="text-[8px] font-bold text-white/20 uppercase italic shrink-0">
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
