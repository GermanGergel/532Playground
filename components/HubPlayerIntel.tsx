
import React, { useMemo } from 'react';
import { useApp } from '../context';
import { HubProgressChart } from './HubAnalytics';
import { StarIcon, TrophyIcon, BarChartDynamic, History as HistoryIcon, Zap, Users, ChevronLeft, AwardIcon, Target, Calendar } from '../icons';
import { PlayerForm, SkillType, Player, PlayerStatus, BadgeType, PlayerTier } from '../types';
import { convertCountryCodeAlpha3ToAlpha2 } from '../utils/countries';
import { BadgeIcon } from '../features';
import { translations } from '../translations/index';

// --- COLORS SYNCED WITH ROSTER ---
const TIER_COLORS = {
    [PlayerTier.Legend]: '#d946ef',
    [PlayerTier.Elite]: '#fbbf24',
    [PlayerTier.Pro]: '#E2E8F0',
    [PlayerTier.Regular]: '#00F2FE'
};

// --- LOCAL TERMINAL-ONLY UI COMPONENTS ---

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

const IntelHeader = ({ title, icon: Icon, accent = "#00F2FE" }: any) => (
    <div className="flex items-center justify-between px-1 mb-3 relative z-20">
        <div className="flex items-center gap-3 flex-grow">
            <div className="p-1.5 rounded-lg bg-white/5 border border-white/10 text-white/80 shadow-inner">
                <Icon className="w-3 h-3" style={{ color: accent }} />
            </div>
            <h4 className="font-audiowide text-[9px] text-white/60 tracking-[0.2em] uppercase">{title}</h4>
            <div className="h-[1px] flex-grow bg-white/5 ml-2"></div>
        </div>
    </div>
);

