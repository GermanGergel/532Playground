
import React, { useState } from 'react';
import { Player, PlayerTier, PlayerStatus, BadgeType, PlayerForm, SkillType } from '../types';
import { convertCountryCodeAlpha3ToAlpha2 } from '../utils/countries';
import { Card, useTranslation, Button } from '../ui';
import { LastSessionBreakdown, ClubRankings, BestSessionCard, PlayerProgressChart } from './PlayerCardAnalytics';
import { BadgeIcon, BadgeDisplay } from '../features';
import { TrophyIcon, StarIcon, ChevronLeft, InfoIcon, LightbulbIcon, Zap, ExclamationIcon, RefreshCw, Users } from '../icons';
import { useApp } from '../context';
import { MiniSquadBadge } from './MiniSquadBadge';
import { calculatePlayerMonthlyStats } from '../services/statistics';

type View = 'main' | 'stats' | 'awards' | 'info';

const skillAbbreviations: Record<SkillType, string> = {
    goalkeeper: 'GK', power_shot: 'PS', technique: 'TQ', defender: 'DF', 
    playmaker: 'PM', finisher: 'FN', versatile: 'VS', tireless_motor: 'TM', leader: 'LD',
};

// Precisely updated for both delta and form inputs
const FormArrowIndicator: React.FC<{ delta?: number }> = ({ delta = 0 }) => {
    const isUp = delta > 0.1;
    const isDown = delta < -0.1;
    const color = isUp ? '#4CFF5F' : isDown ? '#FF4136' : '#A9B1BD';
    
    const commonProps: React.SVGProps<SVGSVGElement> = {
        width: "22", height: "22", viewBox: "0 0 24 24", fill: "none", stroke: color,
        strokeWidth: "3", strokeLinecap: "round", strokeLinejoin: "round",
    };

    if (isUp) return <svg {...commonProps}><path d="M12 19V5m-6 7l6-6 6 6"/></svg>;
    if (isDown) return <svg {...commonProps}><path d="M12 5v14M5 12l7 7 7-7"/></svg>;
    return <svg {...commonProps}><path d="M5 12h14m-6-6l6 6-6 6"/></svg>;
};

const PromoStyledButton: React.FC<{ onClick: () => void; children: React.ReactNode; className?: string }> = ({ onClick, children, className }) => (
    <button 
        onClick={onClick} 
        className={`relative overflow-hidden rounded-xl bg-gradient-to-br from-[#161b22] to-[#0a0d14] border border-white/[0.06] p-4 text-center font-chakra font-bold text-xl tracking-wider text-white shadow-lg transition-all duration-300 hover:border-[#00F2FE]/30 hover:scale-[1.02] active:scale-95 group ${className}`}
    >
        <div className="absolute inset-0 opacity-[0.05] pointer-events-none z-0" style={{ 
            backgroundImage: `linear-gradient(45deg, #fff 25%, transparent 25%, transparent 50%, #fff 50%, #fff 75%, transparent 75%, transparent)`,
            backgroundSize: '4px 4px'
        }}></div>
        <div className="absolute -top-10 -left-10 w-20 h-20 bg-[#00F2FE]/[0.1] rounded-full blur-[30px] pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity z-0"></div>
        <span className="relative z-10">{children}</span>
    </button>
);

const PromoStatsContainer: React.FC<{ children: React.ReactNode; title?: string }> = ({ children, title }) => (
    <div className={`
        relative overflow-hidden rounded-3xl 
        bg-gradient-to-br from-[#161b22] to-[#0a0d14]
        border border-white/[0.06]
        shadow-[0_25px_50px_-12px_rgba(0,0,0,0.9),inset_0_1px_1px_rgba(255,255,255,0.05)]
        group p-4
    `}>
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none z-0" style={{ backgroundImage: `linear-gradient(45deg, #fff 25%, transparent 25%, transparent 50%, #fff 50%, #fff 75%, transparent 75%, transparent)`, backgroundSize: '4px 4px' }}></div>
        <div className="absolute -top-10 -left-10 w-20 h-20 bg-[#00F2FE]/[0.05] rounded-full blur-[30px] pointer-events-none z-0 group-hover:bg-[#00F2FE]/10 transition-colors"></div>
        {title && (
            <h2 className="text-[10px] tracking-tighter opacity-70 uppercase font-bold text-white mb-2 ml-1 relative z-10">
                {title}
            </h2>
        )}
        <div className="relative z-10">{children}</div>
    </div>
);

