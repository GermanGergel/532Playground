
import React from 'react';
import { useApp } from '../context';
import { translations } from '../translations/index';
import { BadgeType, SkillType } from '../types';
import { BadgeIcon } from '../features';
import { StarIcon, TrophyIcon, LightbulbIcon, InfoIcon, Zap, ExclamationIcon, RefreshCw, Users } from '../icons';

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

const ALL_SKILLS: SkillType[] = [
    'goalkeeper', 'power_shot', 'technique', 'defender', 'playmaker', 
    'finisher', 'versatile', 'tireless_motor', 'leader'
];

const IntelSectionHeader = ({ title, icon: Icon, accent = "#00F2FE" }: any) => (
    <div className="flex items-center gap-3 mb-6">
        <div className="p-2 rounded-xl bg-white/5 border border-white/10 shadow-[0_0_15px_rgba(0,242,254,0.1)] shrink-0">
            <Icon className="w-4 h-4" style={{ color: accent }} />
        </div>
        <h4 className="font-russo text-lg text-white tracking-tight leading-none uppercase">{title}</h4>
        <div className="h-px flex-grow bg-gradient-to-r from-white/10 to-transparent ml-4"></div>
    </div>
);

// Компонент для иконки судейской карточки
const RefereeCardIcon = () => (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 text-red-500 drop-shadow-[0_0_8px_rgba(239,68,68,0.6)]">
        <rect x="7" y="4" width="10" height="16" rx="1.5" />
    </svg>
);

