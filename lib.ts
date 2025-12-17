
import { loadCustomAudio } from './db';

// --- ROBUST AUDIO MANAGER (Singleton) ---
// Implements "Technical Requirements Problem 2: Audio Timer"
// 1. Single Global Audio Context
// 2. Preloading capabilities
// 3. Auto-recovery on iOS background/interruption

class AudioManager {
    private static instance: AudioManager;
    private context: AudioContext | null = null;
    private bufferCache: Map<string, AudioBuffer> = new Map();
    private activeSource: AudioBufferSourceNode | null = null;
    private isUnlocked: boolean = false;
    private announcementKeys = [
        'start_match', 'three_minutes', 'one_minute', 'thirty_seconds', 
        'five', 'four', 'three', 'two', 'one', 'finish_match'
    ];

    private constructor() {
        // Bind visibility change to auto-resume context
        if (typeof document !== 'undefined') {
            document.addEventListener('visibilitychange', () => {
                if (!document.hidden) {
                    this.resumeContext();
                }
            });
            // iOS Safari often needs a touch event to resume/unlock
            const unlockHandler = () => {
                this.resumeContext();
                this.isUnlocked = true;
                // We can remove listeners once unlocked, but keeping them safely is fine for re-backgrounding
            };
            window.addEventListener('click', unlockHandler);
            window.addEventListener('touchstart', unlockHandler);
        }
    }

    public static getInstance(): AudioManager {
        if (!AudioManager.instance) {
            AudioManager.instance = new AudioManager();
        }
        return AudioManager.instance;
    }

    private getContext(): AudioContext {
        if (!this.context) {
            // @ts-ignore - Safari prefix support
            const AudioContextClass = window.AudioContext || window.webkitAudioContext;
            this.context = new AudioContextClass();
        }
        return this.context;
    }

    public async resumeContext() {
        const ctx = this.getContext();
        if (ctx.state === 'suspended') {
            try {
                await ctx.resume();
                console.log('🔊 AudioContext Resumed');
            } catch (e) {
                console.warn('🔊 Failed to resume AudioContext', e);
            }
        }
    }

    // --- UTILS ---
    private base64ToArrayBuffer(base64: string): ArrayBuffer {
        const binaryString = window.atob(base64.split(',').pop()!.trim());
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }
        return bytes.buffer;
    }

    // --- PRELOADING (Call this when entering Match Screen) ---
    public async preloadPack(voicePackId: number) {
        console.log(`🔊 Preloading Voice Pack ${voicePackId}...`);
        const ctx = this.getContext();
        
        const loadPromises = this.announcementKeys.map(async (key) => {
            // Check memory cache first
            const cacheKey = `${voicePackId}_${key}`;
            if (this.bufferCache.has(cacheKey)) return;

            // Load from IDB
            const base64 = await loadCustomAudio(key, voicePackId);
            if (!base64) return; // Will fallback to TTS later if missing

            try {
                const buffer = await ctx.decodeAudioData(this.base64ToArrayBuffer(base64));
                this.bufferCache.set(cacheKey, buffer);
            } catch (e) {
                console.error(`🔊 Failed to decode ${key}`, e);
            }
        });

        await Promise.all(loadPromises);
        console.log(`🔊 Voice Pack ${voicePackId} Preloaded.`);
    }

    // --- PLAYBACK ---
    public async play(key: string, fallbackText: string, voicePackId: number = 1): Promise<void> {
        // Special "Silent" unlocker
        if (key === 'silence') {
            this.playSilence();
            return;
        }

        await this.resumeContext();
        const ctx = this.getContext();
        const cacheKey = `${voicePackId}_${key}`;

        // 1. Try Memory Cache (Fastest)
        let buffer = this.bufferCache.get(cacheKey);

        // 2. Try IDB if not in memory (Fallback for non-preloaded)
        if (!buffer) {
            const base64 = await loadCustomAudio(key, voicePackId);
            if (base64) {
                try {
                    buffer = await ctx.decodeAudioData(this.base64ToArrayBuffer(base64));
                    this.bufferCache.set(cacheKey, buffer);
                } catch (e) {}
            }
        }

        // 3. Play Buffer if available
        if (buffer) {
            this.stopActiveSource();
            const source = ctx.createBufferSource();
            source.buffer = buffer;
            source.connect(ctx.destination);
            source.start(0);
            this.activeSource = source;
            console.log(`🔊 Playing ${key} (Buffer)`);
        } else {
            // 4. TTS Fallback
            console.log(`🔊 Playing ${key} (TTS Fallback)`);
            this.speak(fallbackText);
        }
    }

    private playSilence() {
        const ctx = this.getContext();
        const buffer = ctx.createBuffer(1, 1, 22050);
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.connect(ctx.destination);
        source.start(0);
    }

    private stopActiveSource() {
        if (this.activeSource) {
            try { this.activeSource.stop(); } catch (e) {}
            this.activeSource = null;
        }
        // Also cancel TTS
        if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel();
        }
    }

    // --- TTS HANDLING ---
    private speak(text: string) {
        if (!('speechSynthesis' in window)) return;
        
        // Ensure voice load
        if (!this.assistantVoice) this.loadVoices();

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'en-US';
        if (this.assistantVoice) {
            utterance.voice = this.assistantVoice;
            utterance.pitch = 1.0;
            utterance.rate = 1.1; // Slightly faster for sports
        }
        // iOS requires context resume even for TTS sometimes
        this.resumeContext();
        window.speechSynthesis.speak(utterance);
    }

    private assistantVoice: SpeechSynthesisVoice | null = null;
    private loadVoices() {
        const voices = window.speechSynthesis.getVoices();
        const preferredNames = ['samantha', 'google us english', 'microsoft zira', 'victoria'];
        this.assistantVoice = 
            voices.find(v => preferredNames.some(n => v.name.toLowerCase().includes(n))) ||
            voices.find(v => v.name.toLowerCase().includes('female') && v.lang.startsWith('en')) ||
            voices.find(v => v.lang.startsWith('en')) ||
            null;
    }
}

