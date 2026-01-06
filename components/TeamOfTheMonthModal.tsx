
import React, { useEffect } from 'react';

interface TeamOfTheMonthModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const TeamOfTheMonthModal: React.FC<TeamOfTheMonthModalProps> = ({ isOpen, onClose }) => {
    
    // Блокируем прокрутку основного экрана, когда открыто окно
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => { document.body.style.overflow = ''; };
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            {/* 1. ФОН (Backdrop) с плавной анимацией fade-in */}
            <div 
                className="absolute inset-0 bg-black/95 backdrop-blur-xl animate-fade-in" 
                onClick={onClose}
            >
                {/* Фоновый шум/текстура для кинематографичности */}
                <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]"></div>
            </div>

            {/* Wrapper для позиционирования кнопки закрытия */}
            <div className="relative w-[95vw] md:w-[90vw] max-w-[1400px] h-[85vh] md:h-[80vh] animate-modal-pop flex flex-col">
                
                {/* Внешняя кнопка закрытия (справа сверху) */}
                <button 
                    onClick={onClose} 
                    className="absolute -top-14 right-0 md:-right-6 z-50 group outline-none"
                >
                    <div className="w-10 h-10 rounded-full border border-white/10 bg-black/40 backdrop-blur-md flex items-center justify-center text-white/40 group-hover:text-[#FFD700] group-hover:border-[#FFD700]/50 transition-all duration-300 shadow-lg">
                        <svg 
                            xmlns="http://www.w3.org/2000/svg" 
                            width="20" 
                            height="20" 
                            viewBox="0 0 24 24" 
                            fill="none" 
                            stroke="currentColor" 
                            strokeWidth="1.5" 
                            strokeLinecap="round" 
                            strokeLinejoin="round"
                            className="transition-transform duration-500 group-hover:rotate-90"
                        >
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </div>
                </button>

                {/* 2. ОСНОВНОЙ КОНТЕЙНЕР (Window) */}
                {/* Тонкая рамка, чистое содержимое */}
                <div className="w-full h-full bg-[#05070a] rounded-[2rem] border border-[#FFD700]/20 shadow-[0_0_60px_-15px_rgba(255,215,0,0.1)] overflow-hidden relative flex flex-col">
                    
                    {/* Тонкая декоративная линия сверху (акцент) */}
                    <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[#FFD700]/40 to-transparent opacity-70 z-10"></div>
                    
                    {/* Внутреннее свечение сверху */}
                    <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-[#FFD700]/5 to-transparent pointer-events-none z-0"></div>

                    {/* HEADER */}
                    <div className="relative z-20 w-full pt-8 pb-4 text-center shrink-0">
                        <h2 className="font-russo text-3xl md:text-4xl text-white uppercase tracking-wider drop-shadow-lg">
                            Hall of Fame
                        </h2>
                        <div className="flex items-center justify-center gap-3 mt-2 opacity-80">
                            <div className="h-px w-6 bg-gradient-to-r from-transparent to-[#FFD700]"></div>
                            <span className="font-chakra text-[10px] md:text-xs font-black text-[#FFD700] tracking-[0.3em] uppercase">
                                Team of the Month
                            </span>
                            <div className="h-px w-6 bg-gradient-to-l from-transparent to-[#FFD700]"></div>
                        </div>
                    </div>

                    {/* FIELD CONTAINER - 3D PERSPECTIVE */}
                    <div className="relative w-full flex-grow flex items-center justify-center overflow-hidden" style={{ perspective: '1000px' }}>
                        
                        {/* THE PITCH */}
                        {/* rotateX creates the angled look. scale fits it nicely. */}
                        <div 
                            className="relative w-[85%] md:w-[60%] h-[80%] bg-[#0f1216] border-2 border-white/10 rounded-xl shadow-2xl transition-transform duration-700 ease-out"
                            style={{ 
                                transform: 'rotateX(35deg) scale(0.9)',
                                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)'
                            }}
                        >
                            {/* Texture overlay for "technical" look */}
                            <div className="absolute inset-0 opacity-10 bg-[linear-gradient(0deg,transparent_24%,rgba(255,255,255,.05)_25%,rgba(255,255,255,.05)_26%,transparent_27%,transparent_74%,rgba(255,255,255,.05)_75%,rgba(255,255,255,.05)_76%,transparent_77%,transparent),linear-gradient(90deg,transparent_24%,rgba(255,255,255,.05)_25%,rgba(255,255,255,.05)_26%,transparent_27%,transparent_74%,rgba(255,255,255,.05)_75%,rgba(255,255,255,.05)_76%,transparent_77%,transparent)] bg-[length:50px_50px]"></div>
                            
                            {/* Ambient Floor Glow */}
                            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#FFD700]/[0.02] to-transparent"></div>

                            {/* --- FIELD MARKINGS --- */}
                            
                            {/* Center Line */}
                            <div className="absolute top-1/2 left-0 right-0 h-[2px] bg-white/10"></div>

                            {/* Center Circle */}
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 border-2 border-white/10 rounded-full flex items-center justify-center">
                                <div className="w-2 h-2 bg-white/30 rounded-full shadow-[0_0_10px_white]"></div>
                            </div>

                            {/* Top Goal Area (Opponent/Away) */}
                            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/2 h-1/6 border-x-2 border-b-2 border-white/10 rounded-b-lg"></div>
                            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/4 h-[6%] border-x-2 border-b-2 border-white/10 bg-white/[0.02] rounded-b-md"></div>
                            
                            {/* Penalty Spot Top */}
                            <div className="absolute top-[12%] left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-white/20 rounded-full"></div>

                            {/* Bottom Goal Area (Home) */}
                            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1/2 h-1/6 border-x-2 border-t-2 border-white/10 rounded-t-lg"></div>
                            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1/4 h-[6%] border-x-2 border-t-2 border-white/10 bg-white/[0.02] rounded-t-md"></div>

                            {/* Penalty Spot Bottom */}
                            <div className="absolute bottom-[12%] left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-white/20 rounded-full"></div>

                            {/* Corner Arcs */}
                            <div className="absolute top-0 left-0 w-6 h-6 border-r-2 border-b-2 border-white/10 rounded-br-full"></div>
                            <div className="absolute top-0 right-0 w-6 h-6 border-l-2 border-b-2 border-white/10 rounded-bl-full"></div>
                            <div className="absolute bottom-0 left-0 w-6 h-6 border-r-2 border-t-2 border-white/10 rounded-tr-full"></div>
                            <div className="absolute bottom-0 right-0 w-6 h-6 border-l-2 border-t-2 border-white/10 rounded-tl-full"></div>

                        </div>
                        
                        {/* Atmosphere: Fog/Glow at the bottom of the pitch area */}
                        <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-[#05070a] to-transparent pointer-events-none z-10"></div>
                    </div>

                    {/* Тонкая линия снизу */}
                    <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[#FFD700]/20 to-transparent"></div>
                </div>
            </div>
        </div>
    );
};
