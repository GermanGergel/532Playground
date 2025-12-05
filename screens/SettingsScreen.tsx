import React from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../context';
import { Page, Card, useTranslation } from '../ui';
import { isSupabaseConfigured, loadPlayersFromDB } from '../db';

export const SettingsScreen: React.FC = () => {
    const t = useTranslation();
    const { language, setLanguage, allPlayers } = useApp();
    const [cloudStatus, setCloudStatus] = React.useState<{ connected: boolean, count: number } | null>(null);

    React.useEffect(() => {
        const checkCloud = async () => {
            if (isSupabaseConfigured()) {
                const cloudPlayers = await loadPlayersFromDB();
                setCloudStatus({
                    connected: true,
                    count: Array.isArray(cloudPlayers) ? cloudPlayers.length : 0
                });
            } else {
                setCloudStatus({ connected: false, count: 0 });
            }
        };
        checkCloud();
    }, []);

    const langClasses = (lang: string) => `px-6 py-1 rounded-full font-bold transition-colors text-lg ${language === lang ? 'gradient-bg text-dark-bg' : 'bg-dark-surface hover:bg-white/10'}`;

    const NetworkHud = () => {
        const isLoading = cloudStatus === null;
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
            <div className={`relative overflow-hidden rounded-xl border ${theme.borderColor}/50 bg-black/60 p-5 shadow-[0_0_20px_${theme.glowColor}] transition-all duration-500`}>
                <div 
                    className="absolute inset-0 opacity-10 pointer-events-none"
                    style={{ 
                        backgroundImage: `linear-gradient(${theme.color} 1px, transparent 1px), linear-gradient(90deg, ${theme.color} 1px, transparent 1px)`,
                        backgroundSize: '20px 20px'
                    }}
                />
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/5 to-transparent h-full w-full animate-pulse pointer-events-none" style={{ animationDuration: '3s' }} />

                <div className="relative z-10 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="relative flex items-center justify-center w-12 h-12">
                            <span className="absolute w-full h-full rounded-full opacity-75 animate-ping" style={{ backgroundColor: theme.color }}></span>
                            <span className="relative w-4 h-4 rounded-full shadow-[0_0_10px_currentColor]" style={{ backgroundColor: theme.color }}></span>
                            <svg className="absolute w-12 h-12 animate-spin" style={{ animationDuration: '4s' }} viewBox="0 0 50 50">
                                <circle cx="25" cy="25" r="23" fill="none" stroke={theme.color} strokeWidth="1" strokeDasharray="30 20" opacity="0.5" />
                            </svg>
                        </div>

                        <div className="flex flex-col">
                            <h3 className="text-[10px] font-bold tracking-[0.2em] text-dark-text-secondary uppercase mb-0.5">
                                DATABASE UPLINK
                            </h3>
                            <div className="flex items-center gap-2">
                                <span className="text-xl font-black italic tracking-wider" style={theme.textStyle}>
                                    {isLoading ? 'CONNECTING...' : isOnline ? 'SYSTEM ONLINE' : 'LOCAL MODE'}
                                </span>
                            </div>
                        </div>
                    </div>
                    <div className="text-right">
                        <div className="flex flex-col items-end">
                            <span className="text-[9px] text-dark-text-secondary font-mono">
                                {isLoading ? 'AWAITING' : isOnline ? 'SYNC STATUS' : 'OFFLINE'}
                            </span>
                            <div className="flex items-baseline gap-1">
                                {(isLoading || !isOnline) ? (
                                     <span className="text-lg font-bold font-mono" style={{color: theme.color}}>--</span>
                                ) : (
                                    <>
                                        <span className="text-2xl font-bold font-mono text-white">
                                            {cloudStatus?.count}
                                        </span>
                                        <span className="text-[9px] text-dark-text-secondary font-bold">/ {allPlayers.length}</span>
                                    </>
                                )}
                            </div>
                            {isOnline && cloudStatus?.count !== allPlayers.length && (
                                <span className="text-[9px] font-bold animate-pulse" style={{ color: onlineTheme.color }}>
                                    SYNCING...
                                </span>
                            )}
                        </div>
                    </div>
                </div>
                <div className="absolute bottom-0 left-0 w-8 h-1 bg-white/20"></div>
                <div className="absolute top-0 right-0 w-8 h-1 bg-white/20"></div>
            </div>
        );
    };

    const cardNeonClasses = "shadow-lg shadow-dark-accent-start/20 border border-dark-accent-start/40 !p-4 bg-dark-surface/80 hover:bg-dark-surface/100 transition-all duration-300";

    return (
        <Page>
            <div className="flex flex-col justify-between min-h-[calc(100vh-8rem)]">
                {/* Top content */}
                <div>
                    <h1 className="text-2xl font-bold text-center mb-8">{t.settingsTitle}</h1>
                    <div>
                        <Card className={`${cardNeonClasses} mb-4`}>
                            <h2 className="text-xl font-bold mb-4 text-center text-white tracking-wide">{t.language}</h2>
                            <div className="flex justify-center gap-4">
                                <button onClick={() => setLanguage('en')} className={langClasses('en')}>EN</button>
                                <button onClick={() => setLanguage('ru')} className={langClasses('ru')}>RU</button>
                                <button onClick={() => setLanguage('vn')} className={langClasses('vn')}>VN</button>
                            </div>
                        </Card>
                        
                        <Link to="/settings/voice">
                            <Card className={cardNeonClasses}>
                                <div className="flex justify-between items-center">
                                    <div>
                                        <h2 className="text-xl font-bold text-white tracking-wide">{t.voiceAssistant}</h2>
                                        <p className="text-xs text-dark-text-secondary">{t.voiceAssistantDesc}</p>
                                    </div>
                                </div>
                            </Card>
                        </Link>
                    </div>
                </div>

                {/* Bottom content */}
                <div className="space-y-4">
                    <NetworkHud />
                    <div className="text-center opacity-40 hover:opacity-100 transition-opacity duration-500">
                        <p className="font-orbitron font-bold text-sm tracking-widest text-dark-accent-start">532 PLAYGROUND</p>
                        <p className="text-[10px] text-dark-text-secondary font-mono mt-1">v2.0.0 • SYSTEM READY</p>
                    </div>
                </div>
            </div>
        </Page>
    );
};