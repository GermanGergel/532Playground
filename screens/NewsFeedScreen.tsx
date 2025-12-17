
import React, { useEffect } from 'react';
import { Page, PageHeader, useTranslation } from '../ui';
import { NewsItem } from '../types';
import { StarIcon, Zap } from '../icons';
import { useApp } from '../context';

// =========================================================================
// STYLE 1: "CINEMATIC BLUE" (For HOT events, Milestones, Tier Ups)
// =========================================================================
const CinematicNewsCard: React.FC<{ item: NewsItem }> = React.memo(({ item }) => {
    return (
        <div className="mb-4 relative group px-1 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="relative rounded-3xl overflow-hidden bg-[#0a0c10] border border-[#1e293b] shadow-2xl">
                {/* Top Light Source (The Blue Line & Glow) */}
                <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[#00F2FE] to-transparent opacity-80"></div>
                <div className="absolute top-0 left-0 right-0 h-16 bg-gradient-to-b from-[#00F2FE]/10 to-transparent blur-xl"></div>

                <div className="relative p-6 z-10">
                    {/* Header Row: Icon + Type + Time */}
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full border border-[#00F2FE]/30 bg-[#00F2FE]/10 flex items-center justify-center shadow-[0_0_10px_rgba(0,242,254,0.2)]">
                                {item.isHot ? <Zap className="w-4 h-4 text-[#00F2FE]" /> : <StarIcon className="w-4 h-4 text-[#00F2FE]" />}
                            </div>
                            <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#00F2FE] shadow-[0_0_10px_rgba(0,242,254,0.3)]">
                                {item.type.replace('_', ' ')}
                            </span>
                        </div>
                        <span className="text-[9px] font-mono text-[#555] font-bold">
                            {new Date(item.timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}
                        </span>
                    </div>

                    {/* Main Content */}
                    <h3 className="text-xl font-black text-white uppercase tracking-wide leading-none mb-1 drop-shadow-md">
                        {item.playerName}
                    </h3>
                    <p className="text-sm font-medium text-[#94a3b8] leading-snug border-l-2 border-[#00F2FE]/30 pl-3 my-3">
                        {item.message.replace(item.playerName, '')}
                    </p>

                    {/* Footer: Hashtag Button */}
                    <div className="flex justify-end mt-2">
                        <span className="text-[10px] font-mono font-bold text-[#00F2FE] uppercase tracking-wider px-3 py-1 rounded bg-[#00F2FE]/5 border border-[#00F2FE]/20 shadow-[0_0_10px_rgba(0,242,254,0.1)]">
                            {item.subMessage}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
});

// ==========================================
// STYLE 2: "MATTE OBSIDIAN" (For Regular events)
// ==========================================
const StandardNewsCard: React.FC<{ item: NewsItem }> = React.memo(({ item }) => {
    const accentColor = '#00F2FE';

    return (
        <div className="mb-4 relative px-1 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div 
                className="relative rounded-3xl overflow-hidden p-6"
                style={{
                    background: 'linear-gradient(145deg, #1a1a1a, #0a0a0a)',
                    boxShadow: `
                        inset 0 1px 1px rgba(255,255,255,0.05), 
                        0 10px 30px -10px rgba(0,0,0,0.8)
                    `,
                    border: '1px solid #111'
                }}
            >
                <div 
                    className="absolute top-6 left-0 w-1 h-8 rounded-r-full"
                    style={{ background: accentColor, boxShadow: `0 0 10px ${accentColor}` }}
                ></div>

                <div className="relative z-10 pl-3">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-8 h-8 rounded-full bg-[#111] flex items-center justify-center border border-white/5">
                            {item.isHot ? <Zap className="w-4 h-4" style={{ color: accentColor }} /> : <StarIcon className="w-4 h-4 text-gray-500" />}
                        </div>
                        <div className="flex flex-col">
                            <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">{item.type.replace('_', ' ')}</span>
                            <span className="text-[9px] text-gray-600 font-mono">{new Date(item.timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
                        </div>
                    </div>

                    <h3 className="text-xl font-medium text-white tracking-wide mb-1">
                        {item.playerName}
                    </h3>
                    
                    <p className="text-sm text-gray-400 font-light leading-relaxed border-l border-white/5 pl-3 my-3">
                        {item.message.replace(item.playerName, '')}
                    </p>

                    <div className="flex items-center justify-end">
                        <span 
                            className="text-[10px] font-bold px-3 py-1 rounded-full border bg-black/40 tracking-wider transition-all"
                            style={{ 
                                borderColor: accentColor, 
                                color: accentColor,
                                boxShadow: `0 0 8px rgba(0, 242, 254, 0.3)`
                            }}
                        >
                            {item.subMessage}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
});

export const NewsFeedScreen: React.FC = () => {
    const t = useTranslation();
    const { newsFeed, fetchFullNews } = useApp();

    useEffect(() => {
        fetchFullNews();
    }, [fetchFullNews]);

    return (
        <Page>
            <PageHeader title={t.clubNews} />

            <div className="pb-10 px-2">
                {newsFeed.length === 0 ? (
                    <div className="text-center mt-20 opacity-50">
                        <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
                            <StarIcon className="w-8 h-8 text-white/30" />
                        </div>
                        <p className="text-sm text-dark-text-secondary">{t.newsFeedEmpty}</p>
                    </div>
                ) : (
                    newsFeed.map(item => {
                        // LOGIC: Use Cinematic (Blue) for HOT items, Tier Ups, and big Milestones.
                        // Use Standard (Matte) for everything else (Badges, regular updates).
                        const isSpecial = item.isHot || item.type === 'tier_up' || item.type === 'milestone';
                        
                        return isSpecial 
                            ? <CinematicNewsCard key={item.id} item={item} />
                            : <StandardNewsCard key={item.id} item={item} />;
                    })
                )}
            </div>
        </Page>
    );
};
