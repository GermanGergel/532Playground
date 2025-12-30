
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

// --- MONOLITHIC BLACK VIP PASS (ONE PIECE DESIGN) ---
const HubAccessPass: React.FC<{ qrSrc: string }> = ({ qrSrc }) => {
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
                    radial-gradient(circle at 0% 0%, rgba(0, 242, 254, 0.1) 0%, transparent 40%),
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
            <div style={{ position: 'absolute', top: 0, left: '10%', right: '10%', height: '2px', background: 'linear-gradient(90deg, transparent, #00F2FE, transparent)', opacity: 0.8 }}></div>
            <div style={{ position: 'absolute', bottom: '-40px', left: '-20px', fontSize: '180px', fontWeight: 900, color: 'rgba(255,255,255,0.02)', fontFamily: '"Russo One", sans-serif', letterSpacing: '-0.05em', zIndex: 0 }}>532</div>

            <div style={{ flex: 1, padding: '50px 0 50px 60px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', position: 'relative', zIndex: 10 }}>
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '25px' }}>
                        <div style={{ width: '8px', height: '8px', background: '#00F2FE', borderRadius: '50%', boxShadow: '0 0 12px #00F2FE' }}></div>
                        <span style={{ fontSize: '12px', fontWeight: 900, color: '#00F2FE', letterSpacing: '0.4em', textTransform: 'uppercase' }}>CLUB ACCESS GRANTED</span>
                    </div>
                    <h1 style={{ fontFamily: '"Russo One", sans-serif', fontSize: '72px', lineHeight: '0.8', color: 'white', margin: 0 }}>CLUB<br/><span style={{ color: '#00F2FE' }}>HUB</span></h1>
                </div>
                <div style={{ borderLeft: '3px solid #00F2FE', paddingLeft: '20px' }}>
                    <p style={{ margin: 0, fontSize: '24px', fontWeight: 900, color: 'white', fontFamily: '"Russo One", sans-serif' }}>532PLAYGROUND.COM</p>
                    <p style={{ margin: '4px 0 0 0', fontSize: '10px', color: 'rgba(255,255,255,0.4)', letterSpacing: '0.15em' }}>RATINGS • RANKINGS • MATCH INTEL</p>
                </div>
            </div>

            <div style={{ width: '240px', background: 'rgba(255,255,255,0.01)', borderLeft: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', position: 'relative', zIndex: 10 }}>
                <div style={{ background: 'white', padding: '12px', borderRadius: '24px', boxShadow: '0 25px 50px rgba(0,0,0,0.9)', transform: 'rotate(1deg) scale(1.05)', border: '4px solid #05070a' }}>
                    <img src={qrSrc} alt="Hub QR" style={{ width: '135px', height: '135px', display: 'block' }} />
                </div>
                <div style={{ marginTop: '35px', textAlign: 'center' }}>
                    <span style={{ display: 'block', fontSize: '10px', fontWeight: 900, color: 'white', letterSpacing: '0.5em', opacity: 0.4 }}>SCAN TO ENTER</span>
                    <span style={{ display: 'block', fontSize: '9px', fontFamily: 'monospace', color: '#00F2FE', opacity: 0.6, marginTop: '8px' }}>ID_NODE: {Math.floor(Math.random()*9999)}</span>
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
      const baseUrl = window.location.origin;
      setQrUrl(`${baseUrl}/promo`);
      setHubUrl(`${baseUrl}/hub`);
  }, []);

  const handleShareHub = async () => {
      if (isGeneratingCard) return;
      setIsGeneratingCard(true);
      const cardElement = document.getElementById('hub-access-card');
      if (!cardElement) { setIsGeneratingCard(false); return; }
      await document.fonts.ready;
      try {
          const canvas = await html2canvas(cardElement, { backgroundColor: '#05070a', scale: 3, useCORS: true });
          const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'));
          if (blob) {
              const file = new File([blob], '532_Club_Access.png', { type: 'image/png' });
              if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
                  await navigator.share({ files: [file], title: '532 Club Access', text: `🎟️ 532 CLUB HUB ACCESS\n${hubUrl}` });
              } else {
                  const link = document.createElement('a');
                  link.download = '532_Club_Access.png';
                  link.href = canvas.toDataURL();
                  link.click();
              }
          }
      } catch (e) { console.error(e); }
      setIsGeneratingCard(false);
  };

  const hubQrForCard = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(hubUrl)}&qzone=0&ecc=M`;
  const controlBtn = "w-12 h-12 flex items-center justify-center bg-dark-surface/80 rounded-full border border-dark-accent-start/30 shadow-[0_0_15px_rgba(0,242,254,0.2)] active:scale-95 transition-all";

  return (
    <Page style={{ backgroundImage: `url("${homeScreenBackground}")`, backgroundSize: 'cover' }}>
        <HubAccessPass qrSrc={hubQrForCard} />
        <Modal isOpen={isQrModalOpen} onClose={() => setIsQrModalOpen(false)} size="sm" hideCloseButton containerClassName="border-2 border-dark-accent-start/50 bg-dark-surface/95 backdrop-blur-xl">
            <div className="flex flex-col items-center gap-4 p-2 text-center">
                <h2 className="font-russo text-3xl text-white uppercase tracking-wider">RECRUIT PLAYER</h2>
                <div className="p-4 bg-white/5 rounded-2xl border border-white/10">
                    <img src={`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qrUrl)}&bgcolor=1A1D24&color=00F2FE&qzone=1`} className="w-48 h-48 rounded-lg" />
                </div>
                <Button variant="secondary" onClick={() => setIsQrModalOpen(false)} className="w-full">CLOSE</Button>
            </div>
        </Modal>
        
        <div className="flex flex-col min-h-[calc(100vh-8rem)] justify-between relative">
             <div className="absolute top-4 right-0 z-50 flex gap-3">
                 <button onClick={handleShareHub} disabled={isGeneratingCard} className={controlBtn}>
                    {isGeneratingCard ? <div className="w-5 h-5 border-2 border-dark-accent-start border-t-transparent rounded-full animate-spin"></div> : <Globe className="w-6 h-6 text-dark-accent-start" />}
                 </button>
                 <button onClick={() => setIsQrModalOpen(true)} className={controlBtn}><QrIcon className="w-6 h-6 text-dark-accent-start" /></button>
             </div>
             <BrandedHeader className="mt-12" />
             <main className="flex flex-col items-center gap-4 w-full mt-auto">
                 <Button variant="secondary" onClick={() => navigate('/hub')} className="w-full font-chakra font-bold text-xl !py-3 border border-dark-accent-start/30">{t.hubTitle}</Button>
                 <Button variant="secondary" onClick={() => activeSession ? (activeSession.games.length ? navigate('/match') : navigate('/assign')) : navigate('/setup')} className="w-full font-chakra font-bold text-xl !py-3">{activeSession ? t.continueSession : t.newSession}</Button>
                 <Button variant="secondary" onClick={() => navigate('/player-hub')} className="w-full font-chakra font-bold text-xl !py-3">{t.playerHub}</Button>
                 <Button variant="secondary" onClick={() => navigate('/announcement')} className="w-full font-chakra font-bold text-xl !py-3">{t.createAnnouncement}</Button>
            </main>
        </div>
    </Page>
  );
};
