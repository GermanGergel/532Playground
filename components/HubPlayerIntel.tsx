
import React, { useMemo } from 'react';
import { useApp } from '../context';
import { HubProgressChart } from './HubAnalytics';
import { StarIcon, TrophyIcon, BarChartDynamic, History as HistoryIcon, Zap, Users, ChevronLeft, AwardIcon, Target, Calendar, ExclamationIcon } from '../icons';
import { PlayerForm, SkillType, Player, PlayerStatus, BadgeType, PlayerTier } from '../types';
import { convertCountryCodeAlpha3ToAlpha2 } from '../utils/countries';
import { BadgeIcon } from '../features';
import { translations } from '../translations/index';

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

// TIER COLORS FOR GLOW
const TIER_COLORS = {
    [PlayerTier.Legend]: '#d946ef', // Fuchsia/Purple
    [PlayerTier.Elite]: '#fbbf24',  // Amber/Gold
    [PlayerTier.Pro]: '#E2E8F0',    // Slate/Silver
    [PlayerTier.Regular]: '#00F2FE' // Cyan/Blue
};

// CLEANED HEADER
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

// BENTO BOX - "PREMIUM CYBER" EDITION
const BentoBox = ({ children, className = "", noPadding = false, contentClassName = "" }: any) => (
    <div className={`
        relative overflow-hidden rounded-3xl 
        bg-gradient-to-br from-[#161b22] to-[#0a0d14]
        border border-white/[0.06]
        shadow-[0_25px_50px_-12px_rgba(0,0,0,0.9),inset_0_1px_1px_rgba(255,255,255,0.05)]
        group
        ${className}
    `}>
        {/* Texture */}
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none z-0" style={{ 
            backgroundImage: `linear-gradient(45deg, #fff 25%, transparent 25%, transparent 50%, #fff 50%, #fff 75%, transparent 75%, transparent)`,
            backgroundSize: '4px 4px'
        }}></div>

        {/* Ambient Glow */}
        <div className="absolute -top-10 -left-10 w-32 h-32 rounded-full blur-[50px] opacity-10 pointer-events-none z-0 bg-[#00F2FE]/[0.05]"></div>

        <div className={`relative z-10 ${noPadding ? '' : 'p-5'} ${contentClassName}`}>
            {children}
        </div>
    </div>
);

const skillAbbreviations: Record<SkillType, string> = {
    goalkeeper: 'GK',
    power_shot: 'PS',
    technique: 'TQ',
    defender: 'DF',
    playmaker: 'PM',
    finisher: 'FN',
    versatile: 'VS',
    tireless_motor: 'TM',
    leader: 'LD',
};

interface HubPlayerIntelProps {
    playerId: string;
    onBack: () => void;
}

