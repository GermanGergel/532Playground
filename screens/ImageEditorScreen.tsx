import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApp } from '../context';
import { Page, Button, Card, useTranslation, PageHeader } from '../components';
import { Upload } from '../components';
import { PlayerStatus } from '../types';
import { cropImageToAvatar } from '../lib';
import { resizeImage } from './utils';

export const ImageEditorScreen: React.FC = () => {
    const { id: playerId } = useParams<{ id: string }>();
    const { allPlayers, setAllPlayers } = useApp();
    const navigate = useNavigate();
    const t = useTranslation();
    
    // Simplified state for managing the uploaded image
    const [image, setImage] = React.useState<string | null>(null);
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    const player = allPlayers.find(p => p.id === playerId);
    
    // Load player's current card image on component mount
    React.useEffect(() => {
        if (player) {
            setImage(player.playerCard || player.photo || null);
        }
    }, [player]);


    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = async (event) => {
                const base64 = event.target?.result as string;
                // Resize to prevent storing excessively large images
                const resized = await resizeImage(base64, 1080);
                setImage(resized);
            };
            reader.readAsDataURL(file);
        }
    };
    
    const handleDownload = async () => {
        if (!image || !player) return;

        try {
            const blob = await (await fetch(image)).blob();
            const filename = `532_Playground_${player.nickname.replace(/\s/g, '_')}_Card.png`;
            const file = new File([blob], filename, { type: 'image/png' });

            if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
                await navigator.share({
                    files: [file],
                    title: `Player Card for ${player.nickname}`,
                });
            } else {
                const link = document.createElement('a');
                link.href = image;
                link.download = filename;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            }
        } catch (error: any) {
            if (error.name !== 'AbortError') {
                console.error("Error downloading image:", error);
                alert("Failed to download image.");
            }
        }
    };


    const handleSaveToProfile = async () => {
        if (!playerId || !player || !image) {
            navigate(`/player/${playerId}`, { replace: true });
            return;
        }

        const avatarDataUrl = await cropImageToAvatar(image);
            
        setAllPlayers(prev => prev.map(p => 
            p.id === playerId ? { 
                ...p, 
                photo: avatarDataUrl,
                playerCard: image,
                status: PlayerStatus.Confirmed 
            } : p
        ));
        
        navigate(`/player/${playerId}`, { replace: true });
    };
    
    return (
        <Page>
             <PageHeader title={t.imageEditorTitle} />
             <input type="file" accept="image/*" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
             
            <div className="space-y-4">
                 <Card className="!p-4 shadow-lg shadow-dark-accent-start/20 border border-dark-accent-start/40">
                    <div className="min-h-[320px] flex items-center justify-center rounded-lg bg-dark-bg/50 mb-4">
                        {image ? (
                            <img src={image} alt="Preview" className="max-h-[320px] w-auto object-contain rounded-lg" />
                        ) : (
                            <span className="text-dark-text-secondary text-center p-4">{t.uploadPrompt}</span>
                        )}
                    </div>
                    <Button variant="secondary" onClick={() => fileInputRef.current?.click()} className="w-full !py-3 flex items-center justify-center gap-3 !text-base">
                        <Upload className="w-5 h-5" /> {image ? t.changeImage : t.uploadImage}
                    </Button>
                </Card>
                
                <div className="pt-2 space-y-3">
                    {image && (
                        <Button 
                            onClick={handleDownload} 
                            variant="secondary" 
                            className="w-full !py-3 shadow-lg shadow-dark-accent-start/20 hover:shadow-dark-accent-start/40"
                        >
                            {t.downloadImage}
                        </Button>
                    )}

                    <Button 
                        variant="secondary" 
                        onClick={handleSaveToProfile} 
                        disabled={!image} 
                        className="w-full !py-3 shadow-lg shadow-dark-accent-start/20 hover:shadow-dark-accent-start/40"
                    >
                        {t.saveToProfile}
                    </Button>
                </div>
            </div>
        </Page>
    );
};