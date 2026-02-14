
import React, { useEffect, useState } from 'react';
import { Page, PageHeader, Card, useTranslation, Button } from '../ui';
import { Activity, RefreshCw, TrophyIcon, History, InfoIcon, LayoutDashboard, Users, Zap, Globe, StarIcon, BarChartDynamic } from '../icons';
import { getAnalyticsSummary } from '../db';

const StatCard: React.FC<{ 
    title: string; 
    value: number; 
    recent: number; 
    icon: any; 
    color: string;
    percent?: number;
}> = ({ title, value, recent, icon: Icon, color, percent }) => (
    <div className="relative overflow-hidden rounded-2xl bg-[#12161b] border border-white/5 p-4 flex flex-col justify-between h-32 group hover:border-white/10 transition-all shadow-lg">
        <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-30 transition-opacity">
            <Icon className="w-16 h-16" style={{ color }} />
        </div>
        
        <div className="relative z-10">
            <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-white/5 border border-white/5 shadow-inner">
                    <Icon className="w-4 h-4" style={{ color }} />
                </div>
                <span className="text-[9px] font-black text-white/50 uppercase tracking-[0.2em]">{title}</span>
            </div>
            
            <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black text-white font-mono tracking-tighter">{value}</span>
                {recent > 0 && (
                    <span className="text-[10px] font-bold text-[#4CFF5F] bg-[#4CFF5F]/10 px-1.5 py-0.5 rounded border border-[#4CFF5F]/20 flex items-center shadow-[0_0_10px_rgba(76,255,95,0.2)]">
                        +{recent}
                    </span>
                )}
            </div>
        </div>

        {percent !== undefined && (
            <div className="w-full h-1 bg-white/5 rounded-full mt-auto overflow-hidden">
                <div 
                    className="h-full rounded-full transition-all duration-1000 ease-out" 
                    style={{ width: `${percent}%`, backgroundColor: color, boxShadow: `0 0 10px ${color}` }}
                ></div>
            </div>
        )}
    </div>
);

