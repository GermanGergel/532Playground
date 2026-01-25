
import React from 'react';
import { Player, PlayerTier } from '../types';
import { convertCountryCodeAlpha3ToAlpha2 } from '../utils/countries';

const TIER_COLORS = {
    [PlayerTier.Legend]: '#d946ef',
    [PlayerTier.Elite]: '#fbbf24',
    [PlayerTier.Pro]: '#E2E8F0',
    [PlayerTier.Regular]: '#00F2FE'
};

// FIX: Exported CinematicCard to fix build error in screens/PublicHubScreen.tsx
export const CinematicCard: React.FC<{ player: Player; rank: number }> = ({ player, rank }) => {
    const tierColor = TIER_COLORS[player.tier] || '#94a3b8';
    const countryCode = player.countryCode ? convertCountryCodeAlpha3ToAlpha2(player.countryCode) : 'VN';
    const flagUrl = countryCode ? `https://flagcdn.com/w80/${countryCode.toLowerCase()}.png` : '';

    const heightClass = rank === 1 ? 'h-[440px] md:h-[500px] w-[300px] md:w-[350px]' : 'h-[380px] md:h-[440px] w-[260px] md:w-[310px]';
    const shadowClass = rank === 1 ? 'shadow-[0_40px_80px_-15px_rgba(0,242,254,0.3)]' : 'shadow-2xl';

    return (
        <div className={`relative rounded-[2.5rem] overflow-hidden border border-white/10 ${heightClass} ${shadowClass} transition-all duration-700 hover:scale-105 group`}>
            {player.playerCard ? (
                <div 
                    className="absolute inset-0 bg-cover bg-center transition-transform duration-1000 group-hover:scale-110"
                    style={{ backgroundImage: `url(${player.playerCard})`, backgroundPosition: 'center 5%' }}
                />
            ) : (
                <div className="absolute inset-0 bg-gradient-to-b from-slate-700 to-slate-900" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent"></div>
            
            <div className="relative z-10 h-full p-1">
                 <div className="flex justify-between items-start">
                    <div className="pt-2">
                        {/* BRAND REPLACEMENT: UNIT (Unified White Gradient) - COMPACT WIDTH */}
                        <p 
                            className="font-russo text-xl leading-none tracking-tighter"
                            style={{ 
                                background: 'linear-gradient(180deg, #FFFFFF 0%, rgba(255, 255, 255, 0.2) 100%)',
                                WebkitBackgroundClip: 'text',
                                WebkitTextFillColor: 'transparent',
                            }}
                        >
                            UNIT
                        </p>
                    </div>
                    <div className="flex flex-col items-end p-4">
                        <span className="text-4xl font-black text-[#00F2FE] leading-none">{player.rating}</span>
                        <span className="text-[10px] font-bold text-white tracking-widest mt-1">OVR</span>
                    </div>
                </div>

                <div className="absolute bottom-8 left-0 right-0 px-6 flex flex-col items-center">
                    <div className="flex items-center gap-3 mb-2">
                        {flagUrl && <img src={flagUrl} className="w-5 h-auto rounded-sm shadow-sm" alt="" />}
                        <span className="text-[10px] font-black text-white/60 uppercase tracking-[0.2em]">{player.tier}</span>
                    </div>
                    <h3 className="font-russo text-3xl uppercase tracking-tighter text-white drop-shadow-2xl text-center leading-none">
                        {player.nickname}
                    </h3>
                    <div className="mt-4 flex items-center gap-4">
                        <div className="w-8 h-8 rounded-full border border-white/20 flex items-center justify-center font-russo text-sm text-white/50">
                            {rank}
                        </div>
                    </div>
                </div>
            </div>

            <div className="absolute inset-0 p-[2px] rounded-[2.5rem] pointer-events-none">
                <div className="w-full h-full rounded-[2.4rem] border border-white/5"></div>
            </div>
        </div>
    );
};
