
import React, { useMemo } from 'react';
import { useApp } from '../context';
import { HubProgressChart } from './HubAnalytics';
import { StarIcon, TrophyIcon, BarChartDynamic, History as HistoryIcon, Zap, Users, ChevronLeft, AwardIcon, Calendar, ExclamationIcon } from '../icons';
import { SkillType, Player, PlayerStatus, BadgeType, PlayerTier } from '../types';
import { convertCountryCodeAlpha3ToAlpha2 } from '../utils/countries';
import { BadgeIcon } from '../features';
import { translations } from '../translations/index';
import { MiniSquadBadge } from './MiniSquadBadge';
import { calculatePlayerMonthlyStats } from '../services/statistics';

// Precise Arrow logic based on float delta
const FormArrowIndicator: React.FC<{ delta?: number }> = ({ delta = 0 }) => {
    const isUp = delta > 0.1;
    const isDown = delta < -0.1;
    
    const color = isUp ? '#4CFF5F' : isDown ? '#FF4136' : '#A9B1BD';
    
    const commonProps: React.SVGProps<SVGSVGElement> = {
        width: "24", height: "24", viewBox: "0 0 24 24", fill: "none", stroke: color,
        strokeWidth: "3", strokeLinecap: "round", strokeLinejoin: "round",
        className: "transition-all duration-500"
    };

    if (isUp) return <svg {...commonProps} style={{ filter: 'drop-shadow(0 0 5px rgba(76, 255, 95, 0.4))' }}><path d="M12 19V5m-6 7l6-6 6 6"/></svg>;
    if (isDown) return <svg {...commonProps} style={{ filter: 'drop-shadow(0 0 5px rgba(255, 65, 54, 0.4))' }}><path d="M12 5v14M5 12l7 7 7-7"/></svg>;
    return <svg {...commonProps}><path d="M5 12h14m-6-6l6 6-6 6"/></svg>;
};

const ALL_BADGES: BadgeType[] = [
    'goleador', 'perfect_finish', 'dynasty', 'sniper', 'assistant', 'mvp', 
    'decisive_factor', 'unsung_hero', 'first_blood', 'duplet', 'maestro', 
    'comeback_kings', 'fortress', 'club_legend_goals', 'club_legend_assists', 'veteran',
    'session_top_scorer', 'stable_striker', 'victory_finisher', 'session_top_assistant',
    'passing_streak', 'team_conductor', 'ten_influence', 'mastery_balance',
    'key_player', 'win_leader', 'iron_streak', 'undefeated', 'dominant_participant',
    'career_100_wins', 'career_150_influence', 'career_super_veteran',
    'mercenary', 'double_agent', 'joker', 'crisis_manager', 'iron_lung'
];

const TIER_COLORS = {
    [PlayerTier.Legend]: '#d946ef', 
    [PlayerTier.Elite]: '#fbbf24',  
    [PlayerTier.Pro]: '#E2E8F0',    
    [PlayerTier.Regular]: '#00F2FE' 
};

const IntelHeader = ({ title, icon: Icon, accent = "#00F2FE" }: any) => (
    <div className={`flex items-center justify-between px-1 mb-3 relative z-20`}>
        <div className="flex items-center gap-3 flex-grow">
            <div className="p-1.5 rounded-lg bg-white/5 border border-white/10 text-white/80 shadow-inner">
                <Icon className="w-3 h-3" style={{ color: accent, filter: `drop-shadow(0 0 5px ${accent}44)` }} />
            </div>
            <h4 className="font-audiowide text-[9px] text-white/60 tracking-[0.2em] uppercase">{title}</h4>
            <div className="h-[1px] flex-grow bg-white/5 ml-2"></div>
        </div>
    </div>
);

