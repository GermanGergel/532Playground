import React from 'react';
import { Player, PlayerTier, PlayerStatus, BadgeType, PlayerForm, SkillType } from '../types';
import { getPlayerKeyStats } from '../services/statistics';
import { convertCountryCodeAlpha3ToAlpha2 } from '../utils/countries';
import { Card, useTranslation, Button } from '../ui';
import { LastSessionBreakdown, ClubRankings, BestSessionCard } from './PlayerCardAnalytics';
import { BadgeIcon } from '../features';
import { BarChartDynamic, TrophyIcon, InfoIcon, StarIcon, ChevronLeft } from '../icons';

type View = 'main' | 'stats' | 'awards' | 'info';

const skillAbbreviations: Record<SkillType, string> = {
    goalkeeper: 'GK', power_shot: 'PS', technique: 'TQ', defender: 'DF', 
    playmaker: 'PM', finisher: 'FN', versatile: 'VS', tireless_motor: 'TM', leader: 'LD',
};

const FormArrowIndicator: React.FC<{ form: PlayerForm }> = ({ form }) => {
    const config = {
        hot_streak: { color: '#4CFF5F' }, stable: { color: '#A9B1BD' }, cold_streak: { color: '#FF4136' },
    };
    const currentForm = config[form] || config.stable;
    const commonProps: React.SVGProps<SVGSVGElement> = {
        width: "24", height: "24", viewBox: "0 0 24 24", fill: "none", stroke: currentForm.color,
        strokeWidth: "2.5", strokeLinecap: "round", strokeLinejoin: "round",
    };
    switch (form) {
        case 'hot_streak': return <svg {...commonProps}><path d="M12 19V5m-6 7l6-6 6 6"/></svg>;
        case 'cold_streak': return <svg {...commonProps}><path d="M12 5v14M12 5v14M5 12l7 7 7-7"/></svg>;
        default: return <svg {...commonProps}><path d="M5 12h14m-6-6l6 6-6 6"/></svg>;
    }
};

