
import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '../context';
import { Player, PlayerStatus, SkillType } from '../types';
import { Search, ChevronLeft, Zap, TrophyIcon, Target } from '../icons';
import { useTranslation } from '../ui';
import { PlayerAvatar } from './avatars';

// --- STYLED COMPONENTS ---

const ParticleBackground: React.FC = () => (
    <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-30">
        {[...Array(15)].map((_, i) => (
            <div 
                key={i}
                className="absolute w-0.5 h-0.5 bg-[#00F2FE] rounded-full animate-float-particle"
                style={{
                    left: `${Math.random() * 100}%`,
                    top: `${Math.random() * 100}%`,
                    animationDelay: `${Math.random() * 5}s`,
                    animationDuration: `${12 + Math.random() * 10}s`,
                    opacity: 0.1 + Math.random() * 0.4
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
        className={`w-full mb-2.5 transition-all duration-700 ease-out ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}
        style={{ transitionDelay: `${index * 100}ms` }}
    >
        <div className="flex justify-between items-end mb-0.5 px-1">
            <span className={`font-russo text-[13px] transition-all duration-1000 ${visible && p1Win ? 'text-[#00F2FE]' : 'text-white/20'}`}>{v1}</span>
            <span className="font-chakra font-black text-[9px] text-white/50 uppercase tracking-[0.1em] italic">{label}</span>
            <span className={`font-russo text-[13px] transition-all duration-1000 ${visible && p2Win ? 'text-slate-200' : 'text-white/20'}`}>{v2}</span>
        </div>
        <div className="flex w-full h-[2px] gap-2 items-center">
            <div className="flex-1 h-full bg-white/5 rounded-full overflow-hidden flex justify-end">
                <div className="h-full bg-[#00F2FE] transition-all duration-[1500ms] ease-out" style={{ width: visible ? `${ratio1}%` : '0%' }} />
            </div>
            <div className="flex-1 h-full bg-white/5 rounded-full overflow-hidden">
                <div className="h-full bg-slate-300 transition-all duration-[1500ms] ease-out" style={{ width: visible ? `${ratio2}%` : '0%' }} />
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
        // Reset state when players change or mode changes
        setIsBattleStarted(false);
        setBattleComplete(false);
    }, [p1Id, p2Id]);

    const handleInitiate = () => {
        setIsBattleStarted(true);
        setTimeout(() => setBattleComplete(true), 1800);
    };

    const comparisonMetrics = useMemo(() => {
        if (!player1 || !player2) return [];
        const getWR = (p: Player) => p.totalGames > 0 ? Math.round((p.totalWins / p.totalGames) * 100) : 0;
        const getAwards = (p: Player) => Object.values(p.badges || {}).reduce((a, b) => a + (b || 0), 0);
        const getEfficiency = (p: Player) => p.totalSessionsPlayed > 0 ? (p.totalGoals / p.totalSessionsPlayed) : 0;
        const getBestGoals = (p: Player) => p.records?.bestGoalsInSession?.value || 0;

        const rawData = [
            { id: 'ovr', label: 'Overall rating', v1: player1.rating, v2: player2.rating },
            { id: 'goals', label: 'Total goals', v1: player1.totalGoals, v2: player2.totalGoals },
            { id: 'assists', label: 'Total assists', v1: player1.totalAssists, v2: player2.totalAssists },
            { id: 'wr', label: 'Win probability', v1: `${getWR(player1)}%`, v2: `${getWR(player2)}%`, raw1: getWR(player1), raw2: getWR(player2) },
            { id: 'eff', label: 'Avg goals', v1: getEfficiency(player1).toFixed(1), v2: getEfficiency(player2).toFixed(1), raw1: getEfficiency(player1), raw2: getEfficiency(player2) },
            { id: 'awards', label: 'Awards total', v1: getAwards(player1), v2: getAwards(player2) },
            { id: 'totalWins', label: 'Total wins', v1: player1.totalWins, v2: player2.totalWins },
            { id: 'bestGoals', label: 'Best goals', v1: getBestGoals(player1), v2: getBestGoals(player2) },
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
        <div className={`relative flex flex-col items-center gap-6 transition-all duration-700 ${winnerData?.side === (side === 1 ? 'p2' : 'p1') ? 'opacity-30 scale-90 grayscale' : 'opacity-100'}`}>
            {player ? (
                <div className="animate-in zoom-in duration-500 flex flex-col items-center">
                    <PlayerAvatar 
                        player={player} 
                        className={`w-32 h-32 md:w-48 md:h-48 rounded-full border-4 transition-all duration-700 
                            ${winnerData?.side === (side === 1 ? 'p1' : 'p2') ? 'border-[#00F2FE] shadow-[0_0_50px_rgba(0,242,254,0.4)] scale-110' : 'border-white/10 shadow-2xl'}`}
                    />
                    <span className="font-russo text-xl md:text-2xl text-white uppercase tracking-widest mt-6 drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]">{player.nickname}</span>
                </div>
            ) : (
                <div className="w-32 h-32 md:w-48 md:h-48 rounded-full border-2 border-dashed border-white/5 bg-white/[0.02] flex flex-col items-center justify-center group/slot transition-all hover:border-[#00F2FE]/30">
                    <Target className="w-10 h-10 text-white/5 animate-pulse" />
                    <span className="text-[8px] font-black text-white/20 uppercase tracking-[0.3em] mt-3">Await Selection</span>
                </div>
            )}
        </div>
    );

    return (
        <div className="absolute inset-0 flex flex-col animate-in fade-in duration-1000 overflow-hidden rounded-[2.5rem]">
            <div className="absolute inset-0 pointer-events-none z-0">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#0f172a] via-[#020617] to-black"></div>
                <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]"></div>
            </div>

            <ParticleBackground />

            {/* Preparation Header */}
            <div className="relative z-10 pt-10 pb-6 text-center">
                <h2 className="font-orbitron text-2xl font-black text-white tracking-[0.4em] uppercase opacity-80">
                    {battleComplete ? 'SIMULATION COMPLETE' : 'BATTLE PREPARATION'}
                </h2>
                <div className="h-px w-48 bg-gradient-to-r from-transparent via-[#00F2FE]/40 to-transparent mx-auto mt-4"></div>
            </div>

            <div className="relative z-10 flex-grow flex flex-col items-center justify-center px-8 pb-32">
                <div className="flex items-center justify-center w-full max-w-6xl gap-12 md:gap-24 relative">
                    <DuelSlot player={player1} side={1} />
                    
                    {/* Center Action Area */}
                    <div className="flex flex-col items-center shrink-0 min-w-[200px]">
                        {isBattleStarted ? (
                            <div className="w-full flex flex-col gap-1">
                                {comparisonMetrics.map((m, idx) => (
                                    <ComparisonBar 
                                        key={m.id} label={m.label} v1={m.v1} v2={m.v2} p1Win={m.p1W} p2Win={m.p2W} 
                                        ratio1={m.r1} ratio2={m.r2} index={idx} visible={isBattleStarted}
                                    />
                                ))}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center gap-8">
                                <div className="w-16 h-16 rounded-full border-2 border-white/5 flex items-center justify-center bg-black/40">
                                    <span className="font-blackops text-4xl text-white/5 italic">VS</span>
                                </div>
                                {player1 && player2 ? (
                                    <button 
                                        onClick={handleInitiate}
                                        className="relative group/btn py-4 px-10 rounded-2xl overflow-hidden transition-all active:scale-95"
                                    >
                                        <div className="absolute inset-0 bg-[#00F2FE]/20 border border-[#00F2FE] shadow-[0_0_20px_rgba(0,242,254,0.3)] rounded-2xl group-hover/btn:bg-[#00F2FE]/30 transition-all"></div>
                                        <span className="relative z-10 font-russo text-sm text-white tracking-[0.3em] uppercase">{t.duel_initiate}</span>
                                    </button>
                                ) : (
                                    <p className="text-[10px] font-chakra font-bold text-white/30 tracking-[0.2em] uppercase animate-pulse">Select 2 Units to Begin</p>
                                )}
                            </div>
                        )}
                    </div>

                    <DuelSlot player={player2} side={2} />
                </div>

                {/* Final Score Overlay */}
                {battleComplete && winnerData && (
                    <div className="mt-12 flex flex-col items-center animate-in zoom-in fade-in duration-1000">
                        <div className="px-8 py-3 rounded-2xl bg-[#00F2FE]/5 border border-[#00F2FE]/30 shadow-[0_0_30px_rgba(0,242,254,0.1)]">
                             <span className="font-russo text-2xl text-white tracking-widest uppercase">
                                {winnerData.side === 'none' ? 'DRAW' : `${winnerData.text} VICTORIOUS`}
                             </span>
                        </div>
                        <div className="mt-4 flex gap-8">
                             <div className="flex flex-col items-center"><span className="text-3xl font-black font-russo text-[#00F2FE]">{winnerData.p1Score}</span><span className="text-[8px] font-bold text-white/20 uppercase tracking-widest">UNIT 01</span></div>
                             <div className="h-10 w-px bg-white/10"></div>
                             <div className="flex flex-col items-center"><span className="text-3xl font-black font-russo text-slate-300">{winnerData.p2Score}</span><span className="text-[8px] font-bold text-white/20 uppercase tracking-widest">UNIT 02</span></div>
                        </div>
                    </div>
                )}
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
