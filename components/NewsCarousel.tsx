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
        }, 8000); 
        
        return () => clearInterval(interval);
    }, [totalItems]);

    const handlePrev = (e: React.MouseEvent) => {
        e.stopPropagation();
        setCurrentIndex((prev) => (prev - 1 + totalItems) % totalItems);
    };

    const handleNext = (e: React.MouseEvent) => {
        e.stopPropagation();
        setCurrentIndex((prev) => (prev + 1) % totalItems);
    };

    if (totalItems === 1) {
         return <div className={className}>{children}</div>;
    }

    return (
        <div className={`relative group ${className}`}>
             {/* Content Area - Using absolute positioning for crossfade */}
             <div className="w-full h-full relative rounded-[1.5rem] overflow-hidden">
                 
                 {/* Default Content (Index 0) */}
                 <div 
                    className={`absolute inset-0 w-full h-full transition-all duration-[2000ms] ease-in-out ${currentIndex === 0 ? 'opacity-100 z-10 visible delay-0' : 'opacity-0 z-0 invisible delay-[1000ms]'}`}
                 >
                     {children}
                 </div>

                 {/* News Items (Index 1..N) */}
                 {news.map((item, idx) => {
                     const itemIndex = idx + 1;
                     const isActive = currentIndex === itemIndex;
                     return (
                         <div 
                            key={item.id}
                            className={`absolute inset-0 w-full h-full bg-black transition-all duration-[2000ms] ease-in-out ${isActive ? 'opacity-100 z-20 visible delay-0' : 'opacity-0 z-0 invisible delay-[1000ms]'}`}
                         >
                            <img 
                                src={item.imageUrl} 
                                alt={item.title || 'News'} 
                                className="w-full h-full object-cover"
                            />
                            {/* Gradient Overlay */}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent pointer-events-none"></div>
                            
                            {/* Title */}
                            {item.title && (
                                 <div className="absolute bottom-0 left-0 right-0 p-6 text-center z-30">
                                     <h3 className="font-russo text-2xl md:text-3xl text-white uppercase tracking-wide drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                                         {item.title}
                                     </h3>
                                 </div>
                             )}
                         </div>
                     );
                 })}
             </div>

             {/* Navigation Arrows - Smaller and positioned */}
             <button 
                onClick={handlePrev}
                className="absolute left-2 top-1/2 -translate-y-1/2 z-30 p-1.5 text-white/20 hover:text-white transition-colors opacity-0 group-hover:opacity-100 bg-black/20 hover:bg-black/50 rounded-full backdrop-blur-sm"
             >
                <ChevronLeft className="w-4 h-4 md:w-5 md:h-5" />
             </button>
             
             <button 
                onClick={handleNext}
                className="absolute right-2 top-1/2 -translate-y-1/2 z-30 p-1.5 text-white/20 hover:text-white transition-colors opacity-0 group-hover:opacity-100 bg-black/20 hover:bg-black/50 rounded-full backdrop-blur-sm"
             >
                <ChevronLeft className="w-4 h-4 md:w-5 md:h-5 rotate-180" />
             </button>
             
             {/* Indicators */}
             <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5 z-30 pointer-events-none">
                {Array.from({ length: totalItems }).map((_, idx) => (
                    <div
                        key={idx}
                        className={`h-1 rounded-full transition-all duration-500 ${idx === currentIndex ? 'bg-white/20 w-6' : 'bg-white/5 w-1.5'}`}
                    />
                ))}
             </div>
        </div>
    );
};