export const HubInfo: React.FC = () => {
    const { language } = useApp();
    const t = translations[language];

    return (
        <div className="absolute inset-0 z-20 flex flex-col animate-in fade-in duration-500 rounded-[2.5rem] overflow-hidden">
            {/* Background: Dashboard Style (Dark Radial + Carbon) - Extending behind nav */}
            <div className="absolute -top-24 bottom-0 -left-4 -right-4 z-0 pointer-events-none">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#0f172a] via-[#05070a] to-black"></div>
                <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]"></div>
            </div>

            {/* Scrollable Content Container */}
            <div className="relative z-10 flex-grow overflow-y-auto custom-hub-scrollbar">
                <div className="space-y-16 pb-32 pt-12 w-full max-w-3xl mx-auto px-6">
                    
                    {/* 1. HOW RATING WORKS */}
                    <section>
                        <IntelSectionHeader title={t.ratingCalculationTitle} icon={InfoIcon} />
                        <div className="space-y-6">
                            <p className="text-base text-white/70 leading-relaxed font-medium pl-1">
                                {t.ratingCalculationDesc}
                            </p>
                            
                            {/* Compact Glass Card */}
                            <div className="p-6 rounded-3xl bg-black/40 backdrop-blur-md border border-white/10 shadow-2xl relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-[#00F2FE]/5 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"></div>
                                
                                <h5 className="font-black text-[10px] tracking-[0.2em] text-[#00F2FE] uppercase mb-6 flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-[#00F2FE] animate-pulse"></div>
                                    {t.ratingCalculationExamplesTitle}
                                </h5>
                                
                                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4 relative z-10">
                                    {[
                                        t.ratingExampleWinStrong, t.ratingExampleWinClose, t.ratingExampleDraw,
                                        t.ratingExampleLossClose, t.ratingExampleLossHeavy, t.ratingExampleGoal,
                                        t.ratingExampleAssist, t.ratingExampleCleanSheet
                                    ].map((ex, i) => (
                                        <li key={i} className="flex items-start gap-3 text-xs font-bold text-white/70 group border-l-2 border-white/5 pl-3 hover:border-[#00F2FE]/40 transition-colors">
                                            <span className="text-[#00F2FE]/50 font-mono text-[10px]">{(i+1).toString().padStart(2, '0')}</span>
                                            <span className="leading-snug">{ex}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            {/* NEW: RATING RULES (Inactivity & Protection) */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="p-5 rounded-2xl bg-amber-500/5 border border-amber-500/10 hover:bg-amber-500/10 transition-colors">
                                    <div className="flex items-center gap-3 mb-2">
                                        <RefreshCw className="w-4 h-4 text-amber-500" />
                                        <h5 className="font-black text-white text-xs uppercase">{t.infoInactivityTitle}</h5>
                                    </div>
                                    <p className="text-xs text-white/60 leading-relaxed">{t.infoInactivityDesc}</p>
                                </div>
                                <div className="p-5 rounded-2xl bg-blue-500/5 border border-blue-500/10 hover:bg-blue-500/10 transition-colors">
                                    <div className="flex items-center gap-3 mb-2">
                                        <div className="w-4 h-4 flex items-center justify-center rounded-full border border-blue-500 text-blue-500 text-[9px] font-black">S</div>
                                        <h5 className="font-black text-white text-xs uppercase">Safety Net</h5>
                                    </div>
                                    <p className="text-xs text-white/60 leading-relaxed">{t.infoRatingProtection}</p>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* 2. LEGIONNAIRE PROTOCOL */}
                    <section>
                        <IntelSectionHeader title={t.infoLegionnaireTitle} icon={Users} accent="#a855f7" />
                        <div className="p-6 rounded-3xl bg-purple-500/5 border border-purple-500/10 shadow-lg relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-48 h-48 bg-purple-500/10 rounded-full blur-[60px] -mr-20 -mt-20 pointer-events-none group-hover:bg-purple-500/20 transition-all"></div>
                            <div className="relative z-10 flex flex-col sm:flex-row gap-6 items-center">
                                <div className="flex-grow text-center sm:text-left">
                                    <p className="text-sm text-white/80 leading-relaxed font-medium mb-4">
                                        {t.infoLegionnaireDesc}
                                    </p>
                                    <div className="flex flex-wrap justify-center sm:justify-start gap-2">
                                        <span className="px-2.5 py-1 bg-purple-500/20 border border-purple-500/30 rounded text-[9px] font-black text-purple-300 uppercase tracking-wider">Mercenary</span>
                                        <span className="px-2.5 py-1 bg-purple-500/20 border border-purple-500/30 rounded text-[9px] font-black text-purple-300 uppercase tracking-wider">Double Agent</span>
                                        <span className="px-2.5 py-1 bg-purple-500/20 border border-purple-500/30 rounded text-[9px] font-black text-purple-300 uppercase tracking-wider">Iron Lung</span>
                                    </div>
                                </div>
                                <div className="shrink-0 p-3 bg-black/40 rounded-xl border border-white/5">
                                    <Users className="w-10 h-10 text-purple-500 opacity-90" />
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* 3. DISCIPLINARY CODE */}
                    <section>
                        <IntelSectionHeader title={t.disciplineTitle} icon={ExclamationIcon} accent="#ef4444" />
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {/* Rule: Handball */}
                            <div className="p-5 rounded-2xl bg-red-500/5 border border-red-500/10 shadow-sm hover:bg-red-500/10 transition-all">
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center text-xl">🧤</div>
                                    <h5 className="font-black text-white text-xs uppercase tracking-tight">{t.ruleHandballTitle}</h5>
                                </div>
                                <p className="text-[11px] text-white/50 mb-4 leading-relaxed line-clamp-3">{t.ruleHandballDesc}</p>
                                <div className="px-3 py-1.5 bg-red-500/20 rounded-lg border border-red-500/30 inline-block">
                                    <span className="text-[9px] font-black text-red-400 uppercase tracking-widest">{t.ruleHandballPenalty}</span>
                                </div>
                            </div>

                            {/* Rule: No Show */}
                            <div className="p-5 rounded-2xl bg-white/5 border border-white/10 shadow-sm hover:bg-white/10 transition-all">
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-xl">💰</div>
                                    <h5 className="font-black text-white text-xs uppercase tracking-tight">{t.ruleNoShowTitle}</h5>
                                </div>
                                <p className="text-[11px] text-white/50 mb-4 leading-relaxed line-clamp-3">{t.ruleNoShowDesc}</p>
                                <div className="px-3 py-1.5 bg-white/10 rounded-lg border border-white/10 inline-block">
                                    <span className="text-[9px] font-black text-white/80 uppercase tracking-widest">{t.ruleNoShowPenalty}</span>
                                </div>
                            </div>

                            {/* Rule: Late */}
                            <div className="p-5 rounded-2xl bg-white/5 border border-white/10 shadow-sm hover:bg-white/10 transition-all">
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-xl">🕒</div>
                                    <h5 className="font-black text-white text-xs uppercase tracking-tight">{t.ruleLateTitle}</h5>
                                </div>
                                <p className="text-[11px] text-white/50 mb-4 leading-relaxed line-clamp-3">{t.ruleLateDesc}</p>
                                <div className="px-3 py-1.5 bg-white/10 rounded-lg border border-white/10 inline-block">
                                    <span className="text-[9px] font-black text-white/80 uppercase tracking-widest">{t.ruleLatePenalty}</span>
                                </div>
                            </div>

                            {/* Rule: Respect */}
                            <div className="p-5 rounded-2xl bg-white/5 border border-white/10 shadow-sm hover:bg-white/10 transition-all">
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center">
                                        <RefereeCardIcon />
                                    </div>
                                    <h5 className="font-black text-white text-xs uppercase tracking-tight">{t.ruleRespectTitle}</h5>
                                </div>
                                <p className="text-[11px] text-white/50 mb-4 leading-relaxed line-clamp-3">{t.ruleRespectDesc}</p>
                                <div className="px-3 py-1.5 bg-white/10 rounded-lg border border-white/10 inline-block">
                                    <span className="text-[9px] font-black text-white/80 uppercase tracking-widest">{t.ruleRespectPenalty}</span>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* 4. BADGE BONUSES - Compacted */}
                    <section>
                        <IntelSectionHeader title={t.badgeBonusTitle} icon={LightbulbIcon} accent="#10b981" />
                        <div className="rounded-3xl bg-emerald-500/5 p-6 border border-emerald-500/10 shadow-lg relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-40 h-40 bg-emerald-500/10 rounded-full blur-[60px] -mr-20 -mt-20"></div>
                            <div className="relative z-10">
                                <h4 className="text-xl font-black text-white mb-2 uppercase tracking-tight">{t.badgeBonusTitle}</h4>
                                <p className="text-xs text-white/50 mb-6 max-w-lg leading-relaxed font-medium">{t.badgeBonusDesc}</p>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="flex items-center gap-4 p-4 rounded-2xl bg-black/40 border border-emerald-500/10 shadow-sm hover:border-emerald-500/30 transition-all">
                                        <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0">
                                            <Zap className="w-5 h-5 text-emerald-500" />
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-xs font-black text-white/90 uppercase tracking-wider">{t.badgeBonusMvp}</span>
                                            <span className="text-[9px] font-bold text-emerald-500/60 uppercase">Elite Protocol</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4 p-4 rounded-2xl bg-black/40 border border-emerald-500/10 shadow-sm hover:border-emerald-500/30 transition-all">
                                        <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0">
                                            <Zap className="w-5 h-5 text-emerald-500" />
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-xs font-black text-white/90 uppercase tracking-wider">{t.badgeBonusTopScorer}</span>
                                            <span className="text-[9px] font-bold text-emerald-500/60 uppercase">Strike Master</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* 5. SKILLS - Compact Grid */}
                    <section>
                        <IntelSectionHeader title="Specializations" icon={StarIcon} accent="#00F2FE" />
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                            {ALL_SKILLS.map(skill => (
                                <div key={skill} className="flex items-center gap-3 p-3 rounded-2xl bg-white/5 border border-white/5 hover:border-[#00F2FE]/30 hover:bg-white/10 transition-all group">
                                    <div className="w-10 h-10 rounded-xl bg-black/40 flex items-center justify-center border border-white/5 group-hover:bg-[#00F2FE]/10 transition-all shrink-0">
                                        <StarIcon className="w-5 h-5 text-[#00F2FE]" style={{ filter: 'drop-shadow(0 0 5px rgba(0,242,254,0.3))' }} />
                                    </div>
                                    <div className="flex flex-col min-w-0">
                                        <span className="text-[11px] font-black text-white/90 uppercase tracking-wide truncate">
                                            {t[`skill_${skill}` as keyof typeof t]}
                                        </span>
                                        <span className="text-[8px] text-white/30 font-bold uppercase tracking-[0.1em] mt-0.5">Combat Skill</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>

                    {/* 6. BADGE ENCYCLOPEDIA */}
                    <section>
                        <IntelSectionHeader title="Awards Catalog" icon={TrophyIcon} accent="#FFD700" />
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-6 pb-12">
                            {ALL_BADGES.map(badge => (
                                <div key={badge} className="flex items-start gap-4 p-2 group hover:bg-white/[0.02] rounded-xl transition-colors">
                                    <div className="shrink-0 pt-1">
                                        <div className="relative transition-transform duration-300 group-hover:scale-110">
                                            <BadgeIcon badge={badge} className="w-10 h-10 drop-shadow-[0_0_8px_rgba(255,215,0,0.1)]" />
                                        </div>
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <span className="font-black text-xs text-white/90 uppercase tracking-widest border-b border-transparent group-hover:border-amber-500/20 transition-all self-start">
                                            {t[`badge_${badge}` as keyof typeof t]}
                                        </span>
                                        <p className="text-[10px] text-white/40 leading-snug font-medium">
                                            {t[`badge_${badge}_desc` as keyof typeof t]}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                </div>
            </div>

            {/* SCROLL FADE BOTTOM ONLY - Унифицирован с Player Hub */}
            <div className="absolute bottom-0 left-0 right-0 h-4 bg-gradient-to-t from-[#05070a] to-transparent z-30 pointer-events-none"></div>
        </div>
    );
};
