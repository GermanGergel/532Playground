import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useApp } from '../context';
import { Card, Button, useTranslation } from '../ui';
import { isSupabaseConfigured, getCloudPlayerCount, savePlayersToDB } from '../db';
import { Wand, Activity, RefreshCw, Trash2 } from '../icons';
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

    const handleRollback1702 = async () => {
        if (isRepairing) return;
        if (!window.confirm("NUCLEAR ROLLBACK 17.02: Это полностью удалит данные за 17 февраля и очистит виджеты анализа. Рейтинги вернутся к состоянию на 16-е число. Продолжить?")) return;

        setIsRepairing(true);
        try {
            // 1. Ищем сессию
            const targetSession = history.find(s => s.date.includes('2026-02-17') || s.date.includes('17/02/2026'));
            if (!targetSession) {
                alert("Сессия 17.02 не найдена в истории этого устройства.");
                setIsRepairing(false);
                return;
            }

            // 2. Считаем статистику этой сессии для вычитания
            const { allPlayersStats } = calculateAllStats(targetSession, allPlayers);
            
            // 3. Трансформируем игроков
            const rolledBackPlayers = allPlayers.map(p => {
                const sessionStats = allPlayersStats.find(s => s.player.id === p.id);
                const historyData = p.historyData || [];
                const has1702Entry = historyData.some(h => h.date === '17/02');

                // Если игрока не было в ту дату, не трогаем
                if (!sessionStats && !has1702Entry) return p;

                // Откатываем график и OVR
                const targetIdx = historyData.findIndex(h => h.date === '17/02');
                let restoredRating = p.rating;
                let newHistory = [...historyData];

                if (targetIdx !== -1) {
                    const prevPoint = historyData[targetIdx - 1];
                    // Если есть точка ДО 17-го — берем её рейтинг, иначе берем начальный (floor)
                    restoredRating = prevPoint ? prevPoint.rating : (p.initialRating || 68);
                    newHistory = historyData.filter(h => h.date !== '17/02');
                }

                // Вычитаем голы/пассы/победы за 17-е
                let totalGames = p.totalGames;
                let totalGoals = p.totalGoals;
                let totalAssists = p.totalAssists;
                let totalWins = p.totalWins;
                let totalDraws = p.totalDraws;
                let totalLosses = p.totalLosses;
                let totalSessions = p.totalSessionsPlayed;

                if (sessionStats) {
                    totalGames = Math.max(0, totalGames - sessionStats.gamesPlayed);
                    totalGoals = Math.max(0, totalGoals - sessionStats.goals);
                    totalAssists = Math.max(0, totalAssists - sessionStats.assists);
                    totalWins = Math.max(0, totalWins - sessionStats.wins);
                    totalDraws = Math.max(0, totalDraws - sessionStats.draws);
                    totalLosses = Math.max(0, totalLosses - sessionStats.losses);
                    totalSessions = Math.max(0, totalSessions - 1);
                }

                // Откатываем индикаторы формы
                const sessionHistory = [...(p.sessionHistory || [])];
                if (has1702Entry && sessionHistory.length > 0) sessionHistory.pop();

                // ВОЗВРАЩАЕМ ЧИСТОГО ИГРОКА
                return { 
                    ...p, 
                    rating: restoredRating,
                    totalGames, totalGoals, totalAssists, totalWins, totalDraws, totalLosses,
                    totalSessionsPlayed: totalSessions,
                    historyData: newHistory,
                    sessionHistory,
                    form: 'stable' as const,
                    // КРИТИЧЕСКИЙ МОМЕНТ: Удаляем объект анализа, чтобы убрать цифру 84
                    lastRatingChange: undefined, 
                    consecutiveMissedSessions: Math.max(0, (p.consecutiveMissedSessions || 0) - 1)
                };
            });

            setAllPlayers(rolledBackPlayers);
            await savePlayersToDB(rolledBackPlayers);
            alert("ОТКАТ ЗАВЕРШЕН. Проверьте Хаб - блоки анализа за 17.02 должны исчезнуть.");

        } catch (e) {
            console.error(e);
            alert("Ошибка при выполнении отката.");
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
        const themeColor = isOnline ? '#00F2FE' : '#A9B1BD';
        
        return (
            <div 
                onClick={checkCloud}
                className={`relative overflow-hidden rounded-xl border ${isOnline ? 'border-dark-accent-start/50' : 'border-gray-600/50'} bg-black/60 p-5 transition-all duration-300 cursor-pointer active:scale-95 group select-none`}
            >
                <div className="relative z-10 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="relative flex items-center justify-center w-12 h-12">
                            <span className={`absolute w-full h-full rounded-full opacity-20 ${isOnline ? 'animate-ping' : ''}`} style={{ backgroundColor: themeColor }}></span>
                            <span className="relative w-4 h-4 rounded-full" style={{ backgroundColor: themeColor, boxShadow: `0 0 10px ${themeColor}` }}></span>
                        </div>

                        <div className="flex flex-col">
                            <h3 className="text-[10px] font-bold tracking-[0.2em] text-dark-text-secondary uppercase mb-0.5 group-hover:text-white transition-colors">
                                DATABASE UPLINK
                            </h3>
                            <span className="text-xl font-black italic tracking-wider leading-none" style={{ color: themeColor }}>
                                {isOnline ? 'SYSTEM ONLINE' : 'LOCAL MODE'}
                            </span>
                        </div>
                    </div>
                    <div className="text-right">
                        <div className="flex flex-baseline gap-1 mt-1">
                            <span className="text-2xl font-bold font-mono text-white">
                                {cloudStatus?.count || 0}
                            </span>
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
                    onClick={handleRollback1702}
                    disabled={isRepairing}
                    className="w-full !py-3 border border-orange-500/20 bg-orange-500/5 hover:bg-orange-500/10 text-orange-500 text-[10px] tracking-widest uppercase flex items-center justify-center gap-2"
                >
                    <Trash2 className={`w-3 h-3 ${isRepairing ? 'animate-bounce' : ''}`} /> 
                    {isRepairing ? 'CLEANING DATABASE...' : 'FULL ROLLBACK 17.02'}
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
                    <p className="text-[10px] text-dark-text-secondary font-mono mt-1">v4.0.3 • SYSTEM READY</p>
                </div>
            </div>
        </div>
    );
};