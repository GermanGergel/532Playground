
import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '../context';
import { Player, PlayerStatus } from '../types';
import { TrophyIcon, Zap, XCircle } from '../icons';
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
    p1Id: string | null;
    p2Id: string | null;
}

export const HubDuel: React.FC<HubDuelProps> = ({ p1Id, p2Id }) => {
    const { allPlayers } = useApp();
    const t = useTranslation();
    const [isCalculating, setIsCalculating] = useState(false);
    const [showResults, setShowResults] = useState(false);
    const [battleComplete, setBattleComplete] = useState(false);

    const player1 = useMemo(() => allPlayers.find(p => p.id === p1Id), [allPlayers, p1Id]);
    const player2 = useMemo(() => allPlayers.find(p => p.id === p2Id), [allPlayers, p2Id]);

    // Сброс результатов при смене игроков
    useEffect(() => {
        setIsCalculating(false);
        setShowResults(false);
        setBattleComplete(false);
    }, [p1Id, p2Id]);

    const handleInitiate = () => {
        if (!player1 || !player2) return;
        setIsCalculating(true);
        // Эффект «загрузки» данных
        setTimeout(() => {
            setIsCalculating(false);
            setShowResults(true);
            setTimeout(() => setBattleComplete(true), 1200);
        }, 1500);
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
            { id: 'bestGoals', label: 'Best goals in sess', v1: getBestGoals(player1), v2: getBestGoals(player2) },
        ];

        return rawData.map(m => {
            const val1 = m.raw1 !== undefined ? m.raw1 : Number(m.v1);
            const val2 = m.raw2 !== undefined ? m.raw2 : Number(m.v2);
            const max = Math.max(val1, val2, 1);
            return { ...m, p1W: val1 > val2, p2W: val2 > val1, r1: (val1 / max) * 100, r2: (val2 / max) * 100 };
        });
    }, [player1, player2]);

    const winnerData = useMemo(() => {
        if (!battleComplete) return null;
        let p1Pts = 0, p2Pts = 0;
        comparisonMetrics.forEach(m => { if (m.p1W) p1Pts++; else if (m.p2W) p2Pts++; });
        const text = p1Pts === p2Pts ? 'STALEMATE' : p1Pts > p2Pts ? player1?.nickname : player2?.nickname;
        return { 
            side: p1Pts === p2Pts ? 'none' : p1Pts > p2Pts ? 'p1' : 'p2', 
            text, 
            p1Score: p1Pts, 
            p2Score: p2Pts 
        };
    }, [battleComplete, comparisonMetrics, player1, player2]);

    const PlayerSlot = ({ player, side }: { player?: Player, side: 'p1' | 'p2' }) => (
        <div className={`relative flex flex-col items-center gap-4 transition-all duration-1000 ${showResults && winnerData?.side !== side && winnerData?.side !== 'none' ? 'opacity-30 scale-90 grayscale' : ''}`}>
            {player ? (
                <>
                    <div className={`p-1 rounded-full border-2 transition-all duration-700 ${side === 'p1' ? 'border-[#00F2FE]' : 'border-slate-300'} ${showResults && winnerData?.side === side ? 'shadow-[0_0_40px_rgba(0,242,254,0.3)] scale-105' : 'shadow-xl'}`}>
                        <PlayerAvatar player={player} size="xl" className="w-24 h-24 md:w-36 md:h-36 lg:w-40 lg:h-40" />
                    </div>
                    <span className="font-chakra font-black text-xs md:text-sm uppercase tracking-[0.2em] text-center text-white mt-2">
                        {player.nickname}
                    </span>
                </>
            ) : (
                <div className="w-24 h-24 md:w-36 md:h-36 lg:w-40 lg:h-40 rounded-full border-2 border-dashed border-white/5 bg-white/[0.02] flex flex-col items-center justify-center gap-2">
                    <Zap className="w-8 h-8 text-white/5 animate-pulse" />
                    <span className="text-[8px] font-black text-white/20 uppercase tracking-widest">{t.legionnaire_select}</span>
                </div>
            )}
        </div>
    );

    return (
        <div className="h-full w-full flex flex-col items-center justify-start pt-20 px-6 relative">
            <ParticleBackground />

            {/* HEADER */}
            <div className="text-center mb-12 relative z-10">
                <div className="flex flex-col items-center">
                    <div className="w-16 h-[1px] bg-gradient-to-r from-transparent via-[#00F2FE] to-transparent mb-4"></div>
                    <h2 className="font-audiowide text-sm md:text-lg text-[#00F2FE] tracking-[0.4em] uppercase" style={{ textShadow: '0 0 15px rgba(0, 242, 254, 0.4)' }}>
                        BATTLE SIMULATION
                    </h2>
                    <span className="text-[7px] font-black text-white/20 uppercase tracking-[0.6em] mt-2 font-mono">PROTOCOL VER 5.3.2</span>
                </div>
            </div>

            {/* DUEL AREA */}
            <div className="flex items-start justify-center w-full max-w-5xl gap-6 md:gap-12 relative z-10">
                <PlayerSlot player={player1} side="p1" />

                {/* CENTRAL COLUMN */}
                <div className="flex flex-col flex-grow max-w-[280px] md:max-w-[350px] pt-4">
                    {!showResults ? (
                        <div className="flex flex-col items-center justify-center min-h-[300px]">
                            <div className="w-full border-y border-white/5 py-8 flex flex-col items-center gap-6">
                                <div className="font-blackops italic text-4xl text-white/5 tracking-[0.4em] select-none uppercase">VS</div>
                                
                                {player1 && player2 ? (
                                    <button 
                                        onClick={handleInitiate}
                                        disabled={isCalculating}
                                        className="relative group overflow-hidden bg-black border border-[#00F2FE]/30 px-8 py-4 rounded-2xl transition-all hover:border-[#00F2FE] hover:shadow-[0_0_25px_rgba(0,242,254,0.3)] active:scale-95 disabled:opacity-50"
                                    >
                                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#00F2FE]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                        <span className="relative z-10 font-russo text-[12px] text-[#00F2FE] uppercase tracking-[0.3em] group-hover:text-white transition-colors">
                                            {isCalculating ? 'CALCULATING...' : 'START SEQUENCE'}
                                        </span>
                                    </button>
                                ) : (
                                    <div className="text-center px-4">
                                        <p className="font-chakra font-bold text-[9px] text-white/30 uppercase tracking-[0.2em] leading-relaxed">
                                            Awaiting tactical units<br/>Select two players from the list
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="animate-in fade-in zoom-in duration-700">
                             <div className="flex flex-col w-full mb-6">
                                {comparisonMetrics.map((m, idx) => (
                                    <ComparisonBar 
                                        key={m.id} label={m.label} v1={m.v1} v2={m.v2} p1Win={m.p1W} p2Win={m.p2W} 
                                        ratio1={m.r1} ratio2={m.r2} index={idx} visible={showResults}
                                    />
                                ))}
                            </div>

                            {battleComplete && winnerData && (
                                <div className="flex flex-col items-center gap-3 animate-in slide-in-from-bottom-4 duration-700">
                                    <div className="h-px w-16 bg-white/10"></div>
                                    <div className="flex items-center gap-4">
                                        <TrophyIcon className={`w-5 h-5 ${winnerData.side === 'p1' ? 'text-[#00F2FE]' : 'text-white/10'}`} />
                                        <span className={`font-russo text-2xl uppercase tracking-widest ${winnerData.side === 'p1' ? 'text-[#00F2FE]' : winnerData.side === 'p2' ? 'text-slate-200' : 'text-white'}`}>
                                            {winnerData.text}
                                        </span>
                                        <TrophyIcon className={`w-5 h-5 ${winnerData.side === 'p2' ? 'text-slate-200' : 'text-white/10'}`} />
                                    </div>
                                    <div className="px-4 py-1 rounded-lg bg-white/[0.03] border border-white/5">
                                        <span className="font-chakra font-black text-sm uppercase tracking-[0.3em] text-white/80">
                                            {t.duel_score}: <span className="text-[#00F2FE]">{winnerData.p1Score}</span> — <span className="text-slate-300">{winnerData.p2Score}</span>
                                        </span>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <PlayerSlot player={player2} side="p2" />
            </div>

            <style dangerouslySetInnerHTML={{ __html: `
                .font-blackops { font-family: 'Black Ops One', cursive; }
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
