
import React, { useMemo } from 'react';
import { Player, PlayerStatus, PlayerHistoryEntry } from '../types';
import { Card, useTranslation } from '../ui';
import { useApp } from '../context';
import { BadgeIcon } from '../features';
import { ExclamationIcon } from '../icons';

const RatingChangePill: React.FC<{ value: number, label: string }> = ({ value, label }) => {
    if (value === 0) return null;
    const isPositive = value > 0;
    const text = `${isPositive ? '+' : ''}${value.toFixed(1)}`;
    const colorClasses = isPositive 
        ? 'bg-green-500/30 text-green-300' 
        : 'bg-red-500/30 text-red-300';
    
    return (
        <div className="flex flex-col items-center">
            <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${colorClasses}`}>
                {text}
            </span>
            <span className="text-[8px] text-dark-text-secondary uppercase mt-0.5">{label}</span>
        </div>
    );
};

export const LastSessionBreakdown: React.FC<{ player: Player; usePromoStyle?: boolean }> = ({ player, usePromoStyle = false }) => {
    const t = useTranslation();
    const breakdown = player.lastRatingChange;

    if (!breakdown) return null;

    // AUTO-DETECTION: If type is missing, check if it's a typical penalty pattern (-1 change, 0 performances)
    const isPenalty = breakdown.type === 'penalty' || 
                      (breakdown.finalChange === -1 && breakdown.teamPerformance === 0 && breakdown.individualPerformance === 0 && (breakdown.badgesEarned?.length || 0) === 0);
                      
    const badgesEarned = breakdown.badgesEarned || [];
    
    const RatingCircle: React.FC<{ rating: number, isNew?: boolean }> = ({ rating, isNew }) => (
        <div className="flex flex-col items-center gap-1 w-20">
            <div className={`
                w-16 h-16 rounded-full flex items-center justify-center shrink-0
                ${isNew 
                    ? `bg-dark-accent-start/10 border-2 ${isPenalty ? 'border-red-500 shadow-[0_0_10px_rgba(239,68,68,0.3)]' : 'border-[#00F2FE]'}`
                    : 'bg-dark-surface border-2 border-dark-text-secondary/50'
                }
            `}>
                <span className={`font-black text-3xl leading-none ${isNew ? (isPenalty ? 'text-red-400' : 'text-[#00F2FE]') : 'text-dark-text'}`} style={{ textShadow: 'none' }}>
                    {rating.toFixed(0)}
                </span>
            </div>
            <span className={`text-[9px] font-bold uppercase text-center leading-none tracking-tight ${isNew ? (isPenalty ? 'text-red-400' : 'text-[#00F2FE]') : 'text-dark-text-secondary'}`}>
                {isNew ? t.newRating : t.previousRating}
            </span>
        </div>
    );

    const Content = () => (
        <div className="flex flex-col gap-3 pt-5">
            <div className="flex items-center justify-between px-1">
                <RatingCircle rating={breakdown.previousRating} />
                
                <div className="flex flex-col items-center justify-center gap-1.5 flex-grow px-2">
                     {!isPenalty ? (
                        <div className="flex items-start justify-center gap-2 text-center animate-in fade-in zoom-in duration-500">
                            <RatingChangePill value={breakdown.teamPerformance} label={t.lastSessionAnalysis_team} />
                            <RatingChangePill value={breakdown.individualPerformance} label={t.lastSessionAnalysis_indiv} />
                            <RatingChangePill value={breakdown.badgeBonus} label={t.lastSessionAnalysis_badge} />
                        </div>
                     ) : (
                        <div className="flex flex-col items-center justify-center animate-in slide-in-from-top-2 duration-700">
                            <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center border border-red-500/30 mb-1 shadow-[0_0_15px_rgba(239,68,68,0.2)]">
                                <ExclamationIcon className="w-5 h-5 text-red-500" />
                            </div>
                            <span className="text-[10px] font-black text-red-400 uppercase tracking-widest leading-none">
                                {(t as any).penalty_title || "DISCIPLINARY"}
                            </span>
                        </div>
                     )}
                     
                     <div className={`w-full h-px bg-gradient-to-r from-transparent ${isPenalty ? 'via-red-500/40' : 'via-dark-accent-start'} to-transparent opacity-50 my-0.5`}></div>
                     
                     <div className="flex flex-col items-center justify-center text-center">
                        <p className={`text-base font-bold leading-tight ${breakdown.finalChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                           {breakdown.finalChange >= 0 ? '+' : ''}{breakdown.finalChange.toFixed(1)}
                        </p>
                        <p className="text-[9px] text-dark-text-secondary uppercase leading-none mt-0.5">
                            {isPenalty ? ((t as any).penalty_desc || "Inactivity Penalty") : t.finalChange}
                        </p>
                     </div>
                </div>

                <RatingCircle rating={breakdown.newRating} isNew />
            </div>

            {!isPenalty && badgesEarned.length > 0 && (
                <div className="pt-3 mt-3 border-t border-white/10 animate-in fade-in duration-1000">
                    <p className="text-center text-[9px] font-black tracking-widest text-dark-text-secondary mb-2 uppercase">{t.awards}</p>
                    <div className="flex justify-center items-center gap-3 flex-wrap">
                        {badgesEarned.map(badge => (
                            <div key={badge} title={t[`badge_${badge}` as keyof typeof t] || ''}>
                                <BadgeIcon badge={badge} className="w-8 h-8" />
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );

    if (usePromoStyle) {
        return (
            <div className="w-full">
                <h2 className="text-[10px] tracking-tighter opacity-70 uppercase font-bold text-white mb-2 ml-1">
                    {t.lastSessionAnalysis}
                </h2>
                <Content />
            </div>
        );
    }

    const cardClass = "border border-white/10 shadow-[0_0_15px_rgba(0,242,254,0.3)]";

    return (
        <Card 
            title={t.lastSessionAnalysis} 
            titleClassName="!text-[10px] !tracking-tighter !opacity-70 uppercase"
            className={cardClass}
        >
            <Content />
        </Card>
    );
};

export const ClubRankings: React.FC<{ player: Player; usePromoStyle?: boolean }> = ({ player, usePromoStyle = false }) => {
    const t = useTranslation();
    const { allPlayers } = useApp();

    const rankings = useMemo(() => {
        const confirmedPlayers = allPlayers.filter(p => p.status === PlayerStatus.Confirmed);
        if (confirmedPlayers.length === 0) return null;

        const sortedByGoals = [...confirmedPlayers].sort((a, b) => b.totalGoals - a.totalGoals);
        const sortedByAssists = [...confirmedPlayers].sort((a, b) => b.totalAssists - a.totalAssists);
        const sortedByRating = [...confirmedPlayers].sort((a, b) => b.rating - a.rating);

        return {
            goals: sortedByGoals.findIndex(p => p.id === player.id) + 1,
            assists: sortedByAssists.findIndex(p => p.id === player.id) + 1,
            rating: sortedByRating.findIndex(p => p.id === player.id) + 1,
            total: confirmedPlayers.length
        };
    }, [allPlayers, player.id]);

    if (!rankings) return null;

    const RankItem = ({ label, rank, total }: { label: string; rank: number; total: number }) => (
        <div className="flex flex-col items-center">
            <div className="flex items-baseline gap-1">
                <span className="text-lg font-black text-[#00F2FE]">#{rank}</span>
                <span className="text-[8px] text-dark-text-secondary font-bold">/ {total}</span>
            </div>
            <span className="text-[9px] text-dark-text-secondary uppercase font-bold tracking-tighter">{label}</span>
        </div>
    );

    const Content = () => (
        <div className="grid grid-cols-3 gap-2 py-1">
            <RankItem label={t.topScorer} rank={rankings.goals} total={rankings.total} />
            <RankItem label={t.topAssistant} rank={rankings.assists} total={rankings.total} />
            <RankItem label={t.rating} rank={rankings.rating} total={rankings.total} />
        </div>
    );

    if (usePromoStyle) {
        return (
            <div className="w-full">
                <h2 className="text-[10px] tracking-tighter opacity-70 uppercase font-bold text-white mb-2 ml-1">
                    {t.clubRankings}
                </h2>
                <Content />
            </div>
        );
    }

    return <Content />;
};

export const BestSessionCard: React.FC<{ player: Player; usePromoStyle?: boolean }> = ({ player, usePromoStyle = false }) => {
    const t = useTranslation();
    const records = player.records;

    const Stat = ({ label, value, unit }: { label: string; value: number | string; unit?: string }) => (
        <div className="flex flex-col items-center">
            <div className="flex items-baseline gap-0.5">
                <span className="text-lg font-black text-white">{value}</span>
                {unit && <span className="text-[10px] font-bold text-dark-text-secondary">{unit}</span>}
            </div>
            <span className="text-[8px] text-dark-text-secondary uppercase font-bold tracking-tighter text-center">{label}</span>
        </div>
    );

    const content = (
        <div className="grid grid-cols-3 gap-2 py-1">
            <Stat label={t.recordGoals} value={records?.bestGoalsInSession?.value || 0} />
            <Stat label={t.recordAssists} value={records?.bestAssistsInSession?.value || 0} />
            <Stat label={t.bestWinRate} value={records?.bestWinRateInSession?.value || 0} unit="%" />
        </div>
    );

    if (usePromoStyle) {
        return (
            <div className="w-full">
                <h2 className="text-[10px] tracking-tighter opacity-70 uppercase font-bold text-white mb-2 ml-1">
                    {t.bestSessionTitle}
                </h2>
                {content}
            </div>
        );
    }

    const cardClass = "border border-white/10 shadow-[0_0_15px_rgba(0,242,254,0.3)]";

    return (
        <Card 
            title={t.bestSessionTitle} 
            titleClassName="!text-[10px] !tracking-tighter !opacity-70 uppercase"
            className={cardClass}
        >
            {content}
        </Card>
    );
};

export const PlayerProgressChart: React.FC<{ history: PlayerHistoryEntry[]; usePromoStyle?: boolean }> = ({ history, usePromoStyle = false }) => {
    const chartData = useMemo(() => {
        if (!history || history.length === 0) return [];
        if (history.length === 1) return [history[0], history[0]];
        return history.slice(-10);
    }, [history]);

    if (chartData.length === 0) return null;

    const values = chartData.map(d => d.rating);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min;
    const padding = range === 0 ? 5 : range * 0.2;
    const yMin = Math.max(0, min - padding);
    const yMax = max + padding;

    const width = 300;
    const height = 100;
    const spacing = width / (chartData.length - 1 || 1);

    const points = chartData.map((d, i) => {
        const x = i * spacing;
        const y = height - ((d.rating - yMin) / (yMax - yMin)) * height;
        return `${x},${y}`;
    }).join(' ');

    const ChartContent = () => (
        <div className="relative w-full h-24 mt-2 overflow-hidden">
            <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible" preserveAspectRatio="none">
                <defs>
                    <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#00F2FE" stopOpacity="0.2" />
                        <stop offset="100%" stopColor="#00F2FE" stopOpacity="0" />
                    </linearGradient>
                </defs>
                <path
                    d={`M 0,${height} ${points.split(' ').map((p, i) => (i === 0 ? 'M ' : 'L ') + p).join(' ')} L ${width},${height} Z`}
                    fill="url(#chartGradient)"
                />
                <polyline
                    fill="none"
                    stroke="#00F2FE"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    points={points}
                    style={{ filter: 'drop-shadow(0 0 5px rgba(0, 242, 254, 0.5))' }}
                />
            </svg>
            <div className="absolute top-0 right-0 flex flex-col items-end pointer-events-none">
                <span className="text-[10px] font-black text-[#00F2FE] leading-none">{Math.round(max)}</span>
                <span className="text-[7px] text-white/20 uppercase font-bold tracking-tighter">Peak</span>
            </div>
            <div className="absolute bottom-4 right-0 flex flex-col items-end pointer-events-none">
                <span className="text-[10px] font-black text-white/40 leading-none">{Math.round(chartData[chartData.length - 1].rating)}</span>
                <span className="text-[7px] text-white/20 uppercase font-bold tracking-tighter">Latest</span>
            </div>
        </div>
    );

    if (usePromoStyle) {
        return (
            <div className="w-full">
                <h2 className="text-[10px] tracking-tighter opacity-70 uppercase font-bold text-white mb-2 ml-1">
                    Progress
                </h2>
                <ChartContent />
            </div>
        );
    }

    const cardClass = "border border-white/10 shadow-[0_0_15px_rgba(0,242,254,0.3)]";

    return (
        <Card 
            title="Progress" 
            titleClassName="!text-[10px] !tracking-tighter !opacity-70 uppercase"
            className={cardClass}
        >
            <ChartContent />
        </Card>
    );
};
