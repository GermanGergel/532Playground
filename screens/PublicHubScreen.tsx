
import React, { useState, useMemo } from 'react';
import { useApp } from '../context';
import { PlayerStatus } from '../types';
import { ClubIntelligenceDashboard } from '../components/ClubIntelligenceDashboard';
import { LayoutDashboard, Users, History, InfoIcon } from '../icons';
import { RadioPlayer } from '../components/RadioPlayer';
import { useTranslation } from '../ui';

export const PublicHubScreen: React.FC = () => {
    const { allPlayers, history } = useApp();
    const t = useTranslation();
    const [currentView, setCurrentView] = useState<'dashboard' | 'roster' | 'archive' | 'tournaments' | 'league' | 'info' | 'duel'>('dashboard');

    const clubStats = useMemo(() => {
        const confirmedPlayers = allPlayers.filter(p => p.status === PlayerStatus.Confirmed);
        const totalPlayers = confirmedPlayers.length;
        
        // Find the maximum sessions played by any single player to ensure consistency
        const maxPlayerSessions = confirmedPlayers.length > 0 
            ? Math.max(...confirmedPlayers.map(p => p.totalSessionsPlayed || 0)) 
            : 0;

        // Calculate Total Sessions:
        // We take the higher of:
        // 1. History length + 1 (your manual correction for the known missing session)
        // 2. The highest number of games any player has played (source of truth from stats)
        // This ensures Club Vitals never lags behind the actual player cards (e.g. showing 12 instead of 11).
        const totalSessions = Math.max((history.length || 0) + 1, maxPlayerSessions); 
        
        const avgRating = totalPlayers > 0 ? Math.round(confirmedPlayers.reduce((sum, p) => sum + p.rating, 0) / totalPlayers) : 0;
        return { totalPlayers, totalSessions, avgRating };
    }, [allPlayers, history]);

    const navItems = [
        { id: 'dashboard', icon: LayoutDashboard, label: t.hubDashboardBtn },
        { id: 'roster', icon: Users, label: t.hubPlayers },
        { id: 'archive', icon: History, label: t.hubGames },
        { id: 'info', icon: InfoIcon, label: t.information },
    ] as const;

    return (
        <div className="w-full h-screen bg-[#05070a] text-white overflow-hidden flex flex-col font-sans selection:bg-[#00F2FE] selection:text-black">
            {/* Header / Top Bar */}
            <header className="h-16 border-b border-white/5 bg-[#0a0c10] flex items-center justify-between px-6 shrink-0 relative z-50">
                <div className="flex items-center gap-4">
                    <div className="flex flex-col">
                        <span className="font-blackops text-xl text-[#00F2FE] leading-none tracking-wider">532</span>
                        <span className="text-[8px] font-bold text-white/40 tracking-[0.3em] uppercase">Playground</span>
                    </div>
                    <div className="h-8 w-px bg-white/10 mx-2"></div>
                    
                    {/* Club Vitals Ticker */}
                    <div className="flex items-center gap-6 hidden md:flex">
                        <div className="flex flex-col">
                            <span className="text-[8px] font-black text-white/30 uppercase tracking-widest">{t.hubStatsMembers}</span>
                            <span className="text-sm font-russo text-white leading-none">{clubStats.totalPlayers}</span>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-[8px] font-black text-white/30 uppercase tracking-widest">{t.hubSessionsPlayed}</span>
                            <span className="text-sm font-russo text-white leading-none">{clubStats.totalSessions}</span>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-[8px] font-black text-white/30 uppercase tracking-widest">{t.hubAvgRating}</span>
                            <span className="text-sm font-russo text-[#00F2FE] leading-none">{clubStats.avgRating}</span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <RadioPlayer />
                    
                    {/* Navigation */}
                    <nav className="flex items-center gap-1 bg-white/5 p-1 rounded-xl border border-white/5">
                        {navItems.map(item => (
                            <button
                                key={item.id}
                                onClick={() => setCurrentView(item.id as any)}
                                className={`
                                    flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all duration-300
                                    ${currentView === item.id 
                                        ? 'bg-[#00F2FE]/10 text-[#00F2FE] shadow-[0_0_10px_rgba(0,242,254,0.15)] border border-[#00F2FE]/30' 
                                        : 'text-white/40 hover:text-white hover:bg-white/5 border border-transparent'}
                                `}
                            >
                                <item.icon className="w-4 h-4" />
                                <span className="text-[10px] font-black uppercase tracking-wider hidden sm:inline-block">{item.label}</span>
                            </button>
                        ))}
                    </nav>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-grow relative overflow-hidden p-4">
                <div className="w-full h-full rounded-[2.5rem] overflow-hidden border border-white/5 bg-[#01040a] relative shadow-2xl">
                    <ClubIntelligenceDashboard currentView={currentView} setView={setCurrentView} />
                </div>
            </main>
        </div>
    );
};
