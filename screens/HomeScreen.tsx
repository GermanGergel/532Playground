
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context';
import { Page, Button, useTranslation, Modal } from '../ui';
import { homeScreenBackground } from '../assets';
import { BrandedHeader } from './utils';
import { Globe, Upload, XCircle, QrCode } from '../icons'; 

export const HomeScreen: React.FC = () => {
  const navigate = useNavigate();
  const t = useTranslation();
  const { activeSession } = useApp();
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [hubUrl, setHubUrl] = useState('');

  useEffect(() => {
      const baseUrl = window.location.origin;
      // Using a small query param can help bypass initial social media link cache if testing
      setHubUrl(`${baseUrl}/hub`);
  }, []);

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
    navigate('/setup');
  };

  // UPDATED: Simple URL sharing triggers the rich meta preview in messengers
  const handleShareHub = async () => {
      if (isSharing) return;
      setIsSharing(true);

      const shareData = {
          title: '532 CLUB HUB',
          text: 'Check out the official 532 Playground Club Hub for live statistics and rankings.',
          url: hubUrl,
      };

      try {
          if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
              await navigator.share(shareData);
          } else {
              // Fallback: Copy to clipboard
              await navigator.clipboard.writeText(hubUrl);
              alert("Club Hub link copied to clipboard!");
          }
      } catch (error) {
          console.error("Error sharing hub link:", error);
      } finally {
          setIsSharing(false);
      }
  };

  const promoUrl = `${window.location.origin}/promo`;

  const handleSharePromoLink = async () => {
      const shareData = {
          title: '532 Playground',
          text: 'Join the club:',
          url: promoUrl,
      };

      try {
          if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
              await navigator.share(shareData);
          } else {
              await navigator.clipboard.writeText(promoUrl);
              alert("Link copied!");
          }
      } catch (error) {
          console.error("Error sharing promo link:", error);
      }
  };

  const promoQrImageSrc = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(promoUrl)}&bgcolor=1A1D24&color=00F2FE&qzone=1&ecc=L`;

  const controlButtonClass = "w-12 h-12 flex items-center justify-center bg-dark-surface/80 rounded-full border shadow-[0_0_15px_rgba(0,242,254,0.2)] active:scale-95 transition-all hover:bg-dark-surface hover:scale-110";

  return (
    <Page style={{ backgroundImage: `url("${homeScreenBackground}")`, backgroundSize: 'cover', backgroundPosition: 'center' }}>
        
        {/* Recruit Modal */}
        <Modal
            isOpen={isQrModalOpen}
            onClose={() => setIsQrModalOpen(false)}
            size="sm"
            hideCloseButton
            containerClassName="border-2 border-dark-accent-start/50 shadow-[0_0_30px_rgba(0,242,254,0.3)] bg-dark-surface/95 backdrop-blur-xl"
        >
            <div className="flex flex-col items-center gap-4 p-2 relative">
                <button onClick={() => setIsQrModalOpen(false)} className="absolute top-0 right-0 p-2 text-white/50 hover:text-white"><XCircle className="w-6 h-6"/></button>
                <div className="text-center mt-2">
                    <h2 className="font-russo text-3xl text-white uppercase tracking-wider mb-1">RECRUIT PLAYER</h2>
                    <p className="text-[10px] font-mono text-dark-accent-start tracking-[0.2em]">SCAN TO JOIN THE CLUB</p>
                </div>
                <div className="p-4 bg-white/5 rounded-2xl border border-white/10 relative group">
                    <div className="absolute inset-0 bg-dark-accent-start/20 blur-xl rounded-full opacity-50 group-hover:opacity-80 transition-opacity"></div>
                    <img src={promoQrImageSrc} alt="Promo QR" className="w-48 h-48 rounded-lg relative z-10" />
                </div>
                
                <div className="w-full flex flex-col gap-2 mt-2">
                    <Button 
                        variant="primary" 
                        onClick={handleSharePromoLink} 
                        className="w-full flex items-center justify-center gap-2 !py-3 font-chakra"
                    >
                        <Upload className="w-5 h-5" /> SHARE LINK
                    </Button>
                </div>
            </div>
        </Modal>
        
        <div className="flex flex-col min-h-[calc(100vh-8rem)] justify-between relative">
             <div className="absolute top-4 right-0 z-50 flex flex-row gap-3 items-center">
                 <button 
                    onClick={handleShareHub}
                    disabled={isSharing}
                    className={`${controlButtonClass} text-dark-accent-start border-dark-accent-start/30 ${isSharing ? 'opacity-50 cursor-wait' : ''}`}
                    title="Share Club Hub Access"
                 >
                    {isSharing ? (
                        <div className="w-5 h-5 border-2 border-dark-accent-start border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                        <Globe className="w-6 h-6" />
                    )}
                 </button>
                 <button 
                    onClick={() => setIsQrModalOpen(true)}
                    className={`${controlButtonClass} text-dark-accent-start border-dark-accent-start/30`}
                    title="Recruit Player"
                 >
                    <QrCode className="w-6 h-6" />
                 </button>
             </div>

             <BrandedHeader className="mt-12" />

            <div className="flex-grow flex items-center justify-center"></div>
            
            <main className="flex flex-col items-center gap-4 w-full mt-auto">
                 <Button 
                    variant="secondary" 
                    onClick={() => navigate('/hub')} 
                    className="w-full font-chakra font-bold text-xl tracking-wider !py-3 shadow-lg shadow-dark-accent-start/20 hover:shadow-dark-accent-start/40 border border-dark-accent-start/30"
                 >
                    {t.hubTitle}
                 </Button>

                 {activeSession ? (
                    <Button variant="secondary" onClick={handleContinue} className="w-full font-chakra font-bold text-xl tracking-wider !py-3 shadow-lg shadow-dark-accent-start/20 hover:shadow-dark-accent-start/40">
                        {t.continueSession}
                    </Button>
                 ) : (
                    <Button variant="secondary" onClick={handleStartNewSession} className="w-full font-chakra font-bold text-xl tracking-wider !py-3 shadow-lg shadow-dark-accent-start/20 hover:shadow-dark-accent-start/40">
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
