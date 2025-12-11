
import React, { useRef, useState } from 'react';
import { Button, Modal, useTranslation, ToggleSwitch } from '../ui';
import { Player, SkillType, PlayerStatus, PlayerTier } from '../types';
import { convertCountryCodeAlpha3ToAlpha2 } from '../utils/countries';
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
        if (rating >= 69) return PlayerTier.Strong;
        if (rating >= 58) return PlayerTier.Average;
        return PlayerTier.Developing;
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
        
        const newRating = typeof rating === 'number' ? rating : playerToEdit.rating;
        const newTier = getTierForRating(newRating);

        let newStatus = playerToEdit.status;
        if (newRating > 0) {
            newStatus = PlayerStatus.Confirmed;
        }

        const player: Player = { 
            ...playerToEdit, 
            nickname, 
            surname, 
            countryCode: countryCode.toUpperCase(),
            rating: newRating,
            tier: newTier,
            skills: currentSkills,
            status: newStatus,
        };
        onSave(player);
        onClose();
    };

    const neonCardClasses = "border border-dark-accent-start/40 shadow-[0_0_20px_rgba(0,242,254,0.3)]";
    const inputClasses = "w-full p-2 bg-dark-bg rounded-lg border border-dark-accent-start/40 focus:ring-2 focus:ring-dark-accent-start focus:outline-none";
    const tabButtonClass = (isActive: boolean) => `flex-1 py-2 text-sm font-bold rounded-t-lg ${isActive ? 'bg-dark-surface' : 'bg-dark-bg/50 text-dark-text-secondary'}`;

    return (
        <Modal isOpen={isOpen} onClose={onClose} size="sm" hideCloseButton={true} containerClassName={`${neonCardClasses} !p-0`}>
            <div className="flex">
                <button onClick={() => setActiveTab('info')} className={tabButtonClass(activeTab === 'info')}>Info</button>
                <button onClick={() => setActiveTab('skills')} className={tabButtonClass(activeTab === 'skills')}>Skills</button>
            </div>
            <div className="p-4 bg-dark-surface rounded-b-2xl">
                {activeTab === 'info' && (
                     <div className="space-y-3">
                        <input type="text" value={nickname} onChange={(e) => setNickname(e.target.value)} placeholder={t.nickname} className={inputClasses} />
                        <input type="text" value={surname} onChange={(e) => setSurname(e.target.value)} placeholder={t.surname} className={inputClasses} />
                        <input type="text" value={countryCode} onChange={(e) => setCountryCode(e.target.value)} placeholder="Country (e.g., UA, US)" className={inputClasses} />
                        <input type="number" value={rating} onChange={handleRatingChange} placeholder="Rating (0-100)" className={inputClasses} />
                    </div>
                )}
                {activeTab === 'skills' && (
                    <div className="grid grid-cols-2 gap-3">
                        {ALL_SKILLS.map(skill => (
                            <div key={skill} className="flex items-center justify-between bg-dark-bg/50 p-2 rounded-lg">
                                <label htmlFor={`skill-${skill}`} className="text-sm font-semibold">{t[`skill_${skill}` as keyof typeof t]}</label>
                                <ToggleSwitch 
                                    isOn={currentSkills.includes(skill)}
                                    onToggle={() => handleSkillToggle(skill)}
                                />
                            </div>
                        ))}
                    </div>
                )}
                 <div className="flex gap-3 mt-4">
                    <Button variant="secondary" onClick={onClose} className="w-full font-chakra font-bold text-xl tracking-wider !py-2">{t.cancel}</Button>
                    <Button variant="secondary" onClick={handleSave} className="w-full font-chakra font-bold text-xl tracking-wider !py-2">{t.saveChanges}</Button>
                </div>
            </div>
        </Modal>
    );
};

// --- SHARE PROFILE MODAL ---
interface ShareProfileModalProps {
    isOpen: boolean;
    onClose: () => void;
    player: Player;
}

