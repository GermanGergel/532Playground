
import React, { useState, useEffect, useRef } from 'react';
import { Page, PageHeader, Button, Card, useTranslation } from '../ui';
import { Upload, Image } from '../icons';
import { processPlayerImageFile } from '../lib';
import { savePromoData, loadPromoData, uploadPromoImage, isSupabaseConfigured } from '../db';
import { PromoData } from '../types';

export const PromoAdminScreen: React.FC = () => {
    const t = useTranslation();
    const [nickname, setNickname] = useState('');
    const [surname, setSurname] = useState('');
    const [photoUrl, setPhotoUrl] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const load = async () => {
            setIsLoading(true);
            const data = await loadPromoData();
            if (data) {
                setNickname(data.nickname);
                setSurname(data.surname);
                setPhotoUrl(data.photoUrl);
            }
            setIsLoading(false);
        };
        load();
    }, []);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsSaving(true); // repurpose loading indicator for processing
        try {
            // Process to high quality JPG
            const { cardImage } = await processPlayerImageFile(file);
            
            // Upload to Supabase Storage immediately to get URL
            const publicUrl = await uploadPromoImage(cardImage);
            
            if (publicUrl) {
                setPhotoUrl(publicUrl);
            } else {
                alert("Failed to upload image to Cloud. Check Supabase config.");
            }
        } catch (err) {
            console.error(err);
            alert("Error processing image.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleSave = async () => {
        if (!nickname) {
            alert("Nickname is required");
            return;
        }
        
        setIsSaving(true);
        const data: PromoData = {
            nickname,
            surname,
            photoUrl
        };
        
        const success = await savePromoData(data);
        setIsSaving(false);
        
        if (success) {
            alert("Promo Player Saved Successfully!");
        } else {
            alert("Failed to save to database. Is Supabase connected?");
        }
    };

    if (!isSupabaseConfigured()) {
        return (
            <Page>
                <PageHeader title="Promo Admin" />
                <Card className="bg-red-900/50 border-red-500">
                    <p className="text-center text-white">
                        Database connection required. Please configure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.
                    </p>
                </Card>
            </Page>
        );
    }

    return (
        <Page>
            <PageHeader title="Configure Promo Player" />
            
            <div className="space-y-6 max-w-sm mx-auto">
                <Card className="p-4 border border-dark-accent-start/30 shadow-[0_0_20px_rgba(0,242,254,0.1)]">
                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-dark-text-secondary uppercase mb-1">Nickname</label>
                            <input 
                                type="text" 
                                value={nickname} 
                                onChange={e => setNickname(e.target.value)}
                                className="w-full p-3 bg-dark-bg rounded-lg border border-white/10 text-white focus:border-dark-accent-start focus:outline-none"
                                placeholder="MAVERICK"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-dark-text-secondary uppercase mb-1">Surname (Optional)</label>
                            <input 
                                type="text" 
                                value={surname} 
                                onChange={e => setSurname(e.target.value)}
                                className="w-full p-3 bg-dark-bg rounded-lg border border-white/10 text-white focus:border-dark-accent-start focus:outline-none"
                                placeholder="LEGEND"
                            />
                        </div>
                    </div>
                </Card>

                <Card className="p-4 border border-dark-accent-start/30 flex flex-col items-center gap-4">
                    <div className="relative w-full aspect-[3/4] bg-dark-bg rounded-xl overflow-hidden border border-white/10 flex items-center justify-center">
                        {photoUrl ? (
                            <img src={photoUrl} alt="Preview" className="w-full h-full object-cover" />
                        ) : (
                            <div className="text-dark-text-secondary flex flex-col items-center">
                                <Image className="w-12 h-12 mb-2 opacity-50" />
                                <span className="text-xs">No Image Set</span>
                            </div>
                        )}
                        {isLoading && <div className="absolute inset-0 bg-black/50 flex items-center justify-center"><div className="animate-spin w-8 h-8 border-2 border-white rounded-full border-t-transparent"></div></div>}
                    </div>
                    
                    <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
                    
                    <Button 
                        variant="secondary" 
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full flex items-center justify-center gap-2"
                        disabled={isSaving}
                    >
                        <Upload className="w-5 h-5" />
                        {photoUrl ? 'Change Photo' : 'Upload Photo'}
                    </Button>
                </Card>

                <Button 
                    variant="primary" 
                    onClick={handleSave} 
                    className="w-full py-4 text-xl font-bold tracking-widest shadow-[0_0_20px_rgba(0,242,254,0.3)]"
                    disabled={isSaving}
                >
                    {isSaving ? 'SAVING...' : 'SAVE CONFIG'}
                </Button>
            </div>
        </Page>
    );
};
