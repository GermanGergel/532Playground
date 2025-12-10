import { createClient } from '@supabase/supabase-js';
import { Player, Session, NewsItem } from './types';
import { Language } from './translations/index';
import { get, set, del, keys } from 'idb-keyval';

// --- SUPABASE CONFIGURATION ---
// Robust environment variable access for both Vite and other environments
const getEnvVar = (key: string) => {
    try {
        // @ts-ignore
        if (typeof import.meta !== 'undefined' && import.meta.env) {
            // @ts-ignore
            return import.meta.env[key];
        }
    } catch(e) {}
    
    try {
        if (typeof process !== 'undefined' && process.env) {
            return process.env[key];
        }
    } catch(e) {}
    
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
        if (isSupabaseConfigured()) {
            console.log('🔌 Connected to Cloud Database (Supabase)');
        } else {
            console.log('💾 Running in Local Mode (IndexedDB only)');
        }
        hasLoggedMode = true;
    }
};

// --- DEMO DATA FILTER ---
const isDemoData = (id: string) => id.startsWith('demo_');

// --- BASE64 to Blob HELPER ---
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
    if (isDemoData(playerId)) return null;

    try {
        const blob = base64ToBlob(base64Image);
        const fileExtension = blob.type.split('/')[1] || 'jpeg';
        const filePath = `${playerId}/${type}_${Date.now()}.${fileExtension}`;

        const { error: uploadError } = await supabase!.storage
            .from(BUCKET_NAME)
            .upload(filePath, blob, {
                cacheControl: '31536000',
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
        if (!imageUrl.startsWith('https://')) return;
        const url = new URL(imageUrl);
        const path = url.pathname.split(`/${BUCKET_NAME}/`)[1];
        if (!path) return;
        await supabase!.storage.from(BUCKET_NAME).remove([path]);
    } catch (error) {
        console.error("Error deleting old image:", error);
    }
};

// --- LOCAL CACHE HELPERS (For Context useEffects) ---
// These functions ONLY touch IndexedDB. They are safe to call frequently.
export const saveLocalPlayers = async (players: Player[]) => {
    try { await set('players', players); } catch (e) {}
};
export const saveLocalHistory = async (history: Session[]) => {
    try { await set('history', history); } catch (e) {}
};
export const saveLocalNews = async (news: NewsItem[]) => {
    try { await set('newsFeed', news); } catch (e) {}
};


// --- CLOUD SYNC FUNCTIONS (Transactional) ---

// SINGLE PLAYER SAVE (ATOMIC)
export const saveSinglePlayerToDB = async (player: Player) => {
    if (isDemoData(player.id)) return;

    // Always update local cache immediately
    try {
        const allPlayers = await get<Player[]>('players') || [];
        const playerIndex = allPlayers.findIndex(p => p.id === player.id);
        if (playerIndex > -1) {
            allPlayers[playerIndex] = player;
        } else {
            allPlayers.push(player);
        }
        await set('players', allPlayers);
    } catch(e) {}

    // Supabase Sync
    if (isSupabaseConfigured()) {
        try {
            const { error } = await supabase!
                .from('players')
                .upsert(player, { onConflict: 'id' });
            if (error) throw error;
        } catch (error) {
            console.error("Supabase Save Single Player Error:", error);
            // Don't throw, just log. Local state is preserved.
        }
    }
};

// SINGLE PLAYER LOAD
export const loadSinglePlayerFromDB = async (id: string): Promise<Player | null> => {
    // Try Cloud First
    if (isSupabaseConfigured()) {
        try {
            const { data, error } = await supabase!
                .from('players')
                .select('*')
                .eq('id', id)
                .single();
            if (error && error.code !== 'PGRST116') throw error; // PGRST116 is "not found"
            if (data) return data as Player;
        } catch (error) {
            console.warn(`Supabase Load Single Player Error (ID: ${id}), falling back to local:`, error);
        }
    }

    // Fallback to Local
    const allPlayers = await get<Player[]>('players') || [];
    return allPlayers.find(p => p.id === id) || null;
};


// BULK PLAYER SAVE (Explicit Cloud Sync)
export const savePlayersToDB = async (players: Player[]) => {
    const realPlayers = players.filter(p => !isDemoData(p.id));
    
    // Always update local cache
    await saveLocalPlayers(players);

    if (realPlayers.length === 0) return;

    // Cloud Sync
    if (isSupabaseConfigured()) {
        try {
            // Split into chunks
            const CHUNK_SIZE = 10; 
            for (let i = 0; i < realPlayers.length; i += CHUNK_SIZE) {
                const chunk = realPlayers.slice(i, i + CHUNK_SIZE);
                const { error } = await supabase!
                    .from('players')
                    .upsert(chunk, { onConflict: 'id' });
                
                if (error) throw error;
            }
        } catch (error) {
            console.error("Supabase Save Players Error:", error);
        }
    } 
};

export const loadPlayersFromDB = async (): Promise<Player[] | undefined> => {
    logStorageMode();
    if (isSupabaseConfigured()) {
        try {
            const { data, error } = await supabase!
                .from('players')
                .select('*');
            if (error) throw error;
            // Update local cache with fresh data
            if (data) {
                await saveLocalPlayers(data as Player[]);
                return data as Player[];
            }
        } catch (error) {
            console.warn("Supabase Load Players Error, falling back to local:", error);
        }
    } 
    return await get('players');
};

// --- ACTIVE SESSION ---
export const saveActiveSessionToDB = async (session: Session | null) => {
    try {
        if (session && !isDemoData(session.id)) {
            await set('activeSession', session);
        } else if (!session) {
            await set('activeSession', null);
        }
    } catch (error) {}
};

export const loadActiveSessionFromDB = async (): Promise<Session | null | undefined> => {
    try {
        return await get('activeSession');
    } catch (error) {
        return undefined;
    }
};

// --- HISTORY (SESSIONS) ---

// SINGLE SESSION SAVE (Use this for updates/inserts)
export const saveSingleSessionToDB = async (session: Session) => {
    if (isDemoData(session.id)) return;

    // Update Local Cache
    try {
        const history = await get<Session[]>('history') || [];
        const index = history.findIndex(s => s.id === session.id);
        if (index > -1) {
            history[index] = session;
        } else {
            history.unshift(session); // Add to top
        }
        await set('history', history);
    } catch (error) {}

    // Cloud Sync
    if (isSupabaseConfigured()) {
        try {
            const { error } = await supabase!
                .from('sessions')
                .upsert(session, { onConflict: 'id' });
            if (error) throw error;
        } catch (error) {
            console.error("Supabase Save Single Session Error:", error);
        }
    }
};

// DELETE SESSION
export const deleteSessionFromDB = async (sessionId: string) => {
    // Update Local Cache
    try {
        const history = await get<Session[]>('history') || [];
        const updatedHistory = history.filter(s => s.id !== sessionId);
        await set('history', updatedHistory);
    } catch (error) {}

    // Cloud Sync
    if (isSupabaseConfigured() && !isDemoData(sessionId)) {
        try {
            const { error } = await supabase!
                .from('sessions')
                .delete()
                .eq('id', sessionId);
            if (error) throw error;
        } catch (error) {
            console.error("Supabase Delete Session Error:", error);
        }
    }
};

// BULK HISTORY SAVE (Heavy Operation - Avoid in loops)
export const saveHistoryToDB = async (history: Session[]) => {
    await saveLocalHistory(history);
};

export const loadHistoryFromDB = async (): Promise<Session[] | undefined> => {
    if (isSupabaseConfigured()) {
        try {
            const { data, error } = await supabase!
                .from('sessions')
                .select('*')
                .order('createdAt', { ascending: false });
            if (error) throw error;
            if (data) {
                await saveLocalHistory(data as Session[]);
                return data as Session[];
            }
        } catch (error) {
            console.warn("Supabase Load History Error, falling back to local:", error);
        }
    } 
    return await get('history');
};

// --- NEWS FEED ---
export const saveNewsToDB = async (news: NewsItem[]) => {
    await saveLocalNews(news);

    const realNews = news.filter(n => !isDemoData(n.id));
    if (realNews.length === 0) return;

    if (isSupabaseConfigured()) {
        try {
            // We only save the top 20 most recent to cloud to avoid bloat
            const recentNews = realNews.slice(0, 20); 
            const { error } = await supabase!
                .from('news')
                .upsert(recentNews, { onConflict: 'id' });
            if (error) throw error;
        } catch (error) {
            console.error("Supabase Save News Error:", error);
        }
    } 
};

export const loadNewsFromDB = async (): Promise<NewsItem[] | undefined> => {
    if (isSupabaseConfigured()) {
        try {
            const { data, error } = await supabase!
                .from('news')
                .select('*')
                .order('timestamp', { ascending: false })
                .limit(50);
            if (error) throw error;
            if (data) {
                await saveLocalNews(data as NewsItem[]);
                return data as NewsItem[];
            }
        } catch (error) {
            console.warn("Supabase Load News Error, falling back to local:", error);
        }
    } 
    return await get('newsFeed');
};

// --- LANGUAGE (Always Local) ---
export const saveLanguageToDB = async (lang: Language) => {
    try { await set('language', lang); } catch (error) {}
};

export const loadLanguageFromDB = async (): Promise<Language | undefined> => {
    try { return await get('language'); } catch (error) { return undefined; }
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
    try { await del(cacheKey); } catch (error) {}
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
        const { data: cloudFiles, error } = await supabase!.storage.from(AUDIO_BUCKET).list('', {
            limit: 100,
            offset: 0,
            sortBy: { column: 'name', order: 'asc' },
        });
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
        // console.error("Failed to sync audio assets:", error);
    }
};

// --- SESSION ANTHEM ---
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
            cacheControl: '31536000', upsert: true 
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
        const { data, error } = await supabase!.storage.from(MUSIC_BUCKET).list();
        if (error) throw error;
        
        const anthemFile = data.find(file => file.name === ANTHEM_FILENAME);
        if (anthemFile) {
            const { data: urlData } = supabase!.storage.from(MUSIC_BUCKET).getPublicUrl(ANTHEM_FILENAME);
            return `${urlData.publicUrl}?t=${new Date(anthemFile.updated_at).getTime()}`;
        }
        return null;
    } catch (error) {
        return null;
    }
};