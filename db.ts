
import { createClient } from '@supabase/supabase-js';
import { Player, Session, NewsItem, PromoData } from './types';
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

// --- PROMO PLAYER MANAGEMENT (NEW) ---

const SETTINGS_KEY_PROMO = 'promo_player_config';

export const savePromoData = async (data: PromoData): Promise<boolean> => {
    if (!isSupabaseConfigured()) return false;
    try {
        const { error } = await supabase!
            .from('settings')
            .upsert({ 
                key: SETTINGS_KEY_PROMO, 
                value: data 
            }, { onConflict: 'key' });
            
        if (error) throw error;
        return true;
    } catch (error) {
        console.error("Failed to save promo data:", error);
        return false;
    }
};

export const loadPromoData = async (): Promise<PromoData | null> => {
    if (!isSupabaseConfigured()) return null;
    try {
        const { data, error } = await supabase!
            .from('settings')
            .select('value')
            .eq('key', SETTINGS_KEY_PROMO)
            .single();
            
        if (error || !data) return null;
        return data.value as PromoData;
    } catch (error) {
        console.error("Failed to load promo data:", error);
        return null;
    }
};

export const uploadPromoImage = async (base64Image: string): Promise<string | null> => {
    if (!isSupabaseConfigured() || !base64Image) return null;
    try {
        const blob = base64ToBlob(base64Image);
        // We use a fixed filename so it overwrites the old one automatically, saving space
        const filePath = `promo/hero_card_v${Date.now()}.jpg`; 

        const { error: uploadError } = await supabase!.storage
            .from('player_images') // Reusing existing bucket
            .upload(filePath, blob, { 
                cacheControl: '3600', 
                upsert: true 
            });

        if (uploadError) throw uploadError;

        const { data } = supabase!.storage.from('player_images').getPublicUrl(filePath);
        return data.publicUrl;
    } catch (error) {
        console.error('Error uploading promo image:', error);
        return null;
    }
};

const hasLoggedMode = false;
const logStorageMode = () => {
    if (!hasLoggedMode) {
        if (isSupabaseConfigured()) {
            console.log('🔌 Connected to Cloud Database (Supabase)');
        }
    }
};

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
    cloudSaved: boolean; 
    message?: string;
    errorDetail?: any;
}

const sanitizeObject = (obj: any): any => {
    if (obj === null || obj === undefined) return obj;
    if (typeof obj === 'number') {
        return isNaN(obj) ? 0 : obj;
    }
    if (Array.isArray(obj)) {
        return obj.map(v => sanitizeObject(v));
    }
    if (typeof obj === 'object') {
        const newObj: any = {};
        for (const key in obj) {
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

const BUCKET_NAME = 'player_images';

export const uploadPlayerImage = async (playerId: string, base64Image: string, type: 'avatar' | 'card'): Promise<string | null> => {
    if (!isSupabaseConfigured() || !base64Image) return null;
    if (playerId.startsWith('demo_')) return null; 

    try {
        const blob = base64ToBlob(base64Image);
        const fileExtension = blob.type.split('/')[1] || 'jpeg';
        const filePath = `${playerId}/${type}_${Date.now()}.${fileExtension}`;

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

export const saveSinglePlayerToDB = async (player: Player): Promise<DbResult> => {
    if (player.id.startsWith('demo_')) return { success: true, cloudSaved: false, message: "Demo data skipped" };
    await saveLocalPlayerOnly(player);
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
            return { success: true, cloudSaved: false, message: `Cloud Sync Failed: ${error.message || 'Unknown error'}`, errorDetail: error };
        }
    }
    return { success: true, cloudSaved: false, message: "Local only" };
};

export const loadSinglePlayerFromDB = async (id: string, skipCache: boolean = false): Promise<Player | null> => {
    if (!skipCache) {
        try {
            const allPlayers = await get<Player[]>('players') || [];
            const localPlayer = allPlayers.find(p => p.id === id);
            if (localPlayer) return localPlayer;
        } catch (e) { }
    }
    if (isSupabaseConfigured()) {
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
            if (data) await saveLocalPlayerOnly(data as Player);
            return data as Player;
        } catch (error) { return null; }
    }
    return null;
};

export const savePlayersToDB = async (players: Player[]): Promise<DbResult> => {
    const realPlayers = players.filter(p => !p.id.startsWith('demo_'));
    if (realPlayers.length === 0) return { success: true, cloudSaved: false };
    
    let successCount = 0;
    let failCount = 0;
    let lastErrorMsg = "";

    if (isSupabaseConfigured()) {
        try {
            const cleanPlayers = realPlayers.map(p => sanitizeObject(p));
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
                    failCount += chunk.length;
                    lastErrorMsg = chunkError.message || "Unknown Cloud Error";
                }
            }
        } catch (error: any) {
            failCount = realPlayers.length;
            lastErrorMsg = error.message;
        }
    } 
    try { await set('players', realPlayers); } catch (error) { return { success: false, cloudSaved: false, message: "Local save failed" }; }

    if (failCount > 0) return { success: true, cloudSaved: false, message: `Cloud Partial Fail: ${lastErrorMsg}`, errorDetail: lastErrorMsg };
    return { success: true, cloudSaved: true };
};

