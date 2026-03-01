import React, { useState, useEffect, useMemo } from 'react';
import { Users, MapPinIcon } from '../icons';
import { MessageCircle, X, Settings, History } from 'lucide-react';
import { Icon } from '@iconify/react';
import { loadNextGame } from '../db';
import { GameData } from '../types';
import { useApp } from '../context';
import { calculateAllStats, PlayerStats } from '../services/statistics';
import { convertCountryCodeAlpha3ToAlpha2 } from '../utils/countries';

// --- HELPERS ---
const getImpactScore = (stats: PlayerStats): number => {
    let score = 0;
    const nonCleanSheetWins = stats.wins - (stats.cleanSheetWins || 0);
    score += nonCleanSheetWins * 1.0;
    score += (stats.cleanSheetWins || 0) * 1.5;
    score += stats.draws * 0.5;
    score += stats.goals * 1.0;
    score += stats.assists * 1.0;
    score -= stats.ownGoals * 1.0;
    return score;
};

// --- ICONS MAPPING ---
// Using our existing SVG icons to match the requested design
const BellIcon = ({ className }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" /></svg>
);
const FeedIcon = ({ className }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><rect width="7" height="9" x="3" y="3" rx="1" /><rect width="7" height="5" x="14" y="3" rx="1" /><rect width="7" height="9" x="14" y="12" rx="1" /><rect width="7" height="5" x="3" y="16" rx="1" /></svg>
);

// --- ICONS (Embedded for reliability) ---
const HomeIcon = ({ active }: { active: boolean }) => (
    active ? (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path fill="currentColor" fillRule="evenodd" d="M2.52 7.823C2 8.77 2 9.915 2 12.203v1.522c0 3.9 0 5.851 1.172 7.063S6.229 22 10 22h4c3.771 0 5.657 0 6.828-1.212S22 17.626 22 13.725v-1.521c0-2.289 0-3.433-.52-4.381c-.518-.949-1.467-1.537-3.364-2.715l-2-1.241C14.111 2.622 13.108 2 12 2s-2.11.622-4.116 1.867l-2 1.241C3.987 6.286 3.038 6.874 2.519 7.823M11.25 18a.75.75 0 0 0 1.5 0v-3a.75.75 0 0 0-1.5 0z" clipRule="evenodd"/></svg>
    ) : (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M2 12.204c0-2.289 0-3.433.52-4.381c.518-.949 1.467-1.537 3.364-2.715l2-1.241C9.889 2.622 10.892 2 12 2s2.11.622 4.116 1.867l2 1.241c1.897 1.178 2.846 1.766 3.365 2.715S22 9.915 22 12.203v1.522c0 3.9 0 5.851-1.172 7.063S17.771 22 14 22h-4c-3.771 0-5.657 0-6.828-1.212S2 17.626 2 13.725z"/><path strokeLinecap="round" d="M12 15v3"/></g></svg>
    )
);

const StatsIcon = ({ active }: { active: boolean }) => (
    active ? (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path fill="currentColor" d="M17.293 2.293C17 2.586 17 3.057 17 4v13c0 .943 0 1.414.293 1.707S18.057 19 19 19s1.414 0 1.707-.293S21 17.943 21 17V4c0-.943 0-1.414-.293-1.707S19.943 2 19 2s-1.414 0-1.707.293M10 7c0-.943 0-1.414.293-1.707S11.057 5 12 5s1.414 0 1.707.293S14 6.057 14 7v10c0 .943 0 1.414-.293 1.707S12.943 19 12 19s-1.414 0-1.707-.293S10 17.943 10 17zM3.293 9.293C3 9.586 3 10.057 3 11v6c0 .943 0 1.414.293 1.707S4.057 19 5 19s1.414 0 1.707-.293S7 17.943 7 17v-6c0-.943 0-1.414-.293-1.707S5.943 9 5 9s-1.414 0-1.707.293M3 21.25a.75.75 0 0 0 0 1.5h18a.75.75 0 0 0 0-1.5z"/></svg>
    ) : (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M3 22h18"/><path d="M3 11c0-.943 0-1.414.293-1.707S4.057 9 5 9s1.414 0 1.707.293S7 10.057 7 11v6c0 .943 0 1.414-.293 1.707S5.943 19 5 19s-1.414 0-1.707-.293S3 17.943 3 17zm7-4c0-.943 0-1.414.293-1.707S11.057 5 12 5s1.414 0 1.707.293S14 6.057 14 7v10c0 .943 0 1.414-.293 1.707S12.943 19 12 19s-1.414 0-1.707-.293S10 17.943 10 17zm7-3c0-.943 0-1.414.293-1.707S18.057 2 19 2s1.414 0 1.707.293S21 3.057 21 4v13c0 .943 0 1.414-.293 1.707S19.943 19 19 19s-1.414 0-1.707-.293S17 17.943 17 17z"/></g></svg>
    )
);

const HistoryIcon = ({ active }: { active: boolean }) => (
    active ? (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path fill="currentColor" fillRule="evenodd" d="M5.079 5.069c3.795-3.79 9.965-3.75 13.783.069c3.82 3.82 3.86 9.993.064 13.788s-9.968 3.756-13.788-.064a9.81 9.81 0 0 1-2.798-8.28a.75.75 0 1 1 1.487.203a8.31 8.31 0 0 0 2.371 7.017c3.245 3.244 8.468 3.263 11.668.064c3.199-3.2 3.18-8.423-.064-11.668c-3.243-3.242-8.463-3.263-11.663-.068l.748.003a.75.75 0 1 1-.007 1.5l-2.546-.012a.75.75 0 0 1-.746-.747L3.575 4.33a.75.75 0 1 1 1.5-.008zm6.92 2.18a.75.75 0 0 1 .75.75v3.69l2.281 2.28a.75.75 0 1 1-1.06 1.061l-2.72-2.72V8a.75.75 0 0 1 .75-.75" clipRule="evenodd"/></svg>
    ) : (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><g fill="none"><path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 8v4l2.5 2.5"/><path fill="currentColor" d="m5.604 5.604l-.53-.53zM4.338 6.871l-.75.003a.75.75 0 0 0 .746.747zm2.542.762a.75.75 0 1 0 .007-1.5zM5.075 4.321a.75.75 0 1 0-1.5.008zm-1.248 6.464a.75.75 0 1 0-1.486-.204zm15.035-5.647c-3.82-3.82-9.993-3.86-13.788-.064l1.06 1.06c3.2-3.199 8.423-3.18 11.668.064zM5.138 18.862c3.82 3.82 9.993 3.86 13.788.064l-1.06-1.06c-3.2 3.199-8.423 3.18-11.668-.064zm13.788.064c3.795-3.795 3.756-9.968-.064-13.788l-1.06 1.06c3.244 3.245 3.263 8.468.064 11.668zM5.074 5.074L3.807 6.34L4.868 7.4l1.266-1.266zm-.74 2.547l2.546.012l.007-1.5l-2.545-.012zm.754-.754L5.075 4.32l-1.5.008l.013 2.545zM2.34 10.58a9.81 9.81 0 0 0 2.797 8.281l1.06-1.06a8.31 8.31 0 0 1-2.371-7.017z"/></g></svg>
    )
);

