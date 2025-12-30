import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context';
import { Page, Button, useTranslation, Modal } from '../components';
import { homeScreenBackground } from '../assets';
import { BrandedHeader } from './utils';
import { Globe } from '../icons'; // Import the new Globe icon
import html2canvas from 'html2canvas';

// Standardized QR Icon to match other icons structure
const QrIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <rect x="3" y="3" width="7" height="7"></rect>
      <rect x="14" y="3" width="7" height="7"></rect>
      <rect x="14" y="14" width="7" height="7"></rect>
      <path d="M3 14h7v7H3z" /> {/* Simplified path for the last rect to match style */}
  </svg>
);

// --- DIGITAL ACCESS PASS COMPONENT (Hidden for Export) ---
const HubAccessPass: React.FC<{ url: string; qrSrc: string }> = ({ url, qrSrc }) => {
    // Extract a cleaner display URL (e.g., just the domain) for visuals
    const displayUrl = "532PLAYGROUND.COM"; 

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
                backgroundColor: '#0a0c10',
                backgroundImage: `
                    radial-gradient(circle at 100% 0%, #1e293b 0%, transparent 50%),
                    radial-gradient(circle at 0% 100%, #00F2FE10 0%, transparent 50%),
                    url("https://www.transparenttextures.com/patterns/carbon-fibre.png")
                `,
                backgroundSize: 'cover, cover, auto',
                overflow: 'hidden',
                borderRadius: '24px',
                fontFamily: '"Chakra Petch", sans-serif',
                color: 'white',
                border: '1px solid #334155'
            }}
        >
            {/* Design Elements */}
            <div style={{ position: 'absolute', top: '30px', right: '30px', width: '100px', height: '100px', background: '#00F2FE', filter: 'blur(80px)', opacity: 0.2 }}></div>
            
            {/* Strip */}
            <div style={{ position: 'absolute', left: '40px', top: '0', bottom: '0', width: '2px', background: 'linear-gradient(to bottom, transparent, #00F2FE, transparent)', opacity: 0.5 }}></div>

            <div style={{ display: 'flex', height: '100%', padding: '40px 40px 40px 70px', position: 'relative', zIndex: 10 }}>
                {/* Left Side: Branding */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                            <div style={{ width: '8px', height: '8px', background: '#00F2FE', borderRadius: '50%', boxShadow: '0 0 10px #00F2FE' }}></div>
                            <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#94a3b8', letterSpacing: '0.2em', textTransform: 'uppercase' }}>
                                OFFICIAL CLUB HUB
                            </span>
                        </div>
                        
                        <h1 style={{ fontFamily: '"Russo One", sans-serif', fontSize: '56px', lineHeight: '0.9', color: 'white', margin: 0, textShadow: '0 10px 30px rgba(0,0,0,0.5)' }}>
                            ACCESS<br/><span style={{ color: '#00F2FE' }}>GRANTED</span>
                        </h1>
                    </div>
                    
                    <div>
                        <p style={{ margin: 0, fontSize: '14px', color: '#64748b', fontFamily: 'monospace', letterSpacing: '0.1em' }}>
                            ID: {Math.floor(Math.random() * 1000000).toString(16).toUpperCase()}
                        </p>
                        <p style={{ margin: '5px 0 0 0', fontSize: '16px', fontWeight: 'bold', color: 'white', letterSpacing: '0.1em' }}>
                            {displayUrl}
                        </p>
                    </div>
                </div>

                {/* Right Side: QR Card */}
                <div style={{ width: '160px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ 
                        background: 'white', 
                        padding: '12px', 
                        borderRadius: '16px', 
                        boxShadow: '0 20px 40px -10px rgba(0,0,0,0.5)'
                    }}>
                        <img src={qrSrc} alt="Hub QR" style={{ width: '136px', height: '136px', display: 'block' }} />
                    </div>
                    <div style={{ marginTop: '16px', textAlign: 'center' }}>
                        <span style={{ display: 'block', fontSize: '10px', fontWeight: 'bold', color: '#00F2FE', letterSpacing: '0.2em', textTransform: 'uppercase' }}>SCAN TO ENTER</span>
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
  
  // Custom Host for local testing
  const [customHost, setCustomHost] = useState('');
  const [qrUrl, setQrUrl] = useState('');
  const [hubUrl, setHubUrl] = useState('');

  // Update QR URLs whenever modals open
  useEffect(() => {
      const constructUrl = (path: string) => {
          try {
              // Robust way to get the base URL without duplication issues
              // window.location.href gives the full current URL. We split at '#' to get the base.
              let baseUrl = window.location.href.split('#')[0];
              
              // Ensure no trailing slash to avoid double slashes with the hash
              if (baseUrl.endsWith('/')) {
                  baseUrl = baseUrl.slice(0, -1);
              }

              // Reconstruct with HashRouter pattern
              let finalUrl = `${baseUrl}/#${path}`;
              
              if (customHost.trim()) {
                  finalUrl = `http://${customHost.trim()}/#${path}`; 
              }
              return finalUrl;
          } catch (e) {
              console.error("Invalid URL construction", e);
              return '';
          }
      };

      if (isQrModalOpen) {
          setQrUrl(constructUrl('/promo'));
      }
      // Always keep hub URL ready
      setHubUrl(constructUrl('/hub'));
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
    // Directly navigate to setup, defaulting to Real Training
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
          console.error("Hub Access Card element not found");
          handleShareLink(hubUrl, '532 Playground Club Hub');
          setIsGeneratingCard(false);
          return;
      }

      // Ensure fonts are loaded
      await document.fonts.ready;
      await new Promise(resolve => setTimeout(resolve, 200));

      try {
          const canvas = await html2canvas(cardElement, {
              backgroundColor: '#0a0c10',
              scale: 2, 
              useCORS: true,
              logging: false,
          });

          const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'));
          
          if (blob) {
              const file = new File([blob], '532_Access_Pass.png', { type: 'image/png' });
              
              // Explicitly putting the link in the TEXT field so it appears in the caption
              const fullData = {
                  files: [file],
                  title: '532 Club Access',
                  text: `🎟️ 532 CLUB HUB ACCESS\n\nTap to enter / Нажмите, để vào:\n${hubUrl}`,
              };

              try {
                  // Attempt share
                  if (navigator.share && navigator.canShare && navigator.canShare(fullData)) {
                      await navigator.share(fullData);
                  } else {
                      throw new Error("Share API not fully supported");
                  }
              } catch (shareErr) {
                  // Fallback for desktop/unsupported browsers: download the image
                  const link = document.createElement('a');
                  link.download = '532_Access_Pass.png';
                  link.href = canvas.toDataURL();
                  link.click();
                  
                  // Also copy link as backup
                  await navigator.clipboard.writeText(hubUrl);
                  alert("Access Pass downloaded! Link copied to clipboard.");
              }
          }
      } catch (error) {
          console.error("Error generating hub card:", error);
          handleShareLink(hubUrl, '532 Playground Club Hub');
      } finally {
          setIsGeneratingCard(false);
      }
  };

  // Generate QR Code URLs using API
  const promoQrImageSrc = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qrUrl)}&bgcolor=1A1D24&color=00F2FE&qzone=1&ecc=L`;
  // Use high-contrast QR for the generated card (White background for better scanning)
  const hubQrForCard = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(hubUrl)}&qzone=0&ecc=M`;

  // Unified button style for top-right controls
  const controlButtonClass = "w-12 h-12 flex items-center justify-center bg-dark-surface/80 rounded-full border shadow-[0_0_15px_rgba(0,242,254,0.2)] active:scale-95 transition-all hover:bg-dark-surface hover:scale-110";

  return (
    <Page style={{ backgroundImage: `url("${homeScreenBackground}")`, backgroundSize: 'cover', backgroundPosition: 'center' }}>
        
        {/* Hidden Access Card for Generation */}
        <HubAccessPass url={hubUrl} qrSrc={hubQrForCard} />

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
                
                <div className="p-4 bg-white/5 rounded-2xl border border-white/10 relative group">
                    <div className="absolute inset-0 bg-dark-accent-start/20 blur-xl rounded-full opacity-50 group-hover:opacity-80 transition-opacity"></div>
                    <a href={qrUrl} target="_blank" rel="noopener noreferrer">
                        <img src={promoQrImageSrc} alt="Promo QR" className="w-48 h-48 rounded-lg relative z-10 cursor-pointer hover:opacity-90" />
                    </a>
                </div>

                <div className="w-full bg-black/40 rounded-lg p-3 border border-white/5">
                    <p className="text-[10px] text-gray-400 text-center mb-1 truncate">
                        Link: {qrUrl}
                    </p>
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
             {/* Top Right Controls Container */}
             <div className="absolute top-4 right-0 z-50 flex flex-row gap-3 items-center">
                 {/* Globe Button (Public Hub) - DIRECT SHARE GENERATION */}
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

                 {/* QR Button (Recruit) */}
                 <button 
                    onClick={() => setIsQrModalOpen(true)}
                    className={`${controlButtonClass} text-dark-accent-start border-dark-accent-start/30`}
                    title="Recruit Player"
                 >
                    <QrIcon className="w-6 h-6" />
                 </button>
             </div>

             <BrandedHeader className="mt-12" />

            <div className="flex-grow flex items-center justify-center">
               {/* Empty center space */}
            </div>
            
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