
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../context';
import { Card, useTranslation, Button } from '../ui';
import { isSupabaseConfigured, getCloudPlayerCount, savePlayersToDB, loadHistoryFromDB } from '../db';
import { generateDemoData } from '../services/demo';
import { RefreshCw } from '../icons';
import { calculateAllStats } from '../services/statistics';

export const SettingsScreen: React.FC = () => {
    const t = useTranslation();
    const { language, setLanguage, allPlayers, setAllPlayers, history, setHistory, setNewsFeed } = useApp();
    const [cloudStatus, setCloudStatus] = React.useState<{ connected: boolean, count: number } | null>(null);
    const [isRefreshing, setIsRefreshing] = React.useState(false);
    const [isRecalculating, setIsRecalculating] = useState(false);
    
    const checkCloud = async () => {
        if (isRefreshing) return;
        setIsRefreshing(true);
        if (isSupabaseConfigured()) {
            // TRAFFIC OPTIMIZATION: Use lightweight HEAD request (count only)
            const count = await getCloudPlayerCount();
            if (count !== null) {
                setCloudStatus({ connected: true, count });
            } else {
                setCloudStatus({ connected: false, count: 0 });
            }
        } else {
            setCloudStatus({ connected: false, count: 0 });
        }
        setIsRefreshing(false);
    };

    // Check once on mount
    React.useEffect(() => {
        checkCloud();
    }, []);


    const handleGenerateDemo = () => {
        const { session, players: demoPlayers, news } = generateDemoData();
        setHistory(prev => [session, ...prev].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
        const existingPlayerIds = new Set(allPlayers.map(p => p.id));
        const newDemoPlayers = demoPlayers.filter(p => !existingPlayerIds.has(p.id));
        if (newDemoPlayers.length > 0) {
            setAllPlayers(prev => [...prev, ...newDemoPlayers]);
        }
        setNewsFeed(prev => [...news, ...prev].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
        alert('Demo session generated. This data is temporary.');
    };

    const handleRecalculateRecords = async () => {
        if (isRecalculating) return;
        setIsRecalculating(true);

        try {
            // **FIX**: Load the FULL history from the database, not from the partial state.
            const fullHistory = await loadHistoryFromDB();
            if (!fullHistory || fullHistory.length === 0) {
                alert("No session history found to recalculate records.");
                setIsRecalculating(false);
                return;
            }

            const recalculatedPlayers = JSON.parse(JSON.stringify(allPlayers));

            for (const player of recalculatedPlayers) {
                // Reset records to start fresh
                player.records = {
                    bestGoalsInSession: { value: 0, sessionId: '' },
                    bestAssistsInSession: { value: 0, sessionId: '' },
                    bestWinRateInSession: { value: 0, sessionId: '' },
                };

                // Use the complete history for calculation
                for (const session of fullHistory) {
                    // Check if player participated in this session
                    if (!session.playerPool.some(p => p.id === player.id)) {
                        continue;
                    }

                    // Calculate stats for this specific session
                    const { allPlayersStats } = calculateAllStats(session);
                    const playerStatsForSession = allPlayersStats.find(s => s.player.id === player.id);

                    if (playerStatsForSession) {
                        const { goals, assists, wins, gamesPlayed } = playerStatsForSession;
                        const winRate = gamesPlayed > 0 ? Math.round((wins / gamesPlayed) * 100) : 0;

                        if (goals > player.records.bestGoalsInSession.value) {
                            player.records.bestGoalsInSession = { value: goals, sessionId: session.id };
                        }
                        if (assists > player.records.bestAssistsInSession.value) {
                            player.records.bestAssistsInSession = { value: assists, sessionId: session.id };
                        }
                        if (winRate > player.records.bestWinRateInSession.value) {
                            player.records.bestWinRateInSession = { value: winRate, sessionId: session.id };
                        }
                    }
                }
            }

            setAllPlayers(recalculatedPlayers);
            await savePlayersToDB(recalculatedPlayers);
            alert('All player career records have been successfully recalculated and saved!');

        } catch (error) {
            console.error("Error recalculating records:", error);
            alert("An error occurred during recalculation.");
        } finally {
            setIsRecalculating(false);
        }
    };

    const langClasses = (lang: string) => `px-3 py-1 rounded-full font-bold transition-colors text-base ${language === lang ? 'gradient-bg text-dark-bg' : 'bg-dark-surface hover:bg-white/10'}`;

    const NetworkHud = () => {
        const isLoading = cloudStatus === null || isRefreshing;
        const isOnline = cloudStatus?.connected === true;

        const onlineTheme = {
            color: '#00F2FE',
            glowColor: 'rgba(0, 242, 254, 0.2)',
            borderColor: 'border-dark-accent-start',
            textStyle: { color: '#00F2FE', textShadow: '0 0 10px #00F2FE' }
        };
    
        const offlineTheme = {
            color: '#A9B1BD',
            glowColor: 'rgba(169, 177, 189, 0.1)',
            borderColor: 'border-gray-600',
            textStyle: { color: '#A9B1BD', textShadow: '0 0 8px rgba(169, 177, 189, 0.5)' }
        };

        const theme = isOnline ? onlineTheme : offlineTheme;
        
        return (
            <div 
                onClick={checkCloud}
                className={`relative overflow-hidden rounded-xl border ${theme.borderColor}/50 bg-black/60 p-5 shadow-[0_0_20px_${theme.glowColor}] transition-all duration-300 cursor-pointer active:scale-95 group select-none`}
            >
                <div 
                    className="absolute inset-0 opacity-10 pointer-events-none"
                    style={{ 
                        backgroundImage: `linear-gradient(${theme.color} 1px, transparent 1px), linear-gradient(90deg, ${theme.color} 1px, transparent 1px)`,
                        backgroundSize: '20px 20px'
                    }}
                />
                
                <div className="relative z-10 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="relative flex items-center justify-center w-12 h-12">
                            <span className={`absolute w-full h-full rounded-full opacity-75 ${isOnline ? 'animate-ping' : ''}`} style={{ backgroundColor: theme.color }}></span>
                            <span className="relative w-4 h-4 rounded-full shadow-[0_0_10px_currentColor]" style={{ backgroundColor: theme.color }}></span>
                            {isLoading && (
                                <svg className="absolute w-12 h-12 animate-spin" style={{ animationDuration: '4s' }} viewBox="0 0 50 50">
                                    <circle cx="25" cy="25" r="23" fill="none" stroke={theme.color} strokeWidth="1" strokeDasharray="30 20" opacity="0.5" />
                                </svg>
                            )}
                        </div>

                        <div className="flex flex-col">
                            <h3 className="text-[10px] font-bold tracking-[0.2em] text-dark-text-secondary uppercase mb-0.5 group-hover:text-white transition-colors">
                                DATABASE UPLINK
                            </h3>
                            <div className="flex items-center gap-2">
                                <span className="text-xl font-black italic tracking-wider" style={theme.textStyle}>
                                    {isOnline ? 'SYSTEM ONLINE' : 'LOCAL MODE'}
                                </span>
                            </div>
                        </div>
                    </div>
                    <div className="text-right">
                        <div className="flex flex-col items-end">
                            <div className="flex items-center gap-2">
                                <span className="text-[9px] text-dark-text-secondary font-mono group-hover:text-dark-accent-start transition-colors">
                                    {isRefreshing ? 'SYNCING...' : 'TAP TO SYNC'}
                                </span>
                            </div>
                            
                            <div className="flex items-baseline gap-1 mt-1">
                                {(isLoading && !cloudStatus) ? (
                                     <span className="text-lg font-bold font-mono" style={{color: theme.color}}>--</span>
                                ) : (
                                    <>
                                        <span className="text-2xl font-bold font-mono text-white">
                                            {cloudStatus?.count || 0}
                                        </span>
                                        <span className="text-[9px] text-dark-text-secondary font-bold">/ {allPlayers.length}</span>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    const cardNeonClasses = "shadow-lg shadow-dark-accent-start/20 border border-dark-accent-start/40 bg-dark-surface/80 hover:bg-dark-surface/100 transition-all duration-300";

    return (
        <div className="flex flex-col min-h-screen pb-28">
            <div className="p-4 flex-grow">
                <h1 className="text-2xl font-bold text-center mb-8">{t.settingsTitle}</h1>
                <div className="space-y-3">
                    {/* Compact Card: Language */}
                    <Card className={`${cardNeonClasses} !p-3`}>
                        <div className="flex items-center justify-between">
                            <h2 className="text-lg font-bold text-white tracking-wide">{t.language}</h2>
                            <div className="flex items-center gap-2">
                                <button onClick={() => setLanguage('en')} className={langClasses('en')}>EN</button>
                                <button onClick={() => setLanguage('ua')} className={langClasses('ua')}>UA</button>
                                <button onClick={() => setLanguage('vn')} className={langClasses('vn')}>VN</button>
                                <button onClick={() => setLanguage('ru')} className={langClasses('ru')}>RU</button>
                            </div>
                        </div>
                    </Card>

                    {/* Compact Card: Voice Assistant */}
                    <Link to="/settings/voice" className="block">
                         <Card className={`${cardNeonClasses} !p-3`}>
                             <div className="flex justify-center items-center">
                                <h2 className="font-chakra font-bold text-xl text-white tracking-wider">{t.voiceAssistant}</h2>
                            </div>
                        </Card>
                    </Link>
                    
                    {/* NEW: Data Management Card */}
                    <Card className={`${cardNeonClasses} !p-3 space-y-3`}>
                         <Button variant="ghost" onClick={handleRecalculateRecords} disabled={isRecalculating} className="w-full !justify-center !p-0">
                            <h2 className="font-chakra font-bold text-xl text-white tracking-wider">
                                {isRecalculating ? 'Recalculating...' : 'Recalculate Career Bests'}
                            </h2>
                        </Button>
                    </Card>

                    {/* Compact Card: Demo Tools */}
                    <Card className={`${cardNeonClasses} !p-3 space-y-3`}>
                         <Button variant="ghost" onClick={handleGenerateDemo} className="w-full !justify-center !p-0">
                            <h2 className="font-chakra font-bold text-xl text-white tracking-wider">{t.generateDemoSession}</h2>
                        </Button>
                    </Card>
                </div>
            </div>

            <div className="p-4 shrink-0 space-y-4">
                <NetworkHud />
                <div className="text-center opacity-40 hover:opacity-100 transition-opacity duration-500">
                    <p className="font-orbitron font-bold text-sm tracking-widest text-dark-accent-start">532 PLAYGROUND</p>
                    <p className="text-[10px] text-dark-text-secondary font-mono mt-1">v3.0.0 • SYSTEM READY</p>
                </div>
            </div>
        </div>
    );
};
