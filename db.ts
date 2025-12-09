import { createClient } from '@supabase/supabase-js';
import { Player, Session, NewsItem } from './types';
import { Language } from './translations/index';
import { get, set, del, keys } from 'idb-keyval';

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

// --- TIMEOUT HELPER ---
// Wraps a promise with a timeout. If the promise takes too long, it rejects.
// We use PromiseLike<any> to accept Supabase Builders without strict type fighting
const withTimeout = <T>(promise: Promise<T> | PromiseLike<T>, ms: number = 3000): Promise<T> => {
    return Promise.race([
        Promise.resolve(promise),
        new Promise<T>((_, reject) => 
            setTimeout(() => reject(new Error('Database Request Timeout')), ms)
        )
    ]);
};

// --- DEMO DATA FILTER ---
const isDemoData = (id: string) => id.startsWith('demo_');

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
    if (isDemoData(playerId)) return null; // Block demo uploads

    try {
        const blob = base64ToBlob(base64Image);
        const fileExtension = blob.type.split('/')[1] || 'jpeg'; // e.g., 'jpeg'
        const filePath = `${playerId}/${type}_${Date.now()}.${fileExtension}`;

        const { error: uploadError } = await supabase!.storage
            .from(BUCKET_NAME)
            .upload(filePath, blob, {
                cacheControl: '31536000', // 1 Year Cache (drastically reduces Egress)
                upsert: true, 
            });

        if (uploadError) throw uploadError;

        const { data } = supabase!.storage.from(BUCKET_NAME).getPublicUrl(filePath);
        return data.publicUrl;

    } catch (error: any) {
        console.error('Error uploading image:', error);
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
    if (isDemoData(player.id)) return; // Don't save demo players

    if (!isSupabaseConfigured()) {
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

// --- SINGLE PLAYER LOAD ---
export const loadSinglePlayerFromDB = async (id: string): Promise<Player | null> => {
    if (!isSupabaseConfigured()) {
        const allPlayers = await get<Player[]>('players') || [];
        return allPlayers.find(p => p.id === id) || null;
    }

    try {
        // Wrap network call with timeout to prevent hanging
        const response = await withTimeout(supabase!
            .from('players')
            .select('*')
            .eq('id', id)
            .single());
            
        // Explicitly cast response to any to avoid TS build errors with PostgrestBuilder types
        const { data, error } = response as any;

        if (error) {
            if (error.code === 'PGRST116') { 
                return null;
            }
            throw error;
        }
        return data as Player;
    } catch (error) {
        console.error(`Supabase Load Single Player Error (ID: ${id}):`, error);
        const allPlayers = await get<Player[]>('players') || [];
        return allPlayers.find(p => p.id === id) || null;
    }
};


// --- PLAYERS (Bulk Save) ---
export const savePlayersToDB = async (players: Player[]) => {
    logStorageMode();
    const realPlayers = players.filter(p => !isDemoData(p.id));
    if (realPlayers.length === 0) return; 
    
    // Mode 1: Cloud
    if (isSupabaseConfigured()) {
        try {
            const CHUNK_SIZE = 2; 
            for (let i = 0; i < realPlayers.length; i += CHUNK_SIZE) {
                const chunk = realPlayers.slice(i, i + CHUNK_SIZE);
                const { error } = await supabase!
                    .from('players')
                    .upsert(chunk, { onConflict: 'id' });
                
                if (error) throw error;
                await new Promise(resolve => setTimeout(resolve, 50));
            }
        } catch (error) {
            console.error("Supabase Save Error (Batch):", error);
            throw error;
        }
    } 
    // Mode 2: Local Fallback
    else {
        try {
            const allPlayers = await get<Player[]>('players') || [];
            const playersMap = new Map(allPlayers.map(p => [p.id, p]));
            realPlayers.forEach(playerToSave => {
                playersMap.set(playerToSave.id, playerToSave);
            });
            const updatedPlayers = Array.from(playersMap.values());
            await set('players', updatedPlayers);
        } catch (error) {
            // Silent
        }
    }
};

export const loadPlayersFromDB = async (): Promise<Player[] | undefined> => {
    logStorageMode();

    // Mode 1: Cloud with Timeout
    if (isSupabaseConfigured()) {
        try {
            // Force timeout after 3s if Supabase is blocked/slow
            const response = await withTimeout(supabase!
                .from('players')
                .select('*'));
            
            // Explicitly cast response to any
            const { data, error } = response as any;

            if (error) throw error;
            return data as Player[];
        } catch (error) {
            // If cloud fails or times out, FALLBACK to local
            console.warn("Supabase unavailable or timed out, loading from local cache.");
            return await get('players');
        }
    } 
    // Mode 2: Local Only
    else {
        try {
            return await get('players');
        } catch (error) {
            return undefined;
        }
    }
};

// --- ACTIVE SESSION ---
export const saveActiveSessionToDB = async (session: Session | null) => {
    try {
        if (session && !isDemoData(session.id)) {
            await set('activeSession', session);
        } else if (!session) {
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
    const realHistory = history.filter(s => !isDemoData(s.id));
    if (realHistory.length === 0 && history.length > 0) return;

    if (isSupabaseConfigured()) {
        try {
            const { error } = await supabase!
                .from('sessions')
                .upsert(realHistory, { onConflict: 'id' });
            if (error) throw error;
        } catch (error) {
            console.error("Supabase Save History Error:", error);
            throw error;
        }
    } 
    else {
        try {
            await set('history', realHistory);
        } catch (error) {
            // Silent
        }
    }
};

export const loadHistoryFromDB = async (): Promise<Session[] | undefined> => {
    if (isSupabaseConfigured()) {
        try {
            const response = await withTimeout(supabase!
                .from('sessions')
                .select('*')
                .order('createdAt', { ascending: false }));
            
            // Explicitly cast response to any
            const { data, error } = response as any;

            if (error) throw error;
            return data as Session[];
        } catch (error) {
            return await get('history');
        }
    } 
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
    const realNews = news.filter(n => !isDemoData(n.id));
    if (realNews.length === 0 && news.length > 0) return;

    if (isSupabaseConfigured()) {
        try {
            const { error } = await supabase!
                .from('news')
                .upsert(realNews, { onConflict: 'id' });
            if (error) throw error;
        } catch (error) {
            console.error("Supabase Save News Error:", error);
            throw error;
        }
    } 
    else {
        try {
            await set('newsFeed', realNews);
        } catch (error) {
            // Silent
        }
    }
};

export const loadNewsFromDB = async (): Promise<NewsItem[] | undefined> => {
    if (isSupabaseConfigured()) {
        try {
            const response = await withTimeout(supabase!
                .from('news')
                .select('*')
                .order('timestamp', { ascending: false }));
            
            // Explicitly cast response to any
            const { data, error } = response as any;

            if (error) throw error;
            return data as NewsItem[];
        } catch (error) {
            return await get('newsFeed');
        }
    } 
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

// --- VOICE PACK (Always Local) ---
export const saveActiveVoicePackToDB = async (packNumber: number) => {
    try { await set('activeVoicePack', packNumber); } catch (e) {}
};
export const loadActiveVoicePackFromDB = async (): Promise<number | undefined> => {
    try { return await get('activeVoicePack'); } catch(e) { return undefined; }
};

// --- HYBRID AUDIO ASSETS ---
const AUDIO_BUCKET = 'audio_assets';
const AUDIO_KEY_PREFIX = 'audio_';
type CachedAudio = { data: string; lastModified: string };

const getCacheKey = (key: string, packNumber: number) => `${AUDIO_KEY_PREFIX}pack${packNumber}_${key}`;

export const saveCustomAudio = async (key: string, base64: string, packNumber: number): Promise<void> => {
    const cacheKey = getCacheKey(key, packNumber);
    if (!isSupabaseConfigured()) {
        await set(cacheKey, { data: base64, lastModified: new Date().toISOString() });
        return;
    }
    try {
        const blob = base64ToBlob(base64);
        const filePath = `pack${packNumber}/${key}.mp3`;
        const { error } = await supabase!.storage.from(AUDIO_BUCKET).upload(filePath, blob, { 
            cacheControl: '31536000', // 1 Year Cache
            upsert: true 
        });
        if (error) throw error;
        await set(cacheKey, { data: base64, lastModified: new Date().toISOString() });
    } catch (error) {
        console.error("Failed to save/upload custom audio:", error);
        throw error;
    }
};

export const loadCustomAudio = async (key: string, packNumber: number): Promise<string | undefined> => {
    const cacheKey = getCacheKey(key, packNumber);
    try {
        const cached = await get<CachedAudio>(cacheKey);
        return cached?.data;
    } catch (error) {
        console.error("Failed to load custom audio from cache:", error);
        return undefined;
    }
};

export const deleteCustomAudio = async (key: string, packNumber: number): Promise<void> => {
    const cacheKey = getCacheKey(key, packNumber);
    if (isSupabaseConfigured()) {
        try {
            const filePath = `pack${packNumber}/${key}.mp3`;
            await supabase!.storage.from(AUDIO_BUCKET).remove([filePath]);
            if (packNumber === 1) await supabase!.storage.from(AUDIO_BUCKET).remove([`${key}.mp3`]);
        } catch (error) {
            console.error("Failed to delete custom audio from cloud:", error);
        }
    }
    try {
        await del(cacheKey);
    } catch (error) {
        console.error("Failed to delete custom audio from cache:", error);
    }
};

const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
};

export const syncAndCacheAudioAssets = async () => {
    if (!isSupabaseConfigured()) return;

    try {
        const response = await withTimeout(supabase!.storage.from(AUDIO_BUCKET).list('', {
            limit: 100,
            offset: 0,
            sortBy: { column: 'name', order: 'asc' },
        }), 5000); // 5s timeout for sync, it's non-blocking
        
        // Explicitly cast response to any
        const { data: cloudFiles, error } = response as any;
        
        if (error) throw error;
        if (!cloudFiles) return;

        const allLocalCacheKeys = (await keys()).filter(k => typeof k === 'string' && k.startsWith(AUDIO_KEY_PREFIX));
        const localKeySet = new Set(allLocalCacheKeys);

        for (const cloudFile of cloudFiles) {
            const isRootFile = !cloudFile.name.includes('/');
            if (isRootFile && !cloudFile.name.endsWith('.mp3')) continue;

            const packNumber = isRootFile ? 1 : parseInt(cloudFile.name.split('/')[0].replace('pack', ''), 10);
            const key = isRootFile ? cloudFile.name.replace('.mp3', '') : cloudFile.name.split('/')[1].replace('.mp3', '');

            if (isNaN(packNumber)) continue;

            const cacheKey = getCacheKey(key, packNumber);
            localKeySet.delete(cacheKey); 

            const localAsset = await get<CachedAudio>(cacheKey);
            const cloudLastModified = new Date(cloudFile.updated_at || cloudFile.created_at).getTime();
            const localLastModified = localAsset ? new Date(localAsset.lastModified).getTime() : 0;

            if (!localAsset || cloudLastModified > localLastModified) {
                console.log(`Downloading audio [Pack ${packNumber}]: ${key}`);
                const { data: blob, error: downloadError } = await supabase!.storage.from(AUDIO_BUCKET).download(cloudFile.name);
                if (downloadError) throw downloadError;
                if (blob) {
                    const base64 = await blobToBase64(blob);
                    await set(cacheKey, { data: base64, lastModified: new Date(cloudLastModified).toISOString() });
                }
            }
        }
        
        for (const keyToDelete of localKeySet) {
            await del(keyToDelete);
        }

    } catch (error) {
        console.error("Failed to sync audio assets (Non-critical):", error);
    }
};

// --- SESSION ANTHEM (SINGLE TRACK) ---
const MUSIC_BUCKET = 'session_music';
const ANTHEM_FILENAME = 'anthem.mp3';

export const uploadSessionAnthem = async (base64: string): Promise<string | null> => {
    const localKey = 'session_anthem';
    if (!isSupabaseConfigured()) {
        await set(localKey, base64);
        return base64;
    }
    try {
        const blob = base64ToBlob(base64);
        const { error } = await supabase!.storage.from(MUSIC_BUCKET).upload(ANTHEM_FILENAME, blob, { 
            cacheControl: '31536000', // 1 Year Cache
            upsert: true 
        });
        if (error) throw error;
        const { data } = supabase!.storage.from(MUSIC_BUCKET).getPublicUrl(ANTHEM_FILENAME);
        return data.publicUrl;
    } catch (error) {
        console.error("Failed to upload session anthem:", error);
        throw error;
    }
};

export const deleteSessionAnthem = async (): Promise<void> => {
    const localKey = 'session_anthem';
    if (!isSupabaseConfigured()) {
        await del(localKey);
        return;
    }
    try {
        await supabase!.storage.from(MUSIC_BUCKET).remove([ANTHEM_FILENAME]);
    } catch (error) {
        console.error("Failed to delete session anthem:", error);
    }
};

export const getSessionAnthemUrl = async (): Promise<string | null> => {
    const localKey = 'session_anthem';
    if (!isSupabaseConfigured()) {
        return await get<string>(localKey) || null;
    }
    try {
        const response = await withTimeout(supabase!.storage.from(MUSIC_BUCKET).list());
        // Explicitly cast response to any
        const { data, error } = response as any;

        if (error) throw error;
        
        const anthemFile = data.find((file: any) => file.name === ANTHEM_FILENAME);
        if (anthemFile) {
            const { data: urlData } = supabase!.storage.from(MUSIC_BUCKET).getPublicUrl(ANTHEM_FILENAME);
            return `${urlData.publicUrl}?t=${new Date(anthemFile.updated_at).getTime()}`;
        }
        return null;
    } catch (error) {
        console.error("Failed to get session anthem URL:", error);
        return null;
    }
};