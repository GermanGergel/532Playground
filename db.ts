
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

// --- BLOB to Base64 HELPER ---
const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
};

// --- UTILS ---
export interface DbResult {
    success: boolean;
    cloudSaved: boolean; // NEW: Explicit flag for UI feedback
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

// Helper: Save to local IDB only (no cloud sync)
// Used when we fetch from cloud and want to cache it locally
const saveLocalPlayerOnly = async (player: Player) => {
    try {
        const allPlayers = await get<Player[]>('players') || [];
        const playerIndex = allPlayers.findIndex(p => p.id === player.id);
        if (playerIndex > -1) allPlayers[playerIndex] = player;
        else allPlayers.push(player);
        await set('players', allPlayers);
    } catch (e) {
        console.error("Failed to save player locally", e);
    }
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

        // TRAFFIC OPTIMIZATION: Cache-Control set to 1 year (31536000 seconds)
        const { error: uploadError } = await supabase!.storage
            .from(BUCKET_NAME)
            .upload(filePath, blob, { 
                cacheControl: '31536000', 
                upsert: true 
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
    if (isDemoData(player.id)) return { success: true, cloudSaved: false, message: "Demo data skipped" };

    // 1. Local Save
    await saveLocalPlayerOnly(player);

    // 2. Cloud Save
    if (isSupabaseConfigured()) {
        try {
            const sanitizedPlayer = sanitizeObject(player);
            
            const { error } = await supabase!
                .from('players')
                .upsert(sanitizedPlayer, { onConflict: 'id' });
            
            if (error) throw error;
            return { success: true, cloudSaved: true };
        } catch (error: any) {
            console.error("Supabase Save Error:", error);
            // Return success: true because local saved, but cloudSaved: false
            return { success: true, cloudSaved: false, message: `Cloud Sync Failed: ${error.message || 'Unknown error'}`, errorDetail: error };
        }
    }
    return { success: true, cloudSaved: false, message: "Local only" };
};

// --- SINGLE PLAYER LOAD (TRAFFIC OPTIMIZED) ---
export const loadSinglePlayerFromDB = async (id: string, skipCache: boolean = false): Promise<Player | null> => {
    // 1. CACHE FIRST: Try Local Storage (IndexedDB) unless skipCache is true
    if (!skipCache) {
        try {
            const allPlayers = await get<Player[]>('players') || [];
            const localPlayer = allPlayers.find(p => p.id === id);
            
            if (localPlayer) {
                console.log(`⚡ Loaded player ${id} from local cache.`);
                return localPlayer;
            }
        } catch (e) {
            console.warn("Local read failed", e);
        }
    }

    // 2. Cloud Fallback (Or if skipped cache)
    if (isSupabaseConfigured()) {
        try {
            console.log(`☁️ Fetching player ${id} from Cloud...`);
            const { data, error } = await supabase!
                .from('players')
                .select('*')
                .eq('id', id)
                .single();
            if (error) {
                if (error.code === 'PGRST116') return null;
                throw error;
            }
            
            // Save to local cache for next time!
            if (data) {
                await saveLocalPlayerOnly(data as Player);
            }
            
            return data as Player;
        } catch (error) {
            console.warn(`Cloud load failed.`);
            return null;
        }
    }
    return null;
};


// --- PLAYERS (Batch Save - SAFE MODE) ---
export const savePlayersToDB = async (players: Player[]): Promise<DbResult> => {
    logStorageMode();
    const realPlayers = players.filter(p => !isDemoData(p.id));
    if (realPlayers.length === 0) return { success: true, cloudSaved: false };
    
    let successCount = 0;
    let failCount = 0;
    let lastErrorMsg = "";

    // 1. Cloud Save - Granular (Safe Mode)
    // We save items one by one (or small chunks) to ensure one bad apple doesn't fail the whole batch.
    // This is critical for "Force Save" operations.
    if (isSupabaseConfigured()) {
        try {
            const cleanPlayers = realPlayers.map(p => sanitizeObject(p));

            // Chunk size 1 is safest to isolate corrupted data. 
            // It's slower but reliable for manual sync.
            const CHUNK_SIZE = 1; 
            
            for (let i = 0; i < cleanPlayers.length; i += CHUNK_SIZE) {
                const chunk = cleanPlayers.slice(i, i + CHUNK_SIZE);
                try {
                    const { error } = await supabase!
                        .from('players')
                        .upsert(chunk, { onConflict: 'id' });
                    
                    if (error) throw error;
                    successCount += chunk.length;
                } catch (chunkError: any) {
                    console.error("Chunk save failed:", chunkError);
                    failCount += chunk.length;
                    lastErrorMsg = chunkError.message || "Unknown Cloud Error";
                }
            }
        } catch (error: any) {
            console.error("Supabase Fatal Batch Error:", error);
            failCount = realPlayers.length;
            lastErrorMsg = error.message;
        }
    } 

    // 2. Local Save
    try {
        await set('players', realPlayers);
    } catch (error) {
        console.error("Local Batch Save Error:", error);
        return { success: false, cloudSaved: false, message: "Local save failed" };
    }

    if (failCount > 0) {
        return { 
            success: true, 
            cloudSaved: false, 
            message: `Cloud Partial Fail: Saved ${successCount}, Failed ${failCount}. Last Error: ${lastErrorMsg}`, 
            errorDetail: lastErrorMsg 
        };
    }
    
    if (isSupabaseConfigured() && successCount === 0 && realPlayers.length > 0) {
         return { success: true, cloudSaved: false, message: "Cloud save attempted but 0 records updated." };
    }

    return { success: true, cloudSaved: true };
};

export const loadPlayersFromDB = async (): Promise<Player[] | undefined> => {
    if (isSupabaseConfigured()) {
        try {
            const { data, error } = await supabase!.from('players').select('*');
            if (error) throw error;

            // If the API call succeeds, the response IS the source of truth.
            // We must overwrite the local cache to match, even if it's an empty array.
            // This prevents loading a stale cache if the cloud data was cleared.
            await set('players', data || []);
            return (data || []) as Player[];

        } catch (error) {
            console.warn("Cloud load failed, falling back to local cache.", error);
        }
    }
    // Fallback for both cloud failure AND offline mode
    return await get('players');
};

// --- NEW FUNCTION: LIGHTWEIGHT CLOUD CHECK ---
export const getCloudPlayerCount = async (): Promise<number | null> => {
    if (!isSupabaseConfigured()) return null;
    try {
        const { count, error } = await supabase!
            .from('players')
            .select('*', { count: 'exact', head: true }); // HEAD=true means no data body, just count.
        
        if (error) throw error;
        return count;
    } catch (error) {
        console.error("Cloud check failed:", error);
        return null;
    }
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
    if (realHistory.length === 0) return { success: true, cloudSaved: false };

    let cloudError: any = null;
    let cloudSaved = false;

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
            cloudSaved = true;
        } catch (error: any) {
            console.error("Supabase Save History Error:", error);
            cloudError = error;
            cloudSaved = false;
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
        return { success: false, cloudSaved: false, message: "Local save failed" };
    }

    if (cloudError) {
        return { success: true, cloudSaved: false, message: `Saved locally, but Cloud failed: ${cloudError.message}`, errorDetail: cloudError };
    }
    return { success: true, cloudSaved: true };
};

// UPDATED: Support for Limit to reduce Traffic
export const loadHistoryFromDB = async (limit?: number): Promise<Session[] | undefined> => {
    if (isSupabaseConfigured()) {
        try {
            let query = supabase!
                .from('sessions')
                .select('*')
                .order('createdAt', { ascending: false });
            
            if (limit) {
                query = query.limit(limit);
            }

            const { data, error } = await query;
            
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
    if (realNews.length === 0) return { success: true, cloudSaved: false };

    let cloudError: any = null;
    let cloudSaved = false;

    if (isSupabaseConfigured()) {
        try {
            const sanitizedNews = sanitizeObject(realNews);

            const { error } = await supabase!
                .from('news')
                .upsert(sanitizedNews, { onConflict: 'id' });
            if (error) throw error;
            cloudSaved = true;
        } catch (error: any) {
            console.error("Supabase Save News Error:", error);
            cloudError = error;
            cloudSaved = false;
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

    if (cloudError) return { success: true, cloudSaved: false, message: cloudError.message, errorDetail: cloudError };
    return { success: true, cloudSaved: true };
};

// UPDATED: Support for Limit to reduce Traffic
export const loadNewsFromDB = async (limit?: number): Promise<NewsItem[] | undefined> => {
    if (isSupabaseConfigured()) {
        try {
            let query = supabase!
                .from('news')
                .select('*')
                .order('timestamp', { ascending: false });
            
            if (limit) {
                query = query.limit(limit);
            }

            const { data, error } = await query;
            if (error) throw error;
            return data as NewsItem[];
        } catch (error) {}
    } 
    return await get('newsFeed');
};

export const saveLanguageToDB = async (lang: Language) => { try { await set('language', lang); } catch (error) {} };
export const loadLanguageFromDB = async (): Promise<Language | undefined> => { try { return await get('language'); } catch (error) { return undefined; } };
export const saveActiveVoicePackToDB = async (packNumber: number) => { try { await set('activeVoicePack', packNumber); } catch (e) {} };
export const loadActiveVoicePackFromDB = async (): Promise<number | undefined> => { try { return await get('activeVoicePack'); } catch(e) { return undefined; } };

// --- OPTIMIZED AUDIO CACHING SYSTEM ---

const AUDIO_BUCKET = 'audio_assets';
const MUSIC_BUCKET = 'session_music';
const ANTHEM_FILENAME = 'anthem.mp3';
const AUDIO_KEY_PREFIX = 'audio_'; // Key prefix for IDB

// Type for cached audio in IndexedDB
type CachedAudio = { 
    data: string; // Base64 string
    lastModified: string; // ISO Date string from Cloud metadata
};

// Helper: Generate consistent IDB key
const getCacheKey = (key: string, packNumber: number) => `${AUDIO_KEY_PREFIX}pack${packNumber}_${key}`;

// 1. SAVE: Save locally AND upload to cloud
export const saveCustomAudio = async (key: string, base64: string, packNumber: number): Promise<void> => {
    // Save to local cache immediately with current timestamp
    const cacheKey = getCacheKey(key, packNumber);
    const now = new Date().toISOString();
    await set(cacheKey, { data: base64, lastModified: now });

    // Upload to Cloud
    if (isSupabaseConfigured()) {
        try {
            const blob = base64ToBlob(base64);
            const filePath = `pack${packNumber}/${key}.mp3`;
            await supabase!.storage.from(AUDIO_BUCKET).upload(filePath, blob, { upsert: true });
        } catch (error) { console.error("Failed to upload custom audio", error); }
    }
};

// 2. LOAD: Read directly from local cache (FAST, ZERO TRAFFIC)
export const loadCustomAudio = async (key: string, packNumber: number): Promise<string | undefined> => {
    const cacheKey = getCacheKey(key, packNumber);
    try { 
        const cached = await get<CachedAudio>(cacheKey); 
        return cached?.data; 
    } catch (error) { return undefined; }
};

// 3. DELETE
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

// 4. SMART SYNC (The Magic Function)
// Call this on app start. It checks cloud metadata vs local metadata.
// Only downloads the *body* of the file if the cloud version is newer.
export const syncAndCacheAudioAssets = async () => {
    if (!isSupabaseConfigured()) return;

    try {
        // A. VOICE ASSISTANT SYNC
        const { data: cloudFiles, error } = await supabase!.storage.from(AUDIO_BUCKET).list('', { limit: 100, sortBy: { column: 'name', order: 'asc' } });
        
        if (!error && cloudFiles) {
            // Get all local keys to find outdated ones
            const allLocalKeys = await keys();
            const localAudioKeys = allLocalKeys.filter(k => typeof k === 'string' && k.startsWith(AUDIO_KEY_PREFIX));
            
            // Iterate recursively through folders if needed, but assuming flat structure pack1/file.mp3 for simplicity based on `list` limitations:
            // Actually, Supabase list returns files in the root or folder placeholders.
            // We need to list specifically for packs if they are folders.
            // Simplification: We will loop through known Packs (1, 2, 3)
            for (let packNum = 1; packNum <= 3; packNum++) {
                const { data: packFiles } = await supabase!.storage.from(AUDIO_BUCKET).list(`pack${packNum}`);
                if (!packFiles) continue;

                for (const file of packFiles) {
                    if (!file.name.endsWith('.mp3')) continue;
                    
                    const key = file.name.replace('.mp3', '');
                    const cacheKey = getCacheKey(key, packNum);
                    
                    const localAsset = await get<CachedAudio>(cacheKey);
                    const cloudTime = new Date(file.updated_at || file.created_at).getTime();
                    const localTime = localAsset ? new Date(localAsset.lastModified).getTime() : 0;

                    // If Cloud is newer (or local doesn't exist) -> DOWNLOAD
                    if (!localAsset || cloudTime > localTime) {
                        console.log(`⬇️ Downloading update for: ${key} (Pack ${packNum})`);
                        const { data: blob } = await supabase!.storage.from(AUDIO_BUCKET).download(`pack${packNum}/${file.name}`);
                        if (blob) {
                            const base64 = await blobToBase64(blob);
                            await set(cacheKey, { data: base64, lastModified: file.updated_at || file.created_at });
                        }
                    }
                }
            }
        }

        // B. ANTHEM SYNC
        const { data: musicFiles } = await supabase!.storage.from(MUSIC_BUCKET).list();
        const anthemFile = musicFiles?.find(f => f.name === ANTHEM_FILENAME);
        
        if (anthemFile) {
            const cacheKey = 'session_anthem_data';
            const localAnthem = await get<CachedAudio>(cacheKey);
            const cloudTime = new Date(anthemFile.updated_at || anthemFile.created_at).getTime();
            const localTime = localAnthem ? new Date(localAnthem.lastModified).getTime() : 0;

            if (!localAnthem || cloudTime > localTime) {
                console.log(`🎵 Downloading new Session Anthem...`);
                const { data: blob } = await supabase!.storage.from(MUSIC_BUCKET).download(ANTHEM_FILENAME);
                if (blob) {
                    const base64 = await blobToBase64(blob);
                    await set(cacheKey, { data: base64, lastModified: anthemFile.updated_at || anthemFile.created_at });
                }
            }
        }

    } catch (error) {
        console.error("Audio Sync Error:", error);
    }
};

// --- ANTHEM MANAGEMENT ---

const ANTHEM_STATUS_KEY = 'anthem_status';

export const getAnthemStatus = async (): Promise<boolean> => {
    if (!isSupabaseConfigured()) return true; // Default to enabled in local mode
    try {
        const { data, error } = await supabase!
            .from('settings')
            .select('value')
            .eq('key', ANTHEM_STATUS_KEY)
            .single();
        if (error || !data) {
             // If setting doesn't exist, assume it's enabled by default
            return true;
        }
        // @ts-ignore
        return data.value?.enabled ?? true;
    } catch (error) {
        console.error("Failed to get anthem status:", error);
        return true; // Fail-safe: assume enabled if there's an error
    }
};

export const setAnthemStatus = async (isEnabled: boolean): Promise<void> => {
    if (!isSupabaseConfigured()) return;
    try {
        const { error } = await supabase!
            .from('settings')
            .upsert({ key: ANTHEM_STATUS_KEY, value: { enabled: isEnabled } }, { onConflict: 'key' });
        if (error) throw error;
    } catch (error) {
        console.error("Failed to set anthem status:", error);
    }
};

export const uploadSessionAnthem = async (base64: string): Promise<string | null> => {
    // 1. Save locally immediately
    const cacheKey = 'session_anthem_data';
    const now = new Date().toISOString();
    await set(cacheKey, { data: base64, lastModified: now });

    // 2. Upload to Cloud
    if (!isSupabaseConfigured()) return "local_only";
    try {
        const blob = base64ToBlob(base64);
        const { error } = await supabase!.storage.from(MUSIC_BUCKET).upload(ANTHEM_FILENAME, blob, { upsert: true });
        if (error) throw error;
        
        // Return a fake URL because we use local mostly, but UI checks for existence
        return "uploaded";
    } catch (error) { return null; }
};

export const deleteSessionAnthem = async (): Promise<void> => {
    const cacheKey = 'session_anthem_data';
    try { await del(cacheKey); } catch(e) {}
    if (isSupabaseConfigured()) { try { await supabase!.storage.from(MUSIC_BUCKET).remove([ANTHEM_FILENAME]); } catch (error) {} }
};

// SMART GETTER FOR ANTHEM
// Returns a Blob URL (blob:http://...) if cached locally, avoiding network request.
// Fallback to Supabase URL if not cached (and triggers a background cache).
export const getSessionAnthemUrl = async (): Promise<string | null> => {
    const cacheKey = 'session_anthem_data';
    
    // 1. Try Local Cache First
    try {
        const cached = await get<CachedAudio>(cacheKey);
        if (cached && cached.data) {
            const blob = base64ToBlob(cached.data);
            return URL.createObjectURL(blob);
        }
    } catch (e) { console.error("Cache read error", e); }

    // 2. If no local, try Cloud (and cache it for next time)
    if (isSupabaseConfigured()) {
        try {
            // *** NEW LOGIC: Check if anthem is enabled before downloading ***
            const isEnabled = await getAnthemStatus();
            if (!isEnabled) {
                console.log("Anthem download is disabled by admin setting.");
                return null;
            }
            // *** END NEW LOGIC ***
            
            const { data } = await supabase!.storage.from(MUSIC_BUCKET).download(ANTHEM_FILENAME);
            if (data) {
                // We found it in cloud but not locally. Return URL immediately...
                const url = URL.createObjectURL(data);
                
                // ...and save to cache in background for next time
                blobToBase64(data).then(base64 => {
                    set(cacheKey, { data: base64, lastModified: new Date().toISOString() });
                });
                
                return url;
            }
        } catch (error) { }
    }
    
    return null;
};
