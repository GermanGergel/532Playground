
import React, { useState, useEffect } from 'react';
import { Team, Player, PlayerTier, PlayerStatus, BadgeType, PlayerForm, SkillType } from './types';
import { getPlayerKeyStats, calculatePlayerMonthlyStats } from './services/statistics';
import { convertCountryCodeAlpha3ToAlpha2 } from './utils/countries';
import { Button, Modal, Card, useTranslation } from './ui';
import { LastSessionBreakdown, ClubRankings, BestSessionCard } from './components/PlayerCardAnalytics';
import { 
    StarIcon,
    GoleadorBadgeIcon, PerfectFinishBadgeIcon, DynastyBadgeIcon, SniperBadgeIcon,
    AssistantBadgeIcon, MvpBadgeIcon, DecisiveFactorBadgeIcon, UnsungHeroBadgeIcon,
    FirstBloodBadgeIcon, DupletBadgeIcon, MaestroBadgeIcon, ComebackKingsBadgeIcon,
    FortressBadgeIcon, ClubLegendBadgeIcon, VeteranBadgeIcon,
    SessionTopScorerBadgeIcon, StableStrikerBadgeIcon, VictoryFinisherBadgeIcon,
    SessionTopAssistantBadgeIcon, PassingStreakBadgeIcon, TeamConductorBadgeIcon,
    TenInfluenceBadgeIcon, MasteryBalanceBadgeIcon, KeyPlayerBadgeIcon,
    WinLeaderBadgeIcon, IronStreakBadgeIcon, UndefeatedBadgeIcon,
    DominantParticipantBadgeIcon, Career100WinsBadgeIcon, Career150InfluenceBadgeIcon,
    CareerSuperVeteranBadgeIcon,
    // New Legionnaire Icons
    MercenaryBadgeIcon, DoubleAgentBadgeIcon, JokerBadgeIcon, CrisisManagerBadgeIcon, IronLungBadgeIcon,
    TrophyIcon,
    XCircle,
    Globe
} from './icons';
import { useApp } from './context';
import { MiniSquadBadge } from './components/MiniSquadBadge';

// Feature Components

interface PlayerCardProps {
    player: Player;
    onEdit: () => void;
    onDelete: () => void;
    onUploadCard: () => void;
    onConfirmInitialRating: (rating: number) => void;
    onDownloadCard: () => void;
    onShareProfile: () => void;
    isDownloading?: boolean;
}

// FIX: Updated BadgeIcon to properly apply glow classes
interface BadgeIconProps extends React.SVGProps<SVGSVGElement> {
    badge: BadgeType;
    count?: number;
}

