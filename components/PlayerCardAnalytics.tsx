
import React, { useMemo, useState, useRef, useEffect } from 'react';
import { Player, PlayerStatus, PlayerHistoryEntry } from '../types';
import { Card, useTranslation } from '../ui';
import { useApp } from '../context';
import { BadgeIcon } from '../features';
import { useLocation } from 'react-router-dom';
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
    const t = useTranslation() as any;
    const location = useLocation();
    const breakdown = player.lastRatingChange;

    if (!breakdown) return null;

    const isHub = location.pathname.includes('/hub');
    const isPenalty = player.consecutiveMissedSessions && player.consecutiveMissedSessions >= 3;
    const floor = player.initialRating || 68;

    // SOURCE OF TRUTH: Always use player.rating for the "New" rating display
    const displayNewRating = player.rating;
    // RECALCULATE Delta based on corrected visuals
    const displayDelta = displayNewRating - breakdown.previousRating;

    const RatingCircle: React.FC<{ rating: number, isNew?: boolean }> = ({ rating, isNew }) => (
        <div className="flex flex-col items-center gap-1 w-20">
            <div className={`
                w-16 h-16 rounded-full flex items-center justify-center shrink-0
                ${isNew 
                    ? 'bg-dark-accent-start/10 border-2 border-[#00F2FE]'
                    : 'bg-dark-surface border-2 border-dark-text-secondary/50'
                }
            `}>
                <span className={`font-black text-3xl leading-none ${isNew ? 'text-[#00F2FE]' : 'text-dark-text'}`} style={{ textShadow: 'none' }}>
                    {rating.toFixed(0)}
                </span>
            </div>
            <span className={`text-[9px] font-bold uppercase text-center leading-none tracking-tight ${isNew ? 'text-[#00F2FE]' : 'text-dark-text-secondary'}`}>
                {isNew ? t.newRating : t.previousRating}
            </span>
        </div>
    );

    const Content = () => (
        <div className="flex flex-col gap-3 pt-5">
            <div className="flex items-center justify-between px-1">
                <RatingCircle rating={breakdown.previousRating} />
                
                <div className="flex flex-col items-center justify-center gap-1.5 flex-grow px-2">
                     {isPenalty ? (
                        <div className="flex flex-col items-center justify-center text-center">
                            <span className="text-xl font-black text-red-500 leading-none">{displayDelta.toFixed(1)}</span>
                            <span className="text-[9px] text-red-400 font-bold uppercase mt-1">PENALTY</span>
                        </div>
                     ) : (
                        <>
                             <div className="flex items-start justify-center gap-2 text-center">
                                <RatingChangePill value={breakdown.teamPerformance} label={t.lastSessionAnalysis_team} />
                                <RatingChangePill value={breakdown.individualPerformance} label={t.lastSessionAnalysis_indiv} />
                                <RatingChangePill value={breakdown.badgeBonus} label={t.lastSessionAnalysis_badge} />
                            </div>
                            <div className="w-full h-px bg-gradient-to-r from-transparent via-dark-accent-start to-transparent opacity-50 my-0.5"></div>
                            <div className="flex flex-col items-center justify-center text-center">
                                <p className={`text-base font-bold leading-tight ${displayDelta >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                    {displayDelta >= 0 ? '+' : ''}{displayDelta.toFixed(1)}
                                </p>
                                <p className="text-[9px] text-dark-text-secondary uppercase leading-none mt-0.5">{t.finalChange}</p>
                            </div>
                        </>
                     )}
                </div>

                <RatingCircle rating={displayNewRating} isNew />
            </div>

            {isPenalty && (
                <div className="pt-3 mt-3 border-t border-red-500/20">
                    <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-4 flex flex-col items-center gap-2">
                        <div className="flex items-center gap-2 text-red-500">
                            <ExclamationIcon className="w-5 h-5 shadow-[0_0_10px_rgba(239,68,68,0.5)]" />
                            <span className="font-russo text-xs tracking-widest uppercase">{t.penalty_title}</span>
                        </div>
                        <p className="text-[10px] font-chakra font-bold text-red-200/60 uppercase leading-relaxed text-center">
                            {t.penalty_message?.replace('{n}', Math.abs(displayDelta).toFixed(0)).replace('{m}', (player.consecutiveMissedSessions || 0).toString())}
                        </p>
                    </div>
                </div>
            )}
        </div>
    );

    if (usePromoStyle) return <div className="w-full"><h2 className="text-[10px] tracking-tighter opacity-70 uppercase font-bold text-white mb-2 ml-1">{t.lastSessionAnalysis}</h2><Content /></div>;

    return <Card title={t.lastSessionAnalysis} titleClassName="!text-[10px] !tracking-tighter !opacity-70 uppercase" className="border border-white/10 shadow-[0_0_15px_rgba(0,242,254,0.3)]"><Content /></Card>;
};

// ... Remaining components (ClubRankings, BestSessionCard, PlayerProgressChart) remain the same
export const ClubRankings: React.FC<{ player: Player; usePromoStyle?: boolean }> = ({ player, usePromoStyle = false }) => {
    const t = useTranslation();
    const { allPlayers } = useApp();
    const rankings = React.useMemo(() => {
        const confirmedPlayers = allPlayers.filter(p => p.status === PlayerStatus.Confirmed);
        if (confirmedPlayers.length < 2) return null;
        const sortedByGoals = [...confirmedPlayers].sort((a, b) => b.totalGoals - a.totalGoals);
        const sortedByAssists = [...confirmedPlayers].sort((a, b) => b.totalAssists - a.totalAssists);
        const sortedByRating = [...confirmedPlayers].sort((a, b) => b.rating - a.rating);
        return { goalRank: sortedByGoals.findIndex(p => p.id === player.id) + 1, assistRank: sortedByAssists.findIndex(p => p.id === player.id) + 1, ratingRank: sortedByRating.findIndex(p => p.id === player.id) + 1, total: confirmedPlayers.length };
    }, [allPlayers, player.id]);
    const RankItem: React.FC<{ label: string; rank: number; total: number }> = ({ label, rank, total }) => (
        <div className="flex flex-col items-center gap-1 text-center py-1">
            <div className="flex items-baseline gap-1"><p className="text-lg font-bold text-[#00F2FE]">{rank}</p><p className="text-[10px] text-dark-text-secondary font-medium">/ {total}</p></div>
            <p className="text-[9px] text-dark-text-secondary uppercase font-semibold">{label}</p>
        </div>
    );
    if (!rankings) return null;
    if (usePromoStyle) return <div className="w-full"><h2 className="text-[10px] tracking-tighter opacity-70 uppercase font-bold text-white mb-2 ml-1">{t.clubRankings}</h2><div className="grid grid-cols-3 gap-2 divide-x divide-white/10"><RankItem label={t.topScorer} rank={rankings.goalRank} total={rankings.total} /><RankItem label={t.topAssistant} rank={rankings.assistRank} total={rankings.total} /><RankItem label={t.rating} rank={rankings.ratingRank} total={rankings.total} /></div></div>;
    return <Card title={t.clubRankings}><div className="grid grid-cols-3 gap-2 divide-x divide-white/10"><RankItem label={t.topScorer} rank={rankings.goalRank} total={rankings.total} /><RankItem label={t.topAssistant} rank={rankings.assistRank} total={rankings.total} /><RankItem label={t.rating} rank={rankings.ratingRank} total={rankings.total} /></div></Card>;
};

export const BestSessionCard: React.FC<{ player: Player; usePromoStyle?: boolean }> = ({ player, usePromoStyle = false }) => {
    const t = useTranslation();
    const getSafeValue = (val: any) => { if (val === undefined || val === null) return 0; const num = Number(val); return isNaN(num) ? 0 : num; };
    const records = (player.records || {}) as any;
    const bestGoals = getSafeValue(records.bestGoalsInSession?.value);
    const bestAssists = getSafeValue(records.bestAssistsInSession?.value);
    const bestWinRate = getSafeValue(records.bestWinRateInSession?.value);
    const Content = () => <div className="grid grid-cols-3 gap-2 text-center"><div><p className="text-base font-bold">{bestGoals}</p><p className="text-[10px] text-dark-text-secondary uppercase">{t.recordGoals}</p></div><div><p className="text-base font-bold">{bestAssists}</p><p className="text-[10px] text-dark-text-secondary uppercase">{t.recordAssists}</p></div><div><p className="text-base font-bold">{bestWinRate}%</p><p className="text-[10px] text-dark-text-secondary uppercase">{t.bestWinRate}</p></div></div>;
    if (usePromoStyle) return <div className="w-full"><h2 className="text-[10px] tracking-tighter opacity-70 uppercase font-bold text-white mb-2 ml-1">{t.bestSessionTitle}</h2><Content /></div>;
    return <Card title={t.bestSessionTitle} className="border border-white/10 shadow-[0_0_15px_rgba(0,242,254,0.3)]"><Content /></Card>;
};

export const PlayerProgressChart: React.FC<{ history: PlayerHistoryEntry[], usePromoStyle?: boolean }> = ({ history, usePromoStyle = false }) => {
    const [activeMetric, setActiveMetric] = useState<'rating' | 'winRate' | 'goals'>('rating');
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const chartData = useMemo(() => { if (!history || history.length === 0) return []; if (history.length === 1) return [history[0], history[0]]; return history; }, [history]);
    useEffect(() => { if (scrollContainerRef.current) scrollContainerRef.current.scrollLeft = scrollContainerRef.current.scrollWidth; }, [chartData, activeMetric]);
    if (chartData.length === 0) return null;
    const height = 160; const pointSpacing = 60; const width = Math.max(300, (chartData.length - 1) * pointSpacing + 40);
    const getValue = (entry: PlayerHistoryEntry) => { switch (activeMetric) { case 'rating': return entry.rating; case 'winRate': return entry.winRate; case 'goals': return entry.goals; default: return 0; } };
    const values = chartData.map(getValue); const minVal = Math.min(...values); const maxVal = Math.max(...values);
    const yMin = Math.max(0, minVal - (maxVal - minVal === 0 ? 10 : (maxVal - minVal) * 0.3));
    const yMax = maxVal + (maxVal - minVal === 0 ? 10 : (maxVal - minVal) * 0.3);
    const getY = (value: number) => height - 30 - ((value - yMin) / (yMax - yMin) * (height - 60));
    const linePath = chartData.map((e, i) => `${i === 0 ? 'M' : 'L'} ${20 + i * pointSpacing} ${getY(getValue(e))}`).join(' ');
    const theme = activeMetric === 'rating' ? { color: '#00F2FE' } : activeMetric === 'winRate' ? { color: '#4CFF5F' } : { color: '#FFD700' };
    return (
        <Card className="border border-white/10 shadow-[0_0_15px_rgba(0,242,254,0.3)] overflow-hidden !p-4">
            <div className="flex justify-between items-start mb-4">
                <div className="flex flex-col"><span className="text-4xl font-black leading-none" style={{ color: theme.color }}>{values[values.length - 1]}</span><span className="text-[10px] font-bold text-dark-text-secondary uppercase tracking-[0.2em]">{activeMetric.toUpperCase()}</span></div>
                <div className="flex bg-dark-bg/50 rounded-lg p-0.5">
                    {['rating', 'winRate', 'goals'].map(m => <button key={m} onClick={() => setActiveMetric(m as any)} className={`px-2 py-1 text-[9px] font-bold uppercase rounded-md transition-all ${activeMetric === m ? 'bg-dark-surface text-white' : 'text-dark-text-secondary'}`}>{m === 'winRate' ? 'Win %' : m.toUpperCase()}</button>)}
                </div>
            </div>
            <div ref={scrollContainerRef} className="w-full overflow-x-auto no-scrollbar"><div style={{ width: `${width}px`, height: `${height}px` }}><svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible"><path d={linePath} fill="none" stroke={theme.color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />{chartData.map((e, i) => <circle key={i} cx={20 + i * pointSpacing} cy={getY(getValue(e))} r="3" fill="#1A1D24" stroke={theme.color} strokeWidth="1.5" />)}</svg></div></div>
        </Card>
    );
};
