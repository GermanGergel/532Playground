import React from 'react';

export const HangingTag: React.FC<{ digit: string; label: string; height: number; delay: string; pulseDuration: string }> = ({ digit, label, height, delay, pulseDuration }) => (
    <div className="relative flex flex-col items-center group/fiber">
        <span 
            className="font-blackops text-2xl md:text-3xl text-[#00F2FE] tracking-tighter z-10 leading-none" 
            style={{ 
                textShadow: '0 0 10px rgba(0,242,254,0.6)',
                filter: 'url(#grungeFilter)' 
            }}
        >
            {digit}
        </span>
        <div className="absolute top-[26px] w-[0.5px] bg-[#00F2FE]/10 origin-top animate-pendant-swing" style={{ height: `${height}px`, animationDelay: delay, boxShadow: '0 0 3px rgba(0,242,254,0.1)' }}>
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-full pt-1">
                <div className="relative flex flex-col items-center">
                    <div className="absolute inset-0 blur-[8px] bg-[#00F2FE]/20 rounded-full scale-[2.5] pointer-events-none opacity-40"></div>
                    <span className="relative text-[7px] font-black tracking-[0.15em] text-[#00F2FE] whitespace-nowrap uppercase italic" style={{ textShadow: '0 0 8px rgba(0,242,254,0.8)' }}>{label}</span>
                </div>
            </div>
        </div>
    </div>
);