// FIX: Exported HubPlayerIntel to resolve the import error in ClubIntelligenceDashboard
export const HubPlayerIntel: React.FC<HubPlayerIntelProps> = ({ playerId, onBack }) => {
    const { allPlayers, language } = useApp();
    const t = translations[language];

    const player = useMemo(() => allPlayers.find(p => p.id === playerId), [allPlayers, playerId]);

    if (!player) return null;

    const countryCodeAlpha2 = useMemo(() => player.countryCode ? convertCountryCodeAlpha3ToAlpha2(player.countryCode) : null, [player.countryCode]);
    const tierColor = TIER_COLORS[player.tier] || '#94a3b8';

    const winRate = player.totalGames > 0 ? `${Math.round((player.totalWins / player.totalGames) * 100)}%` : 'N/A';

    return (
        <div className="absolute inset-0 z-30 flex flex-col animate-in slide-in-from-right duration-500 overflow-hidden rounded-[2.5rem]">
            {/* Background */}
            <div className="absolute inset-0 z-0 pointer-events-none">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#0a1121] via-[#01040a] to-[#01040a]"></div>
                <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]"></div>
            </div>

            {/* Header / Nav */}
            <div className="pt-6 pb-3 px-8 flex items-center justify-between shrink-0 z-10">
                <button onClick={onBack} className="flex items-center gap-3 group transition-all ml-4 md:ml-40 hover:scale-110 active:scale-95">
                    <div className="p-2.5 rounded-full bg-white/5 border border-white/10 shadow-lg group-hover:border-[#00F2FE] group-hover:text-[#00F2FE] group-hover:bg-[#00F2FE]/10 transition-all">
                        <ChevronLeft className="w-4 h-4 text-white group-hover:text-[#00F2FE]" />
                    </div>
                    <span className="text-[10px] font-black font-chakra uppercase tracking-[0.4em] text-white/40 group-hover:text-white transition-colors">Return</span>
                </button>
            </div>

            {/* Scroll Content */}
            <div className="flex-grow overflow-y-auto px-4 md:px-8 pb-32 custom-hub-scrollbar relative z-10">
                <div className="max-w-7xl mx-auto grid grid-cols-12 gap-6 items-start">
                    
                    {/* LEFT COLUMN: HERO CARD & PRIMARY BIO */}
                    <div className="col-span-12 md:col-span-4 flex flex-col gap-6">
                        {/* PORTRAIT BLOCK */}
                        <BentoBox className="relative aspect-[3/4.2] overflow-hidden !p-0 border-white/20 shadow-2xl">
                             {player.playerCard && (
                                <div 
                                    className="absolute inset-0 bg-cover bg-no-repeat transition-transform duration-[2000ms] hover:scale-110" 
                                    style={{ backgroundImage: `url(${player.playerCard})`, backgroundPosition: 'center 5%' }} 
                                />
                            )}
                            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent"></div>
                            
                            {/* Skills Sidebar */}
                            <div className="absolute top-24 left-5 z-20 space-y-4">
                                {(player.skills || []).map(skill => (
                                    <div key={skill} className="flex items-center gap-2 group/skill">
                                        <StarIcon className="w-4 h-4 text-[#00F2FE] drop-shadow-[0_0_8px_#00F2FE]" />
                                        <span className="font-bold text-[10px] text-white tracking-widest uppercase opacity-80 group-hover/skill:opacity-100">{skillAbbreviations[skill]}</span>
                                    </div>
                                ))}
                            </div>

                            <div className="absolute bottom-6 left-6 right-6 flex flex-col gap-1">
                                <div className="flex items-center justify-between">
                                    <div className="flex flex-col">
                                        <span className="font-russo text-4xl text-white uppercase tracking-tight leading-none">{player.nickname}</span>
                                        <span className="font-chakra font-black text-lg text-white/60 uppercase tracking-widest leading-none mt-1">{player.surname}</span>
                                    </div>
                                    <div className="flex flex-col items-end leading-none">
                                        <span className="font-russo text-5xl text-[#00F2FE]" style={{ textShadow: '0 0 20px rgba(0, 242, 254, 0.4)' }}>{player.rating}</span>
                                        <span className="text-[10px] font-black text-white/40 tracking-[0.2em] mt-1">OVR</span>
                                    </div>
                                </div>
                                <div className="h-px w-full bg-gradient-to-r from-white/20 via-white/5 to-transparent mt-4 mb-2"></div>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        {countryCodeAlpha2 && <img src={`https://flagcdn.com/w40/${countryCodeAlpha2.toLowerCase()}.png`} className="w-6 h-auto rounded shadow-lg" alt="" />}
                                        <span className="text-[9px] font-black text-white/40 tracking-[0.2em] uppercase">{player.tier} • UNIT IDENTIFIED</span>
                                    </div>
                                    <FormArrowIndicator form={player.form} />
                                </div>
                            </div>
                        </BentoBox>

                        {/* BIO DATA */}
                        <BentoBox className="border-indigo-500/20 bg-indigo-900/5">
                            <IntelHeader title="Vital Statistics" icon={Users} accent="#818cf8" />
                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-3 rounded-2xl bg-black/40 border border-white/5 flex flex-col gap-1">
                                    <span className="text-[8px] font-black text-white/30 uppercase tracking-[0.2em]">Joined Club</span>
                                    <span className="text-sm font-chakra font-black text-white">{new Date(player.createdAt).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' }).toUpperCase()}</span>
                                </div>
                                <div className="p-3 rounded-2xl bg-black/40 border border-white/5 flex flex-col gap-1">
                                    <span className="text-[8px] font-black text-white/30 uppercase tracking-[0.2em]">Win Ratio</span>
                                    <span className="text-sm font-chakra font-black text-white">{winRate}</span>
                                </div>
                                <div className="p-3 rounded-2xl bg-black/40 border border-white/5 flex flex-col gap-1">
                                    <span className="text-[8px] font-black text-white/30 uppercase tracking-[0.2em]">Sessions</span>
                                    <span className="text-sm font-chakra font-black text-white">{player.totalSessionsPlayed}</span>
                                </div>
                                <div className="p-3 rounded-2xl bg-black/40 border border-white/5 flex flex-col gap-1">
                                    <span className="text-[8px] font-black text-white/30 uppercase tracking-[0.2em]">Total Wins</span>
                                    <span className="text-sm font-chakra font-black text-white">{player.totalWins}</span>
                                </div>
                            </div>
                        </BentoBox>
                    </div>

                    {/* RIGHT COLUMN: ANALYTICS & AWARDS */}
                    <div className="col-span-12 md:col-span-8 flex flex-col gap-6">
                        {/* PERFORMANCE CHART */}
                        <BentoBox className="h-[380px] !p-0">
                            <HubProgressChart history={player.historyData || []} headerTitle="Progression Analytics" />
                        </BentoBox>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            {/* RECORDS */}
                            <BentoBox>
                                <IntelHeader title="Hall of Records" icon={TrophyIcon} accent="#FFD700" />
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between p-4 rounded-2xl bg-black/40 border border-white/5 group/rec transition-all hover:bg-white/[0.02]">
                                        <div className="flex flex-col gap-1">
                                            <span className="text-[8px] font-black text-white/30 uppercase tracking-[0.2em]">Max Goals (Sess)</span>
                                            <span className="text-2xl font-russo text-white/90 group-hover/rec:text-[#FFD700] transition-colors">{player.records?.bestGoalsInSession?.value || 0}</span>
                                        </div>
                                        <Target className="w-8 h-8 text-white/5 group-hover/rec:text-[#FFD700]/20 transition-colors" />
                                    </div>
                                    <div className="flex items-center justify-between p-4 rounded-2xl bg-black/40 border border-white/5 group/rec transition-all hover:bg-white/[0.02]">
                                        <div className="flex flex-col gap-1">
                                            <span className="text-[8px] font-black text-white/30 uppercase tracking-[0.2em]">Max Assists (Sess)</span>
                                            <span className="text-2xl font-russo text-white/90 group-hover/rec:text-[#FFD700] transition-colors">{player.records?.bestAssistsInSession?.value || 0}</span>
                                        </div>
                                        <Zap className="w-8 h-8 text-white/5 group-hover/rec:text-[#FFD700]/20 transition-colors" />
                                    </div>
                                </div>
                            </BentoBox>

                            {/* CURRENT FORM TREND */}
                            <BentoBox>
                                <IntelHeader title="Current Trajectory" icon={Zap} accent="#4CFF5F" />
                                <div className="flex flex-col h-full">
                                     <div className="flex-grow flex items-end justify-around gap-2 px-2 pb-2 h-32">
                                        {(player.sessionHistory || []).map((sess, i) => {
                                            const h = Math.max(sess.winRate, 5);
                                            const color = sess.winRate >= 60 ? '#4CFF5F' : sess.winRate <= 30 ? '#FF4136' : '#A9B1BD';
                                            return (
                                                <div key={i} className="flex-1 flex flex-col items-center gap-2 group/bar">
                                                    <div className="w-full relative rounded-t-lg transition-all duration-700" style={{ height: `${h}%`, backgroundColor: color, opacity: 0.15 + (i * 0.15) }}>
                                                        <div className="absolute top-0 left-0 right-0 h-0.5 bg-white/20 group-hover/bar:bg-white transition-colors"></div>
                                                    </div>
                                                    <span className="text-[8px] font-mono text-white/20">{sess.winRate}%</span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                    <div className="h-px w-full bg-white/5 mt-2 mb-4"></div>
                                    <p className="text-[10px] text-white/40 italic font-chakra text-center">Trend based on last 5 operational sessions.</p>
                                </div>
                            </BentoBox>
                        </div>

                        {/* AWARDS GRID */}
                        <BentoBox>
                            <IntelHeader title="Decorations & Accomplishments" icon={AwardIcon} accent="#FFD700" />
                            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-4">
                                {ALL_BADGES.map(badge => {
                                    const isEarned = player.badges && player.badges[badge];
                                    const count = player.badges?.[badge];
                                    if (!isEarned) return null;
                                    return (
                                        <div key={badge} className="flex flex-col items-center gap-2 p-3 rounded-2xl bg-black/40 border border-white/5 group/badge transition-all hover:bg-white/5">
                                            <div className="relative transition-transform duration-500 group-hover/badge:scale-110">
                                                <BadgeIcon badge={badge} className="w-10 h-10 drop-shadow-[0_0_10px_rgba(255,215,0,0.15)]" />
                                                {count && count > 1 && (
                                                    <div className="absolute -top-1 -right-2 bg-black/80 border border-white/10 rounded-full px-1 py-0.5 z-10">
                                                        <span className="text-[8px] font-black text-[#FFD700]">x{count}</span>
                                                    </div>
                                                )}
                                            </div>
                                            <span className="text-[7px] font-black text-white/40 uppercase tracking-tighter text-center group-hover/badge:text-white transition-colors">{t[`badge_${badge}` as keyof typeof t]}</span>
                                        </div>
                                    );
                                })}
                                {Object.keys(player.badges || {}).length === 0 && (
                                    <div className="col-span-full py-10 flex flex-col items-center opacity-10">
                                        <AwardIcon className="w-12 h-12 mb-3" />
                                        <span className="text-xs uppercase font-black tracking-widest">No Decorations</span>
                                    </div>
                                )}
                            </div>
                        </BentoBox>
                    </div>
                </div>
            </div>
        </div>
    );
};
