
import React, { useRef, useState } from 'react';
import { Button, Modal, useTranslation, ToggleSwitch } from '../ui';
import { Player, SkillType, PlayerStatus, PlayerTier } from '../types';
import html2canvas from 'html2canvas';

// --- PLAYER ADD MODAL ---
export interface PlayerAddModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (nickname: string) => void;
}
export const PlayerAddModal: React.FC<PlayerAddModalProps> = ({ isOpen, onClose, onSave }) => {
    const t = useTranslation();
    const [nickname, setNickname] = React.useState('');

    const handleSave = () => {
        if (nickname.trim()) {
            onSave(nickname.trim());
            setNickname('');
            onClose();
        }
    };

    return (
        <Modal 
            isOpen={isOpen} 
            onClose={onClose} 
            size="xs"
            containerClassName="!p-5 border border-dark-accent-start/30 shadow-[0_0_20px_rgba(0,242,254,0.15)]"
            hideCloseButton
        >
            <h3 className="text-sm font-bold text-center uppercase mb-4 tracking-wider text-dark-text accent-text-glow">
                {t.addPlayerManually}
            </h3>
            <div className="space-y-4">
                <input 
                    type="text" 
                    value={nickname} 
                    onChange={(e) => setNickname(e.target.value)} 
                    placeholder={t.nickname} 
                    autoFocus
                    className="w-full p-2.5 bg-dark-bg/60 rounded-lg border border-white/10 text-sm text-center focus:ring-1 focus:ring-dark-accent-start focus:border-dark-accent-start/50 focus:outline-none transition-all placeholder:text-dark-text-secondary/50"
                    onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                />
                <div className="flex gap-2">
                    <Button 
                        onClick={onClose} 
                        variant="ghost" 
                        className="flex-1 !py-2 !text-xs !font-bold text-dark-text-secondary hover:text-white"
                    >
                        {t.cancel}
                    </Button>
                    <Button 
                        onClick={handleSave} 
                        variant="secondary"
                        className="flex-[2] !py-2 !text-sm !font-bold shadow-[0_0_15px_rgba(0,242,254,0.25)] border border-dark-accent-start/40 hover:shadow-[0_0_25px_rgba(0,242,254,0.4)] transition-all bg-dark-surface"
                    >
                        {t.addPlayer}
                    </Button>
                </div>
            </div>
        </Modal>
    );
};

// --- PLAYER EDIT MODAL ---
const ALL_SKILLS: SkillType[] = ['goalkeeper', 'power_shot', 'technique', 'defender', 'playmaker', 'finisher', 'versatile', 'tireless_motor', 'leader'];

export interface PlayerEditModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (player: Player) => void;
    playerToEdit?: Player | null;
}

