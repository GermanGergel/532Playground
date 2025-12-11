
import React, { useMemo, useState, useRef, useLayoutEffect } from 'react';
import { Player, PlayerStatus, PlayerHistoryEntry } from '../types';
import { Card, useTranslation } from '../ui';
import { useApp } from '../context';
import { BadgeIcon } from '../features';

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

export const LastSessionBreakdown: React.FC<{ player: Player }> = ({ player }) => {
    const t = useTranslation();
    const breakdown = player.lastRatingChange;

    if (!breakdown) return null;

    const cardClass = "border border-white/10 shadow-[0_0_15px_rgba(0,242,254,0.3)]";
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

    return (
        <Card title={t.lastSessionAnalysis} className={cardClass}>
            <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between px-1">
                    <RatingCircle rating={breakdown.previousRating} />
                    
                    <div className="flex flex-col items-center justify-center gap-1.5 flex-grow px-2 -mt-3">
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
                    </div>

                    <RatingCircle rating={breakdown.newRating} isNew />
                </div>

                {badgesEarned.length > 0 && (
                    <div className="pt-3 mt-3 border-t border-white/10">
                        <p className="text-center text-xs font-bold text-dark-text-secondary mb-2">{t.awards}</p>
                        <div className="flex justify-center items-center gap-3 flex-wrap">
                            {badgesEarned.map(badge => (
                                <div key={badge} title={t[`badge_${badge}` as keyof typeof t] || ''}>
                                    <BadgeIcon badge={badge} className="w-7 h-7" />
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </Card>
    );
};

export const ClubRankings: React.FC<{ player: Player }> = ({ player }) => {
    const t = useTranslation();
    const { allPlayers } = useApp();
    
    const rankings = React.useMemo(() => {
        const confirmedPlayers = allPlayers.filter(p => p.status === PlayerStatus.Confirmed);
        
        if (confirmedPlayers.length < 2) return null;

        const sortedByGoals = [...confirmedPlayers].sort((a, b) => b.totalGoals - a.totalGoals);
        const sortedByAssists = [...confirmedPlayers].sort((a, b) => b.totalAssists - a.totalAssists);
        const sortedByRating = [...confirmedPlayers].sort((a, b) => b.rating - a.rating);

        const goalRank = sortedByGoals.findIndex(p => p.id === player.id) + 1;
        const assistRank = sortedByAssists.findIndex(p => p.id === player.id) + 1;
        const ratingRank = sortedByRating.findIndex(p => p.id === player.id) + 1;

        return { goalRank, assistRank, ratingRank, total: confirmedPlayers.length };
    }, [allPlayers, player.id]);
    
    const RankItem: React.FC<{ label: string; rank: number; total: number }> = ({ label, rank, total }) => (
        <div className="flex flex-col items-center gap-1 text-center py-1">
            <div className="flex items-baseline gap-1">
                <p className="text-lg font-bold text-[#00F2FE]">{rank}</p>
                <p className="text-[10px] text-dark-text-secondary font-medium">/ {total}</p>
            </div>
            <p className="text-[9px] text-dark-text-secondary uppercase font-semibold">{label}</p>
        </div>
    );
    
    if (!rankings) return null;

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

export const BestSessionCard: React.FC<{ player: Player }> = ({ player }) => {
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

    const cardClass = "border border-white/10 shadow-[0_0_15px_rgba(0,242,254,0.3)]";

    return (
        <Card title={t.bestSessionTitle} className={cardClass}>
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
        </Card>
    );
};

// --- NEW COMPONENT: PLAYER PROGRESS CHART (SCROLLABLE) ---

type ChartMetric = 'rating' | 'winRate' | 'goals';

export const PlayerProgressChart: React.FC<{ history: PlayerHistoryEntry[] }> = ({ history }) => {
    const [activeMetric, setActiveMetric] = useState<ChartMetric>('rating');
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    // 1. Data Processing - Handle edge cases (empty or single item)
    const chartData = useMemo(() => {
        if (!history || history.length === 0) return [];
        // If only 1 history item, duplicate it to draw a flat line instead of showing an error
        if (history.length === 1) return [history[0], history[0]];
        return history;
    }, [history]);

    // 2. Auto-scroll to the end (newest data) on mount
    useLayoutEffect(() => {
        if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollLeft = scrollContainerRef.current.scrollWidth;
        }
    }, [chartData, activeMetric]);

    // If absolutely no data, don't render the card at all (cleaner than error message)
    if (chartData.length === 0) return null;

    // Dimensions
    const height = 160; 
    const paddingY = 30; 
    const pointSpacing = 60; 
    const width = Math.max(300, (chartData.length - 1) * pointSpacing + 40);

    // Helper to get value based on active metric
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
            case 'rating': return 'OVG';
            case 'winRate': return 'WIN %';
            case 'goals': return 'GOALS';
            default: return '';
        }
    };

    // Calculate scaling
    const values = chartData.map(getValue);
    const minVal = Math.min(...values);
    const maxVal = Math.max(...values);
    
    // Ensure we don't divide by zero if max == min
    const range = maxVal - minVal;
    const yBuffer = range === 0 ? 10 : range * 0.3; 
    const yMin = Math.max(0, minVal - yBuffer);
    const yMax = maxVal + yBuffer;

    // Coordinate mapping functions
    const getX = (index: number) => 20 + index * pointSpacing; 
    const getY = (value: number) => {
        const normalized = (value - yMin) / (yMax - yMin);
        return height - paddingY - (normalized * (height - 2 * paddingY));
    };

    // 2. Path Generation (SVG 'd' attribute)
    const linePath = useMemo(() => {
        if (chartData.length === 0) return '';
        return chartData.map((entry, index) => {
            const x = getX(index);
            const y = getY(getValue(entry));
            return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
        }).join(' ');
    }, [chartData, activeMetric, yMin, yMax]);

    // Area Fill Path (closed loop)
    const areaPath = useMemo(() => {
        if (!linePath) return '';
        const lastX = getX(chartData.length - 1);
        const bottomY = height - paddingY;
        const firstX = getX(0);
        return `${linePath} L ${lastX} ${bottomY} L ${firstX} ${bottomY} Z`;
    }, [linePath]);

    // Determine Color Theme based on metric
    const theme = useMemo(() => {
        switch (activeMetric) {
            case 'rating': return { color: '#00F2FE', gradientStart: '#00F2FE', gradientEnd: 'rgba(0, 242, 254, 0)' };
            case 'winRate': return { color: '#4CFF5F', gradientStart: '#4CFF5F', gradientEnd: 'rgba(76, 255, 95, 0)' };
            case 'goals': return { color: '#FFD700', gradientStart: '#FFD700', gradientEnd: 'rgba(255, 215, 0, 0)' };
        }
    }, [activeMetric]);

    const currentValue = values[values.length - 1];
    const growth = Number(values[values.length - 1] - values[0]).toFixed(1);
    const isPositiveGrowth = values[values.length - 1] >= values[0];

    return (
        <Card className="border border-white/10 shadow-[0_0_15px_rgba(0,242,254,0.3)] overflow-hidden transition-all duration-500 !p-4">
            {/* Header: BIG STATS + TABS */}
            <div className="flex justify-between items-start mb-4">
                {/* Left: Key Stats Block - Using items-stretch to enforce same height */}
                <div className="flex items-stretch gap-4 h-14">
                    {/* Primary Value (OVG) - Justify Between pushes label to bottom */}
                    <div className="flex flex-col items-center justify-between">
                        {/* Wrapper to center number in remaining vertical space */}
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

                    {/* Divider - Auto height due to stretch */}
                    <div className="w-px bg-white/10"></div>
                    
                    {/* Secondary Value (Growth) - Justify Between pushes label to bottom */}
                    <div className="flex flex-col items-center justify-between">
                        {/* Wrapper for the number to keep it vertically centered in the upper space */}
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
                            GROWTH
                        </span>
                    </div>
                </div>

                {/* Right: Tabs */}
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
                            {m === 'winRate' ? 'Win %' : m === 'rating' ? 'OVG' : m}
                        </button>
                    ))}
                </div>
            </div>

            {/* The Scrollable Chart Container with FADE MASK */}
            <div 
                ref={scrollContainerRef}
                className="w-full overflow-x-auto no-scrollbar relative"
                style={{ 
                    scrollBehavior: 'smooth',
                    // This creates the "Fade into history" effect on the left side
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

                        {/* Grid Lines (Horizontal) - Simplified */}
                        {[0.2, 0.5, 0.8].map(ratio => {
                            const y = paddingY + ratio * (height - 2 * paddingY);
                            return <line key={ratio} x1={0} y1={y} x2={width} y2={y} stroke="white" strokeOpacity="0.03" strokeDasharray="4 4" />;
                        })}

                        {/* Area Fill */}
                        <path 
                            d={areaPath} 
                            fill={`url(#gradient-${activeMetric})`} 
                            className="transition-all duration-500 ease-in-out"
                        />

                        {/* Line Stroke - Thinner (1.5px) */}
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

                        {/* Data Points */}
                        {chartData.map((entry, index) => {
                            const x = getX(index);
                            const value = getValue(entry);
                            const y = getY(value);
                            const isLast = index === chartData.length - 1;

                            return (
                                <g key={index} className="group">
                                    {/* Vertical Line on Hover */}
                                    <line 
                                        x1={x} y1={paddingY} x2={x} y2={height - paddingY} 
                                        stroke="white" strokeOpacity="0" strokeWidth="1"
                                        className="group-hover:stroke-opacity-20 transition-all"
                                    />

                                    {/* Invisible hit target */}
                                    <circle cx={x} cy={y} r="20" fill="transparent" className="cursor-pointer" />
                                    
                                    {/* Visible Dot - Thinner stroke */}
                                    <circle 
                                        cx={x} 
                                        cy={y} 
                                        r={isLast ? "4" : "3"} 
                                        fill="#1A1D24" 
                                        stroke={theme.color} 
                                        strokeWidth="1.5" 
                                        className="transition-all duration-300 group-hover:r-5 group-hover:fill-white"
                                    />
                                    
                                    {/* Pulse Animation for Last Point */}
                                    {isLast && (
                                        <circle cx={x} cy={y} r="8" fill="none" stroke={theme.color} strokeOpacity="0.5" strokeWidth="1">
                                            <animate attributeName="r" from="4" to="12" dur="1.5s" repeatCount="indefinite" />
                                            <animate attributeName="stroke-opacity" from="0.8" to="0" dur="1.5s" repeatCount="indefinite" />
                                        </circle>
                                    )}

                                    {/* Tooltip */}
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
                                    
                                    {/* X-Axis Labels (Date) */}
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
        </Card>
    );
};
