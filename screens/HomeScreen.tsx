
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context';
import { Page, Button, useTranslation, Modal } from '../components';
import { homeScreenBackground } from '../assets';
import { BrandedHeader } from './utils';
import { Globe } from '../icons'; 
import html2canvas from 'html2canvas';

const QrIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <rect x="3" y="3" width="7" height="7"></rect>
      <rect x="14" y="3" width="7" height="7"></rect>
      <rect x="14" y="14" width="7" height="7"></rect>
      <path d="M3 14h7v7H3z" />
  </svg>
);

// --- PREMIUM DIGITAL ACCESS PASS (Generated for Sharing) ---
const HubAccessPass: React.FC<{ url: string; qrSrc: string }> = ({ url, qrSrc }) => {
    return (
        <div 
            id="hub-access-card"
            style={{
                width: '600px',
                height: '340px',
                position: 'fixed',
                top: 0,
                left: '-9999px',
                zIndex: -10,
                backgroundColor: '#05070a',
                backgroundImage: `
                    radial-gradient(circle at 90% 10%, #00F2FE15 0%, transparent 40%),
                    radial-gradient(circle at 10% 90%, #00F2FE10 0%, transparent 40%),
                    url("https://www.transparenttextures.com/patterns/carbon-fibre.png")
                `,
                backgroundSize: 'cover, cover, auto',
                overflow: 'hidden',
                borderRadius: '32px',
                fontFamily: '"Chakra Petch", sans-serif',
                color: 'white',
                border: '1px solid rgba(0, 242, 254, 0.2)',
                display: 'flex'
            }}
        >
            {/* Cyber Decorative Elements */}
            <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '2px', background: 'linear-gradient(90deg, transparent, #00F2FE, transparent)', opacity: 0.5 }}></div>
            <div style={{ position: 'absolute', bottom: 0, left: 0, width: '100%', height: '2px', background: 'linear-gradient(90deg, transparent, #00F2FE, transparent)', opacity: 0.3 }}></div>

            <div style={{ display: 'flex', width: '100%', height: '100%', padding: '45px 50px', position: 'relative', zIndex: 10 }}>
                {/* Left Side: Auth Status & Branding */}
                <div style={{ flex: 1.2, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
                            <div style={{ width: '10px', height: '10px', background: '#00F2FE', borderRadius: '2px', boxShadow: '0 0 15px #00F2FE' }}></div>
                            <span style={{ fontSize: '12px', fontWeight: '900', color: '#94a3b8', letterSpacing: '0.4em', textTransform: 'uppercase' }}>
                                OFFICIAL CLUB HUB
                            </span>
                        </div>
                        
                        <h1 style={{ fontFamily: '"Russo One", sans-serif', fontSize: '64px', lineHeight: '0.85', color: 'white', margin: 0, letterSpacing: '-0.02em' }}>
                            ACCESS<br/><span style={{ color: '#00F2FE', textShadow: '0 0 30px rgba(0, 242, 254, 0.3)' }}>GRANTED</span>
                        </h1>
                    </div>
                    
                    <div style={{ borderLeft: '2px solid rgba(0, 242, 254, 0.3)', paddingLeft: '20px' }}>
                        <p style={{ margin: 0, fontSize: '14px', color: '#475569', fontWeight: 'bold', fontFamily: 'monospace', letterSpacing: '0.2em' }}>
                            ID: {Math.floor(Math.random() * 99999).toString().padStart(5, '0')}
                        </p>
                        <p style={{ margin: '4px 0 0 0', fontSize: '20px', fontWeight: '900', color: 'white', letterSpacing: '0.1em' }}>
                            532PLAYGROUND.COM
                        </p>
                    </div>
                </div>

                {/* Right Side: QR Verification */}
                <div style={{ flex: 0.8, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'center' }}>
                    <div style={{ 
                        background: 'white', 
                        padding: '10px', 
                        borderRadius: '16px', 
                        boxShadow: '0 0 40px rgba(0, 242, 254, 0.2)',
                        border: '4px solid #00F2FE'
                    }}>
                        <img src={qrSrc} alt="Hub QR" style={{ width: '150px', height: '150px', display: 'block' }} />
                    </div>
                    <div style={{ marginTop: '20px', width: '150px', textAlign: 'center' }}>
                        <span style={{ display: 'block', fontSize: '9px', fontWeight: '900', color: '#00F2FE', letterSpacing: '0.3em', textTransform: 'uppercase' }}>SCAN TO ENTER</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export const HomeScreen: React.FC = () => {
  const navigate = useNavigate();
  const t = useTranslation();
  const { activeSession } = useApp();
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [isGeneratingCard, setIsGeneratingCard] = useState(false);
  const [hubUrl, setHubUrl] = useState('');

  useEffect(() => {
      const baseUrl = window.location.origin;
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

  const handleShareHub = async () => {
      if (isGeneratingCard) return;
      setIsGeneratingCard(true);

      const cardElement = document.getElementById('hub-access-card');
      if (!cardElement) {
          setIsGeneratingCard(false);
          return;
      }

      await document.fonts.ready;

      try {
          const canvas = await html2canvas(cardElement, {
              backgroundColor: '#05070a',
              scale: 2, 
              useCORS: true,
              logging: false,
          });

          const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png', 0.9));
          
          if (blob) {
              const file = new File([blob], '532_Access_Pass.png', { type: 'image/png' });
              
              // КЛЮЧЕВОЕ ИЗМЕНЕНИЕ: Не отправляем title, чтобы мессенджер не плодил заголовки.
              // Отправляем файл и текст как подпись (caption) к нему.
              const shareData = {
                  files: [file],
                  text: `🎟️ 532 CLUB HUB ACCESS\n\nTap to enter / Нажмите, чтобы войти:\n${hubUrl}`,
              };

              if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
                  await navigator.share(shareData);
              } else {
                  const link = document.createElement('a');
                  link.download = '532_Access_Pass.png';
                  link.href = canvas.toDataURL();
                  link.click();
                  await navigator.clipboard.writeText(hubUrl);
                  alert("Access Pass downloaded! Link copied to clipboard.");
              }
          }
      } catch (error) {
          console.error("Error sharing:", error);
      } finally {
          setIsGeneratingCard(false);
      }
  };

  const promoUrl = `${window.location.origin}/promo`;
  const promoQrImageSrc = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(promoUrl)}&bgcolor=1A1D24&color=00F2FE&qzone=1&ecc=L`;
  const hubQrForCard = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(hubUrl)}&qzone=0&ecc=M`;

  const controlButtonClass = "w-12 h-12 flex items-center justify-center bg-dark-surface/80 rounded-full border shadow-[0_0_15px_rgba(0,242,254,0.2)] active:scale-95 transition-all hover:bg-dark-surface hover:scale-110";

  return (
    <Page style={{ backgroundImage: `url("${homeScreenBackground}")`, backgroundSize: 'cover', backgroundPosition: 'center' }}>
        
        {/* Hidden Access Card for Generation */}
        <HubAccessPass url={hubUrl} qrSrc={hubQrForCard} />

        {/* Recruit Modal */}
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
                <div className="p-4 bg-white/5 rounded-2xl border border-white/10 relative group">
                    <div className="absolute inset-0 bg-dark-accent-start/20 blur-xl rounded-full opacity-50 group-hover:opacity-80 transition-opacity"></div>
                    <img src={promoQrImageSrc} alt="Promo QR" className="w-48 h-48 rounded-lg relative z-10" />
                </div>
                <Button variant="secondary" onClick={() => setIsQrModalOpen(false)} className="w-full">CLOSE</Button>
            </div>
        </Modal>
        
        <div className="flex flex-col min-h-[calc(100vh-8rem)] justify-between relative">
             <div className="absolute top-4 right-0 z-50 flex flex-row gap-3 items-center">
                 <button 
                    onClick={handleShareHub}
                    disabled={isGeneratingCard}
                    className={`${controlButtonClass} text-dark-accent-start border-dark-accent-start/30 ${isGeneratingCard ? 'opacity-50 cursor-wait' : ''}`}
                    title="Share Club Hub Access"
                 >
                    {isGeneratingCard ? (
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
                    <QrIcon className="w-6 h-6" />
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
