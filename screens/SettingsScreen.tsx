
import React from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../context';
import { Card, useTranslation, Button } from '../ui';
import { generateDemoData } from '../services/demo';
import { ChevronLeft } from '../icons';

export const SettingsScreen: React.FC = () => {
    const t = useTranslation();
    const { language, setLanguage, allPlayers, setHistory, setAllPlayers: setGlobalPlayers, setNewsFeed } = useApp();

    const handleGenerateDemo = () => {
        const { session, players: demoPlayers, news } = generateDemoData();
        
        // Add session to history (this will be filtered by db.ts and not saved)
        setHistory(prev => [session, ...prev].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
        
        // Add only new players to global state (will be filtered by db.ts)
        const existingPlayerIds = new Set(allPlayers.map(p => p.id));
        const newDemoPlayers = demoPlayers.filter(p => !existingPlayerIds.has(p.id));

        if (newDemoPlayers.length > 0) {
            setGlobalPlayers(prev => [...prev, ...newDemoPlayers]);
        }

        // Add news to feed (will be filtered by db.ts)
        setNewsFeed(prev => [...news, ...prev].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));

        alert('Demo session, 15 players, and news generated. Check History, Player Hub, and Club News. This data is temporary and will not be saved.');
    };

    const langClasses = (lang: string) => `px-3 py-1 rounded-full font-bold transition-colors text-base ${language === lang ? 'gradient-bg text-dark-bg' : 'bg-dark-surface hover:bg-white/10'}`;

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

                    {/* Compact Card: Developer Tools */}
                    <Card className={`${cardNeonClasses} !p-3`}>
                         <Button variant="ghost" onClick={handleGenerateDemo} className="w-full !justify-center !p-0">
                            <h2 className="font-chakra font-bold text-xl text-white tracking-wider">{t.generateDemoSession}</h2>
                        </Button>
                    </Card>
                </div>
            </div>

            <div className="p-4 shrink-0 space-y-4">
                <div className="text-center opacity-40 hover:opacity-100 transition-opacity duration-500">
                    <p className="font-orbitron font-bold text-sm tracking-widest text-dark-accent-start">532 PLAYGROUND</p>
                    <p className="text-[10px] text-dark-text-secondary font-mono mt-1">v3.0.0 • SYSTEM READY</p>
                </div>
            </div>
        </div>
    );
};
