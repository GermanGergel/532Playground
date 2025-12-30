import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApp } from '../context';
import { Button, Modal, useTranslation, PageHeader, Page } from '../ui';
import { PlayerCard, BadgeIcon } from '../features';
import { InfoIcon, StarIcon, XCircle, TrophyIcon, ExclamationIcon, LightbulbIcon, RefreshCw, Users } from '../icons';
import { Player, BadgeType, SkillType, PlayerStatus } from '../types';
import { getTierForRating } from '../services/rating';
import { PlayerEditModal, ShareProfileModal } from '../modals';
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
    const [isShareModalOpen, setIsShareModalOpen] = React.useState(false);
    const [isExporting, setIsExporting] = React.useState(false);
    const [isUploading, setIsUploading] = React.useState(false);
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

    const handleShareProfile = () => {
        if (!player) return;
        setIsShareModalOpen(true);
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
                    reader.onload = () => resolve(reader.result as string);
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
        if (playerForExport && isExporting) { exportImage(); }
    }, [playerForExport, isExporting]);
    
    if (!player) { return null; }

    const ALL_BADGES: BadgeType[] = [
      'goleador', 'perfect_finish', 'dynasty', 'sniper', 'assistant', 'mvp', 
      'decisive_factor', 'unsung_hero', 'first_blood', 'duplet', 'maestro', 
      'comeback_kings', 'fortress', 'club_legend_goals', 'club_legend_assists', 'veteran',
      'session_top_scorer', 'stable_striker', 'victory_finisher', 'session_top_assistant',
      'passing_streak', 'team_conductor', 'ten_influence', 'mastery_balance',
      'key_player', 'win_leader', 'iron_streak', 'undefeated', 'dominant_participant',
      'career_100_wins', 'career_150_influence', 'career_super_veteran',
      'mercenary', 'double_agent', 'joker', 'crisis_manager', 'iron_lung'
    ];
    const ALL_SKILLS_INFO: SkillType[] = ['goalkeeper', 'power_shot', 'technique', 'defender', 'playmaker', 'finisher', 'versatile', 'tireless_motor', 'leader'];

    const handleUploadClick = () => { fileInputRef.current?.click(); };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !player) return;
        setIsUploading(true);
        try {
            const { cardImage, avatarImage } = await processPlayerImageFile(file);
            const uploadPromises = [
                uploadPlayerImage(player.id, avatarImage, 'avatar'),
                uploadPlayerImage(player.id, cardImage, 'card'),
            ];
            const [avatarUrl, cardUrl] = await Promise.all(uploadPromises);
            if (!avatarUrl || !cardUrl) { throw new Error("Cloud upload failed."); }
            const deletePromises = [
                player.photo ? deletePlayerImage(player.photo) : Promise.resolve(),
                player.playerCard ? deletePlayerImage(player.playerCard) : Promise.resolve(),
            ];
            await Promise.all(deletePromises);
            const updatedPlayer: Player = { ...player, photo: avatarUrl, playerCard: cardUrl, status: PlayerStatus.Confirmed };
            setAllPlayers(prev => prev.map(p => p.id === player.id ? updatedPlayer : p));
            await saveSinglePlayerToDB(updatedPlayer);
        } catch (error: any) {
            console.error("Upload failed:", error);
            alert(`Error: ${error.message}`);
        } finally {
            setIsUploading(false);
            if (e.target) { e.target.value = ''; }
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
        const updatedPlayer: Player = { ...player, rating: initialRating, status: PlayerStatus.Confirmed, tier: tier };
        handleSavePlayer(updatedPlayer);
    };

    return (
        <Page>
            {isUploading && (
                <div className="fixed inset-0 z-[100] bg-black/80 flex flex-col items-center justify-center">
                    <div className="w-16 h-16 border-4 border-dark-accent-start border-t-transparent rounded-full animate-spin mb-4"></div>
                    <p className="text-white font-bold text-lg animate-pulse">{t.uploading}</p>
                </div>
            )}
            <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
            <PageHeader title={t.playerProfile}>
                <Button variant="ghost" className="!p-2 -mr-2" onClick={() => setIsInfoModalOpen(true)}>
                    <InfoIcon className="w-6 h-6" />
                </Button>
            </PageHeader>
            <PlayerEditModal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} onSave={handleSavePlayer} playerToEdit={player} />
            <ShareProfileModal isOpen={isShareModalOpen} onClose={() => setIsShareModalOpen(false)} player={player} />

            <Modal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} size="sm">
                <h2 className="text-xl font-bold mb-4">{t.deletePlayer}</h2>
                <p className="mb-6">{t.deletePlayerConfirm.replace('{playerName}', player.nickname)}</p>
                <div className="flex justify-end gap-4">
                    <Button variant="secondary" onClick={() => setIsDeleteModalOpen(false)} className="font-chakra font-bold text-xl tracking-wider">{t.cancel}</Button>
                    <Button variant="danger" onClick={handleDeletePlayer} className="font-chakra font-bold text-xl tracking-wider">{t.delete}</Button>
                </div>
            </Modal>
            
            <Modal 
                isOpen={isInfoModalOpen} 
                onClose={() => setIsInfoModalOpen(false)} 
                size="md" 
                containerClassName="!bg-[#0a0c10] !border !border-[#1e293b] !shadow-2xl overflow-hidden relative !p-0 max-w-md w-full" 
                hideCloseButton
            >
                <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[#00F2FE] to-transparent opacity-100 z-50"></div>
                <div className="absolute top-0 left-0 right-0 h-16 bg-gradient-to-b from-[#00F2FE]/10 to-transparent blur-xl pointer-events-none z-0"></div>

                <button onClick={() => setIsInfoModalOpen(false)} className="absolute top-3 right-3 z-30 text-white/50 hover:text-white transition-colors">
                    <XCircle className="w-6 h-6" />
                </button>
                <div className="p-4 max-h-[85vh] overflow-y-auto no-scrollbar relative z-10">
                    <div className="space-y-10">
                        <section>
                            <h3 className="text-lg font-black mb-3 flex items-center gap-2 text-white">
                                <InfoIcon className="w-5 h-5 text-dark-accent-start" /> {t.ratingCalculationTitle}
                            </h3>
                            <p className="text-[11px] text-white/70 leading-relaxed mb-4">{t.ratingCalculationDesc}</p>
                            <div className="grid grid-cols-2 gap-2 bg-dark-bg/40 p-3 rounded-xl border border-white/5">
                                {[
                                    t.ratingExampleWinStrong, t.ratingExampleWinClose, t.ratingExampleDraw,
                                    t.ratingExampleLossClose, t.ratingExampleLossHeavy, t.ratingExampleGoal,
                                    t.ratingExampleAssist, t.ratingExampleCleanSheet
                                ].map((ex, i) => (
                                    <div key={i} className="flex items-start gap-2 text-[9px] text-white/60 leading-tight">
                                        <div className="w-1 h-1 rounded-full bg-dark-accent-start mt-1 shrink-0"></div>
                                        {ex}
                                    </div>
                                ))}
                            </div>
                            <div className="grid grid-cols-2 gap-2 mt-2">
                                <div className="p-2 bg-amber-500/5 border border-amber-500/20 rounded-lg">
                                    <h5 className="text-[9px] font-black text-amber-500 uppercase flex items-center gap-1">
                                        <RefreshCw className="w-3 h-3" /> {t.infoInactivityTitle}
                                    </h5>
                                    <p className="text-[8px] text-white/50 leading-tight mt-1">{t.infoInactivityDesc}</p>
                                </div>
                                <div className="p-2 bg-blue-500/5 border border-blue-500/20 rounded-lg">
                                    <h5 className="text-[9px] font-black text-blue-400 uppercase flex items-center gap-1">
                                        🛡️ Safety
                                    </h5>
                                    <p className="text-[8px] text-white/50 leading-tight mt-1">{t.infoRatingProtection}</p>
                                </div>
                            </div>
                        </section>

                        <section className="pt-4 border-t border-white/5">
                            <h3 className="text-lg font-black mb-3 flex items-center gap-2 text-white">
                                <Users className="w-5 h-5 text-purple-500" /> {t.infoLegionnaireTitle}
                            </h3>
                            <div className="p-3 bg-purple-500/5 border border-purple-500/10 rounded-xl">
                                <p className="text-[10px] text-white/70 leading-relaxed">{t.infoLegionnaireDesc}</p>
                                <div className="flex gap-1.5 mt-2">
                                    <span className="px-1.5 py-0.5 bg-purple-500/10 border border-purple-500/20 rounded text-[7px] font-black text-purple-300 uppercase tracking-wider">Mercenary</span>
                                    <span className="px-1.5 py-0.5 bg-purple-500/10 border border-purple-500/20 rounded text-[7px] font-black text-purple-300 uppercase tracking-wider">Iron Lung</span>
                                </div>
                            </div>
                        </section>

                        <section className="pt-4 border-t border-white/5">
                            <h3 className="text-lg font-black mb-3 flex items-center gap-2 text-white">
                                <ExclamationIcon className="w-5 h-5 text-red-500" /> {t.disciplineTitle}
                            </h3>
                            <div className="grid grid-cols-1 gap-2">
                                <div className="p-3 bg-red-500/5 border border-red-500/20 rounded-xl">
                                    <div className="flex justify-between items-start mb-1">
                                        <span className="text-[10px] font-black text-white uppercase">{t.ruleHandballTitle}</span>
                                        <span className="text-[8px] font-black bg-red-500 text-white px-1.5 rounded">1 MIN</span>
                                    </div>
                                    <p className="text-[9px] text-white/50">{t.ruleHandballDesc}</p>
                                </div>
                                <div className="p-3 bg-white/5 border border-white/10 rounded-xl">
                                    <div className="flex justify-between items-start mb-1">
                                        <span className="text-[10px] font-black text-white uppercase">{t.ruleNoShowTitle}</span>
                                        <span className="text-[8px] font-black text-dark-accent-start">50K VND</span>
                                    </div>
                                    <p className="text-[9px] text-white/50">{t.ruleNoShowDesc}</p>
                                </div>
                                <div className="p-3 bg-white/5 border border-white/10 rounded-xl">
                                    <div className="flex justify-between items-start mb-1">
                                        <span className="text-[10px] font-black text-white uppercase">{t.ruleLateTitle}</span>
                                        <span className="text-[8px] font-black text-dark-accent-start">20K VND</span>
                                    </div>
                                    <p className="text-[9px] text-white/50">{t.ruleLateDesc}</p>
                                </div>
                            </div>
                        </section>

                        <section className="pt-4 border-t border-white/5">
                            <h3 className="text-lg font-black mb-3 flex items-center gap-2 text-white">
                                <LightbulbIcon className="w-5 h-5 text-emerald-500" /> {t.badgeBonusTitle}
                            </h3>
                            <div className="space-y-2">
                                <p className="text-[10px] text-white/60">{t.badgeBonusDesc}</p>
                                <div className="grid grid-cols-2 gap-2">
                                    <div className="p-2 bg-emerald-500/5 border border-emerald-500/20 rounded-lg">
                                        <span className="text-[9px] font-black text-white">{t.badgeBonusMvp}</span>
                                    </div>
                                    <div className="p-2 bg-emerald-500/5 border border-emerald-500/20 rounded-lg">
                                        <span className="text-[9px] font-black text-white">{t.badgeBonusTopScorer}</span>
                                    </div>
                                </div>
                            </div>
                        </section>

                        <div className="pt-4 border-t border-white/5">
                            <h3 className="text-lg font-black mb-4 flex items-center gap-2 text-white">
                                <TrophyIcon className="w-5 h-5 text-yellow-500" /> {t.badges}
                            </h3>
                            <div className="space-y-4">
                                {ALL_BADGES.map(badge => (
                                    <div key={badge} className="flex items-start gap-3">
                                        <BadgeIcon badge={badge} className="w-8 h-8 flex-shrink-0" />
                                        <div>
                                            <p className="text-sm font-bold leading-tight text-white">{t[`badge_${badge}` as keyof typeof t]}</p>
                                            <p className="text-[10px] text-dark-text-secondary leading-snug mt-0.5">{t[`badge_${badge}_desc` as keyof typeof t]}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="pt-4 border-t border-white/5">
                             <h3 className="text-lg font-black mb-3 flex items-center gap-2 text-white">
                                <StarIcon className="w-5 h-5 text-dark-accent-start" /> {t.keySkills}
                            </h3>
                            <div className="grid grid-cols-2 gap-x-4 gap-y-2 pb-6">
                                {ALL_SKILLS_INFO.map(skill => (
                                    <div key={skill} className="flex items-center gap-2">
                                        <StarIcon className="w-3 h-3 text-dark-accent-start flex-shrink-0 opacity-50" />
                                        <p className="text-xs text-white/80">{t[`skill_${skill}` as keyof typeof t]}</p>
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
                    <ExportPlayerCard player={playerForExport} allPlayers={allPlayers} />
                </div>
            )}
        </Page>
    );
};