const ReadOnlyPlayerCard: React.FC<{ player: Player; style?: React.CSSProperties }> = ({ player, style }) => {
    const t = useTranslation();
    const { totmPlayerIds, totmEmblem } = useApp();
    const countryCodeAlpha2 = React.useMemo(() => player.countryCode ? convertCountryCodeAlpha3ToAlpha2(player.countryCode) : null, [player.countryCode]);
    const cardClass = "relative rounded-3xl h-[440px] overflow-hidden text-white p-4 bg-dark-surface border border-white/10 shadow-[0_0_20px_rgba(0,242,254,0.3)]";
    const [isBadgeModalOpen, setIsBadgeModalOpen] = useState(false);
    const isTotm = totmPlayerIds.has(player.id);
    const preciseDelta = player.lastRatingChange?.finalChange || 0;

    return (
        <div>
            <div className={cardClass} style={style}>
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
                        {isTotm && (
                            <div className="animate-in fade-in zoom-in duration-500">
                                <MiniSquadBadge size="w-10 h-10" customEmblem={totmEmblem} noGlow={true} />
                            </div>
                        )}
                    </div>
                )}
                <div className="relative z-10 h-full flex flex-col justify-between p-1">
                    <div className="flex justify-between items-start">
                        <div className="pt-2">
                            <p className="font-russo text-3xl leading-none tracking-tighter text-white" style={{ textShadow: '0 2px 10px rgba(0,0,0,0.5)', }}>UNIT</p>
                            {countryCodeAlpha2 && <img src={`https://flagcdn.com/w40/${countryCodeAlpha2.toLowerCase()}.png`} alt={`${player.countryCode} flag`} className="w-6 h-auto mt-4 rounded-sm opacity-80" />}
                        </div>
                        <div className="flex flex-col items-center max-w-[50%]">
                            <div className="text-4xl font-black leading-none" style={{ color: '#00F2FE', textShadow: 'none' }}>{Math.floor(player.rating)}</div>
                            <p className="font-bold text-white tracking-widest text-sm mt-2">OVR</p>
                            <div className="mt-1"><FormArrowIndicator delta={preciseDelta} /></div>
                            {player.badges && Object.keys(player.badges).length > 0 && (
                                <BadgeDisplay badges={player.badges} limit={6} onOpenChange={setIsBadgeModalOpen} />
                            )}
                        </div>
                    </div>
                    <div className="text-center flex-shrink-0 relative z-30 pb-1">
                        <h1 className="text-4xl font-black uppercase tracking-tight drop-shadow-lg leading-none mb-1">
                            {player.nickname} {player.surname}
                        </h1>
                    </div>
                </div>
            </div>
        </div>
    );
};

const SubViewHeader: React.FC<{ title: string, onBack: () => void }> = ({ title, onBack }) => (
    <div className="flex items-center justify-between mb-6">
        <Button variant="ghost" className="!p-2 -ml-2 text-white hover:text-[#00F2FE] transition-colors" onClick={onBack}>
            <ChevronLeft className="w-7 h-7" />
        </Button>
        <h2 className="text-xl font-bold text-center absolute left-1/2 -translate-x-1/2">{title}</h2>
        <div className="w-9" />
    </div>
);

const WLDBar: React.FC<{ wins: number; draws: number; losses: number; total: number; t: any }> = ({ wins, draws, losses, total, t }) => {
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

const SessionTrendChart: React.FC<{ history?: Player['sessionHistory']; t: any }> = ({ history, t }) => {
    const safeHistory = history || [];
    const displayData = Array.from({ length: 5 }).map((_, i) => {
        const item = safeHistory[safeHistory.length - 5 + i];
        return item ? { winRate: item.winRate, isPlaceholder: false } : { winRate: 0, isPlaceholder: true };
    });
    const getBarColor = (winRate: number) => {
        if (winRate > 60) return '#4CFF5F';
        if (winRate < 40) return '#FF4136';
        return '#A9B1BD';
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
                const height = session.isPlaceholder ? '5%' : `${Math.max(session.winRate, 15)}%`;
                const color = getBarColor(session.winRate);
                return (
                    <div 
                        key={index} 
                        className={`w-2.5 rounded-t-full transition-all duration-500 ease-out ${session.isPlaceholder ? 'bg-white/5 opacity-30' : 'opacity-100'}`} 
                        style={!session.isPlaceholder ? { 
                            height: height, 
                            background: `linear-gradient(to top, ${hexToRgba(color, 0.1)}, ${color})`, 
                            boxShadow: `0 0 4px ${color}`
                        } : { height: height }} 
                        title={`${t.winRate}: ${!session.isPlaceholder ? session.winRate + '%' : 'N/A'}`} 
                    />
                );
            })}
        </div>
    );
};

