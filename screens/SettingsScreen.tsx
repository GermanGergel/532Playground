import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useApp } from '../context';
import { Card, Button, useTranslation } from '../ui';
import { isSupabaseConfigured, getCloudPlayerCount, savePlayersToDB } from '../db';
import { Wand, Activity, Trash2, Zap } from '../icons';
import { calculateAllStats } from '../services/statistics';
import { Player } from '../types';

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

    const handleNuclearCleanup = async () => {
        if (isRepairing) return;
        if (!window.confirm("ОЧИСТКА ГРАФИКОВ: Это удалит точки за дни, когда игроков НЕ БЫЛО на поле. Исправит фантомные даты (10.02 и т.д.). Продолжить?")) return;

        setIsRepairing(true);
        try {
            const cleanedPlayers = allPlayers.map(p => {
                const historyData = p.historyData || [];
                const newHistory = historyData.filter((h, idx) => {
                    if (idx === 0 || h.date === 'Start') return true;
                    // Оставляем только дни с реальной активностью
                    return (h.goals || 0) > 0 || (h.assists || 0) > 0 || (h.winRate || 0) > 0;
                });

                return { 
                    ...p, 
                    historyData: newHistory,
                    // Если текущий анализ ссылается на пустоту, тоже чистим
                    lastRatingChange: (p.lastRatingChange && p.lastRatingChange.teamPerformance === 0 && p.lastRatingChange.individualPerformance === 0) ? undefined : p.lastRatingChange
                };
            });

            setAllPlayers(cleanedPlayers);
            await savePlayersToDB(cleanedPlayers);
            alert("ГРАФИКИ ОЧИЩЕНЫ.");
        } catch (e) {
            console.error(e);
            alert("Ошибка при очистке.");
        } finally {
            setIsRepairing(false);
        }
    };

    const handleRollback1702 = async () => {
        if (isRepairing) return;
        if (!window.confirm("NUCLEAR ROLLBACK 17.02: Это УДАЛИТ данные за 17 февраля и ПРИНУДИТЕЛЬНО ОЧИСТИТ плашки анализа в Хабе. Продолжить?")) return;

        setIsRepairing(true);
        try {
            const targetSession = history.find(s => s.date.includes('17/02') || s.date.includes('2026-02-17'));
            const { allPlayersStats: sessionStats } = targetSession ? calculateAllStats(targetSession, allPlayers) : { allPlayersStats: [] };

            const rolledBackPlayers = allPlayers.map(p => {
                const playerStatsInSession = sessionStats.find(s => s.player.id === p.id);
                const historyData = [...(p.historyData || [])];
                const entryIdx = historyData.findIndex(h => h.date === '17/02');
                
                let restoredRating = p.rating;
                let newHistory = [...historyData];

                if (entryIdx !== -1) {
                    const prevEntry = historyData[entryIdx - 1];
                    restoredRating = prevEntry ? prevEntry.rating : (p.initialRating || 68);
                    newHistory = historyData.filter((_, i) => i !== entryIdx);
                }

                let totalG = p.totalGoals;
                let totalA = p.totalAssists;
                let totalW = p.totalWins;
                let totalGP = p.totalGames;
                let totalSess = p.totalSessionsPlayed;

                if (playerStatsInSession) {
                    totalG = Math.max(0, totalG - playerStatsInSession.goals);
                    totalA = Math.max(0, totalA - playerStatsInSession.assists);
                    totalW = Math.max(0, totalW - playerStatsInSession.wins);
                    totalGP = Math.max(0, totalGP - playerStatsInSession.gamesPlayed);
                    totalSess = Math.max(0, totalSess - 1);
                }

                // ВАЖНО: Мы создаем объект, где lastRatingChange явно отсутствует или null
                // Чтобы при сохранении в базу данных это поле затерлось
                const { lastRatingChange, ...playerWithoutAnalysis } = p;

                return {
                    ...playerWithoutAnalysis,
                    rating: restoredRating,
                    totalGoals: totalG,
                    totalAssists: totalA,
                    totalWins: totalW,
                    totalGames: totalGP,
                    totalSessionsPlayed: totalSess,
                    historyData: newHistory,
                    form: 'stable' as const,
                    consecutiveMissedSessions: Math.max(0, (p.consecutiveMissedSessions || 0) - 1),
                    lastRatingChange: null // Явно затираем для Хаба
                } as any;
            });

            setAllPlayers(rolledBackPlayers);
            await savePlayersToDB(rolledBackPlayers);
            alert("ОТКАТ ЗАВЕРШЕН. Ошибочные плашки в Хабе должны исчезнуть.");
        } catch (e) {
            console.error(e);
            alert("Ошибка при откате.");
        } finally {
            setIsRepairing(false);
        }
    };

    useEffect(() => {
        checkCloud();
    }, []);

    const langClasses = (lang: string) => `px-3 py-1 rounded-full font-bold transition-colors text-base ${language === lang ? 'gradient-bg text-dark-bg' : 'bg-dark-surface hover:bg-white/10'}`;

    const NetworkHud = () => {
        const isOnline = cloudStatus?.connected === true;
        const themeColor = isOnline ? '#00F2FE' : '#A9B1BD';
        
        return (
            <div 
                onClick={checkCloud}
                className="relative overflow-hidden rounded-xl border border-white/10 bg-black/60 p-5 transition-all duration-300 cursor-pointer active:scale-95 group select-none"
            >
                <div className="relative z-10 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="relative flex items-center justify-center w-12 h-12">
                            <span className={`absolute w-full h-full rounded-full opacity-20 ${isOnline ? 'animate-ping' : ''}`} style={{ backgroundColor: themeColor }}></span>
                            <span className="relative w-4 h-4 rounded-full" style={{ backgroundColor: themeColor, boxShadow: `0 0 10px ${themeColor}` }}></span>
                        </div>
                        <div className="flex flex-col">
                            <h3 className="text-[10px] font-bold tracking-[0.2em] text-dark-text-secondary uppercase mb-0.5 group-hover:text-white transition-colors">DATABASE UPLINK</h3>
                            <span className="text-xl font-black italic tracking-wider leading-none" style={{ color: themeColor }}>
                                {isOnline ? 'SYSTEM ONLINE' : 'LOCAL MODE'}
                            </span>
                        </div>
                    </div>
                    <div className="text-right">
                        <div className="flex items-baseline gap-1 mt-1">
                            <span className="text-2xl font-bold font-mono text-white">{cloudStatus?.count || 0}</span>
                            <span className="text-[9px] text-dark-text-secondary font-bold">/ {allPlayers.length}</span>
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
                    onClick={handleNuclearCleanup}
                    disabled={isRepairing}
                    className="w-full !py-3 border border-cyan-500/20 bg-cyan-500/5 hover:bg-cyan-500/10 text-cyan-400 text-[10px] tracking-widest uppercase flex items-center justify-center gap-2"
                >
                    <Zap className={`w-3 h-3 ${isRepairing ? 'animate-pulse' : ''}`} /> 
                    {isRepairing ? 'FIXING CHARTS...' : 'FIX PHANTOM DATES'}
                </Button>

                <Button 
                    variant="ghost" 
                    onClick={handleRollback1702}
                    disabled={isRepairing}
                    className="w-full !py-3 border border-orange-500/20 bg-orange-500/5 hover:bg-orange-500/10 text-orange-500 text-[10px] tracking-widest uppercase flex items-center justify-center gap-2"
                >
                    <Trash2 className={`w-3 h-3 ${isRepairing ? 'animate-bounce' : ''}`} /> 
                    {isRepairing ? 'CLEANING DATABASE...' : 'FULL ROLLBACK 17.02'}
                </Button>

                <NetworkHud />
                
                <div className="text-center opacity-40 hover:opacity-100 transition-opacity duration-500">
                    <p className="font-orbitron font-bold text-sm tracking-widest text-dark-accent-start uppercase">UNIT</p>
                    <p className="text-[10px] text-dark-text-secondary font-mono mt-1">v4.0.6 • SYSTEM READY</p>
                </div>
            </div>
        </div>
    );
};