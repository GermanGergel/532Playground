
import React from 'react';
import { Player } from '../types';
import { useTranslation } from '../ui';
import { LastSessionBreakdown, ClubRankings, BestSessionCard, PlayerProgressChart } from './PlayerCardAnalytics';

// FIX: Exported PublicPlayerCard to fix build errors in PublicProfileScreen.tsx and PromoScreen.tsx
export const PublicPlayerCard: React.FC<{ player: Player; isPromo?: boolean }> = ({ player, isPromo }) => {
    const t = useTranslation();
    
    return (
        <div className="space-y-6">
            <div className="relative aspect-[3/4] max-w-sm mx-auto rounded-[2rem] overflow-hidden shadow-2xl border border-white/10 bg-[#1A1D24]">
                {player.playerCard && (
                    <div 
                        className="absolute inset-0 bg-cover bg-no-repeat"
                        style={{ backgroundImage: `url(${player.playerCard})`, backgroundPosition: 'center 5%' }}
                    />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/10 to-transparent"></div>
                
                <div className="relative z-10 h-full flex flex-col justify-between p-1">
                    <div className="flex justify-between items-start">
                        <div className="pt-2">
                            {/* BRAND REPLACEMENT: UNIT (Unified White Gradient) - COMPACT WIDTH */}
                            <p 
                                className="font-russo text-3xl leading-none tracking-tighter"
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
                            <span className="text-5xl font-black text-white leading-none">{player.rating}</span>
                            <span className="text-xs font-bold text-white/40 tracking-widest mt-1">OVR</span>
                        </div>
                    </div>

                    <div className="flex flex-col items-center pb-12">
                        <h1 className="text-4xl font-black font-russo uppercase tracking-tighter text-white text-center leading-none">
                            {player.nickname}
                        </h1>
                        <p className="text-[10px] font-black text-dark-accent-start uppercase tracking-[0.5em] mt-4 opacity-80">
                            {player.tier}
                        </p>
                    </div>

                    <footer className="grid grid-cols-3 gap-2 border-t border-white/5 pt-4 pb-6 bg-black/20 backdrop-blur-sm">
                        <div className="flex flex-col items-center">
                            <span className="text-xl font-bold text-white">{player.totalGoals}</span>
                            <span className="text-[9px] font-black text-white/30 uppercase tracking-widest">{t.thG}</span>
                        </div>
                        <div className="flex flex-col items-center">
                            <span className="text-xl font-bold text-white">{player.totalAssists}</span>
                            <span className="text-[9px] font-black text-white/30 uppercase tracking-widest">{t.thA}</span>
                        </div>
                        <div className="flex flex-col items-center">
                            <span className="text-xl font-bold text-white">{player.totalWins}</span>
                            <span className="text-[9px] font-black text-white/30 uppercase tracking-widest">{t.thW}</span>
                        </div>
                    </footer>
                </div>
            </div>

            <div className="px-1 space-y-4">
                <LastSessionBreakdown player={player} usePromoStyle={isPromo} />
                <ClubRankings player={player} usePromoStyle={isPromo} />
                <BestSessionCard player={player} usePromoStyle={isPromo} />
                {player.historyData && <PlayerProgressChart history={player.historyData} usePromoStyle={isPromo} />}
            </div>
        </div>
    );
};
