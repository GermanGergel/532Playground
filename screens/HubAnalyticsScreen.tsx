import React, { useEffect, useState } from 'react';
import { Page, PageHeader, Card, useTranslation, Button } from '../ui';
import { Activity, RefreshCw, TrophyIcon, History, InfoIcon, LayoutDashboard, Users } from '../icons';
import { getAnalyticsSummary } from '../db';

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
        return section ? (section[key] || 0) : 0;
    };

    const totalInteractions: number = 
        getVal('view_tab') + 
        getVal('start_duel') + 
        getVal('play_radio') + 
        getVal('view_player');
        
    const recentInteractions: number = 
        getVal('view_tab', 'recent') + 
        getVal('start_duel', 'recent') + 
        getVal('play_radio', 'recent') + 
        getVal('view_player', 'recent');
    
    const calcPercent = (val: number) => totalInteractions > 0 ? Math.round((val / totalInteractions) * 100) : 0;

    const StatBar = ({ label, metricKey, color, icon: Icon }: { label: string, metricKey: string, color: string, icon: any }) => {
        const valueTotal = getVal(metricKey, 'total');
        const valueRecent = getVal(metricKey, 'recent');
        
        return (
            <div className="mb-4">
                <div className="flex justify-between items-end mb-1">
                    <div className="flex items-center gap-2">
                        <Icon className="w-3 h-3" style={{ color: color }} />
                        <span className="text-[10px] font-bold text-white uppercase tracking-wider">{label}</span>
                    </div>
                    <div className="flex items-baseline gap-1.5">
                        <span className="text-lg font-black leading-none font-mono text-white">{valueTotal}</span>
                        {valueRecent > 0 && (
                            <span className="text-[9px] font-bold text-[#4CFF5F] flex items-center animate-pulse">
                                +{valueRecent} <span className="text-[7px] ml-0.5">↗</span>
                            </span>
                        )}
                        <span className="text-[9px] text-white/30 font-mono w-8 text-right">({calcPercent(valueTotal)}%)</span>
                    </div>
                </div>
                <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden relative">
                    <div 
                        className="absolute top-0 left-0 h-full rounded-full transition-all duration-1000 ease-out opacity-30"
                        style={{ width: `${calcPercent(valueTotal)}%`, backgroundColor: color }}
                    ></div>
                     <div 
                        className="absolute top-0 left-0 h-full rounded-full transition-all duration-1000 ease-out"
                        style={{ width: `${calcPercent(valueTotal)}%`, backgroundColor: color, boxShadow: `0 0 8px ${color}` }}
                    ></div>
                </div>
            </div>
        );
    };

    const getRosterTotal = () => (getVal('view_tab:roster', 'total') || 0) + (getVal('view_player', 'total') || 0);
    const getRosterRecent = () => (getVal('view_tab:roster', 'recent') || 0) + (getVal('view_player', 'recent') || 0);

    return (
        <Page>
            <PageHeader title={t.hubAnalytics}>
                <Button variant="ghost" onClick={fetchData} disabled={isLoading} className="!p-2 -mr-2 text-white hover:bg-white/10">
                    <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
                </Button>
            </PageHeader>
            <div className="relative w-full max-w-md mx-auto overflow-hidden rounded-3xl border border-white/10 shadow-2xl">
                <div className="absolute inset-0 z-0 pointer-events-none">
                    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#0f172a] via-[#020617] to-black"></div>
                    <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]"></div>
                </div>
                <div className="relative z-10 p-5 space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                        <Card className="!p-4 bg-gradient-to-br from-[#161b22] to-black border-white/10 flex flex-col items-center justify-center min-h-[120px] bg-opacity-80 backdrop-blur-sm shadow-[0_0_20px_rgba(0,242,254,0.1)]">
                            <Activity className="w-6 h-6 text-[#00F2FE] mb-2 opacity-80" />
                            <span className="text-4xl font-black text-white font-russo tracking-tighter">{totalInteractions}</span>
                            {recentInteractions > 0 ? (
                                <span className="text-sm font-bold text-[#4CFF5F] tracking-tight mb-1 flex items-center gap-1">+{recentInteractions} <span className="text-[8px] text-[#4CFF5F]/70 font-normal uppercase">24h</span></span>
                            ) : (
                                <span className="text-[9px] text-white/20 mt-1 font-mono">NO RECENT ACTIVITY</span>
                            )}
                            <span className="text-[8px] font-black text-white/30 uppercase tracking-[0.2em] mt-1">Total Actions</span>
                        </Card>
                        <div className="grid grid-rows-2 gap-3">
                            <Card className="!p-3 bg-white/5 border-white/10 flex items-center justify-between backdrop-blur-sm hover:bg-white/10 transition-colors">
                                <div className="flex flex-col">
                                    <span className="text-xl font-black text-white">{getVal('start_duel')}</span>
                                    {getVal('start_duel', 'recent') > 0 && <span className="text-[9px] font-bold text-[#4CFF5F]">+{getVal('start_duel', 'recent')}</span>}
                                    <span className="text-[7px] font-bold text-[#FFD700] uppercase tracking-wider">Duels</span>
                                </div>
                                <TrophyIcon className="w-5 h-5 text-[#FFD700] opacity-50" />
                            </Card>
                            <Card className="!p-3 bg-white/5 border-white/10 flex items-center justify-between backdrop-blur-sm hover:bg-white/10 transition-colors">
                                <div className="flex flex-col">
                                    <span className="text-xl font-black text-white">{getVal('play_radio')}</span>
                                    {getVal('play_radio', 'recent') > 0 && <span className="text-[9px] font-bold text-[#4CFF5F]">+{getVal('play_radio', 'recent')}</span>}
                                    <span className="text-[7px] font-bold text-[#FF00D6] uppercase tracking-wider">Radio Plays</span>
                                </div>
                                <div className="w-5 h-5 rounded-full border border-[#FF00D6] flex items-center justify-center">
                                    <div className="w-1.5 h-1.5 bg-[#FF00D6] rounded-full animate-pulse"></div>
                                </div>
                            </Card>
                        </div>
                    </div>
                    <Card className="!p-5 bg-black/40 border-white/10 backdrop-blur-md">
                        <div className="flex justify-between items-center mb-6 border-b border-white/5 pb-2">
                            <h3 className="text-xs font-black text-white uppercase tracking-widest">Traffic Analysis</h3>
                            <span className="text-[8px] font-mono text-[#4CFF5F] uppercase">24H Trend</span>
                        </div>
                        <div className="mb-4">
                            <div className="flex justify-between items-end mb-1">
                                <div className="flex items-center gap-2">
                                    <Users className="w-3 h-3 text-[#4CFF5F]" />
                                    <span className="text-[10px] font-bold text-white uppercase tracking-wider">Roster & Profiles</span>
                                </div>
                                <div className="flex items-baseline gap-1.5">
                                    <span className="text-lg font-black leading-none font-mono text-white">{getRosterTotal()}</span>
                                    {getRosterRecent() > 0 && <span className="text-[9px] font-bold text-[#4CFF5F] animate-pulse">+{getRosterRecent()} ↗</span>}
                                    <span className="text-[9px] text-white/30 font-mono w-8 text-right">({calcPercent(getRosterTotal())}%)</span>
                                </div>
                            </div>
                            <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden relative">
                                <div className="absolute top-0 left-0 h-full rounded-full opacity-30" style={{ width: `${calcPercent(getRosterTotal())}%`, backgroundColor: '#4CFF5F' }}></div>
                                <div className="absolute top-0 left-0 h-full rounded-full transition-all duration-1000 ease-out" style={{ width: `${calcPercent(getRosterTotal())}%`, backgroundColor: '#4CFF5F', boxShadow: '0 0 8px #4CFF5F' }}></div>
                            </div>
                        </div>
                        <StatBar label="Dashboard Views" metricKey="view_tab:dashboard" color="#ffffff" icon={LayoutDashboard} />
                        <StatBar label="Archive / History" metricKey="view_tab:archive" color="#00F2FE" icon={History} />
                        <StatBar label="Info & Rules" metricKey="view_tab:info" color="#A9B1BD" icon={InfoIcon} />
                        <StatBar label="Duel Simulations" metricKey="start_duel" color="#FFD700" icon={TrophyIcon} />
                    </Card>
                </div>
            </div>
        </Page>
    );
};