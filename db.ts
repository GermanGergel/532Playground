
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
        for (let i = 0; i < byteNumbers.length; i++) {
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
            if (key === 'syncStatus' || key === 'isTestMode' || key === 'isManual') continue;
            const isImageKey = ['photo', 'playerCard', 'logo', 'playerPhoto'].includes(key);
            if (isImageKey && typeof obj[key] === 'string' && obj[key].startsWith('data:')) {
                newObj[key] = null; 
            } else {
                newObj[key] = sanitizeObject(obj[key]);
            }
        }
        return newObj;
    }
    return obj;
};

// --- MAINTENANCE ---
export const clearLocalHistory = async () => {
    await del('history');
};

export const clearLocalCacheComplete = async () => {
    await del('history');
    await del('players');
    await del('newsFeed');
};

// --- PROMO PLAYER MANAGEMENT ---
const SETTINGS_KEY_PROMO = 'promo_player_config';

export const savePromoData = async (data: PromoData): Promise<boolean> => {
    if (!isSupabaseConfigured()) return false;
    try {
        const { error } = await supabase!
            .from('settings')
            .upsert({ key: SETTINGS_KEY_PROMO, value: data }, { onConflict: 'key' });
        if (error) throw error;
        return true;
    } catch (error) {
        return false;
    }
};

export const loadPromoData = async (): Promise<PromoData | null> => {
    if (!isSupabaseConfigured()) return null;
    try {
        const { data, error } = await supabase!.from('settings').select('value').eq('key', SETTINGS_KEY_PROMO).maybeSingle();
        if (error || !data) return null;
        return data.value as PromoData;
    } catch (error) {
        return null;
    }
};

export const uploadPromoImage = async (base64Image: string): Promise<string | null> => {
    if (!isSupabaseConfigured() || !base64Image) return null;
    try {
        const blob = base64ToBlob(base64Image);
        const filePath = `promo/hero_card_v${Date.now()}.jpg`; 
        const { error: uploadError } = await supabase!.storage.from('player_images').upload(filePath, blob, { cacheControl: '3600', upsert: true });
        if (uploadError) throw uploadError;
        const { data } = supabase!.storage.from('player_images').getPublicUrl(filePath);
        return data.publicUrl;
    } catch (error) {
        return null;
    }
};

// --- PLAYER MANAGEMENT ---
const BUCKET_NAME = 'player_images';

export const uploadPlayerImage = async (playerId: string, base64Image: string, type: 'avatar' | 'card'): Promise<string | null> => {
    if (!isSupabaseConfigured() || !base64Image) return null;
    try {
        const blob = base64ToBlob(base64Image);
        const filePath = `${playerId}/${type}_${Date.now()}.jpeg`;
        const { error: uploadError } = await supabase!.storage.from(BUCKET_NAME).upload(filePath, blob, { cacheControl: '31536000', upsert: true });
        if (uploadError) throw uploadError;
        const { data } = supabase!.storage.from(BUCKET_NAME).getPublicUrl(filePath);
        return data.publicUrl;
    } catch (error) { return null; }
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
            const { data } = await supabase!.from('players').select('*').eq('id', id).maybeSingle();
            return data as Player;
        } catch (e) { return null; }
    }
    return null;
};

