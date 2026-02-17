
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useApp } from '../context';
import { Card, Button, useTranslation } from '../ui';
import { isSupabaseConfigured, getCloudPlayerCount, savePlayersToDB } from '../db';
import { Wand, Activity, RefreshCw } from '../icons';
import { recalculateHistoricalSession } from '../services/sessionProcessor';

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
    const [isRecalculating, setIsRecalculating] = React.useState(false);
    
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

    const handleRecalculate17Feb = async () => {
        if (isRecalculating) return;
        
        // Поиск сессии за 17.02.2026 (Исправлено с 2025)
        const targetDate = "2026-02-17";
        const session = history.find(s => s.date.includes(targetDate));
        
        if (!session) {
            alert(`Session from 17.02.2026 not found in history.`);
            return;
        }

        if (window.confirm(`Recalculate stats for session: ${session.sessionName}? This will update OVR and totals for all participants.`)) {
            setIsRecalculating(true);
            try {
                const updatedPlayers = recalculateHistoricalSession(session, allPlayers);
                setAllPlayers(updatedPlayers);
                await savePlayersToDB(updatedPlayers);
                alert("Recalculation complete! All players from 17.02.2026 updated.");
            } catch (e) {
                console.error(e);
                alert("Recalculation failed.");
            } finally {
                setIsRecalculating(false);
            }
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

                <div className="pt-6">
                    <h3 className="text-[10px] font-black text-white/30 uppercase tracking-[0.3em] mb-3 ml-1">Maintenance Tools</h3>
                    <Button 
                        variant="secondary" 
                        onClick={handleRecalculate17Feb}
                        disabled={isRecalculating}
                        className="w-full flex items-center justify-center gap-3 !py-4 border border-yellow-500/20 text-yellow-400 hover:bg-yellow-500/10 transition-all"
                    >
                        {isRecalculating ? (
                            <RefreshCw className="w-5 h-5 animate-spin" />
                        ) : (
                            <Activity className="w-5 h-5" />
                        )}
                        <div className="flex flex-col items-start">
                            <span className="text-sm font-black uppercase tracking-wider leading-none">Recalculate 17.02.2026 Session</span>
                            <span className="text-[8px] font-mono text-yellow-500/50 mt-1">FORCE STATISTICS RECOVERY</span>
                        </div>
                    </Button>
                </div>
            </div>

            <div className="p-4 shrink-0 space-y-4">
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
