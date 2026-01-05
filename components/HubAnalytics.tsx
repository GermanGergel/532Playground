import React, { useMemo, useRef, useEffect, useState } from 'react';
import { PlayerHistoryEntry } from '../types';
import { History as HistoryIcon } from '../icons';

type ChartMetric = 'rating' | 'winRate' | 'goals';

export const HubProgressChart: React.FC<{ history: PlayerHistoryEntry[], headerTitle?: string }> = ({ history, headerTitle }) => {
    const [activeMetric, setActiveMetric] = useState<ChartMetric>('rating');
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    const chartData = useMemo(() => {
        if (!history || history.length === 0) return [];
        if (history.length === 1) return [history[0], history[0]];
        return history;
    }, [history]);

    const theme = useMemo(() => {
        switch (activeMetric) {
            case 'rating': return { color: '#00F2FE' };
            case 'winRate': return { color: '#4CFF5F' };
            case 'goals': return { color: '#FFD700' };
            default: return { color: '#00F2FE' };
        }
    }, [activeMetric]);

    // Force scroll to end after render/resize
    useEffect(() => {
        const scrollToLatest = () => {
            if (scrollContainerRef.current) {
                const container = scrollContainerRef.current;
                container.scrollLeft = container.scrollWidth;
            }
        };

        // Double trigger: immediate for fast renders, and slightly delayed for animation completion
        scrollToLatest();
        const timer = setTimeout(scrollToLatest, 100); 
        return () => clearTimeout(timer);
    }, [chartData, activeMetric]);

    // CRITICAL: Hooks must be called before conditional returns
    if (chartData.length === 0) return null;

    // --- CHART CONFIGURATION ---
    // Increased height to fill container completely
    const height = 280; 
    
    // CRITICAL: Top padding reserves space for the "Floating Header" (Numbers & Title)
    // Bottom padding reserves space for the Date Labels
    const paddingTop = 90; 
    const paddingBottom = 30;
    
    const minPointSpacing = 60;
    
    // Calculate width based on container or points
    const containerWidth = containerRef.current?.offsetWidth || 800;
    const width = Math.max(containerWidth, (chartData.length - 1) * minPointSpacing + 40);
    const actualSpacing = chartData.length > 1 ? (width - 40) / (chartData.length - 1) : 0;

    const getValue = (entry: PlayerHistoryEntry) => {
        switch (activeMetric) {
            case 'rating': return entry.rating;
            case 'winRate': return entry.winRate;
            case 'goals': return entry.goals;
            default: return 0;
        }
    };

    const getMetricLabel = () => {
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
    
    // Dynamic buffer to keep the line visually centered between the top header and bottom labels
    const range = maxVal - minVal;
    const yBuffer = range === 0 ? 10 : range * 0.2; 
    const yMin = Math.max(0, minVal - yBuffer);
    const yMax = maxVal + yBuffer;

    const getX = (index: number) => 20 + index * actualSpacing; 
    
    // Y Calculation accounts for the custom top/bottom padding
    const getY = (value: number) => {
        const availableHeight = height - paddingTop - paddingBottom;
        const normalized = (value - yMin) / (yMax - yMin || 1);
        return height - paddingBottom - (normalized * availableHeight);
    };

    const linePath = chartData.map((entry, index) => {
        const x = getX(index);
        const y = getY(getValue(entry));
        return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
    }).join(' ');

    const areaPath = (() => {
        if (!linePath) return '';
        const lastX = getX(chartData.length - 1);
        const bottomY = height - paddingBottom;
        const firstX = getX(0);
        return `${linePath} L ${lastX} ${bottomY} L ${firstX} ${bottomY} Z`;
    })();

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

    return (
        <div ref={containerRef} className="w-full h-full bg-transparent relative overflow-hidden flex flex-col">
            
            {/* --- FLOATING HEADER UI (Absolute Positioned) --- */}
            <div className="absolute top-4 left-4 right-4 z-20 flex justify-between items-start pointer-events-none">
                
                {/* Left Side: Title & Stats */}
                <div className="flex flex-col gap-3 pointer-events-auto">
                    {/* Header Title */}
                    <div className="flex items-center gap-2">
                        <div className="p-1 rounded-lg bg-white/5 border border-white/10">
                            <HistoryIcon className="w-3 h-3 text-[#00F2FE]" />
                        </div>
                        <h4 className="font-audiowide text-[9px] text-white/50 tracking-[0.2em] uppercase">{headerTitle || 'Statistics'}</h4>
                    </div>

                    {/* Big Numbers (Now integrated directly below title) */}
                    <div className="flex items-center gap-4 pl-1">
                        <div className="flex flex-col justify-center">
                            <span className="text-4xl font-russo text-white leading-none drop-shadow-md" style={{ color: theme.color, textShadow: `0 0 15px ${theme.color}44` }}>
                                {currentValue}
                            </span>
                            <span className="text-[7px] font-black text-white/40 uppercase tracking-[0.2em] mt-0.5">{getMetricLabel()}</span>
                        </div>
                        
                        <div className="w-px h-8 bg-white/10"></div>

                        <div className="flex flex-col justify-center">
                            <span className={`text-xl font-black leading-none drop-shadow-md ${isPositiveGrowth ? 'text-green-400' : 'text-red-400'}`}>
                                {isPositiveGrowth ? '+' : ''}{growth}
                            </span>
                            <span className="text-[7px] font-black text-white/30 uppercase tracking-[0.2em] mt-0.5">{growthLabel}</span>
                        </div>
                    </div>
                </div>

                {/* Right Side: Controls */}
                <div className="flex bg-black/40 rounded-full p-0.5 border border-white/5 pointer-events-auto backdrop-blur-sm">
                    {(['rating', 'winRate', 'goals'] as ChartMetric[]).map(m => (
                        <button 
                            key={m} 
                            onClick={() => setActiveMetric(m)} 
                            className={`px-3 py-1 text-[7px] font-black uppercase rounded-full transition-all ${activeMetric === m ? 'bg-[#00F2FE]/20 text-[#00F2FE] shadow-[0_0_10px_#00F2FE44]' : 'text-white/20 hover:text-white/40'}`}
                        >
                            {m === 'winRate' ? 'Win%' : m === 'rating' ? 'OVR' : m}
                        </button>
                    ))}
                </div>
            </div>

            {/* --- CHART AREA (Fills Container) --- */}
            <div ref={scrollContainerRef} className="w-full h-full overflow-x-auto no-scrollbar relative z-10" style={{ maskImage: 'linear-gradient(to right, transparent, black 5%)', WebkitMaskImage: 'linear-gradient(to right, transparent, black 5%)' }}>
                <div style={{ width: `${width}px`, height: '100%' }}>
                    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible" preserveAspectRatio="none">
                        <defs>
                            <linearGradient id={`grad-hub-${activeMetric}`} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor={theme.color} stopOpacity="0.15" />
                                <stop offset="100%" stopColor={theme.color} stopOpacity="0" />
                            </linearGradient>
                        </defs>
                        
                        {/* Grid Lines - subtle */}
                        {[0.2, 0.5, 0.8].map((tick) => {
                            const availableHeight = height - paddingTop - paddingBottom;
                            const y = paddingTop + (tick * availableHeight);
                            return (
                                <line 
                                    key={tick} 
                                    x1="0" y1={y} x2={width + 2000} y2={y} 
                                    stroke="white" 
                                    strokeOpacity="0.03" 
                                    strokeWidth="1" 
                                    strokeDasharray="4 4" 
                                />
                            );
                        })}

                        <path d={areaPath} fill={`url(#grad-hub-${activeMetric})`} />
                        <path d={linePath} fill="none" stroke={theme.color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ filter: `drop-shadow(0 0 8px ${theme.color}44)` }} />
                        
                        {chartData.map((entry, index) => {
                            const x = getX(index);
                            const val = getValue(entry);
                            const y = getY(val);
                            const isLast = index === chartData.length - 1;
                            
                            return (
                                <g key={index}>
                                    <line x1={x} y1={y} x2={x} y2={height - paddingBottom} stroke={theme.color} strokeOpacity="0.1" strokeWidth="1" strokeDasharray="2 2" />

                                    <circle cx={x} cy={y} r={isLast ? "3.5" : "2"} fill="#0C0E12" stroke={theme.color} strokeWidth="1.5" />
                                    {isLast && (
                                        <circle cx={x} cy={y} r={4} fill="none" stroke={theme.color} strokeOpacity="0.5" strokeWidth="1">
                                            <animate attributeName="r" from="4" to="14" dur="1.5s" repeatCount="indefinite" />
                                            <animate attributeName="stroke-opacity" from="0.8" to="0" dur="1.5s" repeatCount="indefinite" />
                                        </circle>
                                    )}
                                    
                                    <text x={x} y={y - 12} fill="white" fontSize="9" fontWeight="black" textAnchor="middle" opacity={isLast ? "1" : "0.6"} style={{ textShadow: '0 2px 4px rgba(0,0,0,0.8)' }}>
                                        {val}
                                    </text>
                                    
                                    <text x={x} y={height - 10} fill="white" fillOpacity="0.4" fontSize="9" textAnchor="middle" fontWeight="bold" style={{ textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>
                                        {entry.date}
                                    </text>
                                </g>
                            );
                        })}
                    </svg>
                </div>
            </div>
        </div>
    );
};