
import { createClient } from '@supabase/supabase-js';
import { Player, Session, NewsItem, PromoData } from './types';
import { Language } from './translations/index';
import { get, set, del } from 'idb-keyval';

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

// --- PROMO PLAYER MANAGEMENT ---
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
        const filePath = `promo/hero_card_v${Date.now()}.jpg`; 

        const { error: uploadError } = await supabase!.storage
            .from('player_images')
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

// --- HELPERS ---
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

const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
};

const sanitizeObject = (obj: any): any => {
    if (obj === null || obj === undefined) return obj;
    if (typeof obj === 'number') return isNaN(obj) ? 0 : obj;
    if (Array.isArray(obj)) return obj.map(v => sanitizeObject(v));
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

// --- PLAYER MANAGEMENT ---
const BUCKET_NAME = 'player_images';

export const uploadPlayerImage = async (playerId: string, base64Image: string, type: 'avatar' | 'card'): Promise<string | null> => {
    if (!isSupabaseConfigured() || !base64Image) return null;
    try {
        const blob = base64ToBlob(base64Image);
        const filePath = `${playerId}/${type}_${Date.now()}.jpeg`;
        const { error: uploadError } = await supabase!.storage
            .from(BUCKET_NAME)
            .upload(filePath, blob, { cacheControl: '31536000', upsert: true });
        if (uploadError) throw uploadError;
        const { data } = supabase!.storage.from(BUCKET_NAME).getPublicUrl(filePath);
        return data.publicUrl;
    } catch (error) {
        return null;
    }
};

export const deletePlayerImage = async (imageUrl: string) => {
    if (!isSupabaseConfigured() || !imageUrl || !imageUrl.startsWith('https://')) return;
    try {
        const url = new URL(imageUrl);
        const path = url.pathname.split(`/${BUCKET_NAME}/`)[1];
        if (path) await supabase!.storage.from(BUCKET_NAME).remove([path]);
    } catch (error) {}
};

export const saveSinglePlayerToDB = async (player: Player) => {
    if (player.id.startsWith('demo_')) return;
    if (isSupabaseConfigured()) {
        try {
            await supabase!.from('players').upsert(sanitizeObject(player), { onConflict: 'id' });
        } catch (error) {}
    }
    const all = await get<Player[]>('players') || [];
    const idx = all.findIndex(p => p.id === player.id);
    if (idx > -1) all[idx] = player; else all.push(player);
    await set('players', all);
};

export const loadSinglePlayerFromDB = async (id: string, skipCache: boolean = false): Promise<Player | null> => {
    if (!skipCache) {
        const all = await get<Player[]>('players') || [];
        const local = all.find(p => p.id === id);
        if (local) return local;
    }
    if (isSupabaseConfigured()) {
        try {
            const { data } = await supabase!.from('players').select('*').eq('id', id).single();
            return data as Player;
        } catch (e) { return null; }
    }
    return null;
};

export const savePlayersToDB = async (players: Player[]) => {
    const real = players.filter(p => !p.id.startsWith('demo_'));
    if (isSupabaseConfigured()) {
        try {
            const chunks = real.map(p => sanitizeObject(p));
            for (let i = 0; i < chunks.length; i++) {
                await supabase!.from('players').upsert(chunks[i], { onConflict: 'id' });
            }
        } catch (e) {}
    }
    await set('players', real);
};

export const loadPlayersFromDB = async () => {
    if (isSupabaseConfigured()) {
        try {
            const { data } = await supabase!.from('players').select('*');
            if (data) await set('players', data);
            return data as Player[];
        } catch (e) {}
    }
    return await get<Player[]>('players');
};

export const getCloudPlayerCount = async () => {
    if (!isSupabaseConfigured()) return null;
    try {
        const { count } = await supabase!.from('players').select('*', { count: 'exact', head: true });
        return count;
    } catch (e) { return null; }
};

// --- SESSION MANAGEMENT ---
export const saveActiveSessionToDB = async (s: Session | null) => {
    if (s && !s.id.startsWith('demo_')) await set('activeSession', s);
    else if (!s) await del('activeSession');
};

export const loadActiveSessionFromDB = async () => await get<Session>('activeSession');

export const saveHistoryLocalOnly = async (h: Session[]) => {
    const sorted = [...h].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    await set('history', sorted);
};

export const saveHistoryToDB = async (history: Session[]) => {
    const real = history.filter(s => !s.id.startsWith('demo_'));
    await saveHistoryLocalOnly(real);
    if (isSupabaseConfigured()) {
        try {
            const toSync = real.filter(s => s.status === 'completed' && s.syncStatus !== 'synced');
            if (toSync.length > 0) {
                const dbReady = toSync.map(s => sanitizeObject({...s, playerPool: s.playerPool.map(p => ({...p, photo: undefined, playerCard: undefined}))}));
                const { error } = await supabase!.from('sessions').upsert(dbReady, { onConflict: 'id' });
                if (!error) {
                    const final = real.map(s => toSync.some(ts => ts.id === s.id) ? {...s, syncStatus: 'synced' as const} : s);
                    await set('history', final);
                }
            }
        } catch (e) {}
    }
};

export const loadHistoryFromDB = async (limit?: number) => {
    let local = await get<Session[]>('history') || [];
    if (isSupabaseConfigured()) {
        try {
            let q = supabase!.from('sessions').select('*').order('createdAt', { ascending: false });
            if (limit) q = q.limit(limit);
            const { data } = await q;
            if (data) {
                const cloudIds = new Set(data.map(s => s.id));
                const merged = [...data.map(s => ({...s, syncStatus: 'synced'})), ...local.filter(l => !cloudIds.has(l.id))];
                merged.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
                await set('history', merged);
                return limit ? merged.slice(0, limit) : merged;
            }
        } catch (e) {}
    }
    return limit ? local.slice(0, limit) : local;
};

export const deleteSession = async (id: string) => {
    const h = await get<Session[]>('history') || [];
    await set('history', h.filter(s => s.id !== id));
};

export const retrySyncPendingSessions = async () => {
    const h = await get<Session[]>('history') || [];
    await saveHistoryToDB(h);
    return h.filter(s => s.syncStatus === 'pending').length;
};

// --- NEWS FEED ---
export const saveNewsToDB = async (news: NewsItem[]) => {
    const real = news.filter(n => !n.id.startsWith('demo_'));
    if (isSupabaseConfigured()) {
        try {
            await supabase!.from('news').upsert(real.map(n => sanitizeObject(n)), { onConflict: 'id' });
        } catch (e) {}
    }
    const existing = await get<NewsItem[]>('newsFeed') || [];
    const newsMap = new Map<string, NewsItem>(); // Fixed Map typing
    existing.forEach(n => newsMap.set(n.id, n));
    real.forEach(n => newsMap.set(n.id, n));
    const merged = Array.from(newsMap.values()).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 50);
    await set('newsFeed', merged);
};