export const loadPlayersFromDB = async (): Promise<Player[] | undefined> => {
    if (isSupabaseConfigured()) {
        try {
            const { data, error } = await supabase!.from('players').select('*');
            if (error) throw error;
            await set('players', data || []);
            return (data || []) as Player[];
        } catch (error) { }
    }
    return await get('players');
};

export const getCloudPlayerCount = async (): Promise<number | null> => {
    if (!isSupabaseConfigured()) return null;
    try {
        const { count, error } = await supabase!.from('players').select('*', { count: 'exact', head: true });
        if (error) throw error;
        return count;
    } catch (error) { return null; }
};

export const saveActiveSessionToDB = async (session: Session | null) => {
    try {
        if (session && !session.id.startsWith('demo_')) await set('activeSession', session);
        else if (!session) await set('activeSession', null);
    } catch (error) {}
};

export const loadActiveSessionFromDB = async (): Promise<Session | null | undefined> => {
    try { return await get('activeSession'); } catch (error) { return undefined; }
};

// --- NEW: INSTANT LOCAL SAVE ---
export const saveHistoryLocalOnly = async (history: Session[]) => {
    try {
        const existingHistory = await get<Session[]>('history') || [];
        const historyMap = new Map<string, Session>();
        
        existingHistory.forEach(s => historyMap.set(s.id, s));
        history.forEach(session => {
            const updatedSession = { ...session };
            if (updatedSession.status === 'completed' && updatedSession.syncStatus !== 'synced') {
                updatedSession.syncStatus = 'pending';
            }
            historyMap.set(updatedSession.id, updatedSession);
        });

        const mergedHistory = Array.from(historyMap.values()).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        await set('history', mergedHistory);
    } catch (error) {
        console.error("Local Save Failed", error);
    }
};

