
import React from 'react';
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
                    
                    {/* Status Indicator */}
                    <Card className="!p-4 border border-white/10">
                        <h3 className="font-bold text-sm text-dark-text-secondary uppercase mb-3 text-center">System Status</h3>
                        <div className="flex flex-col gap-2 text-sm">
                            <div className="flex justify-between items-center">
                                <span>Database Connection</span>
                                {cloudStatus?.connected ? (
                                    <span className="text-green-400 font-bold flex items-center gap-1">
                                        ● Online
                                    </span>
                                ) : (
                                    <span className="text-yellow-500 font-bold flex items-center gap-1">
                                        ○ Local Only
                                    </span>
                                )}
                            </div>
                            {cloudStatus?.connected && (
                                <div className="flex justify-between items-center">
                                    <span>Cloud Sync Status</span>
                                    {cloudStatus.count === allPlayers.length ? (
                                        <span className="text-green-400 font-bold">Synced ({cloudStatus.count})</span>
                                    ) : (
                                        <span className="text-yellow-400 font-bold">
                                            Diff ({allPlayers.length} vs {cloudStatus.count})
                                        </span>
                                    )}
                                </div>
                            )}
                        </div>
                    </Card>

                    <Card className="!p-3 text-center opacity-50">
                        <p className="font-semibold text-sm">{t.appVersion}</p>
                        <p className="text-xs text-dark-text-secondary mt-1">{t.appDescription}</p>
                    </Card>
                </div>
            </div>
        </Page>
    );
};
