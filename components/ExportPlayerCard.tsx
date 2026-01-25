
import React from 'react';
import { Player } from '../types';
import { useTranslation } from '../ui';

// FIX: Exported ExportPlayerCard to fix build error in PlayerProfileScreen.tsx
export const ExportPlayerCard: React.FC<{ player: Player; allPlayers: Player[] }> = ({ player, allPlayers }) => {
    const t = useTranslation();
    return (
        <div id="export-card-to-capture" className="w-[400px] h-[600px] bg-[#1A1D24] relative overflow-hidden flex flex-col p-0">
            {player.playerCard && (
                <div 
                    className="absolute inset-0 bg-cover bg-no-repeat grayscale-[0.1]"
                    style={{ backgroundImage: `url(${player.playerCard})`, backgroundPosition: 'center 5%' }}
                />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent"></div>
            
            <div className="relative z-30 flex flex-col h-full p-6">
                <header className="flex justify-between items-start">
                    <div className="pt-2">
                        {/* EXPORT BRAND REPLACEMENT: UNIT (Unified White Gradient) - COMPACT WIDTH */}
                        <p 
                            className="font-russo text-4xl leading-none tracking-tighter"
                            style={{ 
                                background: 'linear-gradient(180deg, #FFFFFF 0%, rgba(255, 255, 255, 0.2) 100%)',
                                WebkitBackgroundClip: 'text',
                                WebkitTextFillColor: 'transparent',
                            }}
                        >
                            UNIT
                        </p>
                    </div>
                    <div className="flex flex-col items-end">
                        <span className="text-6xl font-black text-white leading-none">{player.rating}</span>
                        <span className="text-sm font-bold text-white/50 tracking-widest mt-1">OVR</span>
                    </div>
                </header>

                <div className="flex-grow flex flex-col justify-end items-center pb-12">
                    <h1 className="text-5xl font-black font-russo uppercase tracking-tighter text-white drop-shadow-2xl text-center leading-none">
                        {player.nickname}
                    </h1>
                    <p className="text-xs font-black text-dark-accent-start uppercase tracking-[0.6em] mt-4 opacity-80">
                        {player.tier}
                    </p>
                </div>

                <footer className="grid grid-cols-3 gap-2 border-t border-white/10 pt-6">
                    <div className="flex flex-col items-center">
                        <span className="text-2xl font-bold text-white">{player.totalGoals}</span>
                        <span className="text-[10px] font-black text-white/30 uppercase tracking-widest">GOALS</span>
                    </div>
                    <div className="flex flex-col items-center">
                        <span className="text-2xl font-bold text-white">{player.totalAssists}</span>
                        <span className="text-[10px] font-black text-white/30 uppercase tracking-widest">ASSISTS</span>
                    </div>
                    <div className="flex flex-col items-center">
                        <span className="text-2xl font-bold text-white">{player.totalWins}</span>
                        <span className="text-[10px] font-black text-white/30 uppercase tracking-widest">WINS</span>
                    </div>
                </footer>
            </div>
        </div>
    );
};
