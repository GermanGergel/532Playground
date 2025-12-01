import React from 'react';
import { Team, Player, PlayerTier, PlayerStatus, BadgeType, PlayerForm, SkillType } from './types';
import { getPlayerKeyStats } from './services/statistics';
import { convertCountryCodeAlpha3ToAlpha2 } from './utils/countries';
import { Button, Modal, Card, useTranslation } from './ui';
import { LastSessionBreakdown, ClubRankings } from './components/PlayerCardAnalytics';
import { 
    StarIcon,
    GoleadorBadgeIcon, PerfectFinishBadgeIcon, DynastyBadgeIcon, SniperBadgeIcon,
    AssistantBadgeIcon, MvpBadgeIcon, DecisiveFactorBadgeIcon, UnsungHeroBadgeIcon,
    FirstBloodBadgeIcon, DupletBadgeIcon, MaestroBadgeIcon, ComebackKingsBadgeIcon,
    FortressBadgeIcon, ClubLegendBadgeIcon, VeteranBadgeIcon
} from './icons';

// Feature Components

interface PlayerCardProps {
    player: Player;
    onEdit: () => void;
    onDelete: () => void;
    onUploadCard: () => void;
    onConfirmInitialRating: (rating: number) => void;
    onDownloadCard: () => void;
}

// Removed InitialRatingSetup component as it is no longer used