// Global initialization of voices
if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    window.speechSynthesis.onvoiceschanged = () => {
        // Trigger internal voice loading
        (AudioManager.getInstance() as any).loadVoices();
    };
}

// --- PUBLIC API (Compatible with existing code) ---

export const audioManager = AudioManager.getInstance();

export const initAudioContext = () => {
    audioManager.resumeContext();
};

export const playAnnouncement = (key: string, fallbackText: string, activeVoicePack: number = 1) => {
    audioManager.play(key, fallbackText, activeVoicePack);
};

// --- IMAGE UTILS (Kept in lib.ts as per project structure) ---
export const processPlayerImageFile = (file: File): Promise<{ cardImage: string; avatarImage: string }> => {
    return new Promise((resolve, reject) => {
        const objectUrl = URL.createObjectURL(file);
        const img = new Image();

        img.onload = () => {
            try {
                const cardCanvas = document.createElement('canvas');
                const cardCtx = cardCanvas.getContext('2d');
                
                const maxWidth = 1000; 
                let { width, height } = img;
                if (width > maxWidth) {
                    height = Math.round((height * maxWidth) / width);
                    width = maxWidth;
                }

                cardCanvas.width = width;
                cardCanvas.height = height;
                cardCtx?.drawImage(img, 0, 0, width, height);
                const cardImage = cardCanvas.toDataURL('image/jpeg', 0.90);

                const avatarCanvas = document.createElement('canvas');
                const avatarCtx = avatarCanvas.getContext('2d');
                const side = Math.min(cardCanvas.width, cardCanvas.height);
                avatarCanvas.width = side;
                avatarCanvas.height = side;
                if (!avatarCtx) throw new Error("Could not create avatar canvas context");

                const sx = (cardCanvas.width - side) / 2;
                const sy = (cardCanvas.height - side) / 8; 
                
                avatarCtx.drawImage(cardCanvas, sx, sy, side, side, 0, 0, side, side);
                const avatarImage = avatarCanvas.toDataURL('image/jpeg', 0.90);

                resolve({ cardImage, avatarImage });
            } catch (error) {
                reject(error);
            } finally {
                URL.revokeObjectURL(objectUrl);
            }
        };
        img.onerror = () => {
            URL.revokeObjectURL(objectUrl);
            reject(new Error("Failed to load image file."));
        };
        img.src = objectUrl;
    });
};
