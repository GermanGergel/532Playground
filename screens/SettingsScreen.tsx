import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useApp } from '../context';
import { Card, Button, useTranslation } from '../ui';
import { isSupabaseConfigured, getCloudPlayerCount } from '../db';
import { Wand, Users, ExternalLink } from '../icons';
import { Session, SessionStatus } from '../types';
import { processFinishedSession } from '../services/sessionProcessor';

const getInitialRecoveryDate = () => {
    const today = new Date();
    // Default to Dec 16 of the current year, based on the user's specific request for "16.12".
    const targetDate = new Date(today.getFullYear(), 11, 16); // Month is 0-indexed (11 = December)
    return targetDate.toISOString().split('T')[0];
};

export const SettingsScreen: React.FC = () => {
    const t = useTranslation();
    const navigate = useNavigate();
    const { 
        language, setLanguage, allPlayers,
        newsFeed, setNewsFeed, history, setHistory 
    } = useApp();
    const [cloudStatus, setCloudStatus] = React.useState<{ connected: boolean, count: number } | null>(null);
    const [isRefreshing, setIsRefreshing] = React.useState(false);
    const [recoveryDate, setRecoveryDate] = React.useState(getInitialRecoveryDate());
    const [isForceSaving, setIsForceSaving] = React.useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    
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

    useEffect(() => {
        checkCloud();
    }, []);

    const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        if (!recoveryDate) {
            alert('Пожалуйста, сначала выберите дату для восстановления.');
            return;
        }

        const reader = new FileReader();
        reader.onload = async (e) => {
            const jsonContent = e.target?.result as string;
            if (!jsonContent) {
                alert('Не удалось прочитать файл.');
                return;
            }

            setIsForceSaving(true);
            try {
                const backupData = JSON.parse(jsonContent);
                let backupSessions: Session[] = [];

                if (backupData.history && Array.isArray(backupData.history)) {
                    backupSessions = backupData.history;
                } else if (Array.isArray(backupData)) {
                    backupSessions = backupData;
                } else if (backupData.id && backupData.date) {
                    backupSessions = [backupData];
                }

                if (backupSessions.length === 0) {
                    throw new Error("Не удалось найти данные сессий в предоставленном JSON.");
                }
                
                const sessionToRecover = backupSessions.find(s => s.date === recoveryDate);

                if (!sessionToRecover) {
                    throw new Error(`Сессия от ${new Date(recoveryDate).toLocaleDateString('ru-RU')} не найдена в файле.`);
                }

                const existingSessionIds = new Set(history.map(s => s.id));
                if (existingSessionIds.has(sessionToRecover.id)) {
                    alert(`Сессия от ${sessionToRecover.date} уже существует в истории. Восстановление не требуется.`);
                    setIsForceSaving(false);
                    return;
                }

                if (!window.confirm(`Найдена сессия от ${sessionToRecover.date}. Восстановить ее? Статистика игроков НЕ будет изменена.`)) {
                    setIsForceSaving(false);
                    return;
                }

                const { finalSession, updatedNewsFeed } = processFinishedSession({
                    session: sessionToRecover,
                    oldPlayers: allPlayers,
                    newsFeed: newsFeed,
                });
                
                setHistory(prev => {
                    const newHistory = [finalSession, ...prev.filter(s => s.id !== finalSession.id)];
                    return newHistory.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
                });

                setNewsFeed(updatedNewsFeed);
                
                alert(`Успех! Сессия от ${finalSession.date} и связанные с ней новости были сохранены.`);
                navigate('/history');

            } catch (error) {
                console.error("Recovery Failed:", error);
                alert(`Не удалось восстановить сессию. Ошибка: ${error instanceof Error ? error.message : 'Unknown error'}`);
            } finally {
                setIsForceSaving(false);
                // Reset file input to allow re-uploading the same file
                if (event.target) event.target.value = '';
            }
        };
        reader.readAsText(file);
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
            <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelect}
                accept=".json"
                className="hidden"
            />
            <div className="p-4 flex-grow space-y-4">
                <h1 className="text-2xl font-bold text-center mb-6">{t.settingsTitle}</h1>
                
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

                    {/* NEW EMERGENCY RECOVERY TOOL */}
                    <Card className="border-red-500/50 bg-red-900/20">
                        <h2 className="text-lg font-bold text-red-400 tracking-wide mb-2">Аварийное Восстановление Сессии</h2>
                        <p className="text-xs text-red-300/80 mb-3">Нажмите кнопку, чтобы загрузить файл резервной копии .json. Инструмент найдет сессию за выбранную дату и восстановит ее, не меняя статистику игроков.</p>
                        
                        <label className="text-xs text-red-300/80 mb-1 mt-3 block">1. Выберите дату сессии</label>
                        <input
                            type="date"
                            value={recoveryDate}
                            onChange={(e) => setRecoveryDate(e.target.value)}
                            className="w-full p-2 bg-dark-bg rounded-lg border border-red-400/50 focus:ring-2 focus:ring-red-500 focus:outline-none text-sm font-mono"
                        />

                        <Button 
                            onClick={() => fileInputRef.current?.click()} 
                            disabled={isForceSaving} 
                            className="w-full mt-4 !bg-red-600 hover:!bg-red-700 !text-white focus:!ring-red-400"
                        >
                            {isForceSaving ? "Обработка..." : "Upload File & Restore Session"}
                        </Button>
                    </Card>
                </div>
            </div>

            <div className="p-4 shrink-0 space-y-4">
                {/* Admin Button for Promo Config */}
                <div className="grid grid-cols-2 gap-2">
                    <Button 
                        variant="ghost" 
                        onClick={() => navigate('/settings/promo-admin')}
                        className="!py-3 border border-white/5 bg-black/20 hover:bg-white/5 text-dark-text-secondary text-xs tracking-widest uppercase flex items-center justify-center gap-2"
                    >
                        <Wand className="w-4 h-4 opacity-50" /> Promo Config
                    </Button>
                    
                    {/* BUTTON TO PREVIEW WEB SITE (Navigate Internal) */}
                    <Button 
                        variant="ghost" 
                        onClick={() => navigate('/hub')}
                        className="!py-3 border border-emerald-500/20 bg-emerald-900/10 hover:bg-emerald-500/10 text-emerald-400 text-xs tracking-widest uppercase flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(16,185,129,0.1)] rounded-xl font-bold transition-all duration-300"
                    >
                        <ExternalLink className="w-4 h-4" /> Open Web Hub
                    </Button>
                </div>

                <NetworkHud />
                
                <div className="text-center opacity-40 hover:opacity-100 transition-opacity duration-500">
                    <p className="font-orbitron font-bold text-sm tracking-widest text-dark-accent-start">532 PLAYGROUND</p>
                    <p className="text-[10px] text-dark-text-secondary font-mono mt-1">v4.0.0 • SYSTEM READY</p>
                </div>
            </div>
        </div>
    );
};