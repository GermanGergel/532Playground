
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context';
import { Button, useTranslation, Modal } from '../ui';
import { homeScreenBackground } from '../assets';
import { Globe, QrCode } from '../icons'; 
import html2canvas from 'html2canvas';

export const HomeScreen: React.FC = () => {
  const navigate = useNavigate();
  const t = useTranslation();
  const { activeSession } = useApp();
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [hubUrl, setHubUrl] = useState('');
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  
  const promoCardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
      const baseUrl = window.location.origin;
      setHubUrl(`${baseUrl}/hub`);
  }, []);

  const promoUrl = `${window.location.origin}/promo`;

  useEffect(() => {
      if (isQrModalOpen) {
          const generateQrCode = async () => {
              try {
                  const response = await fetch(`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(promoUrl)}&bgcolor=1A1D24&color=00F2FE&qzone=1&ecc=H`);
                  if (!response.ok) throw new Error('Failed to fetch QR code');
                  const blob = await response.blob();
                  const reader = new FileReader();
                  reader.onloadend = () => {
                      setQrCodeDataUrl(reader.result as string);
                  };
                  reader.readAsDataURL(blob);
              } catch (error) {
                  console.error("QR code generation failed:", error);
              }
          };
          generateQrCode();
      }
  }, [isQrModalOpen, promoUrl]);

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
      if (isSharing) return;
      setIsSharing(true);
      const shareData = {
          title: 'UNIT HUB',
          text: 'Check live stats, rankings, and match intelligence on UNIT.',
          url: hubUrl,
      };
      try {
          const canShare = navigator.share && typeof navigator.canShare === 'function' && navigator.canShare(shareData);
          if (canShare) {
              await navigator.share(shareData);
          } else {
              await navigator.clipboard.writeText(hubUrl);
              alert("UNIT Hub link copied to clipboard!");
          }
      } catch (error: any) {
          if (error.name !== 'AbortError') {
              console.error("Error sharing hub link:", error);
          }
      } finally {
          setIsSharing(false);
      }
  };

  const handleSharePromoCard = async () => {
      if (!promoCardRef.current || isGenerating) return;
      setIsGenerating(true);
      try {
          const canvas = await html2canvas(promoCardRef.current, { 
              backgroundColor: '#1A1D24',
              scale: 3, 
              useCORS: true 
          });
          
          const blob = await new Promise<Blob|null>(resolve => canvas.toBlob(resolve, 'image/png'));
          if (!blob) throw new Error("Blob creation failed");
  
          const filename = `UNIT_Access_Card.png`;
          const file = new File([blob], filename, { type: 'image/png' });

          const shareData = {
              files: [file],
              title: `UNIT // ACCESS`,
              text: `Join the project: ${promoUrl}`
          };

          const canShare = navigator.share && typeof navigator.canShare === 'function' && navigator.canShare(shareData);

          if (canShare) {
              await navigator.share(shareData);
          } else {
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = filename;
              a.click();
              URL.revokeObjectURL(url);
              await navigator.clipboard.writeText(promoUrl);
              alert("Card downloaded and link copied to clipboard!");
          }
      } catch (error: any) {
          if (error.name !== 'AbortError') {
              console.error("Sharing error:", error);
          }
      } finally {
          setIsGenerating(false);
          setIsQrModalOpen(false);
      }
  };

  const controlButtonClass = "w-11 h-11 flex items-center justify-center bg-white/[0.03] backdrop-blur-md rounded-full border border-white/10 shadow-lg active:scale-95 transition-all hover:bg-white/10 hover:border-white/20";

  return (
    <div 
        className="w-full h-full flex flex-col justify-between overflow-hidden"
        style={{ 
            backgroundImage: `url("${homeScreenBackground}")`, 
            backgroundSize: 'cover', 
            backgroundPosition: 'center' 
        }}
    >
        <Modal
            isOpen={isQrModalOpen}
            onClose={() => setIsQrModalOpen(false)}
            size="xs"
            hideCloseButton
            containerClassName="!p-4 !bg-dark-bg border border-[#00F2FE]/20"
        >
            <div className="flex flex-col items-center gap-6">
                <div 
                    ref={promoCardRef} 
                    className="w-full bg-[#1A1D24] rounded-[2rem] p-6 flex flex-col items-center gap-6 border border-[#00F2FE]/30 shadow-[0_0_30px_rgba(0,242,254,0.15)]"
                >
                    <div className="text-center">
                        <h1 className="font-russo text-4xl italic text-white" style={{ textShadow: '0 0 10px rgba(0, 242, 254, 0.4)' }}>
                            UNIT
                        </h1>
                        <p className="text-[9px] font-black tracking-[0.4em] text-white/40 mt-2 uppercase">
                            OFFICIAL ACCESS CARD
                        </p>
                    </div>
                    
                    <div className="text-center space-y-1">
                        <h2 className="font-russo text-2xl text-white uppercase tracking-tight leading-none">
                            RECRUIT CARD
                        </h2>
                        <p className="text-[10px] font-bold text-[#00F2FE] tracking-[0.1em] uppercase opacity-70">
                            Authorized Entry Only
                        </p>
                    </div>

                    <div className="p-3 rounded-2xl bg-gradient-to-br from-[#00F2FE] to-[#4CFF5F] shadow-[0_0_20px_rgba(0,242,254,0.3)]">
                        <div className="bg-[#1A1D24] p-2 rounded-xl">
                            {qrCodeDataUrl ? (
                                <img src={qrCodeDataUrl} alt="QR Code" className="w-32 h-32" />
                            ) : (
                                <div className="w-32 h-32 flex items-center justify-center">
                                    <div className="w-8 h-8 border-2 border-dashed border-[#00F2FE] rounded-full animate-spin"></div>
                                </div>
                            )}
                        </div>
                    </div>

                    <p className="text-[10px] font-bold tracking-[0.2em] text-[#00F2FE] animate-pulse uppercase">
                        SCAN TO JOIN THE UNIT
                    </p>
                </div>

                <div className="w-full flex flex-col gap-3">
                    <Button 
                        variant="primary" 
                        onClick={handleSharePromoCard} 
                        disabled={isGenerating}
                        className="w-full !py-4 !text-lg font-chakra font-black tracking-widest uppercase shadow-[0_0_20px_rgba(0,242,254,0.4)]"
                    >
                        {isGenerating ? "GENERATING..." : "SEND PROMO CARD"}
                    </Button>
                    
                    <Button 
                        variant="ghost" 
                        onClick={() => setIsQrModalOpen(false)} 
                        className="w-full !py-2 !text-xs font-chakra font-bold text-white/30 uppercase tracking-widest"
                    >
                        {t.cancel}
                    </Button>
                </div>
            </div>
        </Modal>
        
        {/* --- TOP SECTION (HEADER + CONTROLS) --- */}
        {/* Increased padding-top to ensure logo is below the notch */}
        <div className="flex-none pt-14 px-4 z-10">
             <div className="flex flex-row justify-between items-start w-full">
                 <div className="flex flex-col items-start relative select-none pointer-events-none">
                    <div className="absolute -inset-4 bg-black/10 rounded-full blur-[40px] pointer-events-none"></div>
                    <div className="flex flex-col relative z-10">
                        <h1 
                            className="text-7xl font-black uppercase leading-[0.8] font-russo tracking-[0.15em]" 
                            style={{ 
                                background: 'linear-gradient(180deg, #48CFCB 0%, #083344 100%)',
                                WebkitBackgroundClip: 'text',
                                WebkitTextFillColor: 'transparent',
                                filter: `
                                    drop-shadow(1px 1px 0px #0E7490) 
                                    drop-shadow(2px 2px 0px #000000) 
                                    drop-shadow(4px 10px 15px rgba(0, 0, 0, 0.8))
                                `,
                            }}
                        >
                            UNIT
                        </h1>
                        <div className="flex items-center gap-2 mt-3 opacity-20">
                            <div className="h-[1.5px] w-6 bg-white rounded-full"></div>
                            <span className="text-[11px] font-bold text-white tracking-[0.3em] uppercase font-chakra">
                                Level Up Together
                            </span>
                        </div>
                    </div>
                 </div>
                 
                 <div className="flex flex-row gap-3 pointer-events-auto pt-2">
                    <button 
                        onClick={handleShareHub}
                        disabled={isSharing}
                        className={`${controlButtonClass} text-white/80 hover:text-[#00D2D2] transition-colors ${isSharing ? 'opacity-50 cursor-wait' : ''}`}
                        title="Share Unit Hub Access"
                    >
                        {isSharing ? (
                            <div className="w-5 h-5 border-2 border-[#00D2D2] border-t-transparent rounded-full animate-spin"></div>
                        ) : (
                            <Globe className="w-5 h-5" />
                        )}
                    </button>
                    <button 
                        onClick={() => setIsQrModalOpen(true)}
                        className={`${controlButtonClass} text-white/80 hover:text-[#00D2D2] transition-colors`}
                        title="Recruit Player"
                    >
                        <QrCode className="w-5 h-5" />
                    </button>
                 </div>
             </div>
        </div>

        {/* --- SPACER (Pushes content to edges) --- */}
        <div className="flex-grow"></div>
        
        {/* --- BOTTOM SECTION (BUTTONS) --- */}
        {/* Increased padding-bottom to 28 (7rem) to float above the Nav Bar clearly */}
        <div className="flex-none px-4 pb-28 w-full max-w-md mx-auto z-10 flex flex-col gap-3">
             <Button 
                variant="secondary" 
                onClick={() => navigate('/hub')} 
                className="w-full font-chakra font-bold text-xl tracking-wider !py-4 shadow-lg shadow-dark-accent-start/10 hover:shadow-dark-accent-start/20 border border-white/5 active:scale-[0.98] transition-all"
             >
                {t.hubTitle}
             </Button>

             {activeSession ? (
                <Button variant="secondary" onClick={handleContinue} className="w-full font-chakra font-bold text-xl tracking-wider !py-4 shadow-lg shadow-dark-accent-start/10 hover:shadow-dark-accent-start/20 border border-white/5">
                    {t.continueSession}
                </Button>
             ) : (
                <Button variant="secondary" onClick={handleStartNewSession} className="w-full font-chakra font-bold text-xl tracking-wider !py-4 shadow-lg shadow-dark-accent-start/10 hover:shadow-dark-accent-start/20 border border-white/5">
                    {t.newSession}
                </Button>
             )}
             
             {/* Player Hub Button - Full Width */}
             <Button variant="secondary" onClick={() => navigate('/player-hub')} className="w-full font-chakra font-bold text-xl tracking-wider !py-4 shadow-lg shadow-dark-accent-start/10 hover:shadow-dark-accent-start/20 border border-white/5">
                {t.playerHub}
             </Button>
             
             {/* Create Poster Button - Full Width */}
             <Button variant="secondary" onClick={() => navigate('/announcement')} className="w-full font-chakra font-bold text-xl tracking-wider !py-4 shadow-lg shadow-dark-accent-start/10 hover:shadow-dark-accent-start/20 border border-white/5">
                {t.createAnnouncement}
             </Button>
        </div>
    </div>
  );
};