export const BadgeIcon: React.FC<BadgeIconProps> = ({ badge, count, className, ...rest }) => {
    const badgeConfig: Record<BadgeType, { Icon: React.FC<any>, colorClass: string }> = {
        goleador: { Icon: GoleadorBadgeIcon, colorClass: 'badge-glow-gold' },
        perfect_finish: { Icon: PerfectFinishBadgeIcon, colorClass: 'badge-glow-gold' },
        dynasty: { Icon: DynastyBadgeIcon, colorClass: 'badge-glow-gold' },
        sniper: { Icon: SniperBadgeIcon, colorClass: 'badge-glow-gold' },
        assistant: { Icon: AssistantBadgeIcon, colorClass: 'badge-glow-gold' },
        mvp: { Icon: MvpBadgeIcon, colorClass: 'badge-glow-gold' },
        decisive_factor: { Icon: DecisiveFactorBadgeIcon, colorClass: 'badge-glow-gold' },
        unsung_hero: { Icon: UnsungHeroBadgeIcon, colorClass: 'badge-glow-gold' },
        first_blood: { Icon: FirstBloodBadgeIcon, colorClass: 'badge-glow-gold' },
        duplet: { Icon: DupletBadgeIcon, colorClass: 'badge-glow-gold' },
        maestro: { Icon: MaestroBadgeIcon, colorClass: 'badge-glow-gold' },
        comeback_kings: { Icon: ComebackKingsBadgeIcon, colorClass: 'badge-glow-gold' },
        fortress: { Icon: FortressBadgeIcon, colorClass: 'badge-glow-gold' },
        club_legend_goals: { Icon: ClubLegendBadgeIcon, colorClass: 'badge-glow-gold' },
        club_legend_assists: { Icon: ClubLegendBadgeIcon, colorClass: 'badge-glow-gold' },
        veteran: { Icon: VeteranBadgeIcon, colorClass: 'badge-glow-gold' },
        // New Badges
        session_top_scorer: { Icon: SessionTopScorerBadgeIcon, colorClass: 'badge-glow-gold' },
        stable_striker: { Icon: StableStrikerBadgeIcon, colorClass: 'badge-glow-gold' },
        victory_finisher: { Icon: VictoryFinisherBadgeIcon, colorClass: 'badge-glow-gold' },
        session_top_assistant: { Icon: SessionTopAssistantBadgeIcon, colorClass: 'badge-glow-gold' },
        passing_streak: { Icon: PassingStreakBadgeIcon, colorClass: 'badge-glow-gold' },
        team_conductor: { Icon: TeamConductorBadgeIcon, colorClass: 'badge-glow-gold' },
        ten_influence: { Icon: TenInfluenceBadgeIcon, colorClass: 'badge-glow-gold' },
        mastery_balance: { Icon: MasteryBalanceBadgeIcon, colorClass: 'badge-glow-gold' },
        key_player: { Icon: KeyPlayerBadgeIcon, colorClass: 'badge-glow-gold' },
        win_leader: { Icon: WinLeaderBadgeIcon, colorClass: 'badge-glow-gold' },
        iron_streak: { Icon: IronStreakBadgeIcon, colorClass: 'badge-glow-gold' },
        undefeated: { Icon: UndefeatedBadgeIcon, colorClass: 'badge-glow-gold' },
        dominant_participant: { Icon: DominantParticipantBadgeIcon, colorClass: 'badge-glow-gold' },
        career_100_wins: { Icon: Career100WinsBadgeIcon, colorClass: 'badge-glow-gold' },
        career_150_influence: { Icon: Career150InfluenceBadgeIcon, colorClass: 'badge-glow-gold' },
        career_super_veteran: { Icon: CareerSuperVeteranBadgeIcon, colorClass: 'badge-glow-gold' },
        // Legionnaire Badges (TURQUOISE)
        mercenary: { Icon: MercenaryBadgeIcon, colorClass: 'badge-glow-turquoise' },
        double_agent: { Icon: DoubleAgentBadgeIcon, colorClass: 'badge-glow-turquoise' },
        joker: { Icon: JokerBadgeIcon, colorClass: 'badge-glow-turquoise' },
        crisis_manager: { Icon: CrisisManagerBadgeIcon, colorClass: 'badge-glow-turquoise' },
        iron_lung: { Icon: IronLungBadgeIcon, colorClass: 'badge-glow-turquoise' },
    };

    const { Icon, colorClass } = badgeConfig[badge] || { Icon: MvpBadgeIcon, colorClass: 'badge-glow-gold' };

    return (
        <div className="relative inline-block">
            <Icon className={`${colorClass} ${className}`} {...rest} />
            {count && count > 1 && (
                <span
                    className="absolute -top-1 -right-2 text-[10px] font-black leading-none"
                    style={{ 
                        color: '#FFD700', 
                        textShadow: '0 0 2px rgba(0,0,0,1)' 
                    }}
                >
                    x{count}
                </span>
            )}
        </div>
    );
};

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

const FormArrowIndicator: React.FC<{ form: PlayerForm }> = ({ form }) => {
    const config = {
        hot_streak: { color: '#4CFF5F' },
        stable: { color: '#A9B1BD' },
        cold_streak: { color: '#FF4136' },
    };
    const currentForm = config[form] || config.stable;
    
    const commonProps: React.SVGProps<SVGSVGElement> = {
        width: "24",
        height: "24",
        viewBox: "0 0 24 24",
        fill: "none",
        stroke: currentForm.color,
        strokeWidth: "2.5",
        strokeLinecap: "round",
        strokeLinejoin: "round",
    };

    switch (form) {
        case 'hot_streak':
            return (
                <svg {...commonProps}><path d="M12 19V5m-6 7l6-6 6 6"/></svg>
            );
        case 'cold_streak':
            return (
                <svg {...commonProps}><path d="M12 5v14M12 5v14M5 12l7 7 7-7"/></svg>
            );
        case 'stable':
        default:
            return (
                <svg {...commonProps}><path d="M5 12h14m-6-6l6 6-6 6"/></svg>
            );
    }
};

