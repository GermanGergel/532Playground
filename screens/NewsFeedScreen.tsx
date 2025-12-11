
import React, { useEffect } from 'react';
import { Page, PageHeader, useTranslation, Button } from '../ui';
import { NewsItem } from '../types';
import { StarIcon, Zap, TrophyIcon } from '../icons';
import { useApp } from '../context';

// --- СТИЛЬ 1: "НЕОНОВОЕ СТЕКЛО" ---
const Style1: React.FC<{ item: NewsItem }> = ({ item }) => (
    <div className="mb-4 relative group">
        <div className={`absolute -bottom-2 left-0 right-0 h-10 blur-xl opacity-40 transition-opacity duration-500 ${item.isHot ? 'bg-orange-500' : 'bg-dark-accent-start'}`}></div>
        <div className="relative bg-dark-surface/40 backdrop-blur-md border-t border-l border-r border-white/10 rounded-2xl p-4 overflow-hidden">
            <div className={`absolute bottom-0 left-0 right-0 h-1 ${item.isHot ? 'bg-gradient-to-r from-orange-500 via-red-500 to-orange-500' : 'bg-gradient-to-r from-dark-accent-start via-dark-accent-end to-dark-accent-start'}`}></div>
            <div className="flex flex-col gap-2">
                <div className="flex justify-between items-center">
                    <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md ${item.isHot ? 'bg-orange-500/20 text-orange-400' : 'bg-dark-accent-start/20 text-dark-accent-start'}`}>
                        {item.type}
                    </span>
                    <span className="text-[10px] text-dark-text-secondary font-mono">Just now</span>
                </div>
                <h3 className="text-white font-bold text-lg leading-6 shadow-black drop-shadow-md">
                    {item.message}
                </h3>
                <div className="flex items-center gap-2 mt-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-white/30"></div>
                    <p className="text-xs text-dark-text-secondary italic">{item.subMessage}</p>
                </div>
            </div>
        </div>
    </div>
);

// --- СТИЛЬ 2: "ТАКТИЧЕСКАЯ ДОСКА" ---
const Style2: React.FC<{ item: NewsItem }> = ({ item }) => (
    <div className="mb-4 bg-[#15171C] rounded-lg border border-dashed border-white/20 p-1 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(#fff 1px, transparent 1px)', backgroundSize: '10px 10px' }}></div>
        <div className="relative border border-white/5 bg-black/20 p-3 rounded flex gap-4 items-center">
            <div className={`w-12 h-12 rounded-full border-2 border-dashed flex items-center justify-center shrink-0 ${item.isHot ? 'border-yellow-500 text-yellow-500' : 'border-dark-accent-start text-dark-accent-start'}`}>
                {item.type === 'milestone' ? <StarIcon className="w-6 h-6" /> : <TrophyIcon className="w-6 h-6" />}
            </div>
            <div className="flex-grow min-w-0 border-l border-white/10 pl-4">
                <div className="flex items-baseline gap-2 mb-1">
                    <h4 className="text-white font-bold text-sm uppercase tracking-wide truncate">{item.playerName}</h4>
                    {item.isHot && <Zap className="w-3 h-3 text-yellow-500" />}
                </div>
                <p className="text-dark-text-secondary text-xs leading-tight mb-2">
                    {item.message.replace(item.playerName, '').trim()}
                </p>
                <div className="flex items-center gap-2">
                    <span className="text-[9px] font-mono text-dark-text-secondary opacity-50 bg-white/5 px-1 rounded">TACTICAL UPDATE</span>
                </div>
            </div>
        </div>
    </div>
);

// --- СТИЛЬ 3: "КЛУБНЫЙ ПОСТ" ---
const Style3: React.FC<{ item: NewsItem }> = ({ item }) => (
    <div className="mb-4 bg-dark-bg border border-white/10 rounded-xl p-4 relative">
        {/* Header */}
        <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-dark-accent-start to-blue-500 flex items-center justify-center text-black font-black text-xs">
                532
            </div>
            <div>
                <div className="flex items-center gap-1">
                    <span className="text-white font-bold text-sm">532 Official</span>
                    <svg className="w-3 h-3 text-blue-400" viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/></svg>
                </div>
                <span className="text-[10px] text-dark-text-secondary">@532playground • 2m</span>
            </div>
        </div>
        
        {/* Content */}
        <p className="text-white text-sm mb-3 leading-snug">
            {item.message} {item.isHot && '🔥'}
        </p>
        <p className="text-dark-accent-start text-xs mb-3">{item.subMessage}</p>
        
        {/* Footer / Fake Actions */}
        <div className="flex items-center gap-6 text-dark-text-secondary border-t border-white/5 pt-2">
            <div className="flex items-center gap-1 text-xs"><span className="opacity-50">❤️</span> <span>{Math.floor(Math.random() * 50) + 10}</span></div>
            <div className="flex items-center gap-1 text-xs"><span className="opacity-50">💬</span> <span>{Math.floor(Math.random() * 5)}</span></div>
            <div className="flex items-center gap-1 text-xs"><span className="opacity-50">🔄</span> <span>{Math.floor(Math.random() * 10)}</span></div>
        </div>
    </div>
);

// --- СТИЛЬ 4: "СПОРТИВНЫЙ ЗАГОЛОВОК" ---
const Style4: React.FC<{ item: NewsItem }> = ({ item }) => {
    const theme = item.isHot
        ? { accent: 'rgba(249, 115, 22, 0.7)', text: 'text-orange-400', glow: 'shadow-[0_0_15px_rgba(249,115,22,0.5)]' }
        : { accent: 'rgba(0, 242, 254, 0.5)', text: 'text-dark-accent-start', glow: 'shadow-[0_0_15px_rgba(0,242,254,0.3)]' };

    const firstName = item.playerName.split(' ')[0];
    const messageWithoutName = item.message.includes(firstName)
        ? item.message.replace(firstName, '').trim().replace(/^:/, '').trim()
        : item.message;

    return (
        <div className={`mb-4 relative rounded-lg bg-dark-surface overflow-hidden border border-white/10 ${theme.glow}`}>
            <div
                className="absolute inset-0 opacity-20"
                style={{
                    backgroundImage: `repeating-linear-gradient(-45deg, transparent, transparent 10px, ${theme.accent} 10px, ${theme.accent} 11px)`,
                    backgroundSize: '28px 28px',
                }}
            />
            <div className="absolute inset-0 bg-gradient-to-r from-black/50 via-black/20 to-transparent" />
            <div className="relative p-4 flex flex-col">
                <div className="flex justify-between items-baseline">
                    <h3 className={`font-teko text-4xl font-bold uppercase leading-none ${theme.text}`} style={{ textShadow: `0 0 8px ${theme.accent}` }}>
                        {item.playerName}
                    </h3>
                    <div className='flex items-center gap-1'>
                        {item.type === 'badge' && <TrophyIcon className={`w-5 h-5 ${theme.text} opacity-70`} />}
                        {item.type === 'milestone' && <StarIcon className={`w-5 h-5 ${theme.text} opacity-70`} />}
                    </div>
                </div>
                <div className="w-full h-px my-1 opacity-50" style={{ background: `linear-gradient(90deg, ${theme.accent}, transparent)` }} />
                <p className="text-white text-base font-medium leading-tight capitalize">{messageWithoutName}</p>
                <p className="text-xs text-dark-text-secondary/80 italic mt-2">{item.subMessage}</p>
            </div>
        </div>
    );
};

// --- СТИЛЬ 5: "ГОЛОГРАФИЧЕСКИЙ БИЛЕТ" ---
const Style5: React.FC<{ item: NewsItem }> = ({ item }) => (
    <div className="mb-4 relative group">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 z-20 pointer-events-none"></div>
        <div className={`relative bg-[#1A1D24] border-l-4 ${item.isHot ? 'border-l-yellow-500' : 'border-l-dark-accent-start'} rounded-r-xl shadow-lg flex overflow-hidden`}>
            <div className="bg-dark-surface p-3 flex flex-col items-center justify-center border-r border-dashed border-white/20 min-w-[60px]">
                <span className="text-[10px] font-black text-dark-text-secondary -rotate-90 whitespace-nowrap tracking-widest">
                    NEWS FEED
                </span>
            </div>
            <div className="p-3 flex-grow bg-gradient-to-br from-white/5 to-transparent">
                <div className="flex justify-between items-start mb-1">
                    <span className="text-[9px] font-bold text-white bg-white/10 px-1.5 py-0.5 rounded uppercase tracking-wide">
                        {item.type.replace('_', ' ')}
                    </span>
                    {item.isHot && <StarIcon className="w-4 h-4 text-yellow-500 animate-pulse" />}
                </div>
                <h3 className="text-white font-bold text-sm leading-tight mb-2">
                    <span className={item.isHot ? "text-yellow-400" : "text-dark-accent-start"}>{item.playerName}</span> <br/>
                    {item.message.replace(item.playerName, '')}
                </h3>
                <p className="text-[9px] text-dark-text-secondary font-mono">
                    ID: {item.id.slice(0,6).toUpperCase()} • {new Date(item.timestamp).toLocaleDateString()}
                </p>
            </div>
        </div>
    </div>
);

const NewsStyleComponents = [Style1, Style2, Style3, Style4, Style5];

export const NewsFeedScreen: React.FC = () => {
    const t = useTranslation();
    const { newsFeed, fetchFullNews } = useApp();

    useEffect(() => {
        fetchFullNews();
    }, [fetchFullNews]);

    return (
        <Page>
            <PageHeader title={t.clubNews} />

            {newsFeed.length === 0 ? (
                <div className="text-center py-10 text-dark-text-secondary">
                    <p>{t.newsFeedEmpty}</p>
                </div>
            ) : (
                <div className="pb-10">
                    {newsFeed.map((item, index) => {
                        const StyleComponent = NewsStyleComponents[index % NewsStyleComponents.length];
                        return <StyleComponent key={item.id} item={item} />;
                    })}
                </div>
            )}
        </Page>
    );
};
