
import React, { useRef, useState } from 'react';
import { Button, Modal, useTranslation, ToggleSwitch } from '../ui';
import { Player, SkillType, PlayerStatus, PlayerTier } from '../types';
import { convertCountryCodeAlpha3ToAlpha2 } from '../utils/countries';
import html2canvas from 'html2canvas';
import { PlayerAvatar } from '../components/avatars';

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
                        <input type="text" value={countryCode} onChange={(e) => setCountryCode(e.target.value)} placeholder="Country (e.g., UA, BR, US)" className={inputClasses} />
                        <input type="number" value={rating} onChange={handleRatingChange} placeholder="Overall Rating (0-100)" className={inputClasses} />
                    </div>
                )}
                {activeTab === 'skills' && (
                     <div className="grid grid-cols-2 gap-2">
                        {ALL_SKILLS.map(skill => (
                             <div key={skill} className="flex items-center gap-2 p-2 rounded-lg bg-dark-bg/50">
                                <ToggleSwitch 
                                    isOn={currentSkills.includes(skill)}
                                    onToggle={() => handleSkillToggle(skill)}
                                />
                                <span className="text-sm font-semibold">{t[`skill_${skill}` as keyof typeof t]}</span>
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

// --- SHARE PROFILE MODAL ---
export interface ShareProfileModalProps {
    isOpen: boolean;
    onClose: () => void;
    player: Player;
}

export const ShareProfileModal: React.FC<ShareProfileModalProps> = ({ isOpen, onClose, player }) => {
    const t = useTranslation();
    const cardRef = useRef<HTMLDivElement>(null);
    const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
    const [isGenerating, setIsGenerating] = useState(false);

    // Updated URL Construction for BrowserRouter
    const getProfileUrl = () => {
        return `${window.location.origin}/public-profile/${player.id}`;
    }
    
    const profileUrl = getProfileUrl();

    React.useEffect(() => {
        if (isOpen) {
            const generateQrCode = async () => {
                try {
                    // QR Code styling to match the user's screenshot
                    const response = await fetch(`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(profileUrl)}&bgcolor=1A1D24&color=00F2FE&qzone=1&ecc=H`);
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
    }, [isOpen, profileUrl]);
    
    const handleShareViaApp = async () => {
        if (!cardRef.current) return;
        setIsGenerating(true);
        try {
            const canvas = await html2canvas(cardRef.current, { 
                backgroundColor: '#1A1D24', // Explicit background for safety
                scale: 3, 
                useCORS: true 
            });
            const blob = await new Promise<Blob|null>(resolve => canvas.toBlob(resolve, 'image/png'));
            
            if (!blob) {
                throw new Error("Failed to generate image blob.");
            }
    
            const file = new File([blob], `${player.nickname}_access_card.png`, { type: 'image/png' });
    
            if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
                await navigator.share({
                    files: [file],
                    text: profileUrl,
                });
            } else {
                // Fallback to download if sharing is not supported
                const dataUrl = URL.createObjectURL(file);
                const link = document.createElement('a');
                link.download = file.name;
                link.href = dataUrl;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(dataUrl);
            }
        } catch (error: any) {
            console.error("Sharing failed:", error);
            if (error.name !== 'AbortError') { // Don't alert if user cancels share dialog
                alert("Could not share image. It has been downloaded instead.");
            }
        } finally {
            setIsGenerating(false);
            onClose(); // Close modal after action
        }
    };
    
    return (
        <Modal isOpen={isOpen} onClose={onClose} size="sm" hideCloseButton>
             <div className="flex flex-col items-center gap-4">
                 <div 
                    ref={cardRef} 
                    className="w-[340px] bg-[#1A1D24] rounded-2xl p-6 flex flex-col items-center gap-6 border-2 border-dark-accent-start/50 shadow-[0_0_20px_rgba(0,242,254,0.3)]"
                >
                    {/* Header */}
                    <div className="text-center">
                        <h1 className="font-russo text-3xl flex items-baseline">
                            <span className="text-dark-accent-start">532</span>
                            <span className="text-white ml-2 text-xl">PLAYGROUND</span>
                        </h1>
                        <p className="text-[10px] font-semibold tracking-[0.25em] text-dark-text-secondary mt-2">
                            OFFICIAL ACCESS CARD
                        </p>
                    </div>
                    
                    {/* Player Name */}
                    <h2 className="font-russo text-4xl text-white uppercase tracking-wide text-center">
                        {player.nickname} {player.surname}
                    </h2>

                    {/* QR Code with wider gradient border */}
                    <div className="p-3 rounded-2xl bg-gradient-to-br from-dark-accent-start to-green-400">
                        <div className="bg-[#1A1D24] p-1.5 rounded-xl">
                            {qrCodeDataUrl ? (
                                <img src={qrCodeDataUrl} alt="QR Code" className="w-40 h-40 rounded-lg" />
                            ) : (
                                <div className="w-40 h-40 flex items-center justify-center">
                                    <div className="w-8 h-8 border-2 border-dashed border-dark-accent-start rounded-full animate-spin"></div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Footer */}
                    <p className="text-sm font-semibold tracking-[0.2em] text-dark-text-secondary">
                        {t.scanToOpen}
                    </p>
                </div>

                {/* Simplified Buttons */}
                <div className="w-full max-w-[340px] flex flex-col gap-3 pt-4">
                     <Button variant="secondary" onClick={handleShareViaApp} className="w-full shadow-lg shadow-dark-accent-start/20 hover:shadow-dark-accent-start/40">
                        {isGenerating ? "Generating..." : t.shareViaApp}
                    </Button>
                    <Button variant="secondary" onClick={onClose} className="w-full mt-2 shadow-lg shadow-dark-accent-start/20 hover:shadow-dark-accent-start/40">{t.cancel}</Button>
                </div>
            </div>
        </Modal>
    );
};
