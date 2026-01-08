import React, { useEffect, useMemo, useState } from 'react';
import { useApp } from '../context';
import { Player, PlayerStatus, PlayerTier } from '../types';
import { convertCountryCodeAlpha3ToAlpha2 } from '../utils/countries';
import { Calendar } from '../icons';

interface TeamOfTheMonthModalProps {
    isOpen: boolean;
    onClose: () => void;
}

interface DisplayPlayer {
    player: Player;
    role: string;
    statLabel: string;
    statValue: string | number;
}

// Updated: Deep Dark Blue Sky with a tiny hint of Turquoise/Petrol
const StarrySky: React.FC = () => {
    return (
        <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden bg-[#020408]">
            {/* Deep gradient: Shifted from #0f172a (Navy) to #0c2d3a (Dark Petrol/Teal) at the top */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,_#0c2d3a_0%,_#020408_80%)] opacity-100"></div>
            
            {/* Very subtle ambient light from top center */}
            <div className="absolute top-[-20%] left-1/2 -translate-x-1/2 w-[80%] h-[60%] bg-[radial-gradient(ellipse_at_center,_rgba(0,242,254,0.04),_transparent_70%)] blur-[80px] pointer-events-none z-10"></div>
        </div>
    );
};

const PlayerPodium: React.FC<{ x: string; y: string; data: DisplayPlayer; accentColor?: string; scale?: number }> = ({ x, y, data, accentColor = "#00F2FE", scale = 1 }) => {
    const { player, role, statLabel, statValue } = data;
    const countryCode = player.countryCode ? convertCountryCodeAlpha3ToAlpha2(player.countryCode) : 'VN';
    const flagUrl = countryCode ? `https://flagcdn.com/w40/${countryCode.toLowerCase()}.png` : '';
    
    // Unified Constants
    const SKY_BORDER = '#1e293b'; 
    const TURQUOISE_RATING = '#00F2FE';

    return (
        <div 
            className="absolute transform -translate-x-1/2 -translate-y-1/2 z-50"
            style={{ left: x, top: y, transform: `translate(-50%, -50%) scale(${scale})` }}
        >
            <div className="relative flex flex-col items-center gap-3">
                
                {/* --- PLAYER CARD --- */}
                <div className="relative z-50 animate-float-slow">
                    <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 w-24 h-5 bg-black/60 blur-xl rounded-full pointer-events-none"></div>

                    <div 
                        className="w-36 h-52 rounded-2xl relative overflow-hidden flex flex-col shadow-2xl bg-[#0a0c10]"
                        style={{
                            border: `1px solid ${SKY_BORDER}`,
                            boxShadow: `0 0 20px ${SKY_BORDER}40, 0 20px 50px rgba(0,0,0,0.8)`,
                            backgroundColor: '#0a0c10' // Fully opaque
                        }}
                    >
                        {player.playerCard ? (
                            <div 
                                className="absolute inset-0 bg-cover bg-center bg-no-repeat"
                                style={{ backgroundImage: `url(${player.playerCard})`, backgroundPosition: 'center 5%' }}
                            ></div>
                        ) : (
                            <div className="absolute inset-0 bg-gradient-to-b from-gray-700 to-black"></div>
                        )}
                        
                        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent"></div>
                        
                        <div className="relative z-10 h-full flex flex-col justify-between p-3">
                            <div className="flex justify-between items-start w-full">
                                {flagUrl && (
                                    <img src={flagUrl} className="w-5 h-auto rounded-sm opacity-90 shadow-sm" alt={player.countryCode} />
                                )}
                                <div className="flex flex-col items-end leading-none">
                                    <span className="font-russo text-2xl drop-shadow-md" style={{ color: TURQUOISE_RATING }}>
                                        {player.rating}
                                    </span>
                                    <span className="text-[7px] font-black text-white tracking-widest uppercase opacity-80">OVR</span>
                                </div>
                            </div>

                            {/* UPDATED: Name display now supports wrapping into 2 lines */}
                            <div className="w-full text-center pb-0.5">
                                <span className="text-white font-russo text-xs uppercase block w-full drop-shadow-md tracking-tight leading-[0.9] line-clamp-2">
                                    {player.nickname}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex flex-col items-center gap-2 z-20">
                    <span 
                        className="font-orbitron text-xs text-white font-black uppercase tracking-[0.25em]"
                        style={{ textShadow: '0 0 10px rgba(255,255,255,0.4)' }}
                    >
                        {role}
                    </span>

                    <div 
                        className="px-4 py-1.5 rounded border flex items-center justify-center gap-2 shadow-lg backdrop-blur-sm"
                        style={{
                            backgroundColor: 'rgba(10, 10, 10, 0.95)',
                            borderColor: `${SKY_BORDER}`,
                            boxShadow: `0 4px 12px rgba(0,0,0,0.6)`
                        }}
                    >
                        <span className="font-mono font-bold text-sm text-white leading-none tracking-wider">
                            {statValue}
                        </span>
                        <span className="w-px h-3 bg-white/40"></span>
                        <span className="font-chakra font-bold text-[10px] text-white leading-none uppercase tracking-wide">
                            {statLabel}
                        </span>
                    </div>
                </div>
            </div>
            <style dangerouslySetInnerHTML={{ __html: `
                @keyframes float-slow { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-6px); } }
                .animate-float-slow { animation: float-slow 4s ease-in-out infinite; }
            `}} />
        </div>
    );
};

const getDemoDreamTeam = (): { team: DisplayPlayer[], monthName: string } => {
    const demoPhotos = [
        "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?q=80&w=400&auto=format&fit=crop",
        "https://images.unsplash.com/photo-1543326727-cf6c39e8f84c?q=80&w=400&auto=format&fit=crop",
        "https://images.unsplash.com/photo-1511886929837-354d827aae26?q=80&w=400&auto=format&fit=crop",
        "https://images.unsplash.com/photo-1552318971-089901764319?q=80&w=400&auto=format&fit=crop",
        "https://images.unsplash.com/photo-1551958219-acbc608c6377?q=80&w=400&auto=format&fit=crop"
    ];

    const surnames = ["MAVERICK", "GHOST", "VIPER", "STRIKER", "PHOENIX"];
    const roles = ["THE MVP", "THE SNIPER", "ARCHITECT", "WINNER", "FORTRESS"];
    const stats = ["RATING", "GOALS", "ASSISTS", "WINS", "CLEAN SHEETS"];
    const values = [94, 12, 8, 9, 3];
    const tiers = [PlayerTier.Legend, PlayerTier.Elite, PlayerTier.Pro, PlayerTier.Elite, PlayerTier.Regular];

    const team = surnames.map((surname, i) => ({
        player: {
            id: `demo_${i}`,
            nickname: `Player ${i+1}`,
            surname: surname,
            rating: values[0] - (i*2),
            tier: tiers[i],
            playerCard: demoPhotos[i],
            countryCode: i % 2 === 0 ? "UA" : "VN",
            status: PlayerStatus.Confirmed,
            createdAt: new Date().toISOString(),
            totalGoals: 100, totalAssists: 50, totalGames: 80, totalWins: 60, totalDraws: 5, totalLosses: 15,
            totalSessionsPlayed: 20, initialRating: 68, monthlyGoals: 0, monthlyAssists: 0, monthlyGames: 0, monthlyWins: 0,
            monthlySessionsPlayed: 0, form: 'hot_streak', badges: {}, skills: [], lastPlayedAt: new Date().toISOString(),
            sessionHistory: [], records: { bestGoalsInSession: { value: 0, sessionId: '' }, bestAssistsInSession: { value: 0, sessionId: '' }, bestWinRateInSession: { value: 0, sessionId: '' } }
        } as Player,
        role: roles[i],
        statLabel: stats[i],
        statValue: values[i]
    }));

    return { team, monthName: "DEMO SEASON" };
};

export const TeamOfTheMonthModal: React.FC<TeamOfTheMonthModalProps> = ({ isOpen, onClose }) => {
    const { allPlayers, history } = useApp();
    const [selectedDate, setSelectedDate] = useState<Date>(() => {
        const d = new Date();
        d.setMonth(d.getMonth() - 1);
        return d;
    });
    const [isCalendarOpen, setIsCalendarOpen] = useState(false);

    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
            setIsCalendarOpen(false);
        }
        return () => { document.body.style.overflow = ''; };
    }, [isOpen]);

    const availableMonths = useMemo(() => {
        const uniqueMonths = new Set<string>();
        const monthsData: { date: Date, label: string }[] = [];
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();

        history.forEach(session => {
            if (!session.date) return;
            const d = new Date(session.date);
            const sMonth = d.getMonth();
            const sYear = d.getFullYear();

            // BLOCK CURRENT MONTH: Only allow if session is from a previous month or year
            if (sYear < currentYear || (sYear === currentYear && sMonth < currentMonth)) {
                const key = `${sYear}-${sMonth}`; 
                if (!uniqueMonths.has(key)) {
                    uniqueMonths.add(key);
                    monthsData.push({
                        date: d,
                        label: d.toLocaleString('en-US', { month: 'long', year: 'numeric' })
                    });
                }
            }
        });

        return monthsData.sort((a, b) => b.date.getTime() - a.date.getTime());
    }, [history]);

    const { team: dreamTeam, monthName: displayMonthName } = useMemo(() => {
        if (!allPlayers || allPlayers.length < 5 || !history || history.length === 0) {
            return getDemoDreamTeam();
        }

        const targetMonth = selectedDate.getMonth();
        const targetYear = selectedDate.getFullYear();

        const calculateForMonth = (tMonth: number, tYear: number) => {
            const targetSessions = history.filter(s => {
                if (!s || !s.date) return false;
                try {
                    const d = new Date(s.date);
                    return d.getMonth() === tMonth && d.getFullYear() === tYear;
                } catch { return false; }
            });

            if (targetSessions.length === 0) return null;

            const playerStats: Record<string, { goals: number, assists: number, wins: number, games: number, cleanSheets: number }> = {};
            
            targetSessions.forEach(session => {
                const teams = session.teams || [];
                const games = session.games || [];
                
                session.playerPool.forEach(p => {
                    if (!playerStats[p.id]) playerStats[p.id] = { goals: 0, assists: 0, wins: 0, games: 0, cleanSheets: 0 };
                });

                games.forEach(game => {
                    if (game.status !== 'finished') return;
                    
                    const score1 = game.team1Score;
                    const score2 = game.team2Score;
                    
                    const t1 = teams.find(t => t.id === game.team1Id);
                    const t2 = teams.find(t => t.id === game.team2Id);
                    
                    t1?.playerIds?.forEach(pid => { if(playerStats[pid]) playerStats[pid].games++ });
                    t2?.playerIds?.forEach(pid => { if(playerStats[pid]) playerStats[pid].games++ });

                    if (score1 > score2) {
                        t1?.playerIds?.forEach(pid => { if(playerStats[pid]) playerStats[pid].wins++ });
                        if (score2 === 0) t1?.playerIds?.forEach(pid => { if(playerStats[pid]) playerStats[pid].cleanSheets++ });
                    } else if (score2 > score1) {
                        t2?.playerIds?.forEach(pid => { if(playerStats[pid]) playerStats[pid].wins++ });
                        if (score1 === 0) t2?.playerIds?.forEach(pid => { if(playerStats[pid]) playerStats[pid].cleanSheets++ });
                    }

                    game.goals.forEach(g => {
                        if (!g.isOwnGoal && g.scorerId && playerStats[g.scorerId]) playerStats[g.scorerId].goals++;
                        if (g.assistantId && playerStats[g.assistantId]) playerStats[g.assistantId].assists++;
                    });
                });
            });

            const candidates = allPlayers.filter(p => playerStats[p.id] && playerStats[p.id].games >= 2);
            if (candidates.length < 3) return null; 

            const corePool = candidates.filter(p => playerStats[p.id].games >= 4);
            const reservePool = candidates.filter(p => playerStats[p.id].games < 4);

            const pickBest = (
                criteriaFn: (pid: string) => number, 
                tieBreakerFn: (pid: string) => number,
                excludeIds: Set<string>
            ): Player | null => {
                let pool = corePool.filter(p => !excludeIds.has(p.id));
                if (pool.length === 0) pool = reservePool.filter(p => !excludeIds.has(p.id));
                if (pool.length === 0) return null;

                return pool.sort((a, b) => {
                    const valA = criteriaFn(a.id);
                    const valB = criteriaFn(b.id);
                    if (valB !== valA) return valB - valA; 
                    return tieBreakerFn(b.id) - tieBreakerFn(a.id);
                })[0] || null;
            };

            const selectedIds = new Set<string>();
            const teamResult: DisplayPlayer[] = [];

            const getRating = (pid: string) => allPlayers.find(p => p.id === pid)?.rating || 0;
            const getG = (pid: string) => playerStats[pid].goals;
            const getA = (pid: string) => playerStats[pid].assists;
            const getW = (pid: string) => playerStats[pid].wins;
            const getCS = (pid: string) => playerStats[pid].cleanSheets;
            const getGP = (pid: string) => playerStats[pid].games;

            const mvp = pickBest(getRating, pid => getG(pid) + getA(pid), selectedIds);
            if (mvp) { selectedIds.add(mvp.id); teamResult.push({ player: mvp, role: 'THE MVP', statLabel: 'RATING', statValue: getRating(mvp.id) }); }

            const sniper = pickBest(getG, pid => -getGP(pid), selectedIds);
            if (sniper) { selectedIds.add(sniper.id); teamResult.push({ player: sniper, role: 'THE SNIPER', statLabel: 'GOALS', statValue: getG(sniper.id) }); }

            const architect = pickBest(getA, getG, selectedIds);
            if (architect) { selectedIds.add(architect.id); teamResult.push({ player: architect, role: 'ARCHITECT', statLabel: 'ASSISTS', statValue: getA(architect.id) }); }

            const winner = pickBest(getW, getGP, selectedIds);
            if (winner) { selectedIds.add(winner.id); teamResult.push({ player: winner, role: 'WINNER', statLabel: 'WINS', statValue: getW(winner.id) }); }

            const fortress = pickBest(getCS, getGP, selectedIds);
            if (fortress) {
                selectedIds.add(fortress.id);
                const cs = getCS(fortress.id);
                teamResult.push({ player: fortress, role: cs > 0 ? 'FORTRESS' : 'IRON MAN', statLabel: cs > 0 ? 'CLEAN SHEETS' : 'GAMES', statValue: cs > 0 ? cs : getGP(fortress.id) });
            }

            return teamResult.length >= 3 ? teamResult : null;
        };

        let foundTeam = calculateForMonth(targetMonth, targetYear);
        let dateName = selectedDate.toLocaleString('en-US', { month: 'long', year: 'numeric' });

        if (foundTeam) {
            return { 
                team: foundTeam, 
                monthName: dateName 
            };
        }

        return getDemoDreamTeam();

    }, [allPlayers, history, selectedDate]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/95 backdrop-blur-2xl animate-fade-in" onClick={onClose}></div>
            <div className="relative w-[95vw] md:w-[90vw] max-w-[1200px] h-[85vh] md:h-[80vh] animate-modal-pop">
                <div className="absolute inset-[-15px] md:inset-[-30px] pointer-events-none z-0">
                    <div className="absolute inset-0 bg-[#164e63]/25 blur-[40px] rounded-[3rem] animate-glow-pulse"></div>
                    <div className="absolute inset-10 bg-[#0f172a]/50 blur-[60px] rounded-[3rem]"></div>
                </div>
                <div className="absolute inset-0 rounded-[2.5rem] overflow-hidden z-10">
                    <div className="absolute inset-0 p-[1px] bg-gradient-to-br from-[#00F2FE]/60 via-[#00F2FE]/10 to-[#00F2FE]/60 shadow-[0_0_40px_rgba(0,242,254,0.15)]">
                        <div className="w-full h-full bg-[#020408] rounded-[calc(2.5rem-1px)] overflow-hidden relative flex flex-col">
                            <StarrySky />
                            
                            <div className="absolute top-[12%] left-1/2 -translate-x-1/2 -translate-y-1/2 z-[15] flex flex-col items-center pointer-events-none select-none">
                                <div className="absolute top-[55%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-32 z-0 opacity-40">
                                    <svg viewBox="0 0 100 60" className="w-full h-full overflow-visible">
                                        <defs>
                                            <filter id="goalGlow">
                                                <feGaussianBlur in="SourceGraphic" stdDeviation="1.5" result="blur" />
                                                <feMerge>
                                                    <feMergeNode in="blur" />
                                                    <feMergeNode in="SourceGraphic" />
                                                </feMerge>
                                            </filter>
                                        </defs>
                                        <path 
                                            d="M 5,60 L 5,8 Q 5,0 13,0 L 87,0 Q 95,0 95,8 L 95,60" 
                                            fill="none" 
                                            stroke="#00F2FE" 
                                            strokeWidth="1.2" 
                                            filter="url(#goalGlow)"
                                            strokeLinecap="round"
                                        />
                                        <path d="M 5,0 L 15,-6 M 95,0 L 85,-6 M 15,-6 H 85" fill="none" stroke="#00F2FE" strokeWidth="0.5" opacity="0.3" />
                                        
                                        <g stroke="#00F2FE" strokeWidth="0.12" opacity="0.35">
                                            {[3, 6, 9, 12, 15, 18, 21, 24, 27, 30, 33, 36, 39, 42, 45, 48, 51, 54, 57].map(y => <line key={y} x1="5" y1={y} x2="95" y2={y} />)}
                                            {[8, 11, 14, 17, 20, 23, 26, 29, 32, 35, 38, 41, 44, 47, 50, 53, 56, 59, 62, 65, 68, 71, 74, 77, 80, 83, 86, 89, 92].map(x => <line key={x} x1={x} y1="0" x2={x} y2="60" />)}
                                        </g>
                                    </svg>
                                </div>

                                <div className="absolute inset-0 bg-[#00F2FE]/10 blur-xl rounded-full scale-150"></div>

                                <h2 className="font-blackops text-lg text-[#00F2FE] leading-none drop-shadow-[0_0_8px_rgba(0,242,254,0.6)] relative z-10">
                                    532
                                </h2>

                                <div className="flex flex-col items-center mt-0 relative z-10">
                                    <span className="font-russo text-[5.5px] text-white tracking-[0.25em] uppercase opacity-90 drop-shadow-md">
                                        Playground
                                    </span>
                                    <div className="flex items-center gap-1 mt-0">
                                        <div className="h-px w-1 bg-white/30"></div>
                                        <span className="font-chakra text-[4.5px] font-black text-white tracking-[0.15em] uppercase drop-shadow-[0_0_5px_rgba(255,255,255,0.3)]">
                                            Club
                                        </span>
                                        <div className="h-px w-1 bg-white/30"></div>
                                    </div>
                                </div>
                            </div>

                            <div className="absolute top-6 right-6 z-[100] flex gap-2">
                                <div className="relative">
                                    <button 
                                        onClick={() => setIsCalendarOpen(!isCalendarOpen)} 
                                        className={`w-10 h-10 rounded-full border transition-all duration-300 flex items-center justify-center backdrop-blur-md z-50
                                            ${isCalendarOpen ? 'border-[#00F2FE] bg-[#00F2FE]/20 text-[#00F2FE] shadow-[0_0_15px_rgba(0,242,254,0.3)]' : 'border-white/20 bg-black/60 text-white/50 hover:text-white hover:border-white'}`}
                                    >
                                        <Calendar className="w-5 h-5" />
                                    </button>
                                    
                                    {isCalendarOpen && (
                                        <div className="absolute top-[calc(100%+10px)] right-0 w-28 bg-[#0a0c10]/98 backdrop-blur-xl border border-white/10 rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.8)] overflow-hidden animate-in slide-in-from-top-2 fade-in duration-300 z-[110]">
                                            <div className="max-h-60 overflow-y-auto no-scrollbar py-1">
                                                {availableMonths.length > 0 ? availableMonths.map((m, idx) => {
                                                    const isSelected = m.date.getMonth() === selectedDate.getMonth() && m.date.getFullYear() === selectedDate.getFullYear();
                                                    return (
                                                        <button
                                                            key={idx}
                                                            onClick={() => {
                                                                setSelectedDate(m.date);
                                                                setIsCalendarOpen(false);
                                                            }}
                                                            className={`w-full text-left px-3 py-1.5 text-[8px] font-black uppercase tracking-widest transition-all relative group/item
                                                                ${isSelected ? 'text-white' : 'text-white/40 hover:text-white hover:bg-white/5'}`}
                                                        >
                                                            {m.label}
                                                        </button>
                                                    );
                                                }) : (
                                                    <div className="px-3 py-4 text-[8px] font-bold text-white/20 text-center uppercase tracking-widest">No History</div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <button onClick={onClose} className="w-10 h-10 rounded-full border border-white/20 bg-black/60 backdrop-blur-md flex items-center justify-center text-white/50 hover:text-white hover:border-white transition-all duration-300">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                                </button>
                            </div>

                            <div className="absolute top-6 left-6 z-[100] flex flex-col select-none pointer-events-none">
                                <div className="flex items-start gap-2">
                                    <div className="w-1 h-10 bg-gradient-to-b from-[#00F2FE] to-transparent rounded-full opacity-80"></div>
                                    <div className="flex flex-col items-start">
                                        <h1 className="font-blackops text-2xl text-white leading-[0.8] tracking-wider drop-shadow-lg transform -ml-0.5">
                                            TEAM
                                        </h1>
                                        <div className="flex items-baseline gap-1 mt-0.5">
                                            <span className="font-chakra text-[8px] font-bold text-white/50 tracking-[0.1em] -translate-y-px">OF THE</span>
                                            <span className="font-russo text-xl text-[#00F2FE] leading-none tracking-tight drop-shadow-[0_0_10px_rgba(0,242,254,0.6)]">
                                                MONTH
                                            </span>
                                        </div>
                                        {/* Date Plank - Adjusted to align left under top header */}
                                        <div className="mt-2 flex items-center justify-start px-2 py-1.5 border border-white/10 rounded-lg bg-white/5 backdrop-blur-md shadow-sm w-fit">
                                            <span className="font-mono text-[9px] text-white uppercase tracking-widest font-bold">
                                                {displayMonthName}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="relative flex-grow w-full h-full overflow-hidden bg-transparent flex items-end">
                                <div className="absolute inset-0 z-10">
                                    <svg width="100%" height="100%" viewBox="0 0 1000 600" preserveAspectRatio="xMidYMid slice" className="opacity-100">
                                        <defs>
                                            <filter id="grassTexture">
                                                <feTurbulence type="fractalNoise" baseFrequency="0.6" numOctaves="4" result="noise" />
                                                <feDiffuseLighting in="noise" lightingColor="#1e293b" surfaceScale="2.5">
                                                    <feDistantLight elevation="40" azimuth="45" />
                                                </feDiffuseLighting>
                                                <feComposite operator="in" in2="SourceGraphic" />
                                            </filter>
                                            <linearGradient id="pitchGrad" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#020408" /><stop offset="100%" stopColor="#0f172a" /></linearGradient>
                                            
                                            <linearGradient id="depthShadow" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="black" stopOpacity="0.8" /><stop offset="30%" stopColor="black" stopOpacity="0.4" /><stop offset="100%" stopColor="transparent" stopOpacity="0" /></linearGradient>
                                            <radialGradient id="sideGlowLeft" cx="0%" cy="100%" r="80%"><stop offset="0%" stopColor="#00F2FE" stopOpacity="0.1" /><stop offset="100%" stopColor="transparent" stopOpacity="0" /></radialGradient>
                                            <radialGradient id="sideGlowRight" cx="100%" cy="100%" r="80%"><stop offset="0%" stopColor="#00F2FE" stopOpacity="0.1" /><stop offset="100%" stopColor="transparent" stopOpacity="0" /></radialGradient>
                                            <filter id="pitchLineGlow"><feGaussianBlur in="SourceGraphic" stdDeviation="0.8" result="blur" /><feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
                                        </defs>
                                        <g transform="perspective(500)">
                                            {/* Pitch Background */}
                                            <path d="M 0,600 L 1000,600 L 750,150 L 250,150 Z" fill="url(#pitchGrad)" filter="url(#grassTexture)"/>
                                            <path d="M 0,600 L 1000,600 L 750,150 L 250,150 Z" fill="url(#depthShadow)"/>
                                            <path d="M 0,600 L 500,600 L 400,150 L 250,150 Z" fill="url(#sideGlowLeft)" />
                                            <path d="M 500,600 L 1000,600 L 750,150 L 600,150 Z" fill="url(#sideGlowRight)" />
                                            
                                            {/* Pitch Lines */}
                                            <g filter="url(#pitchLineGlow)">
                                                <g fill="none" stroke="#ffffff" strokeOpacity="0.3" strokeLinecap="round">
                                                    {/* Goal Line & Sidelines */}
                                                    <line x1="0" y1="600" x2="1000" y2="600" strokeWidth="2.5" />
                                                    <path d="M 0,600 L 250,150" strokeWidth="2.5" />
                                                    <path d="M 1000,600 L 750,150" strokeWidth="2.5" />
                                                    <line x1="250" y1="150" x2="750" y2="150" strokeWidth="1.2" />
                                                    
                                                    {/* Center Circle Arc */}
                                                    <path d="M 350,600 A 150,75 0 0,1 650,600" strokeWidth="2.5" />
                                                    
                                                    {/* Narrower and Shorter Penalty Area */}
                                                    <path d="M 330,150 L 310,210 L 690,210 L 670,150" strokeWidth="1.5" />
                                                </g>
                                            </g>
                                        </g>
                                    </svg>
                                </div>
                                {dreamTeam && dreamTeam.length > 0 && (
                                    <>
                                        {dreamTeam[3] && <PlayerPodium x="35%" y="32%" data={dreamTeam[3]} accentColor="#00F2FE" scale={0.9} />} 
                                        {dreamTeam[4] && <PlayerPodium x="65%" y="32%" data={dreamTeam[4]} accentColor="#4CFF5F" scale={0.9} />}

                                        {dreamTeam[1] && <PlayerPodium x="20%" y="58%" data={dreamTeam[1]} accentColor="#FF4136" scale={1.0} />}
                                        {dreamTeam[2] && <PlayerPodium x="80%" y="58%" data={dreamTeam[2]} accentColor="#FF851B" scale={1.0} />}

                                        {/* MVP Card Bumped Up: y changed from 75% to 71% */}
                                        {dreamTeam[0] && <PlayerPodium x="50%" y="71%" data={dreamTeam[0]} accentColor="#00F2FE" scale={1.1} />}
                                    </>
                                )}
                                {(!dreamTeam || dreamTeam.length === 0) && (
                                    <div className="absolute inset-0 flex items-center justify-center z-30">
                                        <p className="text-white/30 font-black uppercase tracking-[0.2em] text-center px-4">NOT ENOUGH DATA</p>
                                    </div>
                                )}
                                <div className="absolute inset-0 z-10 pointer-events-none bg-[radial-gradient(circle_at(50% 75%),_transparent_30%,_rgba(0,0,0,0.8)_95%)]"></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <style dangerouslySetInnerHTML={{ __html: `
                @keyframes modal-pop { 0% { opacity: 0; transform: scale(0.95) translateY(30px); } 100% { opacity: 1; transform: scale(1) translateY(0); } }
                .animate-modal-pop { animation: modal-pop 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
                .animate-fade-in { animation: fade-in 0.4s ease-out forwards; }
                @keyframes glow-pulse { 0%, 100% { opacity: 0.2; transform: scale(1); } 50% { opacity: 0.4; transform: scale(1.05); } }
                .animate-glow-pulse { animation: glow-pulse 4s ease-in-out infinite; }
            `}} />
        </div>
    );
};