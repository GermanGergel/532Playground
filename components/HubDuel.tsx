import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '../context';
import { Player, PlayerStatus, SkillType } from '../types';
import { Search, ChevronLeft, Zap, TrophyIcon } from '../icons';
import { Modal, useTranslation } from '../ui';
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
            <span className="font-chakra font-black text-[6px] text-white/40 uppercase tracking-[0.2em] italic">{label}</span>
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
}

export const HubDuel: React.FC<HubDuelProps> = ({ onBack, p1Id, p2Id }) => {
    const { allPlayers } = useApp();
    const t = useTranslation();
    const [showStats, setShowStats] = useState(false);
    const [battleComplete, setBattleComplete] = useState(false);

    const players = useMemo(() => {
        return allPlayers.filter(p => p.status === PlayerStatus.Confirmed);
    }, [allPlayers]);

    const player1 = players.find(p => p.id === p1Id);
    const player2 = players.find(p => p.id === p2Id);
    const isReady = !!(player1 && player2);

    useEffect(() => {
        if (isReady) {
            const timer = setTimeout(() => setShowStats(true), 600);
            const completeTimer = setTimeout(() => setBattleComplete(true), 1800);
            return () => {
                clearTimeout(timer);
                clearTimeout(completeTimer);
            };
        } else {
            setShowStats(false);
            setBattleComplete(false);
        }
    }, [isReady]);

    const comparisonMetrics = useMemo(() => {
        if (!player1 || !player2) return [];
        const getWR = (p: Player) => p.totalGames > 0 ? Math.round((p.totalWins / p.totalGames) * 100) : 0;
        const getAwards = (p: Player) => Object.values(p.badges || {}).reduce((a, b) => a + (b || 0), 0);
        const getEfficiency = (p: Player) => p.totalSessionsPlayed > 0 ? (p.totalGoals / p.totalSessionsPlayed) : 0;
        const getBestGoals = (p: Player) => p.records?.bestGoalsInSession?.value || 0;
        const getBestAssists = (p: Player) => p.records?.bestAssistsInSession?.value || 0;

        const rawData = [
            { id: 'ovr', label: 'Overall rating', v1: player1.rating, v2: player2.rating },
            { id: 'goals', label: 'Total goals', v1: player1.totalGoals, v2: player2.totalGoals },
            { id: 'assists', label: 'Total assists', v1: player1.totalAssists, v2: player2.totalAssists },
            { id: 'wr', label: 'Win probability', v1: `${getWR(player1)}%`, v2: `${getWR(player2)}%`, raw1: getWR(player1), raw2: getWR(player2) },
            { id: 'games', label: 'Matches', v1: player1.totalGames, v2: player2.totalGames },
            { id: 'eff', label: 'Avg goals', v1: getEfficiency(player1).toFixed(1), v2: getEfficiency(player2).toFixed(1), raw1: getEfficiency(player1), raw2: getEfficiency(player2) },
            { id: 'awards', label: 'Awards total', v1: getAwards(player1), v2: getAwards(player2) },
            { id: 'sessions', label: 'Total sessions', v1: player1.totalSessionsPlayed, v2: player2.totalSessionsPlayed },
            { id: 'totalWins', label: 'Total wins', v1: player1.totalWins, v2: player2.totalWins },
            { id: 'bestGoals', label: 'Best goals in sess', v1: getBestGoals(player1), v2: getBestGoals(player2) },
            { id: 'bestAssists', label: 'Best assists in sess', v1: getBestAssists(player1), v2: getBestAssists(player2) },
        ];

        return rawData.map(m => {
            const val1 = m.raw1 !== undefined ? m.raw1 : Number(m.v1);
            const val2 = m.raw2 !== undefined ? m.raw2 : Number(m.v2);
            const max = Math.max(val1, val2, 1);
            return { ...m, p1W: val1 > val2, p2W: val2 > val1, r1: (val1 / max) * 100, r2: (val2 / max) * 100 };
        });
    }, [player1, player2]);

    const winnerData = useMemo(() => {
        if (!isReady || !battleComplete) return null;
        let p1Pts = 0, p2Pts = 0;
        comparisonMetrics.forEach(m => { if (m.p1W) p1Pts++; else if (m.p2W) p2Pts++; });
        
        const winningText = p1Pts === p2Pts ? 'STALEMATE' : p1Pts > p2Pts ? player1?.nickname : player2?.nickname;
        const winningColor = p1Pts === p2Pts ? 'text-white' : p1Pts > p2Pts ? 'text-[#00F2FE]' : 'text-slate-200';

        return { 
            side: p1Pts === p2Pts ? 'none' : p1Pts > p2Pts ? 'p1' : 'p2', 
            text: winningText, 
            color: winningColor,
            p1Score: p1Pts,
            p2Score: p2Pts
        };
    }, [isReady, battleComplete, comparisonMetrics, player1, player2]);

    if (!player1 || !player2) {
        return (
            <div className="absolute inset-0 flex flex-col items-center justify-center animate-in fade-in duration-1000 overflow-hidden rounded-[2.5rem] bg-[#05070a]">
                <p className="text-white/20">Awaiting player data...</p>
                <button onClick={onBack} className="mt-4 text-sm text-[#00F2FE]">Go Back</button>
            </div>
        );
    }

    return (
        <div className="absolute inset-0 flex flex-col animate-in fade-in duration-1000 overflow-hidden rounded-[2.5rem] bg-[#05070a]">
            
            <div className="absolute inset-0 pointer-events-none z-0">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#0f172a] via-[#020617] to-black"></div>
                <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]"></div>
                
                <div className={`absolute inset-0 transition-all duration-[2000ms] ease-in-out ${
                    winnerData?.side === 'p1' ? 'bg-[#00F2FE]/5' : winnerData?.side === 'p2' ? 'bg-white/5' : 'bg-transparent'
                }`}></div>
            </div>

            <ParticleBackground />

            {/* NAVIGATION - BRANDING CENTERED STRICTLY ABOVE DUEL */}
            <div className="absolute top-0 left-0 right-0 z-50 flex items-center justify-between px-10 py-8">
                <button onClick={onBack} className="flex items-center gap-3 group transition-all ml-32 p-2 -m-2">
                    <ChevronLeft className="w-8 h-8 text-white/40 group-hover:text-[#00F2FE] transition-colors" />
                    <span className="text-[12px] font-black font-chakra uppercase tracking-[0.3em] text-white/40 group-hover:text-[#00F2FE] transition-colors">{t.summary_title ? 'Back' : 'Back'}</span>
                </button>
                
                <div className="absolute left-1/2 -translate-x-1/2 flex flex-col items-center">
                    <div className="w-10 h-[1.5px] bg-gradient-to-r from-transparent via-[#00F2FE] to-transparent"></div>
                    <span className="font-audiowide text-[10px] md:text-[11px] text-[#00F2FE] tracking-[0.3em] uppercase mt-2 text-center" style={{ textShadow: '0 0 15px rgba(0, 242, 254, 0.5)' }}>532 PLAYGROUND</span>
                </div>
            </div>

            <div className="relative z-10 flex flex-col h-full w-full items-center justify-start px-4 pt-24"> 
                
                <div className={`flex items-start justify-center w-full max-w-6xl transition-all duration-1000 ease-[cubic-bezier(0.34,1.56,0.64,1)] gap-4`}>
                    
                    {/* LEFT UNIT */}
                    <div className={`relative flex flex-col items-center gap-4 transition-all duration-1000 ${winnerData?.side === 'p2' ? 'opacity-30 scale-90 grayscale' : ''}`}>
                        <PlayerAvatar 
                            player={player1} 
                            className={`
                                w-24 h-24 md:w-36 md:h-36 lg:w-40 lg:h-40
                                transition-all duration-700 border-2 
                                ${winnerData?.side === 'p1' ? 'shadow-[0_0_40px_rgba(0,242,254,0.3)] scale-105' : 'shadow-xl'}
                                border-[#00F2FE]
                            `}
                        />
                        <span className="font-chakra font-black text-[10px] md:text-sm uppercase tracking-[0.2em] text-center transition-all duration-700 text-white mt-4">
                            {player1.nickname}
                        </span>
                    </div>

                    {/* CENTRAL TACTICAL COLUMN - MORE COMPACT WIDTH */}
                    <div className={`flex flex-col flex-grow max-w-[220px] md:max-w-[320px] transition-all duration-1000 opacity-100 translate-y-0`}>
                        
                        <div className="flex flex-col items-center mb-4">
                            <span className="font-blackops italic text-xl text-white/5 tracking-[0.5em] select-none uppercase">Duel</span>
                            <div className="h-[1px] w-full bg-gradient-to-r from-transparent via-white/10 to-transparent mt-1"></div>
                        </div>

                        {/* STATS LIST */}
                        <div className="flex flex-col w-full px-2">
                            {comparisonMetrics.map((m, idx) => (
                                <ComparisonBar 
                                    key={m.id} label={m.label} v1={m.v1} v2={m.v2} p1Win={m.p1W} p2Win={m.p2W} 
                                    ratio1={m.r1} ratio2={m.r2} index={idx} visible={showStats}
                                />
                            ))}
                        </div>
                        
                        {/* FINAL SUMMARY WITH SCORE */}
                        <div className={`mt-6 flex flex-col items-center gap-1 transition-all duration-1000 delay-[1200ms] ${showStats ? 'opacity-100' : 'opacity-0'}`}>
                            <div className="h-[1px] w-12 bg-white/10 mb-4"></div>
                            <span className="text-[7px] font-black tracking-[0.6em] text-white/30 uppercase mb-2">{t.duel_complete}</span>
                            
                            <div className="flex flex-col items-center">
                                <div className="flex items-center gap-4">
                                    <TrophyIcon className={`w-5 h-5 ${winnerData?.side === 'p1' ? 'text-[#00F2FE]' : 'text-white/20'}`} />
                                    <span className={`font-russo text-xl md:text-2xl uppercase tracking-[0.1em] ${winnerData?.color || 'text-white/5'}`}>
                                        {winnerData?.text || 'CALCULATING'}
                                    </span>
                                    <TrophyIcon className={`w-5 h-5 ${winnerData?.side === 'p2' ? 'text-slate-300' : 'text-white/20'}`} />
                                </div>
                                
                                {/* DUEL SCORE DISPLAY */}
                                {battleComplete && winnerData && (
                                    <div className="mt-2 flex flex-col items-center animate-in fade-in zoom-in duration-700">
                                        <div className="px-4 py-1 rounded-lg bg-white/[0.03] border border-white/5">
                                            <span className="font-chakra font-black text-[12px] uppercase tracking-[0.3em] text-white/80">
                                                {t.duel_score}: <span className="text-[#00F2FE]">{winnerData.p1Score}</span> — <span className="text-slate-300">{winnerData.p2Score}</span>
                                            </span>
                                        </div>
                                        <span className="text-[6px] font-mono text-white/20 uppercase tracking-[0.2em] mt-1.5">{t.duel_verified}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* RIGHT UNIT */}
                    <div className={`relative flex flex-col items-center gap-4 transition-all duration-1000 ${winnerData?.side === 'p1' ? 'opacity-30 scale-90 grayscale' : ''}`}>
                        <PlayerAvatar 
                            player={player2} 
                            className={`
                                w-24 h-24 md:w-36 md:h-36 lg:w-40 lg:h-40
                                rounded-full border-2 transition-all duration-700 overflow-hidden 
                                ${winnerData?.side === 'p2' ? 'shadow-[0_0_40px_rgba(255,255,255,0.25)] scale-105' : 'shadow-xl'}
                                border-slate-300
                            `}
                        />
                        <span className="font-chakra font-black text-[10px] md:text-sm uppercase tracking-[0.2em] text-center transition-all duration-700 text-white mt-4">
                            {player2.nickname}
                        </span>
                    </div>
                </div>

            </div>

            <style dangerouslySetInnerHTML={{ __html: `
                .font-blackops { font-family: 'Black Ops One', cursive; }
                
                @keyframes float-particle {
                    0%, 100% { transform: translateY(0) translateX(0); }
                    33% { transform: translateY(-20px) translateX(15px); }
                    66% { transform: translateY(10px) translateX(-10px); }
                }
                .animate-float-particle { animation: float-particle linear infinite; }
                
                .custom-hub-scrollbar::-webkit-scrollbar { width: 4px; }
                .custom-hub-scrollbar::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.05); border-radius: 10px; }
            `}} />
        </div>
    );
};