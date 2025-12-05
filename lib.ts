
import { loadCustomAudio } from './db';

// --- HYBRID AUDIO SYSTEM ---
// Priority: 1. User-Uploaded MP3 (IndexedDB) -> 2. Text-to-Speech (Fallback)

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

// Helper to decode Base64 string to ArrayBuffer
const base64ToArrayBuffer = (base64: string) => {
    const binaryString = window.atob(base64.split(',')[1] || base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
};

// Play a specific audio asset by key from IndexedDB
const playAsset = async (key: string): Promise<boolean> => {
    const base64 = await loadCustomAudio(key);
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
        console.error(`Failed to play custom audio asset: ${key}`, error);
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
        utterance.rate = 1.1;
    }
    window.speechSynthesis.speak(utterance);
};


// --- MAIN EXPORTED FUNCTION ---
const silentAudioMp3 = 'data:audio/mp3;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4Ljc2LjEwMAAAAAAAAAAAAAAA//OEAAAAAAAAAAAAAAAAAAAAAAAASW5mbwAAAA8AAAAEAAABIADAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMD//////////////////////////////////////////////////////////////////wAAAP//OEAAAAAAAAAAAAAAAAAAAAAATEFNRTMuMTAwVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV//OEAAAAAAAAAAAAAAAAAAAAAAptgAAAAAABIAAADaA4AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA//OEAAAAAAAAAAAAAAAAAAAAAAAAAAA0gAAAAAAABIAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA==';

export const playAnnouncement = async (key: string, fallbackText: string) => {
    // Special case for silent audio to keep audio context alive on mobile
    if (key === 'silence') {
        initAudioContext();
        if (!audioContext) return;
        try {
            const audioBuffer = await audioContext.decodeAudioData(base64ToArrayBuffer(silentAudioMp3));
            const source = audioContext.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(audioContext.destination);
            source.start(0);
        } catch(e) { console.error("Failed to play silence track", e)}
        return;
    }

    // 1. Try to play custom MP3 asset from DB
    const played = await playAsset(key);
    
    // 2. If no MP3 found, use TTS Fallback
    if (!played) {
        console.log(`Custom audio for '${key}' not found. Using TTS fallback.`);
        speakFallback(fallbackText);
    } else {
        console.log(`Playing custom audio for: ${key}`);
    }
};

// Image Processing Utility (Unchanged)
export const processPlayerImageFile = (file: File): Promise<{ cardImage: string; avatarImage: string }> => {
    return new Promise((resolve, reject) => {
        const objectUrl = URL.createObjectURL(file);
        const img = new Image();

        img.onload = () => {
            try {
                const cardCanvas = document.createElement('canvas');
                const cardCtx = cardCanvas.getContext('2d');
                const maxWidth = 2560; 
                let { width, height } = img;
                
                if (width > maxWidth) {
                    height = Math.round((height * maxWidth) / width);
                    width = maxWidth;
                }

                cardCanvas.width = width;
                cardCanvas.height = height;
                cardCtx?.drawImage(img, 0, 0, width, height);
                
                const cardImage = cardCanvas.toDataURL('image/jpeg', 0.95);

                const avatarCanvas = document.createElement('canvas');
                const avatarCtx = avatarCanvas.getContext('2d');
                const side = Math.min(cardCanvas.width, cardCanvas.height);
                avatarCanvas.width = side;
                avatarCanvas.height = side;
                if (!avatarCtx) throw new Error("Could not create avatar canvas context");

                const sx = (cardCanvas.width - side) / 2;
                const sy = (cardCanvas.height - side) / 8; 
                
                avatarCtx.drawImage(cardCanvas, sx, sy, side, side, 0, 0, side, side);
                const avatarImage = avatarCanvas.toDataURL('image/jpeg', 0.95);

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
