
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
    } catch (e) {}
    try {
        if (typeof process !== 'undefined' && process.env && process.env[key]) {
            return process.env[key];
        }
    } catch (e) {}
    return undefined;
};

const supabaseUrl = getEnvVar('VITE_SUPABASE_URL');
const supabaseAnonKey = getEnvVar('VITE_SUPABASE_ANON_KEY');

const supabase = (supabaseUrl && supabaseAnonKey) 
    ? createClient(supabaseUrl, supabaseAnonKey) 
    : null;

export const isSupabaseConfigured = () => !!supabase;

// --- FAIL-FAST TIMEOUT HELPER ---
const withTimeout = <T>(promise: any, ms: number = 1500): Promise<T> => {
    return Promise.race([
        Promise.resolve(promise),
        new Promise<T>((_, reject) => 
            setTimeout(() => reject(new Error('Database Request Timeout')), ms)
        )
    ]);
};

const isDemoData = (id: string) => id.startsWith('demo_');

const base64ToBlob = (base64: string): Blob => {
    try {
        const parts = base64.split(';base64,');
        if (parts.length !== 2) throw new Error('Invalid base64');
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
    } catch (e) {
        console.error("Blob conversion failed", e);
        return new Blob([], { type: 'image/jpeg' }); 
    }
};

// --- IMAGES ---
const BUCKET_NAME = 'player_images';

export const uploadPlayerImage = async (playerId: string, base64Image: string, type: 'avatar' | 'card'): Promise<string | null> => {
    if (!base64Image) return null;

    if (!isSupabaseConfigured() || isDemoData(playerId)) {
        // For local mode or demo data, we still return base64, but it won't be saved to the cloud DB
        return base64Image;
    }

    try {
        const blob = base64ToBlob(base64Image);
        const filePath = `${playerId}/${type}_${Date.now()}.jpeg`;
        
        const { error: uploadError } = await supabase!.storage
            .from(BUCKET_NAME)
            .upload(filePath, blob, {
                cacheControl: '31536000',
                upsert: false, // Don't upsert, create new file to avoid cache issues
            });

        if (uploadError) throw uploadError;

        const { data } = supabase!.storage.from(BUCKET_NAME).getPublicUrl(filePath);
        
        return data.publicUrl;

    } catch (e) {
        console.error("Cloud image upload failed:", e);
        alert("Image upload to cloud storage failed. Please check your connection or storage quota.");
        return null; // Return null on failure to indicate something went wrong
    }
};

export const deletePlayerImage = async (imageUrl: string) => {
    if (!isSupabaseConfigured() || !imageUrl || !imageUrl.startsWith('http')) return;
    
    try {
        const url = new URL(imageUrl);
        // Correctly extract path after the bucket name
        const pathAfterBucket = url.pathname.split(`/${BUCKET_NAME}/`)[1];
        
        if (pathAfterBucket) {
            await supabase!.storage.from(BUCKET_NAME).remove([pathAfterBucket]);
        }
    } catch (e) {
        console.warn(`Could not delete image from storage: ${imageUrl}`, e);
    }
};


// --- DATA METHODS (OFFLINE FIRST ARCHITECTURE) ---

// SAVE SINGLE PLAYER
export const saveSinglePlayerToDB = async (player: Player) => {
    try {
        const allPlayers = await get<Player[]>('players') || [];
        const index = allPlayers.findIndex(p => p.id === player.id);
        if (index > -1) allPlayers[index] = player;
        else allPlayers.push(player);
        await set('players', allPlayers);
    } catch (e) { console.error("Local save failed", e); }

    if (isSupabaseConfigured() && !isDemoData(player.id)) {
        supabase!.from('players').upsert(player, { onConflict: 'id' }).catch(() => {
             console.warn("Cloud sync failed, data is safe on device.");
        });
    }
};

// LOAD SINGLE PLAYER
export const loadSinglePlayerFromDB = async (id: string): Promise<Player | null> => {
    if (isSupabaseConfigured()) {
        try {
            const response = await withTimeout(supabase!
                .from('players')
                .select('*')
                .eq('id', id)
                .single());
            const { data, error } = response as any;
            if (!error && data) return data as Player;
        } catch (e) { /* Fallback to local */ }
    }
    const allPlayers = await get<Player[]>('players') || [];
    return allPlayers.find(p => p.id === id) || null;
};