const PlayersIcon = ({ active }: { active: boolean }) => (
    active ? (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path fill="currentColor" d="M15.5 7.5a3.5 3.5 0 1 1-7 0a3.5 3.5 0 0 1 7 0m2.5 9c0 1.933-2.686 3.5-6 3.5s-6-1.567-6-3.5S8.686 13 12 13s6 1.567 6 3.5M7.122 5q.267 0 .518.05A5 5 0 0 0 7 7.5c0 .868.221 1.685.61 2.396q-.237.045-.488.045c-1.414 0-2.561-1.106-2.561-2.47S5.708 5 7.122 5M5.447 18.986C4.88 18.307 4.5 17.474 4.5 16.5c0-.944.357-1.756.896-2.423C3.49 14.225 2 15.267 2 16.529c0 1.275 1.517 2.325 3.447 2.457M17 7.5c0 .868-.221 1.685-.61 2.396q.236.045.488.045c1.414 0 2.56-1.106 2.56-2.47S18.293 5 16.879 5q-.267 0-.518.05c.407.724.64 1.56.64 2.45m1.552 11.486c1.93-.132 3.447-1.182 3.447-2.457c0-1.263-1.491-2.304-3.396-2.452c.54.667.896 1.479.896 2.423c0 .974-.38 1.807-.947 2.486"/></svg>
    ) : (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="6" r="4"/><path strokeLinecap="round" d="M18 9c1.657 0 3-1.12 3-2.5S19.657 4 18 4M6 9C4.343 9 3 7.88 3 6.5S4.343 4 6 4"/><ellipse cx="12" cy="17" rx="6" ry="4"/><path strokeLinecap="round" d="M20 19c1.754-.385 3-1.359 3-2.5s-1.246-2.115-3-2.5M4 19c-1.754-.385-3-1.359-3-2.5s1.246-2.115 3-2.5"/></g></svg>
    )
);

// --- TABS ---