export const PlayerEditModal: React.FC<PlayerEditModalProps> = ({ isOpen, onClose, onSave, playerToEdit }) => {
    const t = useTranslation();
    const [nickname, setNickname] = React.useState('');
    const [surname, setSurname] = React.useState('');
    const [countryCode, setCountryCode] = React.useState('');
    const [rating, setRating] = React.useState<number | string>('');
    const [currentSkills, setCurrentSkills] = React.useState<SkillType[]>([]);
    const [activeTab, setActiveTab] = React.useState<'info' | 'skills'>('info');
    
    const getTierForRating = (rating: number): PlayerTier => {
        if (rating >= 89) return PlayerTier.Legend;
        if (rating >= 79) return PlayerTier.Elite;
        if (rating >= 73) return PlayerTier.Pro;
        return PlayerTier.Regular;
    };

    React.useEffect(() => {
        if (isOpen && playerToEdit) {
            setNickname(playerToEdit.nickname || '');
            setSurname(playerToEdit.surname || '');
            setCountryCode(playerToEdit.countryCode || '');
            setRating(playerToEdit.rating > 0 ? playerToEdit.rating : '');
            setCurrentSkills(playerToEdit.skills || []);
            setActiveTab('info'); 
        }
    }, [isOpen, playerToEdit]);

    const handleSkillToggle = (skill: SkillType) => {
        setCurrentSkills(prev => 
            prev.includes(skill) ? prev.filter(s => s !== skill) : [...prev, skill]
        );
    };
    
    const handleRatingChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        if (val === '') {
            setRating('');
        } else {
            const num = parseInt(val, 10);
            if (!isNaN(num) && num >= 0 && num <= 100) {
                setRating(num);
            }
        }
    };

    const handleSave = () => {
        if (!playerToEdit) return;
        const newRatingValue = typeof rating === 'number' ? rating : playerToEdit.rating;
        const player: Player = { ...playerToEdit, nickname, surname, countryCode: countryCode.toUpperCase(), rating: newRatingValue, tier: getTierForRating(newRatingValue), skills: currentSkills, status: PlayerStatus.Confirmed };
        onSave(player);
        onClose();
    };

    const tabButtonClass = (isActive: boolean) => `flex-1 py-2 text-sm font-bold rounded-t-lg ${isActive ? 'bg-dark-surface' : 'bg-dark-bg/50 text-dark-text-secondary'}`;

    return (
        <Modal isOpen={isOpen} onClose={onClose} size="sm" hideCloseButton={true} containerClassName="border border-dark-accent-start/40 shadow-[0_0_20px_rgba(0,242,254,0.3)] !p-0">
            <div className="flex">
                <button onClick={() => setActiveTab('info')} className={tabButtonClass(activeTab === 'info')}>Info</button>
                <button onClick={() => setActiveTab('skills')} className={tabButtonClass(activeTab === 'skills')}>Skills</button>
            </div>
            <div className="p-4 bg-dark-surface rounded-b-2xl">
                {activeTab === 'info' && (
                     <div className="space-y-3">
                        <input type="text" value={nickname} onChange={(e) => setNickname(e.target.value)} placeholder={t.nickname} className="w-full p-2 bg-dark-bg rounded-lg border border-dark-accent-start/40" />
                        <input type="text" value={surname} onChange={(e) => setSurname(e.target.value)} placeholder={t.surname} className="w-full p-2 bg-dark-bg rounded-lg border border-dark-accent-start/40" />
                        <input type="text" value={countryCode} onChange={(e) => setCountryCode(e.target.value)} placeholder="Country (UA, BR)" className="w-full p-2 bg-dark-bg rounded-lg border border-dark-accent-start/40" />
                        <input type="number" value={rating} onChange={handleRatingChange} placeholder="OVR" className="w-full p-2 bg-dark-bg rounded-lg border border-dark-accent-start/40" />
                    </div>
                )}
                {activeTab === 'skills' && (
                     <div className="grid grid-cols-2 gap-2">
                        {ALL_SKILLS.map(skill => (
                             <div key={skill} className="flex items-center gap-2 p-2 rounded-lg bg-dark-bg/50">
                                <ToggleSwitch isOn={currentSkills.includes(skill)} onToggle={() => handleSkillToggle(skill)} />
                                <span className="text-xs font-semibold">{t[`skill_${skill}` as keyof typeof t]}</span>
                            </div>
                        ))}
                    </div>
                )}
                <div className="flex justify-end gap-3 mt-6">
                    <Button variant="secondary" onClick={onClose}>{t.cancel}</Button>
                    <Button variant="primary" onClick={handleSave}>{t.saveChanges}</Button>
                </div>
            </div>
        </Modal>
    );
};

// --- SHARE PROFILE MODAL (RE-DESIGNED FOR "ONE BLOCK" SHARING) ---
export interface ShareProfileModalProps {
    isOpen: boolean;
    onClose: () => void;
    player: Player;
}

