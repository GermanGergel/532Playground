


import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context';
import { Page, Button, useTranslation } from '../ui';

export const PlayerHubScreen: React.FC = () => {
    const navigate = useNavigate();
    const t = useTranslation();

    return (
        <Page>
            <div className="flex flex-col h-[calc(100vh-9rem)]">
                <h1 className="text-4xl font-black text-center uppercase text-white mt-10 shrink-0 tracking-wider">
                    {t.playerHub}
                </h1>
                
                <div className="flex-grow flex flex-col justify-center w-full space-y-6">
                    <Button 
                        variant="secondary"
                        onClick={() => navigate('/player-database?status=unconfirmed')} 
                        className="w-full !text-lg !py-5 shadow-lg shadow-dark-accent-start/20 hover:shadow-dark-accent-start/40 border border-dark-accent-start/30"
                    >
                        {t.newPlayerManagement}
                    </Button>
                    <Button 
                        variant="secondary"
                        onClick={() => navigate('/player-database?status=confirmed')} 
                        className="w-full !text-lg !py-5 shadow-lg shadow-dark-accent-start/20 hover:shadow-dark-accent-start/40 border border-dark-accent-start/30"
                    >
                        {t.playerDatabase}
                    </Button>
                    <Button 
                        variant="secondary"
                        onClick={() => navigate('/news-feed')}
                        className="w-full !text-lg !py-5 shadow-lg shadow-dark-accent-start/20 hover:shadow-dark-accent-start/40 border border-dark-accent-start/30"
                    >
                        {t.clubNews}
                    </Button>
                </div>
            </div>
        </Page>
    );
};