export const loadNewsFromDB = async (limit?: number) => {
    if (isSupabaseConfigured()) {
        try {
            let q = supabase!.from('news').select('*').order('timestamp', { ascending: false });
            if (limit) q = q.limit(limit);
            const { data } = await q;
            return data as NewsItem[];
        } catch (e) {}
    }
    return await get<NewsItem[]>('newsFeed');
};

// --- AUDIO & ASSETS ---
const AUDIO_BUCKET = 'audio_assets';
const MUSIC_BUCKET = 'session_music';
const ANTHEM_FILENAME = 'anthem.mp3';
const ANTHEM_UPDATE_KEY = 'anthem_last_updated';

type CachedAudio = { data: string; lastModified: string; };

export const saveLanguageToDB = async (l: Language) => await set('language', l);
export const loadLanguageFromDB = async () => await get<Language>('language');
export const saveActiveVoicePackToDB = async (p: number) => await set('activeVoicePack', p);
export const loadActiveVoicePackFromDB = async () => await get<number>('activeVoicePack');

export const saveCustomAudio = async (key: string, base64: string, pack: number) => {
    const cacheKey = `audio_pack${pack}_${key}`;
    const now = new Date().toISOString();
    await set(cacheKey, { data: base64, lastModified: now });
    if (isSupabaseConfigured()) {
        try {
            const blob = base64ToBlob(base64);
            await supabase!.storage.from(AUDIO_BUCKET).upload(`pack${pack}/${key}.mp3`, blob, { upsert: true });
        } catch (e) {}
    }
};

export const loadCustomAudio = async (key: string, pack: number) => {
    const cached = await get<CachedAudio>(`audio_pack${pack}_${key}`);
    return cached?.data;
};

