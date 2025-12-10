
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
    // We do NOT call resume() here blindly, as it returns a Promise that must be handled.
    // We handle the 'suspended' state check directly in playAsset.
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
    try {
        // 1. Load from Local Cache (No Internet Required)
        const base64 = await loadCustomAudio(key, activeVoicePack);
        if (!base64 || base64.length < 50) return false;

        // 2. Initialize Context
        initAudioContext();
        if (!audioContext) return false;

        // 3. WAKE LOCK: Check if browser suspended audio (common on mobile after silence)
        if (audioContext.state === 'suspended') {
            await audioContext.resume();
        }

        // 4. Decode
        const audioBuffer = await audioContext.decodeAudioData(base64ToArrayBuffer(base64));
        
        // 5. Stop previous sound if any (prevents overlap)
        if (activeSource) {
            try { activeSource.stop(); } catch (e) {}
        }

        // 6. Play
        const source = audioContext.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(audioContext.destination);
        source.start(0);
        activeSource = source;
        
        return true;
    } catch (error) {
        console.error(`Failed to play cached audio asset: ${key}`, error);
        // Important: Return false so the app falls back to TTS
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
    
    // Ensure we have voices loaded
    if (!ASSISTANT_VOICE) findAssistantVoice();
    
    window.speechSynthesis.cancel(); 
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    if (ASSISTANT_VOICE) {
        utterance.voice = ASSISTANT_VOICE;
        utterance.pitch = 1.0;
        utterance.rate = 1.0; 
    }
    window.speechSynthesis.speak(utterance);
};


// --- MAIN EXPORTED FUNCTION ---
export const playAnnouncement = async (key: string, fallbackText: string, activeVoicePack: number = 1) => {
    // Special case for silent audio to keep audio context alive on mobile
    if (key === 'silence') {
        initAudioContext();
        if (audioContext) {
            try {
                if (audioContext.state === 'suspended') await audioContext.resume();
                const buffer = audioContext.createBuffer(1, 1, 22050); 
                const source = audioContext.createBufferSource();
                source.buffer = buffer;
                source.connect(audioContext.destination);
                source.start(0);
            } catch(e) { 
                console.error("Failed to play silence", e);
            }
        }
        return;
    }

    // 1. Try to play custom MP3 asset from local cache
    const played = await playAsset(key, activeVoicePack);
    
    // 2. If no MP3 found in cache OR playback failed (e.g. context blocked), use TTS Fallback
    if (!played) {
        console.log(`Audio '${key}' failed or missing. Using TTS fallback.`);
        speakFallback(fallbackText);
    } else {
        console.log(`Playing cached audio for: ${key}`);
    }
};

// Image Processing Utility (OPTIMIZED FOR TRAFFIC)
export const processPlayerImageFile = (file: File): Promise<{ cardImage: string; avatarImage: string }> => {
    return new Promise((resolve, reject) => {
        const objectUrl = URL.createObjectURL(file);
        const img = new Image();

        img.onload = () => {
            try {
                const cardCanvas = document.createElement('canvas');
                const cardCtx = cardCanvas.getContext('2d');
                
                // QUALITY UPGRADE: Increased max width to 1000px for sharper exports.
                const maxWidth = 1000; 
                
                let { width, height } = img;
                
                if (width > maxWidth) {
                    height = Math.round((height * maxWidth) / width);
                    width = maxWidth;
                }

                cardCanvas.width = width;
                cardCanvas.height = height;
                cardCtx?.drawImage(img, 0, 0, width, height);
                
                // QUALITY UPGRADE: Increased JPEG quality to 0.90
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
                
                // QUALITY UPGRADE: Increased JPEG quality to 0.90
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
