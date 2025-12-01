


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

// Image Cropping Utility for Avatars
export const cropImageToAvatar = (base64Str: string): Promise<string> => {
    return new Promise((resolve) => {
        const img = new (window as any).Image();
        img.src = base64Str;
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const side = Math.min(img.width, img.height);
            canvas.width = side;
            canvas.height = side;
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                resolve(base64Str); // fallback
                return;
            }
            const sx = (img.width - side) / 2;
            
            // ADJUSTED CROP: Previously sy was centered ((img.height - side) / 2).
            // Now we divide by 8 to bias the crop upwards (top-weighted).
            // This ensures heads/hair are not cut off in portrait photos.
            const sy = (img.height - side) / 8; 
            
            ctx.drawImage(img, sx, sy, side, side, 0, 0, side, side);
            resolve(canvas.toDataURL('image/png')); // Use PNG for better quality
        };
        img.onerror = () => {
            resolve(base64Str); // Fail safe
        };
    });
};