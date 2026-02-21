
import { createClient } from '@supabase/supabase-js';
import { Player, Session, NewsItem, PromoData, DraftState } from './types';
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

export const getSupabase = () => supabase; // Helper for direct access

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

// --- CHAT ICON MANAGEMENT ---
const CHAT_ICON_KEY = 'club_chat_icon';
const BALL_ICON_KEY = 'club_ball_icon';
const TROPHY_ICON_KEY = 'club_trophy_icon';

export const uploadCustomAsset = async (base64Image: string, prefix: string): Promise<string | null> => {
    if (!isSupabaseConfigured() || !base64Image) return null;
    try {
        const blob = base64ToBlob(base64Image);
        const filePath = `club_assets/${prefix}_${Date.now()}.png`; 
        const { error: uploadError } = await supabase!.storage.from('player_images').upload(filePath, blob, { cacheControl: '3600', upsert: true });
        if (uploadError) throw uploadError;
        const { data } = supabase!.storage.from('player_images').getPublicUrl(filePath);
        return data.publicUrl;
    } catch (error) {
        return null;
    }
};

export const saveAssetUrl = async (key: string, url: string): Promise<boolean> => {
    if (!isSupabaseConfigured()) return false;
    try {
        const { error } = await supabase!
            .from('settings')
            .upsert({ key, value: { url } }, { onConflict: 'key' });
        if (error) throw error;
        return true;
    } catch (error) {
        return false;
    }
};

export const loadAssetUrl = async (key: string): Promise<string | null> => {
    if (!isSupabaseConfigured()) return null;
    try {
        const { data, error } = await supabase!.from('settings').select('value').eq('key', key).maybeSingle();
        if (error || !data) return null;
        return (data.value as any)?.url || null;
    } catch (error) {
        return null;
    }
};

export const uploadChatIcon = async (base64Image: string): Promise<string | null> => uploadCustomAsset(base64Image, 'chat_icon');
export const saveChatIconUrl = async (url: string): Promise<boolean> => saveAssetUrl(CHAT_ICON_KEY, url);
export const loadChatIconUrl = async (): Promise<string | null> => loadAssetUrl(CHAT_ICON_KEY);

export const uploadBallIcon = async (base64Image: string): Promise<string | null> => uploadCustomAsset(base64Image, 'ball_icon');
export const saveBallIconUrl = async (url: string): Promise<boolean> => saveAssetUrl(BALL_ICON_KEY, url);
export const loadBallIconUrl = async (): Promise<string | null> => loadAssetUrl(BALL_ICON_KEY);

export const uploadTrophyIcon = async (base64Image: string): Promise<string | null> => uploadCustomAsset(base64Image, 'trophy_icon');
export const saveTrophyIconUrl = async (url: string): Promise<boolean> => saveAssetUrl(TROPHY_ICON_KEY, url);
export const loadTrophyIconUrl = async (): Promise<string | null> => loadAssetUrl(TROPHY_ICON_KEY);

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

