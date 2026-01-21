
import React, { useState, useEffect, useRef } from 'react';
import { Page, PageHeader, Card, Button, useTranslation, ToggleSwitch } from '../ui';
import { 
    loadCustomAudio, saveCustomAudio, deleteCustomAudio, isSupabaseConfigured,
    uploadSessionAnthem, deleteSessionAnthem, getSessionAnthemUrl,
    syncAndCacheAudioAssets
} from '../db';
import { audioManager, playAnnouncement, initAudioContext } from '../lib';
import { Upload, Trash2, Play, Pause } from '../icons';
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

const AnthemSection: React.FC = () => {
    const t = useTranslation();
    const [status, setStatus] = useState<'loading' | 'uploaded' | 'none'>('loading');
    const [isProcessing, setIsProcessing] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    // MAX FILE SIZE CONSTANT (5MB)
    const MAX_FILE_SIZE_MB = 5;
    const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

    useEffect(() => {
        const checkAnthem = async () => {
            const url = await getSessionAnthemUrl();
            setStatus(url ? 'uploaded' : 'none');
        };
        checkAnthem();

        // Cleanup: Stop audio when component unmounts (user leaves screen)
        return () => {
            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current.currentTime = 0;
            }
        };
    }, []);

    const handleUploadClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        // 1. Check File Size
        if (file.size > MAX_FILE_SIZE_BYTES) {
            alert(`File is too large! Please upload an MP3 smaller than ${MAX_FILE_SIZE_MB}MB to save traffic for your players.`);
            if (event.target) event.target.value = ''; // Reset input
            return;
        }

        // 2. Check File Type (Basic check)
        if (!file.type.includes('audio') && !file.name.endsWith('.mp3')) {
            alert("Invalid file type. Please upload an MP3 file.");
            if (event.target) event.target.value = '';
            return;
        }

        setIsProcessing(true);
        try {
            const reader = new FileReader();
            reader.onload = async (e) => {
                const base64 = e.target?.result as string;
                if (base64) {
                    await uploadSessionAnthem(base64);
                    setStatus('uploaded');
                }
            };
            reader.readAsDataURL(file);
        } catch (error) {
            alert('Upload failed. Please check connection and try again.');
        } finally {
            setIsProcessing(false);
            if (event.target) event.target.value = '';
        }
    };

    const handleDelete = async () => {
        setIsProcessing(true);
        try {
            // Stop playing if deleting
            if (audioRef.current) {
                audioRef.current.pause();
                setIsPlaying(false);
            }
            await deleteSessionAnthem();
            setStatus('none');
        } catch (error) {
            alert('Failed to delete. Please check connection.');
        } finally {
            setIsProcessing(false);
        }
    };

    const handlePreview = async () => {
        // Toggle Logic
        if (isPlaying && audioRef.current) {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
            setIsPlaying(false);
            return;
        }

        const url = await getSessionAnthemUrl();
        if (url) {
            if (audioRef.current) {
                audioRef.current.pause(); // Ensure old instance is stopped
            }
            const audio = new Audio(url);
            audio.onended = () => setIsPlaying(false); // Reset icon when song finishes
            audioRef.current = audio;
            
            try {
                await audio.play();
                setIsPlaying(true);
            } catch (e) {
                console.error("Playback failed", e);
                setIsPlaying(false);
            }
        }
    };

    return (
        <Card className="!p-0 bg-dark-surface/80 border border-dark-accent-start/30 shadow-[0_0_20px_rgba(0,242,254,0.1)]">
             <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".mp3,audio/mpeg" className="hidden" />
            <div className="p-3">
                <h3 className="text-lg font-bold text-white mb-2">{t.sessionAnthem}</h3>
                <p className="text-xs text-dark-text-secondary mb-3">{t.sessionAnthemDesc} (Max {MAX_FILE_SIZE_MB}MB)</p>
                 <div className="flex items-center justify-between p-3 transition-colors bg-dark-bg/50 rounded-lg">
                    <div className="flex-1">
                        <p className="font-bold text-white text-sm">{t.status}</p>
                        <div className="flex items-center gap-2 mt-1">
                            {status === 'loading' ? <Spinner /> : (
                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${status === 'uploaded' ? 'bg-green-500/20 text-green-300' : 'bg-gray-500/20 text-gray-300'}`}>
                                    {status === 'uploaded' ? t.trackUploaded : t.noTrackUploaded}
                                </span>
                            )}
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                         <Button variant="ghost" className="!p-2" onClick={handlePreview} disabled={isProcessing || status !== 'uploaded'}>
                            {isPlaying ? <Pause className="w-5 h-5 text-dark-accent-start" /> : <Play className="w-5 h-5" />}
                        </Button>
                        <Button variant="ghost" className="!p-2" onClick={handleUploadClick} disabled={isProcessing}>
                            {isProcessing ? <Spinner /> : <Upload className="w-5 h-5" />}
                        </Button>
                        {status === 'uploaded' && (
                            <Button variant="ghost" className="!p-2 text-red-400" onClick={handleDelete} disabled={isProcessing}>
                                <Trash2 className="w-5 h-5" />
                            </Button>
                        )}
                    </div>
                 </div>
            </div>
        </Card>
    );
};


export const VoiceSettingsScreen: React.FC = () => {
    const t = useTranslation();
    const { activeVoicePack, setActiveVoicePack } = useApp();
    const [customAudioStatus, setCustomAudioStatus] = useState<Record<string, boolean>>({});
    const [isLoading, setIsLoading] = useState(true);
    const [isProcessing, setIsProcessing] = useState<AnnouncementKey | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [keyToUpload, setKeyToUpload] = useState<AnnouncementKey | null>(null);

    // Limit for voice announcements (short clips) - 500KB is plenty
    const MAX_VOICE_SIZE_BYTES = 0.5 * 1024 * 1024; 

    // TRIGGER SYNC ON MOUNT
    useEffect(() => {
        syncAndCacheAudioAssets();
    }, []);

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

        // Size check for voice clips
        if (file.size > MAX_VOICE_SIZE_BYTES) {
            alert(`Voice clip is too large! Please keep it under 500KB.`);
            if (event.target) event.target.value = '';
            return;
        }

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

    const handlePreview = async (key: AnnouncementKey, fallbackText: string) => {
        // ПРИНУДИТЕЛЬНОЕ ПРОБУЖДЕНИЕ ПЕРЕД ПРЕВЬЮ
        await audioManager.unlockAudio();
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
            <PageHeader title={t.voiceAssistant} />
             {!canUseCloud && (
                <Card className="mb-4 bg-yellow-900/50 border-yellow-500/50">
                    <p className="text-yellow-300 text-center text-sm">
                        Cloud database not configured. Audio files will be saved only on this device and will not sync.
                    </p>
                </Card>
            )}

            <div className="space-y-4">
                <AnthemSection />

                <div>
                    <h3 className="text-lg font-bold text-white my-3">{t.manageAnnouncements}</h3>
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
                </div>
            </div>
        </Page>
    );
};
