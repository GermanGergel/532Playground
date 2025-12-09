import React from 'react';
import { Button, Modal, useTranslation, ToggleSwitch } from '../ui';
import { Player, SkillType, PlayerStatus, PlayerTier } from '../types';

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
    
    // Tier calculation logic duplicated to avoid circular dependencies with services
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
            setActiveTab('info'); // Reset to first tab on open
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

        // LOGIC CHANGE: If rating is set and valid (>0), automatically confirm the player
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
            status: newStatus, // Automatically updated status
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
                        {/* FIX: Corrected a typo in the onChange handler for the surname input. */}
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