const StatsView: React.FC<{ player: Player; onBack: () => void; isPromo?: boolean }> = ({ player, onBack, isPromo }) => {
    const t = useTranslation();
    const { history } = useApp();
    const winRate = player.totalGames > 0 ? `${Math.round((player.totalWins / player.totalGames) * 100)}%` : 'N/A';
    const goalsPerSession = player.totalSessionsPlayed > 0 ? (player.totalGoals / player.totalSessionsPlayed).toFixed(2) : '0.00';
    const assistsPerSession = player.totalSessionsPlayed > 0 ? (player.totalAssists / player.totalSessionsPlayed).toFixed(2) : '0.00';
    const cardNeonClasses = "border border-white/10 shadow-[0_0_15px_rgba(0,242,254,0.3)]";

    const monthlyStats = React.useMemo(() => calculatePlayerMonthlyStats(player.id, history), [player.id, history]);
    const preciseDelta = player.lastRatingChange?.finalChange || 0;
    const formText = preciseDelta > 0.1 ? 'HOT' : preciseDelta < -0.1 ? 'COLD' : 'STABLE';
    const formColor = preciseDelta > 0.1 ? '#4CFF5F' : preciseDelta < -0.1 ? '#FF4136' : '#fff';

    const StatItem: React.FC<{ label: string; value: string | number; color?: string }> = ({ label, value, color }) => (
        <div><p className="text-base font-bold" style={{ color }}>{value}</p><p className="text-[10px] text-dark-text-secondary uppercase">{label}</p></div>
    );

    const Wrapper: React.FC<{ title?: string; children: React.ReactNode }> = ({ title, children }) => {
        if (isPromo) return <PromoStatsContainer title={title}>{children}</PromoStatsContainer>;
        return <Card title={title} className={cardNeonClasses}>{children}</Card>;
    };

    return (
        <div>
            <SubViewHeader title={t.statistics} onBack={onBack} />
            <div className="space-y-3">
                
                <Wrapper title="Form Momentum">
                    <div className="flex flex-col gap-3">
                        <div className="grid grid-cols-3 gap-2 items-center text-center">
                            <StatItem label="Status" value={formText} color={formColor} />
                            <StatItem label="Last Delta" value={(preciseDelta > 0 ? '+' : '') + preciseDelta.toFixed(1)} color={formColor} />
                            <div className="flex justify-center"><FormArrowIndicator delta={preciseDelta} /></div>
                        </div>
                        
                        <div className="mt-2 px-2">
                            <div className="flex justify-between items-end mb-1">
                                <span className="text-xs font-bold text-white">{Math.floor(player.rating)}</span>
                                <span className="text-[10px] text-dark-text-secondary font-bold uppercase tracking-wider">Next Level</span>
                                <span className="text-xs font-bold text-white/50">{Math.floor(player.rating) + 1}</span>
                            </div>
                            <div className="h-1.5 w-full bg-dark-bg rounded-full overflow-hidden relative">
                                <div 
                                    className="absolute top-0 left-0 h-full rounded-full transition-all duration-1000 ease-out"
                                    style={{ 
                                        width: `${(player.rating % 1) * 100}%`,
                                        background: 'linear-gradient(90deg, #00F2FE 0%, #4facfe 100%)',
                                        boxShadow: '0 0 10px rgba(0, 242, 254, 0.5)'
                                    }}
                                />
                            </div>
                            <p className="text-center text-[9px] text-dark-text-secondary mt-1.5">
                                {((1 - (player.rating % 1)) * 100).toFixed(0)}% to next rating
                            </p>
                        </div>
                    </div>
                </Wrapper>

                {isPromo ? (
                    <PromoStatsContainer>
                        <PlayerProgressChart history={player.historyData || []} usePromoStyle={true} initialRating={player.initialRating || 68} />
                    </PromoStatsContainer>
                ) : (
                    <PlayerProgressChart history={player.historyData || []} initialRating={player.initialRating || 68} />
                )}

                {player.lastRatingChange && (
                    isPromo ? (
                        <PromoStatsContainer>
                            <LastSessionBreakdown player={player} usePromoStyle={true} />
                        </PromoStatsContainer>
                    ) : (
                        <LastSessionBreakdown player={player} />
                    )
                )}

                {isPromo ? (
                    <PromoStatsContainer>
                        <BestSessionCard player={player} usePromoStyle={true} />
                    </PromoStatsContainer>
                ) : (
                    <BestSessionCard player={player} />
                )}

                {isPromo ? (
                    <PromoStatsContainer>
                        <ClubRankings player={player} usePromoStyle={true} />
                    </PromoStatsContainer>
                ) : (
                    <ClubRankings player={player} />
                )}

                <Wrapper title={t.allTimeStats}>
                    <div className="grid grid-cols-4 gap-2 text-center">
                        <StatItem label={t.thSessions} value={player.totalSessionsPlayed} />
                        <StatItem label={t.winRate.toUpperCase()} value={winRate} />
                        <StatItem label={t.thG} value={player.totalGoals} />
                        <StatItem label={t.thA} value={player.totalAssists} />
                    </div>
                </Wrapper>

                <Wrapper title={t.monthlyStatsTitle}>
                    <div className="grid grid-cols-4 gap-2 text-center">
                        <StatItem label={t.session.toUpperCase()} value={monthlyStats.sessions} />
                        <StatItem label={t.monthlyGoals.toUpperCase()} value={monthlyStats.goals} />
                        <StatItem label={t.monthlyAssists.toUpperCase()} value={monthlyStats.assists} />
                        <StatItem label={t.monthlyWins.toUpperCase()} value={monthlyStats.wins} />
                    </div>
                </Wrapper>

                <Wrapper title="Career Averages">
                    <div className="grid grid-cols-2 gap-2 text-center">
                        <StatItem label={t.goalsPerSession} value={goalsPerSession} />
                        <StatItem label={t.assistsPerSession} value={assistsPerSession} />
                    </div>
                </Wrapper>

                <Wrapper title={`${t.winLossDraw} (${player.totalWins}W ${player.totalDraws}D ${player.totalLosses}L)`}>
                    <WLDBar wins={player.totalWins} draws={player.totalDraws} losses={player.totalLosses} total={player.totalGames} t={t} />
                </Wrapper>

                <Wrapper title={t.sessionTrend}>
                    <SessionTrendChart history={player.sessionHistory} t={t} />
                </Wrapper>
            </div>
        </div>
    );
};

