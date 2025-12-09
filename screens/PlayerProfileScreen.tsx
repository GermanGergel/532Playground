
import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApp } from '../context';
import { Button, Modal, useTranslation, PageHeader, Page } from '../ui';
import { PlayerCard, BadgeIcon } from '../features';
import { InfoIcon, StarIcon, XCircle } from '../icons';
import { Player, BadgeType, SkillType, PlayerStatus } from '../types';
import { getTierForRating } from '../services/rating';
import { PlayerEditModal } from '../modals';
import { processPlayerImageFile } from '../lib';
import { saveSinglePlayerToDB, uploadPlayerImage, deletePlayerImage } from '../db';
import html2canvas from 'html2canvas';
import { ExportPlayerCard } from '../components/ExportPlayerCard';


export const PlayerProfileScreen: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const { allPlayers, setAllPlayers } = useApp();
    const t = useTranslation();
    const navigate = useNavigate();

    const [isEditModalOpen, setIsEditModalOpen] = React.useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = React.useState(false);
    const [isInfoModalOpen, setIsInfoModalOpen] = React.useState(false);
    const [isExporting, setIsExporting] = React.useState(false);
    const [playerForExport, setPlayerForExport] = React.useState<Player | null>(null);
    
    const exportCardRef = React.useRef<HTMLDivElement>(null);

    const fileInputRef = React.useRef<HTMLInputElement>(null);
    
    const player = allPlayers.find(p => p.id === id);

    React.useEffect(() => {
        if (!player) {
            const timer = setTimeout(() => {
                if (allPlayers.length > 0 && !allPlayers.find(p => p.id === id)) {
                    navigate('/player-database', { replace: true });
                }
            }, 500);
            return () => clearTimeout(timer);
        }
    }, [player, allPlayers, id, navigate]);

    const handleShareProfile = async () => {
        if (!player) return;
    
        const shareUrl = new URL(`/public-profile/${player.id}`, window.location.origin).href;
    
        if (navigator.share) {
            try {
                await navigator.share({
                    title: `532 Playground Profile: ${player.nickname}`,
                    text: `Check out ${player.nickname}'s player card!\n${shareUrl}`, // Include URL in text for Telegram/WhatsApp
                    url: shareUrl,
                });
            } catch (error: any) {
                if (error.name !== 'AbortError') {
                    console.error('Share API failed:', error);
                    await navigator.clipboard.writeText(shareUrl);
                    alert('Sharing failed. Link copied to clipboard!');
                }
            }
        } else {
            await navigator.clipboard.writeText(shareUrl);
            alert('Link copied to clipboard!');
        }
    };

    const handleDownloadCard = async () => {
        if (!player || isExporting) return;
        setIsExporting(true);

        try {
            let exportablePlayer = { ...player };
            if (player.playerCard && player.playerCard.startsWith('http')) {
                const response = await fetch(player.playerCard);
                if (!response.ok) {
                    throw new Error(`Failed to fetch player card image. Status: ${response.status}`);
                }
                const blob = await response.blob();
                const dataUrl = await new Promise<string>((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onloadend = () => resolve(reader.result as string);
                    reader.onerror = reject;
                    reader.readAsDataURL(blob);
                });
                exportablePlayer.playerCard = dataUrl;
            }
            setPlayerForExport(exportablePlayer);
        } catch (error) {
            console.error("Error preparing card for export:", error);
            alert('Failed to prepare card image for export. The image might be inaccessible.');
            setIsExporting(false);
        }
    };

    React.useEffect(() => {
        const exportImage = async () => {
            if (!playerForExport || !exportCardRef.current) return;

            await new Promise(resolve => setTimeout(resolve, 500)); 

            try {
                const elementToCapture = exportCardRef.current.querySelector('#export-card-to-capture');
                if (!elementToCapture) throw new Error("Export element not found");
                
                const canvas = await html2canvas(elementToCapture as HTMLElement, {
                  backgroundColor: '#1A1D24',
                  scale: 4, 
                  useCORS: true,
                  allowTaint: true,
                  imageTimeout: 0,
                  logging: false,
                });
        
                const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png', 1.0));
                
                if (blob) {
                    const filename = `532_Playground_${playerForExport.nickname.replace(/\s/g, '_')}_Card.png`;
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
                setIsExporting(false);
                setPlayerForExport(null);
            }
        };

        if (playerForExport && isExporting) {
            exportImage();
        }
    }, [playerForExport, isExporting]);
    

    if (!player) {
        return null;
    }

    const ALL_BADGES: BadgeType[] = [
      'goleador', 'perfect_finish', 'dynasty', 'sniper', 'assistant', 'mvp', 
      'decisive_factor', 'unsung_hero', 'first_blood', 'duplet', 'maestro', 
      'comeback_kings', 'fortress', 'club_legend_goals', 'club_legend_assists', 'veteran',
      'session_top_scorer', 'stable_striker', 'victory_finisher', 'session_top_assistant',
      'passing_streak', 'team_conductor', 'ten_influence', 'mastery_balance',
      'key_player', 'win_leader', 'iron_streak', 'undefeated', 'dominant_participant',
      'career_100_wins', 'career_150_influence', 'career_super_veteran'
    ];
    const ALL_SKILLS_INFO: SkillType[] = ['goalkeeper', 'power_shot', 'technique', 'defender', 'playmaker', 'finisher', 'versatile', 'tireless_motor', 'leader'];

    const handleUploadClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !player) return;

        try {
            const { cardImage, avatarImage } = await processPlayerImageFile(file);
            const uploadPromises = [
                uploadPlayerImage(player.id, avatarImage, 'avatar'),
                uploadPlayerImage(player.id, cardImage, 'card'),
            ];
            
            const deletePromises = [
                player.photo ? deletePlayerImage(player.photo) : Promise.resolve(),
                player.playerCard ? deletePlayerImage(player.playerCard) : Promise.resolve(),
            ];

            const [avatarUrl, cardUrl] = await Promise.all(uploadPromises);
            await Promise.all(deletePromises);

            const updatedPlayer: Player = {
                ...player,
                photo: avatarUrl || player.photo,
                playerCard: cardUrl || player.playerCard,
                status: PlayerStatus.Confirmed,
            };
            
            setAllPlayers(prev => prev.map(p => p.id === player.id ? updatedPlayer : p));
            await saveSinglePlayerToDB(updatedPlayer);

        } catch (error) {
            console.error("Image processing or upload failed:", error);
            alert("Failed to upload image. It might be too large or in an unsupported format.");
        } finally {
            if (e.target) {
                e.target.value = '';
            }
        }
    };


    const handleSavePlayer = async (updatedPlayer: Player) => {
        setAllPlayers(prev => prev.map(p => p.id === updatedPlayer.id ? updatedPlayer : p));
        await saveSinglePlayerToDB(updatedPlayer);
    };
    
    const handleDeletePlayer = async () => {
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
        handleSavePlayer(updatedPlayer);
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
                    <Button variant="secondary" onClick={() => setIsDeleteModalOpen(false)} className="font-chakra font-bold text-xl tracking-wider">{t.cancel}</Button>
                    <Button variant="danger" onClick={handleDeletePlayer} className="font-chakra font-bold text-xl tracking-wider">{t.delete}</Button>
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
                onShareProfile={handleShareProfile}
                isDownloading={isExporting}
            />

            {playerForExport && (
                <div ref={exportCardRef} style={{ position: 'fixed', left: '-9999px', top: 0, zIndex: -10 }}>
                    <ExportPlayerCard 
                        player={playerForExport} 
                        allPlayers={allPlayers}
                    />
                </div>
            )}
        </Page>
    );
};