// --- ROBUST SESSION HISTORY SAVE ---
export const saveHistoryToDB = async (history: Session[]): Promise<DbResult> => {
    const realHistory = history.filter(s => !s.id.startsWith('demo_'));
    if (realHistory.length === 0) return { success: true, cloudSaved: false };

    // 1. LOCAL FIRST (Always execute to ensure IDB is up to date)
    await saveHistoryLocalOnly(realHistory);

    // 2. CLOUD SYNC
    let cloudError: any = null;
    let cloudSaved = false;

    if (isSupabaseConfigured()) {
        try {
            // Find what really needs syncing (completed and not synced)
            // We re-read from local to be sure we have the latest status if 'saveHistoryLocalOnly' just ran
            const currentLocalHistory = await get<Session[]>('history') || realHistory;
            const sessionsToSync = currentLocalHistory.filter(s => s.status === 'completed' && s.syncStatus !== 'synced' && !s.id.startsWith('demo_'));
            
            if (sessionsToSync.length > 0) {
                const optimizedHistory = sessionsToSync.map(session => {
                    // Create a clean copy to avoid mutation issues
                    const cleanSession = {
                        ...session,
                        syncStatus: 'synced' as const, 
                        playerPool: session.playerPool.map(p => ({ ...p, photo: undefined, playerCard: undefined }))
                    };
                    
                    // --- CRITICAL FIX FOR 400 ERROR ---
                    // Forcefully remove 'isTestMode' from the payload if it exists in legacy data.
                    // This ensures Supabase never sees this unknown column.
                    // @ts-ignore
                    if ('isTestMode' in cleanSession) delete cleanSession.isTestMode;
                    
                    return cleanSession;
                }).map(s => sanitizeObject(s));

                const { error } = await supabase!.from('sessions').upsert(optimizedHistory, { onConflict: 'id' });
                if (error) throw error;
                
                cloudSaved = true;

                // 3. UPDATE LOCAL STATUS TO GREEN
                const finalHistory = currentLocalHistory.map(s => {
                    if (sessionsToSync.some(synced => synced.id === s.id)) {
                        return { ...s, syncStatus: 'synced' as const };
                    }
                    return s;
                });
                await set('history', finalHistory);
            } else {
                cloudSaved = true; 
            }
        } catch (error: any) { 
            cloudError = error; 
            cloudSaved = false; 
            console.error("Cloud Save Failed details:", error);
        }
    } else {
        return { success: true, cloudSaved: false, message: "Supabase not configured" };
    }

    if (cloudError) return { success: true, cloudSaved: false, message: `Cloud failed: ${cloudError.message}` };
    return { success: true, cloudSaved: true };
};

// --- CRITICAL UPDATE: UNIFIED HISTORY LOAD ---
export const loadHistoryFromDB = async (limit?: number): Promise<Session[] | undefined> => {
    let localHistory = await get<Session[]>('history') || [];

    if (isSupabaseConfigured()) {
        try {
            let query = supabase!.from('sessions').select('*').order('createdAt', { ascending: false });
            if (limit) query = query.limit(limit);
            const { data: cloudHistory, error } = await query;
            
            if (error) throw error;

            if (cloudHistory) {
                const sessionMap = new Map<string, Session>();
                
                cloudHistory.forEach(s => {
                    sessionMap.set(s.id, { ...s, syncStatus: 'synced' } as Session);
                });
                
                localHistory.forEach(s => {
                    const cloudVersion = sessionMap.get(s.id);
                    if (!cloudVersion) {
                        sessionMap.set(s.id, s);
                    }
                });

                const mergedHistory = Array.from(sessionMap.values()).sort((a, b) => 
                    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
                );

                await set('history', mergedHistory);
                return limit ? mergedHistory.slice(0, limit) : mergedHistory;
            }
        } catch (error) { 
            console.error("Cloud history load failed, utilizing local cache", error);
        }
    } 
    
    return limit ? localHistory.slice(0, limit) : localHistory;
};

// --- NEW FUNCTION: DELETE LOCAL SESSION PERMANENTLY ---
export const deleteSessionFromLocalDB = async (sessionId: string): Promise<void> => {
    try {
        const history = await get<Session[]>('history') || [];
        const updatedHistory = history.filter(s => s.id !== sessionId);
        await set('history', updatedHistory);
        console.log(`🗑️ Session ${sessionId} permanently deleted from local DB`);
    } catch (e) {
        console.error("Failed to delete local session", e);
    }
};

