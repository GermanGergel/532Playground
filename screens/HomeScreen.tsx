
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context';
import { Page, Button, useTranslation, Modal } from '../components';
import { homeScreenBackground } from '../assets';
import { BrandedHeader } from './utils';
import { Edit3 } from '../icons';

// We use a simple SVG for the QR Icon here to avoid circular dependency if we import from icons
const QrIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
);

export const HomeScreen: React.FC = () => {
  const navigate = useNavigate();
  const t = useTranslation();
  const { activeSession } = useApp();
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  
  // Custom Host for local testing
  const [customHost, setCustomHost] = useState('');
  const [qrUrl, setQrUrl] = useState('');

  // Update QR URL whenever modal opens or custom host changes
  useEffect(() => {
      if (isQrModalOpen) {
          try {
              // 1. Get current Origin (e.g. https://myapp.vercel.app or localhost)
              const origin = window.location.origin;
              
              // 2. Construct the clean URL for BrowserRouter (No /#/)
              let finalUrl = `${origin}/promo`;

              // 3. (Optional) Override host if user provided one for local testing
              if (customHost.trim()) {
                  finalUrl = `http://${customHost.trim()}/promo`; 
              }

              setQrUrl(finalUrl);
          } catch (e) {
              console.error("Invalid URL construction", e);
          }
      }
  }, [isQrModalOpen, customHost]);

  const handleContinue = () => {
    if (activeSession) {
      if (activeSession.games && activeSession.games.length > 0) {
        navigate('/match');
      } else {
        navigate('/assign');
      }
    }
  };

  const handleStartNewSession = () => {
    // Directly navigate to setup, defaulting to Real Training (no test mode param)
    navigate('/setup');
  };

  const handleShareLink = async () => {
      if (navigator.share && navigator.canShare && navigator.canShare({ url: qrUrl })) {
          try {
              await navigator.share({
                  title: '532 Playground',
                  text: 'Join the club!',
                  url: qrUrl,
              });
          } catch (err) {
              console.log('Share cancelled');
          }
      } else {
          try {
              await navigator.clipboard.writeText(qrUrl);
              alert(t.profileLinkCopied);
          } catch (err) {
              console.error('Failed to copy', err);
          }
      }
  };

  // Generate QR Code URL using API
  const qrImageSrc = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qrUrl)}&bgcolor=1A1D24&color=00F2FE&qzone=1&ecc=L`;

  return (
    <Page style={{ backgroundImage: `url("${homeScreenBackground}")`, backgroundSize: 'cover', backgroundPosition: 'center' }}>
        
        {/* QR Code / Recruit Modal */}
        <Modal
            isOpen={isQrModalOpen}
            onClose={() => setIsQrModalOpen(false)}
            size="sm"
            hideCloseButton
            containerClassName="border-2 border-dark-accent-start/50 shadow-[0_0_30px_rgba(0,242,254,0.3)] bg-dark-surface/95 backdrop-blur-xl"
        >
            <div className="flex flex-col items-center gap-4 p-2">
                <div className="text-center">
                    <h2 className="font-russo text-3xl text-white uppercase tracking-wider mb-1">RECRUIT PLAYER</h2>
                    <p className="text-[10px] font-mono text-dark-accent-start tracking-[0.2em]">SCAN TO JOIN THE CLUB</p>
                </div>
                
                {/* QR Display */}
                <div className="p-4 bg-white/5 rounded-2xl border border-white/10 relative group">
                    <div className="absolute inset-0 bg-dark-accent-start/20 blur-xl rounded-full opacity-50 group-hover:opacity-80 transition-opacity"></div>
                    <a href={qrUrl} target="_blank" rel="noopener noreferrer">
                        <img src={qrImageSrc} alt="Promo QR" className="w-48 h-48 rounded-lg relative z-10 cursor-pointer hover:opacity-90" />
                    </a>
                </div>

                <div className="w-full bg-black/40 rounded-lg p-3 border border-white/5">
                    <p className="text-[10px] text-gray-400 text-center mb-1 truncate">
                        Link: {qrUrl}
                    </p>
                </div>

                <div className="flex flex-col gap-2 w-full">
                    <Button variant="secondary" onClick={handleShareLink} className="w-full shadow-lg shadow-dark-accent-start/20 hover:shadow-dark-accent-start/40">
                        SHARE LINK
                    </Button>
                    <Button variant="secondary" onClick={() => setIsQrModalOpen(false)} className="w-full">
                        CLOSE
                    </Button>
                </div>
            </div>
        </Modal>
        
        <div className="flex flex-col min-h-[calc(100vh-8rem)] justify-between relative">
             {/* QR Button Top Right */}
             <button 
                onClick={() => setIsQrModalOpen(true)}
                className="absolute top-4 right-0 p-3 bg-dark-surface/80 rounded-full text-dark-accent-start border border-dark-accent-start/30 shadow-[0_0_15px_rgba(0,242,254,0.2)] active:scale-95 transition-all z-50"
             >
                <QrIcon />
             </button>

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
                        onClick={handleStartNewSession} 
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
