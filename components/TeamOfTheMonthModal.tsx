
import React, { useEffect, useMemo } from 'react';
import { useApp } from '../context';
import { Player, PlayerStatus } from '../types';
import { CrownIcon } from '../icons';

interface TeamOfTheMonthModalProps {
    isOpen: boolean;
    onClose: () => void;
}

// Вспомогательный компонент для токена игрока на поле
const PlayerToken: React.FC<{ player: Player; rank: number; position: { top: string; left: string } }> = ({ player, rank, position }) => {
    const isMvp = rank === 1;
    
    return (
        <div 
            className="absolute flex flex-col items-center gap-1 transition-all duration-1000 animate-in fade-in zoom-in"
            style={{ 
                top: position.top, 
                left: position.left, 
                transform: 'translate(-50%, -50%) rotateX(-35deg)', // "Выпрямляем" игрока относительно наклоненного поля
                zIndex: 50 - rank
            }}
        >
            {/* MVP Crown */}
            {isMvp && (
                <div className="absolute -top-6 left-1/2 -translate-x-1/2 animate-bounce">
                    <CrownIcon className="w-6 h-6 text-[#FFD700] drop-shadow-[0_0_10px_#FFD700]" />
                </div>
            )}

            {/* Avatar Circle */}
            <div className={`relative w-14 h-14 md:w-20 md:h-20 rounded-full border-2 overflow-hidden shadow-2xl transition-all duration-500
                ${isMvp ? 'border-[#FFD700] shadow-[0_0_25px_rgba(255,215,0,0.5)]' : 'border-white/40 shadow-lg'}
            `}>
                {player.photo || player.playerCard ? (
                    <div 
                        className="w-full h-full bg-cover bg-center"
                        style={{ backgroundImage: `url(${player.photo || player.playerCard})` }}
                    />
                ) : (
                    <div className="w-full h-full bg-slate-800 flex items-center justify-center text-white/20 font-black text-xl">
                        {player.nickname[0]}
                    </div>
                )}
                
                {/* Rating Badge */}
                <div className={`absolute top-0 right-0 px-1.5 py-0.5 rounded-bl-lg font-russo text-[10px] md:text-xs 
                    ${isMvp ? 'bg-[#FFD700] text-black' : 'bg-white/20 text-white backdrop-blur-md'}
                `}>
                    {player.rating}
                </div>
            </div>

            {/* Name Label */}
            <div className="bg-black/60 backdrop-blur-md px-3 py-0.5 rounded-full border border-white/10 shadow-sm min-w-[60px] text-center">
                <span className={`text-[9px] md:text-[11px] font-black uppercase tracking-wider whitespace-nowrap
                    ${isMvp ? 'text-[#FFD700]' : 'text-white/80'}
                `}>
                    {player.nickname}
                </span>
            </div>
        </div>
    );
};

