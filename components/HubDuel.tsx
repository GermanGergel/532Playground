
import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '../context';
import { Player, PlayerStatus, SkillType } from '../types';
import { Target } from '../icons';
import { useTranslation } from '../ui';
import { PlayerAvatar } from './avatars';

// --- STYLED COMPONENTS ---

const ParticleBackground: React.FC = () => (
    <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-20">
        {[...Array(20)].map((_, i) => (
            <div 
                key={i}
                className="absolute w-0.5 h-0.5 bg-[#00F2FE] rounded-full animate-float-particle"
                style={{
                    left: `${Math.random() * 100}%`,
                    top: `${Math.random() * 100}%`,
                    animationDelay: `${Math.random() * 5}s`,
                    animationDuration: `${10 + Math.random() * 8}s`,
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
        className={`w-full mb-3 transition-all duration-700 ease-out ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
        style={{ transitionDelay: `${400 + (index * 150)}ms` }}
    >
        <div className="flex justify-between items-end mb-1 px-1">
            <span className={`font-russo text-[14px] transition-all duration-1000 ${visible && p1Win ? 'text-[#00F2FE]' : 'text-white/20'}`}>{v1}</span>
            <span className="font-chakra font-black text-[8px] text-white/40 uppercase tracking-[0.2em] italic">{label}</span>
            <span className={`font-russo text-[14px] transition-all duration-1000 ${visible && p2Win ? 'text-[#00F2FE]' : 'text-white/20'}`}>{v2}</span>
        </div>
        <div className="flex w-full h-[1.5px] gap-3 items-center">
            <div className="flex-1 h-full bg-white/5 rounded-full overflow-hidden flex justify-end">
                <div 
                    className="h-full bg-[#00F2FE] transition-all duration-[1200ms] ease-out shadow-[0_0_8px_#00F2FE]" 
                    style={{ width: visible ? `${ratio1}%` : '0%', transitionDelay: `${600 + (index * 150)}ms` }} 
                />
            </div>
            <div className="flex-1 h-full bg-white/5 rounded-full overflow-hidden">
                <div 
                    className="h-full bg-[#00F2FE] transition-all duration-[1200ms] ease-out shadow-[0_0_8px_#00F2FE]" 
                    style={{ width: visible ? `${ratio2}%` : '0%', transitionDelay: `${600 + (index * 150)}ms` }} 
                />
            </div>
        </div>
    </div>
);

interface HubDuelProps {
    onBack?: () => void;
    p1Id: string | null;
    p2Id: string | null;
    isSelectionState?: boolean;
}

export const HubDuel: React.FC<HubDuelProps> = ({ onBack, p1Id, p2Id, isSelectionState }) => {
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
        // Battle is "complete" after the last bar finishes animating
        setTimeout(() => setBattleComplete(true), 2500);
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
                    {/* Raised Photo Container */}
                    <div className="relative mb-6">
                        <div className={`absolute inset-0 rounded-full blur-2xl opacity-20 transition-all duration-1000 ${winnerData?.side === (side === 1 ? 'p1' : 'p2') ? 'bg-[#00F2FE]' : 'bg-white/5'}`}></div>
                        <PlayerAvatar 
                            player={player} 
                            className={`w-36 h-36 md:w-56 md:h-56 rounded-full border-[3px] transition-all duration-1000 relative z-10
                                ${winnerData?.side === (side === 1 ? 'p1' : 'p2') ? 'border-[#00F2FE] shadow-[0_0_40px_rgba(0,242,254,0.4)] scale-105' : 'border-white/10 shadow-2xl'}`}
                        />
                    </div>
                    {/* Centered Name Info strictly under photo */}
                    <div className="text-center">
                        <span className="font-russo text-2xl md:text-3xl text-white uppercase tracking-wider block drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]">
                            {player.nickname}
                        </span>
                        <span className="font-chakra text-[10px] md:text-xs font-black text-white/30 uppercase tracking-[0.4em] mt-1 block">
                            {player.surname || 'LEGIONNAIRE'}
                        </span>
                    </div>
                </div>
            ) : (
                <div className="w-36 h-36 md:w-56 md:h-56 rounded-full border-2 border-dashed border-white/5 bg-white/[0.01] flex flex-col items-center justify-center group/slot transition-all hover:border-[#00F2FE]/20">
                    <Target className="w-12 h-12 text-white/5 animate-pulse" />
                    <span className="text-[9px] font-black text-white/10 uppercase tracking-[0.4em] mt-4">Await Unit</span>
                </div>
            )}
        </div>
    );

    return (
        <div className="absolute inset-0 flex flex-col animate-in fade-in duration-1000 overflow-hidden rounded-[2.5rem]">
            {/* TERMINAL BACKGROUND */}
            <div className="absolute inset-0 pointer-events-none z-0">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#0a1121] via-[#01040a] to-black"></div>
                <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]"></div>
            </div>

            <ParticleBackground />

            {/* NEON BRANDED HEADER */}
            <div className="relative z-10 pt-12 pb-8 flex flex-col items-center">
                 <div className="flex flex-col items-center group">
                    <span className="font-blackops text-[44px] md:text-[56px] text-[#00F2FE] uppercase tracking-[0.1em] italic leading-none transition-all duration-700" style={{ textShadow: '0 0 20px rgba(0,242,254,0.5)' }}>DUEL</span>
                    <div className="h-[2px] w-48 md:w-64 bg-gradient-to-r from-transparent via-[#00F2FE] to-transparent mt-2 shadow-[0_0_12px_#00F2FE]"></div>
                    <span className="text-[7px] md:text-[8px] font-black text-white/20 uppercase tracking-[0.5em] mt-2">SIMULATION PROTOCOL V5.3.2</span>
                 </div>
            </div>

            <div className="relative z-10 flex-grow flex flex-col items-center justify-center px-6 md:px-12 pb-32">
                <div className="flex items-center justify-around w-full max-w-7xl gap-8 md:gap-12 relative">
                    <DuelSlot player={player1} side={1} />
                    
                    {/* Center Action & Stats Area */}
                    <div className="flex flex-col items-center shrink-0 min-w-[240px] md:min-w-[320px] px-4">
                        {isBattleStarted ? (
                            <div className="w-full flex flex-col">
                                {comparisonMetrics.map((m, idx) => (
                                    <ComparisonBar 
                                        key={m.id} label={m.label} v1={m.v1} v2={m.v2} p1Win={m.p1W} p2Win={m.p2W} 
                                        ratio1={m.r1} ratio2={m.r2} index={idx} visible={isBattleStarted}
                                    />
                                ))}
                                
                                {battleComplete && winnerData && (
                                    <div className="mt-8 flex flex-col items-center animate-in zoom-in fade-in duration-1000">
                                        <div className="px-10 py-3 rounded-2xl bg-[#00F2FE]/5 border border-[#00F2FE]/40 shadow-[0_0_30px_rgba(0,242,254,0.2)]">
                                             <span className="font-russo text-2xl text-white tracking-[0.1em] uppercase italic">
                                                {winnerData.side === 'none' ? 'STALEMATE' : `${winnerData.text} WINS`}
                                             </span>
                                        </div>
                                        <div className="mt-6 flex items-center gap-10">
                                             <div className="flex flex-col items-center">
                                                <span className="text-3xl font-black font-russo text-[#00F2FE]">{winnerData.p1Score}</span>
                                                <span className="text-[7px] font-bold text-white/20 uppercase tracking-widest mt-1">PTS</span>
                                             </div>
                                             <div className="h-8 w-[1px] bg-white/10"></div>
                                             <div className="flex flex-col items-center">
                                                <span className="text-3xl font-black font-russo text-white/60">{winnerData.p2Score}</span>
                                                <span className="text-[7px] font-bold text-white/20 uppercase tracking-widest mt-1">PTS</span>
                                             </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center gap-10">
                                <div className="w-20 h-20 rounded-full border border-white/5 flex items-center justify-center bg-black/40 shadow-inner">
                                    <span className="font-blackops text-5xl text-white/5 italic">VS</span>
                                </div>
                                {player1 && player2 ? (
                                    <button 
                                        onClick={handleInitiate}
                                        className="relative group/btn py-5 px-14 rounded-2xl overflow-hidden transition-all active:scale-95"
                                    >
                                        <div className="absolute inset-0 bg-[#00F2FE]/10 border border-[#00F2FE]/50 shadow-[0_0_25px_rgba(0,242,254,0.2)] rounded-2xl group-hover/btn:bg-[#00F2FE]/20 group-hover/btn:border-[#00F2FE] transition-all"></div>
                                        <span className="relative z-10 font-russo text-base text-[#00F2FE] tracking-[0.4em] uppercase group-hover/btn:text-white transition-colors">{t.duel_initiate}</span>
                                    </button>
                                ) : (
                                    <div className="flex flex-col items-center gap-2">
                                        <p className="text-[11px] font-chakra font-black text-white/20 tracking-[0.3em] uppercase animate-pulse">Select 2 units to process</p>
                                        <div className="h-[1px] w-32 bg-white/5"></div>
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
                    33% { transform: translateY(-30px) translateX(20px); }
                    66% { transform: translateY(15px) translateX(-15px); }
                }
                .animate-float-particle { animation: float-particle linear infinite; }
            `}} />
        </div>
    );
};
