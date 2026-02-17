import React from 'react';
import { Page, PageHeader, Button, useTranslation } from '../ui';

export const TournamentListScreen: React.FC = () => {
    const t = useTranslation();

    // Стили кнопок, полностью идентичные тем, что используются на HomeScreen
    const homeButtonStyle = "w-full font-chakra font-bold text-xl tracking-wider !py-4 shadow-lg shadow-dark-accent-start/10 hover:shadow-dark-accent-start/20 border border-white/5 active:scale-[0.98] transition-all";

    return (
        <Page>
            <PageHeader title={t.navTournaments} />
            
            <div className="flex flex-col gap-4 mt-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
                
                {/* 1. АКТИВНЫЕ ТУРНИРЫ */}
                <Button 
                    variant="secondary" 
                    onClick={() => alert("Active Tournaments: Coming Soon")}
                    className={homeButtonStyle}
                >
                    ACTIVE TOURNAMENTS
                </Button>

                {/* 2. СОЗДАТЬ НОВЫЙ ТУРНИР */}
                <Button 
                    variant="secondary" 
                    onClick={() => alert("Create Tournament Wizard: Coming Soon")}
                    className={homeButtonStyle}
                >
                    CREATE NEW TOURNAMENT
                </Button>

                {/* 3. АРХИВ ТУРНИРОВ */}
                <Button 
                    variant="secondary" 
                    onClick={() => alert("Tournament History: Coming Soon")}
                    className={homeButtonStyle}
                >
                    TOURNAMENT ARCHIVE
                </Button>

            </div>
        </Page>
    );
};