export const savePlayersToDB = async (players: Player[]): Promise<boolean> => {
    const real = players; 
    let success = true;
    if (isSupabaseConfigured()) {
        try {
            // Bulk upsert is much faster and more reliable than individual requests
            const sanitizedPlayers = real.map(p => sanitizeObject(p));
            const { error } = await supabase!.from('players').upsert(sanitizedPlayers, { onConflict: 'id' });
            if (error) throw error;
        } catch (e) {
            console.error("Failed to save players to cloud", e);
            success = false;
        }
    }
    await set('players', real);
    return success;
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

// --- REMOTE SESSION HANDOFF (CLOUD SYNC) ---
// Used to transfer the active session from PC (Draft) to Phone (Live Match)
export const saveRemoteActiveSession = async (session: Session): Promise<boolean> => {
    if (!isSupabaseConfigured()) return false;
    try {
        const { error } = await supabase!.from('settings').upsert({ 
            key: 'remote_active_session', 
            value: sanitizeObject(session) 
        }, { onConflict: 'key' });
        
        if (error) throw error;
        return true;
    } catch (e) {
        console.error("Failed to save remote session", e);
        return false;
    }
};

export const getRemoteActiveSession = async (): Promise<Session | null> => {
    if (!isSupabaseConfigured()) return null;
    try {
        const { data, error } = await supabase!.from('settings').select('value').eq('key', 'remote_active_session').maybeSingle();
        if (error) throw error;
        return data?.value as Session;
    } catch (e) {
        console.error("Failed to get remote session", e);
        return null;
    }
};

// ** NEW FUNCTION: Fix for zombie sessions **
export const clearRemoteActiveSession = async (): Promise<boolean> => {
    if (!isSupabaseConfigured()) return false;
    try {
        // FIX: Instead of DELETE (which is blocked by RLS), we UPDATE to null
        const { error } = await supabase!.from('settings').update({ value: null }).eq('key', 'remote_active_session');
        if (error) throw error;
        return true;
    } catch (e) {
        console.error("Failed to clear remote session", e);
        return false;
    }
};

export const saveHistoryLocalOnly = async (h: Session[]) => {
    const sorted = [...h].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    await set('history', sorted);
};

export const saveHistoryToDB = async (history: Session[]) => {
    const real = history;
    await saveHistoryLocalOnly(real);
    if (isSupabaseConfigured()) {
        try {
            const toSync = real.filter(s => s.status === 'completed' && s.syncStatus !== 'synced');
            if (toSync.length > 0) {
                const dbReady = toSync.map(s => sanitizeObject(s));
                const { error } = await supabase!.from('sessions').upsert(dbReady, { onConflict: 'id' });
                if (!error) {
                    const final = real.map(s => toSync.some(ts => ts.id === s.id) ? {...s, syncStatus: 'synced' as const} : s);
                    await set('history', final);
                }
            }
        } catch (e) {}
    }
};

// DEBUG UTILITY: Force sync a single session and return the specific error
export const forceSyncSession = async (session: Session): Promise<{ success: boolean; error?: string }> => {
    if (!isSupabaseConfigured()) return { success: false, error: 'Supabase not configured' };
    
    try {
        // FULL SYNC: We assume the DB has all necessary columns now.
        const dbReady = sanitizeObject(session);
        
        const { error } = await supabase!.from('sessions').upsert(dbReady, { onConflict: 'id' });
        
        if (error) {
            return { success: false, error: error.message };
        }
        
        // Update local state if successful
        const h = await get<Session[]>('history') || [];
        const updatedHistory = h.map(s => s.id === session.id ? { ...s, syncStatus: 'synced' as const } : s);
        await set('history', updatedHistory);
        
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message || 'Unknown error' };
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
                        if (cloudIds.has(l.id)) return false;
                        if (l.syncStatus !== 'synced') return true;
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

// OPTIMIZED CHECK: Checks for key existence without loading value
export const hasCustomAudio = async (key: string, pack: number): Promise<boolean> => {
    try {
        const allKeys = await keys();
        const targetKey = `audio_pack${pack}_${key}`;
        return allKeys.includes(targetKey);
    } catch (e) {
        return false;
    }
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

// --- DRAFT DB LOGIC (LOCAL & CLOUD) ---

export const createDraftSession = async (draft: DraftState): Promise<boolean> => {
    // 1. Always save locally first for quick access / offline mode
    await set(`draft_${draft.id}`, draft);
    
    if (!isSupabaseConfigured()) {
        console.log("Draft created locally (Offline Mode)");
        return true; 
    }

    try {
        const { error } = await supabase!
            .from('draft_sessions')
            .upsert({ 
                id: draft.id, 
                pin: draft.pin,
                state: draft 
            }, { onConflict: 'id' });
        if (error) throw error;
        return true;
    } catch (error) {
        console.error("Draft cloud create error (falling back to local):", error);
        return true; // Return true to allow navigation even if cloud fails
    }
};

export const updateDraftState = async (draft: DraftState): Promise<boolean> => {
    // 1. Always update local
    await set(`draft_${draft.id}`, draft);

    if (!isSupabaseConfigured()) return true;

    try {
        const { error } = await supabase!
            .from('draft_sessions')
            .update({ state: draft })
            .eq('id', draft.id);
        if (error) throw error;
        return true;
    } catch (error) {
        console.error("Draft cloud update error", error);
        return true; // Assume local success is enough to proceed
    }
};

export const getDraftSession = async (draftId: string): Promise<DraftState | null> => {
    // 1. Try local first
    const local = await get<DraftState>(`draft_${draftId}`);
    
    if (!isSupabaseConfigured()) return local || null;

    try {
        const { data, error } = await supabase!
            .from('draft_sessions')
            .select('state')
            .eq('id', draftId)
            .maybeSingle();
        if (error) throw error;
        // Merge strategy: Server wins if available, else local
        return data?.state || local || null;
    } catch (error) {
        return local || null;
    }
};

export const subscribeToDraft = (draftId: string, callback: (draft: DraftState) => void) => {
    if (!isSupabaseConfigured()) {
        // LOCAL POLLING FALLBACK: simulates realtime for local dev
        const interval = setInterval(async () => {
             const local = await get<DraftState>(`draft_${draftId}`);
             if (local) callback(local);
        }, 1000);
        return { unsubscribe: () => clearInterval(interval) };
    }
    
    return supabase!
        .channel(`draft_room_${draftId}`)
        .on(
            'postgres_changes',
            { event: 'UPDATE', schema: 'public', table: 'draft_sessions', filter: `id=eq.${draftId}` },
            (payload) => {
                if (payload.new && payload.new.state) {
                    callback(payload.new.state as DraftState);
                }
            }
        )
        .subscribe();
};