const BentoBox = ({ children, className = "", noPadding = false, contentClassName = "" }: any) => (
    <div className={`
        relative overflow-hidden rounded-3xl 
        bg-gradient-to-br from-[#161b22] to-[#0a0d14]
        border border-white/[0.06]
        shadow-[0_25px_50px_-12px_rgba(0,0,0,0.9),inset_0_1px_1px_rgba(255,255,255,0.05)]
        group/bento
        ${noPadding ? '' : 'p-4'} ${className}
    `}>
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none z-0" style={{ backgroundImage: `linear-gradient(45deg, #fff 25%, transparent 25%, transparent 50%, #fff 50%, #fff 75%, transparent 75%, transparent)`, backgroundSize: '4px 4px' }}></div>
        <div className="absolute -top-10 -left-10 w-40 h-40 bg-[#00F2FE]/[0.03] rounded-full blur-[40px] pointer-events-none z-0 animate-pulse" style={{ animationDuration: '4s' }}></div>
        <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/[0.01] to-transparent opacity-0 group-hover/bento:opacity-100 transition-opacity duration-700 z-0"></div>
        <div className={`relative z-10 flex flex-col ${contentClassName}`}>{children}</div>
    </div>
);

const TerminalStat = ({ label, value, color = "#fff", subValue, size = "text-xl" }: any) => (
    <div className="flex flex-col items-center justify-center text-center w-full">
        <div className="flex items-center gap-1.5 justify-center">
            <span className={`${size} font-black font-russo tracking-tight leading-none`} style={{ color }}>{value}</span>
            {subValue && <span className="text-[10px] font-bold text-white/40 self-end mb-0.5">{subValue}</span>}
        </div>
        <span className="text-[7px] text-white/30 uppercase tracking-[0.15em] mt-1.5 font-black leading-none">{label}</span>
    </div>
);

const TerminalLastSession = ({ player }: { player: Player }) => {
    const b = player.lastRatingChange;
    const { language } = useApp();
    const t = translations[language] as any;
    if (!b) return <div className="text-center py-6 opacity-10 text-[9px] uppercase font-black">No Data</div>;
    const isPenalty = player.consecutiveMissedSessions && player.consecutiveMissedSessions >= 5;
    const earnedBadges = b.badgesEarned || [];
    return (
        <div className="space-y-2.5 pb-1">
            <div className="flex justify-center items-center gap-8 bg-black/30 p-2 rounded-2xl border border-white/5 shadow-inner">
                <div className="text-center w-16"><span className="text-2xl font-black text-white/30 block leading-none">{Math.round(b.previousRating)}</span><span className="text-[5px] text-white/20 uppercase font-black tracking-widest mt-1 block">PREV</span></div>
                <div className="flex flex-col items-center w-12"><span className={`text-lg font-black leading-none ${b.finalChange >= 0 ? 'text-green-400' : 'text-red-500'}`}>{b.finalChange > 0 ? '+' : ''}{b.finalChange.toFixed(1)}</span><span className={`text-[6px] uppercase font-black tracking-widest mt-1 block ${isPenalty ? 'text-red-400' : 'text-white/40'}`}>{isPenalty ? 'PENALTY' : 'DELTA'}</span></div>
                <div className="text-center w-16"><span className="text-2xl font-black text-[#00F2FE] block leading-none">{Math.round(b.newRating)}</span><span className="text-[5px] text-[#00F2FE]/60 uppercase font-black tracking-widest mt-1 block">NEW</span></div>
            </div>
            {isPenalty ? (
                <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-4 flex flex-col items-center gap-2 animate-in fade-in slide-in-from-top-2 duration-500">
                    <div className="flex items-center gap-2 text-red-500"><ExclamationIcon className="w-4 h-4 shadow-[0_0_10px_rgba(239,68,68,0.5)]" /><span className="font-russo text-[10px] tracking-widest uppercase">{t?.penalty_title}</span></div>
                    <p className="text-[10px] font-chakra font-bold text-red-200/60 uppercase leading-relaxed text-center">{t?.penalty_message?.replace('{n}', Math.abs(b.finalChange).toFixed(0)).replace('{m}', (player.consecutiveMissedSessions || 0).toString())}</p>
                </div>
            ) : (
                <>
                    <div className="grid grid-cols-3 gap-1">
                        {[{ l: 'Team', v: b.teamPerformance }, { l: 'Indiv', v: b.individualPerformance }, { l: 'Badge', v: b.badgeBonus }].map(stat => (
                            <div key={stat.l} className="bg-black/30 p-1.5 rounded-xl border border-white/5 text-center shadow-inner"><span className={`text-[9px] font-bold block leading-none ${stat.v > 0 ? 'text-white' : stat.v < 0 ? 'text-red-400' : 'text-white/40'}`}>{stat.v > 0 ? '+' : ''}{stat.v.toFixed(1)}</span><span className="text-[5px] text-white/20 uppercase font-black tracking-tighter block mt-0.5">{stat.l}</span></div>
                        ))}
                    </div>
                    {earnedBadges.length > 0 && (
                        <div className="pt-2 border-t border-white/5"><span className="text-[5px] text-white/20 uppercase font-black tracking-[0.2em] mb-1.5 block text-center">Awards Earned</span><div className="flex wrap justify-center gap-1.5">{earnedBadges.slice(0, 4).map((badge, idx) => (<div key={idx} className="transition-transform hover:scale-110"><BadgeIcon badge={badge} className="w-5 h-5" /></div>))}</div></div>
                    )}
                </>
            )}
        </div>
    );
};

