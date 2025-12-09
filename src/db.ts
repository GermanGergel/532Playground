
import { createClient } from '@supabase/supabase-js';
import { Player, Session, NewsItem } from '../types';
import { Language } from '../translations/index';
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
// If Supabase is blocked (Quota Exceeded), it might hang. 
// We timeout extremely fast (1.5s) to force local mode immediately.
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
    // 1. Always return the base64 immediately so the UI updates instantly
    if (!base64Image) return null;
    
    // 2. Try Cloud Upload (Fire and Forget logic to not block UI)
    if (isSupabaseConfigured() && !isDemoData(playerId)) {
        (async () => {
            try {
                const blob = base64ToBlob(base64Image);
                const fileExtension = blob.type.split('/')[1] || 'jpeg';
                const filePath = `${playerId}/${type}_${Date.now()}.${fileExtension}`;
                
                await supabase!.storage.from(BUCKET_NAME).upload(filePath, blob, {
                    cacheControl: '31536000', 
                    upsert: true, 
                });
            } catch (e) {
                console.warn("Cloud upload skipped (Offline/Quota). Image saved locally.");
            }
        })();
    }
    
    return base64Image; // Return the local string to display immediately
};

export const deletePlayerImage = async (imageUrl: string) => {
    if (!isSupabaseConfigured() || !imageUrl || !imageUrl.startsWith('https://')) return;
    try {
        const url = new URL(imageUrl);
        const path = url.pathname.split(`/${BUCKET_NAME}/`)[1];
        if (path) await supabase!.storage.from(BUCKET_NAME).remove([path]);
    } catch (e) {}
};

// --- DATA METHODS (OFFLINE FIRST ARCHITECTURE) ---

// SAVE SINGLE PLAYER
export const saveSinglePlayerToDB = async (player: Player) => {
    // 1. CRITICAL: Save to Local Storage FIRST. This ensures data safety.
    try {
        const allPlayers = await get<Player[]>('players') || [];
        const index = allPlayers.findIndex(p => p.id === player.id);
        if (index > -1) allPlayers[index] = player;
        else allPlayers.push(player);
        await set('players', allPlayers);
    } catch (e) { console.error("Local save failed", e); }

    // 2. Try Cloud Sync (Best Effort)
    if (isSupabaseConfigured() && !isDemoData(player.id)) {
        (async () => {
            const { error } = await supabase!.from('players').upsert(player, { onConflict: 'id' });
            if (error) {
                console.warn("Cloud sync failed, data is safe on device.");
            }
        })();
    }
};

// LOAD SINGLE PLAYER
export const loadSinglePlayerFromDB = async (id: string): Promise<Player | null> => {
    // Try Cloud first for freshest data, but fail fast to local
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
    // Fallback Local
    const allPlayers = await get<Player[]>('players') || [];
    return allPlayers.find(p => p.id === id) || null;
};

// SAVE BULK PLAYERS
export const savePlayersToDB = async (players: Player[]) => {
    const realPlayers = players.filter(p => !isDemoData(p.id));
    if (realPlayers.length === 0) return;

    // 1. Local Save (Guaranteed)
    try {
        const allLocal = await get<Player[]>('players') || [];
        const map = new Map(allLocal.map(p => [p.id, p]));
        realPlayers.forEach(p => map.set(p.id, p));
        await set('players', Array.from(map.values()));
    } catch(e) {}

    // 2. Cloud Save (Best Effort)
    if (isSupabaseConfigured()) {
        const CHUNK_SIZE = 10;
        for (let i = 0; i < realPlayers.length; i += CHUNK_SIZE) {
            const chunk = realPlayers.slice(i, i + CHUNK_SIZE);
            (async () => {
                const { error } = await supabase!.from('players').upsert(chunk, { onConflict: 'id' });
                if (error) {
                    console.warn(`Background player chunk sync failed: ${error.message}`);
                }
            })();
        }
    }
};

// LOAD PLAYERS - CRITICAL FIX FOR HANGING
export const loadPlayersFromDB = async (): Promise<Player[] | undefined> => {
    // Always check Local Storage availability first for speed
    let localData: Player[] = [];
    try { localData = await get('players') || []; } catch (e) {}

    if (isSupabaseConfigured()) {
        try {
            // Very short timeout. If cloud is blocked, we want local data INSTANTLY.
            const response = await withTimeout(supabase!.from('players').select('*'), 1500);
            const { data, error } = response as any;
            
            if (error) throw error;
            if (data) {
                // Background update local cache
                set('players', data); 
                return data as Player[];
            }
        } catch (error) {
            console.warn("Supabase unavailable (Quota/Timeout). Using Local Data.");
        }
    }
    // Return local data if cloud failed or disabled
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
export const saveHistoryToDB = async (history: Session[]) => {
    const realHistory = history.filter(s => !isDemoData(s.id));
    
    // Local Save
    await set('history', realHistory);

    // Cloud Save (Background)
    if (isSupabaseConfigured() && realHistory.length > 0) {
        const latest = realHistory[0];
        (async () => {
            const { error } = await supabase!.from('sessions').upsert([latest], { onConflict: 'id' });
            if (error) {
                console.warn(`Background history sync failed: ${error.message}`);
            }
        })();
    }
};

export const loadHistoryFromDB = async (): Promise<Session[] | undefined> => {
    let localData: Session[] = [];
    try { localData = await get('history') || []; } catch(e) {}

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
export const saveNewsToDB = async (news: NewsItem[]) => {
    const realNews = news.filter(n => !isDemoData(n.id));
    await set('newsFeed', realNews);
    
    if (isSupabaseConfigured() && realNews.length > 0) {
        (async () => {
            const { error } = await supabase!.from('news').upsert(realNews.slice(0, 10), { onConflict: 'id' });
            if (error) {
                console.warn(`Background news sync failed: ${error.message}`);
            }
        })();
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
        (async () => {
            await supabase!.storage.from(AUDIO_BUCKET).upload(filePath, blob, { cacheControl: '31536000', upsert: true });
        })();
    }
};

export const loadCustomAudio = async (key: string, pack: number): Promise<string | undefined> => {
    const cacheKey = getCacheKey(key, pack);
    try {
        const cached = await get<CachedAudio>(cacheKey);
        return cached?.data;
    } catch (e) { return undefined; }
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
        (async () => {
            await supabase!.storage.from(MUSIC_BUCKET).upload(ANTHEM_FILENAME, blob, { cacheControl: '31536000', upsert: true });
        })();
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
