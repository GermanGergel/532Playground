import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import html2canvas from 'html2canvas';
import { useApp } from '../context';
// FIX: Imported BadgeIcon component.
// FIX: Import directly from component files instead of barrel file to avoid import errors.
import { Button, Modal, useTranslation, PageHeader } from '../ui';
import { PlayerCard, BadgeIcon } from '../features';
import { InfoIcon } from '../icons';
import { Player, BadgeType, SkillType, PlayerStatus } from '../types';
import { getTierForRating } from '../services/rating';
import { PlayerEditModal } from '../modals';
import { cropImageToAvatar } from '../lib';


export const PlayerProfileScreen: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const { allPlayers, setAllPlayers } = useApp();
    const t = useTranslation();
    const navigate = useNavigate();

    const [isEditModalOpen, setIsEditModalOpen] = React.useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = React.useState(false);
    const [isInfoModalOpen, setIsInfoModalOpen] = React.useState(false);
    const fileInputRef = React.useRef<HTMLInputElement>(null);
    
    const player = allPlayers.find(p => p.id === id);

    React.useEffect(() => {
        if (!player) {
            navigate('/player-database', { replace: true });
        }
    }, [player, navigate]);

    if (!player) {
        return null;
    }

    const ALL_BADGES: BadgeType[] = [
        'goleador', 'perfect_finish', 'dynasty', 'sniper', 'assistant', 'mvp', 
        'decisive_factor', 'unsung_hero', 'first_blood', 'duplet', 'maestro', 
        'comeback_kings', 'fortress', 'club_legend_goals', 'club_legend_assists', 'veteran'
    ];
    const ALL_SKILLS_INFO: SkillType[] = ['goalkeeper', 'power_shot', 'technique', 'defender', 'playmaker', 'finisher', 'versatile', 'tireless_motor', 'leader'];

    const handleDownloadCard = async () => {
        if (!player) return;
        
        const sourceElement = document.getElementById(`player-card-container-${player.id}`);
        if (!sourceElement) {
            console.error('Player card container element not found for download.');
            alert(t.failedToExportCard);
            return;
        }

        const wrapper = document.createElement('div');
        wrapper.style.position = 'fixed';
        wrapper.style.top = '-9999px'; // Position off-screen
        wrapper.style.left = '0';
        wrapper.style.zIndex = '100'; // Ensure it's rendered, even if off-screen
        wrapper.style.pointerEvents = 'none';
        wrapper.style.width = '540px'; // Force a wider width for high-res export
        wrapper.style.padding = '1rem';
        wrapper.style.backgroundColor = '#1A1D24';

        const clone = sourceElement.cloneNode(true) as HTMLElement;

        const buttonsToRemove = clone.querySelectorAll('.player-card-actions');
        buttonsToRemove.forEach(btn => btn.remove());

        wrapper.appendChild(clone);
        document.body.appendChild(wrapper);

        // Helper to convert image URLs to data URLs to prevent canvas tainting from CORS
        const imageToDataUrl = async (url: string): Promise<string> => {
            try {
                const response = await fetch(url);
                const blob = await response.blob();
                return new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onloadend = () => resolve(reader.result as string);
                    reader.onerror = reject;
                    reader.readAsDataURL(blob);
                });
            } catch (error) {
                console.warn(`Could not convert image to data URL, falling back to original: ${url}`, error);
                return url;
            }
        };

        try {
            // Pre-process all external images in the clone
            const images = Array.from(clone.getElementsByTagName('img'));
            for (const img of images) {
                if (img.src && img.src.startsWith('http')) {
                    img.src = await imageToDataUrl(img.src);
                }
            }

            const canvas = await html2canvas(wrapper, {
                backgroundColor: '#1A1D24',
                scale: 5, // Render at 5x resolution for max quality
                useCORS: true,
                logging: false,
            });

            const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png', 1.0));
            
            if (blob) {
                const filename = `532_Playground_${player.nickname.replace(/\s/g, '_')}_Card.png`;
                const file = new File([blob], filename, { type: 'image/png' });

                if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
                    await navigator.share({ files: [file] });
                } else {
                    const dataUrl = URL.createObjectURL(file);
                    const link = document.createElement('a');
                    link.download = file.name;
                    link.href = dataUrl;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    URL.revokeObjectURL(dataUrl);
                }
            } else {
                 alert(`${t.failedToExportCard} (Could not create image blob)`);
            }
        } catch (error: any) {
            if (error.name !== 'AbortError') {
                console.error("Error exporting player card:", error);
                alert(`${t.failedToExportCard} ${error.message}`);
            }
        } finally {
            document.body.removeChild(wrapper);
        }
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!player) return;
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = async (event) => {
                const base64 = event.target?.result as string;
                if (base64) {
                    const avatar = await cropImageToAvatar(base64);
                    setAllPlayers(prev => prev.map(p => 
                        p.id === player.id 
                            ? { ...p, playerCard: base64, photo: avatar, status: PlayerStatus.Confirmed } 
                            : p
                    ));
                }
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSavePlayer = (updatedPlayer: Player) => {
        setAllPlayers(prev => prev.map(p => p.id === updatedPlayer.id ? updatedPlayer : p));
    };
    
    const handleDeletePlayer = () => {
        setAllPlayers(prev => prev.filter(p => p.id !== player.id));
        setIsDeleteModalOpen(false);
        navigate('/player-database', { replace: true });
    };

    const handleConfirmInitialRating = (initialRating: number) => {
        const tier = getTierForRating(initialRating);
        const updatedPlayer: Player = {
            ...player,
            rating: initialRating,
            status: PlayerStatus.Confirmed,
            tier: tier,
        };
        setAllPlayers(prev => prev.map(p => p.id === player.id ? updatedPlayer : p));
    };

    return (
        <div className="pb-28">
            <input type="file" accept="image/*" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
            <PageHeader title={t.playerProfile} />
            <PlayerEditModal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} onSave={handleSavePlayer} playerToEdit={player} />

            <Modal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} size="sm">
                <h2 className="text-xl font-bold mb-4">{t.deletePlayer}</h2>
                <p className="mb-6">{t.deletePlayerConfirm.replace('{playerName}', player.nickname)}</p>
                <div className="flex justify-end gap-4">
                    <Button variant="secondary" onClick={() => setIsDeleteModalOpen(false)}>{t.cancel}</Button>
                    <Button variant="danger" onClick={handleDeletePlayer}>{t.delete}</Button>
                </div>
            </Modal>

            <Modal isOpen={isInfoModalOpen} onClose={() => setIsInfoModalOpen(false)} size="md">
                 <div className="space-y-4">
                    <div>
                        <h3 className="text-lg font-bold mb-2 flex items-center gap-2">
                           <InfoIcon className="w-5 h-5" /> {t.badges}
                        </h3>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                            {ALL_BADGES.map(badge => (
                                <div key={badge} className="flex items-start gap-2">
                                    <BadgeIcon badge={badge} className="w-6 h-6 mt-0.5 flex-shrink-0" />
                                    <div>
                                        <p className="text-sm font-semibold">{t[`badge_${badge}` as keyof typeof t]}</p>
                                        <p className="text-xs text-dark-text-secondary">{t[`badge_${badge}_desc` as keyof typeof t]}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                     <div className="pt-4 border-t border-white/10">
                        <h3 className="text-lg font-bold mb-2 flex items-center gap-2">
                             <InfoIcon className="w-5 h-5" /> {t.keySkills}
                        </h3>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                            {ALL_SKILLS_INFO.map(skill => (
                                <p key={skill} className="text-sm">{t[`skill_${skill}` as keyof typeof t]}</p>
                            ))}
                        </div>
                    </div>
                </div>
            </Modal>
            
            <div className="max-w-sm mx-auto mt-4">
                <div className="max-w-sm mx-auto">
                    <PlayerCard 
                        player={player} 
                        onEdit={() => setIsEditModalOpen(true)}
                        onDelete={() => setIsDeleteModalOpen(true)}
                        onUploadCard={() => fileInputRef.current?.click()}
                        onConfirmInitialRating={handleConfirmInitialRating}
                        onDownloadCard={handleDownloadCard}
                    />
                </div>
            </div>
        </div>
    );
};