
import React from 'react';
import { useApp } from '../context';
import { Page, Card, Button, useTranslation } from '../ui';
import { generateDemoData, createShowcasePlayer } from '../services/demo';
import { generateNewsUpdates } from '../services/news';
import { PlayerTier } from '../types';

export const SettingsScreen: React.FC = () => {
    const t = useTranslation();
    const { language, setLanguage, setAllPlayers, setHistory, setNewsFeed } = useApp();
    const [isGenerating, setIsGenerating] = React.useState(false);

    const langClasses = (lang: string) => `px-6 py-2 rounded-full font-bold transition-colors text-lg ${language === lang ? 'gradient-bg text-dark-bg' : 'bg-dark-surface hover:bg-white/10'}`;

    const handleGenerateDemoSession = async () => {
        setIsGenerating(true);
        // Small delay to allow UI to update
        setTimeout(() => {
            const { session, players } = generateDemoData();
            
            // 1. Add Session to History
            setHistory(prev => [session, ...prev]);

            // 2. Add New Players to Database (merging with existing)
            setAllPlayers(prev => [...prev, ...players]);

            // 3. Generate News based on the demo session results
            // Create a "before" snapshot of these players (0 stats) to trigger news generation
            const previousStatePlayers = players.map(p => ({
                ...p,
                totalGoals: 0,
                totalAssists: 0, 
                totalWins: 0,
                totalSessionsPlayed: 0,
                rating: 60, // Baseline
                tier: PlayerTier.Average,
                badges: {}
            }));

            const demoNews = generateNewsUpdates(previousStatePlayers, players);
            setNewsFeed(prev => [...demoNews, ...prev]);

            setIsGenerating(false);
            alert(`Generated Session: "${session.sessionName}" with 16 rounds, 15 new players, and news updates.`);
        }, 100);
    };

    const handleAddShowcasePlayer = () => {
        const player = createShowcasePlayer();
        setAllPlayers(prev => [player, ...prev]);
        alert(`Created Super Player: ${player.nickname}`);
    };
    
    const handleClearNews = () => {
        setNewsFeed([]);
        alert("News feed cleared.");
    }

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

                    {/* Developer Zone */}
                    <Card className="!p-4 border border-dashed border-dark-text-secondary/30 bg-dark-bg/30">
                        <h2 className="text-sm font-bold mb-4 text-center text-dark-text-secondary uppercase tracking-widest">Developer Zone</h2>
                        <div className="space-y-3">
                            <Button 
                                variant="secondary" 
                                onClick={handleGenerateDemoSession} 
                                disabled={isGenerating}
                                className="w-full !text-sm"
                            >
                                {isGenerating ? 'Generating...' : t.generateDemoSession}
                            </Button>
                            <Button 
                                variant="secondary" 
                                onClick={handleAddShowcasePlayer} 
                                className="w-full !text-sm"
                            >
                                {t.createTestPlayer}
                            </Button>
                             <Button 
                                variant="secondary" 
                                onClick={handleClearNews} 
                                className="w-full !text-sm"
                            >
                                {t.clearFeed}
                            </Button>
                        </div>
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
