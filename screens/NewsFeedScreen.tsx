

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context';
import { Page, Button, useTranslation, PageHeader, Card } from '../ui';
import { PlayerAvatar } from '../components/avatars';
import { NewsItem } from '../types';
import { shareOrDownloadImages } from '../services/export';
import { StarIcon } from '../icons';

const NewsCardItem: React.FC<{ item: NewsItem; onClickProfile: () => void }> = ({ item, onClickProfile }) => {
    // We export the inner specific card content to ensure rounded corners are respected
    const exportRef = React.useRef<HTMLDivElement>(null);
    
    const handleShare = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (exportRef.current) {
            shareOrDownloadImages([exportRef.current], `News_${item.playerName}`, item.timestamp.split('T')[0]);
        }
    };

    const timeAgo = (dateStr: string) => {
        const diff = Date.now() - new Date(dateStr).getTime();
        const mins = Math.floor(diff / 60000);
        if (mins < 60) return `${mins}m ago`;
        const hours = Math.floor(mins / 60);
        if (hours < 24) return `${hours}h ago`;
        return `${Math.floor(hours / 24)}d ago`;
    };

    return (
        <div className="w-full mb-3 bg-transparent font-oxanium">
            {/* Wrapper Card (invisible layout container) */}
            <div className="bg-transparent">
                {/* 
                   Content Container - This is what gets exported. 
                   We ensure it has the background, borders, and radius so html2canvas captures it correctly.
                   CRITICAL: The background color must be set here, not on a parent, for corners to be transparent in PNG.
                   UPDATED: Changed background to a much darker, almost solid black (#050505) for better text contrast.
                */}
                <div 
                    ref={exportRef}
                    data-export-target="true"
                    className={`
                        relative overflow-hidden rounded-xl bg-[#050505]
                        border transition-all duration-300
                        ${item.isHot ? 'border-orange-500/50 shadow-[0_0_15px_rgba(249,115,22,0.2)]' : 'border-dark-accent-start/30 shadow-[0_0_10px_rgba(0,242,254,0.1)]'}
                    `}
                >
                    {/* Header Strip */}
                    <div className={`
                        h-1 w-full
                        ${item.isHot ? 'bg-gradient-to-r from-red-500 via-yellow-500 to-red-500 animate-pulse' : 'bg-dark-accent-start/50'}
                    `}></div>
                    
                    <div className="p-3">
                        {/* Timestamp & Type */}
                        <div className="flex justify-between items-center mb-1.5">
                            <span className="text-[10px] text-dark-text-secondary font-bold tracking-widest uppercase font-sans">
                                {timeAgo(item.timestamp)} • CLUB NEWS
                            </span>
                            {item.isHot && <span className="text-lg animate-bounce">🔥</span>}
                        </div>

                        {/* Content Grid */}
                        <div className="flex gap-3 items-start">
                            <div className="shrink-0 cursor-pointer flex flex-col items-center gap-1" onClick={onClickProfile}>
                                <PlayerAvatar 
                                    player={{ 
                                        id: item.playerId, 
                                        nickname: item.playerName, 
                                        photo: item.playerPhoto 
                                    } as any} 
                                    size="md" 
                                />
                                {item.statsSnapshot && (
                                    <div className="text-center font-sans">
                                        <div className="inline-flex items-center gap-1 bg-dark-bg/80 px-1.5 py-px rounded text-[10px] font-bold border border-white/10">
                                            <span className="text-dark-accent-start">{item.statsSnapshot.rating}</span>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="flex-grow">
                                <h3 className="text-lg font-bold leading-tight mb-1 text-white uppercase tracking-tight">
                                    {item.message}
                                </h3>
                                {item.subMessage && (
                                    <p className={`text-xs font-bold tracking-wide ${item.isHot ? 'text-orange-400' : 'text-dark-accent-start/80'}`}>
                                        {item.subMessage}
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* Actions Footer - Hidden during export */}
                        <div className="mt-2 pt-2 border-t border-white/5 flex justify-end gap-2 font-sans" data-html2canvas-ignore="true">
                            <Button 
                                variant="ghost" 
                                className="!py-1 !px-2 !text-xs font-bold text-dark-text-secondary hover:text-white"
                                onClick={onClickProfile}
                            >
                                PROFILE
                            </Button>
                            <Button 
                                variant="secondary" 
                                className={`!py-1 !px-3 !text-xs font-bold !rounded-lg ${item.isHot ? '!border-orange-500/40 text-orange-200' : ''}`}
                                onClick={handleShare}
                            >
                                SHARE NEWS
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export const NewsFeedScreen: React.FC = () => {
    const { newsFeed } = useApp();
    const t = useTranslation();
    const navigate = useNavigate();

    // Sort news by date descending
    const sortedNews = [...newsFeed].sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return (
        <Page>
            <div className="flex items-center justify-between mb-6 pt-12">
                 <PageHeader title={t.clubNews} hideBack={true} />
            </div>
            
            {sortedNews.length === 0 ? (
                <div className="flex flex-col items-center justify-center mt-20 opacity-50">
                    <StarIcon className="w-16 h-16 text-dark-text-secondary mb-4" />
                    <p className="text-center text-dark-text-secondary max-w-xs font-medium text-lg">
                        {t.newsFeedEmpty}
                    </p>
                </div>
            ) : (
                <div className="space-y-3 pb-10">
                    {sortedNews.map(item => (
                        <NewsCardItem 
                            key={item.id} 
                            item={item} 
                            onClickProfile={() => navigate(`/player/${item.playerId}`)} 
                        />
                    ))}
                </div>
            )}
            
            {/* Back Button specifically for this page flow */}
            <div className="fixed bottom-24 left-4 z-50">
                 <Button variant="secondary" onClick={() => navigate(-1)} className="!rounded-full !p-3 !bg-dark-surface/80 shadow-lg border border-white/10">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
                </Button>
            </div>
        </Page>
    );
};