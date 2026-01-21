
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context';
import { Page, Button, useTranslation, Modal } from '../ui';
import { homeScreenBackground } from '../assets';
import { BrandedHeader } from './utils';
import { Globe, Upload, XCircle, QrCode } from '../icons'; 
import html2canvas from 'html2canvas';
import { initAudioContext } from '../lib';

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
    initAudioContext(); // РАЗБЛОКИРОВКА ЗВУКА
    if (activeSession) {
      if (activeSession.games && activeSession.games.length > 0) {
        navigate('/match');
      } else {
        navigate('/assign');
      }
    }
  };

  const handleStartNewSession = () => {
    initAudioContext(); // РАЗБЛОКИРОВКА ЗВУКА
    navigate('/setup');
  };

  const handleShareHub = async () => {
      if (isSharing) return;
      setIsSharing(true);
      const shareData = {
          title: '532 CLUB HUB',
          text: 'Check live stats, rankings, and match intelligence on 532 Playground.',
          url: hubUrl,
      };
      try {
          if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
              await navigator.share(shareData);
          } else {
              await navigator.clipboard.writeText(hubUrl);
              alert("Club Hub link copied to clipboard!");
          }
      } catch (error) {
          console.error("Error sharing hub link:", error);
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
  
          const filename = `532_Access_Card.png`;
          const file = new File([blob], filename, { type: 'image/png' });

          const shareData = {
              files: [file],
              title: `532 PLAYGROUND // ACCESS`,
              text: `Join the club: ${promoUrl}`
          };

          if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
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
          console.error("Sharing error:", error);
      } finally {
          setIsGenerating(false);
          setIsQrModalOpen(false);
      }
  };

  const controlButtonClass = "w-12 h-12 flex items-center justify-center bg-dark-surface/80 rounded-full border shadow-[0_0_15px_rgba(0,242,254,0.2)] active:scale-95 transition-all hover:bg-dark-surface hover:scale-110";

  return (
    <Page style={{ backgroundImage: `url("${homeScreenBackground}")`, backgroundSize: 'cover', backgroundPosition: 'center' }}>
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
                        <h1 className="font-russo text-3xl flex items-baseline justify-center">
                            <span className="text-[#00F2FE]">532</span>
                            <span className="text-white ml-2 text-lg tracking-widest">PLAYGROUND</span>
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
                        SCAN TO JOIN THE CLUB
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
        
        <div className="flex flex-col min-h-[calc(100vh-8rem)] justify-between relative">
             <div className="absolute top-4 right-0 z-50 flex flex-row gap-3 items-center">
                 <button 
                    onClick={() => { initAudioContext(); handleShareHub(); }}
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
                    onClick={() => { initAudioContext(); setIsQrModalOpen(true); }}
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
                    onClick={() => { initAudioContext(); navigate('/hub'); }} 
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
                 <Button variant="secondary" onClick={() => { initAudioContext(); navigate('/player-hub'); }} className="w-full font-chakra font-bold text-xl tracking-wider !py-3 shadow-lg shadow-dark-accent-start/20 hover:shadow-dark-accent-start/40">
                    {t.playerHub}
                 </Button>
                 <Button variant="secondary" onClick={() => { initAudioContext(); navigate('/announcement'); }} className="w-full font-chakra font-bold text-xl tracking-wider !py-3 shadow-lg shadow-dark-accent-start/20 hover:shadow-dark-accent-start/40">
                    {t.createAnnouncement}
                 </Button>
            </main>
        </div>
    </Page>
  );
};
