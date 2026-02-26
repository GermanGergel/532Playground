import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context';
import { Button, useTranslation, Modal } from '../ui';
import { homeScreenBackground } from '../assets';
import { Globe, QrCode } from '../icons'; 
import html2canvas from 'html2canvas';
import { 
    uploadChatIcon, saveChatIconUrl, 
    uploadBallIcon, saveBallIconUrl,
    uploadTrophyIcon, saveTrophyIconUrl,
    uploadTotmEmblem, saveTotmEmblemUrl,
    uploadTeamEmblem, saveTeamEmblemUrl,
    uploadClubNewsImage, saveClubNews, loadClubNews
} from '../db';
import { ClubNewsItem } from '../types';
import { Trash2 } from '../icons';

export const HomeScreen: React.FC = () => {
  const navigate = useNavigate();
  const t = useTranslation();
  const { activeSession } = useApp();
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [isHubModalOpen, setIsHubModalOpen] = useState(false);
  const [isTeamEmblemsOpen, setIsTeamEmblemsOpen] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [hubUrl, setHubUrl] = useState('');
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  
  // News Management State
  const [isNewsModalOpen, setIsNewsModalOpen] = useState(false);
  const [clubNews, setClubNews] = useState<ClubNewsItem[]>([]);
  const [newNewsTitle, setNewNewsTitle] = useState('');

  useEffect(() => {
      if (isNewsModalOpen) {
          loadClubNews().then(setClubNews);
      }
  }, [isNewsModalOpen]);

  const handleUploadNewsImage = async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (file) {
          setIsUploading(true);
          const reader = new FileReader();
          reader.onloadend = async () => {
              const base64String = reader.result as string;
              const cloudUrl = await uploadClubNewsImage(base64String);
              
              if (cloudUrl) {
                  const newItem: ClubNewsItem = {
                      id: Date.now().toString(),
                      imageUrl: cloudUrl,
                      title: newNewsTitle,
                      createdAt: new Date().toISOString()
                  };
                  const updatedNews = [newItem, ...clubNews];
                  await saveClubNews(updatedNews);
                  setClubNews(updatedNews);
                  setNewNewsTitle(''); // Reset title
                  alert("News item added!");
              } else {
                  alert("Failed to upload image.");
              }
              setIsUploading(false);
          };
          reader.readAsDataURL(file);
      }
  };

  const handleDeleteNewsItem = async (id: string) => {
      if (window.confirm("Are you sure you want to delete this news item?")) {
          const updatedNews = clubNews.filter(item => item.id !== id);
          await saveClubNews(updatedNews);
          setClubNews(updatedNews);
      }
  };
  
  const promoCardRef = useRef<HTMLDivElement>(null);

  const handleUploadIcon = async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (file) {
          setIsUploading(true);
          const reader = new FileReader();
          reader.onloadend = async () => {
              const base64String = reader.result as string;
              
              // 1. Try to upload to cloud
              const cloudUrl = await uploadChatIcon(base64String);
              
              if (cloudUrl) {
                  // 2. Save URL to settings
                  await saveChatIconUrl(cloudUrl);
                  localStorage.setItem('customChatIcon', cloudUrl); // Cache URL locally
                  alert("Icon uploaded to cloud successfully!");
              } else {
                  // Fallback: Local storage only (if cloud fails or not configured)
                  localStorage.setItem('customChatIcon', base64String);
                  alert("Cloud upload failed. Saved locally.");
              }
              
              setIsUploading(false);
              setIsHubModalOpen(false);
          };
          reader.readAsDataURL(file);
      }
  };

  const handleUploadBall = async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (file) {
          setIsUploading(true);
          const reader = new FileReader();
          reader.onloadend = async () => {
              const base64String = reader.result as string;
              const cloudUrl = await uploadBallIcon(base64String);
              if (cloudUrl) {
                  await saveBallIconUrl(cloudUrl);
                  localStorage.setItem('customBallIcon', cloudUrl);
                  alert("Ball icon uploaded to cloud!");
              } else {
                  localStorage.setItem('customBallIcon', base64String);
                  alert("Saved locally.");
              }
              setIsUploading(false);
              setIsHubModalOpen(false);
          };
          reader.readAsDataURL(file);
      }
  };

  const handleUploadTrophy = async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (file) {
          setIsUploading(true);
          const reader = new FileReader();
          reader.onloadend = async () => {
              const base64String = reader.result as string;
              const cloudUrl = await uploadTrophyIcon(base64String);
              if (cloudUrl) {
                  await saveTrophyIconUrl(cloudUrl);
                  localStorage.setItem('customTrophyIcon', cloudUrl);
                  alert("Trophy icon uploaded to cloud!");
              } else {
                  localStorage.setItem('customTrophyIcon', base64String);
                  alert("Saved locally.");
              }
              setIsUploading(false);
              setIsHubModalOpen(false);
          };
          reader.readAsDataURL(file);
      }
  };

  const handleUploadTotm = async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (file) {
          setIsUploading(true);
          const reader = new FileReader();
          reader.onloadend = async () => {
              const base64String = reader.result as string;
              const cloudUrl = await uploadTotmEmblem(base64String);
              if (cloudUrl) {
                  await saveTotmEmblemUrl(cloudUrl);
                  localStorage.setItem('customTotmEmblem', cloudUrl);
                  alert("TOTM Emblem uploaded to cloud!");
              } else {
                  localStorage.setItem('customTotmEmblem', base64String);
                  alert("Saved locally.");
              }
              setIsUploading(false);
              setIsHubModalOpen(false);
          };
          reader.readAsDataURL(file);
      }
  };

  const handleUploadTeamEmblem = async (color: string, event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (file) {
          setIsUploading(true);
          const reader = new FileReader();
          reader.onloadend = async () => {
              const base64String = reader.result as string;
              const cloudUrl = await uploadTeamEmblem(color, base64String);
              if (cloudUrl) {
                  await saveTeamEmblemUrl(color, cloudUrl);
                  localStorage.setItem(`customTeamEmblem_${color.replace('#', '')}`, cloudUrl);
                  alert(`Emblem uploaded successfully!`);
              } else {
                  localStorage.setItem(`customTeamEmblem_${color.replace('#', '')}`, base64String);
                  alert("Saved locally.");
              }
              setIsUploading(false);
          };
          reader.readAsDataURL(file);
      }
  };

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
          const canShare = typeof navigator.share === 'function' && typeof navigator.canShare === 'function' && navigator.canShare(shareData);
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

          const canShare = typeof navigator.share === 'function' && typeof navigator.canShare === 'function' && navigator.canShare(shareData);

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
        className="fixed inset-0 w-full h-[100dvh] overflow-hidden relative flex flex-col"
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

        <Modal
            isOpen={isHubModalOpen}
            onClose={() => setIsHubModalOpen(false)}
            size="xs"
            hideCloseButton
            containerClassName="!p-3 !bg-dark-bg border border-[#00F2FE]/20"
        >
            <div className="flex flex-col items-center gap-4 p-2">
                <h2 className="font-russo text-lg text-white uppercase tracking-tight leading-none text-center">
                    CLUB HUB ACCESS
                </h2>
                
                <div className="w-full flex flex-col gap-2">
                    <Button 
                        variant="primary" 
                        onClick={() => navigate('/hub')} 
                        className="w-full !py-3 !text-base font-chakra font-black tracking-widest uppercase shadow-[0_0_20px_rgba(0,242,254,0.4)]"
                    >
                        ENTER HUB
                    </Button>
                    
                    <div className="relative w-full">
                        <input
                            type="file"
                            accept="image/*"
                            onChange={handleUploadIcon}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                        />
                        <Button 
                            variant="secondary" 
                            disabled={isUploading}
                            className="w-full !py-2.5 !text-xs font-chakra font-bold tracking-widest uppercase border border-white/10"
                        >
                            {isUploading ? "UPLOADING..." : "UPLOAD CHAT ICON"}
                        </Button>
                    </div>

                    <div className="relative w-full">
                        <input
                            type="file"
                            accept="image/*"
                            onChange={handleUploadBall}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                        />
                        <Button 
                            variant="secondary" 
                            disabled={isUploading}
                            className="w-full !py-2.5 !text-xs font-chakra font-bold tracking-widest uppercase border border-white/10"
                        >
                            {isUploading ? "UPLOADING..." : "UPLOAD BALL ICON"}
                        </Button>
                    </div>

                    <div className="relative w-full">
                        <input
                            type="file"
                            accept="image/*"
                            onChange={handleUploadTrophy}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                        />
                        <Button 
                            variant="secondary" 
                            disabled={isUploading}
                            className="w-full !py-2.5 !text-xs font-chakra font-bold tracking-widest uppercase border border-white/10"
                        >
                            {isUploading ? "UPLOADING..." : "UPLOAD TROPHY ICON"}
                        </Button>
                    </div>

                    <div className="relative w-full">
                        <input
                            type="file"
                            accept="image/*"
                            onChange={handleUploadTotm}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                        />
                        <Button 
                            variant="secondary" 
                            disabled={isUploading}
                            className="w-full !py-2.5 !text-xs font-chakra font-bold tracking-widest uppercase border border-white/10"
                        >
                            {isUploading ? "UPLOADING..." : "UPLOAD TOTM EMBLEM"}
                        </Button>
                    </div>

                    <div className="w-full flex flex-col gap-1">
                        <Button 
                            variant="secondary" 
                            onClick={() => setIsTeamEmblemsOpen(!isTeamEmblemsOpen)}
                            className="w-full !py-2.5 !text-xs font-chakra font-bold tracking-widest uppercase border border-white/10"
                        >
                            {isTeamEmblemsOpen ? "HIDE TEAM EMBLEMS" : "UPLOAD TEAM EMBLEMS"}
                        </Button>

                        {isTeamEmblemsOpen && (
                            <div className="grid grid-cols-2 gap-2 w-full mt-1">
                                {[
                                    { color: '#FF851B', label: 'ORANGE' },
                                    { color: '#2ECC40', label: 'LIME' },
                                    { color: '#0074D9', label: 'BLUE' },
                                    { color: '#FF4136', label: 'RED' },
                                    { color: '#FFDC00', label: 'YELLOW' }
                                ].map((team) => (
                                    <div key={team.color} className="relative">
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={(e) => handleUploadTeamEmblem(team.color, e)}
                                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                        />
                                        <Button 
                                            variant="secondary" 
                                            disabled={isUploading}
                                            className="w-full !py-2 !text-[10px] font-chakra font-bold tracking-tight uppercase border border-white/5 flex items-center justify-center gap-2"
                                        >
                                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: team.color }} />
                                            {team.label}
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <Button 
                        variant="secondary" 
                        onClick={() => setIsNewsModalOpen(true)}
                        className="w-full !py-2.5 !text-xs font-chakra font-bold tracking-widest uppercase border border-white/10"
                    >
                        MANAGE NEWS
                    </Button>

                    <Button 
                        variant="ghost" 
                        onClick={() => setIsHubModalOpen(false)} 
                        className="w-full !py-2 !text-xs font-chakra font-bold text-white/30 uppercase tracking-widest"
                    >
                        {t.cancel}
                    </Button>
                </div>
            </div>
        </Modal>

        <Modal
            isOpen={isNewsModalOpen}
            onClose={() => setIsNewsModalOpen(false)}
            size="md"
            hideCloseButton
            containerClassName="!p-4 !bg-dark-bg border border-[#00F2FE]/20"
        >
            <div className="flex flex-col gap-4">
                <h2 className="font-russo text-lg text-white uppercase tracking-tight leading-none text-center">
                    MANAGE CLUB NEWS
                </h2>

                {/* Add New Section */}
                <div className="bg-white/5 p-3 rounded-xl border border-white/10 flex flex-col gap-3">
                    <h3 className="text-xs font-bold text-white/60 uppercase tracking-wider">Add New Item</h3>
                    <input 
                        type="text" 
                        placeholder="Optional Title / Message"
                        value={newNewsTitle}
                        onChange={(e) => setNewNewsTitle(e.target.value)}
                        className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:border-[#00F2FE] outline-none"
                    />
                    <div className="relative w-full">
                        <input
                            type="file"
                            accept="image/*"
                            onChange={handleUploadNewsImage}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                        />
                        <Button 
                            variant="primary" 
                            disabled={isUploading}
                            className="w-full !py-2 !text-xs font-chakra font-bold tracking-widest uppercase shadow-[0_0_15px_rgba(0,242,254,0.2)]"
                        >
                            {isUploading ? "UPLOADING..." : "UPLOAD IMAGE & ADD"}
                        </Button>
                    </div>
                </div>

                {/* Existing Items List */}
                <div className="flex flex-col gap-2 max-h-[300px] overflow-y-auto pr-1">
                    <h3 className="text-xs font-bold text-white/60 uppercase tracking-wider sticky top-0 bg-dark-bg py-1 z-10">Existing Items</h3>
                    {clubNews.length === 0 ? (
                        <div className="text-center py-8 text-white/20 text-xs uppercase tracking-widest">No news items</div>
                    ) : (
                        <div className="grid grid-cols-2 gap-3">
                            {clubNews.map(item => (
                                <div key={item.id} className="relative group bg-black/40 rounded-lg overflow-hidden border border-white/10">
                                    <img src={item.imageUrl} alt={item.title} className="w-full h-32 object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent pointer-events-none" />
                                    {item.title && (
                                        <div className="absolute bottom-2 left-2 right-2 text-[10px] font-bold text-white truncate">
                                            {item.title}
                                        </div>
                                    )}
                                    <button 
                                        onClick={() => handleDeleteNewsItem(item.id)}
                                        className="absolute top-2 right-2 p-1.5 bg-red-500/80 hover:bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                        <Trash2 className="w-3 h-3" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <Button 
                    variant="ghost" 
                    onClick={() => setIsNewsModalOpen(false)} 
                    className="w-full !py-2 !text-xs font-chakra font-bold text-white/30 uppercase tracking-widest"
                >
                    CLOSE
                </Button>
            </div>
        </Modal>
        
        {/* --- TOP SECTION (HEADER + CONTROLS) --- */}
        <div className="flex-none pt-16 px-6 pb-2 z-10">
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

        {/* --- SPACER (Pushes buttons to center/bottom) --- */}
        <div className="flex-grow"></div>
        
        {/* --- BOTTOM SECTION (BUTTONS) --- */}
        <div className="flex-none px-6 pb-28 w-full max-w-md mx-auto z-10 flex flex-col gap-4">
             <Button 
                variant="secondary" 
                onClick={() => setIsHubModalOpen(true)} 
                className="w-full font-chakra font-bold text-xl tracking-wider !py-4 shadow-lg shadow-dark-accent-start/10 hover:shadow-dark-accent-start/20 border border-white/5 active:scale-[0.98] transition-all"
             >
                {t.hubTitle}
             </Button>

             {activeSession ? (
                <Button variant="secondary" onClick={handleContinue} className="w-full font-chakra font-bold text-xl tracking-wider !py-4 shadow-lg shadow-dark-accent-start/10 hover:shadow-dark-accent-start/20 border border-white/5">
                    {t.continueSession}
                </Button>
             ) : (
                <div className="w-full flex flex-col gap-2">
                    <Button variant="secondary" onClick={handleStartNewSession} className="w-full font-chakra font-bold text-xl tracking-wider !py-4 shadow-lg shadow-dark-accent-start/10 hover:shadow-dark-accent-start/20 border border-white/5">
                        {t.newSession}
                    </Button>
                </div>
             )}

             <Button 
                variant="secondary" 
                onClick={() => navigate('/tournaments')} 
                className="w-full font-chakra font-bold text-xl tracking-wider !py-4 shadow-lg shadow-dark-accent-start/10 hover:shadow-dark-accent-start/20 border border-white/5"
             >
                {t.navTournaments}
             </Button>
             
             <Button variant="secondary" onClick={() => navigate('/player-hub')} className="w-full font-chakra font-bold text-xl tracking-wider !py-4 shadow-lg shadow-dark-accent-start/10 hover:shadow-dark-accent-start/20 border border-white/5">
                {t.playerHub}
             </Button>
             
             <Button variant="secondary" onClick={() => navigate('/announcement')} className="w-full font-chakra font-bold text-xl tracking-wider !py-4 shadow-lg shadow-dark-accent-start/10 hover:shadow-dark-accent-start/20 border border-white/5">
                {t.createAnnouncement}
             </Button>
        </div>
    </div>
  );
};