const AwardsView: React.FC<{ player: Player; onBack: () => void }> = ({ player, onBack }) => {
    const t = useTranslation();
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

    return (
        <div>
            <SubViewHeader title={t.awards} onBack={onBack} />
            <div className="grid grid-cols-2 gap-x-4 gap-y-6">
                {ALL_BADGES.map(badge => {
                    const isEarned = player.badges && player.badges[badge];
                    const count = player.badges?.[badge];
                    return (
                        <div key={badge} className="flex flex-col items-center text-center transition-all duration-300">
                            <div className={`relative transition-all duration-300 ${!isEarned ? 'filter grayscale opacity-30' : ''}`}>
                                <BadgeIcon 
                                    badge={badge} 
                                    count={count} 
                                    className="w-16 h-16 mb-2"
                                    style={isEarned ? { filter: 'drop-shadow(0 0 8px #00F2FE)' } : {}}
                                />
                            </div>
                            <div className="flex-grow">
                                <p className={`font-bold text-sm leading-tight ${isEarned ? 'text-white' : 'text-dark-text-secondary'}`}>{t[`badge_${badge}` as keyof typeof t]}</p>
                                <p className="text-[10px] text-dark-text-secondary leading-snug mt-0.5">{t[`badge_${badge}_desc` as keyof typeof t]}</p>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

const InfoView: React.FC<{ onBack: () => void }> = ({ onBack }) => {
    const t = useTranslation();
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
    const ALL_SKILLS: SkillType[] = ['goalkeeper', 'power_shot', 'technique', 'defender', 'playmaker', 'finisher', 'versatile', 'tireless_motor', 'leader'];
    
    return (
        <div className="pb-10 !bg-[#01040a] !border !border-[#1e293b] !shadow-2xl overflow-hidden relative rounded-3xl">
            <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[#00F2FE] to-transparent opacity-100 z-50"></div>
            <div className="absolute top-0 left-0 right-0 h-16 bg-gradient-to-b from-[#00F2FE]/10 to-transparent blur-xl pointer-events-none z-0"></div>

            <div className="relative z-10 p-4">
                <SubViewHeader title={t.information} onBack={onBack} />
                <div className="space-y-8">
                    <div>
                        <h3 className="text-lg font-bold mb-3 flex items-center gap-2"><InfoIcon className="w-5 h-5 text-dark-accent-start" /> {t.ratingCalculationTitle}</h3>
                        <p className="text-sm text-dark-text-secondary mb-4">{t.ratingCalculationDesc}</p>
                        <div className="p-4 bg-dark-bg/50 rounded-2xl border border-white/10 space-y-4">
                            <ul className="text-xs text-dark-text-secondary space-y-2">
                                <li className="flex justify-between border-b border-white/5 pb-1"><span>{t.ratingExampleWinStrong}</span></li>
                                <li className="flex justify-between border-b border-white/5 pb-1"><span>{t.ratingExampleWinClose}</span></li>
                                <li className="flex justify-between border-b border-white/5 pb-1"><span>{t.ratingExampleDraw}</span></li>
                                <li className="flex justify-between border-b border-white/5 pb-1"><span>{t.ratingExampleLossClose}</span></li>
                                <li className="flex justify-between border-b border-white/5 pb-1"><span>{t.ratingExampleLossHeavy}</span></li>
                                <li className="flex justify-between border-b border-white/5 pb-1"><span>{t.ratingExampleGoal}</span></li>
                                <li className="flex justify-between"><span>{t.ratingExampleCleanSheet}</span></li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const MainCardView: React.FC<{ player: Player, onNavigate: (view: View) => void, cardStyle?: React.CSSProperties, isPromo?: boolean }> = ({ player, onNavigate, cardStyle, isPromo }) => {
    const t = useTranslation();
    const defaultButtonClasses = "w-full !py-3 flex items-center justify-center shadow-lg shadow-dark-accent-start/20 hover:shadow-dark-accent-start/40 border border-dark-accent-start/30 font-chakra font-bold text-xl tracking-wider";
    
    const ButtonComponent = isPromo ? PromoStyledButton : Button;
    const buttonProps = isPromo ? {} : { variant: 'secondary' as const, className: defaultButtonClasses };

    return (
        <div>
            <ReadOnlyPlayerCard player={player} style={cardStyle} />
            <div className="flex flex-col gap-4 mt-6">
                <ButtonComponent onClick={() => onNavigate('stats')} {...buttonProps}>{t.statistics}</ButtonComponent>
                <ButtonComponent onClick={() => onNavigate('awards')} {...buttonProps}>{t.awards}</ButtonComponent>
                <ButtonComponent onClick={() => onNavigate('info')} {...buttonProps}>{t.information}</ButtonComponent>
            </div>
        </div>
    );
};

export const PublicPlayerCard: React.FC<{ player: Player; cardStyle?: React.CSSProperties; compact?: boolean; isPromo?: boolean }> = ({ player, cardStyle, isPromo }) => {
    const [view, setView] = React.useState<View>('main');

    switch (view) {
        case 'stats':
            return <StatsView player={player} onBack={() => setView('main')} isPromo={isPromo} />;
        case 'awards':
            return <AwardsView player={player} onBack={() => setView('main')} />;
        case 'info':
            return <InfoView onBack={() => setView('main')} />;
        case 'main':
        default:
            return <MainCardView player={player} onNavigate={setView} cardStyle={cardStyle} isPromo={isPromo} />;
    }
};