// SAVE BULK PLAYERS
export const savePlayersToDB = async (players: Player[], waitForCloud: boolean = false) => {
    try {
        const allLocal = await get<Player[]>('players') || [];
        const map = new Map(allLocal.map(p => [p.id, p]));
        players.forEach(p => map.set(p.id, p));
        await set('players', Array.from(map.values()));
    } catch(e) { console.error("Local player save failed", e); }
    
    const realPlayersToSync = players.filter(p => !isDemoData(p.id));
    if (realPlayersToSync.length === 0 || !isSupabaseConfigured()) return;

    const saveChunk = async (chunk: Player[]) => {
        const { error } = await supabase!.from('players').upsert(chunk, { onConflict: 'id' });
        if (error) throw error;
    };

    const CHUNK_SIZE = 50;
    const promises = [];
    for (let i = 0; i < realPlayersToSync.length; i += CHUNK_SIZE) {
        const chunk = realPlayersToSync.slice(i, i + CHUNK_SIZE);
        promises.push(saveChunk(chunk));
    }

    if (waitForCloud) {
        await Promise.all(promises);
    } else {
        Promise.all(promises).catch(err => {
            console.warn("Background player sync failed:", err.message);
        });
    }
};


// LOAD PLAYERS
export const loadPlayersFromDB = async (): Promise<Player[] | undefined> => {
    let localData: Player[] = [];
    try { localData = await get('players') || []; } catch (e) {}

    if (isSupabaseConfigured()) {
        try {
            const response = await withTimeout(supabase!.from('players').select('*'), 1500);
            const { data, error } = response as any;
            
            if (error) throw error;
            if (data) {
                set('players', data); 
                return data as Player[];
            }
        } catch (error) {
            console.warn("Supabase unavailable (Quota/Timeout). Using Local Data.");
        }
    }
    return localData; 
};

// ACTIVE SESSION
export const saveActiveSessionToDB = async (session: Session | null) => {
    if (session && !isDemoData(session.id)) await set('activeSession', session);
    else if (!session) await set('activeSession', null);
};

export const loadActiveSessionFromDB = async (): Promise<Session | null | undefined> => {
    return await get('activeSession');
};

