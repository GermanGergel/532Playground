
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context';
import { Page, Button, useTranslation, Modal } from '../ui';
import { homeScreenBackground } from '../assets';
import { BrandedHeader } from './utils';
import { Globe, Upload, XCircle, QrCode } from '../icons'; 
import html2canvas from 'html2canvas';

// --- PREMIUM DIGITAL ACCESS PASS (Pure Black Edition) ---
const HubAccessPass: React.FC<{ url: string; qrSrc: string }> = ({ url, qrSrc }) => {
    return (
        <div 
            id="hub-access-card"
            style={{
                width: '800px', // Высокое разрешение
                height: '450px', // Формат 16:9
                position: 'fixed',
                top: 0,
                left: '-9999px', // Скрыто от глаз
                zIndex: -10,
                backgroundColor: '#000000', // Абсолютный черный
                display: 'flex',
                fontFamily: 'sans-serif', // Fallback font
            }}
        >
            <div style={{ position: 'relative', width: '100%', height: '100%', display: 'flex', overflow: 'hidden' }}>
                
                {/* Декоративная полоса слева */}
                <div style={{ width: '12px', height: '100%', background: '#00F2FE' }}></div>

                {/* Основной контент */}
                <div style={{ flex: 1, padding: '50px 60px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                    
                    {/* Верхняя часть */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '30px' }}>
                        <div style={{ width: '8px', height: '8px', background: '#00F2FE', borderRadius: '50%' }}></div>
                        <span style={{ fontFamily: '"Chakra Petch", sans-serif', fontSize: '16px', fontWeight: '700', color: '#64748b', letterSpacing: '0.3em', textTransform: 'uppercase' }}>
                            OFFICIAL CLUB ACCESS
                        </span>
                    </div>

                    {/* Заголовок */}
                    <h1 style={{ fontFamily: '"Orbitron", sans-serif', fontSize: '72px', fontWeight: '900', color: 'white', lineHeight: '0.9', margin: 0, letterSpacing: '-0.02em' }}>
                        ACCESS<br />
                        GRANTED
                    </h1>

                    {/* Футер */}
                    <div style={{ marginTop: 'auto' }}>
                        <p style={{ fontFamily: '"Chakra Petch", sans-serif', fontSize: '18px', color: '#334155', margin: 0, letterSpacing: '0.1em' }}>
                            ID: {Math.floor(Math.random() * 1000000).toString().padStart(6, '0')} // AUTH_KEY_VALID
                        </p>
                    </div>
                </div>

                {/* Правая часть с QR */}
                <div style={{ width: '280px', background: '#080808', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', borderLeft: '2px dashed #222' }}>
                    <div style={{ background: 'white', padding: '15px', borderRadius: '10px' }}>
                        <img src={qrSrc} alt="QR" style={{ width: '160px', height: '160px', display: 'block' }} />
                    </div>
                    <span style={{ fontFamily: '"Chakra Petch", sans-serif', color: '#00F2FE', fontSize: '12px', fontWeight: 'bold', letterSpacing: '0.2em', marginTop: '20px', textTransform: 'uppercase' }}>
                        Scan to Enter
                    </span>
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

      // Ждем отрисовку шрифтов и DOM
      await document.fonts.ready;
      await new Promise(resolve => setTimeout(resolve, 100)); // Небольшая задержка для надежности

      const cardElement = document.getElementById('hub-access-card');
      if (!cardElement) {
          setIsGeneratingCard(false);
          return;
      }

      try {
          const canvas = await html2canvas(cardElement, {
              backgroundColor: '#000000', // Принудительный черный фон
              scale: 2, // Высокое качество
              useCORS: true,
              logging: false,
          });

          const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png', 1.0));
          
          if (blob) {
              const file = new File([blob], '532_Pass.png', { type: 'image/png' });
              
              // Минималистичный текст, чтобы акцент был на картинке
              const cleanText = `Official Club Hub: ${hubUrl}`;

              const shareData = {
                  files: [file],
                  text: cleanText, // Ссылка внутри текста
              };

              if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
                  await navigator.share(shareData);
              } else {
                  // Fallback для ПК
                  const link = document.createElement('a');
                  link.download = '532_Pass.png';
                  link.href = canvas.toDataURL();
                  link.click();
                  
                  // Копируем ссылку в буфер
                  await navigator.clipboard.writeText(hubUrl);
                  alert("Image downloaded & Link copied!");
              }
          }
      } catch (error) {
          console.error("Error sharing:", error);
          alert("Sharing failed. Try taking a screenshot.");
      } finally {
          setIsGeneratingCard(false);
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

  // QR Codes
  const promoQrImageSrc = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(promoUrl)}&bgcolor=1A1D24&color=00F2FE&qzone=1&ecc=L`;
  // Clean QR for the pass (High contrast for scanning)
  const hubQrForCard = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(hubUrl)}&qzone=0&ecc=M&color=000000&bgcolor=FFFFFF`;

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
