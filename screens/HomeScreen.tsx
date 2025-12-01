import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context';
import { Page, Button, useTranslation } from '../components';
import { homeScreenBackground } from '../assets';
import { BrandedHeader } from './utils';

export const HomeScreen: React.FC = () => {
  const navigate = useNavigate();
  const t = useTranslation();
  const { activeSession } = useApp();

  const handleContinue = () => {
    if (activeSession) {
      if (activeSession.games && activeSession.games.length > 0) {
        navigate('/match');
      } else {
        navigate('/assign');
      }
    }
  };

  return (
    <Page style={{ backgroundImage: `url("${homeScreenBackground}")`, backgroundSize: 'cover', backgroundPosition: 'center' }}>
        <div className="flex flex-col min-h-[calc(100vh-8rem)] justify-between">
             <BrandedHeader className="mt-12" />

            <div className="flex-grow my-8 space-y-6">
               {/* This space is intentionally left blank as per user request */}
            </div>
            
            <main className="flex flex-col items-center gap-4 w-full mt-auto">
                 {activeSession ? (
                    <Button 
                        variant="secondary"
                        onClick={handleContinue} 
                        className="w-full !text-lg !py-3 shadow-lg shadow-dark-accent-start/20 hover:shadow-dark-accent-start/40"
                    >
                        {t.continueSession}
                    </Button>
                 ) : (
                    <Button 
                        variant="secondary"
                        onClick={() => navigate('/setup')} 
                        className="w-full !text-lg !py-3 shadow-lg shadow-dark-accent-start/20 hover:shadow-dark-accent-start/40"
                    >
                        {t.newSession}
                    </Button>
                 )}
                 <Button variant="secondary" onClick={() => navigate('/player-hub')} className="w-full !text-lg !py-3 shadow-lg shadow-dark-accent-start/20 hover:shadow-dark-accent-start/40">
                    {t.playerHub}
                 </Button>
            </main>
        </div>
    </Page>
  );
};