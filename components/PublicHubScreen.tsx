import React from 'react';
import { Player } from '../types';
import { convertCountryCodeAlpha3ToAlpha2 } from '../utils/countries';

export const CinematicCard: React.FC<{ player: Player; rank: 1 | 2 | 3 }> = ({ player, rank }) => {
    const isFirst = rank === 1;
    const countryCode = player.countryCode ? convertCountryCodeAlpha3ToAlpha2(player.countryCode) : null;
    
    // Config based on rank
    const config = {
        1: { border: '#FFD700', shadow: 'rgba(255, 215, 0, 0.4)', height: 'h-[360px] md:h-[420px]', width: 'w-[240px] md:w-[280px]', z: 'z-30' },
        2: { border: '#C0C0C0', shadow: 'rgba(192, 192, 192, 0.3)', height: 'h-[320px] md:h-[360px]', width: 'w-[220px] md:w-[250px]', z: 'z-20' },
        3: { border: '#CD7F32', shadow: 'rgba(205, 127, 50, 0.3)', height: 'h-[320px] md:h-[360px]', width: 'w-[220px] md:w-[250px]', z: 'z-20' }
    }[rank];

    return (
        <div 
            className={`relative rounded-3xl overflow-hidden transition-all duration-500 ease-out hover:scale-105 group cursor-pointer ${config.height} ${config.width} ${config.z}`}
            style={{ 
                boxShadow: `0 20px 50px -10px ${config.shadow}, 0 0 0 1px ${config.border}40` 
            }}
        >
            {/* Background */}
            <div className="absolute inset-0 bg-[#0a0c10]">
                 {player.playerCard ? (
                    <div className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-110" style={{ backgroundImage: `url(${player.playerCard})`, backgroundPosition: 'center 15%' }} />
                 ) : (
                    <div className="absolute inset-0 bg-gradient-to-b from-gray-800 to-black" />
                 )}
                 <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-90" />
            </div>

            {/* Rank Badge */}
            <div className="absolute top-4 right-4 w-12 h-12 rounded-xl flex items-center justify-center font-blackops text-xl text-black shadow-lg z-20 backdrop-blur-md" style={{ backgroundColor: config.border }}>
                {rank}
            </div>

            {/* Content */}
            <div className="absolute bottom-0 left-0 right-0 p-6 flex flex-col z-20">
                <div className="flex justify-between items-end mb-2">
                    <div className="flex flex-col">
                        <span className="font-russo text-4xl text-white leading-none drop-shadow-md" style={{ color: config.border, textShadow: `0 0 15px ${config.border}66` }}>
                            {player.rating}
                        </span>
                        <span className="text-[9px] font-black text-white/50 uppercase tracking-[0.2em]">OVR</span>
                    </div>
                    {countryCode && (
                        <img src={`https://flagcdn.com/w40/${countryCode.toLowerCase()}.png`} className="w-8 h-auto rounded shadow-sm opacity-90" alt={player.countryCode} />
                    )}
                </div>
                
                <div className="h-px w-full bg-white/20 mb-3"></div>

                <h3 className="font-russo text-2xl text-white uppercase leading-none tracking-tight mb-1 truncate drop-shadow-md">
                    {player.nickname}
                </h3>
                <p className="font-chakra text-xs text-white/60 uppercase tracking-wider truncate">
                    {player.surname || 'Unit Player'}
                </p>
            </div>
             <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
        </div>
    );
};