
import React from 'react';

// Хранилище визуальных эффектов для мяча
export const BallDecorations = {
  // Традиционный вьетнамский шлем (Mũ cối) - УЛУЧШЕННЫЙ КОЗЫРЕК
  VietnamHelmet: () => (
    <g transform="translate(-15, -34) scale(1.3)">
      <defs>
        <linearGradient id="helmetGreen" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#2d4a24" />
          <stop offset="100%" stopColor="#1b2e16" />
        </linearGradient>
        <linearGradient id="brimEdge" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#243b1d" />
          <stop offset="100%" stopColor="#0f1a0c" />
        </linearGradient>
      </defs>

      {/* Тень под шлемом */}
      <path d="M 15 54 Q 50 45 85 54" fill="none" stroke="black" strokeWidth="2.5" opacity="0.12" filter="blur(2px)" />
      
      {/* 
          ГЕОМЕТРИЯ ПОЛЕЙ (КОЗЫРЬКА) 
          Сделана единым плавным контуром без острых углов и ступенек.
          Используем Q (quadratic curve) для идеальной симметрии.
      */}
      {/* Нижняя грань (фаска) */}
      <path d="M 2 50 Q 50 40 98 50 L 98 52 Q 50 42 2 52 Z" fill="#142110" opacity="0.5" />
      
      {/* Основная часть полей */}
      <path 
        d="M 1 50 
           Q 1 44, 15 44 
           L 85 44 
           Q 99 44, 99 50 
           Q 99 56, 90 56 
           L 10 56 
           Q 1 56, 1 50 Z" 
        fill="url(#brimEdge)" 
        stroke="#142110" 
        strokeWidth="0.5" 
      />
      
      {/* Основной купол шлема */}
      <path d="M 15 45 C 15 2, 85 2, 85 45 Z" fill="url(#helmetGreen)" stroke="#142110" strokeWidth="0.5" />
      
      {/* Коричневый ремешок */}
      <path d="M 18 46 Q 50 51 82 46" fill="none" stroke="#4a322d" strokeWidth="2" strokeLinecap="round" opacity="0.9" />
      
      {/* Золотая кокарда */}
      <circle cx="50" cy="25" r="6" fill="#facc15" stroke="#a16207" strokeWidth="0.5" />
      <path d="M 50 21 L 51.5 24 L 54.5 24 L 52.2 25.5 L 53 28.5 L 50 27 L 47 28.5 L 47.8 25.5 L 45.5 24 L 48.5 24 Z" fill="#e11d48" />
      
      {/* Блик на куполе */}
      <ellipse cx="40" cy="22" rx="15" ry="8" fill="white" opacity="0.08" transform="rotate(-15, 40, 22)" />
    </g>
  ),

  // Новогодняя шапка (спрятана здесь)
  SantaHat: () => (
    <g transform="translate(0, -25)">
      <defs>
        <linearGradient id="hatBodyGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ff4d4d" />
          <stop offset="40%" stopColor="#e60000" />
          <stop offset="100%" stopColor="#990000" />
        </linearGradient>
        <radialGradient id="pompomGradient" cx="40%" cy="35%" r="50%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="70%" stopColor="#f1f5f9" />
          <stop offset="100%" stopColor="#cbd5e1" />
        </radialGradient>
      </defs>
      <path d="M 18 42 L 18 20 C 18 -15, 88 -18, 90 25 L 82 42 Z" fill="url(#hatBodyGradient)" stroke="#7f1d1d" strokeWidth="0.3" />
      <circle cx="90" cy="25" r="8.5" fill="url(#pompomGradient)" stroke="#94a3b8" strokeWidth="0.1" />
      <path d="M 8 40 Q 50 25 92 40 Q 96 48 92 55 Q 50 40 8 55 Q 4 48 8 40 Z" fill="#FFFFFF" stroke="#f1f5f9" strokeWidth="0.2" />
    </g>
  )
};
