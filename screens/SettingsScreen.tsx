
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../context';
import { Card, useTranslation, Button } from '../ui';
import { isSupabaseConfigured, getCloudPlayerCount, savePlayersToDB, loadHistoryFromDB } from '../db';
import { RefreshCw } from '../icons';
import { Player, Session } from '../types';

export const SettingsScreen: React.FC = () => {
    const t = useTranslation();
    const { language, setLanguage, allPlayers, setAllPlayers } = useApp();
    const [cloudStatus, setCloudStatus] = React.useState<{ connected: boolean, count: number } | null>(null);
    const [isRefreshing, setIsRefreshing] = React.useState(false);
    const [isRecalculating, setIsRecalculating] = React.useState(false);
    
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

    const handleRecalculateHistory = async () => {
        setIsRecalculating(true);
        
        try {
            // 1. Fetch ALL history to reconstruct the timeline
            const fullHistory = await loadHistoryFromDB(); // No limit = get everything
            const sessions = (fullHistory || []).sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

            const updatedPlayers = allPlayers.map(p => {
                // If chart exists and has more than 1 point, assume it's already good.
                // We only fix players with NO history or just the dummy "Start" point we created earlier.
                const hasRealHistory = p.historyData && p.historyData.length > 1;
                
                if (!hasRealHistory) {
                    // --- RECONSTRUCTION LOGIC ---
                    
                    // 1. Find sessions this player participated in
                    const playerSessions = sessions.filter(s => {
                        return s.teams.some(t => t.playerIds.includes(p.id));
                    });

                    // 2. Base Rating (Assume 60 for newcomers if we don't know better, or calculate backwards)
                    // If they have played sessions, we assume linear growth to current rating.
                    const currentRating = p.rating;
                    const sessionsPlayedCount = playerSessions.length;
                    
                    let historyData = [];

                    if (sessionsPlayedCount === 0) {
                        // Just a starting point
                        historyData.push({
                            date: 'Start',
                            rating: currentRating,
                            winRate: 0,
                            goals: 0,
                            assists: 0
                        });
                    } else {
                        // Interpolate!
                        // Example: Started at 60 (default) -> Ends at 80.
                        // Delta = 20. If 4 sessions, step is 5.
                        const startRating = 60; 
                        // If current rating is lower than start (bad player), handle that too.
                        const totalGrowth = currentRating - startRating;
                        const step = totalGrowth / sessionsPlayedCount;

                        // Add "Day 0" point
                        historyData.push({
                            date: 'Start',
                            rating: startRating,
                            winRate: 0,
                            goals: 0,
                            assists: 0
                        });

                        let runningRating = startRating;
                        let runningGoals = 0;
                        let runningAssists = 0;
                        let runningWins = 0;
                        let runningGames = 0;

                        playerSessions.forEach((session, index) => {
                            // Calculate cumulative stats for this session from the actual session data
                            const playerTeam = session.teams.find(t => t.playerIds.includes(p.id));
                            if (playerTeam) {
                                session.games.forEach(g => {
                                    if (g.status === 'finished') {
                                        const myGoals = g.goals.filter(goal => goal.scorerId === p.id && !goal.isOwnGoal).length;
                                        const myAssists = g.goals.filter(goal => goal.assistantId === p.id).length;
                                        const myTeamId = playerTeam.id;
                                        const isWinner = g.winnerTeamId === myTeamId;
                                        const played = (g.team1Id === myTeamId || g.team2Id === myTeamId);
                                        
                                        if (played) {
                                            runningGames++;
                                            runningGoals += myGoals;
                                            runningAssists += myAssists;
                                            if (isWinner) runningWins++;
                                        }
                                    }
                                });
                            }

                            // Math for rating curve
                            // We use the index to grow the rating linearly towards the current value
                            runningRating += step;
                            
                            // Format date: "DD.MM"
                            const dateObj = new Date(session.date);
                            const dateLabel = `${String(dateObj.getDate()).padStart(2, '0')}.${String(dateObj.getMonth() + 1).padStart(2, '0')}`;

                            const currentWinRate = runningGames > 0 ? Math.round((runningWins / runningGames) * 100) : 0;

                            historyData.push({
                                date: dateLabel,
                                rating: Math.round(runningRating), // Round to integer
                                winRate: currentWinRate,
                                goals: runningGoals,
                                assists: runningAssists
                            });
                        });
                        
                        // Force the LAST entry to match the EXACT current rating (fix rounding errors)
                        const lastIdx = historyData.length - 1;
                        if (lastIdx >= 0) {
                            historyData[lastIdx].rating = p.rating;
                        }
                    }

                    // Keep only last 12 points to match chart limits
                    if (historyData.length > 12) {
                        historyData = historyData.slice(historyData.length - 12);
                    }

                    return {
                        ...p,
                        historyData: historyData
                    };
                }
                return p;
            });

            // Optimistic update
            setAllPlayers(updatedPlayers);
            
            // Save to DB and check result
            const result = await savePlayersToDB(updatedPlayers);
            
            if (result.cloudSaved) {
                alert(`✅ SUCCESS!\n\nReconstructed history for players based on ${sessions.length} past sessions.\n\nCharts should now show a curve instead of a flat line.`);
            } else {
                alert("⚠️ SAVED LOCALLY ONLY!\n\nCheck your internet or Supabase connection.");
            }

        } catch (error) {
            console.error("Failed to recalculate history:", error);
            alert("Error regenerating data.");
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

                    {/* Data Management Section */}
                    <Card className={`${cardNeonClasses} !p-3`}>
                        <h2 className="text-sm font-bold text-dark-text-secondary uppercase mb-3 text-center">{t.dataManagement}</h2>
                        <Button 
                            variant="secondary" 
                            onClick={handleRecalculateHistory} 
                            disabled={isRecalculating}
                            className="w-full flex items-center justify-center gap-2"
                        >
                            <RefreshCw className={`w-4 h-4 ${isRecalculating ? 'animate-spin' : ''}`} />
                            <div className="text-left">
                                <p className="font-bold text-sm">{t.recalculateHistory}</p>
                                <p className="text-[10px] text-dark-text-secondary font-normal">{t.recalculateHistoryDesc}</p>
                            </div>
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
