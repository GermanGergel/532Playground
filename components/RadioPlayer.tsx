
import React, { useState, useEffect, useRef } from 'react';
import { logAnalyticsEvent } from '../db';

const STREAM_URL = "https://oxygenmusic.hu:8443/oxygenindie";

export const RadioPlayer: React.FC<{ customIcon?: string }> = ({ customIcon }) => {
    const [isPlaying, setIsPlaying] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const playPromiseRef = useRef<Promise<void> | null>(null);

    // Initial Volume
    const DEFAULT_VOLUME = 0.5;

    useEffect(() => {
        // Cleanup on unmount (stops music when leaving Dashboard)
        return () => {
            if (audioRef.current) {
                const audio = audioRef.current;
                audio.pause();
                audio.src = ""; 
                audio.load(); // Force release of media resources
                audioRef.current = null;
            }
        };
    }, []);

    const toggleRadio = async () => {
        if (isPlaying) {
            setIsPlaying(false);
            setIsLoading(false);
            
            if (audioRef.current) {
                const audio = audioRef.current;
                
                // If there's an ongoing play attempt, wait for it before pausing
                // to avoid the "The operation was aborted" error in the console.
                if (playPromiseRef.current) {
                    try {
                        await playPromiseRef.current;
                    } catch (e) {
                        // Ignore errors from the play promise when we are stopping
                    }
                }
                
                audio.pause();
                audio.src = "";
                audio.load();
                audioRef.current = null;
                playPromiseRef.current = null;
            }
        } else {
            setIsLoading(true);
            
            // TRACKING: Log that radio was started
            logAnalyticsEvent('play_radio');
            
            const audio = new Audio(STREAM_URL);
            audio.volume = DEFAULT_VOLUME;
            audio.crossOrigin = "anonymous";
            audioRef.current = audio;
            
            const playPromise = audio.play();
            playPromiseRef.current = playPromise;
            
            try {
                await playPromise;
                // Double check if we are still supposed to be playing
                // (user might have clicked stop while it was loading)
                if (audioRef.current === audio) {
                    setIsPlaying(true);
                    setIsLoading(false);
                } else {
                    // We stopped while loading
                    audio.pause();
                    audio.src = "";
                    audio.load();
                }
            } catch (e: any) {
                // Only log real errors, not user-initiated aborts
                if (e.name !== 'AbortError') {
                    console.error("Radio playback failed:", e);
                }
                setIsPlaying(false);
                setIsLoading(false);
                playPromiseRef.current = null;
            }
        }
    };

    const cyanColor = '#00F2FE';

    return (
        <button 
            onClick={toggleRadio}
            disabled={isLoading && !isPlaying}
            className="flex flex-col items-center justify-center gap-1.5 transition-all duration-300 group cursor-pointer hover:scale-110"
            title={isPlaying ? "Stop Radio" : "Play Indie Radio"}
        >
            {/* CSS for Equalizer Animation */}
            <style dangerouslySetInnerHTML={{ __html: `
                @keyframes eq-dance {
                    0%, 100% { height: 3px; }
                    50% { height: 100%; }
                }
                .eq-bar {
                    width: 3px;
                    background-color: ${cyanColor};
                    animation: eq-dance 0.8s ease-in-out infinite;
                    border-radius: 2px;
                }
                .eq-bar:nth-child(1) { animation-delay: 0.0s; height: 40%; }
                .eq-bar:nth-child(2) { animation-delay: 0.2s; height: 80%; }
                .eq-bar:nth-child(3) { animation-delay: 0.4s; height: 30%; }
                .eq-bar:nth-child(4) { animation-delay: 0.1s; height: 60%; }
            `}} />

            <div className={`
                relative flex items-center justify-center w-8 h-8 rounded-full border transition-all duration-300
                ${isPlaying 
                    ? `bg-[#00F2FE]/10 border-[#00F2FE] shadow-[0_0_15px_rgba(0,242,254,0.4)]` 
                    : 'text-white/60 border-white/10 shadow-[0_0_10px_rgba(255,255,255,0.05)] hover:border-white/30 hover:text-white hover:shadow-[0_0_12px_rgba(255,255,255,0.15)]'
                }
            `}>
                {isLoading ? (
                    <div className="w-4 h-4 border-2 border-[#00F2FE] border-t-transparent rounded-full animate-spin"></div>
                ) : isPlaying ? (
                    // Equalizer Visual
                    <div className="flex items-end gap-[2px] h-4 w-5 pb-1">
                        <div className="eq-bar" style={{ animationDuration: '0.6s' }}></div>
                        <div className="eq-bar" style={{ animationDuration: '0.8s' }}></div>
                        <div className="eq-bar" style={{ animationDuration: '0.5s' }}></div>
                        <div className="eq-bar" style={{ animationDuration: '0.7s' }}></div>
                    </div>
                ) : (
                    // Play / Radio Icon
                    customIcon ? (
                        <img src={customIcon} alt="Radio" className="w-5 h-5 object-contain" />
                    ) : (
                        <svg className="w-4 h-4 transition-colors" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polygon points="5 3 19 12 5 21 5 3"></polygon>
                        </svg>
                    )
                )}
            </div>

            {/* Label underneath */}
            <span className={`text-[6px] font-black tracking-widest uppercase transition-colors ${isPlaying ? 'text-[#00F2FE]' : 'text-white/30 group-hover:text-white/60'}`}>
                RADIO
            </span>
        </button>
    );
};