// Read-only version of the main PlayerCard, identical to the admin panel one
const ReadOnlyPlayerCard: React.FC<{ player: Player }> = ({ player }) => {
    const t = useTranslation();
    const countryCodeAlpha2 = React.useMemo(() => player.countryCode ? convertCountryCodeAlpha3ToAlpha2(player.countryCode) : null, [player.countryCode]);
    const badgeList = player.badges ? (Object.keys(player.badges) as BadgeType[]) : [];
    
    const cardClass = "border border-white/10 shadow-[0_0_15px_rgba(0,242,254,0.3)]";

    return (
        <div>
            <div className={`relative rounded-3xl h-[440px] overflow-hidden text-white p-4 bg-dark-surface ${cardClass}`}>
                {player.playerCard && <div className="absolute inset-0 w-full h-full bg-cover bg-no-repeat" style={{ backgroundImage: `url(${player.playerCard})`, backgroundPosition: 'center 5%' }} />}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent"></div>
                <div className="absolute top-24 left-4 z-20"><div className="space-y-4">{(player.skills || []).map(skill => (<div key={skill} className="flex items-center gap-2" title={t[`skill_${skill}` as keyof typeof t] || skill}><StarIcon className="w-4 h-4 text-[#00F2FE]" /><span className="font-bold text-xs text-white tracking-wider">{skillAbbreviations[skill]}</span></div>))}</div></div>
                <div className="relative z-10 h-full flex flex-col justify-between">
                    <div className="flex justify-between items-start">
                        <div>
                            <p style={{ color: '#00F2FE' }} className="text-base font-black leading-none">532</p>
                            <p className="text-white text-[7px] font-bold tracking-[0.15em] leading-none mt-1">PLAYGROUND</p>
                            {countryCodeAlpha2 && <img src={`https://flagcdn.com/w40/${countryCodeAlpha2.toLowerCase()}.png`} alt={`${player.countryCode} flag`} className="w-6 h-auto mt-3 rounded-sm" />}
                        </div>
                        <div className="flex flex-col items-center">
                            <div className="text-4xl font-black leading-none" style={{ color: '#00F2FE', textShadow: 'none' }}>{player.rating}</div>
                            <p className="font-bold text-white tracking-widest text-sm">OVG</p>
                            <div className="mt-1"><FormArrowIndicator form={player.form} /></div>
                            {badgeList.length > 0 && (
                                <div className="mt-4 flex flex-row-reverse items-center gap-x-2">
                                    <div className="flex flex-col space-y-2 items-center">{badgeList.slice(0, 8).map(badge => (<div key={badge} title={t[`badge_${badge}` as keyof typeof t] || ''}><BadgeIcon badge={badge} count={player.badges?.[badge]} className="w-7 h-7" /></div>))}</div>
                                    {badgeList.length > 8 && <div className="flex flex-col space-y-2 items-center">{badgeList.slice(8, 16).map(badge => (<div key={badge} title={t[`badge_${badge}` as keyof typeof t] || ''}><BadgeIcon badge={badge} count={player.badges?.[badge]} className="w-7 h-7" /></div>))}</div>}
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="text-center"><h1 className="text-4xl font-black uppercase tracking-tight drop-shadow-lg">{player.nickname} {player.surname}</h1></div>
                </div>
            </div>
        </div>
    );
};

const SubViewHeader: React.FC<{ title: string, onBack: () => void }> = ({ title, onBack }) => (
    <div className="flex items-center justify-between mb-6">
        <Button variant="ghost" className="!p-2 -ml-2" onClick={onBack}>
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

const SessionTrendChart: React.FC<{ history?: Player['sessionHistory']; t: any }> = ({ history = [], t }) => {
    const displayData = Array.from({ length: 5 }).map((_, i) => {
        const item = history[history.length - 5 + i];
        return item ? { winRate: item.winRate } : { winRate: 0 };
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
                const height = session.winRate > 0 ? `${Math.max(session.winRate, 15)}%` : '5%';
                const color = getBarColor(session.winRate);
                return <div key={index} className="w-2.5 rounded-t-full transition-all duration-500 ease-out" style={{ height: height, background: `linear-gradient(to top, ${hexToRgba(color, 0.1)}, ${color})`, boxShadow: `0 0 4px ${color}`, opacity: session.winRate > 0 ? 1 : 0.2, }} title={`${t.winRate}: ${session.winRate > 0 ? session.winRate + '%' : 'N/A'}`} />;
            })}
        </div>
    );
};

const StatsView: React.FC<{ player: Player; onBack: () => void }> = ({ player, onBack }) => {
    const t = useTranslation();
    const winRate = player.totalGames > 0 ? `${Math.round((player.totalWins / player.totalGames) * 100)}%` : 'N/A';
    const goalsPerSession = player.totalSessionsPlayed > 0 ? (player.totalGoals / player.totalSessionsPlayed).toFixed(2) : '0.00';
    const assistsPerSession = player.totalSessionsPlayed > 0 ? (player.totalAssists / player.totalSessionsPlayed).toFixed(2) : '0.00';
    const cardNeonClasses = "border border-white/10 shadow-[0_0_15px_rgba(0,242,254,0.3)]";

    const StatItem: React.FC<{ label: string; value: string | number; }> = ({ label, value }) => (
        <div><p className={`text-base font-bold`}>{value}</p><p className="text-[10px] text-dark-text-secondary uppercase">{label}</p></div>
    );

    return (
        <div>
            <SubViewHeader title={t.statistics} onBack={onBack} />
            <div className="space-y-3">
                {player.lastRatingChange && <LastSessionBreakdown player={player} />}
                <BestSessionCard player={player} />
                <ClubRankings player={player} />
                <Card title={t.allTimeStats} className={cardNeonClasses}><div className="grid grid-cols-4 gap-2 text-center">
                    <StatItem label={t.thSessions} value={player.totalSessionsPlayed} />
                    <StatItem label={t.thG} value={player.totalGoals} />
                    <StatItem label={t.thA} value={player.totalAssists} />
                    <StatItem label={t.winRate.toUpperCase()} value={winRate} />
                </div></Card>
                <Card title={t.monthlyStatsTitle} className={cardNeonClasses}><div className="grid grid-cols-4 gap-2 text-center">
                    <StatItem label={t.session.toUpperCase()} value={player.monthlySessionsPlayed} />
                    <StatItem label={t.monthlyGoals.toUpperCase()} value={player.monthlyGoals} />
                    <StatItem label={t.monthlyAssists.toUpperCase()} value={player.monthlyAssists} />
                    <StatItem label={t.monthlyWins.toUpperCase()} value={player.monthlyWins} />
                </div></Card>
                 <Card title="Career Averages" className={cardNeonClasses}><div className="grid grid-cols-2 gap-2 text-center">
                    <StatItem label={t.goalsPerSession} value={goalsPerSession} />
                    <StatItem label={t.assistsPerSession} value={assistsPerSession} />
                </div></Card>
                <Card title={`${t.winLossDraw} (${player.totalWins}W ${player.totalDraws}D ${player.totalLosses}L)`} className={cardNeonClasses}>
                    <WLDBar wins={player.totalWins} draws={player.totalDraws} losses={player.totalLosses} total={player.totalGames} t={t} />
                </Card>
                <Card title={t.sessionTrend} className={cardNeonClasses}>
                    <SessionTrendChart history={player.sessionHistory} t={t} />
                </Card>
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
        'career_100_wins', 'career_150_influence', 'career_super_veteran'
    ];

    return (
        <div>
            <SubViewHeader title={t.awards} onBack={onBack} />
            <div className="grid grid-cols-2 gap-x-4 gap-y-6">
                {ALL_BADGES.map(badge => {
                    const isEarned = player.badges && player.badges[badge];
                    const count = player.badges?.[badge];
                    
                    return (
                        <div 
                            key={badge} 
                            className="flex flex-col items-center text-center transition-all duration-300"
                        >
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
        'career_100_wins', 'career_150_influence', 'career_super_veteran'
    ];
    const ALL_SKILLS: SkillType[] = ['goalkeeper', 'power_shot', 'technique', 'defender', 'playmaker', 'finisher', 'versatile', 'tireless_motor', 'leader'];
    return (
        <div>
            <SubViewHeader title={t.information} onBack={onBack} />
            <div className="space-y-8">
                <div>
                    <h3 className="text-lg font-bold mb-3">{t.ratingCalculationTitle}</h3>
                    <p className="text-sm text-dark-text-secondary">{t.ratingCalculationDesc}</p>
                    <div className="mt-4 p-3 bg-dark-bg/50 rounded-lg border border-white/10">
                        <h4 className="font-bold mb-2 text-dark-text">{t.ratingCalculationExamplesTitle}</h4>
                        <ul className="text-xs text-dark-text-secondary list-disc list-inside space-y-1">
                            <li>{t.ratingExampleWinStrong}</li>
                            <li>{t.ratingExampleWinClose}</li>
                            <li>{t.ratingExampleDraw}</li>
                            <li>{t.ratingExampleLossClose}</li>
                            <li>{t.ratingExampleLossHeavy}</li>
                            <li>{t.ratingExampleGoal}</li>
                            <li>{t.ratingExampleAssist}</li>
                            <li>{t.ratingExampleCleanSheet}</li>
                        </ul>
                    </div>
                </div>
                 <div className="pt-6 border-t border-white/10">
                    <h3 className="text-lg font-bold mb-3">{t.badgeBonusTitle}</h3>
                    <p className="text-sm text-dark-text-secondary">{t.badgeBonusDesc}</p>
                    <div className="mt-4 p-3 bg-dark-bg/50 rounded-lg border border-white/10">
                        <p className="text-xs text-dark-text-secondary mb-2">{t.badgeBonusExampleNote}</p>
                        <ul className="text-xs text-dark-text list-disc list-inside space-y-1 font-semibold">
                           <li>{t.badgeBonusMvp}</li>
                           <li>{t.badgeBonusTopScorer}</li>
                        </ul>
                    </div>
                </div>
                <div className="pt-6 border-t border-white/10">
                    <h3 className="text-lg font-bold mb-3 flex items-center gap-2"><StarIcon className="w-5 h-5" /> {t.keySkillsTitle}</h3>
                    <p className="text-sm text-dark-text-secondary mb-3">{t.keySkillsDesc}</p>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                        {ALL_SKILLS.map(skill => (<div key={skill} className="flex items-center gap-2"><StarIcon className="w-3 h-3 text-dark-accent-start flex-shrink-0" /><p className="text-sm">{t[`skill_${skill}` as keyof typeof t]}</p></div>))}
                    </div>
                    <p className="text-xs text-dark-text-secondary mt-4 italic">{t.keySkillsAdminNote}</p>
                </div>
                <div className="pt-6 border-t border-white/10">
                    <h3 className="text-lg font-bold mb-3 flex items-center gap-2"><TrophyIcon className="w-5 h-5" /> {t.badges}</h3>
                    <div className="space-y-4 pt-2">
                        {ALL_BADGES.map(badge => (<div key={badge} className="flex items-start gap-3"><BadgeIcon badge={badge} className="w-8 h-8 flex-shrink-0" /><div><p className="text-sm font-semibold leading-tight">{t[`badge_${badge}` as keyof typeof t]}</p><p className="text-xs text-dark-text-secondary leading-snug mt-0.5">{t[`badge_${badge}_desc` as keyof typeof t]}</p></div></div>))}
                    </div>
                </div>
            </div>
        </div>
    );
};

const MainCardView: React.FC<{ player: Player, onNavigate: (view: View) => void }> = ({ player, onNavigate }) => {
    const t = useTranslation();
    const buttonClasses = "w-full !py-3 flex items-center justify-center shadow-lg shadow-dark-accent-start/20 hover:shadow-dark-accent-start/40 border border-dark-accent-start/30 font-chakra font-bold text-xl tracking-wider";
    return (
        <div>
            <ReadOnlyPlayerCard player={player} />
            <div className="flex flex-col gap-4 mt-6">
                <Button variant="secondary" onClick={() => onNavigate('stats')} className={buttonClasses}>{t.statistics}</Button>
                <Button variant="secondary" onClick={() => onNavigate('awards')} className={buttonClasses}>{t.awards}</Button>
                <Button variant="secondary" onClick={() => onNavigate('info')} className={buttonClasses}>{t.information}</Button>
            </div>
        </div>
    );
};

export const PublicPlayerCard: React.FC<{ player: Player }> = ({ player }) => {
    const [view, setView] = React.useState<View>('main');

    switch (view) {
        case 'stats':
            return <StatsView player={player} onBack={() => setView('main')} />;
        case 'awards':
            return <AwardsView player={player} onBack={() => setView('main')} />;
        case 'info':
            return <InfoView onBack={() => setView('main')} />;
        case 'main':
        default:
            return <MainCardView player={player} onNavigate={setView} />;
    }
};