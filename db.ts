
import { createClient } from '@supabase/supabase-js';
import { Player, Session, NewsItem } from './types';
import { Language } from './translations';
import { get, set } from 'idb-keyval';

// --- SUPABASE CONFIGURATION ---
// Universal environment variable access (works in Vite, Next.js, and standard Node)
const getEnvVar = (key: string) => {
    try {
        // @ts-ignore
        if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env[key]) {
            // @ts-ignore
            return import.meta.env[key];
        }
    } catch (e) {
        // Ignore errors if import.meta is not defined
    }

    try {
        if (typeof process !== 'undefined' && process.env && process.env[key]) {
            return process.env[key];
        }
    } catch (e) {
        // Ignore errors
    }
    
    return undefined;
};

const supabaseUrl = getEnvVar('VITE_SUPABASE_URL');
const supabaseAnonKey = getEnvVar('VITE_SUPABASE_ANON_KEY');

// Initialize Supabase ONLY if keys are present
const supabase = (supabaseUrl && supabaseAnonKey) 
    ? createClient(supabaseUrl, supabaseAnonKey) 
    : null;

export const isSupabaseConfigured = () => !!supabase;

// Helper to log storage mode (once per session to avoid spam)
let hasLoggedMode = false;
const logStorageMode = () => {
    if (!hasLoggedMode) {
        // Only log if we are actually connected to cloud, otherwise stay silent for clean terminal
        if (isSupabaseConfigured()) {
            console.log('🔌 Connected to Cloud Database (Supabase)');
        }
        hasLoggedMode = true;
    }
};