const SessionTrendChart: React.FC<{ history?: Player['sessionHistory'] }> = ({ history = [] }) => {
    const t = useTranslation();

    const displayData = Array.from({ length: 5 }).map((_, i) => {
        const item = history[history.length - 5 + i];
        return item ? { winRate: item.winRate } : { winRate: 0 };
    });

    const getBarColor = (winRate: number) => {
        if (winRate > 60) return '#4CFF5F'; // green
        if (winRate < 40) return '#FF4136'; // red
        return '#A9B1BD'; // gray
    };

    const hexToRgba = (hex: string, alpha: number) => {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    };

    return (
        <div className="flex justify-around items-end h-16 px-2 pt-2">
            {displayData.map((session, index) => {
                const height = session.winRate > 0 ? `${Math.max(session.winRate, 15)}%` : '5%';
                const color = getBarColor(session.winRate);

                return (
                    <div
                        key={index}
                        className="w-2.5 rounded-t-full transition-all duration-500 ease-out"
                        style={{
                            height: height,
                            background: `linear-gradient(to top, ${hexToRgba(color, 0.1)}, ${color})`,
                            boxShadow: `0 0 4px ${color}`,
                            opacity: session.winRate > 0 ? 1 : 0.2,
                        }}
                        title={`${t.winRate}: ${session.winRate > 0 ? session.winRate + '%' : 'N/A'}`}
                    />
                );
            })}
        </div>
    );
};

// --- BADGE SORTING & DISPLAY UTILS ---

const BADGE_PRIORITY: Record<BadgeType, number> = {
    // 1. Career Legends & High Difficulty
    'career_100_wins': 100,
    'career_150_influence': 99,
    'career_super_veteran': 98,
    'dynasty': 95,
    
    // 2. Legionnaire (New & Cool)
    'double_agent': 90,
    'mercenary': 89,
    'iron_lung': 88,
    'crisis_manager': 87,
    'joker': 86,

    // 3. Top Session Performance
    'mvp': 85,
    'goleador': 80,
    'assistant': 80,
    'fortress': 75,
    'undefeated': 75,
    'club_legend_goals': 70,
    'club_legend_assists': 70,
    
    // 4. Strong Gameplay
    'session_top_scorer': 65,
    'session_top_assistant': 65,
    'win_leader': 60,
    'perfect_finish': 60,
    'comeback_kings': 60,
    'sniper': 60,
    'decisive_factor': 55,
    
    // 5. Standard
    'ten_influence': 50,
    'mastery_balance': 50,
    'iron_streak': 45,
    'key_player': 45,
    'team_conductor': 40,
    'passing_streak': 40,
    'stable_striker': 40,
    'victory_finisher': 40,
    
    // 6. Common
    'first_blood': 30,
    'duplet': 30,
    'maestro': 30,
    'unsung_hero': 25,
    'dominant_participant': 20,
    'veteran': 10
};

export const getBadgePriority = (badge: BadgeType): number => BADGE_PRIORITY[badge] || 0;

export const sortBadgesByPriority = (badges: Partial<Record<BadgeType, number>>): BadgeType[] => {
    return (Object.keys(badges) as BadgeType[]).sort((a, b) => {
        // Sort by Priority Descending
        return getBadgePriority(b) - getBadgePriority(a);
    });
};

