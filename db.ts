import { createClient } from '@supabase/supabase-js';
import { Player, Session, NewsItem } from './types';
import { Language } from './translations';
import { get, set } from 'idb-keyval';

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

const isSupabaseConfigured = () => !!supabase;

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

// --- PLAYERS ---
export const savePlayersToDB = async (players: Player[]) => {
    logStorageMode();
    
    // Mode 1: Cloud
    if (isSupabaseConfigured()) {
        try {
            const { error } = await supabase!
                .from('players')
                .upsert(players, { onConflict: 'id' });
            if (error) throw error;
        } catch (error) {
            console.error("Supabase Save Error:", error);
        }
    } 
    // Mode 2: Local Fallback
    else {
        try {
            await set('players', players);
        } catch (error) {
            // Silent fail or minimal log
        }
    }
};

export const loadPlayersFromDB = async (): Promise<Player[] | undefined> => {
    logStorageMode();

    // Mode 1: Cloud
    if (isSupabaseConfigured()) {
        try {
            const { data, error } = await supabase!
                .from('players')
                .select('*');
            if (error) throw error;
            return data as Player[];
        } catch (error) {
            // If cloud fails, try local quietly
            return await get('players');
        }
    } 
    // Mode 2: Local Fallback
    else {
        try {
            return await get('players');
        } catch (error) {
            return undefined;
        }
    }
};

// --- ACTIVE SESSION ---
// Active session is ALWAYS local (IndexedDB) for performance and offline stability during games.
export const saveActiveSessionToDB = async (session: Session | null) => {
    try {
        if (session) {
            await set('activeSession', session);
        } else {
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
    // Mode 1: Cloud
    if (isSupabaseConfigured()) {
        try {
            const { error } = await supabase!
                .from('sessions')
                .upsert(history, { onConflict: 'id' });
            if (error) throw error;
        } catch (error) {
            console.error("Supabase Save History Error:", error);
        }
    } 
    // Mode 2: Local Fallback
    else {
        try {
            await set('history', history);
        } catch (error) {
            // Silent
        }
    }
};

export const loadHistoryFromDB = async (): Promise<Session[] | undefined> => {
    // Mode 1: Cloud
    if (isSupabaseConfigured()) {
        try {
            const { data, error } = await supabase!
                .from('sessions')
                .select('*')
                .order('createdAt', { ascending: false });
            if (error) throw error;
            return data as Session[];
        } catch (error) {
            return await get('history');
        }
    } 
    // Mode 2: Local Fallback
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
    // Mode 1: Cloud
    if (isSupabaseConfigured()) {
        try {
            const { error } = await supabase!
                .from('news')
                .upsert(news, { onConflict: 'id' });
            if (error) throw error;
        } catch (error) {
            console.error("Supabase Save News Error:", error);
        }
    } 
    // Mode 2: Local Fallback
    else {
        try {
            await set('newsFeed', news);
        } catch (error) {
            // Silent
        }
    }
};

export const loadNewsFromDB = async (): Promise<NewsItem[] | undefined> => {
    // Mode 1: Cloud
    if (isSupabaseConfigured()) {
        try {
            const { data, error } = await supabase!
                .from('news')
                .select('*')
                .order('timestamp', { ascending: false });
            if (error) throw error;
            return data as NewsItem[];
        } catch (error) {
            return await get('newsFeed');
        }
    } 
    // Mode 2: Local Fallback
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