const TerminalSessionTrend = ({ history }: { history?: Player['sessionHistory'] }) => {
    const safeHistory = history || [];
    const displayData = Array.from({ length: 5 }).map((_, i) => {
        const realItem = safeHistory[safeHistory.length - (5 - i)];
        return realItem ? { winRate: realItem.winRate, isPlaceholder: false } : { winRate: 0, isPlaceholder: true };
    });
    return (
        <div className="flex justify-between items-end h-14 px-6 relative">
            <div className="absolute left-6 right-6 bottom-0 h-px bg-white/5"></div>
            {displayData.map((s, i) => {
                const color = s.winRate > 60 ? '#4CFF5F' : s.winRate < 40 ? '#FF4136' : '#A9B1BD';
                const barHeight = s.isPlaceholder ? 5 : Math.max(s.winRate, 15); 
                return (
                    <div key={i} className="flex flex-col items-center gap-1.5 h-full justify-end group/bar relative">
                        <div 
                            className={`w-6 rounded-t-sm transition-all duration-1000 ease-out relative ${s.isPlaceholder ? 'bg-white/[0.03] border-t border-white/5' : 'opacity-100'}`} 
                            style={!s.isPlaceholder ? { 
                                height: `${barHeight}%`, 
                                background: `linear-gradient(to top, ${color}22, ${color})`, 
                                borderTop: `1px solid ${color}88`, 
                            } : { height: `${barHeight}%` }}
                        >
                             {!s.isPlaceholder && (<div className="absolute -top-6 left-1/2 -translate-x-1/2 opacity-0 group-hover/bar:opacity-100 transition-opacity whitespace-nowrap z-20"><span className="text-[8px] font-black text-white bg-black/90 px-1.5 py-0.5 rounded border border-white/10">{s.winRate}%</span></div>)}
                        </div>
                        <span className={`text-[6px] font-black tracking-tighter transition-colors ${s.isPlaceholder ? 'text-white/5' : 'text-white/30'}`}>
                            {`S${i + 1}`}
                        </span>
                    </div>
                );
            })}
        </div>
    );
};