// CLEAN BENTO BOX WITHOUT INTERNAL GLOWS
const BentoBox = ({ children, className = "", noPadding = false, contentClassName = "" }: any) => (
    <div className={`
        relative overflow-hidden rounded-3xl 
        bg-[#11161d]
        border border-white/[0.06]
        shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]
        ${noPadding ? '' : 'p-4'} ${className}
    `}>
        <div className={`relative z-10 flex flex-col ${contentClassName}`}>
            {children}
        </div>
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

const TerminalLastSession = ({ player, tierColor }: { player: Player, tierColor: string }) => {
    const b = player.lastRatingChange;
    if (!b) return <div className="text-center py-6 opacity-10 text-[9px] uppercase font-black">No Data</div>;
    const earnedBadges = b.badgesEarned || [];

    return (
        <div className="space-y-2.5 pb-1">
            <div className="flex justify-center items-center gap-8 bg-black/20 p-2 rounded-2xl border border-white/5">
                <div className="text-center w-16">
                    <span className="text-2xl font-black text-white/30 block leading-none">{Math.round(b.previousRating)}</span>
                    <span className="text-[5px] text-white/20 uppercase font-black tracking-widest mt-1 block">PREV</span>
                </div>
                <div className="flex flex-col items-center w-12">
                    <span className={`text-lg font-black leading-none ${b.finalChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {b.finalChange > 0 ? '+' : ''}{b.finalChange.toFixed(1)}
                    </span>
                    <span className="text-[6px] text-white/40 uppercase font-black tracking-widest mt-1 block">DELTA</span>
                </div>
                <div className="text-center w-16">
                    <span className="text-2xl font-black block leading-none" style={{ color: tierColor }}>{Math.round(b.newRating)}</span>
                    <span className="text-[5px] uppercase font-black tracking-widest mt-1 block" style={{ color: tierColor, opacity: 0.6 }}>NEW</span>
                </div>
            </div>
            <div className="grid grid-cols-3 gap-1">
                {[
                    { l: 'Team', v: b.teamPerformance },
                    { l: 'Indiv', v: b.individualPerformance },
                    { l: 'Badge', v: b.badgeBonus }
                ].map(stat => (
                    <div key={stat.l} className="bg-black/20 p-1.5 rounded-xl border border-white/5 text-center">
                        <span className={`text-[9px] font-bold block leading-none ${stat.v > 0 ? 'text-white' : stat.v < 0 ? 'text-red-400' : 'text-white/40'}`}>
                            {stat.v > 0 ? '+' : ''}{stat.v.toFixed(1)}
                        </span>
                        <span className="text-[5px] text-white/20 uppercase font-black tracking-tighter block mt-0.5">{stat.l}</span>
                    </div>
                ))}
            </div>
            {earnedBadges.length > 0 && (
                <div className="pt-2 border-t border-white/5">
                    <span className="text-[5px] text-white/20 uppercase font-black tracking-[0.2em] mb-1.5 block text-center">Awards Earned</span>
                    <div className="flex wrap justify-center gap-1.5">
                        {earnedBadges.slice(0, 4).map((badge, idx) => (
                            <div key={idx} className="transition-transform hover:scale-110"><BadgeIcon badge={badge} className="w-5 h-5" /></div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

const TerminalSessionTrend = ({ history }: { history?: Player['sessionHistory'] }) => {
    const safeHistory = history || [];
    const displayData = Array.from({ length: 5 }).map((_, i) => {
        const realItem = safeHistory[safeHistory.length - (5 - i)];
        return realItem ? { winRate: realItem.winRate, isDemo: false } : { winRate: 0, iDemo: true };
    });
    return (
        <div className="flex justify-between items-end h-14 px-6 relative">
            <div className="absolute left-6 right-6 bottom-0 h-px bg-white/5"></div>
            {displayData.map((s, i) => {
                const color = s.winRate > 60 ? '#4CFF5F' : s.winRate < 40 ? '#FF4136' : '#A9B1BD';
                const barHeight = Math.max(s.winRate, 15); 
                return (
                    <div key={i} className="flex flex-col items-center gap-1.5 h-full justify-end group/bar relative">
                        <div className={`w-6 rounded-t-sm transition-all duration-1000 ease-out relative ${s.iDemo ? 'opacity-0' : 'opacity-100'}`} style={{ height: `${barHeight}%`, background: `linear-gradient(to top, ${color}22, ${color})`, borderTop: `1px solid ${color}88` }} />
                        <span className={`text-[6px] font-black tracking-tighter ${s.iDemo ? 'text-white/0' : 'text-white/30'}`}>
                            {s.iDemo ? '' : `S${safeHistory.length - (4 - i)}`}
                        </span>
                    </div>
                );
            })}
        </div>
    );
};

export const HubPlayerIntel: React.FC<{ playerId: string; onBack: () => void }> = ({ playerId, onBack }) => {
    const { allPlayers, language } = useApp();
    const t = translations[language];
    const player = useMemo(() => (allPlayers.find(p => p.id === playerId)) as Player, [allPlayers, playerId]);
    const rankings = useMemo(() => {
        const confirmedPlayers = allPlayers.filter(p => p.status === PlayerStatus.Confirmed);
        if (confirmedPlayers.length === 0) return { goals: '-', assists: '-', rating: '-', total: 0 };
        const sortedByGoals = [...confirmedPlayers].sort((a, b) => b.totalGoals - a.totalGoals);
        const sortedByAssists = [...confirmedPlayers].sort((a, b) => b.totalAssists - a.totalAssists);
        const sortedByRating = [...confirmedPlayers].sort((a, b) => b.rating - a.rating);
        return {
            goals: sortedByGoals.findIndex(p => p.id === player.id) + 1 || '-',
            assists: sortedByAssists.findIndex(p => p.id === player.id) + 1 || '-',
            rating: sortedByRating.findIndex(p => p.id === player.id) + 1 || '-',
            total: confirmedPlayers.length
        };
    }, [allPlayers, player.id]);

    if (!player) return null;
    const tierColor = TIER_COLORS[player.tier] || '#00F2FE';
    const countryCodeAlpha2 = player.countryCode ? convertCountryCodeAlpha3ToAlpha2(player.countryCode) : 'VN';
    const winRate = player.totalGames > 0 ? `${Math.round((player.totalWins / player.totalGames) * 100)}%` : '0%';
    const goalsPerSession = player.totalSessionsPlayed > 0 ? (player.totalGoals / player.totalSessionsPlayed).toFixed(2) : '0.00';
    const assistsPerSession = player.totalSessionsPlayed > 0 ? (player.totalAssists / player.totalSessionsPlayed).toFixed(2) : '0.00';

    return (
        <div className="absolute inset-0 z-20 flex flex-col animate-in fade-in duration-700 rounded-[2.5rem] overflow-hidden">
            <div className="absolute inset-0 z-0 pointer-events-none bg-[#02040a]">
                <div className="absolute inset-0 opacity-5 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]"></div>
            </div>

            <div className="relative z-10 flex-grow overflow-y-auto custom-hub-scrollbar">
                <div className="w-full max-w-5xl mx-auto px-6 md:px-12 lg:px-20 py-8 pb-48">
                    <div className="flex items-center justify-between mb-8">
                        <button onClick={onBack} className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-all">
                            <ChevronLeft className="w-5 h-5 text-white" />
                        </button>
                        <div className="h-px flex-grow mx-6 bg-white/5"></div>
                    </div>

                    {/* MAIN WRAPPER WITH THE PERIMETER GLOW */}
                    <div 
                        className="p-1 rounded-[2.8rem] transition-all duration-1000"
                        style={{ 
                            boxShadow: `0 0 45px -15px ${tierColor}44`,
                            border: `1px solid ${tierColor}22` 
                        }}
                    >
                        <div className="flex flex-col md:flex-row gap-4 items-stretch">
                            <div className="w-full md:w-[220px] shrink-0">
                                <div className="relative aspect-[3/4] rounded-3xl overflow-hidden border border-white/10 bg-[#0c1015]">
                                    {player.playerCard && <div className="absolute inset-0 bg-cover bg-no-repeat opacity-90" style={{ backgroundImage: `url(${player.playerCard})`, backgroundPosition: 'center 5%' }}/>}
                                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent"></div>
                                    <div className="absolute inset-0 p-4 flex flex-col justify-between pointer-events-none">
                                        <div className="flex justify-between items-start">
                                            <div className="flex flex-col items-start">
                                                <span className="font-black text-xl leading-none" style={{ color: tierColor }}>532</span>
                                                {countryCodeAlpha2 && <img src={`https://flagcdn.com/w80/${countryCodeAlpha2.toLowerCase()}.png`} className="w-4 h-auto mt-3 rounded-sm opacity-60" alt="" />}
                                            </div>
                                            <div className="flex flex-col items-end">
                                                <div className="text-3xl font-black leading-none" style={{ color: tierColor }}>{player.rating}</div>
                                                <p className="font-black text-[8px] tracking-[0.2em] text-white mt-1">OVR</p>
                                            </div>
                                        </div>
                                        <div className="text-center">
                                            <h1 className="font-russo text-2xl uppercase tracking-tighter text-white truncate w-full">{player.nickname}</h1>
                                            <p className="text-[7px] font-black text-white/40 uppercase tracking-[0.4em] mt-1">{player.tier}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="flex-grow grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <BentoBox>
                                    <IntelHeader title={t.lastSessionAnalysis} icon={BarChartDynamic} accent={tierColor} />
                                    <TerminalLastSession player={player} tierColor={tierColor} />
                                </BentoBox>

                                <BentoBox>
                                    <IntelHeader title={t.sessionTrend} icon={Zap} accent="#4CFF5F" />
                                    <div className="grid grid-cols-3 gap-2 items-center bg-black/20 p-2 rounded-2xl border border-white/5">
                                        <TerminalStat label="Current Form" value={player.form.split('_')[0].toUpperCase()} color={player.form === 'hot_streak' ? '#4CFF5F' : player.form === 'cold_streak' ? '#FF4136' : '#fff'} />
                                        <TerminalStat label="Win Ratio" value={winRate} color={tierColor} />
                                        <div className="flex justify-center"><FormArrowIndicator form={player.form} /></div>
                                    </div>
                                    <div className="py-2 bg-black/20 rounded-2xl border border-white/5 mt-auto"><TerminalSessionTrend history={player.sessionHistory} /></div>
                                </BentoBox>

                                <BentoBox className="!p-3">
                                    <IntelHeader title={t.clubRankings} icon={Users} accent="#FF00D6" />
                                    <div className="grid grid-cols-3 gap-0.5 text-center mt-2">
                                        <TerminalStat label="SCORER" value={rankings.goals} subValue={`/${rankings.total}`} />
                                        <TerminalStat label="ASSISTANT" value={rankings.assists} subValue={`/${rankings.total}`} />
                                        <TerminalStat label="RATING" value={rankings.rating} subValue={`/${rankings.total}`} color={tierColor} />
                                    </div>
                                </BentoBox>

                                <BentoBox className="!p-3">
                                    <IntelHeader title={t.monthlyStatsTitle} icon={Calendar} accent={tierColor} />
                                    <div className="grid grid-cols-2 gap-y-2 mt-1">
                                        <TerminalStat size="text-lg" label={t.monthlyWins} value={player.monthlyWins} />
                                        <TerminalStat size="text-lg" label={t.monthlyGoals} value={player.monthlyGoals} />
                                        <TerminalStat size="text-lg" label={t.monthlyAssists} value={player.monthlyAssists} />
                                        <TerminalStat size="text-lg" label={t.session} value={player.monthlySessionsPlayed} />
                                    </div>
                                </BentoBox>
                            </div>
                        </div>

                        <div className="w-full mt-4">
                            <BentoBox noPadding className="h-[280px]">
                                <HubProgressChart headerTitle={t.statistics} history={player.historyData || []} />
                            </BentoBox>
                        </div>

                        <BentoBox className="mt-4 !py-3 px-6">
                            <div className="flex flex-col md:flex-row items-center gap-6">
                                <IntelHeader title={t.winLossDraw} icon={TrophyIcon} accent="#FFD700" />
                                <div className="flex-grow w-full space-y-1.5">
                                    <div className="flex w-full h-2 rounded-full overflow-hidden bg-black/50 border border-white/5">
                                        <div style={{ width: `${(player.totalWins / (player.totalGames || 1)) * 100}%` }} className="bg-[#4CFF5F]" />
                                        <div style={{ width: `${(player.totalDraws / (player.totalGames || 1)) * 100}%` }} className="bg-white/20" />
                                        <div style={{ width: `${(player.totalLosses / (player.totalGames || 1)) * 100}%` }} className="bg-[#FF4136]" />
                                    </div>
                                </div>
                                <div className="shrink-0 flex gap-6">
                                    <div className="flex flex-col items-center"><span className="text-lg text-[#4CFF5F]">{player.totalWins}</span><span className="text-[6px] text-white/20 uppercase font-black">W</span></div>
                                    <div className="flex flex-col items-center"><span className="text-lg text-white/40">{player.totalDraws}</span><span className="text-[6px] text-white/20 uppercase font-black">D</span></div>
                                    <div className="flex flex-col items-center"><span className="text-lg text-[#FF4136]">{player.totalLosses}</span><span className="text-[6px] text-white/20 uppercase font-black">L</span></div>
                                </div>
                            </div>
                        </BentoBox>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                            <BentoBox>
                                <IntelHeader title={t.allTimeStats} icon={HistoryIcon} accent={tierColor} />
                                <div className="grid grid-cols-2 gap-y-3 mt-2">
                                    <TerminalStat size="text-lg" label={t.thSessions} value={player.totalSessionsPlayed} />
                                    <TerminalStat size="text-lg" label={t.winRate} value={winRate} />
                                    <TerminalStat size="text-lg" label={t.thG} value={player.totalGoals} />
                                    <TerminalStat size="text-lg" label={t.thA} value={player.totalAssists} />
                                </div>
                            </BentoBox>
                            <BentoBox>
                                <IntelHeader title="Career Averages" icon={StarIcon} accent="#FFD700" />
                                <div className="grid grid-cols-2 gap-2 items-center h-full mt-2">
                                    <TerminalStat size="text-lg" label={t.goalsPerSession} value={goalsPerSession} />
                                    <TerminalStat size="text-lg" label={t.assistsPerSession} value={assistsPerSession} />
                                </div>
                            </BentoBox>
                            <BentoBox>
                                <IntelHeader title={t.bestSessionTitle} icon={TrophyIcon} accent="#FFD700" />
                                <div className="grid grid-cols-3 gap-1 items-center h-full mt-2">
                                    <TerminalStat size="text-lg" label="G" value={player.records?.bestGoalsInSession?.value || 0} />
                                    <TerminalStat size="text-lg" label="A" value={player.records?.bestAssistsInSession?.value || 0} />
                                    <TerminalStat size="text-lg" label="Win%" value={`${player.records?.bestWinRateInSession?.value || 0}%`} />
                                </div>
                            </BentoBox>
                        </div>

                        <BentoBox className="mt-4">
                            <IntelHeader title="Awards Catalog" icon={AwardIcon} accent="#FF00D6" />
                            <div className="grid grid-cols-8 sm:grid-cols-10 lg:grid-cols-12 gap-3 mt-4">
                                {ALL_BADGES.map(badge => {
                                    const isEarned = !!(player.badges && player.badges[badge]);
                                    return (
                                        <div key={badge} className={`transition-all transform hover:scale-110 ${!isEarned ? 'opacity-5 grayscale' : ''}`}>
                                            <BadgeIcon badge={badge} count={player.badges?.[badge]} className="w-8 h-8" />
                                        </div>
                                    );
                                })}
                            </div>
                        </BentoBox>
                    </div>
                </div>
            </div>
        </div>
    );
};
