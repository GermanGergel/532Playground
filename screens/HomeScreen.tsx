import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context';
import { Page, Button, useTranslation, Modal } from '../components';
import { homeScreenBackground } from '../assets';
import { BrandedHeader } from './utils';

export const HomeScreen: React.FC = () => {
  const navigate = useNavigate();
  const t = useTranslation();
  const { activeSession } = useApp();
  const [isModeModalOpen, setIsModeModalOpen] = React.useState(false);

  const handleContinue = () => {
    if (activeSession) {
      if (activeSession.games && activeSession.games.length > 0) {
        navigate('/match');
      } else {
        navigate('/assign');
      }
    }
  };

  const handleStartNewSession = (isTest: boolean) => {
    setIsModeModalOpen(false);
    navigate(`/setup?testMode=${isTest}`);
  };

  return (
    <Page style={{ backgroundImage: `url("${homeScreenBackground}")`, backgroundSize: 'cover', backgroundPosition: 'center' }}>
        <Modal 
          isOpen={isModeModalOpen} 
          onClose={() => setIsModeModalOpen(false)}
          size="xs"
          containerClassName="border border-dark-accent-start/30 shadow-[0_0_20px_rgba(0,242,254,0.15)]"
        >
          <h2 className="text-xl font-bold text-center mb-4">{t.selectSessionMode}</h2>
          <div className="flex flex-col gap-3">
              <Button 
                variant="secondary"
                onClick={() => handleStartNewSession(false)} 
                className="w-full font-chakra font-bold text-xl tracking-wider !py-3 shadow-lg shadow-dark-accent-start/20 hover:shadow-dark-accent-start/40"
              >
                  {t.realTraining}
              </Button>
              <Button 
                variant="secondary"
                onClick={() => handleStartNewSession(true)} 
                className="w-full font-chakra font-bold text-xl tracking-wider !py-3 shadow-lg shadow-red-500/20 hover:shadow-red-500/40"
              >
                  {t.testGame}
              </Button>
          </div>
        </Modal>
        
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
                        className="w-full font-chakra font-bold text-xl tracking-wider !py-3 shadow-lg shadow-dark-accent-start/20 hover:shadow-dark-accent-start/40"
                    >
                        {t.continueSession}
                    </Button>
                 ) : (
                    <Button 
                        variant="secondary"
                        onClick={() => setIsModeModalOpen(true)} 
                        className="w-full font-chakra font-bold text-xl tracking-wider !py-3 shadow-lg shadow-dark-accent-start/20 hover:shadow-dark-accent-start/40"
                    >
                        {t.newSession}
                    </Button>
                 )}
                 <Button variant="secondary" onClick={() => navigate('/player-hub')} className="w-full font-chakra font-bold text-xl tracking-wider !py-3 shadow-lg shadow-dark-accent-start/20 hover:shadow-dark-accent-start/40">
                    {t.playerHub}
                 </Button>
                 <Button variant="secondary" onClick={() => navigate('/announcement')} className="w-full font-chakra font-bold text-xl tracking-wider !py-3 shadow-lg shadow-dark-accent-start/20 hover:shadow-dark-accent-start/40">
                    {t.createAnnouncement}
                 </Button>
            </main>
        </div>
    </Page>
  );
};