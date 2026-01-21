
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
        if (typeof document !== 'undefined') {
            // Агрессивное пробуждение при возврате в приложение
            document.addEventListener('visibilitychange', () => {
                if (!document.hidden) {
                    this.forceResume();
                }
            });

            // Глобальный слушатель ЛЮБОГО клика для разблокировки звука (iOS/Chrome fix)
            const unlockHandler = () => {
                this.unlock();
                // Удаляем после первой успешной разблокировки
                if (this.isUnlocked) {
                    window.removeEventListener('click', unlockHandler);
                    window.removeEventListener('touchstart', unlockHandler);
                }
            };
            window.addEventListener('click', unlockHandler, { capture: true });
            window.addEventListener('touchstart', unlockHandler, { capture: true });
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
     * Пытается разблокировать аудио-контекст. Должно вызываться внутри обработчика события пользователя.
     */
    public async unlock() {
        const ctx = this.getContext();
        if (this.isUnlocked) return;

        try {
            if (ctx.state === 'suspended') {
                await ctx.resume();
            }
            // Проигрываем микро-тишину для финализации разблокировки
            const buffer = ctx.createBuffer(1, 1, 22050);
            const source = ctx.createBufferSource();
            source.buffer = buffer;
            source.connect(ctx.destination);
            source.start(0);
            
            this.isUnlocked = true;
            console.log('🔊 AudioEngine Unlocked and Ready');
        } catch (e) {
            console.warn('🔊 AudioEngine unlock failed', e);
        }
    }

    public async forceResume() {
        const ctx = this.getContext();
        if (ctx.state !== 'running') {
            try {
                await ctx.resume();
            } catch (e) {
                console.warn('🔊 Failed to resume AudioContext', e);
            }
        }
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
        // Всегда пробуем возобновить контекст перед игрой
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
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'en-US';
        window.speechSynthesis.speak(utterance);
    }
}

export const audioManager = AudioManager.getInstance();
export const initAudioContext = () => audioManager.unlock();
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
