import React from 'react';
import { BallDecorations } from './BallDecorations';

interface StaticSoccerBallProps {
    className?: string;
    style?: React.CSSProperties;
}

export const StaticSoccerBall: React.FC<StaticSoccerBallProps> = ({ className = "w-8 h-8 md:w-10 md:h-10", style }) => {
    // Получаем текущую дату
    const today = new Date();
    const month = today.getMonth(); // 0-11
    const day = today.getDate();

    // Логика выбора декорации
    let Decoration = null;

    // 1. Новый Год (Декабрь и Январь)
    if (month === 11 || month === 0) {
        Decoration = BallDecorations.SantaHat;
    }
    // 2. День Победы во Вьетнаме (30 апреля) + 1 мая
    else if (month === 3 && day === 30 || month === 4 && day === 1) {
        Decoration = BallDecorations.VietnamHelmet;
    }

    return (
        <div className={`relative flex items-center justify-center ${className}`} style={style}>
            <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]">
                <defs>
                    <radialGradient id="ballGradient" cx="30%" cy="30%" r="70%">
                        <stop offset="0%" stopColor="#ffffff" />
                        <stop offset="100%" stopColor="#d1d5db" />
                    </radialGradient>
                    <filter id="glow">
                        <feGaussianBlur stdDeviation="2.5" result="coloredBlur"/>
                        <feMerge>
                            <feMergeNode in="coloredBlur"/>
                            <feMergeNode in="SourceGraphic"/>
                        </feMerge>
                    </filter>
                </defs>
                
                <circle cx="50" cy="50" r="48" fill="url(#ballGradient)" stroke="#9ca3af" strokeWidth="1" />
                
                <g fill="#1f2937">
                    <path d="M50 22 L63 32 L58 48 L42 48 L37 32 Z" />
                    <path d="M50 22 L37 32 L22 27 L26 12 L42 9 Z" opacity="0.9" />
                    <path d="M63 32 L50 22 L58 9 L74 12 L78 27 Z" opacity="0.9" />
                    <path d="M58 48 L63 32 L78 27 L86 40 L74 54 Z" opacity="0.9" />
                    <path d="M42 48 L58 48 L74 54 L66 70 L50 75 Z" opacity="0.9" />
                    <path d="M37 32 L42 48 L50 75 L34 70 L26 54 Z" opacity="0.9" />
                    <path d="M22 27 L37 32 L26 54 L14 40 Z" opacity="0.9" />
                </g>

                {/* Рендерим декорацию, если она есть */}
                {Decoration && <Decoration />}
            </svg>
        </div>
    );
};