export const deleteCustomAudio = async (key: string, pack: number) => {
    await del(`audio_pack${pack}_${key}`);
    if (isSupabaseConfigured()) {
        try { await supabase!.storage.from(AUDIO_BUCKET).remove([`pack${pack}/${key}.mp3`]); } catch (e) {}
    }
};

export const syncAndCacheAudioAssets = async () => {
    if (!isSupabaseConfigured()) return;
    try {
        for (let p = 1; p <= 3; p++) {
            const { data } = await supabase!.storage.from(AUDIO_BUCKET).list(`pack${p}`);
            if (!data) continue;
            for (const f of data) {
                if (!f.name.endsWith('.mp3')) continue;
                const key = f.name.replace('.mp3', '');
                const cacheKey = `audio_pack${p}_${key}`;
                const local = await get<CachedAudio>(cacheKey);
                const cloudTime = new Date(f.updated_at || f.created_at).getTime();
                const localTime = local ? new Date(local.lastModified).getTime() : 0;
                if (!local || cloudTime > localTime) {
                    const { data: blob } = await supabase!.storage.from(AUDIO_BUCKET).download(`pack${p}/${f.name}`);
                    if (blob) await set(cacheKey, { data: await blobToBase64(blob), lastModified: f.updated_at || f.created_at });
                }
            }
        }
    } catch (e) {}
};

// --- ANTHEM LOGIC (TIMESTAMP SYSTEM) ---
const ANTHEM_STATUS_KEY = 'anthem_status';

export const getAnthemStatus = async (): Promise<boolean> => {
    if (!isSupabaseConfigured()) return true;
    try {
        const { data } = await supabase!.from('settings').select('value').eq('key', ANTHEM_STATUS_KEY).single();
        return (data?.value as any)?.enabled ?? true;
    } catch (e) { return true; }
};

export const uploadSessionAnthem = async (base64: string): Promise<string | null> => {
    const cacheKey = 'session_anthem_data';
    const now = new Date().toISOString();
    await set(cacheKey, { data: base64, lastModified: now });
    if (!isSupabaseConfigured()) return "local";
    try {
        const blob = base64ToBlob(base64);
        const { error } = await supabase!.storage.from(MUSIC_BUCKET).upload(ANTHEM_FILENAME, blob, { upsert: true });
        if (error) throw error;
        await supabase!.from('settings').upsert({ key: ANTHEM_UPDATE_KEY, value: { timestamp: now } }, { onConflict: 'key' });
        return "uploaded";
    } catch (e) { return null; }
};

export const deleteSessionAnthem = async () => {
    const cacheKey = 'session_anthem_data';
    await del(cacheKey);
    if (isSupabaseConfigured()) {
        try {
            await supabase!.storage.from(MUSIC_BUCKET).remove([ANTHEM_FILENAME]);
            const now = new Date().toISOString();
            await supabase!.from('settings').upsert({ key: ANTHEM_UPDATE_KEY, value: { timestamp: now, deleted: true } }, { onConflict: 'key' });
        } catch (e) {}
    }
};

export const getSessionAnthemUrl = async (): Promise<string | null> => {
    const cacheKey = 'session_anthem_data';
    if (isSupabaseConfigured()) {
        try {
            const isEnabled = await getAnthemStatus();
            if (!isEnabled) return null;

            const { data: setting } = await supabase!.from('settings').select('value').eq('key', ANTHEM_UPDATE_KEY).single();
            const serverTs = (setting?.value as any)?.timestamp;
            const serverDel = (setting?.value as any)?.deleted;

            if (serverDel) { await del(cacheKey); return null; }

            const cached = await get<CachedAudio>(cacheKey);
            const localTs = cached?.lastModified ? new Date(cached.lastModified).getTime() : 0;
            const serverTsNum = serverTs ? new Date(serverTs).getTime() : 0;

            if (serverTsNum > localTs || !cached) {
                const { data } = await supabase!.storage.from(MUSIC_BUCKET).download(ANTHEM_FILENAME);
                if (data) {
                    await set(cacheKey, { data: await blobToBase64(data), lastModified: serverTs || new Date().toISOString() });
                    return URL.createObjectURL(data);
                }
            }
        } catch (e) {}
    }
    const cached = await get<CachedAudio>(cacheKey);
    if (cached?.data) return URL.createObjectURL(base64ToBlob(cached.data));
    return null;
};
