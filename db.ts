
import { createClient } from '@supabase/supabase-js';
import { Player, Session, NewsItem } from './types';
import { Language } from './translations/index';
import { get, set, del, keys } from 'idb-keyval';

// --- SUPABASE CONFIGURATION ---
const getEnvVar = (key: string) => {
    try {
        // @ts-ignore
        if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env[key]) {
            // @ts-ignore
            return import.meta.env[key];
        }
    } catch (e) { }
    try {
        if (typeof process !== 'undefined' && process.env && process.env[key]) {
            return process.env[key];
        }
    } catch (e) { }
    return undefined;
};

const supabaseUrl = getEnvVar('VITE_SUPABASE_URL');
const supabaseAnonKey = getEnvVar('VITE_SUPABASE_ANON_KEY');

const supabase = (supabaseUrl && supabaseAnonKey) 
    ? createClient(supabaseUrl, supabaseAnonKey) 
    : null;

export const isSupabaseConfigured = () => !!supabase;

let hasLoggedMode = false;
const logStorageMode = () => {
    if (!hasLoggedMode) {
        if (isSupabaseConfigured()) {
            console.log('🔌 Connected to Cloud Database (Supabase)');
        }
        hasLoggedMode = true;
    }
};

// --- DEMO DATA FILTER ---
const isDemoData = (id: string) => id.startsWith('demo_');

