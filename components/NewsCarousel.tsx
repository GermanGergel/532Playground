import React, { useState, useEffect } from 'react';
import { ClubNewsItem } from '../types';
import { ChevronLeft } from '../icons';

interface NewsCarouselProps {
    news: ClubNewsItem[];
    children: React.ReactNode;
    className?: string;
}

export const NewsCarousel: React.FC<NewsCarouselProps> = ({ news, children, className }) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    
    // Items: [0: Default View (Children), 1..N: News Items]
    const totalItems = 1 + news.length;

    useEffect(() => {
        if (totalItems <= 1) return;
        
        const interval = setInterval(() => {
            setCurrentIndex((prev) => (prev + 1) % totalItems);
        }, 8000); // 8 seconds rotation (slower for better readability)
        
        return () => clearInterval(interval);
    }, [totalItems]);

    const handlePrev = () => {
        setCurrentIndex((prev) => (prev - 1 + totalItems) % totalItems);
    };

    const handleNext = () => {
        setCurrentIndex((prev) => (prev + 1) % totalItems);
    };

    if (totalItems === 1) {
         return <div className={className}>{children}</div>;
    }

    return (
        <div className={`relative group flex flex-col justify-center ${className || 'w-full max-w-5xl mx-auto mb-10 md:mb-16 -mt-8 md:-mt-12 min-h-[400px]'}`}>
             {/* Navigation Arrows */}
             <button 
                onClick={handlePrev}
                className="absolute left-0 top-1/2 -translate-y-1/2 z-20 p-2 text-white/20 hover:text-white transition-colors opacity-0 group-hover:opacity-100"
             >
                <ChevronLeft className="w-8 h-8 md:w-12 md:h-12" />
             </button>
             
             <button 
                onClick={handleNext}
                className="absolute right-0 top-1/2 -translate-y-1/2 z-20 p-2 text-white/20 hover:text-white transition-colors opacity-0 group-hover:opacity-100"
             >
                <ChevronLeft className="w-8 h-8 md:w-12 md:h-12 rotate-180" />
             </button>

             {/* Content */}
             <div className="transition-all duration-500 ease-in-out w-full h-full flex items-center justify-center">
                {currentIndex === 0 ? (
                    <div className="animate-in fade-in zoom-in duration-500 w-full h-full flex items-center justify-center">
                        {children}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center animate-in fade-in zoom-in duration-500 w-full h-full px-8 md:px-12">
                        <div className="relative w-full h-full rounded-2xl overflow-hidden border border-white/10 shadow-[0_0_30px_rgba(0,0,0,0.5)] group/image flex items-center justify-center bg-black/50 aspect-video">
                             <img 
                                src={news[currentIndex - 1].imageUrl} 
                                alt="News" 
                                className="w-full h-full object-contain transition-transform duration-700 group-hover/image:scale-105"
                             />
                             <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent pointer-events-none"></div>
                             {news[currentIndex - 1].title && (
                                 <div className="absolute bottom-0 left-0 right-0 p-4 text-center z-10">
                                     <h3 className="font-russo text-lg md:text-xl text-white uppercase tracking-wide" style={{ textShadow: '0 2px 10px rgba(0,0,0,0.8)' }}>
                                         {news[currentIndex - 1].title}
                                     </h3>
                                 </div>
                             )}
                        </div>
                    </div>
                )}
             </div>
             
             {/* Indicators */}
             <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-2 z-30">
                {Array.from({ length: totalItems }).map((_, idx) => (
                    <button
                        key={idx}
                        onClick={() => setCurrentIndex(idx)}
                        className={`w-1.5 h-1.5 rounded-full transition-all ${idx === currentIndex ? 'bg-[#00F2FE] w-4' : 'bg-white/20 hover:bg-white/40'}`}
                    />
                ))}
             </div>
        </div>
    );
};
