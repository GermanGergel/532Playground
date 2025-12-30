
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context';
import { Page, Button, useTranslation, Modal } from '../components';
import { homeScreenBackground } from '../assets';
import { BrandedHeader } from './utils';
import { Globe } from '../icons';
import html2canvas from 'html2canvas';

// Standardized QR Icon
const QrIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <rect x="3" y="3" width="7" height="7"></rect>
      <rect x="14" y="3" width="7" height="7"></rect>
      <rect x="14" y="14" width="7" height="7"></rect>
      <path d="M3 14h7v7H3z" />
  </svg>
);

// --- THE NEW MONOLITHIC OBSIDIAN ACCESS PASS ---
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
                backgroundColor: '#05070a', // Solid Black
                backgroundImage: `
                    radial-gradient(circle at 0% 0%, rgba(0, 242, 254, 0.08) 0%, transparent 40%),
                    url("https://www.transparenttextures.com/patterns/carbon-fibre.png")
                `,
                backgroundSize: 'cover, auto',
                overflow: 'hidden',
                borderRadius: '32px',
                fontFamily: '"Chakra Petch", sans-serif',
                color: 'white',
                border: '1px solid rgba(255,255,255,0.1)',
                display: 'flex',
                boxShadow: '0 20px 50px rgba(0,0,0,0.5)'
            }}
        >
            {/* Top Cyan Accent Line */}
            <div style={{ position: 'absolute', top: 0, left: '10%', right: '10%', height: '2px', background: 'linear-gradient(90deg, transparent, #00F2FE, transparent)', opacity: 0.8 }}></div>
            
            {/* Background Branding "532" large watermark */}
            <div style={{ position: 'absolute', bottom: '-40px', left: '-20px', fontSize: '180px', fontWeight: 900, color: 'rgba(255,255,255,0.02)', fontFamily: '"Russo One", sans-serif', letterSpacing: '-0.05em', zIndex: 0 }}>
                532
            </div>

            {/* Left Content Area */}
            <div style={{ flex: 1, padding: '50px 0 50px 60px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', position: 'relative', zIndex: 10 }}>
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '25px' }}>
                        <div style={{ width: '8px', height: '8px', background: '#00F2FE', borderRadius: '50%', boxShadow: '0 0 12px #00F2FE' }}></div>
                        <span style={{ fontSize: '12px', fontWeight: 900, color: '#00F2FE', letterSpacing: '0.4em', textTransform: 'uppercase', opacity: 0.9 }}>
                            CLUB ACCESS GRANTED
                        </span>
                    </div>
                    
                    <div style={{ marginBottom: '10px' }}>
                        <h1 style={{ fontFamily: '"Russo One", sans-serif', fontSize: '72px', lineHeight: '0.8', color: 'white', margin: 0, letterSpacing: '-0.02em' }}>
                            CLUB<br/><span style={{ color: '#00F2FE' }}>HUB</span>
                        </h1>
                    </div>
                    
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontSize: '10px', fontWeight: 'bold', padding: '3px 10px', borderRadius: '6px', background: 'rgba(0, 242, 254, 0.15)', border: '1px solid rgba(0, 242, 254, 0.4)', color: '#00F2FE', letterSpacing: '0.05em' }}>VERIFIED • ACTIVE</span>
                    </div>
                </div>
                
                {/* Integrated Website Branding */}
                <div style={{ borderLeft: '3px solid #00F2FE', paddingLeft: '20px', marginTop: '20px' }}>
                    <p style={{ margin: 0, fontSize: '24px', fontWeight: 900, color: 'white', letterSpacing: '0.05em', fontFamily: '"Russo One", sans-serif' }}>
                        532PLAYGROUND.COM
                    </p>
                    <p style={{ margin: '4px 0 0 0', fontSize: '10px', color: 'rgba(255,255,255,0.4)', letterSpacing: '0.15em', fontWeight: 600 }}>
                        STATISTICS • RANKINGS • MATCH INTEL
                    </p>
                </div>
            </div>

            {/* Right QR Area */}
            <div style={{ width: '240px', background: 'rgba(255,255,255,0.015)', borderLeft: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', position: 'relative', zIndex: 10 }}>
                {/* QR Container - Mimicking a premium sticker */}
                <div style={{ 
                    background: 'white', 
                    padding: '12px', 
                    borderRadius: '24px', 
                    boxShadow: '0 25px 50px -12px rgba(0,0,0,0.9)',
                    transform: 'rotate(1deg) scale(1.05)',
                    border: '4px solid #05070a'
                }}>
                    <img src={qrSrc} alt="Hub QR" style={{ width: '135px', height: '135px', display: 'block' }} />
                </div>
                
                <div style={{ marginTop: '35px', textAlign: 'center' }}>
                    <span style={{ display: 'block', fontSize: '10px', fontWeight: 900, color: 'white', letterSpacing: '0.5em', textTransform: 'uppercase', opacity: 0.4 }}>SCAN TO ENTER</span>
                    <div style={{ marginTop: '8px', height: '1px', width: '40px', background: 'rgba(255,255,255,0.1)', margin: '8px auto' }}></div>
                    <span style={{ display: 'block', fontSize: '9px', fontFamily: 'monospace', color: '#00F2FE', opacity: 0.6 }}>ID_NODE: {(Math.random() * 10000).toFixed(0)}</span>
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
  
  const [qrUrl, setQrUrl] = useState('');
  const [hubUrl, setHubUrl] = useState('');

  useEffect(() => {
      const constructUrl = (path: string) => {
          let baseUrl = window.location.origin;
          return `${baseUrl}${path}`;
      };
      if (isQrModalOpen) setQrUrl(constructUrl('/promo'));
      setHubUrl(constructUrl('/hub'));
  }, [isQrModalOpen]);

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

  const handleShareLink = async (url: string, title: string) => {
      if (navigator.share && navigator.canShare && navigator.canShare({ url })) {
          try {
              await navigator.share({
                  title: '532 Playground',
                  text: title,
                  url: url,
              });
          } catch (err) {
              console.log('Share cancelled');
          }
      } else {
          try {
              await navigator.clipboard.writeText(url);
              alert(t.profileLinkCopied);
          } catch (err) {
              console.error('Failed to copy', err);
          }
      }
  };

  const handleShareHub = async () => {
      if (isGeneratingCard) return;
      setIsGeneratingCard(true);

      const cardElement = document.getElementById('hub-access-card');
      if (!cardElement) {
          handleShareLink(hubUrl, '532 Playground Club Hub');
          setIsGeneratingCard(false);
          return;
      }

      await document.fonts.ready;

      try {
          const canvas = await html2canvas(cardElement, {
              backgroundColor: '#05070a',
              scale: 3, 
              useCORS: true,
              logging: false,
          });

          const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'));
          
          if (blob) {
              const file = new File([blob], '532_Club_Access.png', { type: 'image/png' });
              
              const fullData = {
                  files: [file],
                  title: '532 CLUB HUB ACCESS',
                  text: `🎟️ YOUR DIGITAL ACCESS PASS\n\nRatings, Rankings & Match Intelligence:\n${hubUrl}`,
              };

              try {
                  if (navigator.share && navigator.canShare && navigator.canShare(fullData)) {
                      await navigator.share(fullData);
                  } else {
                      throw new Error("Share API not supported");
                  }
              } catch (shareErr) {
                  const link = document.createElement('a');
                  link.download = '532_Club_Access.png';
                  link.href = canvas.toDataURL();
                  link.click();
                  await navigator.clipboard.writeText(hubUrl);
                  alert("Access Card downloaded! Link copied.");
              }
          }
      } catch (error) {
          console.error("Error generating hub card:", error);
          handleShareLink(hubUrl, '532 Playground Club Hub');
      } finally {
          setIsGeneratingCard(false);
      }
  };

  const promoQrImageSrc = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qrUrl)}&bgcolor=1A1D24&color=00F2FE&qzone=1&ecc=L`;
  const hubQrForCard = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(hubUrl)}&qzone=0&ecc=M`;

  const controlButtonClass = "w-12 h-12 flex items-center justify-center bg-dark-surface/80 rounded-full border shadow-[0_0_15px_rgba(0,242,254,0.2)] active:scale-95 transition-all hover:bg-dark-surface hover:scale-110";

  return (
    <Page style={{ backgroundImage: `url("${homeScreenBackground}")`, backgroundSize: 'cover', backgroundPosition: 'center' }}>
        
        {/* Hidden Access Card for Image Generation */}
        <HubAccessPass url={hubUrl} qrSrc={hubQrForCard} />

        {/* RECRUIT MODAL */}
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
                    <a href={qrUrl} target="_blank" rel="noopener noreferrer">
                        <img src={promoQrImageSrc} alt="Promo QR" className="w-48 h-48 rounded-lg relative z-10 cursor-pointer hover:opacity-90" />
                    </a>
                </div>

                <div className="flex flex-col gap-2 w-full">
                    <Button variant="secondary" onClick={() => handleShareLink(qrUrl, 'Join the club!')} className="w-full shadow-lg shadow-dark-accent-start/20 hover:shadow-dark-accent-start/40">
                        SHARE LINK
                    </Button>
                    <Button variant="secondary" onClick={() => setIsQrModalOpen(false)} className="w-full">
                        CLOSE
                    </Button>
                </div>
            </div>
        </Modal>
        
        <div className="flex flex-col min-h-[calc(100vh-8rem)] justify-between relative">
             <div className="absolute top-4 right-0 z-50 flex flex-row gap-3 items-center">
                 {/* Globe Icon Button -> Now triggers the PREMIUM CARD generation */}
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

                 {/* Recruit Button */}
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
