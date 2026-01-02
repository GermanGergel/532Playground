import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '../context';
import { Player } from '../types';
import { Zap } from '../icons';
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
    isVisible: boolean
}> = ({ label, v1, v2, p1Win, p2Win, ratio1, ratio2, isVisible }) => (
    <div 
        className={`w-full mb-2 transition-all duration-700 ease-out ${isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4'}`}
    >
        <div className="flex justify-between items-end mb-0.5 px-1">
            <span className={`font-russo text-[14px] transition-all duration-1000 ${isVisible && p1Win ? 'text-[#00F2FE] scale-110' : 'text-white/20'}`} style={{ textShadow: isVisible && p1Win ? '0 0 10px rgba(0,242,254,0.5)' : 'none' }}>{v1}</span>
            <span className="font-chakra font-black text-[8px] text-white/40 uppercase tracking-[0.15em] italic">{label}</span>
            <span className={`font-russo text-[14px] transition-all duration-1000 ${isVisible && p2Win ? 'text-white scale-110' : 'text-white/20'}`}>{v2}</span>
        </div>
        <div className="flex w-full h-[3px] gap-2 items-center bg-white/[0.02] rounded-full overflow-hidden p-[1px]">
            <div className="flex-1 h-full flex justify-end">
                <div 
                    className="h-full bg-[#00F2FE] transition-all duration-[1200ms] ease-out rounded-l-full" 
                    style={{ width: isVisible ? `${ratio1}%` : '0%', boxShadow: isVisible && p1Win ? '0 0 10px #00F2FE' : 'none' }} 
                />
            </div>
            <div className="flex-1 h-full">
                <div 
                    className="h-full bg-white transition-all duration-[1200ms] ease-out rounded-r-full" 
                    style={{ width: isVisible ? `${ratio2}%` : '0%', boxShadow: isVisible && p2Win ? '0 0 10px #fff' : 'none' }} 
                />
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
    const [showSequence, setShowSequence] = useState(false);
    const [visibleRows, setVisibleRows] = useState(0);
    const [showWinner, setShowWinner] = useState(false);

    const player1 = useMemo(() => allPlayers.find(p => p.id === p1Id), [allPlayers, p1Id]);
    const player2 = useMemo(() => allPlayers.find(p => p.id === p2Id), [allPlayers, p2Id]);

    useEffect(() => {
        setIsCalculating(false);
        setShowSequence(false);
        setVisibleRows(0);
        setShowWinner(false);
    }, [p1Id, p2Id]);

    const comparisonMetrics = useMemo(() => {
        if (!player1 || !player2) return [];
        
        const getWR = (p: Player) => p.totalGames > 0 ? Math.round((p.totalWins / p.totalGames) * 100) : 0;
        const getAwards = (p: Player) => Object.values(p.badges || {}).reduce((a, b) => a + (b || 0), 0);
        const getAvgGoals = (p: Player) => p.totalSessionsPlayed > 0 ? (p.totalGoals / p.totalSessionsPlayed) : 0;
        const getAvgAssists = (p: Player) => p.totalSessionsPlayed > 0 ? (p.totalAssists / p.totalSessionsPlayed) : 0;
        const getFormVal = (p: Player) => p.form === 'hot_streak' ? 3 : p.form === 'stable' ? 2 : 1;
        const getEfficiency = (p: Player) => {
            const wr = getWR(p);
            const goals = getAvgGoals(p);
            return (wr * 0.5) + (goals * 10);
        };

        const rawData = [
            { id: 'ovr', label: 'Overall Rating', v1: player1.rating, v2: player2.rating },
            { id: 'wr', label: 'Win Probability', v1: `${getWR(player1)}%`, v2: `${getWR(player2)}%`, r1: getWR(player1), r2: getWR(player2) },
            { id: 'exp', label: 'Battle Experience', v1: player1.totalSessionsPlayed, v2: player2.totalSessionsPlayed },
            { id: 'goals', label: 'Scoring Power', v1: player1.totalGoals, v2: player2.totalGoals },
            { id: 'avgG', label: 'Avg Goals / Sess', v1: getAvgGoals(player1).toFixed(1), v2: getAvgGoals(player2).toFixed(1), r1: getAvgGoals(player1), r2: getAvgGoals(player2) },
            { id: 'assists', label: 'Playmaking', v1: player1.totalAssists, v2: player2.totalAssists },
            { id: 'avgA', label: 'Avg Assists / Sess', v1: getAvgAssists(player1).toFixed(1), v2: getAvgAssists(player2).toFixed(1), r1: getAvgAssists(player1), r2: getAvgAssists(player2) },
            { id: 'peak', label: 'Peak Performance', v1: player1.records?.bestGoalsInSession?.value || 0, v2: player2.records?.bestGoalsInSession?.value || 0 },
            { id: 'awards', label: 'Trophy Cabinet', v1: getAwards(player1), v2: getAwards(player2) },
            { id: 'wins', label: 'Victory Count', v1: player1.totalWins, v2: player2.totalWins },
            { id: 'draws', label: 'Stability Index', v1: player1.totalDraws, v2: player2.totalDraws },
            { id: 'form', label: 'Current Momentum', v1: player1.form.split('_')[0].toUpperCase(), v2: player2.form.split('_')[0].toUpperCase(), r1: getFormVal(player1), r2: getFormVal(player2) },
        ];

        return rawData.map(m => {
            const val1 = m.hasOwnProperty('r1') ? m.r1! : Number(m.v1);
            const val2 = m.hasOwnProperty('r2') ? m.r2! : Number(m.v2);
            const max = Math.max(val1, val2, 1);
            return { 
                ...m, 
                p1W: val1 > val2, 
                p2W: val2 > val1, 
                r1_final: (val1 / max) * 100, 
                r2_final: (val2 / max) * 100 
            };
        });
    }, [player1, player2]);

    const handleStartSequence = () => {
        if (!player1 || !player2) return;
        setIsCalculating(true);
        setTimeout(() => {
            setIsCalculating(false);
            setShowSequence(true);
            comparisonMetrics.forEach((_, idx) => {
                setTimeout(() => {
                    setVisibleRows(prev => prev + 1);
                }, (idx + 1) * 200); 
            });
            setTimeout(() => {
                setShowWinner(true);
            }, (comparisonMetrics.length * 200) + 600);
        }, 800);
    };

    const winnerInfo = useMemo(() => {
        if (!showWinner) return null;
        let p1Pts = 0, p2Pts = 0;
        comparisonMetrics.forEach(m => { if (m.p1W) p1Pts++; else if (m.p2W) p2Pts++; });
        const name = p1Pts === p2Pts ? 'EQUAL POTENTIAL' : p1Pts > p2Pts ? player1?.nickname : player2?.nickname;
        return { 
            side: p1Pts === p2Pts ? 'none' : p1Pts > p2Pts ? 'p1' : 'p2', 
            name, 
            p1Score: p1Pts, 
            p2Score: p2Pts 
        };
    }, [showWinner, comparisonMetrics, player1, player2]);

    const PlayerUnit = ({ player, side }: { player?: Player, side: 'p1' | 'p2' }) => {
        const isWinner = winnerInfo?.side === side;
        const isLoser = showWinner && winnerInfo?.side !== side && winnerInfo?.side !== 'none';
        
        return (
            <div className={`relative flex flex-col items-center gap-3 transition-all duration-1000 ${isLoser ? 'opacity-20 scale-90 grayscale blur-[1px]' : ''}`}>
                {player ? (
                    <>
                        <div className={`relative p-1 rounded-full border-2 transition-all duration-700 ${side === 'p1' ? 'border-[#00F2FE]' : 'border-white'} ${isWinner ? 'shadow-[0_0_50px_rgba(0,242,254,0.4)] scale-110' : 'shadow-2xl'}`}>
                            <PlayerAvatar player={player} size="xl" className="w-24 h-24 md:w-32 md:h-32 lg:w-40 lg:h-40" />
                        </div>
                        <div className="text-center w-full max-w-[140px] px-1 flex flex-col items-center gap-0.5">
                            <span className="font-russo text-lg md:text-xl uppercase tracking-tight text-white block leading-[1.1] break-words w-full">
                                {player.nickname}
                            </span>
                            {player.surname && (
                                <span className="font-chakra text-[10px] md:text-xs font-black uppercase tracking-widest text-white/30 block leading-tight break-words w-full">
                                    {player.surname}
                                </span>
                            )}
                        </div>
                    </>
                ) : (
                    <div className="w-24 h-24 md:w-32 md:h-32 lg:w-40 lg:h-40 rounded-full border-2 border-dashed border-white/10 bg-white/[0.01] flex flex-col items-center justify-center gap-3">
                        <Zap className="w-8 h-8 text-white/5 animate-pulse" />
                        <span className="text-[7px] font-black text-white/20 uppercase tracking-[0.4em] text-center">AWAITING<br/>DATA UPLINK</span>
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="h-full w-full flex flex-col items-center justify-start pt-6 px-6 relative overflow-hidden">
            <ParticleBackground />

            {/* COMPACT BROADCAST HEADER */}
            <div className="text-center mb-8 relative z-10">
                <div className="flex flex-col items-center">
                    <div className="flex items-center gap-3">
                        <div className="h-px w-8 bg-gradient-to-r from-transparent to-[#00F2FE]"></div>
                        <h2 className="font-blackops italic text-lg md:text-xl text-[#00F2FE] tracking-[0.15em] uppercase">
                            BATTLE SIMULATION
                        </h2>
                        <div className="h-px w-8 bg-gradient-to-l from-transparent to-[#00F2FE]"></div>
                    </div>
                </div>
            </div>

            {/* MAIN BATTLE GROUND */}
            <div className="flex items-start justify-center w-full max-w-5xl gap-4 md:gap-12 relative z-10">
                <PlayerUnit player={player1} side="p1" />

                {/* CENTRAL ANALYTICS COLUMN */}
                <div className="flex flex-col flex-grow max-w-[300px] md:max-w-[400px] pt-4">
                    {!showSequence ? (
                        <div className="flex flex-col items-center justify-center min-h-[320px] animate-in fade-in duration-700">
                            <div className="w-full py-8 flex flex-col items-center gap-6 relative">
                                {player1 && player2 ? (
                                    <button 
                                        onClick={handleStartSequence}
                                        disabled={isCalculating}
                                        className="relative group overflow-hidden bg-black border border-[#00F2FE]/40 px-10 py-4 rounded-2xl transition-all hover:border-[#00F2FE] hover:shadow-[0_0_30px_rgba(0,242,254,0.4)] active:scale-95 disabled:opacity-50"
                                    >
                                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#00F2FE]/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                                        <span className="relative z-10 font-russo text-[11px] text-[#00F2FE] uppercase tracking-[0.4em] group-hover:text-white transition-colors">
                                            {isCalculating ? 'ANALYZING...' : 'START SEQUENCE'}
                                        </span>
                                    </button>
                                ) : (
                                    <div className="text-center px-6 relative z-10">
                                        <p className="font-chakra font-bold text-[9px] text-white/30 uppercase tracking-[0.3em] leading-loose">
                                            Tactical analysis offline<br/>
                                            <span className="text-[#00F2FE]/40 italic">Select units for simulation</span>
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col w-full h-full min-h-[320px]">
                             <div className="flex flex-col w-full mb-6">
                                {comparisonMetrics.map((m, idx) => (
                                    <ComparisonBar 
                                        key={m.id} 
                                        label={m.label} 
                                        v1={m.v1} 
                                        v2={m.v2} 
                                        p1Win={m.p1W} 
                                        p2Win={m.p2W} 
                                        ratio1={m.r1_final} 
                                        ratio2={m.r2_final} 
                                        isVisible={visibleRows > idx}
                                    />
                                ))}
                            </div>

                            {showWinner && winnerInfo && (
                                <div className="flex flex-col items-center gap-4 animate-in slide-in-from-bottom-6 fade-in duration-1000">
                                    <div className="flex flex-col items-center gap-0.5">
                                        <span className="text-[7px] font-black text-white/30 tracking-[0.4em] uppercase mb-1">SIMULATION RESULT</span>
                                        <span className={`font-russo text-3xl uppercase tracking-tighter text-center leading-none ${winnerInfo.side === 'p1' ? 'text-[#00F2FE]' : winnerInfo.side === 'p2' ? 'text-white' : 'text-slate-400'}`} style={{ textShadow: winnerInfo.side !== 'none' ? `0 0 20px ${winnerInfo.side === 'p1' ? '#00F2FE66' : '#ffffff44'}` : 'none' }}>
                                            {winnerInfo.name}
                                        </span>
                                    </div>

                                    {/* REDESIGNED SCORE UI */}
                                    <div className="relative group/score flex items-center bg-black/60 border border-white/10 rounded-2xl p-1 px-4 overflow-hidden shadow-2xl">
                                         <div className="absolute inset-0 bg-gradient-to-r from-[#00F2FE]/5 via-transparent to-white/5"></div>
                                         
                                         <div className="flex flex-col items-center px-4">
                                            <span className="text-3xl font-russo font-black text-[#00F2FE]" style={{ textShadow: '0 0 15px rgba(0,242,254,0.4)' }}>{winnerInfo.p1Score}</span>
                                         </div>
                                         
                                         <div className="h-10 w-px bg-gradient-to-b from-transparent via-[#00F2FE]/40 to-transparent"></div>
                                         <div className="px-3 flex flex-col items-center">
                                             <span className="text-[7px] font-black text-white/30 uppercase tracking-[0.2em] leading-none">RATIO</span>
                                         </div>
                                         <div className="h-10 w-px bg-gradient-to-b from-transparent via-white/20 to-transparent"></div>

                                         <div className="flex flex-col items-center px-4">
                                            <span className="text-3xl font-russo font-black text-white" style={{ textShadow: '0 0 15px rgba(255,255,255,0.2)' }}>{winnerInfo.p2Score}</span>
                                         </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <PlayerUnit player={player2} side="p2" />
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