export const ShareProfileModal: React.FC<ShareProfileModalProps> = ({ isOpen, onClose, player }) => {
    const t = useTranslation();
    const bannerRef = useRef<HTMLDivElement>(null);
    const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
    const [isGenerating, setIsGenerating] = useState(false);

    const profileUrl = `${window.location.origin}/public-profile/${player.id}`;

    React.useEffect(() => {
        if (isOpen) {
            const generateQrCode = async () => {
                const url = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(profileUrl)}&bgcolor=1A1D24&color=00F2FE&qzone=1&ecc=H`;
                setQrCodeDataUrl(url);
            };
            generateQrCode();
        }
    }, [isOpen, profileUrl]);
    
    const handleShare = async () => {
        if (!bannerRef.current || isGenerating) return;
        setIsGenerating(true);
        try {
            const canvas = await html2canvas(bannerRef.current, { 
                backgroundColor: '#1A1D24',
                scale: 2, // Standard web preview quality
                useCORS: true 
            });
            
            const blob = await new Promise<Blob|null>(resolve => canvas.toBlob(resolve, 'image/png'));
            if (!blob) throw new Error("Export failed");
    
            const file = new File([blob], `532_Access_${player.nickname}.png`, { type: 'image/png' });

            if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
                // ОТПРАВКА ОДНИМ БЛОКОМ: Файл + Ссылка в подписи
                await navigator.share({
                    files: [file],
                    text: `${t.clickToEnter}: ${profileUrl}`
                });
            } else {
                await navigator.clipboard.writeText(profileUrl);
                alert(t.profileLinkCopied || "Link copied!");
            }
        } catch (error) {
            console.error(error);
        } finally {
            setIsGenerating(false);
            onClose();
        }
    };
    
    return (
        <Modal isOpen={isOpen} onClose={onClose} size="sm" hideCloseButton containerClassName="!p-4 !bg-dark-bg border border-[#00F2FE]/20">
             <div className="flex flex-col items-center gap-6">
                 
                 {/* СКРЫТЫЙ ШАБЛОН ДЛЯ ГЕНЕРАЦИИ БАННЕРА (ГОРИЗОНТАЛЬНЫЙ 1200x630) */}
                 <div className="w-full overflow-hidden rounded-xl border border-white/10 shadow-lg">
                    <div 
                        ref={bannerRef} 
                        style={{ width: '600px', height: '315px' }} // 1.91:1 Aspect Ratio (OG standard)
                        className="bg-[#1A1D24] p-8 flex items-center justify-between relative overflow-hidden"
                    >
                        {/* Background Branding */}
                        <div className="absolute top-0 right-0 p-4 opacity-10">
                             <h1 className="font-russo text-6xl text-white">532</h1>
                        </div>

                        {/* Left Side: Info */}
                        <div className="flex flex-col gap-4 relative z-10">
                            <div>
                                <h1 className="font-russo text-4xl flex items-baseline gap-2">
                                    <span className="text-[#00F2FE]">532</span>
                                    <span className="text-white text-xl tracking-[0.3em]">PLAYGROUND</span>
                                </h1>
                                <p className="text-[10px] font-black tracking-[0.5em] text-white/40 uppercase mt-1">OFFICIAL ACCESS CARD</p>
                            </div>

                            <div className="mt-4">
                                <h2 className="font-russo text-5xl text-white uppercase leading-none">{player.nickname}</h2>
                                <h3 className="font-chakra text-2xl text-[#00F2FE] font-bold uppercase tracking-widest mt-2">{player.surname || 'PRO PLAYER'}</h3>
                            </div>
                            
                            <div className="flex items-center gap-4 mt-4">
                                <div className="flex flex-col">
                                    <span className="text-4xl font-black font-russo text-white">{player.rating}</span>
                                    <span className="text-[8px] font-bold text-white/40 tracking-widest uppercase">OVR RATING</span>
                                </div>
                                <div className="h-10 w-px bg-white/10"></div>
                                <div className="flex flex-col">
                                    <span className="text-xl font-bold font-chakra text-white/80 uppercase">{player.tier}</span>
                                    <span className="text-[8px] font-bold text-white/40 tracking-widest uppercase">PLAYER CLASS</span>
                                </div>
                            </div>
                        </div>

                        {/* Right Side: QR */}
                        <div className="relative z-10 flex flex-col items-center gap-3">
                            <div className="p-2 rounded-2xl bg-gradient-to-br from-[#00F2FE] to-[#4CFF5F] shadow-2xl">
                                <div className="bg-[#1A1D24] p-1.5 rounded-xl">
                                    {qrCodeDataUrl && <img src={qrCodeDataUrl} alt="QR" className="w-32 h-32" />}
                                </div>
                            </div>
                            <span className="text-[8px] font-black text-[#00F2FE] tracking-[0.2em] uppercase animate-pulse">SCAN TO VIEW PROFILE</span>
                        </div>
                    </div>
                 </div>

                 {/* UI BUTTONS */}
                 <div className="w-full flex flex-col gap-3">
                    <p className="text-[10px] text-center text-white/40 uppercase tracking-widest px-4">Баннер и ссылка будут отправлены одним сообщением</p>
                    <Button 
                        variant="primary" 
                        onClick={handleShare} 
                        disabled={isGenerating}
                        className="w-full !py-4 !text-lg font-chakra font-black tracking-widest uppercase shadow-[0_0_20px_rgba(0,242,254,0.4)]"
                    >
                        {isGenerating ? "..." : "ОТПРАВИТЬ КАРТУ"}
                    </Button>
                    <Button variant="ghost" onClick={onClose} className="w-full !py-2 !text-xs font-chakra font-bold text-white/30 uppercase">{t.cancel}</Button>
                </div>
            </div>
        </Modal>
    );
};
