// Text-to-Speech Utility for Voice Assistant
let ASSISTANT_VOICE: SpeechSynthesisVoice | null = null;

const findAssistantVoice = () => {
    if (!('speechSynthesis' in window)) return;

    const voices = window.speechSynthesis.getVoices();
    if (voices.length === 0) return; // Voices might not be loaded yet

    // Extended list of preferred female voices for various platforms
    const preferredNames = [
        'samantha', // macOS/iOS
        'google us english', // Android (often female default)
        'google uk english female',
        'microsoft zira', // Windows
        'victoria', // macOS
        'karen', // macOS
        'moira', // macOS
        'tessa', // macOS
        'veena', // macOS
        'martha', // Android
        'catherine', // Android
        'yu-shu' // Android
    ];
    
    const englishVoices = voices.filter(v => v.lang.startsWith('en-'));
    
    // 1. Exact match from preferred list
    for (const name of preferredNames) {
        const found = englishVoices.find(v => v.name.toLowerCase().includes(name));
        if (found) {
            ASSISTANT_VOICE = found;
            return;
        }
    }
    
    // 2. Generic "female" or "woman" voice search
    const femaleVoice = englishVoices.find(v => 
        v.name.toLowerCase().includes('female') || 
        v.name.toLowerCase().includes('woman')
    );
    if (femaleVoice) {
        ASSISTANT_VOICE = femaleVoice;
        return;
    }
    
    // 3. Fallback: any voice that is NOT explicitly male
    const notMaleVoice = englishVoices.find(v => !v.name.toLowerCase().includes('male'));
    if (notMaleVoice) {
        ASSISTANT_VOICE = notMaleVoice;
        return;
    }
    
    // 4. Last resort: first available English voice
    ASSISTANT_VOICE = englishVoices[0] || voices[0];
};


// Listen for voices to be loaded, as this can be asynchronous
if ('speechSynthesis' in window && typeof window.speechSynthesis.onvoiceschanged !== 'undefined') {
    window.speechSynthesis.onvoiceschanged = findAssistantVoice;
}
findAssistantVoice(); // Initial call

export const speak = (text: string) => {
  if ('speechSynthesis' in window) {
    // AGGRESSIVE RE-CHECK: On mobile, voices load late. 
    // Always try to find a better voice if we haven't found a preferred one yet.
    findAssistantVoice();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    if (ASSISTANT_VOICE) {
        utterance.voice = ASSISTANT_VOICE;
        utterance.pitch = 1.0; // Normal pitch for female voice
        utterance.rate = 1.0; // Normal rate
    }
    window.speechSynthesis.speak(utterance);
  } else {
    console.warn('Speech Synthesis not supported in this browser.');
  }
};

// Image Processing Utility
// REPLACED `cropImageToAvatar` with a unified, memory-safe function
export const processPlayerImageFile = (file: File): Promise<{ cardImage: string; avatarImage: string }> => {
    return new Promise((resolve, reject) => {
        // Use URL.createObjectURL to avoid reading the entire file into memory as a base64 string,
        // which causes crashes in memory-constrained environments with large files.
        const objectUrl = URL.createObjectURL(file);
        const img = new Image();

        img.onload = () => {
            try {
                // --- 1. Create Resized Card Image (JPEG for quality/size balance) ---
                const cardCanvas = document.createElement('canvas');
                const cardCtx = cardCanvas.getContext('2d');
                // UPDATED: Increased from 1080 to 2560 to support high-quality exports (Scale 7x)
                const maxWidth = 2560; 
                let { width, height } = img;
                
                if (width > maxWidth) {
                    height = Math.round((height * maxWidth) / width);
                    width = maxWidth;
                }

                cardCanvas.width = width;
                cardCanvas.height = height;
                cardCtx?.drawImage(img, 0, 0, width, height);
                // UPDATED: Use JPEG with 0.95 quality (Highest reasonable quality for storage)
                const cardImage = cardCanvas.toDataURL('image/jpeg', 0.95);

                // --- 2. Create Avatar from the RESIZED Card Image for memory safety ---
                const avatarCanvas = document.createElement('canvas');
                const avatarCtx = avatarCanvas.getContext('2d');
                
                // The avatar is now cropped from the already resized cardCanvas, not the full-res `img`
                const side = Math.min(cardCanvas.width, cardCanvas.height);
                avatarCanvas.width = side;
                avatarCanvas.height = side;
                if (!avatarCtx) throw new Error("Could not create avatar canvas context");

                const sx = (cardCanvas.width - side) / 2;
                // Top-weighted crop for headshots
                const sy = (cardCanvas.height - side) / 8; 
                
                avatarCtx.drawImage(cardCanvas, sx, sy, side, side, 0, 0, side, side);
                // Avatar can be smaller, also JPEG is fine and more performant.
                const avatarImage = avatarCanvas.toDataURL('image/jpeg', 0.95);

                resolve({ cardImage, avatarImage });

            } catch (error) {
                reject(error);
            } finally {
                // IMPORTANT: Clean up the object URL to free memory
                URL.revokeObjectURL(objectUrl);
            }
        };

        img.onerror = () => {
            URL.revokeObjectURL