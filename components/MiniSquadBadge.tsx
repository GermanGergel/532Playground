import React from 'react';

interface MiniSquadBadgeProps {
    onClick?: () => void;
    className?: string;
    size?: string; // e.g. "w-10 h-10"
}

export const MiniSquadBadge: React.FC<MiniSquadBadgeProps> = ({ onClick, className = "", size = "w-9 h-9" }) => {
    // Radius fixed for the SVG coordinate system
    const radius = 39;
    const circumference = 2 * Math.PI * radius; 
  
    return (
        <button
            onClick={onClick}
            disabled={!onClick}
            className={`relative flex items-center justify-center ${size} bg-transparent rounded-full transition-all duration-300 group shrink-0 ${onClick ? 'cursor-pointer hover:scale-105' : 'cursor-default'} ${className}`}
            title="Team of the Month"
        >
            {/* TEXT RING (Animated Spin) */}
            <div className="absolute inset-0 opacity-100 animate-spin-slow">
                <svg viewBox="0 0 100 100" className="w-full h-full overflow-visible">
                    <defs>
                        <path id="miniCirclePathShared" d={`M 50, 50 m -${radius}, 0 a ${radius},${radius} 0 1,1 ${radius * 2},0 a ${radius},${radius} 0 1,1 -${radius * 2},0`} />
                    </defs>
                    <text 
                        fill="#00F2FE" 
                        className="font-chakra font-black uppercase"
                        style={{ 
                            fontSize: '8.5px', 
                            letterSpacing: '0.15em'
                        }}
                    >
                        <textPath 
                            href="#miniCirclePathShared" 
                            startOffset="0%"
                            textLength={circumference * 0.98}
                            lengthAdjust="spacing"
                        >
                            TEAM OF THE MONTH ◆ HALL OF FAME ◆ 
                        </textPath>
                    </text>
                </svg>
            </div>
            
            {/* CORE SHIELD */}
            <div className="absolute inset-0 flex items-center justify-center">
                <svg viewBox="0 0 100 100" className="w-full h-full overflow-visible">
                    <defs>
                        <linearGradient id="miniShieldBorderShared" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#00F2FE" />
                            <stop offset="50%" stopColor="#0891b2" />
                            <stop offset="100%" stopColor="#00F2FE" />
                        </linearGradient>
                        <linearGradient id="miniShieldBodyShared" x1="50%" y1="0%" x2="50%" y2="100%">
                            <stop offset="0%" stopColor="#1a1d24" />
                            <stop offset="100%" stopColor="#000000" />
                        </linearGradient>
                        <radialGradient id="miniInnerGlowShared" cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
                            <stop offset="0%" stopColor="#00F2FE" stopOpacity="0.5" />
                            <stop offset="70%" stopColor="#00F2FE" stopOpacity="0.2" />
                            <stop offset="100%" stopColor="transparent" stopOpacity="0" />
                        </radialGradient>
                        <path id="miniStarItemShared" d="M 0,-5 L 1.2,-1.5 L 4.8,-1.5 L 1.8,0.8 L 2.9,4.3 L 0,2.2 L -2.9,4.3 L -1.8,0.8 L -4.8,-1.5 L -1.2,-1.5 Z" />
                    </defs>
  
                    <g transform="translate(50, 62) scale(0.5) translate(-50, -50)">
                        <path 
                            d="M 10,10 Q 50,0 90,10 L 90,45 Q 90,80 50,95 Q 10,80 10,45 Z" 
                            fill="url(#miniShieldBodyShared)" 
                            stroke="url(#miniShieldBorderShared)" 
                            strokeWidth="5"
                        />
                        <path 
                            d="M 15,15 Q 50,7 85,15 L 85,45 Q 85,75 50,88 Q 15,75 15,45 Z" 
                            fill="none" 
                            stroke="#ffffff" 
                            strokeOpacity="0.2" 
                            strokeWidth="2"
                        />
                        <g fill="#00F2FE" opacity="1">
                            <use href="#miniStarItemShared" transform="translate(30, 32) scale(1.5)" />
                            <use href="#miniStarItemShared" transform="translate(70, 32) scale(1.5)" />
                            <use href="#miniStarItemShared" transform="translate(40, 48) scale(1.5)" />
                            <use href="#miniStarItemShared" transform="translate(60, 48) scale(1.5)" />
                            <use href="#miniStarItemShared" transform="translate(50, 68) scale(1.8)" />
                        </g>
                    </g>
  
                    <g>
                        <text 
                            x="50" 
                            y="36" 
                            textAnchor="middle" 
                            className="font-blackops" 
                            style={{ 
                                fontSize: '16px', 
                                fill: '#00F2FE',
                                letterSpacing: '0.05em'
                            }}
                        >
                            UNIT
                        </text>
                    </g>
                </svg>
            </div>

            <style dangerouslySetInnerHTML={{ __html: `
                @keyframes spin-slow {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
                .animate-spin-slow {
                    animation: spin-slow 15s linear infinite;
                }
                .font-blackops {
                    font-family: 'Black Ops One', cursive;
                }
            `}} />
        </button>
    );
};