const MobileHomeTab: React.FC<{ nextGame: GameData | null, onOpenDashboard: () => void }> = ({ nextGame, onOpenDashboard }) => {
    // Helper to format date nicely
    const formatDate = (dateStr: string) => {
        if (!dateStr) return { day: '?', month: 'TBD', weekday: 'TBD' };
        // Use T12:00:00 to avoid timezone shifts when parsing YYYY-MM-DD
        const d = new Date(dateStr.includes('T') ? dateStr : `${dateStr}T12:00:00`);
        const day = d.toLocaleDateString('en-GB', { day: 'numeric' });
        const month = d.toLocaleDateString('en-GB', { month: 'short' }).toUpperCase();
        const weekday = d.toLocaleDateString('en-GB', { weekday: 'long' });
        return { day, month, weekday };
    };

    return (
    <div className="px-4 py-4 space-y-6 animate-in fade-in duration-500">
        {/* Next Game Section */}
        <section className="mb-8">
            <div className="flex items-center justify-between mb-4">
                <h2 className="font-russo text-sm font-bold text-[#8b949e] uppercase tracking-widest flex items-center gap-2">
                    <Icon icon="solar:football-linear" className="w-4 h-4" /> Next Game
                </h2>
            </div>
            
            {nextGame ? (
                <div className="relative overflow-hidden rounded-2xl border border-[#00F2FE]/30 bg-[#00F2FE]/10 p-0 flex flex-col shadow-lg">
                    
                    <div className="p-3 flex flex-col">
                        {/* Top Row: Date & Format/Price */}
                        <div className="relative z-10 flex justify-between items-center mb-2.5">
                            <div className="flex items-center gap-3">
                                <div className="flex flex-col">
                                    <span className="text-[10px] font-bold text-[#8b949e] uppercase tracking-widest leading-none mb-1.5">
                                        {formatDate(nextGame.date).weekday}, {formatDate(nextGame.date).day} {formatDate(nextGame.date).month}
                                    </span>
                                    <div className="flex items-baseline gap-1.5">
                                        <span className="font-russo text-[20px] font-black text-white/80 tracking-tighter leading-none">
                                            {nextGame.startTime || '19:30'}
                                        </span>
                                        <span className="text-[#00F2FE]/40 font-bold text-xs">-</span>
                                        <span className="font-russo text-[20px] font-black text-white/80 tracking-tighter leading-none">
                                            {nextGame.endTime || '21:30'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <div className="text-right flex flex-col items-end">
                                <div className="bg-[#00F2FE]/20 border border-[#00F2FE]/30 px-1.5 py-0 rounded mb-2">
                                    <span className="font-russo text-[16px] font-black text-white tracking-tight leading-none">
                                        {nextGame.price ? `${nextGame.price}k` : 'FREE'}
                                    </span>
                                </div>
                                <span className="font-russo text-[10px] font-bold text-white/40 uppercase tracking-wider">
                                    {nextGame.format} • {nextGame.teams || 3} TEAMS
                                </span>
                            </div>
                        </div>

                        {/* Location Strip */}
                        <a 
                            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(nextGame.location || '')}`} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="relative z-10 flex items-center gap-2 mb-2.5 p-1.5 bg-[#0a0c10]/50 rounded-xl border border-white/5 group transition-all hover:border-[#00F2FE]/30"
                        >
                            <div className="w-6 h-6 rounded-full bg-[#00F2FE]/10 flex items-center justify-center border border-[#00F2FE]/20 text-[#00F2FE] shrink-0 group-hover:bg-[#00F2FE] group-hover:text-black transition-all">
                                <MapPinIcon className="w-3 h-3" />
                            </div>
                            <div className="flex flex-col overflow-hidden">
                                <span className="text-[7px] font-bold text-[#8b949e] uppercase tracking-widest leading-none mb-0.5">Match Location</span>
                                <span className="font-russo text-[9px] font-bold text-white truncate uppercase tracking-wide">
                                    {nextGame.location || 'Sân bóng đá Phan Tứ'}
                                </span>
                            </div>
                            <div className="ml-auto">
                                <Icon icon="solar:alt-arrow-right-linear" className="w-3 h-3 text-[#00F2FE] opacity-40 group-hover:opacity-100 transition-opacity" />
                            </div>
                        </a>

                        {/* Registration Progress */}
                        <div className="relative z-10 w-full mb-4 px-1">
                            <div className="flex justify-between items-end mb-1">
                                <div className="flex flex-col">
                                    <span className="text-[7px] font-black text-white uppercase tracking-widest leading-none mb-0.5">Squad Status</span>
                                    <span className="text-[7px] font-bold text-[#00F2FE] uppercase tracking-wider">
                                        {nextGame.maxPlayers} Players Max
                                    </span>
                                </div>
                                <div className="text-right">
                                    <span className="font-russo text-[12px] font-black text-white leading-none">0</span>
                                    <span className="text-[8px] font-bold text-white/30 mx-1">/</span>
                                    <span className="font-russo text-[12px] font-black text-white/30 leading-none">{nextGame.maxPlayers}</span>
                                </div>
                            </div>
                            <div className="h-1 w-full bg-[#0a0c10] rounded-full border border-white/5 relative overflow-hidden">
                                <div 
                                    className="absolute top-0 left-0 h-full bg-gradient-to-r from-[#00F2FE] to-[#083344] rounded-full shadow-[0_0_10px_rgba(0,242,254,0.4)]" 
                                    style={{ width: '0%' }}
                                >
                                </div>
                            </div>
                        </div>
                        
                        {/* Action Button */}
                        <button 
                            className="relative z-10 w-full py-2.5 rounded-xl text-white font-russo font-bold text-[10px] uppercase tracking-[0.2em] transition-all flex items-center justify-center active:scale-[0.97] shadow-[0_5px_15px_rgba(0,0,0,0.3)]"
                            style={{ background: 'linear-gradient(180deg, #48CFCB 0%, #083344 100%)' }}
                        >
                            Join the Game
                        </button>
                    </div>
                </div>
            ) : (
                <div className="relative overflow-hidden rounded-xl border border-white/5 bg-[#0a0c10] p-6 flex flex-col items-center justify-center text-center shadow-inner">
                    <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mb-3">
                        <svg className="w-6 h-6 text-white/20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                    </div>
                    <span className="text-white/40 font-russo text-sm uppercase tracking-widest mb-1">No Upcoming Events</span>
                    <span className="text-white/20 font-mono text-[10px] uppercase tracking-wider">Stay tuned for the next match</span>
                </div>
            )}
        </section>

        {/* Dashboard Section */}
        <section className="mb-8">
            <h2 className="font-russo text-sm font-bold text-[#8b949e] uppercase tracking-widest mb-4 flex items-center gap-2">
                <Icon icon="solar:widget-linear" className="w-4 h-4" /> Dashboard
            </h2>
            <div className="space-y-4">
                <article 
                    onClick={onOpenDashboard}
                    className="group relative h-48 rounded-xl overflow-hidden border border-[#2a2f42] hover:border-[#00F2FE]/50 transition-colors cursor-pointer active:scale-[0.98]"
                >
                    <img
                        src="https://ggrhecslgdflloszjkwl.supabase.co/storage/v1/object/public/user-assets/ChWHta7Eq1o/components/Ct3NH7IlHHa.png"
                        alt="New Gear"
                        loading="lazy"
                        referrerPolicy="no-referrer"
                        className="absolute inset-0 w-full h-full object-cover opacity-70 group-hover:opacity-90 transition-opacity duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0a0c10] via-[#0a0c10]/60 to-transparent"></div>
                    <div className="absolute inset-x-0 bottom-0 p-4">
                        <div className="flex items-center gap-2 mb-2">
                            <span className="text-xs font-mono font-bold px-2 py-0.5 rounded text-[#00F2FE] bg-[#00F2FE]/10 border border-[#00F2FE]/20">
                                RESULTS
                            </span>
                            <span className="text-[10px] text-[#8b949e] font-mono">5 HRS AGO</span>
                        </div>
                        <h3 className="font-russo text-lg font-bold uppercase leading-tight text-white group-hover:text-[#00F2FE] transition-colors shadow-black drop-shadow-md">
                            Latest Session Results
                        </h3>
                    </div>
                </article>
            </div>
        </section>

        {/* News Section */}
        <section>
            <h2 className="font-russo text-sm font-bold text-[#8b949e] uppercase tracking-widest mb-4 flex items-center gap-2">
                <Icon icon="solar:notes-linear" className="w-4 h-4" /> News
            </h2>
            <div className="space-y-4">
                <article className="group relative h-48 rounded-xl overflow-hidden border border-[#2a2f42] hover:border-[#00F2FE]/50 transition-colors cursor-pointer">
                    <img
                        src="https://picsum.photos/seed/press/800/400"
                        alt="Club News"
                        loading="lazy"
                        referrerPolicy="no-referrer"
                        className="absolute inset-0 w-full h-full object-cover opacity-70 group-hover:opacity-90 transition-opacity duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0a0c10] via-[#0a0c10]/60 to-transparent"></div>
                    <div className="absolute inset-x-0 bottom-0 p-4">
                        <div className="flex items-center gap-2 mb-2">
                            <span className="text-xs font-mono font-bold px-2 py-0.5 rounded text-[#00F2FE] bg-[#00F2FE]/10 border border-[#00F2FE]/20">
                                CLUB NEWS
                            </span>
                            <span className="text-[10px] text-[#8b949e] font-mono">1 DAY AGO</span>
                        </div>
                        <h3 className="font-russo text-lg font-bold uppercase leading-tight text-white group-hover:text-[#00F2FE] transition-colors shadow-black drop-shadow-md">
                            Community Tournament Announced
                        </h3>
                    </div>
                </article>
            </div>
        </section>
    </div>
    );
};

const thStandings = "py-2 text-[#8b949e] uppercase tracking-widest text-[7px] font-bold text-center sticky top-0 z-20";

const SubtleDashboardAvatar: React.FC<{ team: any; size?: string; isLight?: boolean; customEmblem?: string }> = ({ team, customEmblem }) => {
    const color = team?.color || '#A9B1BD';
    const logo = customEmblem || team?.logo;
    return (
        <div className="relative flex items-center justify-center shrink-0">
            <div className="w-[24px] h-[24px] rounded-full flex items-center justify-center overflow-hidden">
                {logo ? (
                    <img src={logo} className="w-full h-full object-cover" alt="" />
                ) : (
                    <svg className="w-[70%] h-[70%]" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M20.38 3.46L16 2a4 4 0 0 0-8 0L3.62 3.46a2 2 0 0 0-1.34 2.23l.58 3.47a1 1 0 0 0 .99 .84H6v10c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V10h2.15a1 1 0 0 0 .99-.84l.58-3.47a2 2 0 0 0-1.34-2.23z" fill={color} fillOpacity="0.35" stroke={color} strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                )}
            </div>
        </div>
    );
};

const MobileDashboardDetail: React.FC<{ onBack: () => void }> = ({ onBack }) => {
    // DEMO DATA FOR PREVIEW
    const customTeamEmblems: Record<string, string> = {};
    
    // Mock Players
    const displayPlayers = [
        {
            rank: 2,
            stat: {
                player: { id: 'p2', nickname: 'BLAZE', rating: 88, countryCode: 'USA', playerCard: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400&h=600&fit=crop' } as any,
                wins: 4, cleanSheetWins: 2, draws: 0, goals: 3, assists: 2, ownGoals: 0
            } as any
        },
        {
            rank: 1,
            stat: {
                player: { id: 'p1', nickname: 'STORM', rating: 92, countryCode: 'UKR', playerCard: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&h=600&fit=crop' } as any,
                wins: 5, cleanSheetWins: 3, draws: 0, goals: 5, assists: 3, ownGoals: 0
            } as any
        },
        {
            rank: 3,
            stat: {
                player: { id: 'p3', nickname: 'FROST', rating: 85, countryCode: 'VNM', playerCard: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=600&fit=crop' } as any,
                wins: 3, cleanSheetWins: 1, draws: 0, goals: 2, assists: 4, ownGoals: 0
            } as any
        }
    ];

    // Mock Standings
    const sortedStandings = [
        { team: { id: 't1', color: '#FF851B', logo: null } as any, gamesPlayed: 5, wins: 4, draws: 0, losses: 1, goalsFor: 12, goalsAgainst: 4, goalDifference: 8, points: 12 },
        { team: { id: 't2', color: '#0074D9', logo: null } as any, gamesPlayed: 5, wins: 3, draws: 0, losses: 2, goalsFor: 9, goalsAgainst: 7, goalDifference: 2, points: 9 },
        { team: { id: 't3', color: '#2ECC40', logo: null } as any, gamesPlayed: 5, wins: 2, draws: 0, losses: 3, goalsFor: 6, goalsAgainst: 9, goalDifference: -3, points: 6 },
        { team: { id: 't4', color: '#FF4136', logo: null } as any, gamesPlayed: 5, wins: 1, draws: 0, losses: 4, goalsFor: 3, goalsAgainst: 10, goalDifference: -7, points: 3 },
    ];

    const [statsTab, setStatsTab] = useState<'players' | 'games'>('players');
    const [expandedMatchId, setExpandedMatchId] = useState<string | null>(null);

    // Mock Players Stats
    const allPlayersStats = [
        { player: { id: 'p1', nickname: 'STORM', rating: 92 }, goals: 5, assists: 3 },
        { player: { id: 'p2', nickname: 'BLAZE', rating: 88 }, goals: 3, assists: 2 },
        { player: { id: 'p3', nickname: 'FROST', rating: 85 }, goals: 2, assists: 4 },
        { player: { id: 'p4', nickname: 'VIPER', rating: 82 }, goals: 1, assists: 1 },
        { player: { id: 'p5', nickname: 'SHADOW', rating: 80 }, goals: 0, assists: 2 },
    ];

    // Mock Games
    const finishedGames = [
        { id: 'g1', gameNumber: 1, team1Id: 't1', team2Id: 't2', team1Score: 3, team2Score: 1, goals: [] },
        { id: 'g2', gameNumber: 2, team1Id: 't3', team2Id: 't4', team1Score: 2, team2Score: 2, goals: [] },
        { id: 'g3', gameNumber: 3, team1Id: 't1', team2Id: 't3', team1Score: 4, team2Score: 0, goals: [] },
    ];

    const dateStr = "28 FEB 2026";

    /* REAL DATA LOGIC (Commented out for Demo)
    const { currentSession, customTeamEmblems } = useApp();
    
    const { teamStats, allPlayersStats } = useMemo(() => {
        return currentSession ? calculateAllStats(currentSession) : { teamStats: [], allPlayersStats: [] };
    }, [currentSession]);

    const topPlayers = useMemo(() => {
        return [...allPlayersStats]
            .sort((a, b) => getImpactScore(b) - getImpactScore(a))
            .slice(0, 3)
            .map((stat, index) => {
                return { stat, rank: index + 1 };
            });
    }, [allPlayersStats]);

    const displayPlayers = useMemo(() => {
        if (topPlayers.length < 3) return [];
        const p1 = topPlayers.find(p => p.rank === 1);
        const p2 = topPlayers.find(p => p.rank === 2);
        const p3 = topPlayers.find(p => p.rank === 3);
        return [p2, p1, p3].filter(Boolean) as { stat: PlayerStats, rank: number }[];
    }, [topPlayers]);

    const sortedStandings = useMemo(() => {
        return [...teamStats].sort((a, b) => {
            if (b.points !== a.points) return b.points - a.points;
            if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
            return b.goalsFor - a.goalsFor;
        });
    }, [teamStats]);

    const sessionDate = currentSession ? new Date(currentSession.date) : new Date();
    const dateStr = sessionDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).toUpperCase();
    */

    return (
        <div className="flex flex-col min-h-full animate-in slide-in-from-right duration-300 relative">
            {/* Full Screen Background - Dark (No Dots, No Glow) */}
            <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden bg-[#0a0c10]"></div>

            {/* Header */}
            <div className="px-4 py-2 flex items-center justify-center relative z-10 h-20 overflow-hidden shrink-0">
                {/* Header Background */}
                <div className="absolute inset-0 bg-[#0a0c10]/0 backdrop-blur-[1px]"></div>
                
                <div className="flex flex-col items-center relative z-20">
                    <span className="text-[8px] font-bold text-[#8b949e] uppercase tracking-[0.2em] leading-none mb-1">SESSION DATE</span>
                    <h2 className="font-russo text-xs font-bold text-white uppercase tracking-widest leading-none">{dateStr}</h2>
                </div>
            </div>

            {/* Content Area */}
            <div className="p-4 space-y-8">
                {/* Session Leaders Section */}
                <div className="relative">
                    <div className="flex justify-center mb-4">
                        <span className="text-[9px] font-russo font-bold text-[#8b949e] uppercase tracking-[0.2em]">Session Leaders</span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 items-end">
                        {displayPlayers.length > 0 ? displayPlayers.map(({ stat, rank }, i) => {
                            const player = stat.player;
                            const impact = getImpactScore(stat);
                            const countryCode = player.countryCode ? convertCountryCodeAlpha3ToAlpha2(player.countryCode) : 'un';
                            
                            return (
                                <div 
                                    key={player.id} 
                                    className={`flex flex-col gap-2 transition-transform duration-500 ${rank !== 1 ? 'translate-y-2' : '-translate-y-1'}`}
                                >
                                    <div className="relative aspect-[3/4.5] rounded-lg overflow-hidden border bg-[#161922] shadow-2xl border-white/10">
                                        {player.playerCard ? (
                                            <img 
                                                src={player.playerCard} 
                                                alt={player.nickname}
                                                className="w-full h-full object-cover opacity-70"
                                                referrerPolicy="no-referrer"
                                            />
                                        ) : (
                                            <div className="w-full h-full bg-gradient-to-b from-slate-700 to-slate-900 opacity-70" />
                                        )}
                                        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />
                                        
                                        {/* Top Left: Flag (Rectangular) */}
                                        <div className="absolute top-1.5 left-1.5 z-10">
                                            <img 
                                                src={`https://flagcdn.com/w40/${countryCode?.toLowerCase()}.png`}
                                                alt={countryCode || ''}
                                                className="w-3 h-2 object-cover rounded-[1px] shadow-sm opacity-90"
                                            />
                                        </div>

                                        {/* Top Right: Rating + OVR (No Arrow) */}
                                        <div className="absolute top-1.5 right-1.5 z-10 flex flex-col items-center">
                                            <span className="font-russo text-sm font-black text-[#00F2FE] leading-none drop-shadow-md">{player.rating}</span>
                                            <span className="text-[5px] font-bold text-white uppercase tracking-widest leading-none mt-0.5 drop-shadow-md">OVR</span>
                                        </div>

                                        {/* Bottom Center: Name */}
                                        <div className="absolute bottom-2 left-0 right-0 flex justify-center px-1 z-10">
                                            <span className="font-russo text-[9px] text-white uppercase tracking-tighter leading-none truncate drop-shadow-md">
                                                {player.nickname}
                                            </span>
                                        </div>
                                    </div>
                                    
                                    {/* Impact score under the card */}
                                    <div className="flex flex-col items-center bg-[#161922] rounded-md py-1 border border-white/5">
                                        <span className="text-[6px] font-bold text-[#8b949e] uppercase tracking-widest leading-none mb-0.5">IMPACT</span>
                                        <span className="font-russo text-[10px] font-black text-[#00C2CE] leading-none">{impact.toFixed(1)}</span>
                                    </div>
                                </div>
                            );
                        }) : (
                            <div className="col-span-3 text-center py-8 text-white/20 text-xs uppercase tracking-widest">No Data Available</div>
                        )}
                    </div>
                </div>

                {/* Team Standings Section */}
                <div className="relative">
                    <div className="flex justify-center mb-4">
                        <span className="text-[9px] font-russo font-bold text-[#8b949e] uppercase tracking-[0.2em]">Team Standings</span>
                    </div>

                    <div className="relative rounded-xl overflow-hidden border border-white/5 bg-[#0a0c10]">
                        <div className="overflow-x-auto">
                            <table className="w-full table-fixed border-collapse min-w-[300px]">
                                <thead>
                                    <tr className="border-b border-white/5 bg-white/[0.02]">
                                        <th className={`${thStandings} w-[10%]`}>#</th>
                                        <th className={`${thStandings} w-[30%]`}>TEAM</th>
                                        <th className={`${thStandings} w-[10%]`}>P</th>
                                        <th className={`${thStandings} w-[10%]`}>W</th>
                                        <th className={`${thStandings} w-[10%]`}>D</th>
                                        <th className={`${thStandings} w-[10%]`}>L</th>
                                        <th className={`${thStandings} w-[10%]`}>GD</th>
                                        <th className={`${thStandings} w-[15%] text-white`}>PTS</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {sortedStandings.map((stat, idx) => (
                                        <tr key={stat.team.id} className="group border-b border-white/5 last:border-0 transition-all duration-200 hover:bg-white/[0.05]">
                                            <td className="py-1.5 text-center">
                                                <span className="font-russo text-[10px] text-white/50 group-hover:text-white transition-colors">
                                                    {idx + 1}
                                                </span>
                                            </td>
                                            <td className="py-0 flex justify-center items-center h-full pt-1.5">
                                                <SubtleDashboardAvatar team={stat.team} size="xxs" isLight customEmblem={customTeamEmblems[stat.team.color || '']} />
                                            </td>
                                            <td className="py-1.5 text-center text-[9px] font-bold text-white/40 group-hover:text-white/70 transition-colors">{stat.gamesPlayed}</td>
                                            <td className="py-1.5 text-center text-[9px] font-bold text-white/60">{stat.wins}</td>
                                            <td className="py-1.5 text-center text-[9px] font-bold text-white/40">{stat.draws}</td>
                                            <td className="py-1.5 text-center text-[9px] font-bold text-white/40">{stat.losses}</td>
                                            <td className="py-1.5 text-center text-[9px] font-bold text-white/60">
                                                {stat.goalDifference > 0 ? `+${stat.goalDifference}` : stat.goalDifference}
                                            </td>
                                            <td className="py-1.5 text-center">
                                                <div className="font-russo text-xs text-white drop-shadow-md group-hover:scale-105 transition-transform duration-200">
                                                    {stat.points}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    {sortedStandings.length === 0 && (
                                        <tr><td colSpan={8} className="text-center py-6 text-white/20 text-[10px] uppercase tracking-widest">No Standings Data</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {/* Player Statistics & Game History Section */}
                <div className="relative rounded-xl overflow-hidden border border-white/5 bg-[#0a0c10]">
                    {/* Header with Tabs */}
                    <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 bg-white/[0.02]">
                        <div className="flex items-center gap-2">
                            {statsTab === 'players' ? <Users className="w-3 h-3 text-[#00F2FE]" /> : <History className="w-3 h-3 text-[#00F2FE]" />}
                            <h3 className="font-russo text-[10px] uppercase tracking-widest text-white">
                                {statsTab === 'players' ? 'Player Statistics' : 'Game History'}
                            </h3>
                        </div>
                        <div className="flex items-center gap-3">
                            <button 
                                onClick={() => setStatsTab('players')} 
                                className={`font-russo text-[9px] uppercase tracking-widest transition-colors ${statsTab === 'players' ? 'text-[#00F2FE]' : 'text-white/20 hover:text-white/50'}`}
                            >
                                Players
                            </button>
                            <div className="w-px h-3 bg-white/10"></div>
                            <button 
                                onClick={() => setStatsTab('games')} 
                                className={`font-russo text-[9px] uppercase tracking-widest transition-colors ${statsTab === 'games' ? 'text-[#00F2FE]' : 'text-white/20 hover:text-white/50'}`}
                            >
                                Matches
                            </button>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="overflow-x-auto">
                        {statsTab === 'players' ? (
                            <table className="w-full table-fixed border-collapse min-w-[300px]">
                                <thead>
                                    <tr className="border-b border-white/5 bg-white/[0.02]">
                                        <th className={`${thStandings} w-[10%]`}>#</th>
                                        <th className={`${thStandings} text-left pl-3 w-[50%]`}>PLAYER</th>
                                        <th className={`${thStandings} w-[15%]`}>G</th>
                                        <th className={`${thStandings} w-[15%]`}>A</th>
                                        <th className={`${thStandings} w-[10%] text-white`}>TOT</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {allPlayersStats.map((stat, idx) => (
                                        <tr key={stat.player.id} className="group border-b border-white/5 last:border-0 transition-all duration-200 hover:bg-white/[0.05]">
                                            <td className="py-2 text-center text-[9px] font-bold text-white/30 bg-white/[0.02] relative overflow-hidden">{idx + 1}</td>
                                            <td className="py-2 text-left pl-3 relative overflow-hidden">
                                                <span className="text-slate-300 font-bold uppercase truncate text-[10px] block w-full transition-colors group-hover:text-white">
                                                    {stat.player.nickname}
                                                </span>
                                            </td>
                                            <td className="py-2 text-center text-[10px] font-bold text-white/70 font-mono">{stat.goals}</td>
                                            <td className="py-2 text-center text-[10px] font-bold text-white/70 font-mono">{stat.assists}</td>
                                            <td className="py-2 text-center text-[11px] font-black text-white bg-white/[0.03]">{stat.goals + stat.assists}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        ) : (
                            <table className="w-full table-fixed border-collapse min-w-[300px]">
                                <thead>
                                    <tr className="border-b border-white/5 bg-white/[0.02]">
                                        <th className={`${thStandings} w-[15%]`}>#</th>
                                        <th className={`${thStandings} w-[25%] text-center`}>HOME</th>
                                        <th className={`${thStandings} w-[35%] text-center`}>RESULT</th>
                                        <th className={`${thStandings} w-[25%] text-center`}>AWAY</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {finishedGames.map((game) => {
                                        const totalScore = game.team1Score + game.team2Score;
                                        return (
                                            <React.Fragment key={game.id}>
                                                <tr 
                                                    className={`group border-b border-white/5 last:border-0 transition-all duration-200 ${totalScore > 0 ? 'hover:bg-white/[0.04] cursor-pointer' : 'cursor-default'} ${expandedMatchId === game.id ? 'bg-[#00F2FE]/5' : ''}`} 
                                                    onClick={() => (totalScore > 0 && setExpandedMatchId(expandedMatchId === game.id ? null : game.id))}
                                                >
                                                    <td className="py-2 text-center text-[9px] font-mono text-white/30">{game.gameNumber}</td>
                                                    <td className="py-0 text-center">
                                                        <div className="flex justify-center">
                                                            <SubtleDashboardAvatar 
                                                                team={{ id: game.team1Id, color: '#FF851B' }} 
                                                                customEmblem={customTeamEmblems['#FF851B']}
                                                                size="xxs"
                                                            />
                                                        </div>
                                                    </td>
                                                    <td className="py-2 text-center">
                                                        <span className="font-bold text-[10px] text-slate-200 tabular-nums tracking-tighter bg-white/5 px-2 py-0.5 rounded transition-colors group-hover:text-white group-hover:bg-[#00F2FE]/10">
                                                            {game.team1Score} : {game.team2Score}
                                                        </span>
                                                    </td>
                                                    <td className="py-0 text-center">
                                                        <div className="flex justify-center">
                                                            <SubtleDashboardAvatar 
                                                                team={{ id: game.team2Id, color: '#0074D9' }} 
                                                                customEmblem={customTeamEmblems['#0074D9']}
                                                                size="xxs"
                                                            />
                                                        </div>
                                                    </td>
                                                </tr>
                                                {expandedMatchId === game.id && (
                                                    <tr className="bg-white/[0.02] animate-in slide-in-from-top-2 fade-in duration-200">
                                                        <td colSpan={4} className="p-3">
                                                            <div className="text-center py-2">
                                                                <span className="text-[8px] font-black text-white/20 uppercase tracking-[0.3em]">No goal events recorded</span>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                )}
                                            </React.Fragment>
                                        );
                                    })}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>

                {/* Rest of the content will be added later */}
            </div>
        </div>
    );
};

const MobileStatsTab: React.FC = () => (
    <div className="p-6 animate-in fade-in duration-500">
        <h2 className="font-russo text-xl font-bold text-white mb-4">Statistics</h2>
        <div className="space-y-2">
            {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center justify-between bg-[#161922] p-3 rounded-lg border border-[#2a2f42]">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-md bg-[#24283b] flex items-center justify-center text-xs font-bold text-white font-mono border border-[#2a2f42]">
                            #{i}
                        </div>
                        <div>
                            <p className="text-sm font-bold text-white font-russo tracking-wide">PLAYER {i}</p>
                            <p className="text-xs text-[#8b949e] font-mono">OVR: <span className="text-[#00F2FE]">8{i}</span></p>
                        </div>
                    </div>
                    <div className="text-right">
                        <p className="text-sm font-bold text-[#00F2FE] font-mono">{10 - i} G</p>
                    </div>
                </div>
            ))}
        </div>
    </div>
);

const MobileHistoryTab: React.FC = () => (
    <div className="p-6 animate-in fade-in duration-500">
        <h2 className="font-russo text-xl font-bold text-white mb-4">History</h2>
        <div className="rounded-xl border border-[#2a2f42] bg-[#161922] p-6 flex flex-col items-center justify-center text-center">
            <span className="text-[#8b949e] font-mono text-xs uppercase tracking-widest mb-2">No past games</span>
            <span className="text-white/30 text-[10px]">Your match history will appear here</span>
        </div>
    </div>
);

const MobilePlayersTab: React.FC = () => (
    <div className="p-6 flex flex-col items-center animate-in fade-in duration-500">
        <div className="w-24 h-24 rounded-full bg-[#161922] border-2 border-[#00F2FE] mb-4 flex items-center justify-center shadow-[0_0_20px_rgba(0,242,254,0.2)]">
            <Users className="w-10 h-10 text-[#00F2FE]" />
        </div>
        <h2 className="text-2xl font-black text-white uppercase tracking-wider font-russo">Players</h2>
        <p className="text-[#8b949e] text-sm mb-6 font-mono">Select a player to view stats</p>
        
        <button className="w-full py-3 bg-[#24283b] border border-[#2a2f42] text-white font-bold rounded-lg uppercase tracking-wider text-sm mb-3 hover:border-[#00F2FE]/50 transition-colors">
            Select Player
        </button>
    </div>
);

// --- MAIN SCREEN ---

const MobileHeaderAtmosphere: React.FC = () => (
    <div className="absolute top-0 left-0 right-0 h-[600px] pointer-events-none z-0 overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-full opacity-30"
             style={{
                 backgroundImage: 'radial-gradient(rgba(255, 255, 255, 0.2) 1px, transparent 1px)',
                 backgroundSize: '4px 4px',
                 maskImage: 'linear-gradient(to bottom, black 0%, transparent 100%)',
                 WebkitMaskImage: 'linear-gradient(to bottom, black 0%, transparent 100%)'
             }}
        ></div>
    </div>
);

export const MobileHubPreviewScreen: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'home' | 'stats' | 'history' | 'players'>('home');
    const [view, setView] = useState<'tabs' | 'dashboard_detail'>('tabs');
    const [showContactModal, setShowContactModal] = useState(false);
    const [showSettingsMenu, setShowSettingsMenu] = useState(false);
    const [currentLang, setCurrentLang] = useState('EN');
    const [nextGame, setNextGame] = useState<GameData | null>(null);
    const [iconsLoaded, setIconsLoaded] = useState(false);

    useEffect(() => {
        // Force a re-render after a short delay to ensure Iconify icons are loaded
        const timer = setTimeout(() => setIconsLoaded(true), 100);
        return () => clearTimeout(timer);
    }, []);

    useEffect(() => {
        loadNextGame().then((data: GameData | null) => {
            if (data && data.date) {
                // Auto-hide logic: hide if current time is past the end time of the event
                const now = new Date();
                const endDate = new Date(data.date);
                
                if (data.endTime) {
                    const [hours, minutes] = data.endTime.split(':');
                    endDate.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0);
                } else if (data.startTime) {
                    const [hours, minutes] = data.startTime.split(':');
                    endDate.setHours(parseInt(hours, 10) + 2, parseInt(minutes, 10), 0, 0); // fallback: 2 hours after start
                } else {
                    endDate.setHours(23, 59, 59, 999); // fallback: end of the day
                }

                if (now > endDate) {
                    setNextGame(null); // Event has passed
                } else {
                    setNextGame(data);
                }
            } else {
                setNextGame(null);
            }
        });
    }, []);

    // Inject font styles dynamically if needed, though we use our app's fonts (Russo One, Chakra Petch/Inter)
    // to maintain brand consistency while adopting the layout.
    
    const handleTabClick = (tab: 'home' | 'stats' | 'history' | 'players') => {
        setActiveTab(tab);
        setView('tabs');
    };

    return (
        <div className="min-h-screen bg-[#0a0c10] text-white flex flex-col max-w-md mx-auto relative font-sans selection:bg-[#00F2FE]/30">
            
            {/* Header */}
            <header className="sticky top-0 z-50 flex items-center justify-between px-4 pb-8 pt-[calc(env(safe-area-inset-top)+16px)] relative overflow-hidden">
                {/* Base Deep Background */}
                <div className="absolute inset-0 bg-[#0a0c10] z-0"></div>
                
                {/* Soft Iridescent Sheen (Distributed, not spotlight) */}
                <div className="absolute inset-0 z-0 opacity-40" 
                     style={{ 
                         background: 'linear-gradient(120deg, rgba(0, 242, 254, 0.05) 0%, rgba(0, 242, 254, 0.02) 30%, transparent 60%, rgba(0, 242, 254, 0.02) 100%)' 
                     }}>
                </div>
                <div className="absolute inset-0 z-0 opacity-30"
                     style={{
                         background: 'radial-gradient(ellipse 100% 50% at 50% -20%, rgba(0, 242, 254, 0.1), transparent 70%)'
                     }}>
                </div>

                {/* Faint Tech-Grid Texture */}
                <div className="absolute inset-0 z-0 opacity-[0.07]" 
                     style={{ 
                         backgroundImage: 'radial-gradient(#00F2FE 0.5px, transparent 0.5px)', 
                         backgroundSize: '4px 4px' 
                     }}>
                </div>
                
                {/* Fade Mask at Bottom */}
                <div className="absolute bottom-0 left-0 right-0 h-6 bg-gradient-to-t from-[#0a0c10] to-transparent z-10 pointer-events-none"></div>

                <div className="flex items-center gap-1 relative z-20">
                    <span 
                        className="font-russo text-2xl tracking-widest uppercase leading-none" 
                        style={{ 
                            background: 'linear-gradient(180deg, #48CFCB 0%, #083344 100%)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            filter: 'drop-shadow(0px 2px 0px rgba(0,0,0,0.5))'
                        }}
                    >
                        UNIT
                    </span>
                    <span className="font-russo text-lg tracking-widest uppercase leading-none text-transparent bg-clip-text bg-gradient-to-b from-white to-white/20">
                        HUB
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="relative">
                        <button 
                            onClick={() => setShowSettingsMenu(!showSettingsMenu)}
                            className="w-8 h-8 flex items-center justify-center rounded-full border border-white/10 bg-transparent text-[#8b949e] hover:text-[#00F2FE] hover:border-[#00F2FE]/50 transition-colors"
                        >
                            <Settings className="w-4 h-4" />
                        </button>
                        
                        {showSettingsMenu && (
                            <div className="absolute top-full right-0 mt-2 w-48 bg-[#161922] border border-[#2a2f42] rounded-xl shadow-xl overflow-hidden z-50 flex flex-col py-2 animate-in fade-in slide-in-from-top-2 duration-200">
                                <div className="px-4 py-2 border-b border-[#2a2f42]">
                                    <span className="text-[10px] font-bold text-[#8b949e] uppercase tracking-wider mb-2 block">Language</span>
                                    <div className="flex gap-2">
                                        {['EN', 'VN', 'UA'].map(code => (
                                            <button 
                                                key={code}
                                                onClick={() => setCurrentLang(code)}
                                                className={`flex-1 py-1 rounded text-xs font-bold font-mono transition-colors ${currentLang === code ? 'bg-[#00F2FE]/10 text-[#00F2FE] border border-[#00F2FE]/20' : 'bg-[#0a0c10] text-[#8b949e] border border-[#2a2f42] hover:text-white'}`}
                                            >
                                                {code}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <button 
                                    onClick={() => { setShowContactModal(true); setShowSettingsMenu(false); }}
                                    className="w-full px-4 py-3 flex items-center gap-3 text-sm font-bold text-white hover:bg-[#2a2f42]/50 transition-colors text-left"
                                >
                                    <MessageCircle className="w-4 h-4 text-[#8b949e]" />
                                    Support Chat
                                </button>
                                <button 
                                    className="w-full px-4 py-3 flex items-center gap-3 text-sm font-bold text-white hover:bg-[#2a2f42]/50 transition-colors text-left relative"
                                >
                                    <div className="relative">
                                        <BellIcon className="w-4 h-4 text-[#8b949e]" />
                                        <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-[#ff3366]"></span>
                                    </div>
                                    Notifications
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </header>

            {/* Content Area */}
            <main className="flex-grow overflow-y-auto pb-24 no-scrollbar">
                {view === 'dashboard_detail' ? (
                    <MobileDashboardDetail onBack={() => setView('tabs')} />
                ) : (
                    <>
                        {activeTab === 'home' && <MobileHomeTab nextGame={nextGame} onOpenDashboard={() => setView('dashboard_detail')} />}
                        {activeTab === 'stats' && <MobileStatsTab />}
                        {activeTab === 'history' && <MobileHistoryTab />}
                        {activeTab === 'players' && <MobilePlayersTab />}
                    </>
                )}
            </main>

            {/* Bottom Navigation */}
            <nav 
                key={iconsLoaded ? 'icons-ready' : 'icons-loading'}
                className="fixed bottom-0 inset-x-0 z-50 bg-[#0a0c10]/70 backdrop-blur-xl pb-safe pt-1 px-4"
            >
                <div className="flex items-center justify-between max-w-md mx-auto h-14">
                    <button 
                        onClick={() => handleTabClick('home')}
                        className={`flex flex-col items-center justify-center w-14 h-full gap-1.5 relative transition-colors ${activeTab === 'home' ? 'text-[#00C2CE]' : 'text-[#8b949e] hover:text-white'}`}
                    >
                        <div className={`w-5 h-5 ${activeTab === 'home' ? 'drop-shadow-[0_0_4px_rgba(0,194,206,0.3)]' : ''}`}>
                            <HomeIcon active={activeTab === 'home'} />
                        </div>
                        <span className="text-[9px] font-russo font-bold uppercase tracking-wider text-center">Home</span>
                    </button>
                    
                    <button 
                        onClick={() => handleTabClick('stats')}
                        className={`flex flex-col items-center justify-center w-14 h-full gap-1.5 relative transition-colors ${activeTab === 'stats' ? 'text-[#00C2CE]' : 'text-[#8b949e] hover:text-white'}`}
                    >
                        <div className={`w-5 h-5 ${activeTab === 'stats' ? 'drop-shadow-[0_0_4px_rgba(0,194,206,0.3)]' : ''}`}>
                            <StatsIcon active={activeTab === 'stats'} />
                        </div>
                        <span className="text-[9px] font-russo font-bold uppercase tracking-wider text-center">Stats</span>
                    </button>

                    <button 
                        onClick={() => handleTabClick('history')}
                        className={`flex flex-col items-center justify-center w-14 h-full gap-1.5 relative transition-colors ${activeTab === 'history' ? 'text-[#00C2CE]' : 'text-[#8b949e] hover:text-white'}`}
                    >
                        <div className={`w-5 h-5 ${activeTab === 'history' ? 'drop-shadow-[0_0_4px_rgba(0,194,206,0.3)]' : ''}`}>
                            <HistoryIcon active={activeTab === 'history'} />
                        </div>
                        <span className="text-[9px] font-russo font-bold uppercase tracking-wider text-center">History</span>
                    </button>
                    
                    <button 
                        onClick={() => handleTabClick('players')}
                        className={`flex flex-col items-center justify-center w-14 h-full gap-1.5 relative transition-colors ${activeTab === 'players' ? 'text-[#00C2CE]' : 'text-[#8b949e] hover:text-white'}`}
                    >
                        <div className={`w-5 h-5 ${activeTab === 'players' ? 'drop-shadow-[0_0_4px_rgba(0,194,206,0.3)]' : ''}`}>
                            <PlayersIcon active={activeTab === 'players'} />
                        </div>
                        <span className="text-[9px] font-russo font-bold uppercase tracking-wider text-center">Players</span>
                    </button>
                </div>
            </nav>

            {/* Contact Modal */}
            {showContactModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-[#161922] border border-[#2a2f42] rounded-xl w-full max-w-[240px] p-4 pt-8 shadow-[0_0_40px_rgba(0,0,0,0.5)] relative animate-in zoom-in-95 duration-200">
                        <button 
                            onClick={() => setShowContactModal(false)}
                            className="absolute top-2.5 right-2.5 text-[#8b949e] hover:text-white transition-colors"
                        >
                            <X className="w-4 h-4" />
                        </button>
                        
                        <div className="space-y-2.5">
                            <button className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-[#2AABEE]/10 text-[#2AABEE] border border-[#2AABEE]/30 hover:bg-[#2AABEE] hover:text-white transition-all text-sm font-bold tracking-wide">
                                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69.01-.03.01-.14-.06-.2-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z"/></svg>
                                Telegram
                            </button>
                            <button className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-[#25D366]/10 text-[#25D366] border border-[#25D366]/30 hover:bg-[#25D366] hover:text-white transition-all text-sm font-bold tracking-wide">
                                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>
                                WhatsApp
                            </button>
                            <button className="w-full flex items-center justify-center py-2 rounded-lg bg-[#e2e8f0] text-[#0068FF] hover:bg-[#cbd5e1] transition-all text-sm font-bold tracking-wide">
                                Zalo
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

