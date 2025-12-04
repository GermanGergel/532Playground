
import React from 'react';
import { useApp } from '../context';
import { Page, Card, useTranslation } from '../ui';

export const SettingsScreen: React.FC = () => {
    const t = useTranslation();
    const { language, setLanguage } = useApp();

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
                    
                    <Card className="!p-3 text-center">
                        <p className="font-semibold text-sm">{t.appVersion}</p>
                        <p className="text-xs text-dark-text-secondary mt-1">{t.appDescription}</p>
                    </Card>
                </div>
            </div>
        </Page>
    );
};