export const savePlayersToDB = async (players: Player[]) => {
    const real = players; 
    if (isSupabaseConfigured()) {
        try {
            for (const player of real) {
                await supabase!.from('players').upsert(sanitizeObject(player), { onConflict: 'id' });
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

export const fetchRemotePlayers = async () => {
    if (isSupabaseConfigured()) {
        try {
            const { data } = await supabase!.from('players').select('*');
            if (data) await set('players', data);
            return data as Player[];
        } catch (e) {}
    }
    return null;
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
    if (s) await set('activeSession', s);
    else if (!s) await del('activeSession');
};

export const loadActiveSessionFromDB = async () => await get<Session>('activeSession');

export const saveHistoryLocalOnly = async (h: Session[]) => {
    const sorted = [...h].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    await set('history', sorted);
};

export const saveHistoryToDB = async (history: Session[]) => {
    // Standard saving without filters
    await saveHistoryLocalOnly(history); 
    
    if (isSupabaseConfigured()) {
        try {
            // Sync completed sessions that aren't synced yet
            const toSync = history.filter(s => s.status === 'completed' && s.syncStatus !== 'synced');
            if (toSync.length > 0) {
                const dbReady = toSync.map(s => sanitizeObject(s));
                const { error } = await supabase!.from('sessions').upsert(dbReady, { onConflict: 'id' });
                if (!error) {
                    // Update sync status locally for the ones we just synced
                    const final = history.map(s => toSync.some(ts => ts.id === s.id) ? {...s, syncStatus: 'synced' as const} : s);
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
                const isExhaustive = limit ? data.length < limit : true;
                
                const cloudTimes = data.map(s => new Date(s.createdAt).getTime());
                const minCloudTime = data.length > 0 ? Math.min(...cloudTimes) : 0;
                const maxCloudTime = data.length > 0 ? Math.max(...cloudTimes) : 0;

                const merged = [
                    ...data.map(s => ({...s, syncStatus: 'synced' as const})), 
                    ...local.filter(l => {
                        // Avoid duplicates from cloud
                        if (cloudIds.has(l.id)) return false;
                        
                        // If it's pending sync locally, keep it regardless of date logic to ensure eventual consistency
                        if (l.syncStatus !== 'synced') return true;
                        
                        // Otherwise check date bounds to avoid overwriting newer local data with old limits
                        const localTime = new Date(l.createdAt).getTime();
                        if (data.length > 0 && localTime >= minCloudTime && localTime <= maxCloudTime) return false;
                        if (isExhaustive && (data.length === 0 || localTime > maxCloudTime)) return false;
                        
                        return true;
                    })
                ];

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
    const freshNews = news;
    if (isSupabaseConfigured()) {
        try {
            if (freshNews.length > 0) {
                await supabase!.from('news').upsert(freshNews.map(n => sanitizeObject(n)), { onConflict: 'id' });
            }
        } catch (e) {}
    }
    await set('newsFeed', freshNews.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
};

export const loadNewsFromDB = async (limit?: number) => {
    if (isSupabaseConfigured()) {
        try {
            let q = supabase!.from('news').select('*').order('timestamp', { ascending: false });
            if (limit) q = q.limit(limit);
            const { data } = await q;
            if (data) {
                await set('newsFeed', data);
                return data as NewsItem[];
            }
        } catch (e) {}
    }
    return await get<NewsItem[]>('newsFeed') || [];
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

// --- ANTHEM LOGIC ---
const ANTHEM_STATUS_KEY = 'anthem_status';

export const getAnthemStatus = async (): Promise<boolean> => {
    if (!isSupabaseConfigured()) return true;
    try {
        const { data } = await supabase!.from('settings').select('value').eq('key', ANTHEM_STATUS_KEY).maybeSingle();
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
            const { data: setting } = await supabase!.from('settings').select('value').eq('key', ANTHEM_UPDATE_KEY).maybeSingle();
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

// --- ANALYTICS SAFEMODE ---
export const logAnalyticsEvent = async (eventType: string, eventData?: string) => {
    if (!isSupabaseConfigured()) return;
    try {
        await supabase!.from('hub_analytics').insert({
            event_type: eventType,
            event_data: eventData
        });
    } catch (e) { }
};

export const getAnalyticsSummary = async (): Promise<{ total: Record<string, number>, recent: Record<string, number> }> => {
    if (!isSupabaseConfigured()) return { total: {}, recent: {} };
    try {
        const { data, error } = await supabase!.from('hub_analytics').select('event_type, event_data, created_at');
        if (error) return { total: {}, recent: {} };
        
        const summaryTotal: Record<string, number> = {};
        const summaryRecent: Record<string, number> = {};
        const now = new Date().getTime();
        const oneDayMs = 24 * 60 * 60 * 1000;

        data.forEach((row: any) => {
            const isRecent = (now - new Date(row.created_at).getTime()) < oneDayMs;
            summaryTotal[row.event_type] = (summaryTotal[row.event_type] || 0) + 1;
            if (isRecent) {
                summaryRecent[row.event_type] = (summaryRecent[row.event_type] || 0) + 1;
            }
            if (row.event_data) {
                const specificKey = `${row.event_type}:${row.event_data}`;
                summaryTotal[specificKey] = (summaryTotal[specificKey] || 0) + 1;
                if (isRecent) {
                    summaryRecent[specificKey] = (summaryRecent[specificKey] || 0) + 1;
                }
            }
        });
        return { total: summaryTotal, recent: summaryRecent };
    } catch (e) {
        return { total: {}, recent: {} };
    }
};