export const TeamOfTheMonthModal: React.FC<TeamOfTheMonthModalProps> = ({ isOpen, onClose }) => {
    const { allPlayers } = useApp();
    
    // Логика выборки ТОП-5
    const teamOfTheMonth = useMemo(() => {
        return allPlayers
            .filter(p => p.status === PlayerStatus.Confirmed)
            .sort((a, b) => {
                if (b.rating !== a.rating) return b.rating - a.rating;
                if (b.monthlyGoals !== a.monthlyGoals) return b.monthlyGoals - a.monthlyGoals;
                return b.monthlyGames - a.monthlyGames;
            })
            .slice(0, 5);
    }, [allPlayers]);

    const squadStats = useMemo(() => {
        if (teamOfTheMonth.length === 0) return { avg: 0, goals: 0 };
        const totalRating = teamOfTheMonth.reduce((sum, p) => sum + p.rating, 0);
        const totalGoals = teamOfTheMonth.reduce((sum, p) => sum + (p.monthlyGoals || 0), 0);
        return {
            avg: Math.round(totalRating / teamOfTheMonth.length),
            goals: totalGoals
        };
    }, [teamOfTheMonth]);

    // Координаты для схемы 1-2-1-1 (Ромб)
    // Координаты в % от размеров поля (Pitch)
    const positions = [
        { top: '15%', left: '50%' }, // Rank 1: Striker (Top)
        { top: '40%', left: '50%' }, // Rank 2: Playmaker (Center-High)
        { top: '62%', left: '20%' }, // Rank 3: Left Winger
        { top: '62%', left: '80%' }, // Rank 4: Right Winger
        { top: '88%', left: '50%' }, // Rank 5: GK/LIB (Bottom)
    ];

    useEffect(() => {
        if (isOpen) document.body.style.overflow = 'hidden';
        else document.body.style.overflow = '';
        return () => { document.body.style.overflow = ''; };
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/95 backdrop-blur-xl animate-fade-in" onClick={onClose}>
                <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]"></div>
            </div>

            <div className="relative w-[95vw] md:w-[90vw] max-w-[1400px] h-[85vh] md:h-[80vh] animate-modal-pop flex flex-col">
                
                <button onClick={onClose} className="absolute -top-14 right-0 md:-right-6 z-50 group outline-none">
                    <div className="w-10 h-10 rounded-full border border-white/10 bg-black/40 backdrop-blur-md flex items-center justify-center text-white/40 group-hover:text-[#FFD700] group-hover:border-[#FFD700]/50 transition-all duration-300 shadow-lg">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="transition-transform duration-500 group-hover:rotate-90">
                            <line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </div>
                </button>

                <div className="w-full h-full bg-[#05070a] rounded-[2rem] border border-[#FFD700]/20 shadow-[0_0_60px_-15px_rgba(255,215,0,0.1)] overflow-hidden relative flex flex-col">
                    
                    <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[#FFD700]/40 to-transparent opacity-70 z-10"></div>
                    <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-[#FFD700]/5 to-transparent pointer-events-none z-0"></div>

                    {/* HEADER */}
                    <div className="relative z-20 w-full pt-8 pb-4 text-center shrink-0">
                        <h2 className="font-russo text-3xl md:text-4xl text-white uppercase tracking-wider drop-shadow-lg">
                            Hall of Fame
                        </h2>
                        <div className="flex items-center justify-center gap-3 mt-2 opacity-80">
                            <div className="h-px w-6 bg-gradient-to-r from-transparent to-[#FFD700]"></div>
                            <span className="font-chakra text-[10px] md:text-xs font-black text-[#FFD700] tracking-[0.3em] uppercase">
                                Team of the Month
                            </span>
                            <div className="h-px w-6 bg-gradient-to-l from-transparent to-[#FFD700]"></div>
                        </div>
                    </div>

                    {/* FIELD AREA */}
                    <div className="relative w-full flex-grow flex items-center justify-center overflow-hidden" style={{ perspective: '1000px' }}>
                        
                        <div 
                            className="relative w-[85%] md:w-[60%] h-[80%] bg-[#0f1216] border-2 border-white/10 rounded-xl shadow-2xl"
                            style={{ 
                                transform: 'rotateX(35deg) scale(0.9)',
                                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)'
                            }}
                        >
                            {/* Chalk Lines Effect */}
                            <div className="absolute inset-0 opacity-10 bg-[linear-gradient(0deg,transparent_24%,rgba(255,255,255,.05)_25%,rgba(255,255,255,.05)_26%,transparent_27%,transparent_74%,rgba(255,255,255,.05)_75%,rgba(255,255,255,.05)_76%,transparent_77%,transparent),linear-gradient(90deg,transparent_24%,rgba(255,255,255,.05)_25%,rgba(255,255,255,.05)_26%,transparent_27%,transparent_74%,rgba(255,255,255,.05)_75%,rgba(255,255,255,.05)_76%,transparent_77%,transparent)] bg-[length:50px_50px]"></div>
                            
                            {/* Markings */}
                            <div className="absolute top-1/2 left-0 right-0 h-[2px] bg-white/10"></div>
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 border-2 border-white/10 rounded-full flex items-center justify-center">
                                <div className="w-2 h-2 bg-white/30 rounded-full"></div>
                            </div>
                            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1/2 h-1/6 border-x-2 border-t-2 border-white/10 rounded-t-lg"></div>
                            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/2 h-1/6 border-x-2 border-b-2 border-white/10 rounded-b-lg"></div>

                            {/* PLAYER TOKENS */}
                            {teamOfTheMonth.map((player, index) => (
                                <PlayerToken 
                                    key={player.id} 
                                    player={player} 
                                    rank={index + 1} 
                                    position={positions[index]} 
                                />
                            ))}
                        </div>
                        
                        <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-[#05070a] to-transparent pointer-events-none z-10"></div>
                    </div>

                    {/* SQUAD FOOTER STATS */}
                    <div className="relative z-30 w-full p-6 border-t border-white/5 bg-black/40 backdrop-blur-xl shrink-0">
                        <div className="max-w-xl mx-auto flex justify-around items-center">
                            <div className="flex flex-col items-center">
                                <span className="text-[8px] font-black text-white/30 uppercase tracking-[0.2em] mb-1">Squad AVG</span>
                                <span className="font-russo text-2xl text-[#FFD700] leading-none" style={{ textShadow: '0 0 10px rgba(255,215,0,0.3)' }}>{squadStats.avg}</span>
                            </div>
                            <div className="h-8 w-px bg-white/10"></div>
                            <div className="flex flex-col items-center">
                                <span className="text-[8px] font-black text-white/30 uppercase tracking-[0.2em] mb-1">Combined Goals</span>
                                <span className="font-russo text-2xl text-white leading-none">{squadStats.goals}</span>
                            </div>
                            <div className="h-8 w-px bg-white/10"></div>
                            <div className="flex flex-col items-center">
                                <span className="text-[8px] font-black text-white/30 uppercase tracking-[0.2em] mb-1">Elite Units</span>
                                <span className="font-russo text-2xl text-white leading-none">05</span>
                            </div>
                        </div>
                    </div>

                    <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[#FFD700]/20 to-transparent"></div>
                </div>
            </div>
            
            <style dangerouslySetInnerHTML={{ __html: `
                @keyframes modal-pop {
                    0% { opacity: 0; transform: scale(0.95) translateY(20px); }
                    100% { opacity: 1; transform: scale(1) translateY(0); }
                }
                .animate-modal-pop {
                    animation: modal-pop 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                }
            `}} />
        </div>
    );
};
