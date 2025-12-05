import React, { useState, useEffect, useRef } from 'react';
import { Page, PageHeader, Card, Button, useTranslation } from '../ui';
import { loadCustomAudio, saveCustomAudio, deleteCustomAudio, isSupabaseConfigured } from '../db';
import { playAnnouncement, initAudioContext } from '../lib';
import { Upload, Trash2, Play } from '../icons';
import { useApp } from '../context';

type AnnouncementKey = 'start_match' | 'three_minutes' | 'one_minute' | 'thirty_seconds' | 'five' | 'four' | 'three' | 'two' | 'one' | 'finish_match';

interface Announcement {
    key: AnnouncementKey;
    fallbackText: string;
}

const ANNOUNCEMENTS: Announcement[] = [
    { key: 'start_match', fallbackText: 'Game One' },
    { key: 'three_minutes', fallbackText: 'Three minutes remaining' },
    { key: 'one_minute', fallbackText: 'One minute remaining' },
    { key: 'thirty_seconds', fallbackText: 'Thirty seconds' },
    { key: 'five', fallbackText: 'Five' },
    { key: 'four', fallbackText: 'Four' },
    { key: 'three', fallbackText: 'Three' },
    { key: 'two', fallbackText: 'Two' },
    { key: 'one', fallbackText: 'One' },
    { key: 'finish_match', fallbackText: 'Last play' },
];

const Spinner = () => (
    <div className="w-5 h-5 border-2 border-dark-text-secondary border-t-dark-accent-start rounded-full animate-spin"></div>
);

export const VoiceSettingsScreen: React.FC = () => {
    const t = useTranslation();
    const { activeVoicePack, setActiveVoicePack } = useApp();
    const [customAudioStatus, setCustomAudioStatus] = useState<Record<string, boolean>>({});
    const [isLoading, setIsLoading] = useState(true);
    const [isProcessing, setIsProcessing] = useState<AnnouncementKey | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [keyToUpload, setKeyToUpload] = useState<AnnouncementKey | null>(null);

    useEffect(() => {
        const checkStatus = async () => {
            setIsLoading(true);
            const statusMap: Record<string, boolean> = {};
            for (const announcement of ANNOUNCEMENTS) {
                const customAudio = await loadCustomAudio(announcement.key, activeVoicePack);
                statusMap[announcement.key] = !!customAudio;
            }
            setCustomAudioStatus(statusMap);
            setIsLoading(false);
        };
        checkStatus();
    }, [activeVoicePack]);

    const handleUploadClick = (key: AnnouncementKey) => {
        setKeyToUpload(key);
        fileInputRef.current?.click();
    };

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file || !keyToUpload) return;

        setIsProcessing(keyToUpload);
        try {
            const reader = new FileReader();
            reader.onload = async (e) => {
                const base64 = e.target?.result as string;
                if (base64) {
                    await saveCustomAudio(keyToUpload, base64, activeVoicePack);
                    setCustomAudioStatus(prev => ({ ...prev, [keyToUpload]: true }));
                }
                setIsProcessing(null);
                setKeyToUpload(null);
            };
            reader.readAsDataURL(file);
        } catch (error) {
            alert('Upload failed. Please check connection and try again.');
            setIsProcessing(null);
        } finally {
            if (event.target) {
                event.target.value = '';
            }
        }
    };

    const handleDelete = async (key: AnnouncementKey) => {
        setIsProcessing(key);
        try {
            await deleteCustomAudio(key, activeVoicePack);
            setCustomAudioStatus(prev => ({ ...prev, [key]: false }));
        } catch (error) {
            alert('Failed to delete. Please check connection.');
        } finally {
            setIsProcessing(null);
        }
    };

    const handlePreview = (key: AnnouncementKey, fallbackText: string) => {
        initAudioContext();
        playAnnouncement(key, fallbackText, activeVoicePack);
    };

    const canUseCloud = isSupabaseConfigured();
    const packButtonClass = (packNumber: number) => `flex-1 py-2 font-bold rounded-lg transition-all ${activeVoicePack === packNumber ? 'gradient-bg text-dark-bg shadow-lg shadow-dark-accent-start/30' : 'bg-dark-surface hover:bg-white/10'}`;

    return (
        <Page>
            <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept=".mp3,audio/mpeg"
                className="hidden"
            />
            <PageHeader title={t.manageAnnouncements} />
             {!canUseCloud && (
                <Card className="mb-4 bg-yellow-900/50 border-yellow-500/50">
                    <p className="text-yellow-300 text-center text-sm">
                        Cloud database not configured. Audio files will be saved only on this device and will not sync.
                    </p>
                </Card>
            )}

            <div className="flex gap-2 p-1 bg-dark-bg rounded-xl border border-white/10 mb-4">
                <button onClick={() => setActiveVoicePack(1)} className={packButtonClass(1)}>{t.voicePack1}</button>
                <button onClick={() => setActiveVoicePack(2)} className={packButtonClass(2)}>{t.voicePack2}</button>
                <button onClick={() => setActiveVoicePack(3)} className={packButtonClass(3)}>{t.voicePack3}</button>
            </div>
            
            <Card className="!p-0 bg-dark-surface/80 border border-dark-accent-start/30 shadow-[0_0_20px_rgba(0,242,254,0.1)]">
                {isLoading ? (
                    <div className="flex justify-center items-center h-64"><Spinner /></div>
                ) : (
                    <ul className="divide-y divide-white/10">
                        {ANNOUNCEMENTS.map(({ key, fallbackText }) => {
                            const hasCustomAudio = customAudioStatus[key];
                            const isThisOneProcessing = isProcessing === key;
                            return (
                                <li key={key} className="flex items-center justify-between p-3 transition-colors hover:bg-white/5">
                                    <div className="flex-1">
                                        <p className="font-bold text-white text-sm">{t[`announcement_${key}` as keyof typeof t]}</p>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${hasCustomAudio ? 'bg-green-500/20 text-green-300' : 'bg-gray-500/20 text-gray-300'}`}>
                                                {hasCustomAudio ? t.customAudio : t.defaultAudio}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Button variant="ghost" className="!p-2" onClick={() => handlePreview(key, fallbackText)} disabled={!!isProcessing}>
                                            <Play className="w-5 h-5" />
                                        </Button>
                                        <Button variant="ghost" className="!p-2" onClick={() => handleUploadClick(key)} disabled={!!isProcessing}>
                                            {isThisOneProcessing ? <Spinner /> : <Upload className="w-5 h-5" />}
                                        </Button>
                                        {hasCustomAudio && (
                                            <Button variant="ghost" className="!p-2 text-red-400" onClick={() => handleDelete(key)} disabled={!!isProcessing}>
                                                <Trash2 className="w-5 h-5" />
                                            </Button>
                                        )}
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                )}
            </Card>
        </Page>
    );
};