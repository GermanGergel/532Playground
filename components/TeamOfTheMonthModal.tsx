import React, { useMemo } from 'react';
import { Modal, useTranslation } from '../ui';
import { useApp } from '../context';
import { PlayerAvatar } from './avatars';
import { TrophyIcon } from '../icons';

const StarrySky = () => (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(50)].map((_, i) => (
            <div
                key={i}
                className="absolute bg-white rounded-full opacity-0 animate-twinkle"
                style={{
                    width: Math.random() * 2 + 1 + 'px',
                    height: Math.random() * 2 + 1 + 'px',
                    top: Math.random() * 100 + '%',
                    left: Math.random() * 100 + '%',
                    animationDelay: Math.random() * 5 + 's',
                    animationDuration: Math.random() * 3 + 2 + 's'
                }}
            />
        ))}
        <style dangerouslySetInnerHTML={{__html: `
            @keyframes twinkle {
                0%, 100% { opacity: 0; transform: scale(0.5); }
                50% { opacity: 0.8; transform: scale(1.2); }
            }
            .animate-twinkle {
                animation: twinkle linear infinite;
            }
            .font-blackops {
                font-family: 'Black Ops One', cursive;
            }
        `}} />
    </div>
);

interface TeamOfTheMonthModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const TeamOfTheMonthModal: React.FC<TeamOfTheMonthModalProps> = ({ isOpen, onClose }) => {
    const { allPlayers, totmPlayerIds } = useApp();
    const t = useTranslation();

    const winners = useMemo(() => {
        return allPlayers.filter(p => totmPlayerIds.has(p.id));
    }, [allPlayers, totmPlayerIds]);

    if (!isOpen) return null;

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            size="md"
            hideCloseButton
            containerClassName="!p-0 !bg-[#0a0c10] !border !border-[#1e293b] !shadow-2xl overflow-hidden relative w-full max-w-lg"
        >
             <div className="relative min-h-[500px] w-full flex flex-col">
                {/* Background */}
                <div className="absolute inset-0 bg-gradient-to-b from-[#0f172a] via-[#020617] to-black z-0"></div>
                <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] z-0"></div>
                <StarrySky />

                {/* Branding in the Goalpost (Background) at 17% top */}
                <div className="absolute top-[17%] left-1/2 -translate-x-1/2 z-0 flex flex-col items-center pointer-events-none select-none opacity-20 scale-90">
                    <h2 className="font-blackops text-6xl text-[#00F2FE] leading-none drop-shadow-[0_0_15px_rgba(0,242,254,0.5)]">
                        532
                    </h2>
                    <div className="flex flex-col items-center -mt-1">
                        <span className="font-russo text-xs text-white tracking-[0.5em] uppercase">
                            PLAYGROUND
                        </span>
                        <span className="font-chakra text-[10px] font-black text-white/80 tracking-[0.3em] uppercase mt-0.5">
                            CLUB
                        </span>
                    </div>
                </div>

                {/* Header */}
                <div className="relative z-10 flex flex-col items-center pt-10 pb-6">
                    <TrophyIcon className="w-14 h-14 text-[#FFD700] mb-3 drop-shadow-[0_0_15px_rgba(255,215,0,0.6)]" />
                    <h2 className="font-blackops text-3xl text-white uppercase tracking-widest text-center" style={{ textShadow: '0 0 10px rgba(255,255,255,0.3)' }}>
                        TEAM OF THE MONTH
                    </h2>
                    <div className="flex items-center gap-3 mt-2">
                        <div className="h-px w-10 bg-[#00F2FE]/50"></div>
                        <span className="font-chakra text-[10px] font-black text-[#00F2FE] tracking-[0.3em] uppercase">
                            HALL OF FAME
                        </span>
                        <div className="h-px w-10 bg-[#00F2FE]/50"></div>
                    </div>
                </div>

                {/* Players Grid */}
                <div className="relative z-10 flex-grow flex items-center justify-center p-6">
                    {winners.length === 0 ? (
                        <div className="text-center opacity-50 py-10">
                            <p className="font-chakra text-xs text-white uppercase tracking-widest">CALCULATING DATA...</p>
                        </div>
                    ) : (
                        <div className="flex flex-wrap justify-center gap-8">
                            {winners.map(player => (
                                <div key={player.id} className="flex flex-col items-center gap-3 group animate-in zoom-in duration-500">
                                    <div className="relative p-1 rounded-full border-2 border-[#FFD700] shadow-[0_0_20px_rgba(255,215,0,0.3)] transition-transform duration-300 group-hover:scale-110 bg-[#0a0c10]">
                                        <PlayerAvatar player={player} size="lg" className="w-20 h-20" />
                                        <div className="absolute -bottom-2 -right-2 bg-[#00F2FE] text-black text-[12px] font-black px-2 py-0.5 rounded border border-white shadow-lg">
                                            {player.rating}
                                        </div>
                                    </div>
                                    <span className="font-russo text-sm text-white uppercase tracking-wide group-hover:text-[#FFD700] transition-colors bg-black/50 px-2 py-0.5 rounded backdrop-blur-sm">
                                        {player.nickname}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="relative z-10 p-8 flex justify-center mt-auto">
                    <button 
                        onClick={onClose}
                        className="px-10 py-3 rounded-full border border-white/10 bg-white/5 text-white/50 text-[10px] font-black uppercase tracking-widest hover:bg-white/10 hover:text-white hover:border-white/30 transition-all"
                    >
                        CLOSE
                    </button>
                </div>
             </div>
        </Modal>
    );
};