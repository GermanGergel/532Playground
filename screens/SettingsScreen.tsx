import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useApp } from '../context';
import { Card, Button, useTranslation } from '../ui';
import { isSupabaseConfigured, getCloudPlayerCount, savePlayersToDB } from '../db';
import { Wand, Activity, RefreshCw } from '../icons';
import { calculateAllStats } from '../services/statistics';
import { calculateRatingUpdate, calculateEarnedBadges, getTierForRating } from '../services/rating';
import { Player, PlayerHistoryEntry, PlayerHistoryEntry as HistoryData } from '../types';

const WalletIcon = ({ className }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M21 12V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-5" />
        <path d="M16 12h5" />
        <circle cx="16" cy="12" r="1" />
    </svg>
);

export const SettingsScreen: React.FC = () => {
    const t = useTranslation();
    const navigate = useNavigate();
    const { language, setLanguage, allPlayers, history, setAllPlayers } = useApp();
    const [cloudStatus, setCloudStatus] = React.useState<{ connected: boolean, count: number } | null>(null);
    const [isRefreshing, setIsRefreshing] = React.useState(false);
    const [isRepairing, setIsRepairing] = React.useState(false);
    
    const dbEndpoint = (process.env.VITE_SUPABASE_URL || '').split('//')[1]?.split('.')[0]?.toUpperCase() || 'LOCAL';

    const checkCloud = async () => {
        if (isRefreshing) return;
        setIsRefreshing(true);
        if (isSupabaseConfigured()) {
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

    const handleRepair1702Stats = async () => {
        if (isRepairing) return;
        if (!window.confirm("CRITICAL REPAIR: This will perform a FULL recalculation for 17.02 session (Goals, Wins, Rating). Proceed?")) return;

        setIsRepairing(true);
        try {
            // 1. Find session from 17.02
            const targetSession = history.find(s => s.date.includes('2026-02-17') || s.date.includes('17/02/2026'));
            if (!targetSession) {
                alert("Session from 17.02 not found in history.");
                setIsRepairing(false);
                return;
            }

            // 2. Get true stats using global players as fallback (This finds the "missing" captains)
            const { allPlayersStats } = calculateAllStats(targetSession, allPlayers);
            
            // 3. Process each affected player
            const updatedPlayers = allPlayers.map(p => {
                const sessionStats = allPlayersStats.find(s => s.player.id === p.id);
                if (!sessionStats) return p;

                // Check if they already have history for this date to avoid double counting
                const hasHistory = p.historyData?.some(h => h.date === '17/02');
                if (hasHistory) return p;

                console.log(`Deep repairing all stats for ${p.nickname}...`);

                // A. Calculate Rating Delta & Badges
                const badgesEarned = calculateEarnedBadges(p, sessionStats, targetSession, allPlayersStats);
                const { breakdown } = calculateRatingUpdate(p, sessionStats, targetSession, badgesEarned);

                // B. Apply deltas to CAREER totals
                const totalGames = p.totalGames + sessionStats.gamesPlayed;
                const totalGoals = p.totalGoals + sessionStats.goals;
                const totalAssists = p.totalAssists + sessionStats.assists;
                const totalWins = p.totalWins + sessionStats.wins;
                const totalDraws = p.totalDraws + sessionStats.draws;
                const totalLosses = p.totalLosses + sessionStats.losses;
                const totalSessionsPlayed = (p.totalSessionsPlayed || 0) + 1;

                // C. Update Rating and Tier
                const newRating = Math.max(p.initialRating || 68, Math.round(breakdown.newRating));
                const newTier = getTierForRating(newRating);

                // D. Update Monthly Stats (Assuming Feb 2026)
                const monthlyGames = p.monthlyGames + sessionStats.gamesPlayed;
                const monthlyGoals = p.monthlyGoals + sessionStats.goals;
                const monthlyAssists = p.monthlyAssists + sessionStats.assists;
                const monthlyWins = p.monthlyWins + sessionStats.wins;
                const monthlySessionsPlayed = (p.monthlySessionsPlayed || 0) + 1;

                // E. Construct history entry for chart
                const winRate = sessionStats.gamesPlayed > 0 ? Math.round((sessionStats.wins / sessionStats.gamesPlayed) * 100) : 0;
                const newEntry: PlayerHistoryEntry = {
                    date: '17/02',
                    rating: newRating,
                    winRate,
                    goals: sessionStats.goals,
                    assists: sessionStats.assists
                };

                const historyData = [...(p.historyData || [])];
                historyData.push(newEntry);
                if (historyData.length > 12) historyData.shift();

                return { 
                    ...p, 
                    rating: newRating,
                    tier: newTier,
                    totalGames, totalGoals, totalAssists, totalWins, totalDraws, totalLosses, totalSessionsPlayed,
                    monthlyGames, monthlyGoals, monthlyAssists, monthlyWins, monthlySessionsPlayed,
                    historyData,
                    lastRatingChange: { ...breakdown, newRating, badgesEarned, finalChange: newRating - p.rating },
                    consecutiveMissedSessions: 0,
                    lastPlayedAt: targetSession.date
                };
            });

            setAllPlayers(updatedPlayers);
            await savePlayersToDB(updatedPlayers);
            alert("FULL REPAIR COMPLETE. Career totals, rating and graph points have been restored.");

        } catch (e) {
            console.error(e);
            alert("Repair failed.");
        } finally {
            setIsRepairing(false);
        }
    };

    useEffect(() => {
        checkCloud();
    }, []);

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
                            <div className="flex flex-col">
                                <span className="text-xl font-black italic tracking-wider leading-none" style={theme.textStyle}>
                                    {isOnline ? 'SYSTEM ONLINE' : 'LOCAL MODE'}
                                </span>
                                {isOnline && (
                                    <span className="text-[8px] font-mono text-white/30 mt-1 uppercase tracking-widest">
                                        ID: {dbEndpoint}
                                    </span>
                                )}
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
            <div className="p-4 flex-grow space-y-4">
                <h1 className="text-2xl font-bold text-center mb-6">{t.settingsTitle}</h1>
                
                <div className="space-y-3">
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

                    <Link to="/ledger" className="block">
                         <Card className={`${cardNeonClasses} !p-3 border-dark-accent-start/30 active:scale-[0.98] transition-transform`}>
                             <div className="flex justify-center items-center gap-3">
                                <WalletIcon className="w-6 h-6 text-dark-accent-start" />
                                <h2 className="font-chakra font-bold text-xl text-white tracking-widest">{t.ledgerTitle}</h2>
                            </div>
                        </Card>
                    </Link>

                    <Link to="/settings/voice" className="block">
                         <Card className={`${cardNeonClasses} !p-3`}>
                             <div className="flex justify-center items-center">
                                <h2 className="font-chakra font-bold text-xl text-white tracking-wider">{t.voiceAssistant}</h2>
                            </div>
                        </Card>
                    </Link>

                    <Link to="/settings/analytics" className="block">
                         <Card className={`${cardNeonClasses} !p-3`}>
                             <div className="flex justify-center items-center gap-3">
                                <Activity className="w-6 h-6 text-[#00F2FE]" />
                                <h2 className="font-chakra font-bold text-xl text-white tracking-wider">{t.hubAnalytics}</h2>
                            </div>
                        </Card>
                    </Link>
                </div>
            </div>

            <div className="p-4 shrink-0 space-y-4">
                <Button 
                    variant="ghost" 
                    onClick={handleRepair1702Stats}
                    disabled={isRepairing}
                    className="w-full !py-3 border border-yellow-500/20 bg-yellow-500/5 hover:bg-yellow-500/10 text-yellow-500 text-[10px] tracking-widest uppercase flex items-center justify-center gap-2"
                >
                    <RefreshCw className={`w-3 h-3 ${isRepairing ? 'animate-spin' : ''}`} /> 
                    {isRepairing ? 'DEEP REPAIRING...' : 'FULL FIX 17.02 STATS'}
                </Button>

                <Button 
                    variant="ghost" 
                    onClick={() => navigate('/settings/promo-admin')}
                    className="w-full !py-3 border border-white/5 bg-black/20 hover:bg-white/5 text-dark-text-secondary text-[10px] tracking-widest uppercase flex items-center justify-center gap-2"
                >
                    <Wand className="w-3 h-3 opacity-50" /> Config Promo
                </Button>

                <NetworkHud />
                
                <div className="text-center opacity-40 hover:opacity-100 transition-opacity duration-500">
                    <p className="font-orbitron font-bold text-sm tracking-widest text-dark-accent-start uppercase">UNIT</p>
                    <p className="text-[10px] text-dark-text-secondary font-mono mt-1">v4.0.2 • SYSTEM READY</p>
                </div>
            </div>
        </div>
    );
};