export const BadgeIcon: React.FC<{ badge: BadgeType; count?: number; className?: string }> = ({ badge, count, className }) => {
    const badgeConfig: Record<BadgeType, { Icon: React.FC<any>, colorClass: string }> = {
        goleador: { Icon: GoleadorBadgeIcon, colorClass: 'text-yellow-400' },
        perfect_finish: { Icon: PerfectFinishBadgeIcon, colorClass: 'text-yellow-400' },
        dynasty: { Icon: DynastyBadgeIcon, colorClass: 'text-yellow-400' },
        sniper: { Icon: SniperBadgeIcon, colorClass: 'text-yellow-400' },
        assistant: { Icon: AssistantBadgeIcon, colorClass: 'text-yellow-400' },
        mvp: { Icon: MvpBadgeIcon, colorClass: 'text-yellow-400' },
        decisive_factor: { Icon: DecisiveFactorBadgeIcon, colorClass: 'text-yellow-400' },
        unsung_hero: { Icon: UnsungHeroBadgeIcon, colorClass: 'text-yellow-400' },
        first_blood: { Icon: FirstBloodBadgeIcon, colorClass: 'text-yellow-400' },
        duplet: { Icon: DupletBadgeIcon, colorClass: 'text-yellow-400' },
        maestro: { Icon: MaestroBadgeIcon, colorClass: 'text-yellow-400' },
        comeback_kings: { Icon: ComebackKingsBadgeIcon, colorClass: 'text-yellow-400' },
        fortress: { Icon: FortressBadgeIcon, colorClass: 'text-yellow-400' },
        club_legend_goals: { Icon: ClubLegendBadgeIcon, colorClass: 'text-yellow-400' },
        club_legend_assists: { Icon: ClubLegendBadgeIcon, colorClass: 'text-yellow-400' },
        veteran: { Icon: VeteranBadgeIcon, colorClass: 'text-yellow-400' },
    };

    const { Icon, colorClass } = badgeConfig[badge] || { Icon: MvpBadgeIcon, colorClass: 'text-yellow-400' };

    return (
        <div className="relative inline-block">
            <Icon className={`${colorClass} ${className}`} />
            {count && count > 1 && (
                <span
                    className="absolute -top-1 -right-2 bg-black/70 px-1 rounded-full text-[10px] font-black leading-none text-yellow-400"
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


export const PlayerCard: React.FC<PlayerCardProps> = ({ player, onEdit, onDelete, onUploadCard, onConfirmInitialRating, onDownloadCard }) => {
    const t = useTranslation();
    const keyStats = React.useMemo(() => getPlayerKeyStats(player), [player]);
    const countryCodeAlpha2 = React.useMemo(() => player.countryCode ? convertCountryCodeAlpha3ToAlpha2(player.countryCode) : null, [player.countryCode]);
    
    const badgeList = player.badges ? (Object.keys(player.badges) as BadgeType[]) : [];

    const winRate = player.totalGames > 0 ? `${Math.round((player.totalWins / player.totalGames) * 100)}%` : 'N/A';

    const StatItem: React.FC<{ label: string; value: string | number; isKeyStat?: boolean }> = ({ label, value, isKeyStat }) => (
        <div>
            <p className={`text-base font-bold ${isKeyStat ? 'text-yellow-400' : ''}`}>{value}</p>
            <p className="text-[10px] text-dark-text-secondary uppercase">{label}</p>
        </div>
    );
    
    const WLDBar: React.FC<{ wins: number; draws: number; losses: number; total: number }> = ({ wins, draws, losses, total }) => {
        if (total === 0) return <div className="text-center text-xs text-dark-text-secondary py-2">{t.noBadges}</div>; // Placeholder for no games played yet
        const winP = (wins / total) * 100;
        const drawP = (draws / total) * 100;
        const lossP = (losses / total) * 100;
        return (
            <div className="flex w-full h-1.5 rounded-full overflow-hidden bg-dark-bg text-dark-bg text-[10px] font-bold">
                {wins > 0 && (
                    <div className="flex items-center justify-center" style={{ width: `${winP}%`, backgroundColor: '#4CFF5F' }}>
                        {/* {wins}W */}
                    </div>
                )}
                {draws > 0 && (
                    <div className="flex items-center justify-center" style={{ width: `${drawP}%`, backgroundColor: '#A9B1BD' }}>
                        {/* {draws}D */}
                    </div>
                )}
                {losses > 0 && (
                    <div className="flex items-center justify-center" style={{ width: `${lossP}%`, backgroundColor: '#FF4136' }}>
                        {/* {losses}L */}
                    </div>
                )}
            </div>
        );
    };

    const cardClass = "border border-white/10";

    return (
        <div id={`player-card-container-${player.id}`}>
            {/* --- CARD HEADER --- */}
            <div 
                id={`player-card-header-${player.id}`}
                className={`relative rounded-3xl h-[440px] overflow-hidden text-white p-4 bg-dark-surface ${cardClass}`}
            >
                {/* Div with background-image for High Quality Export */}
                {player.playerCard && (
                    <div
                        className="absolute inset-0 w-full h-full bg-cover bg-no-repeat"
                        style={{
                            backgroundImage: `url(${player.playerCard})`,
                            backgroundPosition: 'center 5%',
                        }}
                    />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent"></div>
                
                <div className="absolute top-24 left-4 z-20">
                    <div className="space-y-4">
                        {(player.skills || []).map(skill => (
                            <div key={skill} className="flex items-center gap-2" title={t[`skill_${skill}` as keyof typeof t] || skill}>
                                {/* Removed filter drop-shadow for flat look to prevent blur artifacts */}
                                <StarIcon className="w-4 h-4 text-[#00F2FE]" />
                                <span className="font-bold text-xs text-white tracking-wider">{skillAbbreviations[skill]}</span>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="relative z-10 h-full flex flex-col justify-between">
                     {/* Top section for logo and rating */}
                    <div className="flex justify-between items-start">
                        {/* Logo & Flag */}
                        <div>
                            <p style={{ color: '#00F2FE' }} className="text-base font-black leading-none">532</p>
                            <p className="text-white text-[7px] font-bold tracking-[0.15em] leading-none mt-1">PLAYGROUND</p>
                            {countryCodeAlpha2 && (
                                <img 
                                    src={`https://flagcdn.com/w40/${countryCodeAlpha2.toLowerCase()}.png`}
                                    alt={`${player.countryCode} flag`}
                                    className="w-6 h-auto mt-2 rounded-sm"
                                />
                            )}
                        </div>
                         {/* Rating, Form & Badges */}
                        <div className="flex flex-col items-center">
                            {/* KEEP FLAT: No text-shadow on the rating number for clean export */}
                            <div className="text-4xl font-black" style={{color: '#00F2FE', textShadow: 'none' }}>
                                {player.rating}
                            </div>
                            <p className="font-bold text-white tracking-widest text-sm -mt-1">OVG</p>
                            <div className="mt-1">
                                <FormArrowIndicator form={player.form} />
                            </div>
                            {badgeList.length > 0 && (
                                <div className="mt-4 flex flex-row-reverse items-center gap-x-2">
                                    <div className="flex flex-col space-y-2 items-center">
                                        {badgeList.slice(0, 8).map(badge => (
                                            <div key={badge} title={t[`badge_${badge}` as keyof typeof t] || ''}>
                                                <BadgeIcon badge={badge} count={player.badges?.[badge]} className="w-7 h-7" />
                                            </div>
                                        ))}
                                    </div>
                                    {badgeList.length > 8 && (
                                        <div className="flex flex-col space-y-2 items-center">
                                            {badgeList.slice(8).map(badge => (
                                                <div key={badge} title={t[`badge_${badge}` as keyof typeof t] || ''}>
                                                    <BadgeIcon badge={badge} count={player.badges?.[badge]} className="w-7 h-7" />
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Bottom section for name */}
                    <div className="text-center">
                        <h1 className="text-4xl font-black uppercase tracking-tight">{player.nickname} {player.surname}</h1>
                    </div>
                </div>
            </div>
            
            <div className="space-y-3 pt-4">
                 {/* MOVED: LastSessionBreakdown is now first */}
                 {player.lastRatingChange && player.status === PlayerStatus.Confirmed && <LastSessionBreakdown player={player} />}
                 {player.status === PlayerStatus.Confirmed && <ClubRankings player={player} />}

                 <Card id={`all-time-stats-${player.id}`} title={t.allTimeStats} className={cardClass}>
                     <div className="grid grid-cols-4 gap-2 text-center">
                        <StatItem label={t.thSessions} value={player.totalSessionsPlayed} />
                        <StatItem label={t.thG} value={player.totalGoals} />
                        <StatItem label={t.thA} value={player.totalAssists} />
                        <StatItem label={t.winRate.toUpperCase()} value={winRate} isKeyStat={keyStats.isTopWinner} />
                    </div>
                 </Card>

                 <Card id={`monthly-stats-${player.id}`} title={t.monthlyStatsTitle} className={cardClass}>
                     <div className="grid grid-cols-4 gap-2 text-center">
                        <StatItem label={t.session.toUpperCase()} value={player.monthlySessionsPlayed} />
                        <StatItem label={t.monthlyGoals.toUpperCase()} value={player.monthlyGoals} />
                        <StatItem label={t.monthlyAssists.toUpperCase()} value={player.monthlyAssists} />
                        <StatItem label={t.monthlyWins.toUpperCase()} value={player.monthlyWins} />
                    </div>
                 </Card>
                 
                 <Card id={`wld-bar-${player.id}`} title={`${t.winLossDraw} (${player.totalWins}W ${player.totalDraws}D ${player.totalLosses}L)`} className={`${cardClass} !p-3`}>
                    <WLDBar wins={player.totalWins} draws={player.totalDraws} losses={player.totalLosses} total={player.totalGames} />
                 </Card>

                <Card id={`session-trend-${player.id}`} title={t.sessionTrend} className={cardClass}>
                    <SessionTrendChart history={player.sessionHistory} />
                </Card>
                
                {/* --- ACTION BUTTONS --- */}
                <div className="grid grid-cols-2 gap-3 player-card-actions">
                    <Button variant="secondary" onClick={onEdit} className={`!py-3.5 !px-4 !text-base ${cardClass}`}>{t.editData}</Button>
                    <Button variant="secondary" onClick={onUploadCard} className={`!py-3.5 !px-4 !text-base ${cardClass}`}>{t.uploadPhoto}</Button>
                </div>
                <Button variant="secondary" className={`w-full ${cardClass} player-card-actions`} onClick={onDownloadCard}>{t.downloadCard}</Button>
                <Button variant="secondary" className={`w-full ${cardClass} player-card-actions`} onClick={onDelete}>{t.deletePlayer}</Button>
            </div>
        </div>
    );
};