
import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '../context';
import { Player } from '../types';
import { Target } from '../icons';
import { useTranslation } from '../ui';
import { PlayerAvatar } from './avatars';

// --- STYLED COMPONENTS ---

const ParticleBackground: React.FC = () => (
    <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-20">
        {[...Array(15)].map((_, i) => (
            <div 
                key={i}
                className="absolute w-0.5 h-0.5 bg-[#00F2FE] rounded-full animate-float-particle"
                style={{
                    left: `${Math.random() * 100}%`,
                    top: `${Math.random() * 100}%`,
                    animationDelay: `${Math.random() * 5}s`,
                    animationDuration: `${12 + Math.random() * 10}s`,
                    opacity: 0.1 + Math.random() * 0.3
                }}
            />
        ))}
    </div>
);

const ComparisonBar: React.FC<{ 
    label: string, 
    v1: number | string, 
    v2: number | string, 
    p1Win: boolean, 
    p2Win: boolean,
    ratio1: number,
    ratio2: number,
    index: number,
    visible: boolean
}> = ({ label, v1, v2, p1Win, p2Win, ratio1, ratio2, index, visible }) => (
    <div 
        className={`w-full mb-2 transition-all duration-700 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
        style={{ transitionDelay: `${200 + (index * 120)}ms` }}
    >
        <div className="flex justify-between items-end mb-0.5 px-1">
            <span className={`font-russo text-[11px] transition-all duration-1000 ${visible && p1Win ? 'text-[#00F2FE]' : 'text-white/20'}`}>{v1}</span>
            <span className="font-chakra font-black text-[7px] text-white/40 uppercase tracking-[0.15em] italic">{label}</span>
            <span className={`font-russo text-[11px] transition-all duration-1000 ${visible && p2Win ? 'text-[#00F2FE]' : 'text-white/20'}`}>{v2}</span>
        </div>
        <div className="flex w-full h-[1.5px] gap-2 items-center">
            <div className="flex-1 h-full bg-white/5 rounded-full overflow-hidden flex justify-end">
                <div 
                    className="h-full bg-[#00F2FE] transition-all duration-[1500ms] ease-out shadow-[0_0_8px_#00F2FE]" 
                    style={{ width: visible ? `${ratio1}%` : '0%', transitionDelay: `${400 + (index * 120)}ms` }} 
                />
            </div>
            <div className="flex-1 h-full bg-white/5 rounded-full overflow-hidden">
                <div 
                    className="h-full bg-[#00F2FE] transition-all duration-[1500ms] ease-out shadow-[0_0_8px_#00F2FE]" 
                    style={{ width: visible ? `${ratio2}%` : '0%', transitionDelay: `${400 + (index * 120)}ms` }} 
                />
            </div>
        </div>
    </div>
);

interface HubDuelProps {
    onBack?: () => void;
    p1Id: string | null;
    p2Id: string | null;
}

export const HubDuel: React.FC<HubDuelProps> = ({ p1Id, p2Id }) => {
    const { allPlayers } = useApp();
    const t = useTranslation();
    const [isBattleStarted, setIsBattleStarted] = useState(false);
    const [battleComplete, setBattleComplete] = useState(false);

    const player1 = useMemo(() => allPlayers.find(p => p.id === p1Id), [allPlayers, p1Id]);
    const player2 = useMemo(() => allPlayers.find(p => p.id === p2Id), [allPlayers, p2Id]);

    useEffect(() => {
        setIsBattleStarted(false);
        setBattleComplete(false);
    }, [p1Id, p2Id]);

    const handleInitiate = () => {
        setIsBattleStarted(true);
        // Battle mark as complete after all animations finish
        setTimeout(() => setBattleComplete(true), 1500 + (6 * 120));
    };

    const comparisonMetrics = useMemo(() => {
        if (!player1 || !player2) return [];
        const getWR = (p: Player) => p.totalGames > 0 ? Math.round((p.totalWins / p.totalGames) * 100) : 0;
        const getAwards = (p: Player) => Object.values(p.badges || {}).reduce((a, b) => a + (b || 0), 0);
        const getEfficiency = (p: Player) => p.totalSessionsPlayed > 0 ? (p.totalGoals / p.totalSessionsPlayed) : 0;

        const rawData = [
            { id: 'ovr', label: 'Overall rating', v1: player1.rating, v2: player2.rating },
            { id: 'goals', label: 'Total goals', v1: player1.totalGoals, v2: player2.totalGoals },
            { id: 'assists', label: 'Total assists', v1: player1.totalAssists, v2: player2.totalAssists },
            { id: 'wr', label: 'Win probability', v1: `${getWR(player1)}%`, v2: `${getWR(player2)}%`, raw1: getWR(player1), raw2: getWR(player2) },
            { id: 'eff', label: 'Avg goals', v1: getEfficiency(player1).toFixed(1), v2: getEfficiency(player2).toFixed(1), raw1: getEfficiency(player1), raw2: getEfficiency(player2) },
            { id: 'awards', label: 'Awards total', v1: getAwards(player1), v2: getAwards(player2) },
        ];

        return rawData.map(m => {
            const val1 = m.raw1 !== undefined ? m.raw1 : Number(m.v1);
            const val2 = m.raw2 !== undefined ? m.raw2 : Number(m.v2);
            const max = Math.max(val1, val2, 1);
            return { ...m, p1W: val1 > val2, p2W: val2 > val1, r1: (val1 / max) * 100, r2: (val2 / max) * 100 };
        });
    }, [player1, player2]);

    const winnerData = useMemo(() => {
        if (!isBattleStarted || !battleComplete) return null;
        let p1Pts = 0, p2Pts = 0;
        comparisonMetrics.forEach(m => { if (m.p1W) p1Pts++; else if (m.p2W) p2Pts++; });
        const winningText = p1Pts === p2Pts ? 'STALEMATE' : p1Pts > p2Pts ? player1?.nickname : player2?.nickname;
        return { 
            side: p1Pts === p2Pts ? 'none' : p1Pts > p2Pts ? 'p1' : 'p2', 
            text: winningText, 
            p1Score: p1Pts,
            p2Score: p2Pts
        };
    }, [isBattleStarted, battleComplete, comparisonMetrics, player1, player2]);

    const DuelSlot = ({ player, side }: { player?: Player, side: 1 | 2 }) => (
        <div className={`relative flex flex-col items-center transition-all duration-1000 ${winnerData?.side === (side === 1 ? 'p2' : 'p1') ? 'opacity-20 scale-90 grayscale' : 'opacity-100'}`}>
            {player ? (
                <div className="flex flex-col items-center">
                    <div className="relative mb-4">
                        <div className={`absolute inset-0 rounded-full blur-2xl opacity-20 transition-all duration-1000 ${winnerData?.side === (side === 1 ? 'p1' : 'p2') ? 'bg-[#00F2FE]' : 'bg-white/5'}`}></div>
                        <PlayerAvatar 
                            player={player} 
                            className={`w-24 h-24 md:w-36 md:h-36 lg:w-44 lg:h-44 rounded-full border-[3px] transition-all duration-1000 relative z-10
                                ${winnerData?.side === (side === 1 ? 'p1' : 'p2') ? 'border-[#00F2FE] shadow-[0_0_30px_rgba(0,242,254,0.4)] scale-105' : 'border-white/10 shadow-xl'}`}
                        />
                    </div>
                    {/* Strictly centered text under photo */}
                    <div className="text-center w-full max-w-[120px] md:max-w-[180px]">
                        <span className="font-russo text-lg md:text-xl text-white uppercase tracking-wider block drop-shadow-[0_0_10px_rgba(255,255,255,0.2)] truncate">
                            {player.nickname}
                        </span>
                        <span className="font-chakra text-[7px] md:text-[8px] font-black text-white/30 uppercase tracking-[0.3em] mt-1 block truncate">
                            {player.surname || 'LEGIONNAIRE'}
                        </span>
                    </div>
                </div>
            ) : (
                <div className="w-24 h-24 md:w-36 md:h-36 lg:w-44 lg:h-44 rounded-full border-2 border-dashed border-white/5 bg-white/[0.01] flex flex-col items-center justify-center group/slot transition-all hover:border-[#00F2FE]/20">
                    <Target className="w-8 h-8 text-white/5 animate-pulse" />
                    <span className="text-[7px] font-black text-white/10 uppercase tracking-[0.3em] mt-3">Await Unit</span>
                </div>
            )}
        </div>
    );

    return (
        <div className="absolute inset-0 flex flex-col animate-in fade-in duration-1000 overflow-hidden rounded-[2.5rem]">
            {/* TERMINAL BACKGROUND - Matched to Hub */}
            <div className="absolute inset-0 pointer-events-none z-0">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#0a1121] via-[#01040a] to-black"></div>
                <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]"></div>
            </div>

            <ParticleBackground />

            {/* NEON BRANDED HEADER - Fixed sizes */}
            <div className="relative z-10 pt-10 pb-4 flex flex-col items-center">
                 <div className="flex flex-col items-center group">
                    <span className="font-blackops text-[36px] md:text-[48px] text-[#00F2FE] uppercase tracking-[0.1em] italic leading-none transition-all duration-700" style={{ textShadow: '0 0 15px rgba(0, 242, 254, 0.4)' }}>DUEL</span>
                    <div className="h-[1.5px] w-40 md:w-56 bg-gradient-to-r from-transparent via-[#00F2FE] to-transparent mt-1 shadow-[0_0_10px_#00F2FE]"></div>
                    <span className="text-[6px] md:text-[7px] font-black text-white/20 uppercase tracking-[0.5em] mt-1.5">SIMULATION PROTOCOL V5.3.2</span>
                 </div>
            </div>

            <div className="relative z-10 flex-grow flex flex-col items-center justify-center px-4 md:px-12 pb-16">
                <div className="flex items-center justify-around w-full max-w-6xl gap-4 md:gap-12 relative">
                    <DuelSlot player={player1} side={1} />
                    
                    {/* Center Action Area - Adaptive sizes */}
                    <div className="flex flex-col items-center shrink-0 w-full max-w-[180px] md:max-w-[280px] lg:max-w-[340px] px-2">
                        {isBattleStarted ? (
                            <div className="w-full flex flex-col">
                                {comparisonMetrics.map((m, idx) => (
                                    <ComparisonBar 
                                        key={m.id} label={m.label} v1={m.v1} v2={m.v2} p1Win={m.p1W} p2Win={m.p2W} 
                                        ratio1={m.r1} ratio2={m.r2} index={idx} visible={isBattleStarted}
                                    />
                                ))}
                                
                                {battleComplete && winnerData && (
                                    <div className="mt-6 flex flex-col items-center animate-in zoom-in fade-in duration-1000">
                                        <div className="px-6 py-2 rounded-xl bg-[#00F2FE]/5 border border-[#00F2FE]/40 shadow-[0_0_20px_rgba(0,242,254,0.15)]">
                                             <span className="font-russo text-lg text-white tracking-[0.1em] uppercase italic">
                                                {winnerData.side === 'none' ? 'STALEMATE' : `${winnerData.text} WINS`}
                                             </span>
                                        </div>
                                        <div className="mt-4 flex items-center gap-6">
                                             <div className="flex flex-col items-center">
                                                <span className="text-xl font-black font-russo text-[#00F2FE]">{winnerData.p1Score}</span>
                                                <span className="text-[6px] font-bold text-white/20 uppercase tracking-widest">PTS</span>
                                             </div>
                                             <div className="h-6 w-[1px] bg-white/10"></div>
                                             <div className="flex flex-col items-center">
                                                <span className="text-xl font-black font-russo text-white/60">{winnerData.p2Score}</span>
                                                <span className="text-[6px] font-bold text-white/20 uppercase tracking-widest">PTS</span>
                                             </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center gap-6">
                                <div className="w-16 h-16 rounded-full border border-white/5 flex items-center justify-center bg-black/40 shadow-inner">
                                    <span className="font-blackops text-4xl text-white/5 italic">VS</span>
                                </div>
                                {player1 && player2 ? (
                                    <button 
                                        onClick={handleInitiate}
                                        className="relative group/btn py-4 px-10 rounded-xl overflow-hidden transition-all active:scale-95"
                                    >
                                        <div className="absolute inset-0 bg-[#00F2FE]/10 border border-[#00F2FE]/50 shadow-[0_0_20px_rgba(0,242,254,0.15)] rounded-xl group-hover/btn:bg-[#00F2FE]/20 group-hover/btn:border-[#00F2FE] transition-all"></div>
                                        <span className="relative z-10 font-russo text-xs text-[#00F2FE] tracking-[0.3em] uppercase group-hover/btn:text-white transition-colors">{t.duel_initiate}</span>
                                    </button>
                                ) : (
                                    <div className="flex flex-col items-center gap-2">
                                        <p className="text-[9px] font-chakra font-black text-white/20 tracking-[0.2em] uppercase animate-pulse text-center leading-relaxed">Select 2 units from roster<br/>to process efficiency</p>
                                        <div className="h-[1px] w-24 bg-white/5"></div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    <DuelSlot player={player2} side={2} />
                </div>
            </div>

            <style dangerouslySetInnerHTML={{ __html: `
                @keyframes float-particle {
                    0%, 100% { transform: translateY(0) translateX(0); }
                    33% { transform: translateY(-20px) translateX(15px); }
                    66% { transform: translateY(10px) translateX(-10px); }
                }
                .animate-float-particle { animation: float-particle linear infinite; }
            `}} />
        </div>
    );
};
