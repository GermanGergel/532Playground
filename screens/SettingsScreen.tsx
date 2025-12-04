
import React from 'react';
import { useApp } from '../context';
import { Page, Card, useTranslation, Button } from '../ui';
import { loadPlayersFromDB, isSupabaseConfigured } from '../db';
import { LightbulbIcon } from '../icons';

export const SettingsScreen: React.FC = () => {
    const t = useTranslation();
    const { language, setLanguage, allPlayers } = useApp();
    const [cloudStatus, setCloudStatus] = React.useState<{ status: 'loading' | 'connected' | 'error' | 'local_only', count?: number, message?: string }>({ status: 'loading' });

    React.useEffect(() => {
        const checkConnection = async () => {
            if (!isSupabaseConfigured()) {
                setCloudStatus({ status: 'local_only', message: 'Running in Local Mode (Offline)' });
                return;
            }

            try {
                // Attempt to fetch directly from DB to verify connection and RLS
                const players = await loadPlayersFromDB();
                if (players) {
                    setCloudStatus({ status: 'connected', count: players.length });
                } else {
                    setCloudStatus({ status: 'error', message: 'Connection succeeded but returned no data.' });
                }
            } catch (e: any) {
                setCloudStatus({ status: 'error', message: e.message || 'Unknown connection error' });
            }
        };

        checkConnection();
    }, []);

    const langClasses = (lang: string) => `px-6 py-2 rounded-full font-bold transition-colors text-lg ${language === lang ? 'gradient-bg text-dark-bg' : 'bg-dark-surface hover:bg-white/10'}`;

    return (
        <Page>
            <h1 className="text-2xl font-bold text-center mb-8">{t.settingsTitle}</h1>
            
            <div className="flex flex-col gap-4">
                <div className="space-y-4">
                    <Card 
                        className="shadow-lg shadow-dark-accent-start/20 border border-dark-accent-start/40 !p-4"
                    >
                        <h2 className="text-xl font-bold mb-4 text-center">{t.language}</h2>
                        <div className="flex justify-center gap-4">
                            <button onClick={() => setLanguage('en')} className={langClasses('en')}>EN</button>
                            <button onClick={() => setLanguage('ru')} className={langClasses('ru')}>RU</button>
                            <button onClick={() => setLanguage('vn')} className={langClasses('vn')}>VN</button>
                        </div>
                    </Card>
                    
                    {/* CLOUD DIAGNOSTICS */}
                    <Card className="!p-4 border border-white/10">
                        <h3 className="text-sm font-bold text-dark-text-secondary uppercase mb-2">Database Connection</h3>
                        
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm">Status:</span>
                            <span className={`text-sm font-bold ${
                                cloudStatus.status === 'connected' ? 'text-green-400' : 
                                cloudStatus.status === 'local_only' ? 'text-yellow-400' : 'text-red-400'
                            }`}>
                                {cloudStatus.status === 'connected' ? 'Cloud Active (Supabase)' : 
                                 cloudStatus.status === 'local_only' ? 'Local Only' : 'Connection Failed'}
                            </span>
                        </div>

                        {cloudStatus.status === 'connected' && (
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-sm">Cloud Players Found:</span>
                                <span className="text-sm font-bold">{cloudStatus.count}</span>
                            </div>
                        )}
                         
                        <div className="flex items-center justify-between">
                            <span className="text-sm">Local App Players:</span>
                            <span className="text-sm font-bold">{allPlayers.length}</span>
                        </div>

                        {cloudStatus.status === 'connected' && cloudStatus.count === 0 && allPlayers.length === 0 && (
                            <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                                <div className="flex items-start gap-2">
                                    <LightbulbIcon className="w-5 h-5 text-yellow-400 shrink-0 mt-0.5" />
                                    <div className="text-xs text-yellow-200">
                                        <p className="font-bold mb-1">Database is empty?</p>
                                        <p>If you have data in Supabase but see 0 here, check your <strong>Row Level Security (RLS)</strong> policies in the Supabase Dashboard.</p>
                                        <p className="mt-1 opacity-70">Table "players" needs a policy: <em>Enable read access for all users (anon)</em>.</p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </Card>

                    <Card className="!p-3 text-center">
                        <p className="font-semibold text-sm">{t.appVersion}</p>
                        <p className="text-xs text-dark-text-secondary mt-1">{t.appDescription}</p>
                    </Card>
                </div>
            </div>
        </Page>
    );
};