// --- BADGE DISPLAY COMPONENT (The "5+1" System) ---
export const BadgeDisplay: React.FC<{ 
    badges: Partial<Record<BadgeType, number>>; 
    limit?: number;
    size?: 'sm' | 'md' | 'lg';
    onOpenChange?: (isOpen: boolean) => void;
}> = ({ badges, limit, size = 'md', onOpenChange }) => {
    const t = useTranslation();
    const [isModalOpen, setIsModalOpen] = useState(false);
    
    useEffect(() => {
        if (onOpenChange) {
            onOpenChange(isModalOpen);
        }
    }, [isModalOpen, onOpenChange]);

    const sortedBadges = sortBadgesByPriority(badges);
    
    if (sortedBadges.length === 0) return null;

    const DISPLAY_LIMIT = 5;
    const showCounter = sortedBadges.length > DISPLAY_LIMIT;
    const renderBadges = showCounter ? sortedBadges.slice(0, DISPLAY_LIMIT) : sortedBadges; 
    const counterValue = sortedBadges.length - DISPLAY_LIMIT;

    const iconSize = size === 'sm' ? 'w-5 h-5' : size === 'lg' ? 'w-9 h-9' : 'w-7 h-7';
    const counterSize = size === 'sm' ? 'w-5 h-5 text-[8px]' : size === 'lg' ? 'w-9 h-9 text-xs' : 'w-7 h-7 text-[10px]';

    return (
        <>
            {/* Main Display Grid - VERTICAL COLUMN */}
            <div className="mt-3 flex flex-col items-center gap-1">
                {renderBadges.map(badge => (
                    <div 
                        key={badge} 
                        title={t[`badge_${badge}` as keyof typeof t]}
                        className="cursor-pointer hover:scale-110 transition-transform relative z-10"
                        onClick={(e) => { e.stopPropagation(); setIsModalOpen(true); }}
                    >
                        <BadgeIcon badge={badge} count={badges[badge]} className={iconSize} />
                    </div>
                ))}

                {showCounter && (
                    <button 
                        onClick={(e) => { e.stopPropagation(); setIsModalOpen(true); }}
                        className={`${counterSize} rounded-full bg-dark-surface border border-dark-text-secondary/50 flex items-center justify-center font-bold text-white hover:bg-dark-accent-start/20 hover:border-dark-accent-start transition-all cursor-pointer z-10`}
                        title="View all badges"
                    >
                        +{counterValue}
                    </button>
                )}
            </div>

            {/* EXPANDED MODAL - REDESIGNED ("News Cinematic" Style - Monolithic & Opaque) */}
            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                size="sm" 
                containerClassName="!w-[300px] !max-w-[90vw] !p-0 !bg-[#0a0c10] !border !border-[#1e293b] !shadow-2xl overflow-hidden relative"
                hideCloseButton
            >
                <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[#00F2FE] to-transparent opacity-100 z-50"></div>
                <div className="absolute top-0 left-0 right-0 h-16 bg-gradient-to-b from-[#00F2FE]/10 to-transparent blur-xl pointer-events-none z-0"></div>
                <div className="p-4 border-b border-white/5 flex justify-between items-center bg-[#0a0c10] relative z-10">
                    <div className="flex items-center gap-3">
                        <h3 className="font-black text-lg text-white uppercase tracking-widest">{t.awards}</h3>
                        <span className="bg-[#00F2FE]/10 border border-[#00F2FE]/30 text-[#00F2FE] px-2 py-0.5 rounded text-xs font-black font-mono">
                            {sortedBadges.length}
                        </span>
                    </div>
                    <button onClick={() => setIsModalOpen(false)} className="text-gray-500 hover:text-white transition-colors">
                        <XCircle className="w-6 h-6" />
                    </button>
                </div>
                <div className="flex-1 overflow-y-auto max-h-[50vh] bg-[#0a0c10] p-2 relative z-10">
                    {sortedBadges.map((badge) => (
                        <div 
                            key={badge} 
                            className="flex items-center gap-4 p-3 rounded-xl transition-all border border-transparent border-b-white/5 last:border-b-0 hover:bg-[#00F2FE]/10 hover:border-[#00F2FE]/30 hover:shadow-[0_0_15px_rgba(0,242,254,0.15)] group"
                        >
                            <div className="shrink-0 relative">
                                <BadgeIcon badge={badge} className="w-10 h-10" count={badges[badge]} />
                            </div>
                            <div className="flex-grow min-w-0">
                                <h4 className="font-bold text-sm text-white leading-tight truncate tracking-wide group-hover:text-[#00F2FE] transition-colors">
                                    {t[`badge_${badge}` as keyof typeof t]}
                                </h4>
                                <p className="text-[10px] text-gray-400 leading-snug mt-1 line-clamp-2">
                                    {t[`badge_${badge}_desc` as keyof typeof t]}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
                <div className="h-1 w-full bg-gradient-to-r from-transparent via-[#00F2FE]/30 to-transparent relative z-10"></div>
            </Modal>
        </>
    );
};


export const PlayerCard: React.FC<PlayerCardProps> = ({ player, onEdit, onDelete, onUploadCard, onConfirmInitialRating, onDownloadCard, onShareProfile, isDownloading }) => {
    const t = useTranslation();
    const { totmPlayerIds, history } = useApp(); // Access global TOTM cache & history
    const keyStats = React.useMemo(() => getPlayerKeyStats(player), [player]);
    const countryCodeAlpha2 = React.useMemo(() => player.countryCode ? convertCountryCodeAlpha3ToAlpha2(player.countryCode) : null, [player.countryCode]);
    
    const [isBadgeModalOpen, setIsBadgeModalOpen] = useState(false);
    
    // Check if player is in Team of the Month
    const isTotm = totmPlayerIds.has(player.id);

    const winRate = player.totalGames > 0 ? `${Math.round((player.totalWins / player.totalGames) * 100)}%` : 'N/A';
    const goalsPerSession = player.totalSessionsPlayed > 0 ? (player.totalGoals / player.totalSessionsPlayed).toFixed(2) : '0.00';
    const assistsPerSession = player.totalSessionsPlayed > 0 ? (player.totalAssists / player.totalSessionsPlayed).toFixed(2) : '0.00';

    // --- RECALCULATE MONTHLY STATS DYNAMICALLY ---
    // Instead of using dirty `player.monthlyGoals` from DB, recalculate from history
    const monthlyStats = React.useMemo(() => {
        return calculatePlayerMonthlyStats(player.id, history);
    }, [player.id, history]);

    const displayMonthlyGoals = monthlyStats.goals;
    const displayMonthlyAssists = monthlyStats.assists;
    const displayMonthlyWins = monthlyStats.wins;
    const displayMonthlySessions = monthlyStats.sessions;


    const StatItem: React.FC<{ label: string; value: string | number; isKeyStat?: boolean }> = ({ label, value, isKeyStat }) => (
        <div>
            <p className={`text-base font-bold ${isKeyStat ? 'key-stat-glow' : ''}`}>{value}</p>
            <p className="text-[10px] text-dark-text-secondary uppercase">{label}</p>
        </div>
    );
    
    const WLDBar: React.FC<{ wins: number; draws: number; losses: number; total: number }> = ({ wins, draws, losses, total }) => {
        if (total === 0) return <div className="text-center text-xs text-dark-text-secondary py-2">{t.noBadges}</div>;
        const winP = (wins / total) * 100;
        const drawP = (draws / total) * 100;
        const lossP = (losses / total) * 100;
        return (
            <div className="flex w-full h-1.5 rounded-full overflow-hidden bg-dark-bg text-dark-bg text-[10px] font-bold">
                {wins > 0 && <div style={{ width: `${winP}%`, backgroundColor: '#4CFF5F' }} />}
                {draws > 0 && <div style={{ width: `${drawP}%`, backgroundColor: '#A9B1BD' }} />}
                {losses > 0 && <div style={{ width: `${lossP}%`, backgroundColor: '#FF4136' }} />}
            </div>
        );
    };

    const cardClass = "border border-white/10 shadow-[0_0_15px_rgba(0,242,254,0.3)]";

    return (
        <div id={`player-card-container-${player.id}`}>
            <div 
                id={`player-card-header-${player.id}`}
                className={`relative rounded-3xl h-[440px] overflow-hidden text-white p-4 bg-dark-surface ${cardClass}`}
            >
                {player.playerCard && (
                    <div
                        className="absolute inset-0 w-full h-full bg-cover bg-no-repeat"
                        style={{ backgroundImage: `url(${player.playerCard})`, backgroundPosition: 'center 5%' }}
                    />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent"></div>
                
                {!isBadgeModalOpen && (
                    <div className="absolute top-24 left-4 z-20 flex flex-col gap-4">
                        <div className="space-y-4">
                            {(player.skills || []).map(skill => (
                                <div key={skill} className="flex items-center gap-2" title={t[`skill_${skill}` as keyof typeof t] || skill}>
                                    <StarIcon className="w-4 h-4 text-[#00F2FE]" />
                                    <span className="font-bold text-xs text-white tracking-wider">{skillAbbreviations[skill]}</span>
                                </div>
                            ))}
                        </div>
                        {/* TOTM Badge placed below skills (automatically positioned by flex-col) */}
                        {isTotm && (
                            <div title="Team of the Month" className="animate-in fade-in zoom-in duration-500">
                                <MiniSquadBadge size="w-10 h-10" />
                            </div>
                        )}
                    </div>
                )}

                <div className="relative z-10 h-full flex flex-col justify-between">
                     <div className="flex justify-between items-start">
                        <div>
                            <p style={{ color: '#00F2FE' }} className="text-base font-black leading-none">532</p>
                            <p className="text-white text-[7px] font-bold tracking-[0.15em] leading-none mt-1">PLAYGROUND</p>
                            {countryCodeAlpha2 && (
                                <img 
                                    src={`https://flagcdn.com/w40/${countryCodeAlpha2.toLowerCase()}.png`}
                                    alt={`${player.countryCode} flag`}
                                    className="w-6 h-auto mt-3 rounded-sm"
                                />
                            )}
                        </div>
                        <div className="flex flex-col items-center max-w-[50%]">
                            <div className="text-4xl font-black leading-none" style={{color: '#00F2FE', textShadow: 'none' }}>
                                {player.rating}
                            </div>
                            <p className="font-bold text-white tracking-widest text-sm mt-2">OVR</p>
                            <div className="mt-1">
                                <FormArrowIndicator form={player.form} />
                            </div>
                            
                            {player.badges && Object.keys(player.badges).length > 0 && (
                                <BadgeDisplay 
                                    badges={player.badges} 
                                    onOpenChange={setIsBadgeModalOpen} 
                                />
                            )}
                        </div>
                    </div>

                    <div className="text-center flex-shrink-0 relative z-30 pb-1">
                        <h1 className="text-4xl font-black uppercase tracking-tight drop-shadow-lg">{player.nickname} {player.surname}</h1>
                    </div>
                </div>
            </div>
            
            <div className="space-y-3 pt-4">
                 {player.lastRatingChange && player.status === PlayerStatus.Confirmed && <LastSessionBreakdown player={player} />}
                 <BestSessionCard player={player} />
                 {player.status === PlayerStatus.Confirmed && (
                    <Card title={t.clubRankings} className={cardClass}>
                        <ClubRankings player={player} />
                    </Card>
                 )}

                 <Card id={`all-time-stats-${player.id}`} title={t.allTimeStats} className={cardClass}>
                     <div className="grid grid-cols-4 gap-2 text-center">
                        <StatItem label={t.thSessions} value={player.totalSessionsPlayed} />
                        <StatItem label={t.thG} value={player.totalGoals} />
                        <StatItem label={t.thA} value={player.totalAssists} />
                        <StatItem label={t.winRate.toUpperCase()} value={winRate} isKeyStat={keyStats.isTopWinner} />
                    </div>
                 </Card>

                 <Card title={t.careerStats} className={cardClass}>
                    <div className="grid grid-cols-2 gap-2 text-center">
                        <StatItem label={t.goalsPerSession} value={goalsPerSession} />
                        <StatItem label={t.assistsPerSession} value={assistsPerSession} />
                    </div>
                </Card>

                 <Card id={`monthly-stats-${player.id}`} title={t.monthlyStatsTitle} className={cardClass}>
                     <div className="grid grid-cols-4 gap-2 text-center">
                        <StatItem label={t.session.toUpperCase()} value={displayMonthlySessions} />
                        <StatItem label={t.monthlyGoals.toUpperCase()} value={displayMonthlyGoals} />
                        <StatItem label={t.monthlyAssists.toUpperCase()} value={displayMonthlyAssists} />
                        <StatItem label={t.monthlyWins.toUpperCase()} value={displayMonthlyWins} />
                    </div>
                 </Card>
                 
                 <Card id={`wld-bar-${player.id}`} title={`${t.winLossDraw} (${player.totalWins}W ${player.totalDraws}D ${player.totalLosses}L)`} className={`${cardClass} !p-3`}>
                    <WLDBar wins={player.totalWins} draws={player.totalDraws} losses={player.totalLosses} total={player.totalGames} />
                 </Card>

                <Card id={`session-trend-${player.id}`} title={t.sessionTrend} className={cardClass}>
                    <SessionTrendChart history={player.sessionHistory} />
                </Card>
                
                <div className="grid grid-cols-2 gap-3 player-card-actions">
                    <Button variant="secondary" onClick={onEdit} className={`!py-3 !px-4 font-chakra text-xl tracking-wider ${cardClass}`}>{t.editData}</Button>
                    <Button variant="secondary" onClick={onUploadCard} className={`!py-3 !px-4 font-chakra text-xl tracking-wider ${cardClass}`}>{t.uploadPhoto}</Button>
                    <Button variant="secondary" className={`w-full font-chakra text-xl tracking-wider ${cardClass}`} onClick={onDownloadCard} disabled={isDownloading}>
                        {isDownloading ? 'Exporting...' : t.downloadCard}
                    </Button>
                    <Button variant="secondary" className={`w-full font-chakra text-xl tracking-wider ${cardClass}`} onClick={onShareProfile}>
                        {t.shareProfile}
                    </Button>
                </div>
                <Button variant="secondary" className="w-full font-chakra text-xl tracking-wider ${cardClass} player-card-actions" onClick={onDelete}>{t.deletePlayer}</Button>
            </div>
        </div>
    );
};