// HISTORY
export const saveHistoryToDB = async (history: Session[], waitForCloud: boolean = false) => {
    try {
        const allLocal = await get<Session[]>('history') || [];
        // FIX: The type of `s` was being inferred as `unknown`, causing a compile error.
        // Explicitly casting `s` to `Session` allows accessing the `id` property.
        const map = new Map(allLocal.map(s => [(s as Session).id, s]));
        history.forEach(s => map.set(s.id, s));
        const fullHistory = Array.from(map.values());
        const realHistoryToSave = fullHistory.filter(s => !isDemoData(s.id));
        const sortedHistory = realHistoryToSave.sort((a: Session, b: Session) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        await set('history', sortedHistory);
    } catch (e) { console.error("Local history save failed", e); }
    
    const realHistoryToSync = history.filter(s => !isDemoData(s.id));
    if (realHistoryToSync.length === 0 || !isSupabaseConfigured()) return;

    const cloudOp = supabase!.from('sessions').upsert(realHistoryToSync, { onConflict: 'id' });
    
    if (waitForCloud) {
        const { error } = await cloudOp;
        if (error) throw error;
    } else {
        cloudOp.catch(err => {
            console.warn("Background history sync failed:", err.message);
        });
    }
};

export const loadHistoryFromDB = async (): Promise<Session[] | undefined> => {
    let localData: Session[] = [];
    // FIX: Added generic type to `get` for better type safety.
    try { localData = await get<Session[]>('history') || []; } catch(e) {}

    if (isSupabaseConfigured()) {
        try {
            const response = await withTimeout(supabase!
                .from('sessions')
                .select('*')
                .order('createdAt', { ascending: false }), 2000);
            
            const { data, error } = response as any;
            if (!error && data) {
                set('history', data);
                return data as Session[];
            }
        } catch (e) {
             console.warn("Using local history due to cloud timeout");
        }
    }
    return localData;
};

// NEWS
export const saveNewsToDB = async (news: NewsItem[], waitForCloud: boolean = false) => {
    const realNews = news.filter(n => !isDemoData(n.id));
    try {
        await set('newsFeed', realNews);
    } catch(e) { console.error("Local news save failed", e); }
    
    if (realNews.length === 0 || !isSupabaseConfigured()) return;

    const cloudOp = supabase!.from('news').upsert(realNews.slice(0, 50), { onConflict: 'id' });
    
    if (waitForCloud) {
        const { error } = await cloudOp;
        if (error) throw error;
    } else {
        cloudOp.catch(err => {
            console.warn("Background news sync failed:", err.message);
        });
    }
};

export const loadNewsFromDB = async (): Promise<NewsItem[] | undefined> => {
    try {
        if (isSupabaseConfigured()) {
            const response = await withTimeout(supabase!
                .from('news')
                .select('*')
                .order('timestamp', { ascending: false })
                .limit(50), 1500);
            const { data, error } = response as any;
            if (!error && data) {
                set('newsFeed', data);
                return data as NewsItem[];
            }
        }
    } catch (e) {}
    return await get('newsFeed');
};

// PREFS (Local Only)
export const saveLanguageToDB = async (lang: Language) => { try { await set('language', lang); } catch (e) {} };
export const loadLanguageFromDB = async (): Promise<Language | undefined> => { try { return await get('language'); } catch (e) { return undefined; } };
export const saveActiveVoicePackToDB = async (pack: number) => { try { await set('activeVoicePack', pack); } catch (e) {} };
export const loadActiveVoicePackFromDB = async (): Promise<number | undefined> => { try { return await get('activeVoicePack'); } catch (e) { return undefined; } };

// AUDIO ASSETS
const AUDIO_BUCKET = 'audio_assets';
const AUDIO_KEY_PREFIX = 'audio_';
type CachedAudio = { data: string; lastModified: string };
const getCacheKey = (key: string, pack: number) => `${AUDIO_KEY_PREFIX}pack${pack}_${key}`;

export const saveCustomAudio = async (key: string, base64: string, pack: number): Promise<void> => {
    const cacheKey = getCacheKey(key, pack);
    await set(cacheKey, { data: base64, lastModified: new Date().toISOString() }); // Local first
    
    if (isSupabaseConfigured()) {
        const blob = base64ToBlob(base64);
        const filePath = `pack${pack}/${key}.mp3`;
        supabase!.storage.from(AUDIO_BUCKET).upload(filePath, blob, { cacheControl: '31536000', upsert: true }).catch(() => {});
    }
};

export const loadCustomAudio = async (key: string, pack: number): Promise<string | undefined> => {
    const cacheKey = getCacheKey(key, pack);
    try {
        const cached = await get<CachedAudio>(cacheKey);
        // If data exists locally, return it immediately without checking cloud
        if (cached?.data) {
            return cached.data;
        }
    } catch (e) {}

    // If no local data, do not attempt to fetch from cloud here to avoid blocking playback.
    // Syncing is handled separately.
    return undefined;
};

export const deleteCustomAudio = async (key: string, pack: number): Promise<void> => {
    const cacheKey = getCacheKey(key, pack);
    await del(cacheKey);
    if (isSupabaseConfigured()) {
        try {
            const filePath = `pack${pack}/${key}.mp3`;
            await supabase!.storage.from(AUDIO_BUCKET).remove([filePath]);
        } catch (e) {}
    }
};

export const syncAndCacheAudioAssets = async () => {
    if (!isSupabaseConfigured()) return;
    try {
        const response = await withTimeout(supabase!.storage.from(AUDIO_BUCKET).list('', { limit: 50 }), 2000);
        const { data: cloudFiles, error } = response as any;
        if (error || !cloudFiles) return;
    } catch (e) {}
};

// SESSION ANTHEM
const MUSIC_BUCKET = 'session_music';
const ANTHEM_FILENAME = 'anthem.mp3';

export const uploadSessionAnthem = async (base64: string): Promise<string | null> => {
    await set('session_anthem', base64);
    if (!isSupabaseConfigured()) return base64;
    try {
        const blob = base64ToBlob(base64);
        supabase!.storage.from(MUSIC_BUCKET).upload(ANTHEM_FILENAME, blob, { cacheControl: '31536000', upsert: true }).catch(() => {});
        return base64;
    } catch (e) { return null; }
};

export const deleteSessionAnthem = async (): Promise<void> => {
    await del('session_anthem');
    if (isSupabaseConfigured()) {
        try { await supabase!.storage.from(MUSIC_BUCKET).remove([ANTHEM_FILENAME]); } catch(e) {}
    }
};

export const getSessionAnthemUrl = async (): Promise<string | null> => {
    const local = await get<string>('session_anthem');
    if (local) return local; 

    if (!isSupabaseConfigured()) return null;
    try {
        const response = await withTimeout(supabase!.storage.from(MUSIC_BUCKET).list(), 1500);
        const { data, error } = response as any;
        if (error) throw error;
        const file = data.find((f: any) => f.name === ANTHEM_FILENAME);
        if (file) {
            const { data: urlData } = supabase!.storage.from(MUSIC_BUCKET).getPublicUrl(ANTHEM_FILENAME);
            return urlData.publicUrl;
        }
    } catch (e) {}
    return null;
};
