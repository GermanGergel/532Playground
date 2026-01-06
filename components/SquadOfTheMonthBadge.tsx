
import React from 'react';

interface SquadOfTheMonthBadgeProps {
  onClick?: () => void;
  isDisabled?: boolean;
}

export const SquadOfTheMonthBadge: React.FC<SquadOfTheMonthBadgeProps> = ({ onClick, isDisabled = false }) => {
  // Радиус 39 для вращающегося кольца
  const radius = 39;
  const circumference = 2 * Math.PI * radius; 

  return (
    <div 
      className={`fixed right-4 z-[140] animate-in fade-in zoom-in duration-1000 ${isDisabled ? 'opacity-40 grayscale-[0.5]' : ''}`}
      style={{ top: '120px' }}
    >
      <button
        onClick={isDisabled ? undefined : onClick}
        disabled={isDisabled}
        className={`group relative flex items-center justify-center w-28 h-28 transition-all duration-500 
          ${isDisabled ? 'cursor-default' : 'hover:scale-110 active:scale-95 cursor-pointer'}
        `}
      >
        {/* --- 1. ВРАЩАЮЩЕЕСЯ ТЕКСТОВОЕ КОЛЬЦО --- */}
        <div className="absolute inset-0 animate-spin-slow opacity-100">
          <svg viewBox="0 0 100 100" className="w-full h-full overflow-visible">
            <defs>
              <path id="circlePath" d={`M 50, 50 m -${radius}, 0 a ${radius},${radius} 0 1,1 ${radius * 2},0 a ${radius},${radius} 0 1,1 -${radius * 2},0`} />
            </defs>
            <text 
              fill={isDisabled ? "#A9B1BD" : "#FFD700"} 
              className="font-chakra font-black uppercase"
              style={{ 
                fontSize: '8px',
                letterSpacing: '0.15em',
                textShadow: isDisabled ? 'none' : '0 0 2px rgba(0, 0, 0, 0.8)'
              }}
            >
              <textPath 
                href="#circlePath" 
                startOffset="0%"
                textLength={circumference * 0.98}
                lengthAdjust="spacing"
              >
                TEAM OF THE MONTH ◆ HALL OF FAME ◆ 
              </textPath>
            </text>
          </svg>
        </div>
        
        {/* --- 2. ЦЕНТРАЛЬНАЯ КОМПОЗИЦИЯ (CORE) --- */}
        <div className="absolute inset-0 flex items-center justify-center filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]">
            <svg viewBox="0 0 100 100" className="w-full h-full overflow-visible">
                <defs>
                    <linearGradient id="shieldBorder" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor={isDisabled ? "#4a4a4a" : "#FDB931"} />
                        <stop offset="50%" stopColor={isDisabled ? "#6a6a6a" : "#FFD700"} />
                        <stop offset="100%" stopColor={isDisabled ? "#3a3a3a" : "#B8860B"} />
                    </linearGradient>
                    <linearGradient id="shieldBody" x1="50%" y1="0%" x2="50%" y2="100%">
                        <stop offset="0%" stopColor="#2c2c2c" />
                        <stop offset="100%" stopColor="#000000" />
                    </linearGradient>
                    
                    {/* УСИЛЕННОЕ ЗОЛОТОЕ СВЕЧЕНИЕ (Задний план) - Отключаем при isDisabled */}
                    {!isDisabled && (
                        <radialGradient id="innerGlow" cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
                            <stop offset="0%" stopColor="#FFD700" stopOpacity="0.6" />
                            <stop offset="60%" stopColor="#FFD700" stopOpacity="0.2" />
                            <stop offset="100%" stopColor="transparent" stopOpacity="0" />
                        </radialGradient>
                    )}

                    {/* Путь для изогнутого текста PLAYGROUND (Арка/Мост) */}
                    <path id="playgroundCurve" d="M 20,38 Q 50,30 80,38" />

                    <path id="starItem" d="M 0,-5 L 1.2,-1.5 L 4.8,-1.5 L 1.8,0.8 L 2.9,4.3 L 0,2.2 L -2.9,4.3 L -1.8,0.8 L -4.8,-1.5 L -1.2,-1.5 Z" />
                </defs>

                {/* ФОНОВОЕ ЗАПОЛНЕНИЕ (СВЕЧЕНИЕ) */}
                {!isDisabled && <circle cx="50" cy="50" r="42" fill="url(#innerGlow)" />}

                {/* --- ЩИТ --- */}
                <g transform="translate(50, 62) scale(0.5) translate(-50, -50)">
                    <path 
                        d="M 10,10 Q 50,0 90,10 L 90,45 Q 90,80 50,95 Q 10,80 10,45 Z" 
                        fill="url(#shieldBody)" 
                        stroke="url(#shieldBorder)" 
                        strokeWidth="4"
                    />
                    <path 
                        d="M 15,15 Q 50,7 85,15 L 85,45 Q 85,75 50,88 Q 15,75 15,45 Z" 
                        fill="none" 
                        stroke="#ffffff" 
                        strokeOpacity="0.1" 
                        strokeWidth="2"
                    />
                    <g fill={isDisabled ? "#4a4a4a" : "#FFD700"}>
                        <use href="#starItem" transform="translate(30, 32) scale(1.5)" />
                        <use href="#starItem" transform="translate(70, 32) scale(1.5)" />
                        <use href="#starItem" transform="translate(40, 48) scale(1.5)" />
                        <use href="#starItem" transform="translate(60, 48) scale(1.5)" />
                        <use href="#starItem" transform="translate(50, 68) scale(1.8)" />
                    </g>
                </g>

                {/* --- ТЕКСТОВАЯ ГРУППА --- */}
                <g style={{ filter: isDisabled ? 'none' : 'drop-shadow(0 1px 2px rgba(0,0,0,0.9))' }}>
                    <text 
                        x="50" 
                        y="24" 
                        textAnchor="middle" 
                        className="font-blackops" 
                        style={{ 
                            fontSize: '11px', 
                            fill: isDisabled ? "#6a6a6a" : '#FFD700',
                        }}
                    >
                        532
                    </text>
                    
                    <text className="font-blackops" style={{ fontSize: '5.5px', fill: isDisabled ? "#6a6a6a" : '#FFD700', letterSpacing: '0.12em' }}>
                        <textPath href="#playgroundCurve" startOffset="50%" textAnchor="middle">
                            PLAYGROUND
                        </textPath>
                    </text>
                </g>
            </svg>
        </div>

      </button>
      
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
    </div>
  );
};
