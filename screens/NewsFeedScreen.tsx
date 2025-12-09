import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context';
import { Page, Button, useTranslation, PageHeader, Card } from '../ui';
import { PlayerAvatar } from '../components/avatars';
import { NewsItem } from '../types';
import { shareOrDownloadImages } from '../services/export';
import { StarIcon } from '../icons';

const NewsCardItem: React.FC<{ item: NewsItem; onClickProfile: () => void }> = ({ item, onClickProfile }) => {
    const exportRef = React.useRef<HTMLDivElement>(null);
    const [isSharing, setIsSharing] = React.useState(false);
    
    const handleShare = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (isSharing || !exportRef.current) return;

        setIsSharing(true);
        // Wait for UI to update with loading state
        await new Promise(res => setTimeout(res, 50)); 

        try {
            await shareOrDownloadImages(exportRef.current.id, `News_${item.playerName}`, item.timestamp.split('T')[0]);
        } catch (error) {
            console.error("News sharing failed:", error);
        } finally {
            setIsSharing(false);
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
            <div className="bg-transparent">
                <div 
                    ref={exportRef}
                    id={`news-card-export-${item.id}`}
                    data-export-target="true"
                    className={`
                        relative overflow-hidden rounded-xl bg-[#050505]
                        border transition-all duration-300
                        ${item.isHot ? 'border-orange-500/50 shadow-[0_0_15px_rgba(249,115,22,0.2)]' : 'border-dark-accent-start/30 shadow-[0_0_10px_rgba(0,242,254,0.1)]'}
                    `}
                >
                    <div className={`
                        h-1 w-full
                        ${item.isHot ? 'bg-gradient-to-r from-red-500 via-yellow-500 to-red-500 animate-pulse' : 'bg-dark-accent-start/50'}
                    `}></div>
                    
                    <div className="p-3">
                        <div className="flex justify-between items-center mb-1.5">
                            <span className="text-[10px] text-dark-text-secondary font-bold tracking-widest uppercase font-sans">
                                {timeAgo(item.timestamp)} • CLUB NEWS
                            </span>
                            {item.isHot && <span className="text-lg animate-bounce">🔥</span>}
                        </div>

                        <div className="flex gap-3 items-start">
                             <div className="shrink-0 cursor-pointer" onClick={onClickProfile}>
                                <div className="relative"> {/* Wrapper for positioning context */}
                                    <PlayerAvatar 
                                        player={{ 
                                            id: item.playerId, 
                                            nickname: item.playerName, 
                                            photo: item.playerPhoto 
                                        } as any} 
                                        size="md" 
                                    />
                                    {item.statsSnapshot && (
                                        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2">
                                            <span 
                                                className="text-lg font-black text-dark-accent-start" 
                                                style={{ textShadow: '0 1px 4px rgba(0,0,0,0.7)' }}
                                            >
                                                {item.statsSnapshot.rating}
                                            </span>
                                        </div>
                                    )}
                                </div>
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

                        <div className="mt-2 pt-2 border-t border-white/5 flex justify-end gap-2 font-sans" data-html2canvas-ignore="true">
                            <Button 
                                variant="ghost" 
                                className="!py-1 !px-2 !text-xs font-bold text-dark-text-secondary hover:text-white"
                                onClick={onClickProfile}
                                disabled={isSharing}
                            >
                                PROFILE
                            </Button>
                            <Button 
                                variant="secondary" 
                                className={`!py-1 !px-3 !text-xs font-bold !rounded-lg ${item.isHot ? '!border-orange-500/40 text-orange-200' : ''}`}
                                onClick={handleShare}
                                disabled={isSharing}
                            >
                                {isSharing ? 'SHARING...' : 'SHARE NEWS'}
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

    const sortedNews = [...newsFeed].sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return (
        <Page>
            <PageHeader title={t.clubNews} />
            
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
        </Page>
    );
};