export const HubPlayerIntel: React.FC<{ playerId: string; onBack: () => void; isEmbedded?: boolean }> = ({ playerId, onBack, isEmbedded = false }) => {
    const { allPlayers, language, totmPlayerIds, history, totmEmblem } = useApp();
    const t = translations[language] as any;

    const player = useMemo(() => (allPlayers.find(p => p.id === playerId)) as Player, [allPlayers, playerId]);
    const isTotm = useMemo(() => totmPlayerIds.has(playerId), [totmPlayerIds, playerId]);

    const { peakRating, isPrime, ratingDiff } = useMemo(() => {
        if (!player) return { peakRating: 0, isPrime: false, ratingDiff: 0 };
        const historyRatings = player.historyData?.map(h => h.rating) || [];
        const peak = Math.max(player.rating, ...historyRatings);
        const diff = player.rating - peak;
        const prime = player.rating >= peak;
        return { peakRating: peak, isPrime: prime, ratingDiff: diff };
    }, [player]);

    const rankings = useMemo(() => {
        const confirmedPlayers = allPlayers.filter(p => p.status === PlayerStatus.Confirmed);
        if (confirmedPlayers.length === 0 || !player) return { goals: '-', assists: '-', rating: '-', total: 0 };
        
        const sortedByGoals = [...confirmedPlayers].sort((a, b) => b.totalGoals - a.totalGoals || b.rating - a.rating);
        const sortedByAssists = [...confirmedPlayers].sort((a, b) => b.totalAssists - a.totalAssists || b.rating - a.rating);
        const sortedByRating = [...confirmedPlayers].sort((a, b) => b.rating - a.rating || (b.totalGoals + b.totalAssists) - (a.totalGoals + a.totalAssists));

        return {
            goals: sortedByGoals.findIndex(p => p.id === player.id) + 1 || '-',
            assists: sortedByAssists.findIndex(p => p.id === player.id) + 1 || '-',
            rating: sortedByRating.findIndex(p => p.id === player.id) + 1 || '-',
            total: confirmedPlayers.length
        };
    }, [allPlayers, player]);

    const monthlyStats = useMemo(() => player ? calculatePlayerMonthlyStats(player.id, history) : null, [player?.id, history]);
    const countryCodeAlpha2 = player?.countryCode ? convertCountryCodeAlpha3ToAlpha2(player.countryCode) : 'VN';
    
    // Career Win Rate based on audited totals
    const careerWinRate = player && player.totalGames > 0 ? `${Math.round((player.totalWins / player.totalGames) * 100)}%` : '0%';
    const goalsPerSession = player && player.totalSessionsPlayed > 0 ? (player.totalGoals / player.totalSessionsPlayed).toFixed(2) : '0.00';
    const assistsPerSession = player && player.totalSessionsPlayed > 0 ? (player.totalAssists / player.totalSessionsPlayed).toFixed(2) : '0.00';

    // Form Trend Win Rate (average of visible bars)
    const trendWinRate = useMemo(() => {
        if (!player || !player.sessionHistory || player.sessionHistory.length === 0) return '0%';
        const sum = player.sessionHistory.reduce((acc, s) => acc + s.winRate, 0);
        return `${Math.round(sum / player.sessionHistory.length)}%`;
    }, [player?.sessionHistory]);

    if (!player) return null;

    // --- FORM CALCULATIONS ---
    const preciseDelta = player.lastRatingChange?.finalChange || 0;
    const formText = preciseDelta > 0.1 ? 'HOT' : preciseDelta < -0.1 ? 'COLD' : 'STABLE';
    const formColor = preciseDelta > 0.1 ? '#4CFF5F' : preciseDelta < -0.1 ? '#FF4136' : '#fff';

    const tierColor = TIER_COLORS[player.tier] || '#00F2FE';
    const perimeterStyle: React.CSSProperties = {
        boxShadow: `0 0 15px -1px ${tierColor}aa, 0 0 45px -8px ${tierColor}66, inset 0 0 20px -10px ${tierColor}88`,
        borderRadius: '2.5rem', background: 'transparent', border: `1px solid ${tierColor}44`
    };

    const safeRecords = (player.records || {}) as any;

    return (
        <div className={`absolute inset-0 z-20 flex flex-col animate-in fade-in duration-700 overflow-hidden ${!isEmbedded ? 'rounded-[2.5rem]' : ''}`}>
            {!isEmbedded && (
                <div className="absolute inset-0 z-0 pointer-events-none">
                    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#0a1121] via-[#01040a] to-black"></div>
                    <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] pointer-events-none"></div>
                </div>
            )}

            <div className="absolute bottom-0 left-0 right-0 h-10 bg-gradient-to-t from-[#05070a] to-transparent z-30 pointer-events-none"></div>

            <div className="relative z-10 flex-grow overflow-y-auto custom-hub-scrollbar">
                <div className={`w-full max-w-[1200px] mx-auto px-4 ${isEmbedded ? 'md:px-8' : 'md:px-12 lg:px-20'} py-6 flex flex-col h-full`}>
                    
                    {!isEmbedded && (
                        <div className="flex items-center justify-between mb-6 shrink-0 px-2">
                            <button onClick={onBack} className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:border-[#00F2FE] hover:bg-[#00F2FE]/10 transition-all shadow-lg">
                                <ChevronLeft className="w-5 h-5 text-white" />
                            </button>
                            <div className="h-px flex-grow mx-6 bg-gradient-to-r from-transparent via-white/5 to-transparent"></div>
                            <div className="w-10"></div> 
                        </div>
                    )}

                    <div className={`${isEmbedded ? 'p-4' : 'p-6 md:p-10'} flex-grow transition-all duration-500`} style={perimeterStyle}>
                        <div className="space-y-6">
                            <div className="flex flex-col xl:flex-row gap-4 items-stretch">
                                <div className="w-full max-w-[260px] mx-auto xl:mx-0 xl:max-w-none xl:w-[250px] shrink-0 flex flex-col">
                                    <div className="relative aspect-[2.8/4] xl:aspect-auto w-full rounded-3xl overflow-hidden border border-white/15 shadow-[0_30px_60px_-12px_rgba(0,0,0,0.9),inset_0_1px_1px_rgba(255,255,255,0.08)] bg-gradient-to-br from-[#161b22] to-[#0a0d14] h-full">
                                        {player.playerCard && <div className="absolute inset-0 bg-cover bg-no-repeat grayscale-[0.2] opacity-80" style={{ backgroundImage: `url(${player.playerCard})`, backgroundPosition: 'center 5%' }}/>}
                                        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent"></div>
                                        <div className="absolute inset-0 p-4 flex flex-col justify-between pointer-events-none">
                                            <div className="flex justify-between items-start">
                                                <div className="flex flex-col items-start">
                                                    <p className="font-russo text-xl leading-none tracking-tighter text-white" style={{ textShadow: '0 2px 10px rgba(0,0,0,0.5)', }}>UNIT</p>
                                                    {countryCodeAlpha2 && <img src={`https://flagcdn.com/w40/${countryCodeAlpha2.toLowerCase()}.png`} className="w-5 h-auto mt-4 rounded-sm opacity-80" alt="flag" />}
                                                    {isTotm && (
                                                        <div className="mt-3 -ml-1 animate-in fade-in zoom-in duration-700">
                                                            <MiniSquadBadge size="w-8 h-8" className="opacity-90" customEmblem={totmEmblem} noGlow={true} />
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="flex flex-col items-end">
                                                    <div className="text-3xl font-black text-[#00F2FE] leading-none">{player.rating}</div>
                                                    <p className="font-black text-[8px] tracking-[0.2em] text-white mt-1">OVR</p>
                                                    {!isPrime && (
                                                        <div className="mt-2 flex items-center gap-1.5 opacity-100 animate-in fade-in slide-in-from-right-2 duration-700">
                                                            <span className="text-[9px] font-mono text-white/50 uppercase tracking-wider font-bold">PEAK {peakRating}</span>
                                                            <span className="text-[9px] font-black text-red-500 font-mono">{ratingDiff}</span>
                                                        </div>
                                                    )}
                                                    {isPrime && (
                                                        <div className="mt-2 flex items-center justify-end animate-in fade-in slide-in-from-right-2 duration-700">
                                                            <div className="px-2 py-0.5 border border-[#FFD700]/30 bg-[#FFD700]/10 rounded-full flex items-center justify-center shadow-[0_0_10px_rgba(255,215,0,0.15)]">
                                                                <span className="text-[7px] font-black text-[#FFD700] uppercase tracking-wide leading-none">PRIME</span>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="text-center"><h1 className="font-russo text-2xl uppercase tracking-tighter text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] truncate w-full px-1">{player.nickname}</h1><p className="text-[7px] font-black text-white/40 uppercase tracking-[0.4em] mt-1">{player.tier}</p></div>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex-grow grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <BentoBox className="h-full" contentClassName="h-full flex flex-col justify-center"><IntelHeader title={t?.lastSessionAnalysis} icon={BarChartDynamic} /><div className="flex-grow flex flex-col justify-center"><TerminalLastSession player={player} /></div></BentoBox>
                                    <BentoBox className="h-full" contentClassName="h-full flex flex-col"><IntelHeader title={t?.sessionTrend} icon={Zap} accent="#4CFF5F" /><div className="flex-grow flex flex-col justify-start space-y-1"><div className="grid grid-cols-3 gap-2 items-center bg-black/30 p-1.5 rounded-2xl border border-white/5 shadow-inner">
                                        <TerminalStat label="Current Form" value={formText} color={formColor} />
                                        <TerminalStat label="Trend WR" value={trendWinRate} color="#00F2FE" />
                                        <div className="flex justify-center"><FormArrowIndicator delta={preciseDelta} /></div>
                                    </div><div className="py-1 bg-black/30 rounded-2xl border border-white/5 mt-auto shadow-inner"><TerminalSessionTrend history={player.sessionHistory} /></div>{player.skills && player.skills.length > 0 && (<div className="pt-2"><div className="flex wrap justify-center gap-3 mt-1 pb-1">{player.skills.slice(0,3).map(skill => (<div key={skill} className="flex items-center gap-1 transition-all"><StarIcon className="w-2.5 h-2.5 text-[#00F2FE]" /><span className="text-[8px] font-black text-white/80 uppercase tracking-tight">{t[`skill_${skill}` as keyof typeof t]}</span></div>))}</div></div>)}</div></BentoBox>
                                    <BentoBox className="!p-2 h-full" contentClassName="h-full flex flex-col"><IntelHeader title={t?.clubRankings} icon={Users} accent="#FF00D6" /><div className="flex-grow flex flex-col justify-center pt-1 pb-1 px-1"><div className="grid grid-cols-3 gap-0.5 text-center w-full"><TerminalStat label="SCORER" value={rankings.goals} subValue={`/${rankings.total}`} color="#fff" /><TerminalStat label="ASSISTANT" value={rankings.assists} subValue={`/${rankings.total}`} color="#fff" /><TerminalStat label="RATING" value={rankings.rating} subValue={`/${rankings.total}`} color="#fff" /></div></div></BentoBox>
                                    <BentoBox className="!p-2 h-full" contentClassName="h-full flex flex-col justify-center"><IntelHeader title={t?.monthlyStatsTitle} icon={Calendar} /><div className="flex-grow flex flex-col justify-center"><div className="grid grid-cols-2 gap-y-1.5 gap-x-1 pt-1 pb-1 h-full items-center"><TerminalStat size="text-lg" label={t?.monthlyWins} value={monthlyStats!.wins} color="#fff" /><TerminalStat size="text-lg" label={t?.monthlyGoals} value={monthlyStats!.goals} /><TerminalStat size="text-lg" label={t?.monthlyAssists} value={monthlyStats!.assists} /><TerminalStat size="text-lg" label={t?.session} value={monthlyStats!.sessions} /></div></div></BentoBox>
                                </div>
                            </div>

                            <div className="w-full">
                                <BentoBox noPadding className="h-[280px] w-full" contentClassName="h-full">
                                    <div className="h-full w-full">
                                        <HubProgressChart 
                                            headerTitle={t?.statistics} 
                                            history={player.historyData || []} 
                                            initialRating={player.initialRating || 68}
                                        />
                                    </div>
                                </BentoBox>
                            </div>

                            <BentoBox className="!py-3 px-6"><div className="flex flex-col md:flex-row items-center gap-6"><div className="shrink-0"><IntelHeader title={t?.winLossDraw} icon={TrophyIcon} accent="#FFD700" /></div><div className="flex-grow w-full space-y-1.5 pt-0.5"><div className="flex w-full h-2 rounded-full overflow-hidden bg-black/50 border border-white/5 shadow-inner"><div style={{ width: `${(player.totalWins / (player.totalGames || 1)) * 100}%` }} className="bg-[#4CFF5F] shadow-[0_0_8px_#4CFF5F44]" /><div style={{ width: `${(player.totalDraws / (player.totalGames || 1)) * 100}%` }} className="bg-white/20" /><div style={{ width: `${(player.totalLosses / (player.totalGames || 1)) * 100}%` }} className="bg-[#FF4136] shadow-[0_0_8px_#FF413644]" /></div></div><div className="shrink-0 flex items-center gap-6 font-russo"><div className="flex flex-col items-center"><span className="text-lg text-[#4CFF5F] leading-none">{player.totalWins}</span><span className="text-[6px] text-white/20 uppercase font-black tracking-tighter">Wins</span></div><div className="flex flex-col items-center"><span className="text-lg text-white/40 leading-none">{player.totalDraws}</span><span className="text-[6px] text-white/20 uppercase font-black tracking-tighter">Draws</span></div><div className="flex flex-col items-center"><span className="text-lg text-[#FF4136] leading-none">{player.totalLosses}</span><span className="text-[6px] text-white/20 uppercase font-black tracking-tighter">Losses</span></div></div></div></BentoBox>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <BentoBox className="h-full" contentClassName="h-full"><IntelHeader title={t?.allTimeStats} icon={HistoryIcon} /><div className="grid grid-cols-2 gap-y-3"><TerminalStat size="text-lg" label={t?.thSessions} value={player.totalSessionsPlayed} /><TerminalStat size="text-lg" label="Career WR" value={careerWinRate} color="#fff" /><TerminalStat size="text-lg" label={t?.thG} value={player.totalGoals} /><TerminalStat size="text-lg" label={t?.thA} value={player.totalAssists} /></div></BentoBox>
                                <BentoBox className="h-full" contentClassName="h-full flex flex-col"><IntelHeader title={t?.careerStats} icon={StarIcon} accent="#FFD700" /><div className="flex-grow flex flex-col justify-center"><div className="grid grid-cols-2 gap-2 items-center justify-items-center h-full"><TerminalStat size="text-lg" label={t?.goalsPerSession} value={goalsPerSession} color="#fff" /><TerminalStat size="text-lg" label={t?.assistsPerSession} value={assistsPerSession} color="#fff" /></div></div></BentoBox>
                                <BentoBox className="h-full" contentClassName="h-full flex flex-col"><IntelHeader title={t?.bestSessionTitle} icon={TrophyIcon} accent="#FFD700" /><div className="flex-grow flex flex-col justify-center"><div className="grid grid-cols-3 gap-1 items-center justify-items-center h-full"><TerminalStat size="text-lg" label="G" value={safeRecords.bestGoalsInSession?.value || 0} /><TerminalStat size="text-lg" label="A" value={safeRecords.bestAssistsInSession?.value || 0} /><TerminalStat size="text-lg" label="Win%" value={`${safeRecords.bestWinRateInSession?.value || 0}%`} color="#fff" /></div></div></BentoBox>
                            </div>

                            <BentoBox className="mb-12"><IntelHeader title={t?.awards} icon={AwardIcon} accent="#FF00D6" /><div className="grid grid-cols-8 sm:grid-cols-10 lg:grid-cols-12 gap-3">{ALL_BADGES.map(badge => { const isEarned = !!(player.badges && player.badges[badge]); return (<div key={badge} title={t[`badge_${badge}_desc` as keyof typeof t] || t[`badge_${badge}` as keyof typeof t]} className={`transition-all duration-500 transform hover:scale-125 cursor-help ${!isEarned ? 'opacity-[0.03] grayscale' : ''}`}><BadgeIcon badge={badge} count={player.badges?.[badge]} className="w-8 h-8" /></div>); })}</div></BentoBox>
                        </div>
                    </div>
                    <div className="h-14 shrink-0 w-full"></div>
                </div>
            </div>
        </div>
    );
};