// --- BASE64 to Blob HELPER ---
const base64ToBlob = (base64: string): Blob => {
    const parts = base64.split(';base64,');
    if (parts.length !== 2) throw new Error('Invalid base64 string provided');
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

// --- UTILS ---
export interface DbResult {
    success: boolean;
    message?: string;
    errorDetail?: any;
}

// Helper to remove NaN values and huge Base64 strings which break Supabase
const sanitizeObject = (obj: any): any => {
    if (obj === null || obj === undefined) return obj;
    
    // Convert NaN to 0
    if (typeof obj === 'number') {
        return isNaN(obj) ? 0 : obj;
    }
    
    // Arrays
    if (Array.isArray(obj)) {
        return obj.map(v => sanitizeObject(v));
    }
    
    // Objects
    if (typeof obj === 'object') {
        const newObj: any = {};
        for (const key in obj) {
            // STRIP BASE64 IMAGES FROM JSON PAYLOAD
            // CRITICAL FIX: Added 'playerPhoto' to blacklist to prevent News Feed Egress Leak
            if ((key === 'photo' || key === 'playerCard' || key === 'logo' || key === 'playerPhoto') && typeof obj[key] === 'string' && obj[key].startsWith('data:')) {
                newObj[key] = null; 
            } else {
                newObj[key] = sanitizeObject(obj[key]);
            }
        }
        return newObj;
    }
    return obj;
};


// --- PLAYER IMAGES ---
const BUCKET_NAME = 'player_images';

export const uploadPlayerImage = async (playerId: string, base64Image: string, type: 'avatar' | 'card'): Promise<string | null> => {
    if (!isSupabaseConfigured() || !base64Image) return null;
    if (isDemoData(playerId)) return null; 

    try {
        const blob = base64ToBlob(base64Image);
        const fileExtension = blob.type.split('/')[1] || 'jpeg';
        const filePath = `${playerId}/${type}_${Date.now()}.${fileExtension}`;

        const { error: uploadError } = await supabase!.storage
            .from(BUCKET_NAME)
            .upload(filePath, blob, { cacheControl: '3600', upsert: true });

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
        if (!imageUrl.startsWith('https://')) return;
        const url = new URL(imageUrl);
        const path = url.pathname.split(`/${BUCKET_NAME}/`)[1];
        if (!path) return;
        await supabase!.storage.from(BUCKET_NAME).remove([path]);
    } catch (error) {
        console.error("Error deleting old image:", error);
    }
};

// --- SINGLE PLAYER SAVE ---
export const saveSinglePlayerToDB = async (player: Player): Promise<DbResult> => {
    if (isDemoData(player.id)) return { success: true, message: "Demo data skipped" };

    // 1. Local Save (Always works, stores everything)
    try {
        const allPlayers = await get<Player[]>('players') || [];
        const playerIndex = allPlayers.findIndex(p => p.id === player.id);
        if (playerIndex > -1) allPlayers[playerIndex] = player;
        else allPlayers.push(player);
        await set('players', allPlayers);
    } catch (e) {
        console.error("Local save failed", e);
        return { success: false, message: "Local storage failure" };
    }

    // 2. Cloud Save
    if (isSupabaseConfigured()) {
        try {
            const sanitizedPlayer = sanitizeObject(player);
            // We now assume the user has added the 'records' column to Supabase
            
            const { error } = await supabase!
                .from('players')
                .upsert(sanitizedPlayer, { onConflict: 'id' });
            
            if (error) throw error;
            return { success: true };
        } catch (error: any) {
            console.error("Supabase Save Error:", error);
            return { success: false, message: `Cloud Sync Failed: ${error.message || 'Unknown error'}`, errorDetail: error };
        }
    }
    return { success: true, message: "Local only" };
};

// --- SINGLE PLAYER LOAD ---
export const loadSinglePlayerFromDB = async (id: string): Promise<Player | null> => {
    if (!isSupabaseConfigured()) {
        const allPlayers = await get<Player[]>('players') || [];
        return allPlayers.find(p => p.id === id) || null;
    }
    try {
        const { data, error } = await supabase!
            .from('players')
            .select('*')
            .eq('id', id)
            .single();
        if (error) {
            if (error.code === 'PGRST116') return null;
            throw error;
        }
        return data as Player;
    } catch (error) {
        console.warn(`Cloud load failed, trying local.`);
        const allPlayers = await get<Player[]>('players') || [];
        return allPlayers.find(p => p.id === id) || null;
    }
};


// --- PLAYERS (Batch Save) ---
export const savePlayersToDB = async (players: Player[]): Promise<DbResult> => {
    logStorageMode();
    const realPlayers = players.filter(p => !isDemoData(p.id));
    if (realPlayers.length === 0) return { success: true };
    
    let cloudError: any = null;

    // 1. Cloud Save
    if (isSupabaseConfigured()) {
        try {
            const cleanPlayers = realPlayers.map(p => sanitizeObject(p));
            // We now assume the user has added the 'records' column to Supabase

            const CHUNK_SIZE = 10; 
            for (let i = 0; i < cleanPlayers.length; i += CHUNK_SIZE) {
                const chunk = cleanPlayers.slice(i, i + CHUNK_SIZE);
                const { error } = await supabase!
                    .from('players')
                    .upsert(chunk, { onConflict: 'id' });
                if (error) throw error;
            }
        } catch (error: any) {
            console.error("Supabase Batch Save Error:", error);
            cloudError = error;
        }
    } 

    // 2. Local Save
    try {
        const allPlayers = await get<Player[]>('players') || [];
        const playersMap = new Map(allPlayers.map(p => [p.id, p]));
        realPlayers.forEach(playerToSave => {
            playersMap.set(playerToSave.id, playerToSave);
        });
        const updatedPlayers = Array.from(playersMap.values());
        await set('players', updatedPlayers);
    } catch (error) {
        console.error("Local Batch Save Error:", error);
        return { success: false, message: "Local save failed" };
    }

    if (cloudError) {
        return { success: false, message: `Saved locally, but Cloud failed: ${cloudError.message}`, errorDetail: cloudError };
    }
    return { success: true };
};

export const loadPlayersFromDB = async (): Promise<Player[] | undefined> => {
    if (isSupabaseConfigured()) {
        try {
            const { data, error } = await supabase!.from('players').select('*');
            if (error) throw error;
            return data as Player[];
        } catch (error) {
            console.warn("Cloud load failed, falling back to local.");
        }
    } 
    return await get('players');
};

// --- ACTIVE SESSION ---
export const saveActiveSessionToDB = async (session: Session | null) => {
    try {
        if (session && !isDemoData(session.id)) await set('activeSession', session);
        else if (!session) await set('activeSession', null);
    } catch (error) {}
};

export const loadActiveSessionFromDB = async (): Promise<Session | null | undefined> => {
    try { return await get('activeSession'); } catch (error) { return undefined; }
};

// --- HISTORY (SESSIONS) ---
export const saveHistoryToDB = async (history: Session[]): Promise<DbResult> => {
    const realHistory = history.filter(s => !isDemoData(s.id));
    if (realHistory.length === 0) return { success: true };

    let cloudError: any = null;

    // 1. Cloud Save
    if (isSupabaseConfigured()) {
        try {
            const optimizedHistory = realHistory.map(session => ({
                ...session,
                playerPool: session.playerPool.map(p => ({
                    ...p,
                    photo: undefined, 
                    playerCard: undefined 
                }))
            })).map(s => sanitizeObject(s));

            const { error } = await supabase!
                .from('sessions')
                .upsert(optimizedHistory, { onConflict: 'id' });
            if (error) throw error;
        } catch (error: any) {
            console.error("Supabase Save History Error:", error);
            cloudError = error;
        }
    } 

    // 2. Local Save
    try {
        const existingHistory = await get<Session[]>('history') || [];
        const historyMap = new Map<string, Session>();
        existingHistory.forEach(s => historyMap.set(s.id, s));
        realHistory.forEach(session => historyMap.set(session.id, session));
        
        const mergedHistory = Array.from(historyMap.values())
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
            
        await set('history', mergedHistory);
    } catch (error) {
        console.error("Local History Save Error:", error);
        return { success: false, message: "Local save failed" };
    }

    if (cloudError) {
        return { success: false, message: `Saved locally, but Cloud failed: ${cloudError.message}`, errorDetail: cloudError };
    }
    return { success: true };
};

export const loadHistoryFromDB = async (): Promise<Session[] | undefined> => {
    if (isSupabaseConfigured()) {
        try {
            const { data, error } = await supabase!
                .from('sessions')
                .select('*')
                .order('createdAt', { ascending: false });
            if (error) throw error;
            return data as Session[];
        } catch (error) {
            console.warn("Cloud history load failed, falling back to local.");
        }
    } 
    return await get('history');
};

// --- NEWS FEED ---
export const saveNewsToDB = async (news: NewsItem[]): Promise<DbResult> => {
    const realNews = news.filter(n => !isDemoData(n.id));
    if (realNews.length === 0) return { success: true };

    let cloudError: any = null;

    if (isSupabaseConfigured()) {
        try {
            const sanitizedNews = sanitizeObject(realNews);
            // We now assume the user has added the 'priority' column to Supabase

            const { error } = await supabase!
                .from('news')
                .upsert(sanitizedNews, { onConflict: 'id' });
            if (error) throw error;
        } catch (error: any) {
            console.error("Supabase Save News Error:", error);
            cloudError = error;
        }
    } 

    try {
        const existingNews = await get<NewsItem[]>('newsFeed') || [];
        const newsMap = new Map<string, NewsItem>();
        existingNews.forEach(n => newsMap.set(n.id, n));
        realNews.forEach(item => newsMap.set(item.id, item));
        
        const mergedNews = Array.from(newsMap.values())
            .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
            .slice(0, 50); 
            
        await set('newsFeed', mergedNews);
    } catch (error) { }

    if (cloudError) return { success: false, message: cloudError.message, errorDetail: cloudError };
    return { success: true };
};

export const loadNewsFromDB = async (): Promise<NewsItem[] | undefined> => {
    if (isSupabaseConfigured()) {
        try {
            const { data, error } = await supabase!
                .from('news')
                .select('*')
                .order('timestamp', { ascending: false });
            if (error) throw error;
            return data as NewsItem[];
        } catch (error) {}
    } 
    return await get('newsFeed');
};

// --- REST OF FILE UNCHANGED ---
export const saveLanguageToDB = async (lang: Language) => { try { await set('language', lang); } catch (error) {} };
export const loadLanguageFromDB = async (): Promise<Language | undefined> => { try { return await get('language'); } catch (error) { return undefined; } };
export const saveActiveVoicePackToDB = async (packNumber: number) => { try { await set('activeVoicePack', packNumber); } catch (e) {} };
export const loadActiveVoicePackFromDB = async (): Promise<number | undefined> => { try { return await get('activeVoicePack'); } catch(e) { return undefined; } };

const AUDIO_BUCKET = 'audio_assets';
const AUDIO_KEY_PREFIX = 'audio_';
type CachedAudio = { data: string; lastModified: string };
const getCacheKey = (key: string, packNumber: number) => `${AUDIO_KEY_PREFIX}pack${packNumber}_${key}`;

export const saveCustomAudio = async (key: string, base64: string, packNumber: number): Promise<void> => {
    const cacheKey = getCacheKey(key, packNumber);
    await set(cacheKey, { data: base64, lastModified: new Date().toISOString() });
    if (isSupabaseConfigured()) {
        try {
            const blob = base64ToBlob(base64);
            const filePath = `pack${packNumber}/${key}.mp3`;
            await supabase!.storage.from(AUDIO_BUCKET).upload(filePath, blob, { upsert: true });
        } catch (error) { console.error("Failed to upload custom audio", error); }
    }
};
export const loadCustomAudio = async (key: string, packNumber: number): Promise<string | undefined> => {
    const cacheKey = getCacheKey(key, packNumber);
    try { const cached = await get<CachedAudio>(cacheKey); return cached?.data; } catch (error) { return undefined; }
};
export const deleteCustomAudio = async (key: string, packNumber: number): Promise<void> => {
    const cacheKey = getCacheKey(key, packNumber);
    try { await del(cacheKey); } catch (e) {}
    if (isSupabaseConfigured()) {
        try {
            const filePath = `pack${packNumber}/${key}.mp3`;
            await supabase!.storage.from(AUDIO_BUCKET).remove([filePath]);
        } catch (error) { console.error("Failed to delete custom audio", error); }
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
        const { data: cloudFiles, error } = await supabase!.storage.from(AUDIO_BUCKET).list('', { limit: 100 });
        if (error || !cloudFiles) return;
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
                const { data: blob } = await supabase!.storage.from(AUDIO_BUCKET).download(cloudFile.name);
                if (blob) {
                    const base64 = await blobToBase64(blob);
                    await set(cacheKey, { data: base64, lastModified: new Date(cloudLastModified).toISOString() });
                }
            }
        }
        for (const keyToDelete of localKeySet) await del(keyToDelete);
    } catch (error) {}
};

