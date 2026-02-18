import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Player, SkillType, PlayerForm } from '../types';
import { useApp } from '../context';
import { useTranslation } from '../ui';
import { convertCountryCodeAlpha3ToAlpha2 } from '../utils/countries';
import { sortBadgesByPriority, BadgeIcon } from '../features';
import { MiniSquadBadge } from './MiniSquadBadge';
import { StarIcon } from '../icons';

const skillAbbreviations: Record<SkillType, string> = {
    goalkeeper: 'GK', power_shot: 'PS', technique: 'TQ', defender: 'DF', 
    playmaker: 'PM', finisher: 'FN', versatile: 'VS', tireless_motor: 'TM', leader: 'LD',
};

const FormArrowIndicator: React.FC<{ form: PlayerForm }> = ({ form }) => {
    const config = {
        hot_streak: { color: '#4CFF5F' }, stable: { color: '#A9B1BD' }, cold_streak: { color: '#FF4136' },
    };
    const currentForm = config[form] || config.stable;
    const commonProps: React.SVGProps<SVGSVGElement> = {
        width: "22", height: "22", viewBox: "0 0 24 24", fill: "none", stroke: currentForm.color,
        strokeWidth: "3", strokeLinecap: "round", strokeLinejoin: "round",
    };
    switch (form) {
        case 'hot_streak': return <svg {...commonProps}><path d="M12 19V5m-6 7l6-6 6 6"/></svg>;
        case 'cold_streak': return <svg {...commonProps}><path d="M12 5v14M5 12l7 7 7-7"/></svg>;
        default: return <svg {...commonProps}><path d="M5 12h14m-6-6l6 6-6 6"/></svg>;
    }
};

// Эффект "атмосферы" хедера, теперь без кругов света (Top Glow)
export const HeaderAtmosphere: React.FC = () => (
    <div className="absolute top-0 left-0 right-0 h-[1000px] pointer-events-none z-0 overflow-hidden">
        {/* 1. Digital LED Screen Texture (Dots) - Оставляем только сетку */}
        <div className="absolute top-0 left-0 right-0 h-[600px] opacity-30"
             style={{
                 backgroundImage: 'radial-gradient(rgba(255, 255, 255, 0.2) 1px, transparent 1px)',
                 backgroundSize: '4px 4px',
                 maskImage: 'linear-gradient(to bottom, black 0%, transparent 100%)',
                 WebkitMaskImage: 'linear-gradient(to bottom, black 0%, transparent 100%)'
             }}
        ></div>
        
        {/* Top Glow div удален, чтобы убрать эффект фонаря */}
    </div>
);

