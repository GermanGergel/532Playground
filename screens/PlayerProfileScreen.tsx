import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApp } from '../context';
// FIX: Imported BadgeIcon component.
// FIX: Import directly from component files instead of barrel file to avoid import errors.
import { Button, Modal, useTranslation, PageHeader, Page } from '../ui';
import { PlayerCard, BadgeIcon } from '../features';
import { InfoIcon, StarIcon, XCircle } from '../icons';
import { Player, BadgeType, SkillType, PlayerStatus } from '../types';
import { getTierForRating } from '../services/rating';
import { formatDate } from '../services/export';
import { PlayerEditModal } from '../modals';
import { cropImageToAvatar } from '../lib';
import html2canvas from 'html2canvas'; // Import html2canvas

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
        // This is the restored, working logic.
        // If the component renders and the player isn't found (even after data loading),
        // it navigates away. If data is still loading, it simply returns null and waits for a re-render.
        if (!player) {
            const timer = setTimeout(() => {
                // Check again after a short delay to ensure data has had a chance to load.
                if (allPlayers.length > 0 && !allPlayers.find(p => p.id === id)) {
                    navigate('/player-database', { replace: true });
                }
            }, 500); // A small delay to prevent navigating away during data load.
            return () => clearTimeout(timer);
        }
    }, [player, allPlayers, id, navigate]);

    // If the player isn't available on the first render, return null and let the useEffect handle it.
    // This prevents rendering an empty state and avoids crashes.
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
            return;
        }

        const wrapper = document.createElement('div');
        wrapper.style.position = 'fixed';
        wrapper.style.left = '-9999px';
        wrapper.style.top = '0';
        wrapper.style.width = '540px'; // Force a wider width
        wrapper.style.padding = '1rem'; // Add some padding to match original look
        wrapper.style.backgroundColor = '#1A1D24'; // Match body background

        const clone = sourceElement.cloneNode(true) as HTMLElement;

        // Remove action buttons from the clone to prevent them from appearing in the image
        const buttonsToRemove = clone.querySelectorAll('.player-card-actions');
        buttonsToRemove.forEach(btn => btn.remove());

        wrapper.appendChild(clone);
        document.body.appendChild(wrapper);

        try {
            const canvas = await html2canvas(wrapper, { // Use imported html2canvas
                backgroundColor: '#1A1D24', // Explicitly set background
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
            }
        } catch (error: any) {
            if (error.name !== 'AbortError') {
                console.error("Error exporting player card:", error);
                alert('Failed to export player card.');
            }
        } finally {
            document.body.removeChild(wrapper);
        }
    };

    const handleUploadClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file && player) {
            const reader = new FileReader();
            reader.onload = async (event) => {
                const base64Image = event.target?.result as string;
                if (base64Image) {
                    const avatarDataUrl = await cropImageToAvatar(base64Image);
                    setAllPlayers(prev => prev.map(p =>
                        p.id === player.id ? {
                            ...p,
                            photo: avatarDataUrl,
                            playerCard: base64Image,
                            status: PlayerStatus.Confirmed
                        } : p
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
        <Page>
            <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/*"
                className="hidden"
            />
            <PageHeader title={t.playerProfile}>
                <Button variant="ghost" className="!p-2 -mr-2" onClick={() => setIsInfoModalOpen(true)}>
                    <InfoIcon className="w-6 h-6" />
                </Button>
            </PageHeader>
            <PlayerEditModal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} onSave={handleSavePlayer} playerToEdit={player} />

            <Modal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} size="sm">
                <h2 className="text-xl font-bold mb-4">{t.deletePlayer}</h2>
                <p className="mb-6">{t.deletePlayerConfirm.replace('{playerName}', player.nickname)}</p>
                <div className="flex justify-end gap-4">
                    <Button variant="secondary" onClick={() => setIsDeleteModalOpen(false)}>{t.cancel}</Button>
                    <Button variant="danger" onClick={handleDeletePlayer}>{t.delete}</Button>
                </div>
            </Modal>
            
            <Modal isOpen={isInfoModalOpen} onClose={() => setIsInfoModalOpen(false)} size="xs" containerClassName="!p-0" hideCloseButton>
                <button onClick={() => setIsInfoModalOpen(false)} className="absolute top-3 right-3 z-20 text-dark-text-secondary hover:text-white transition-colors">
                    <XCircle className="w-6 h-6" />
                </button>
                <div className="p-4 max-h-[75vh] overflow-y-auto">
                    <div className="space-y-6">
                        <div>
                            <h3 className="text-lg font-bold mb-3 flex items-center gap-2">
                                <InfoIcon className="w-5 h-5" /> {t.badges}
                            </h3>
                            <div className="space-y-4 pt-2">
                                {ALL_BADGES.map(badge => (
                                    <div key={badge} className="flex items-start gap-3">
                                        <BadgeIcon badge={badge} className="w-8 h-8 flex-shrink-0" />
                                        <div>
                                            <p className="text-sm font-semibold leading-tight">{t[`badge_${badge}` as keyof typeof t]}</p>
                                            <p className="text-xs text-dark-text-secondary leading-snug mt-0.5">{t[`badge_${badge}_desc` as keyof typeof t]}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="pt-4 border-t border-white/10">
                             <h3 className="text-lg font-bold mb-3 flex items-center gap-2">
                                <InfoIcon className="w-5 h-5" /> {t.keySkills}
                            </h3>
                            <div className="grid grid-cols-1 gap-x-4 gap-y-2 pt-2">
                                {ALL_SKILLS_INFO.map(skill => (
                                    <div key={skill} className="flex items-center gap-2">
                                        <StarIcon className="w-3 h-3 text-dark-accent-start flex-shrink-0" />
                                        <p className="text-sm">{t[`skill_${skill}` as keyof typeof t]}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </Modal>
            
            <PlayerCard 
                player={player} 
                onEdit={() => setIsEditModalOpen(true)}
                onDelete={() => setIsDeleteModalOpen(true)}
                onUploadCard={handleUploadClick}
                onConfirmInitialRating={handleConfirmInitialRating}
                onDownloadCard={handleDownloadCard}
            />
        </Page>
    );
};