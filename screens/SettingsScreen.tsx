
import React from 'react';
import { useApp } from '../context';
import { Page, Card, useTranslation, Modal, Button } from '../ui';
import { isSupabaseConfigured, loadPlayersFromDB } from '../db';

export const SettingsScreen: React.FC = () => {
    const t = useTranslation();
    const { language, setLanguage, allPlayers } = useApp();
    const [cloudStatus, setCloudStatus] = React.useState<{ connected: boolean, count: number } | null>(null);
    
    // Audio Tool State
    const [isAudioToolOpen, setIsAudioToolOpen] = React.useState(false);
    const [audioOutput, setAudioOutput] = React.useState('');
    const [isProcessing, setIsProcessing] = React.useState(false);
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    React.useEffect(() => {
        const checkCloud = async () => {
            if (isSupabaseConfigured()) {
                const cloudPlayers = await loadPlayersFromDB();
                setCloudStatus({
                    connected: true,
                    count: Array.isArray(cloudPlayers) ? cloudPlayers.length : 0
                });
            } else {
                setCloudStatus({ connected: false, count: 0 });
            }
        };
        checkCloud();
    }, []);

    const langClasses = (lang: string) => `px-6 py-2 rounded-full font-bold transition-colors text-lg ${language === lang ? 'gradient-bg text-dark-bg' : 'bg-dark-surface hover:bg-white/10'}`;

    const processFiles = async (files: File[]) => {
        setIsProcessing(true);
        const results: Record<string, string> = {};
        
        const readFile = (file: File): Promise<string> => {
            return new Promise((resolve) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result as string);
                reader.readAsDataURL(file);
            });
        };

        for (const file of files) {
            if (!file.name.toLowerCase().endsWith('.mp3')) continue;
            
            const base64 = await readFile(file);
            let key = file.name.replace(/\.mp3$/i, '').toLowerCase();
            
            if (!isNaN(parseInt(key))) {
                key = `sound_${key}`;
            }
            key = key.replace(/[^a-z0-9_]/g, '_');

            results[key] = base64;
        }

        let outputString = "export const AUDIO_ASSETS: Record<string, string> = {\n";
        outputString += `    'silence': "data:audio/mp3;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4Ljc2LjEwMAAAAAAAAAAAAAAA//OEAAAAAAAAAAAAAAAAAAAAAAAASW5mbwAAAA8AAAAEAAABIADAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMD//////////////////////////////////////////////////////////////////wAAAP//OEAAAAAAAAAAAAAAAAAAAAAATEFNRTMuMTAwVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV//OEAAAAAAAAAAAAAAAAAAAAAAptgAAAAAABIAAADaA4AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA//OEAAAAAAAAAAAAAAAAAAAAAAAAAAA0gAAAAAAABIAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA==",\n\n`;

        for (const [key, value] of Object.entries(results)) {
            outputString += `    '${key}': "${value}",\n`;
        }
        outputString += "};";

        setAudioOutput(outputString);
        setIsProcessing(false);
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            processFiles(Array.from(e.target.files));
        }
    };

    const handleCopy = () => {
        navigator.clipboard.writeText(audioOutput);
        alert("Code copied! Send it to the chat.");
    };

    // --- CYBERPUNK HUD COMPONENT ---
    const NetworkHud = () => {
        const isOnline = cloudStatus?.connected;
        const color = isOnline ? '#4CFF5F' : '#FFD700'; // Green vs Gold
        const glowColor = isOnline ? 'rgba(76, 255, 95, 0.2)' : 'rgba(255, 215, 0, 0.2)';
        const borderColor = isOnline ? 'border-dark-accent-end' : 'border-yellow-500';
        
        return (
            <div className={`relative overflow-hidden rounded-xl border ${borderColor}/50 bg-black/60 p-5 shadow-[0_0_20px_${glowColor}] transition-all duration-500`}>
                {/* Background Grid & Scanline */}
                <div 
                    className="absolute inset-0 opacity-10 pointer-events-none"
                    style={{ 
                        backgroundImage: `linear-gradient(${color} 1px, transparent 1px), linear-gradient(90deg, ${color} 1px, transparent 1px)`,
                        backgroundSize: '20px 20px'
                    }}
                />
                {/* Animated Scanline Overlay */}
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/5 to-transparent h-full w-full animate-pulse pointer-events-none" style={{ animationDuration: '3s' }} />

                <div className="relative z-10 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        {/* Radar/Pulse Animation */}
                        <div className="relative flex items-center justify-center w-12 h-12">
                            <span className="absolute w-full h-full rounded-full opacity-75 animate-ping" style={{ backgroundColor: color }}></span>
                            <span className="relative w-4 h-4 rounded-full shadow-[0_0_10px_currentColor]" style={{ backgroundColor: color }}></span>
                            {/* Rotating Ring */}
                            <svg className="absolute w-12 h-12 animate-spin" style={{ animationDuration: '4s' }} viewBox="0 0 50 50">
                                <circle cx="25" cy="25" r="23" fill="none" stroke={color} strokeWidth="1" strokeDasharray="30 20" opacity="0.5" />
                            </svg>
                        </div>

                        <div className="flex flex-col">
                            <h3 className="text-[10px] font-bold tracking-[0.2em] text-dark-text-secondary uppercase mb-0.5">
                                DATABASE UPLINK
                            </h3>
                            <div className="flex items-center gap-2">
                                <span className="text-xl font-black italic tracking-wider" style={{ color: color, textShadow: `0 0 10px ${color}` }}>
                                    {isOnline ? 'SYSTEM ONLINE' : 'LOCAL MODE'}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Stats Block */}
                    <div className="text-right">
                        <div className="flex flex-col items-end">
                            <span className="text-[9px] text-dark-text-secondary font-mono">
                                {isOnline ? 'SYNC STATUS' : 'OFFLINE'}
                            </span>
                            <div className="flex items-baseline gap-1">
                                {isOnline ? (
                                    <>
                                        <span className="text-2xl font-bold font-mono text-white">
                                            {cloudStatus?.count}
                                        </span>
                                        <span className="text-[9px] text-dark-text-secondary font-bold">/ {allPlayers.length}</span>
                                    </>
                                ) : (
                                    <span className="text-lg font-bold font-mono text-yellow-500">--</span>
                                )}
                            </div>
                            {isOnline && cloudStatus?.count !== allPlayers.length && (
                                <span className="text-[9px] text-yellow-400 font-bold animate-pulse">
                                    SYNCING...
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                {/* Decorative Tech Lines */}
                <div className="absolute bottom-0 left-0 w-8 h-1 bg-white/20"></div>
                <div className="absolute top-0 right-0 w-8 h-1 bg-white/20"></div>
            </div>
        );
    };

    return (
        <Page>
            <h1 className="text-2xl font-bold text-center mb-8">{t.settingsTitle}</h1>
            
            <div className="flex flex-col gap-6">
                <div className="space-y-6">
                    <Card 
                        className="shadow-lg shadow-dark-accent-start/20 border border-dark-accent-start/40 !p-6 bg-dark-surface/80"
                    >
                        <h2 className="text-xl font-bold mb-6 text-center text-white tracking-wide">{t.language}</h2>
                        <div className="flex justify-center gap-4">
                            <button onClick={() => setLanguage('en')} className={langClasses('en')}>EN</button>
                            <button onClick={() => setLanguage('ru')} className={langClasses('ru')}>RU</button>
                            <button onClick={() => setLanguage('vn')} className={langClasses('vn')}>VN</button>
                        </div>
                    </Card>
                    
                    <NetworkHud />
                    
                    <Button 
                        variant="secondary" 
                        className="w-full border border-dark-text-secondary/20 text-dark-text-secondary"
                        onClick={() => setIsAudioToolOpen(true)}
                    >
                        🔊 AUDIO ASSETS TOOL
                    </Button>

                    <div className="text-center opacity-40 hover:opacity-100 transition-opacity duration-500 mt-8">
                        <p className="font-orbitron font-bold text-sm tracking-widest text-dark-accent-start">532 PLAYGROUND</p>
                        <p className="text-[10px] text-dark-text-secondary font-mono mt-1">v2.0.0 • SYSTEM READY</p>
                    </div>
                </div>
            </div>

            {/* AUDIO TOOL MODAL */}
            <Modal isOpen={isAudioToolOpen} onClose={() => setIsAudioToolOpen(false)} size="xs" hideCloseButton containerClassName="border border-dark-accent-start/40 shadow-[0_0_20px_rgba(0,242,254,0.3)]">
                <div className="space-y-4">
                    <h3 className="text-center font-bold text-lg text-white">Audio Generator</h3>
                    
                    <input 
                        type="file" 
                        ref={fileInputRef} 
                        onChange={handleFileSelect} 
                        multiple 
                        accept=".mp3" 
                        className="hidden" 
                    />
                    
                    <div 
                        className="border-2 border-dashed border-dark-accent-start rounded-xl p-6 text-center cursor-pointer hover:bg-white/5 transition-colors"
                        onClick={() => fileInputRef.current?.click()}
                    >
                        {isProcessing ? (
                            <p className="animate-pulse text-dark-accent-start font-bold">Processing...</p>
                        ) : (
                            <div>
                                <p className="text-sm font-bold text-white mb-1">TAP TO SELECT FILES</p>
                                <p className="text-[10px] text-dark-text-secondary">Select all your .mp3 files at once</p>
                            </div>
                        )}
                    </div>

                    {audioOutput && (
                        <div className="text-center animate-pulse">
                            <p className="text-xs text-green-400 font-bold mb-2">GENERATION COMPLETE!</p>
                            <Button variant="primary" onClick={handleCopy} className="w-full !py-2 !text-sm">
                                COPY CODE
                            </Button>
                        </div>
                    )}
                    
                    <Button variant="secondary" onClick={() => setIsAudioToolOpen(false)} className="w-full !py-2 !text-sm mt-2">
                        CLOSE
                    </Button>
                </div>
            </Modal>
        </Page>
    );
};