// --- MANUAL SYNC TRIGGER ---
export const retrySyncPendingSessions = async (): Promise<number> => {
    const history = await get<Session[]>('history') || [];
    const pending = history.filter(s => s.syncStatus === 'pending' && s.status === 'completed');
    if (pending.length === 0) return 0;

    const result = await saveHistoryToDB(history); // This function handles the filtering and upload logic
    return result.cloudSaved ? pending.length : 0;
};

export const saveNewsToDB = async (news: NewsItem[]): Promise<DbResult> => {
    const realNews = news.filter(n => !n.id.startsWith('demo_'));
    if (realNews.length === 0) return { success: true, cloudSaved: false };
    let cloudError: any = null;
    let cloudSaved = false;
    if (isSupabaseConfigured()) {
        try {
            const sanitizedNews = sanitizeObject(realNews);
            const { error } = await supabase!.from('news').upsert(sanitizedNews, { onConflict: 'id' });
            if (error) throw error;
            cloudSaved = true;
        } catch (error: any) { cloudError = error; cloudSaved = false; }
    } 
    try {
        const existingNews = await get<NewsItem[]>('newsFeed') || [];
        const newsMap = new Map<string, NewsItem>();
        existingNews.forEach(n => newsMap.set(n.id, n));
        realNews.forEach(item => newsMap.set(item.id, item));
        const mergedNews = Array.from(newsMap.values()).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 50); 
        await set('newsFeed', mergedNews);
    } catch (error) { }
    if (cloudError) return { success: true, cloudSaved: false, message: cloudError.message };
    return { success: true, cloudSaved: true };
};

export const loadNewsFromDB = async (limit?: number): Promise<NewsItem[] | undefined> => {
    if (isSupabaseConfigured()) {
        try {
            let query = supabase!.from('news').select('*').order('timestamp', { ascending: false });
            if (limit) query = query.limit(limit);
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

const AUDIO_BUCKET = 'audio_assets';
const MUSIC_BUCKET = 'session_music';
const ANTHEM_FILENAME = 'anthem.mp3';
const AUDIO_KEY_PREFIX = 'audio_'; 
const ANTHEM_UPDATE_KEY = 'anthem_last_updated';

type CachedAudio = { data: string; lastModified: string; };
const getCacheKey = (key: string, packNumber: number) => `${AUDIO_KEY_PREFIX}pack${packNumber}_${key}`;

export const saveCustomAudio = async (key: string, base64: string, packNumber: number): Promise<void> => {
    const cacheKey = getCacheKey(key, packNumber);
    const now = new Date().toISOString();
    await set(cacheKey, { data: base64, lastModified: now });
    if (isSupabaseConfigured()) {
        try {
            const blob = base64ToBlob(base64);
            const filePath = `pack${packNumber}/${key}.mp3`;
            await supabase!.storage.from(AUDIO_BUCKET).upload(filePath, blob, { upsert: true });
        } catch (error) { }
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
        } catch (error) { }
    }
};

export const syncAndCacheAudioAssets = async () => {
    if (!isSupabaseConfigured()) return;
    try {
        const { data: cloudFiles, error } = await supabase!.storage.from(AUDIO_BUCKET).list('', { limit: 100, sortBy: { column: 'name', order: 'asc' } });
        if (!error && cloudFiles) {
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
                    if (!localAsset || cloudTime > localTime) {
                        const { data: blob } = await supabase!.storage.from(AUDIO_BUCKET).download(`pack${packNum}/${file.name}`);
                        if (blob) {
                            const base64 = await blobToBase64(blob);
                            await set(cacheKey, { data: base64, lastModified: file.updated_at || file.created_at });
                        }
                    }
                }
            }
        }
        
    } catch (error) { }
};

const ANTHEM_STATUS_KEY = 'anthem_status';
export const getAnthemStatus = async (): Promise<boolean> => {
    if (!isSupabaseConfigured()) return true; 
    try {
        const { data, error } = await supabase!.from('settings').select('value').eq('key', ANTHEM_STATUS_KEY).single();
        if (error || !data) return true;
        // @ts-ignore
        return data.value?.enabled ?? true;
    } catch (error) { return true; }
};

