import React, { useEffect } from 'react';
import { Page, PageHeader, useTranslation } from '../ui';
import { NewsItem } from '../types';
import { StarIcon, Zap } from '../icons';
import { useApp } from '../context';

// =========================================================================
// STYLE: "MATTE OBSIDIAN" (Unified Design for all news)
// =========================================================================
const NewsCard: React.FC<{ item: NewsItem }> = React.memo(({ item }) => {
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
                {/* Tactical Side Accent Bar */}
                <div 
                    className="absolute top-6 left-0 w-1 h-8 rounded-r-full"
                    style={{ background: accentColor, boxShadow: `0 0 10px ${accentColor}` }}
                ></div>

                <div className="relative z-10 pl-3">
                    {/* Meta Header: Icon + Type + Time */}
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-8 h-8 rounded-full bg-[#111] flex items-center justify-center border border-white/5">
                            {item.isHot ? (
                                <Zap className="w-4 h-4" style={{ color: accentColor }} />
                            ) : (
                                <StarIcon className="w-4 h-4 text-gray-500" />
                            )}
                        </div>
                        <div className="flex flex-col">
                            <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">
                                {item.type.replace('_', ' ')}
                            </span>
                            <span className="text-[9px] text-gray-600 font-mono">
                                {new Date(item.timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}
                            </span>
                        </div>
                    </div>

                    {/* Main Content */}
                    <h3 className="text-xl font-medium text-white tracking-wide mb-1">
                        {item.playerName}
                    </h3>
                    
                    <p className="text-sm text-gray-400 font-light leading-relaxed border-l border-white/5 pl-3 my-3">
                        {item.message.replace(item.playerName, '').trim()}
                    </p>

                    {/* Footer Tags */}
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
        // Fetch news on mount
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
                    newsFeed.map(item => (
                        <NewsCard key={item.id} item={item} />
                    ))
                )}
            </div>
        </Page>
    );
};