export const HubAnalyticsScreen: React.FC = () => {
    const t = useTranslation();
    const [data, setData] = useState<{ total: Record<string, number>, recent: Record<string, number> }>({ total: {}, recent: {} });
    const [isLoading, setIsLoading] = useState(false);

    const fetchData = async () => {
        setIsLoading(true);
        const summary = await getAnalyticsSummary();
        setData(summary);
        setIsLoading(false);
    };

    useEffect(() => {
        fetchData();
    }, []);

    const getVal = (key: string, mode: 'total' | 'recent' = 'total'): number => {
        const section = data[mode];
        if (!section) return 0;
        // Exact match
        if (section[key] !== undefined) return section[key];
        // Wildcard match for categories
        return Object.keys(section).reduce((acc, k) => {
            if (k.startsWith(key)) return acc + section[k];
            return acc;
        }, 0);
    };

    // --- AGGREGATION LOGIC ---
    const stats = {
        hub: { total: getVal('view_hub_screen', 'total'), recent: getVal('view_hub_screen', 'recent') },
        dashboard: { total: getVal('view_tab:dashboard', 'total'), recent: getVal('view_tab:dashboard', 'recent') },
        archive: { total: getVal('view_tab:archive', 'total'), recent: getVal('view_tab:archive', 'recent') },
        duel: { 
            total: getVal('view_tab:duel', 'total') + getVal('start_duel', 'total'), 
            recent: getVal('view_tab:duel', 'recent') + getVal('start_duel', 'recent') 
        },
        playerHub: {
            total: getVal('view_tab:roster', 'total') + getVal('view_player', 'total'),
            recent: getVal('view_tab:roster', 'recent') + getVal('view_player', 'recent')
        },
        totm: { total: getVal('open_totm', 'total'), recent: getVal('open_totm', 'recent') },
        radio: { total: getVal('play_radio', 'total'), recent: getVal('play_radio', 'recent') },
        social: { total: getVal('click_social', 'total'), recent: getVal('click_social', 'recent') }
    };

    const grandTotal = Object.values(stats).reduce((acc, curr) => acc + curr.total, 0);
    const recentTotal = Object.values(stats).reduce((acc, curr) => acc + curr.recent, 0);

    const calcPercent = (val: number) => grandTotal > 0 ? Math.round((val / grandTotal) * 100) : 0;

    return (
        <Page className="!pb-32">
            <PageHeader title={t.hubAnalytics}>
                <Button variant="ghost" onClick={fetchData} disabled={isLoading} className="!p-2 -mr-2 text-white hover:bg-white/10">
                    <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
                </Button>
            </PageHeader>
            
            <div className="px-1">
                {/* 1. CLUB HUB (MAIN) - HERO CARD */}
                <div className="mb-4">
                    <StatCard 
                        title="Main Entrance (Hub)" 
                        value={stats.hub.total} 
                        recent={stats.hub.recent} 
                        icon={Globe} 
                        color="#ffffff"
                        percent={calcPercent(stats.hub.total)}
                    />
                </div>

                <div className="grid grid-cols-2 gap-3 mb-4">
                    {/* 2. DASHBOARD */}
                    <StatCard 
                        title="Dashboard" 
                        value={stats.dashboard.total} 
                        recent={stats.dashboard.recent} 
                        icon={LayoutDashboard} 
                        color="#00F2FE"
                        percent={calcPercent(stats.dashboard.total)}
                    />

                    {/* 3. PLAYER HUB (Intel) */}
                    <StatCard 
                        title="Player Intel" 
                        value={stats.playerHub.total} 
                        recent={stats.playerHub.recent} 
                        icon={Users} 
                        color="#FF00D6"
                        percent={calcPercent(stats.playerHub.total)}
                    />

                    {/* 4. DUEL */}
                    <StatCard 
                        title="Duel Sim" 
                        value={stats.duel.total} 
                        recent={stats.duel.recent} 
                        icon={TrophyIcon} 
                        color="#FFD700"
                        percent={calcPercent(stats.duel.total)}
                    />

                    {/* 5. ARCHIVE */}
                    <StatCard 
                        title="Archive" 
                        value={stats.archive.total} 
                        recent={stats.archive.recent} 
                        icon={History} 
                        color="#A9B1BD"
                        percent={calcPercent(stats.archive.total)}
                    />

                    {/* 6. TOTM */}
                    <StatCard 
                        title="Team of Month" 
                        value={stats.totm.total} 
                        recent={stats.totm.recent} 
                        icon={StarIcon} 
                        color="#F59E0B"
                        percent={calcPercent(stats.totm.total)}
                    />

                    {/* 7. RADIO */}
                    <StatCard 
                        title="Radio" 
                        value={stats.radio.total} 
                        recent={stats.radio.recent} 
                        icon={Zap} 
                        color="#F472B6"
                        percent={calcPercent(stats.radio.total)}
                    />
                </div>

                {/* 8. SOCIAL LINKS - FULL WIDTH */}
                <div className="mb-6">
                    <StatCard 
                        title="Social Links Clicks" 
                        value={stats.social.total} 
                        recent={stats.social.recent} 
                        icon={BarChartDynamic} 
                        color="#10B981"
                        percent={calcPercent(stats.social.total)}
                    />
                </div>

                {/* GRAND TOTAL FOOTER */}
                <div className="p-6 rounded-3xl bg-gradient-to-r from-[#00F2FE]/10 to-transparent border border-[#00F2FE]/20 shadow-[0_0_30px_rgba(0,242,254,0.1)] flex items-center justify-between">
                    <div className="flex flex-col">
                        <span className="text-[10px] font-black text-[#00F2FE] uppercase tracking-[0.2em] mb-1">Total System Traffic</span>
                        <div className="flex items-baseline gap-2">
                            <span className="text-5xl font-black text-white font-mono tracking-tighter drop-shadow-lg">{grandTotal}</span>
                            {recentTotal > 0 && <span className="text-sm font-bold text-[#4CFF5F] bg-black/40 px-2 py-0.5 rounded border border-[#4CFF5F]/30">+{recentTotal}</span>}
                        </div>
                    </div>
                    <div className="w-16 h-16 rounded-full border-4 border-[#00F2FE]/20 flex items-center justify-center animate-pulse">
                        <Activity className="w-8 h-8 text-[#00F2FE]" />
                    </div>
                </div>
                
                <div className="mt-8 text-center opacity-30">
                    <p className="text-[10px] font-mono uppercase tracking-widest">Analytics Protocol v3.0</p>
                </div>
            </div>
        </Page>
    );
};