export const setAnthemStatus = async (isEnabled: boolean): Promise<void> => {
    if (!isSupabaseConfigured()) return;
    try {
        await supabase!.from('settings').upsert({ key: ANTHEM_STATUS_KEY, value: { enabled: isEnabled } }, { onConflict: 'key' });
    } catch (error) {}
};

export const uploadSessionAnthem = async (base64: string): Promise<string | null> => {
    const cacheKey = 'session_anthem_data';
    const now = new Date().toISOString();
    
    // Save locally
    await set(cacheKey, { data: base64, lastModified: now });
    
    if (!isSupabaseConfigured()) return "local_only";
    
    try {
        const blob = base64ToBlob(base64);
        
        // 1. Upload File
        const { error } = await supabase!.storage.from(MUSIC_BUCKET).upload(ANTHEM_FILENAME, blob, { upsert: true });
        if (error) throw error;

        // 2. Update Timestamp in Settings (Crucial for version checking)
        await supabase!.from('settings').upsert({ 
            key: ANTHEM_UPDATE_KEY, 
            value: { timestamp: now } 
        }, { onConflict: 'key' });

        return "uploaded";
    } catch (error) { return null; }
};

export const deleteSessionAnthem = async (): Promise<void> => {
    const cacheKey = 'session_anthem_data';
    try { await del(cacheKey); } catch(e) {}
    if (isSupabaseConfigured()) { 
        try { 
            await supabase!.storage.from(MUSIC_BUCKET).remove([ANTHEM_FILENAME]);
            // Also update timestamp to force clients to realize it's gone (or just update metadata)
            const now = new Date().toISOString();
            await supabase!.from('settings').upsert({ key: ANTHEM_UPDATE_KEY, value: { timestamp: now, deleted: true } }, { onConflict: 'key' });
        } catch (error) {} 
    }
};

export const getSessionAnthemUrl = async (): Promise<string | null> => {
    const cacheKey = 'session_anthem_data';
    
    // 1. Check Cloud Version if possible (Fix for caching issue)
    if (isSupabaseConfigured()) {
        try {
            const isEnabled = await getAnthemStatus();
            if (!isEnabled) return null;

            // Get server timestamp
            const { data: setting } = await supabase!.from('settings').select('value').eq('key', ANTHEM_UPDATE_KEY).single();
            const serverTimestampStr = setting?.value?.timestamp;
            const serverDeleted = setting?.value?.deleted;

            if (serverDeleted) {
                // If deleted on server, clear local and return null
                await del(cacheKey);
                return null;
            }

            // Get local timestamp
            const cached = await get<CachedAudio>(cacheKey);
            const localTimestamp = cached?.lastModified ? new Date(cached.lastModified).getTime() : 0;
            const serverTimestamp = serverTimestampStr ? new Date(serverTimestampStr).getTime() : 0;

            // If server is newer, or we don't have local, download
            if (serverTimestamp > localTimestamp || !cached) {
                // Append timestamp to URL to bust CDN/Browser cache
                const { data } = await supabase!.storage.from(MUSIC_BUCKET).download(ANTHEM_FILENAME);
                if (data) {
                    const base64 = await blobToBase64(data);
                    // Update local cache with new timestamp
                    await set(cacheKey, { data: base64, lastModified: serverTimestampStr || new Date().toISOString() });
                    return URL.createObjectURL(data);
                }
            }
        } catch (error) { 
            console.warn("Failed to check anthem update, falling back to cache.", error);
        }
    }

    // 2. Fallback to Local Cache
    try {
        const cached = await get<CachedAudio>(cacheKey);
        if (cached && cached.data) {
            const blob = base64ToBlob(cached.data);
            return URL.createObjectURL(blob);
        }
    } catch (e) { }

    return null;
};
