
import { loadCustomAudio } from './db';

// --- HYBRID AUDIO SYSTEM ---
// Priority: 1. User-Uploaded MP3 (Cached in IndexedDB) -> 2. Text-to-Speech (Fallback)

let audioContext: AudioContext | null = null;
let activeSource: AudioBufferSourceNode | null = null;

// Initialize Audio Context (Mobile browsers require this to happen on user interaction)
export const initAudioContext = () => {
    if (!audioContext) {
        audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (audioContext.state === 'suspended') {
        audioContext.resume();
    }
};

// Helper to decode Base64 string to ArrayBuffer (Final, Most Robust Implementation)
const base64ToArrayBuffer = (base64: string): ArrayBuffer => {
    let base64Data = base64;
    // Find the comma that separates the metadata from the data
    const prefixIndex = base64.indexOf(',');
    if (prefixIndex !== -1) {
      // Take only the part after the comma
      base64Data = base64.substring(prefixIndex + 1);
    }
    
    try {
        const binaryString = window.atob(base64Data.trim());
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }
        return bytes.buffer;
    } catch(e) {
        console.error("Failed to decode base64 string. This is the error:", e);
        console.error("Problematic base64 data (first 50 chars):", base64Data.substring(0, 50));
        throw e; // re-throw the error to be caught by the caller
    }
};

// Play a specific audio asset by key from the local IndexedDB cache
const playAsset = async (key: string, activeVoicePack: number): Promise<boolean> => {
    // Always load from the local cache for immediate playback
    const base64 = await loadCustomAudio(key, activeVoicePack);
    if (!base64 || base64.length < 50) return false;

    try {
        initAudioContext();
        if (!audioContext) return false;

        const audioBuffer = await audioContext.decodeAudioData(base64ToArrayBuffer(base64));
        
        if (activeSource) {
            try { activeSource.stop(); } catch (e) {}
        }

        const source = audioContext.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(audioContext.destination);
        source.start(0);
        activeSource = source;
        return true;
    } catch (error) {
        console.error(`Failed to play cached audio asset: ${key}`, error);
        return false;
    }
};

// Text-to-Speech Fallback
let ASSISTANT_VOICE: SpeechSynthesisVoice | null = null;

const findAssistantVoice = () => {
    if (!('speechSynthesis' in window)) return;
    const voices = window.speechSynthesis.getVoices();
    if (voices.length === 0) return;

    const preferredNames = ['samantha', 'google us english', 'microsoft zira', 'victoria']; 
    const englishVoices = voices.filter(v => v.lang.startsWith('en-'));
    
    ASSISTANT_VOICE = 
        englishVoices.find(v => preferredNames.some(n => v.name.toLowerCase().includes(n))) ||
        englishVoices.find(v => v.name.toLowerCase().includes('female')) ||
        englishVoices.find(v => !v.name.toLowerCase().includes('male')) ||
        englishVoices[0];
};

if ('speechSynthesis' in window) {
    window.speechSynthesis.onvoiceschanged = findAssistantVoice;
}
findAssistantVoice();

const speakFallback = (text: string) => {
    if (!('speechSynthesis' in window)) return;
    findAssistantVoice();
    window.speechSynthesis.cancel(); 
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    if (ASSISTANT_VOICE) {
        utterance.voice = ASSISTANT_VOICE;
        utterance.pitch = 1.0;
        utterance.rate = 1.0; // Adjusted rate from 1.1 to 1.0 for more natural speech
    }
    window.speechSynthesis.speak(utterance);
};


// --- MAIN EXPORTED FUNCTION ---
export const playAnnouncement = async (key: string, fallbackText: string, activeVoicePack: number = 1) => {
    // Special case for silent audio to keep audio context alive on mobile
    if (key === 'silence') {
        initAudioContext();
        if (!audioContext) return;
        try {
            // THE ULTIMATE FIX: Programmatically create a silent buffer instead of decoding a file.
            // This is the idiomatic Web Audio API way and is guaranteed to work.
            const buffer = audioContext.createBuffer(1, 1, 22050); // 1 channel, 1 frame, 22.05kHz sample rate
            const source = audioContext.createBufferSource();
            source.buffer = buffer;
            source.connect(audioContext.destination);
            source.start(0);
        } catch(e) { 
            console.error("Failed to play programmatically generated silence track", e);
        }
        return;
    }

    // 1. Try to play custom MP3 asset from local cache
    const played = await playAsset(key, activeVoicePack);
    
    // 2. If no MP3 found in cache, use TTS Fallback
    if (!played) {
        console.log(`Cached audio for '${key}' not found. Using TTS fallback.`);
        speakFallback(fallbackText);
    } else {
        console.log(`Playing cached audio for: ${key}`);
    }
};

// --- IMAGE OPTIMIZATION LOGIC (UPDATED) ---
// TUNED FOR QUALITY: 1600px width + 0.90 quality.
// This ensures images look crisp on Retina displays and exports, while still preventing the 10MB+ file issue.
export const processPlayerImageFile = (file: File): Promise<{ cardImage: string; avatarImage: string }> => {
    return new Promise((resolve, reject) => {
        const objectUrl = URL.createObjectURL(file);
        const img = new Image();

        img.onload = () => {
            try {
                const cardCanvas = document.createElement('canvas');
                const cardCtx = cardCanvas.getContext('2d');
                
                // QUALITY SETTING: 1600px is sufficient for full-screen mobile and high-quality exports.
                const maxWidth = 1600; 
                let { width, height } = img;
                
                if (width > maxWidth) {
                    height = Math.round((height * maxWidth) / width);
                    width = maxWidth;
                }

                cardCanvas.width = width;
                cardCanvas.height = height;
                cardCtx?.drawImage(img, 0, 0, width, height);
                
                // QUALITY SETTING: 0.90 preserves high detail without the bloat of uncompressed PNGs.
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
                // Avatars are small, so 0.85 quality is perfectly fine and saves space.
                const avatarImage = avatarCanvas.toDataURL('image/jpeg', 0.85);

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