const MUSIC_BUCKET = 'session_music';
const ANTHEM_FILENAME = 'anthem.mp3';
export const uploadSessionAnthem = async (base64: string): Promise<string | null> => {
    const localKey = 'session_anthem';
    try { await set(localKey, base64); } catch(e) {}
    if (!isSupabaseConfigured()) return base64;
    try {
        const blob = base64ToBlob(base64);
        const { error } = await supabase!.storage.from(MUSIC_BUCKET).upload(ANTHEM_FILENAME, blob, { upsert: true });
        if (error) throw error;
        const { data } = supabase!.storage.from(MUSIC_BUCKET).getPublicUrl(ANTHEM_FILENAME);
        return data.publicUrl;
    } catch (error) { return null; }
};
export const deleteSessionAnthem = async (): Promise<void> => {
    const localKey = 'session_anthem';
    try { await del(localKey); } catch(e) {}
    if (isSupabaseConfigured()) { try { await supabase!.storage.from(MUSIC_BUCKET).remove([ANTHEM_FILENAME]); } catch (error) {} }
};
export const getSessionAnthemUrl = async (): Promise<string | null> => {
    const localKey = 'session_anthem';
    if (!isSupabaseConfigured()) return await get<string>(localKey) || null;
    try {
        const { data } = await supabase!.storage.from(MUSIC_BUCKET).list();
        const anthemFile = data?.find(file => file.name === ANTHEM_FILENAME);
        if (anthemFile) {
            const { data: urlData } = supabase!.storage.from(MUSIC_BUCKET).getPublicUrl(ANTHEM_FILENAME);
            return `${urlData.publicUrl}?t=${new Date(anthemFile.updated_at).getTime()}`;
        }
        return null;
    } catch (error) { return await get<string>(localKey) || null; }
};
