
import React, { useRef, useState } from 'react';
import { Button, Modal, useTranslation, ToggleSwitch } from '../ui';
import { Player, SkillType, PlayerStatus, PlayerTier, PlayerHistoryEntry } from '../types';
import { convertCountryCodeAlpha3ToAlpha2 } from '../utils/countries';
import html2canvas from 'html2canvas';
import { PlayerAvatar } from '../components/avatars';
import { Trash2, Plus } from '../icons';

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
    const [historyData, setHistoryData] = React.useState<PlayerHistoryEntry[]>([]);
    const [activeTab, setActiveTab] = React.useState<'info' | 'skills' | 'history'>('info');
    
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
            // Clone history to avoid direct mutation
            setHistoryData(playerToEdit.historyData ? [...playerToEdit.historyData] : []);
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

    const handleHistoryChange = (index: number, field: keyof PlayerHistoryEntry, value: string) => {
        const newData = [...historyData];
        if (field === 'rating') {
            const num = parseInt(value, 10);
            if (!isNaN(num)) newData[index].rating = num;
        } else if (field === 'date') {
            newData[index].date = value;
        }
        setHistoryData(newData);
    };

    const handleAddHistoryEntry = () => {
        const today = new Date();
        const dateStr = today.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit' }); // e.g. 22/01
        
        // Use current rating as default for new entry
        const currentRating = typeof rating === 'number' ? rating : 0;
        
        const newEntry: PlayerHistoryEntry = {
            date: dateStr,
            rating: currentRating,
            winRate: 0,
            goals: 0,
            assists: 0
        };
        
        setHistoryData([...historyData, newEntry]);
    };

    const handleRemoveHistoryEntry = (index: number) => {
        const newData = [...historyData];
        newData.splice(index, 1);
        setHistoryData(newData);
    };

    const handleSave = () => {
        if (!playerToEdit) return;
        
        const newRatingValue = typeof rating === 'number' ? rating : playerToEdit.rating;
        const newTier = getTierForRating(newRatingValue);

        let newStatus = playerToEdit.status;
        const currentFloor = playerToEdit.initialRating || 68;
        const finalRating = Math.max(currentFloor, newRatingValue);

        if (finalRating > 0) {
            newStatus = PlayerStatus.Confirmed;
        }

        let updatedLastRatingChange = playerToEdit.lastRatingChange;
        if (finalRating !== playerToEdit.rating) {
            updatedLastRatingChange = {
                previousRating: playerToEdit.rating,
                teamPerformance: 0,
                individualPerformance: 0,
                badgeBonus: 0,
                finalChange: finalRating - playerToEdit.rating,
                newRating: finalRating,
                badgesEarned: playerToEdit.lastRatingChange?.badgesEarned || []
            };
        }

        // Если мы меняли историю вручную, убедимся, что последняя точка истории совпадает с текущим рейтингом
        let updatedHistory = [...historyData];
        
        // Optional: Sort history by date if needed, but manual order gives user control
        
        const player: Player = { 
            ...playerToEdit, 
            nickname, 
            surname, 
            countryCode: countryCode.toUpperCase(),
            rating: finalRating,
            initialRating: currentFloor,
            tier: newTier,
            skills: currentSkills,
            status: newStatus,
            lastRatingChange: updatedLastRatingChange,
            historyData: updatedHistory
        };
        onSave(player);
        onClose();
    };

    const neonCardClasses = "border border-dark-accent-start/40 shadow-[0_0_20px_rgba(0,242,254,0.3)]";
    const inputClasses = "w-full p-2 bg-dark-bg rounded-lg border border-dark-accent-start/40 focus:ring-2 focus:ring-dark-accent-start focus:outline-none";
    const tabButtonClass = (isActive: boolean) => `flex-1 py-2 text-xs font-bold uppercase tracking-wider rounded-t-lg transition-colors ${isActive ? 'bg-dark-surface text-white' : 'bg-dark-bg/50 text-dark-text-secondary hover:text-white'}`;

    return (
        <Modal isOpen={isOpen} onClose={onClose} size="sm" hideCloseButton={true} containerClassName={`${neonCardClasses} !p-0`}>
            <div className="flex border-b border-white/10">
                <button onClick={() => setActiveTab('info')} className={tabButtonClass(activeTab === 'info')}>Info</button>
                <button onClick={() => setActiveTab('skills')} className={tabButtonClass(activeTab === 'skills')}>Skills</button>
                <button onClick={() => setActiveTab('history')} className={tabButtonClass(activeTab === 'history')}>History</button>
            </div>
            <div className="p-4 bg-dark-surface rounded-b-2xl">
                {activeTab === 'info' && (
                     <div className="space-y-3">
                        <div>
                            <label className="text-[10px] uppercase font-bold text-dark-text-secondary block mb-1">Nickname</label>
                            <input type="text" value={nickname} onChange={(e) => setNickname(e.target.value)} placeholder={t.nickname} className={inputClasses} />
                        </div>
                        <div>
                            <label className="text-[10px] uppercase font-bold text-dark-text-secondary block mb-1">Surname</label>
                            <input type="text" value={surname} onChange={(e) => setSurname(e.target.value)} placeholder={t.surname} className={inputClasses} />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-[10px] uppercase font-bold text-dark-text-secondary block mb-1">Country</label>
                                <input type="text" value={countryCode} onChange={(e) => setCountryCode(e.target.value)} placeholder="Code (e.g. UA)" className={inputClasses} />
                            </div>
                            <div>
                                <label className="text-[10px] uppercase font-bold text-dark-text-secondary block mb-1">Current OVR</label>
                                <input type="number" value={rating} onChange={handleRatingChange} placeholder="0-100" className={inputClasses} />
                            </div>
                        </div>
                    </div>
                )}
                {activeTab === 'skills' && (
                     <div className="grid grid-cols-2 gap-2 max-h-[300px] overflow-y-auto pr-1">
                        {ALL_SKILLS.map(skill => (
                             <div key={skill} className="flex items-center gap-2 p-2 rounded-lg bg-dark-bg/50 border border-white/5">
                                <ToggleSwitch 
                                    isOn={currentSkills.includes(skill)}
                                    onToggle={() => handleSkillToggle(skill)}
                                />
                                <span className="text-[10px] font-bold uppercase">{t[`skill_${skill}` as keyof typeof t]}</span>
                            </div>
                        ))}
                    </div>
                )}
                {activeTab === 'history' && (
                    <div className="space-y-2">
                        <div className="flex justify-between px-2 mb-1 text-[10px] uppercase font-bold text-dark-text-secondary">
                            <span>Date</span>
                            <span>Rating (OVR)</span>
                            <span className="w-6"></span>
                        </div>
                        <div className="space-y-2 max-h-[250px] overflow-y-auto pr-2 custom-hub-scrollbar">
                            {historyData.length === 0 ? (
                                <p className="text-center text-xs text-white/30 py-4">No history data available</p>
                            ) : (
                                // Map in reverse for display (newest first usually), but we need correct index for deletion
                                historyData.slice().reverse().map((entry, reverseIdx) => {
                                    const actualIndex = historyData.length - 1 - reverseIdx;
                                    return (
                                        <div key={actualIndex} className="flex gap-2 items-center animate-in slide-in-from-right-4 fade-in duration-300">
                                            <input 
                                                type="text" 
                                                value={entry.date} 
                                                onChange={(e) => handleHistoryChange(actualIndex, 'date', e.target.value)}
                                                className="w-1/2 p-2 bg-white/5 rounded border border-white/10 text-xs text-center font-mono focus:border-[#00F2FE] focus:outline-none"
                                                placeholder="DD/MM"
                                            />
                                            <input 
                                                type="number" 
                                                value={entry.rating} 
                                                onChange={(e) => handleHistoryChange(actualIndex, 'rating', e.target.value)}
                                                className="w-1/2 p-2 bg-dark-bg rounded border border-dark-accent-start/40 text-center font-bold text-[#00F2FE] focus:outline-none focus:border-[#00F2FE]"
                                            />
                                            <button 
                                                onClick={() => handleRemoveHistoryEntry(actualIndex)}
                                                className="p-2 text-white/20 hover:text-red-500 hover:bg-red-500/10 rounded transition-colors"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                        
                        <div className="pt-2 mt-2 border-t border-white/10">
                            <Button 
                                variant="secondary" 
                                onClick={handleAddHistoryEntry}
                                className="w-full flex items-center justify-center gap-2 !py-2 !text-xs font-bold shadow-none border-dashed border-white/20 hover:border-[#00F2FE] hover:text-[#00F2FE] bg-transparent"
                            >
                                <Plus className="w-4 h-4" />
                                ADD ENTRY
                            </Button>
                        </div>

                        <p className="text-[9px] text-white/30 text-center mt-2">
                            Add missing dates (e.g. penalties) to fix graph gaps.
                        </p>
                    </div>
                )}
                <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-white/10">
                    <Button variant="ghost" onClick={onClose} className="text-xs">{t.cancel}</Button>
                    <Button variant="primary" onClick={handleSave} className="!py-2 !px-6 text-xs">{t.saveChanges}</Button>
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

    const getProfileUrl = () => {
        return `${window.location.origin}/public-profile/${player.id}`;
    }
    
    const profileUrl = getProfileUrl();

    React.useEffect(() => {
        if (isOpen) {
            const generateQrCode = async () => {
                try {
                    const response = await fetch(`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(profileUrl)}&bgcolor=1A1D24&color=00F2FE&qzone=1&ecc=H`);
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
    
    // ЕДИНАЯ КНОПКА: Отправка картинки со ссылкой в подписи
    const handleShareOfficialCard = async () => {
        if (!cardRef.current || isGenerating) return;
        setIsGenerating(true);
        try {
            // Генерируем картинку высокого качества
            const canvas = await html2canvas(cardRef.current, { 
                backgroundColor: '#1A1D24',
                scale: 3, 
                useCORS: true 
            });
            
            const blob = await new Promise<Blob|null>(resolve => canvas.toBlob(resolve, 'image/png'));
            if (!blob) throw new Error("Blob creation failed");
    
            const filename = `UNIT_Access_Card_${player.nickname}.png`;
            const file = new File([blob], filename, { type: 'image/png' });

            // Формируем пакет данных для шеринга (Файл + Текст)
            // Это заставляет мессенджеры отправлять это как "Фото с подписью"
            const shareData = {
                files: [file],
                title: `UNIT Access: ${player.nickname}`,
                text: `Official Club Member Profile: ${profileUrl}`
            };

            if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
                await navigator.share(shareData);
            } else {
                // Fallback для десктопа: скачиваем файл и копируем ссылку
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = filename;
                a.click();
                URL.revokeObjectURL(url);
                await navigator.clipboard.writeText(profileUrl);
                alert("Card downloaded and link copied to clipboard!");
            }
        } catch (error: any) {
            console.error("Sharing error:", error);
        } finally {
            setIsGenerating(false);
            onClose();
        }
    };
    
    return (
        <Modal isOpen={isOpen} onClose={onClose} size="xs" hideCloseButton containerClassName="!p-4 !bg-dark-bg border border-[#00F2FE]/20">
             <div className="flex flex-col items-center gap-6">
                 {/* ПРЕВЬЮ КАРТОЧКИ */}
                 <div 
                    ref={cardRef} 
                    className="w-full bg-[#1A1D24] rounded-[2rem] p-6 flex flex-col items-center gap-6 border border-[#00F2FE]/30 shadow-[0_0_30px_rgba(0,242,254,0.15)]"
                >
                    <div className="text-center">
                        <h1 className="font-russo text-4xl flex items-baseline justify-center">
                            <span className="text-[#00F2FE]">UNIT</span>
                            <span className="text-white ml-2 text-xl tracking-widest">CLUB</span>
                        </h1>
                        <p className="text-[9px] font-black tracking-[0.4em] text-white/40 mt-2 uppercase">
                            OFFICIAL ACCESS CARD
                        </p>
                    </div>
                    
                    <h2 className="font-russo text-2xl text-white uppercase tracking-tight text-center leading-none">
                        {player.nickname}<br/>
                        <span className="text-sm text-white/60">{player.surname}</span>
                    </h2>

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
                        SCAN TO VIEW PROFILE
                    </p>
                </div>

                <div className="w-full flex flex-col gap-3">
                     <Button 
                        variant="primary" 
                        onClick={handleShareOfficialCard} 
                        disabled={isGenerating}
                        className="w-full !py-4 !text-lg font-chakra font-black tracking-widest uppercase shadow-[0_0_20px_rgba(0,242,254,0.4)]"
                    >
                        {isGenerating ? "GENERATING..." : "SEND ACCESS CARD"}
                    </Button>
                    <Button 
                        variant="ghost" 
                        onClick={onClose} 
                        className="w-full !py-2 !text-xs font-chakra font-bold text-white/30 uppercase tracking-widest"
                    >
                        {t.cancel}
                    </Button>
                </div>
            </div>
        </Modal>
    );
};
