
import React, { useMemo, useState, useRef, useEffect, useLayoutEffect } from 'react';
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

    const badgesEarned = breakdown.badgesEarned || [];
    
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
                     {isHub && isPenalty ? (
                        <div className="flex flex-col items-center justify-center text-center">
                            <span className="text-xl font-black text-red-500 leading-none">-{Math.abs(breakdown.finalChange).toFixed(1)}</span>
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
                                <p className={`text-base font-bold leading-tight ${breakdown.finalChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                {breakdown.finalChange >= 0 ? '+' : ''}{breakdown.finalChange.toFixed(1)}
                                </p>
                                <p className="text-[9px] text-dark-text-secondary uppercase leading-none mt-0.5">{t.finalChange}</p>
                            </div>
                        </>
                     )}
                </div>

                <RatingCircle rating={breakdown.newRating} isNew />
            </div>

            {isHub && isPenalty ? (
                <div className="pt-3 mt-3 border-t border-red-500/20">
                    <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-4 flex flex-col items-center gap-2">
                        <div className="flex items-center gap-2 text-red-500">
                            <ExclamationIcon className="w-5 h-5 shadow-[0_0_10px_rgba(239,68,68,0.5)]" />
                            <span className="font-russo text-xs tracking-widest uppercase">{t.penalty_title}</span>
                        </div>
                        <p className="text-[10px] font-chakra font-bold text-red-200/60 uppercase leading-relaxed text-center">
                            {t.penalty_message?.replace('{n}', '1').replace('{m}', (player.consecutiveMissedSessions || 0).toString())}
                        </p>
                    </div>
                </div>
            ) : (
                badgesEarned.length > 0 && (
                    <div className="pt-3 mt-3 border-t border-white/10">
                        <p className="text-center text-[9px] font-black tracking-widest text-dark-text-secondary mb-2 uppercase">{t.awards}</p>
                        <div className="flex justify-center items-center gap-3 flex-wrap">
                            {badgesEarned.map(badge => (
                                <div key={badge} title={t[`badge_${badge}` as keyof typeof t] || ''}>
                                    <BadgeIcon badge={badge} className="w-8 h-8" />
                                </div>
                            ))}
                        </div>
                    </div>
                )
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
    
    const rankings = React.useMemo(() => {
        const confirmedPlayers = allPlayers.filter(p => p.status === PlayerStatus.Confirmed);
        
        if (confirmedPlayers.length < 1) return null;

        const sortedByGoals = [...confirmedPlayers].sort((a, b) => b.totalGoals - a.totalGoals);
        const sortedByAssists = [...confirmedPlayers].sort((a, b) => b.totalAssists - a.totalAssists);
        
        // SYNCED RANKING LOGIC (Rating -> G+A -> WinRate -> GP)
        const sortedByRating = [...confirmedPlayers].sort((a, b) => {
            if (b.rating !== a.rating) return b.rating - a.rating;
            
            const scoreA = (a.totalGoals || 0) + (a.totalAssists || 0);
            const scoreB = (b.totalGoals || 0) + (b.totalAssists || 0);
            if (scoreB !== scoreA) return scoreB - scoreA;
            
            const wrA = a.totalGames > 0 ? (a.totalWins / a.totalGames) : 0;
            const wrB = b.totalGames > 0 ? (b.totalWins / b.totalGames) : 0;
            if (wrB !== wrA) return wrB - wrA;
            
            return (b.totalGames || 0) - (a.totalGames || 0);
        });

        const goalRank = sortedByGoals.findIndex(p => p.id === player.id) + 1;
        const assistRank = sortedByAssists.findIndex(p => p.id === player.id) + 1;
        const ratingRank = sortedByRating.findIndex(p => p.id === player.id) + 1;

        return { goalRank, assistRank, ratingRank, total: confirmedPlayers.length };
    }, [allPlayers, player.id]);
    
    const RankItem: React.FC<{ label: string; rank: number; total: number }> = ({ label, rank, total }) => (
        <div className="flex flex-col items-center gap-1 text-center py-1">
            <div className="flex items-baseline gap-1">
                <p className="text-lg font-bold text-[#00F2FE]">{rank > 0 ? rank : '-'}</p>
                <p className="text-[10px] text-dark-text-secondary font-medium">/ {total}</p>
            </div>
            <p className="text-[9px] text-dark-text-secondary uppercase font-semibold">{label}</p>
        </div>
    );
    
    if (!rankings) return null;

    if (usePromoStyle) {
        return (
            <div className="w-full">
                <h2 className="text-[10px] tracking-tighter opacity-70 uppercase font-bold text-white mb-2 ml-1">
                    {t.clubRankings}
                </h2>
                <div className="grid grid-cols-3 gap-2 divide-x divide-white/10">
                    <RankItem label={t.topScorer} rank={rankings.goalRank} total={rankings.total} />
                    <RankItem label={t.topAssistant} rank={rankings.assistRank} total={rankings.total} />
                    <RankItem label={t.rating} rank={rankings.ratingRank} total={rankings.total} />
                </div>
            </div>
        );
    }

    return (
        <Card title={t.clubRankings}>
            <div className="grid grid-cols-3 gap-2 divide-x divide-white/10">
                <RankItem label={t.topScorer} rank={rankings.goalRank} total={rankings.total} />
                <RankItem label={t.topAssistant} rank={rankings.assistRank} total={rankings.total} />
                <RankItem label={t.rating} rank={rankings.ratingRank} total={rankings.total} />
            </div>
        </Card>
    );
};

export const BestSessionCard: React.FC<{ player: Player; usePromoStyle?: boolean }> = ({ player, usePromoStyle = false }) => {
    const t = useTranslation();
    
    const getSafeValue = (val: any) => {
        if (val === undefined || val === null) return 0;
        const num = Number(val);
        return isNaN(num) ? 0 : num;
    };

    const records = (player.records || {}) as any;
    const bestGoals = getSafeValue(records.bestGoalsInSession?.value);
    const bestAssists = getSafeValue(records.bestAssistsInSession?.value);
    const bestWinRate = getSafeValue(records.bestWinRateInSession?.value);

    const Content = () => (
        <div className="grid grid-cols-3 gap-2 text-center">
            <div>
                <p className="text-base font-bold">{bestGoals}</p>
                <p className="text-[10px] text-dark-text-secondary uppercase">{t.recordGoals}</p>
            </div>
            <div>
                <p className="text-base font-bold">{bestAssists}</p>
                <p className="text-[10px] text-dark-text-secondary uppercase">{t.recordAssists}</p>
            </div>
            <div>
                <p className="text-base font-bold">{bestWinRate}%</p>
                <p className="text-[10px] text-dark-text-secondary uppercase">{t.bestWinRate}</p>
            </div>
        </div>
    );

    if (usePromoStyle) {
        return (
            <div className="w-full">
                <h2 className="text-[10px] tracking-tighter opacity-70 uppercase font-bold text-white mb-2 ml-1">
                    {t.bestSessionTitle}
                </h2>
                <Content />
            </div>
        );
    }

    const cardClass = "border border-white/10 shadow-[0_0_15px_rgba(0,242,254,0.3)]";

    return (
        <Card title={t.bestSessionTitle} className={cardClass}>
            <Content />
        </Card>
    );
};

type ChartMetric = 'rating' | 'winRate' | 'goals';

export const PlayerProgressChart: React.FC<{ history: PlayerHistoryEntry[], usePromoStyle?: boolean }> = ({ history, usePromoStyle = false }) => {
    const [activeMetric, setActiveMetric] = useState<ChartMetric>('rating');
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    const chartData = useMemo(() => {
        if (!history || history.length === 0) return [];
        if (history.length === 1) return [history[0], history[0]];
        return history;
    }, [history]);

    useEffect(() => {
        const scrollToLatest = () => {
            if (scrollContainerRef.current) {
                const container = scrollContainerRef.current;
                container.scrollLeft = container.scrollWidth;
            }
        };

        scrollToLatest();
        const timer = setTimeout(scrollToLatest, 50);
        return () => clearTimeout(timer);
    }, [chartData, activeMetric]);

    if (chartData.length === 0) return null;

    const height = 160; 
    const paddingY = 30; 
    const pointSpacing = 60; 
    const width = Math.max(300, (chartData.length - 1) * pointSpacing + 40);

    const getValue = (entry: PlayerHistoryEntry) => {
        switch (activeMetric) {
            case 'rating': return entry.rating;
            case 'winRate': return entry.winRate;
            case 'goals': return entry.goals;
            default: return 0;
        }
    };

    const getLabel = () => {
        switch (activeMetric) {
            case 'rating': return 'OVR';
            case 'winRate': return 'WIN %';
            case 'goals': return 'GOALS';
            default: return '';
        }
    };

    const values = chartData.map(getValue);
    const minVal = Math.min(...values);
    const maxVal = Math.max(...values);
    
    const range = maxVal - minVal;
    const yBuffer = range === 0 ? 10 : range * 0.3; 
    const yMin = Math.max(0, minVal - yBuffer);
    const yMax = maxVal + yBuffer;

    const getX = (index: number) => 20 + index * pointSpacing; 
    const getY = (value: number) => {
        const normalized = (value - yMin) / (yMax - yMin);
        return height - paddingY - (normalized * (height - 2 * paddingY));
    };

    const linePath = useMemo(() => {
        if (chartData.length === 0) return '';
        return chartData.map((entry, index) => {
            const x = getX(index);
            const y = getY(getValue(entry));
            return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
        }).join(' ');
    }, [chartData, activeMetric, yMin, yMax]);

    const areaPath = useMemo(() => {
        if (!linePath) return '';
        const lastX = getX(chartData.length - 1);
        const bottomY = height - paddingY;
        const firstX = getX(0);
        return `${linePath} L ${lastX} ${bottomY} L ${firstX} ${bottomY} Z`;
    }, [linePath]);

    const theme = useMemo(() => {
        switch (activeMetric) {
            case 'rating': return { color: '#00F2FE', gradientStart: '#00F2FE', gradientEnd: 'rgba(0, 242, 254, 0)' };
            case 'winRate': return { color: '#4CFF5F', gradientStart: '#4CFF5F', gradientEnd: 'rgba(76, 255, 95, 0)' };
            case 'goals': return { color: '#FFD700', gradientStart: '#FFD700', gradientEnd: 'rgba(255, 215, 0, 0)' };
        }
    }, [activeMetric]);

    const currentValue = values[values.length - 1];
    
    let growth = 0;
    let isPositiveGrowth = true;
    let growthLabel = 'GROWTH';

    if (activeMetric === 'rating') {
        growth = Number((values[values.length - 1] - values[0]).toFixed(1));
        isPositiveGrowth = values[values.length - 1] >= values[0];
        growthLabel = 'TOTAL GROWTH';
    } else {
        const prevValue = values.length > 1 ? values[values.length - 2] : values[0];
        growth = Number((values[values.length - 1] - prevValue).toFixed(1));
        isPositiveGrowth = values[values.length - 1] >= prevValue;
        growthLabel = 'VS LAST SESS';
    }

    const ChartContent = () => (
        <>
            <div className="flex justify-between items-start mb-4">
                <div className="flex items-stretch gap-4 h-14">
                    <div className="flex flex-col items-center justify-between">
                        <div className="flex-1 flex items-center">
                            <span 
                                className="text-4xl font-black leading-none tracking-tighter" 
                                style={{ color: theme.color, textShadow: `0 0 15px ${theme.gradientStart}` }}
                            >
                                {currentValue}
                            </span>
                        </div>
                        <span className="text-[10px] font-bold text-dark-text-secondary uppercase tracking-[0.2em]">
                            {getLabel()}
                        </span>
                    </div>

                    <div className="w-px bg-white/10"></div>
                    
                    <div className="flex flex-col items-center justify-between">
                        <div className="flex-1 flex items-center">
                            <span 
                                className={`text-xl font-black leading-none ${isPositiveGrowth ? 'text-green-400' : 'text-red-400'}`}
                                style={{ 
                                    textShadow: isPositiveGrowth 
                                        ? '0 0 10px rgba(74, 222, 128, 0.5)' 
                                        : '0 0 10px rgba(248, 113, 113, 0.5)' 
                                }}
                            >
                                {isPositiveGrowth ? '+' : ''}{growth}
                            </span>
                        </div>
                        <span className="text-[10px] font-bold text-dark-text-secondary uppercase tracking-[0.2em]">
                            {growthLabel}
                        </span>
                    </div>
                </div>

                <div className="flex bg-dark-bg/50 rounded-lg p-0.5 border border-white/10 self-start">
                    {(['rating', 'winRate', 'goals'] as ChartMetric[]).map(m => (
                        <button
                            key={m}
                            onClick={() => setActiveMetric(m)}
                            className={`
                                px-2 py-1 text-[9px] font-bold uppercase rounded-md transition-all duration-300
                                ${activeMetric === m 
                                    ? 'bg-dark-surface text-white shadow-sm' 
                                    : 'text-dark-text-secondary hover:text-white'
                                }
                            `}
                        >
                            {m === 'winRate' ? 'Win %' : m === 'rating' ? 'OVR' : m}
                        </button>
                    ))}
                </div>
            </div>

            <div 
                ref={scrollContainerRef}
                className="w-full overflow-x-auto no-scrollbar relative"
                style={{ 
                    scrollBehavior: 'smooth',
                    maskImage: 'linear-gradient(to right, transparent, black 15%)',
                    WebkitMaskImage: 'linear-gradient(to right, transparent, black 15%)'
                }}
            >
                <div style={{ width: `${width}px`, height: `${height}px` }}>
                    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible">
                        <defs>
                            <linearGradient id={`gradient-${activeMetric}`} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor={theme.gradientStart} stopOpacity="0.4" />
                                <stop offset="100%" stopColor={theme.gradientEnd} stopOpacity="0" />
                            </linearGradient>
                            <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                                <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                                <feMerge>
                                    <feMergeNode in="coloredBlur" />
                                    <feMergeNode in="SourceGraphic" />
                                </feMerge>
                            </filter>
                        </defs>

                        {[0.2, 0.5, 0.8].map(ratio => {
                            const y = paddingY + ratio * (height - 2 * paddingY);
                            return <line key={ratio} x1={0} y1={y} x2={width} y2={y} stroke="white" strokeOpacity="0.03" strokeDasharray="4 4" />;
                        })}

                        <path 
                            d={areaPath} 
                            fill={`url(#gradient-${activeMetric})`} 
                            className="transition-all duration-500 ease-in-out"
                        />

                        <path 
                            d={linePath} 
                            fill="none" 
                            stroke={theme.color} 
                            strokeWidth="1.5" 
                            filter="url(#glow)"
                            className="transition-all duration-500 ease-in-out"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        />

                        {chartData.map((entry, index) => {
                            const x = getX(index);
                            const value = getValue(entry);
                            const y = getY(value);
                            const isLast = index === chartData.length - 1;

                            return (
                                <g key={index} className="group">
                                    <line 
                                        x1={x} y1={paddingY} x2={x} y2={height - paddingY} 
                                        stroke="white" strokeOpacity="0" strokeWidth="1"
                                        className="group-hover:stroke-opacity-20 transition-all"
                                    />
                                    <circle cx={x} cy={y} r={20} fill="transparent" className="cursor-pointer" />
                                    <circle 
                                        cx={x} 
                                        cy={y} 
                                        r={isLast ? "4" : "3"} 
                                        fill="#1A1D24" 
                                        stroke={theme.color} 
                                        strokeWidth="1.5" 
                                        className="transition-all duration-300 group-hover:r-5 group-hover:fill-white"
                                    />
                                    {isLast && (
                                        <circle cx={x} cy={y} r={8} fill="none" stroke={theme.color} strokeOpacity="0.5" strokeWidth="1">
                                            <animate attributeName="r" from="4" to="12" dur="1.5s" repeatCount="indefinite" />
                                            <animate attributeName="stroke-opacity" from="0.8" to="0" dur="1.5s" repeatCount="indefinite" />
                                        </circle>
                                    )}
                                    <g className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-50">
                                        <rect 
                                            x={x - 18} 
                                            y={y - 35} 
                                            width="36" 
                                            height="22" 
                                            rx="4" 
                                            fill="#1A1D24" 
                                            stroke={theme.color} 
                                            strokeWidth="1" 
                                        />
                                        <text 
                                            x={x} 
                                            y={y - 21} 
                                            fill="white" 
                                            fontSize="10" 
                                            fontWeight="bold" 
                                            textAnchor="middle"
                                        >
                                            {value}
                                        </text>
                                    </g>
                                    <text 
                                        x={x} 
                                        y={height - 5} 
                                        fill={isLast ? "white" : "#A9B1BD"} 
                                        fontSize="9" 
                                        fontWeight={isLast ? "bold" : "normal"}
                                        textAnchor="middle"
                                        className="transition-colors"
                                    >
                                        {entry.date}
                                    </text>
                                </g>
                            );
                        })}
                    </svg>
                </div>
            </div>
        </>
    );

    if (usePromoStyle) {
        return (
            <div className="w-full">
                <ChartContent />
            </div>
        );
    }

    const cardClass = "border border-white/10 shadow-[0_0_15px_rgba(0,242,254,0.3)]";

    return (
        <Card className="border border-white/10 shadow-[0_0_15px_rgba(0,242,254,0.3)] overflow-hidden transition-all duration-500 !p-4">
            <ChartContent />
        </Card>
    );
};
