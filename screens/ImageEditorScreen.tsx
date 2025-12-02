import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApp } from '../context';
import { Page, Button, Card, useTranslation, PageHeader } from '../components';
import { Upload } from '../components';
import { PlayerStatus } from '../types';
import { cropImageToAvatar } from '../lib';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { resizeImage } from './utils';

export const ImageEditorScreen: React.FC = () => {
    const { id: playerId } = useParams<{ id: string }>();
    const { allPlayers, setAllPlayers } = useApp();
    const navigate = useNavigate();
    const t = useTranslation();
    
    // Image State
    const [baseImage, setBaseImage] = React.useState<string | null>(null);
    const [editedImage, setEditedImage] = React.useState<string | null>(null);
    const [isLoading, setIsLoading] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);
    const [cooldown, setCooldown] = React.useState(0);
    const fileInputRef = React.useRef<HTMLInputElement>(null);
    const [bodyType, setBodyType] = React.useState<'Slim' | 'Average' | 'Stocky'>('Average');

    const player = allPlayers.find(p => p.id === playerId);
    
    React.useEffect(() => {
        if (cooldown > 0) {
            const timer = setInterval(() => setCooldown(c => c - 1), 1000);
            return () => clearInterval(timer);
        }
    }, [cooldown]);
    
    React.useEffect(() => {
        if (player) {
            setBaseImage(player.photo || null);
            setEditedImage(null);
        }
    }, [player]);


    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                setBaseImage(event.target?.result as string);
                setEditedImage(null);
            };
            reader.readAsDataURL(file);
        }
    };
    
    const handleGenerate = async () => {
        if (!baseImage) {
            alert(t.uploadImageFirst);
            return;
        }
        
        // Use the standard Vite env var access method
        // @ts-ignore
        const apiKey = typeof import.meta !== 'undefined' ? import.meta.env.API_KEY : process.env.API_KEY;
        if (!apiKey) {
            console.error("API Key is missing!");
            setError("API Key is missing!");
            return;
        }

        setIsLoading(true);
        setError(null);
        
        try {
            const resizedBase64 = await resizeImage(baseImage);
            
            // CORRECTED: Use the right SDK class and initialization
            const genAI = new GoogleGenerativeAI(apiKey);
            const model = genAI.getGenerativeModel({ model: "gemini-pro-vision" });

            const base64Data = resizedBase64.split(',')[1];
            const mimeType = resizedBase64.match(/data:(.*);base64,/)?.[1] || 'image/png';
            
            // CORRECTED: Image part format for the generative-ai SDK
            const imagePart = { inlineData: { data: base64Data, mimeType } };
            
            let buildDescription = `a ${bodyType.toLowerCase()} build`;
            if (bodyType === 'Stocky') {
                buildDescription = 'a powerfully built, athletic physique, around 80-90kg, typical for a professional European footballer, strong but not overly muscular like an American football player';
            }

            const prompt = `
Create an ultra-realistic, cinematic football player portrait card in a cutting-edge, professional sports photography style.

**ABSOLUTE CRITICAL INSTRUCTION: The player's unique facial features, hairstyle, and identity from the provided photo must be preserved with maximum fidelity. Any corrections must be minimal and almost unnoticeable. The goal is to enhance, not replace.**

PLAYER:
A male footballer with ${buildDescription}, posed in a strictly front-facing portrait from the waist up. **His hands must be held behind his back, completely out of view.** He must have a **serious, focused expression**. **ABSOLUTE REQUIREMENT: The player must look directly into the camera, with their head facing forward without any tilt or rotation.**

JERSEY & LOGO:
The player wears a sleek, modern football jersey made from a high-tech, matte black fabric. The fabric features a **subtle yet distinct geometric carbon fiber weave pattern** that is visible across the entire jersey, catching the light dynamically and giving it a technological, high-end look.
**MOST CRITICAL INSTRUCTION: A '532' logo MUST BE PLACED directly in the CENTER OF THE CHEST. The logo should be significantly smaller than a standard club crest, maintaining a minimalist and refined aesthetic.** The logo must be made from a **hyper-realistic, high-gloss, jet-black polymer**, appearing as if it's a separate, polished piece seamlessly bonded to the matte carbon fabric. The glossy black of the logo should create a sophisticated 'black-on-black' tonal contrast with the matte texture of the jersey.

BACKGROUND:
The background must be completely minimalist and clean, with **absolutely no objects or distracting elements**. It should be a deep, cinematic gradient transitioning from a dark **charcoal grey** to near-black.

LIGHTING:
A sophisticated and dramatic three-point lighting setup is essential.
1.  **Key Light:** A soft, directional light from the side that sculpts the player's features, creating depth and subtle shadows.
2.  **Rim Light:** A crisp but subtle **bright, neutral white or very light grey light** from behind. This light should trace the silhouette of the player's shoulders and torso, creating separation from the dark background. **CRITICAL LIGHTING NOTE: This light MUST NOT illuminate the player's hands behind his back.**
3.  **Fill Light:** A very subtle, diffused light from the front-bottom to gently lift the darkest shadows on the jersey, ensuring its texture is visible without flattening the image.

TECHNICAL:
8K ultra-high resolution, photorealistic quality. Shot with an 85mm portrait lens effect for a shallow depth of field, with tack-sharp focus on the player's face. Cinematic color grading.

STYLE:
An epic, powerful, and premium mood. The aesthetic should be clean and professional, inspired by high-end Nike or Adidas athlete campaigns.
`.trim();

            // CORRECTED: API call syntax for the generative-ai SDK
            const result = await model.generateContent([prompt, imagePart]);
            const response = await result.response;

            const imagePartResponse = response.candidates?.[0]?.content?.parts.find(p => p.inlineData);

            if (imagePartResponse?.inlineData) {
                const newImageBase64 = imagePartResponse.inlineData.data;
                const newMimeType = imagePartResponse.inlineData.mimeType;
                setEditedImage(`data:${newMimeType};base64,${newImageBase64}`);
            } else {
                const textResponse = response.text();
                console.log(textResponse);
                throw new Error("No image data found in response. " + (textResponse || ''));
            }
        } catch (err: any) {
            console.error(err);
            const isQuota = 
                err.status === 429 || 
                (err.message && (err.message.includes('429') || err.message.includes('Quota') || err.message.includes('quota') || err.message.includes('RESOURCE_EXHAUSTED'))) ||
                (err.response && err.response.status === 429) ||
                (err.error && err.error.code === 429);

            if (isQuota) {
                setError(t.quotaExceeded);
                setCooldown(60); // Start 60s cooldown
            } else {
                setError(t.errorGenerating);
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handleSaveToProfile = async () => {
        if (!playerId || !player) return;

        const imageToSave = editedImage || baseImage;

        if (!imageToSave) {
            navigate(`/player/${playerId}`, { replace: true });
            return;
        }

        const avatarDataUrl = await cropImageToAvatar(imageToSave);
            
        setAllPlayers(prev => prev.map(p => 
            p.id === playerId ? { 
                ...p, 
                photo: avatarDataUrl,
                playerCard: imageToSave,
                status: PlayerStatus.Confirmed 
            } : p
        ));
        
        navigate(`/player/${playerId}`, { replace: true });
    };
    
    return (
        <Page>
             <PageHeader title={t.imageEditorTitle} />
             <input type="file" accept="image/*" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
             
            <div className="space-y-3">
                 <Card className="!p-4 shadow-lg shadow-dark-accent-start/20 border border-dark-accent-start/40">
                    <div className="min-h-[320px] flex items-center justify-center rounded-lg bg-dark-bg/50 mb-3">
                        {baseImage ? (
                            <img src={editedImage || baseImage} alt="Preview" className="max-h-[320px] object-contain rounded-lg" />
                        ) : (
                            <span className="text-dark-text-secondary text-center p-4">{t.uploadPrompt}</span>
                        )}
                    </div>
                    <Button variant="secondary" onClick={() => fileInputRef.current?.click()} className="w-full !py-2.5 flex items-center justify-center gap-3 !text-base">
                        <Upload className="w-5 h-5" /> {baseImage ? t.changeImage : t.uploadImage}
                    </Button>
                </Card>
                
                {baseImage && (
                    <Card className="!p-2 shadow-lg shadow-dark-accent-start/20 border border-dark-accent-start/40">
                        <div className="flex justify-around bg-dark-bg rounded-lg overflow-hidden">
                            <button onClick={() => setBodyType('Slim')} className={`flex-1 text-sm py-2 font-bold transition-all duration-300 rounded-lg ${bodyType === 'Slim' ? 'gradient-bg text-dark-bg' : 'text-dark-text-secondary hover:bg-dark-surface'}`}>{t.bodySlim}</button>
                            <button onClick={() => setBodyType('Average')} className={`flex-1 text-sm py-2 font-bold transition-all duration-300 rounded-lg ${bodyType === 'Average' ? 'gradient-bg text-dark-bg' : 'text-dark-text-secondary hover:bg-dark-surface'}`}>{t.bodyAverage}</button>
                            <button onClick={() => setBodyType('Stocky')} className={`flex-1 text-sm py-2 font-bold transition-all duration-300 rounded-lg ${bodyType === 'Stocky' ? 'gradient-bg text-dark-bg' : 'text-dark-text-secondary hover:bg-dark-surface'}`}>{t.bodyStocky}</button>
                        </div>
                    </Card>
                )}

                {baseImage && (
                    <Button onClick={handleGenerate} disabled={!baseImage || isLoading || cooldown > 0} variant="secondary" className="w-full !py-2.5 shadow-lg shadow-dark-accent-start/20 hover:shadow-dark-accent-start/40">
                        {isLoading ? t.generating : (cooldown > 0 ? `Wait ${cooldown}s...` : `GENERATE PRO CARD`)}
                    </Button>
                )}
                 {isLoading && <div className="text-center p-1 text-sm text-dark-accent-start animate-pulse">Creating 532 Professional Player...</div>}
                 {error && <div className="text-center p-1 text-sm text-dark-danger">{error}</div>}
                
                <div className="pt-2">
                    <Button variant="secondary" onClick={handleSaveToProfile} disabled={!editedImage && !baseImage} className="w-full !py-3 shadow-lg shadow-dark-accent-start/20 hover:shadow-dark-accent-start/40">
                        {t.saveToProfile}
                    </Button>
                </div>
            </div>
        </Page>
    );
};