export const CinematicCard: React.FC<{ player: Player, rank: number }> = ({ player, rank }) => {
    const cardRef = useRef<HTMLDivElement>(null);
    const { totmPlayerIds } = useApp();
    const t = useTranslation();
    const isFirst = rank === 1;
    const countryCodeAlpha2 = useMemo(() => player.countryCode ? convertCountryCodeAlpha3ToAlpha2(player.countryCode) : null, [player.countryCode]);
    const podiumGlowStyle = useMemo(() => {
        const glows: Record<number, string> = { 1: '0 25px 40px -20px rgba(255, 215, 0, 0.5)', 2: '0 20px 35px -15px rgba(192, 192, 192, 0.5)', 3: '0 20px 35px -15px rgba(205, 127, 50, 0.6)' };
        return { boxShadow: glows[rank] || 'none' };
    }, [rank]);
    
    const topBadges = useMemo(() => sortBadgesByPriority(player.badges || {}).slice(0, 5), [player.badges]);
    const isTotm = totmPlayerIds.has(player.id);
    const [isBadgeModalOpen, setIsBadgeModalOpen] = useState(false);

    const fullName = `${player.nickname} ${player.surname}`.trim();

    useEffect(() => {
        const card = cardRef.current; if (!card) return;
        const handleMouseMove = (e: MouseEvent) => { const rect = card.getBoundingClientRect(); const x = e.clientX - rect.left; const y = e.clientY - rect.top; card.style.setProperty('--mouse-x', `${x}px`); card.style.setProperty('--mouse-y', `${y}px`); };
        card.addEventListener('mousemove', handleMouseMove);
        return () => { card.removeEventListener('mousemove', handleMouseMove); };
    }, []);

    return (
        <div style={podiumGlowStyle} className={`relative group ${isFirst ? 'scale-105 z-20' : 'scale-90 md:scale-100 z-10'} rounded-3xl transition-shadow duration-300`}>
            <div ref={cardRef} className={`interactive-card relative ${isFirst ? 'w-[280px] h-[390px]' : 'w-[260px] h-[360px]'} rounded-3xl p-4 overflow-hidden text-white bg-dark-surface border border-white/10`}>
                {player.playerCard && (<div className="absolute inset-0 w-full h-full bg-cover bg-no-repeat" style={{ backgroundImage: `url(${player.playerCard})`, backgroundPosition: 'center 5%' }}/>)}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent"></div>
                
                {!isBadgeModalOpen && (
                    <div className="absolute top-24 left-4 z-20 flex flex-col gap-4">
                        <div className="space-y-4">
                            {(player.skills || []).map(skill => (
                                <div key={skill} className="flex items-center gap-2" title={t[`skill_${skill}` as keyof typeof t] || skill}>
                                    <StarIcon className="w-4 h-4 text-[#00F2FE]" />
                                    <span className="font-bold text-xs text-white tracking-wider">{skillAbbreviations[skill]}</span>
                                </div>
                            ))}
                        </div>
                        {isTotm && (
                            <div className="animate-in fade-in zoom-in duration-500">
                                <MiniSquadBadge size="w-10 h-10" />
                            </div>
                        )}
                    </div>
                )}

                <div className="relative z-10 h-full p-1">
                     <div className="flex justify-between items-start">
                        <div className="pt-2">
                            <p 
                                className="font-russo text-xl leading-none tracking-tighter"
                                style={{ 
                                    background: 'linear-gradient(180deg, #155e75 0%, #083344 100%)',
                                    WebkitBackgroundClip: 'text',
                                    WebkitTextFillColor: 'transparent',
                                    opacity: 0.8,
                                    filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.4))',
                                }}
                            >
                                UNIT
                            </p>
                            {countryCodeAlpha2 && (<img src={`https://flagcdn.com/w40/${countryCodeAlpha2.toLowerCase()}.png`} alt={`${player.countryCode} flag`} className="w-6 h-auto mt-4 rounded-sm opacity-80" />)}
                        </div>
                        <div className="flex flex-col items-center max-w-[50%]">
                            <div className="text-4xl font-black leading-none" style={{color: '#00F2FE', textShadow: 'none' }}>{player.rating}</div>
                            <p className="font-bold text-white tracking-widest text-sm mt-2">OVR</p>
                            <div className="mt-1"><FormArrowIndicator form={player.form} /></div>
                            
                            {topBadges.length > 0 && (
                                <div className="mt-3 flex flex-col items-center gap-1">
                                    {topBadges.map(badge => (
                                        <div key={badge} title={t[`badge_${badge}` as keyof typeof t] || String(badge)}>
                                            <BadgeIcon badge={badge} count={player.badges?.[badge]} className="w-7 h-7" />
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="absolute bottom-5 left-0 right-0 text-center z-30 px-2">
                        <h1 
                            className="text-2xl font-black uppercase tracking-tight leading-tight mb-1"
                            style={{ 
                                background: 'linear-gradient(180deg, #155e75 0%, #083344 100%)',
                                WebkitBackgroundClip: 'text',
                                WebkitTextFillColor: 'transparent',
                                opacity: 0.9,
                                filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.6))',
                            }}
                        >
                            {fullName}
                        </h1>
                    </div>
                </div>
            </div>
        </div>
    );
};