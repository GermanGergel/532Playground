
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../context';
import { Card, useTranslation, Button } from '../ui';
import { isSupabaseConfigured, getCloudPlayerCount, loadHistoryFromDB, savePlayersToDB } from '../db';
import { RefreshCw } from '../icons';
import { Player, Session } from '../types';
import { calculateAllStats } from '../services/statistics';

export const SettingsScreen: React.FC = () => {
    const t = useTranslation();
    const { language, setLanguage, allPlayers, setAllPlayers } = useApp();
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

    const handleRecalculate = async () => {
        if (!window.confirm("This will recalculate career records for ALL players based on ALL saved sessions. This can be slow and will overwrite existing records. Continue?")) {
            return;
        }
    
        setIsRecalculating(true);
    
        try {
            const allHistory = await loadHistoryFromDB();
            if (!allHistory || allHistory.length === 0) {
                alert("No session history found to calculate from.");
                setIsRecalculating(false);
                return;
            }
    
            const playersToUpdate = JSON.parse(JSON.stringify(allPlayers)) as Player[];
            const playerMap = new Map<string, Player>(playersToUpdate.map((p: Player) => [p.id, p]));
    
            for (const player of playerMap.values()) {
                player.records = {
                    bestGoalsInSession: { value: 0, sessionId: '' },
                    bestAssistsInSession: { value: 0, sessionId: '' },
                    bestWinRateInSession: { value: 0, sessionId: '' },
                };
            }
    
            for (const session of allHistory) {
                if (session.status !== 'completed') continue;
                
                const { allPlayersStats } = calculateAllStats(session);
    
                for (const stats of allPlayersStats) {
                    const player = playerMap.get(stats.player.id);
                    if (!player) continue;
    
                    if (stats.goals > player.records.bestGoalsInSession.value) {
                        player.records.bestGoalsInSession = { value: stats.goals, sessionId: session.id };
                    }
    
                    if (stats.assists > player.records.bestAssistsInSession.value) {
                        player.records.bestAssistsInSession = { value: stats.assists, sessionId: session.id };
                    }
    
                    const winRate = stats.gamesPlayed > 0 ? Math.round((stats.wins / stats.gamesPlayed) * 100) : 0;
                    if (winRate > player.records.bestWinRateInSession.value) {
                        player.records.bestWinRateInSession = { value: winRate, sessionId: session.id };
                    }
                }
            }
    
            const updatedPlayersArray = Array.from(playerMap.values());
    
            const saveResult = await savePlayersToDB(updatedPlayersArray);
            setAllPlayers(updatedPlayersArray);
    
            if (saveResult.success) {
                alert(`Successfully recalculated records for ${updatedPlayersArray.length} players. Cloud sync: ${saveResult.cloudSaved ? 'OK' : 'Failed'}.`);
            } else {
                throw new Error("Failed to save updated player records.");
            }
    
        } catch (error) {
            console.error("Recalculation failed:", error);
            alert(`An error occurred during recalculation: ${error instanceof Error ? error.message : 'Unknown error'}`);
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

                    {/* Recalculate Records Card */}
                    <Card className={cardNeonClasses}>
                        <Button 
                            variant="secondary"
                            onClick={handleRecalculate}
                            disabled={isRecalculating}
                            className="w-full !py-3"
                        >
                            {isRecalculating ? "Processing..." : t.recalculateRecords}
                        </Button>
                        <p className="text-xs text-dark-text-secondary text-center mt-2">
                            {t.recalculateRecordsDesc}
                        </p>
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
