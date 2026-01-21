
import { loadCustomAudio } from './db';

// --- ROBUST AUDIO MANAGER (Singleton) ---
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
        if (typeof window !== 'undefined') {
            // Глобальные слушатели для разблокировки при первом же касании
            const unlock = () => {
                this.forceResume();
                if (this.context && this.context.state === 'running') {
                    this.isUnlocked = true;
                    window.removeEventListener('click', unlock);
                    window.removeEventListener('touchstart', unlock);
                    console.log('🔊 Audio System: Unlocked via Global Gesture');
                }
            };
            window.addEventListener('click', unlock, { capture: true });
            window.addEventListener('touchstart', unlock, { capture: true });
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
            // @ts-ignore
            const AudioContextClass = window.AudioContext || window.webkitAudioContext;
            this.context = new AudioContextClass();
        }
        return this.context;
    }

    /**
     * Принудительное возобновление работы контекста.
     * Обязательно должно вызываться ВНУТРИ обработчика события клика.
     */
    public async forceResume() {
        const ctx = this.getContext();
        try {
            if (ctx.state !== 'running') {
                await ctx.resume();
                console.log('🔊 AudioContext state:', ctx.state);
            }
            // Проигрываем микро-тишину для активации канала на iOS
            this.playSilence();
        } catch (e) {
            console.warn('🔊 Audio System: Resume failed', e);
        }
    }

    /**
     * Специальный метод для принудительной разблокировки из UI
     */
    public async unlockAudio() {
        await this.forceResume();
    }

    // Для совместимости
    public async resumeContext() {
        return this.forceResume();
    }

    private base64ToArrayBuffer(base64: string): ArrayBuffer {
        const binaryString = window.atob(base64.split(',').pop()!.trim());
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }
        return bytes.buffer;
    }

    public async preloadPack(voicePackId: number) {
        console.log(`🔊 Preloading Voice Pack ${voicePackId}...`);
        const ctx = this.getContext();
        
        const loadPromises = this.announcementKeys.map(async (key) => {
            const cacheKey = `${voicePackId}_${key}`;
            if (this.bufferCache.has(cacheKey)) return;

            const base64 = await loadCustomAudio(key, voicePackId);
            if (!base64) return; 

            try {
                const buffer = await ctx.decodeAudioData(this.base64ToArrayBuffer(base64));
                this.bufferCache.set(cacheKey, buffer);
            } catch (e) {}
        });

        await Promise.all(loadPromises);
    }

    public async play(key: string, fallbackText: string, voicePackId: number = 1): Promise<void> {
        if (key === 'silence') {
            this.playSilence();
            return;
        }

        // КРИТИЧЕСКИ: Сначала будим контекст, потом играем
        await this.forceResume();
        
        const ctx = this.getContext();
        const cacheKey = `${voicePackId}_${key}`;

        let buffer = this.bufferCache.get(cacheKey);

        if (!buffer) {
            const base64 = await loadCustomAudio(key, voicePackId);
            if (base64) {
                try {
                    buffer = await ctx.decodeAudioData(this.base64ToArrayBuffer(base64));
                    this.bufferCache.set(cacheKey, buffer);
                } catch (e) {}
            }
        }

        if (buffer) {
            this.stopActiveSource();
            const source = ctx.createBufferSource();
            source.buffer = buffer;
            source.connect(ctx.destination);
            source.start(0);
            this.activeSource = source;
        } else if (fallbackText) {
            this.speak(fallbackText);
        }
    }

    private playSilence() {
        const ctx = this.getContext();
        try {
            const buffer = ctx.createBuffer(1, 1, 22050);
            const source = ctx.createBufferSource();
            source.buffer = buffer;
            source.connect(ctx.destination);
            source.start(0);
        } catch (e) {}
    }

    private stopActiveSource() {
        if (this.activeSource) {
            try { this.activeSource.stop(); } catch (e) {}
            this.activeSource = null;
        }
        if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel();
        }
    }

    private speak(text: string) {
        if (!('speechSynthesis' in window)) return;
        if (!this.assistantVoice) this.loadVoices();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'en-US';
        if (this.assistantVoice) {
            utterance.voice = this.assistantVoice;
            utterance.pitch = 1.0;
            utterance.rate = 1.1; 
        }
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

if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    window.speechSynthesis.onvoiceschanged = () => {
        (AudioManager.getInstance() as any).loadVoices();
    };
}

export const audioManager = AudioManager.getInstance();
export const initAudioContext = () => audioManager.forceResume();
export const playAnnouncement = (key: string, fallbackText: string, activeVoicePack: number = 1) => {
    audioManager.play(key, fallbackText, activeVoicePack);
};

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