// --- BASE64 to Blob HELPER (Improved) ---
const base64ToBlob = (base64: string): Blob => {
    const parts = base64.split(';base64,');
    if (parts.length !== 2) {
        throw new Error('Invalid base64 string provided');
    }
    const contentType = parts[0].split(':')[1];
    const byteCharacters = atob(parts[1]);
    const byteArrays = [];
    for (let offset = 0; offset < byteCharacters.length; offset += 512) {
        const slice = byteCharacters.slice(offset, offset + 512);
        const byteNumbers = new Array(slice.length);
        for (let i = 0; i < slice.length; i++) {
            byteNumbers[i] = slice.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        byteArrays.push(byteArray);
    }
    return new Blob(byteArrays, { type: contentType });
};


// --- PLAYER IMAGES (Supabase Storage) ---
const BUCKET_NAME = 'player_images';

export const uploadPlayerImage = async (playerId: string, base64Image: string, type: 'avatar' | 'card'): Promise<string | null> => {
    if (!isSupabaseConfigured() || !base64Image) return null;

    try {
        const blob = base64ToBlob(base64Image);
        const fileExtension = blob.type.split('/')[1] || 'jpeg'; // e.g., 'jpeg'
        const filePath = `${playerId}/${type}_${Date.now()}.${fileExtension}`;

        const { error: uploadError } = await supabase!.storage
            .from(BUCKET_NAME)
            .upload(filePath, blob, {
                cacheControl: '3600',
                upsert: true, 
            });

        if (uploadError) throw uploadError;

        const { data } = supabase!.storage.from(BUCKET_NAME).getPublicUrl(filePath);
        return data.publicUrl;

    } catch (error: any) {
        console.error('Error uploading image:', error);
        
        // Detailed help for the user if they see the specific RLS error
        if (error.message && error.message.includes('row-level security policy')) {
            console.warn(
                "⚠️ UPLOAD BLOCKED BY SUPABASE POLICIES:\n" +
                "1. Go to Supabase Dashboard -> Storage -> player_images\n" +
                "2. Click 'Policies'\n" +
                "3. Add a new policy allowing INSERT/UPDATE/SELECT for 'anon' (public) role.\n" +
                "This is required for the app to save images."
            );
        }
        
        return null;
    }
};

export const deletePlayerImage = async (imageUrl: string) => {
    if (!isSupabaseConfigured() || !imageUrl) return;

    try {
        // Only attempt to delete if it's a Supabase URL, not a local base64 string
        if (!imageUrl.startsWith('https://')) return;

        const url = new URL(imageUrl);
        const path = url.pathname.split(`/${BUCKET_NAME}/`)[1];
        if (!path) return;

        await supabase!.storage.from(BUCKET_NAME).remove([path]);
    } catch (error) {
        console.error("Error deleting old image:", error);
    }
};

// --- SINGLE PLAYER SAVE (ATOMIC) ---
export const saveSinglePlayerToDB = async (player: Player) => {
    if (!isSupabaseConfigured()) {
        // Fallback for local-only mode: load all, update one, save all
        const allPlayers = await get<Player[]>('players') || [];
        const playerIndex = allPlayers.findIndex(p => p.id === player.id);
        if (playerIndex > -1) {
            allPlayers[playerIndex] = player;
        } else {
            allPlayers.push(player);
        }
        await set('players', allPlayers);
        return;
    }

    // Supabase Mode
    try {
        const { error } = await supabase!
            .from('players')
            .upsert(player, { onConflict: 'id' });
        if (error) throw error;
    } catch (error) {
        console.error("Supabase Save Single Player Error:", error);
        throw error;
    }
};


// --- PLAYERS (Legacy bulk save, updated with CHUNKING) ---
export const savePlayersToDB = async (players: Player[]) => {
    logStorageMode();
    
    // Mode 1: Cloud
    if (isSupabaseConfigured()) {
        try {
            // CRITICAL FIX: Split into VERY small chunks (2) to avoid Supabase payload size limits 
            // especially with high-res base64 images. 
            // Previous limit of 5 was still occasionally causing timeouts.
            const CHUNK_SIZE = 2; 
            for (let i = 0; i < players.length; i += CHUNK_SIZE) {
                const chunk = players.slice(i, i + CHUNK_SIZE);
                const { error } = await supabase!
                    .from('players')
                    .upsert(chunk, { onConflict: 'id' });
                
                if (error) throw error;
                // Small delay to be nice to the database and prevent rate limits
                await new Promise(resolve => setTimeout(resolve, 100));
            }
        } catch (error) {
            console.error("Supabase Save Error (Batch):", error);
            throw error;
        }
    } 
    // Mode 2: Local Fallback
    else {
        try {
            await set('players', players);
        } catch (error) {
            // Silent fail or minimal log
        }
    }
};

export const loadPlayersFromDB = async (): Promise<Player[] | undefined> => {
    logStorageMode();

    // Mode 1: Cloud
    if (isSupabaseConfigured()) {
        try {
            const { data, error } = await supabase!
                .from('players')
                .select('*');
            if (error) throw error;
            return data as Player[];
        } catch (error) {
            // If cloud fails, try local quietly
            return await get('players');
        }
    } 
    // Mode 2: Local Fallback
    else {
        try {
            return await get('players');
        } catch (error) {
            return undefined;
        }
    }
};

// --- ACTIVE SESSION ---
// Active session is ALWAYS local (IndexedDB) for performance and offline stability during games.
export const saveActiveSessionToDB = async (session: Session | null) => {
    try {
        if (session) {
            await set('activeSession', session);
        } else {
            await set('activeSession', null);
        }
    } catch (error) {
        // Silent
    }
};

export const loadActiveSessionFromDB = async (): Promise<Session | null | undefined> => {
    try {
        return await get('activeSession');
    } catch (error) {
        return undefined;
    }
};

// --- HISTORY (SESSIONS) ---
export const saveHistoryToDB = async (history: Session[]) => {
    // Mode 1: Cloud
    if (isSupabaseConfigured()) {
        try {
            const { error } = await supabase!
                .from('sessions')
                .upsert(history, { onConflict: 'id' });
            if (error) throw error;
        } catch (error) {
            console.error("Supabase Save History Error:", error);
            throw error;
        }
    } 
    // Mode 2: Local Fallback
    else {
        try {
            await set('history', history);
        } catch (error) {
            // Silent
        }
    }
};

export const loadHistoryFromDB = async (): Promise<Session[] | undefined> => {
    // Mode 1: Cloud
    if (isSupabaseConfigured()) {
        try {
            const { data, error } = await supabase!
                .from('sessions')
                .select('*')
                .order('createdAt', { ascending: false });
            if (error) throw error;
            return data as Session[];
        } catch (error) {
            return await get('history');
        }
    } 
    // Mode 2: Local Fallback
    else {
        try {
            return await get('history');
        } catch (error) {
            return undefined;
        }
    }
};

// --- NEWS FEED ---
export const saveNewsToDB = async (news: NewsItem[]) => {
    // Mode 1: Cloud
    if (isSupabaseConfigured()) {
        try {
            const { error } = await supabase!
                .from('news')
                .upsert(news, { onConflict: 'id' });
            if (error) throw error;
        } catch (error) {
            console.error("Supabase Save News Error:", error);
            throw error;
        }
    } 
    // Mode 2: Local Fallback
    else {
        try {
            await set('newsFeed', news);
        } catch (error) {
            // Silent
        }
    }
};

export const loadNewsFromDB = async (): Promise<NewsItem[] | undefined> => {
    // Mode 1: Cloud
    if (isSupabaseConfigured()) {
        try {
            const { data, error } = await supabase!
                .from('news')
                .select('*')
                .order('timestamp', { ascending: false });
            if (error) throw error;
            return data as NewsItem[];
        } catch (error) {
            return await get('newsFeed');
        }
    } 
    // Mode 2: Local Fallback
    else {
        try {
            return await get('newsFeed');
        } catch (error) {
            return undefined;
        }
    }
};

// --- LANGUAGE (Always Local) ---
export const saveLanguageToDB = async (lang: Language) => {
    try {
        await set('language', lang);
    } catch (error) {
        // Silent
    }
};

export const loadLanguageFromDB = async (): Promise<Language | undefined> => {
    try {
        return await get('language');
    } catch (error) {
        return undefined;
    }
};