export const ShareProfileModal: React.FC<ShareProfileModalProps> = ({ isOpen, onClose, player }) => {
    const t = useTranslation();
    const shareUrl = new URL(`/public-profile/${player.id}`, window.location.origin).href;
    const cardRef = useRef<HTMLDivElement>(null);
    const [isSharing, setIsSharing] = useState(false);
    
    const encodedUrl = encodeURIComponent(shareUrl);
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodedUrl}&color=00F2FE&bgcolor=1A1D24&margin=10`;

    const handleShare = async () => {
        if (isSharing || !cardRef.current) return;
        setIsSharing(true);
    
        const shareTextWithUrl = `Check out ${player.nickname} ${player.surname}'s player card on 532 Playground!\n${shareUrl}`;

        const shareDataTextOnly = {
            title: `532 Profile: ${player.nickname}`,
            text: `Check out ${player.nickname} ${player.surname}'s player card on 532 Playground!`,
            url: shareUrl,
        };
    
        let fileToShare: File | null = null;
    
        try {
            await new Promise(resolve => setTimeout(resolve, 300));
            const canvas = await html2canvas(cardRef.current, {
                backgroundColor: '#1A1D24',
                scale: 3,
                useCORS: true,
                logging: true,
            });
            const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png', 1.0));
            if (blob) {
                fileToShare = new File([blob], `532_Access_${player.nickname}.png`, { type: 'image/png' });
            } else {
                console.warn('Canvas toBlob returned null.');
            }
        } catch (error) {
            console.error("Error generating shareable image:", error);
        }
    
        try {
            const shareDataWithFile = {
                files: [fileToShare!],
                title: `532 Profile: ${player.nickname}`,
                text: shareTextWithUrl,
            };
    
            if (fileToShare && navigator.canShare && navigator.canShare({ files: [fileToShare] })) {
                await navigator.share(shareDataWithFile);
            } else if (navigator.canShare && navigator.canShare(shareDataTextOnly)) {
                await navigator.share(shareDataTextOnly);
            } else {
                await navigator.clipboard.writeText(shareUrl);
                alert(t.profileLinkCopied);
            }
        } catch (error) {
            console.error("Web Share API failed:", error);
            if ((error as DOMException).name !== 'AbortError') {
                try {
                    console.log("File share failed, attempting text-only fallback...");
                    await navigator.share(shareDataTextOnly);
                } catch (fallbackError) {
                    console.error("Text-only share fallback also failed:", fallbackError);
                    await navigator.clipboard.writeText(shareUrl);
                    alert(t.profileLinkCopied);
                }
            }
        } finally {
            setIsSharing(false);
        }
    };

    return (
        <Modal 
            isOpen={isOpen} 
            onClose={onClose}
            size="xs"
            containerClassName="!p-0 bg-transparent border-none shadow-none"
            hideCloseButton
        >
            <div className="flex flex-col gap-4">
                <div 
                    ref={cardRef}
                    className="relative overflow-hidden rounded-3xl bg-dark-bg p-4 text-white"
                >
                    {/* Holographic gleam - ignored during export */}
                    <div 
                        data-html2canvas-ignore="true"
                        className="absolute top-0 left-[-75%] w-[50%] h-full bg-white/10 -skew-x-[25deg] pointer-events-none"
                        style={{ filter: 'blur(30px)' }}
                    />

                    {/* Neon Border (for UI and export) */}
                    <div className="absolute inset-0 rounded-3xl border-2 border-[#00F2FE] pointer-events-none" />

                    {/* Glow Effect (for UI only, ignored on export) */}
                    <div 
                        data-html2canvas-ignore="true"
                        className="absolute inset-0 rounded-3xl shadow-[0_0_20px_rgba(0,242,254,0.5),inset_0_0_20px_rgba(0,242,254,0.2)] pointer-events-none" 
                    />

                    <div className="relative z-10 flex flex-col items-center text-center bg-dark-bg">
                        {/* New Header */}
                        <div className="flex items-baseline gap-2 mb-1" style={{ textShadow: '0 0 8px rgba(0, 242, 254, 0.5)' }}>
                            <h1 className="text-3xl font-black uppercase leading-none text-dark-accent-start">532</h1>
                            <h2 className="text-lg font-bold uppercase text-dark-text leading-none tracking-widest">PLAYGROUND</h2>
                        </div>
                        
                        <h3 className="text-[9px] font-bold tracking-[0.2em] text-dark-text-secondary uppercase mb-8">
                            OFFICIAL ACCESS CARD
                        </h3>

                        {/* Player Name */}
                        <div className="flex items-center justify-center py-4">
                            <h2 className="font-russo text-3xl uppercase text-white tracking-wide leading-tight" style={{textShadow: '0 2px 5px rgba(0,0,0,0.5)'}}>
                                {player.nickname} {player.surname}
                            </h2>
                        </div>
                        
                        {/* QR Section */}
                        <div className="flex flex-col items-center mt-4">
                            <div className="relative p-1.5 bg-gradient-to-br from-dark-accent-start to-dark-accent-end rounded-xl shadow-lg">
                                <div className="bg-[#1A1D24] p-2 rounded-lg">
                                    <img src={qrCodeUrl} alt="QR Code" className="w-36 h-36 rounded-md" crossOrigin="anonymous" />
                                </div>
                            </div>
                            <p className="text-[10px] font-bold text-dark-text-secondary uppercase tracking-[0.2em] mt-3 animate-pulse">{t.scanToOpen}</p>
                        </div>
                    </div>
                </div>


                {/* Actions */}
                <div className="grid grid-cols-2 gap-3">
                    <Button variant="secondary" onClick={onClose} className="text-sm !py-3 font-bold bg-black/50 backdrop-blur-md border border-white/10">
                        {t.cancel}
                    </Button>
                    <Button variant="primary" onClick={handleShare} disabled={isSharing} className="text-sm !py-3 !text-dark-bg font-black shadow-[0_0_20px_rgba(0,242,254,0.4)]">
                        {isSharing ? 'GENERATING...' : t.shareViaApp}
                    </Button>
                </div>
            </div>
        </Modal>
    );
};
