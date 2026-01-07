
import React, { useMemo, useState, useEffect } from 'react';
import { useApp } from '../context';
import { PlayerTier, PlayerStatus, Player } from '../types';
import { Search, XCircle, Zap, Users, ChevronLeft } from '../icons';
import { useTranslation } from '../ui';
import { HubPlayerIntel } from './HubPlayerIntel';
import { HubDuel } from './HubDuel';

const HubPortraitAvatar: React.FC<{ photo?: string; tierColor: string }> = ({ photo, tierColor }) => (
    <div 
        className="relative w-[45px] h-[58px] rounded-[0.8rem] overflow-hidden bg-[#0C0E12] transition-all duration-500 ease-out z-10 
        border border-white/10 
        group-hover/unit:border-[color:var(--tier-color)]
        group-hover/unit:shadow-[0_0_10px_var(--tier-color)]"
        style={{ '--tier-color': tierColor } as React.CSSProperties}
    >
        <div 
            className="absolute inset-0 bg-cover" 
            style={{ 
                backgroundImage: photo ? `url(${photo})` : 'none',
                backgroundPosition: 'center 12%' 
            }}
        >
            {!photo && (
                <div className="absolute inset-0 flex items-center justify-center bg-white/5">
                     <Search className="w-4 h-4 text-white/10" />
                </div>
            )}
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-white/5 opacity-60"></div>
    </div>
);

const TIER_COLORS = {
    [PlayerTier.Legend]: '#d946ef',
    [PlayerTier.Elite]: '#fbbf24',
    [PlayerTier.Pro]: '#E2E8F0',
    [PlayerTier.Regular]: '#00F2FE'
};

type SortOption = 'name' | 'rating' | 'date';

interface HubRosterProps {
    selectedPlayerId: string | null;
    onSelectPlayer: (id: string | null) => void;
    sortBy: SortOption;
    setSortBy: (opt: SortOption) => void;
    search: string;
    setSearch: (val: string) => void;
    onStartDuel: (p1Id: string, p2Id: string) => void;
}

export const HubRoster: React.FC<HubRosterProps> = ({ selectedPlayerId, onSelectPlayer, sortBy, setSortBy, search, setSearch }) => {
    const { allPlayers } = useApp();
    const t = useTranslation();
    
    const [viewMode, setViewMode] = useState<'intel' | 'duel'>('intel');
    const [duelSlots, setDuelSlots] = useState<[string | null, string | null]>([null, null]);

    const confirmedPersonnel = useMemo(() => {
        return allPlayers
            .filter(p => p.status === PlayerStatus.Confirmed)
            .filter(p => p.nickname?.toLowerCase().includes(search.toLowerCase()))
            .sort((a, b) => {
                if (sortBy === 'name') return (a.nickname || '').localeCompare(b.nickname || '');
                if (sortBy === 'rating') {
                    if (b.rating !== a.rating) return b.rating - a.rating;
                    const scoreA = (a.totalGoals || 0) + (a.totalAssists || 0);
                    const scoreB = (b.totalGoals || 0) + (b.totalAssists || 0);
                    if (scoreB !== scoreA) return scoreB - scoreA;
                    const wrA = a.totalGames > 0 ? (a.totalWins / a.totalGames) : 0;
                    const wrB = b.totalGames > 0 ? (b.totalWins / b.totalGames) : 0;
                    if (wrB !== wrA) return wrB - wrA;
                    return (b.totalGames || 0) - (a.totalGames || 0);
                }
                if (sortBy === 'date') return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
                return 0;
            });
    }, [allPlayers, search, sortBy]);

    useEffect(() => {
        if (viewMode === 'intel' && !selectedPlayerId && confirmedPersonnel.length > 0) {
            onSelectPlayer(confirmedPersonnel[0].id);
        }
    }, [confirmedPersonnel, selectedPlayerId, onSelectPlayer, viewMode]);

    const handlePlayerClick = (id: string) => {
        if (viewMode === 'duel') {
            setDuelSlots(prev => {
                if (!prev[0]) return [id, null];
                if (prev[0] === id) return [null, prev[1]];
                if (!prev[1]) return [prev[0], id];
                if (prev[1] === id) return [prev[0], null];
                return [prev[0], id];
            });
        } else {
            onSelectPlayer(id);
        }
    };

    const toggleDuelMode = () => {
        if (viewMode === 'duel') {
            setViewMode('intel');
            setDuelSlots([null, null]);
        } else {
            setViewMode('duel');
            setDuelSlots([null, null]);
        }
    };

    return (
        <div className="absolute inset-0 flex flex-row animate-in fade-in duration-700 overflow-hidden rounded-[2.5rem]">
            {/* SIDEBAR - LEFT COLUMN */}
            <div className="w-[350px] flex flex-col border-r border-white/5 bg-[#05070a] relative z-20 shrink-0">
                <div className="p-6 pb-2 space-y-3 pt-4">
                    <div className="flex items-center justify-start mb-1 pr-2 pl-44">
                        <button 
                            onClick={toggleDuelMode} 
                            className="group relative flex flex-col items-center px-6 py-2 transition-all active:scale-95 overflow-hidden min-w-[120px]"
                        >
                             <div className={`absolute inset-0 border rounded-xl transition-all ${viewMode === 'duel' ? 'bg-[#00F2FE]/20 border-[#00F2FE] shadow-[0_0_15px_rgba(0,242,254,0.4)]' : 'bg-[#00F2FE]/5 border-[#00F2FE]/40 group-hover:bg-[#00F2FE]/10 group-hover:border-[#00F2FE]'}`}></div>
                             <div className="relative z-10 flex flex-col items-center">
                                <span className={`font-blackops text-[24px] uppercase tracking-[0.1em] transition-colors italic leading-none ${viewMode === 'duel' ? 'text-white' : 'text-[#00F2FE]'}`}>
                                    DUEL
                                </span>
                                <div className="flex flex-col items-center mt-1 h-[14px] justify-center">
                                    <span className="text-[6px] font-black text-white/40 uppercase tracking-[0.2em] leading-none group-hover:text-[#00F2FE] transition-colors">
                                        {viewMode === 'duel' ? 'EXIT' : 'INITIATE'}
                                    </span>
                                    <span className="text-[6px] font-black text-white/40 uppercase tracking-[0.2em] leading-none mt-[2px] group-hover:text-[#00F2FE] transition-colors">
                                        {viewMode === 'duel' ? 'INTERFACE' : 'SIMULATION'}
                                    </span>
                                </div>
                             </div>
                        </button>
                    </div>

                    <div className="relative group w-full h-[34px] pr-2">
                        <input type="text" placeholder="FIND UNIT..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full h-full bg-white/5 border border-white/10 rounded-xl pl-4 pr-10 text-[10px] font-chakra font-black text-white uppercase tracking-[0.15em] focus:outline-none focus:border-[#00F2FE]/40 transition-all placeholder:text-white/20" />
                        <div className="absolute right-5 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-[#00F2FE] transition-colors"><Search className="w-4 h-4" /></div>
                    </div>

                    <div className="flex gap-1.5 pr-2">
                        {(['rating', 'name', 'date'] as SortOption[]).map((opt) => (
                            <button 
                                key={opt} 
                                onClick={() => setSortBy(opt)} 
                                className={`flex-1 py-1.5 text-[8px] font-black uppercase tracking-widest rounded-lg border transition-all ${sortBy === opt ? 'bg-[#00F2FE]/10 border-[#00F2FE]/40 text-[#00F2FE] shadow-[0_0_10px_rgba(0,242,254,0.1)]' : 'bg-transparent border-white/5 text-white/20 hover:text-white/40'}`}
                            >
                                {opt}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="flex-grow relative overflow-hidden flex flex-col">
                    <div className="flex-grow overflow-y-auto custom-hub-scrollbar p-4 pt-4 space-y-3.5">
                        {confirmedPersonnel.map((person) => {
                            const isSelected = viewMode === 'intel' ? selectedPlayerId === person.id : duelSlots.includes(person.id);
                            const tierColor = TIER_COLORS[person.tier] || '#94a3b8';
                            
                            return (
                                <div 
                                    key={person.id} 
                                    onClick={() => handlePlayerClick(person.id)} 
                                    className={`group/unit relative flex items-center justify-between h-[68px] w-full rounded-2xl transition-all duration-300 cursor-pointer border
                                        ${isSelected 
                                            ? 'bg-gradient-to-br from-[#1e2329] to-[#12161b] border-white/20 shadow-[0_10px_20px_rgba(0,0,0,0.6),inset_0_1px_1px_rgba(255,255,255,0.1)]' 
                                            : 'bg-gradient-to-br from-[#161a1f] to-[#0d1013] border-white/5 shadow-[0_4px_10px_rgba(0,0,0,0.4),inset_0_1px_0.5px_rgba(255,255,255,0.05)] hover:border-white/10 hover:from-[#1a1f25]'
                                        }`}
                                >
                                    <div 
                                        className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-8 rounded-r-full transition-all duration-500" 
                                        style={{ 
                                            backgroundColor: isSelected ? (viewMode === 'duel' ? '#00F2FE' : tierColor) : tierColor, 
                                            boxShadow: isSelected ? `0 0 12px ${viewMode === 'duel' ? '#00F2FE' : tierColor}` : 'none',
                                            opacity: isSelected ? 1 : 0.4
                                        }}
                                    ></div>
                                    
                                    <div className="flex items-center px-4 gap-4 w-full relative z-10">
                                        <div className="shrink-0 transition-transform duration-300 group-hover/unit:scale-105">
                                            <HubPortraitAvatar photo={person.playerCard} tierColor={tierColor} />
                                        </div>
                                        <div className="flex flex-col min-w-0 flex-grow">
                                            <span className={`font-chakra font-black text-sm uppercase tracking-wide truncate transition-colors ${isSelected ? 'text-white' : 'text-white/70'}`}>
                                                {person.nickname}
                                            </span>
                                            <span className="text-[7px] font-mono font-black text-white/20 uppercase tracking-[0.2em]">{person.tier}</span>
                                        </div>
                                        <div className="flex flex-col items-end shrink-0">
                                            <div className="flex items-baseline gap-2.5">
                                                <span 
                                                    className={`font-russo text-2xl transition-all duration-300 ${isSelected ? 'text-white scale-110' : 'text-white/40'}`}
                                                    style={{ 
                                                        color: isSelected ? (viewMode === 'duel' ? '#00F2FE' : tierColor) : undefined,
                                                        textShadow: isSelected ? `0 0 15px ${viewMode === 'duel' ? '#00F2FE' : tierColor}88` : 'none'
                                                    }}
                                                >
                                                    {person.rating}
                                                </span>
                                                <span className="text-[6px] font-mono font-black text-white/10 uppercase">OVR</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="absolute inset-0 rounded-2xl pointer-events-none border border-white/[0.03] shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]"></div>
                                </div>
                            );
                        })}
                    </div>
                    {/* SCROLL FADE BOTTOM ONLY - REDUCED TO MINIMUM h-1 FOR MAX VISIBILITY */}
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-t from-[#01040a] to-transparent z-20 pointer-events-none"></div>
                </div>
            </div>

            {/* CONTENT AREA - RIGHT COLUMN - Obsidian Black (#01040a) */}
            <div className="flex-grow relative bg-[#01040a] overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#0a1121] via-black to-black opacity-60"></div>
                <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]"></div>

                {viewMode === 'duel' ? (
                    <div className="h-full w-full relative animate-in fade-in slide-in-from-right-4 duration-500 overflow-hidden">
                         <HubDuel p1Id={duelSlots[0]} p2Id={duelSlots[1]} />
                    </div>
                ) : selectedPlayerId ? (
                    <div className="h-full w-full relative animate-in fade-in slide-in-from-right-4 duration-500 overflow-hidden">
                        <HubPlayerIntel 
                            playerId={selectedPlayerId} 
                            isEmbedded={true} 
                            onBack={() => {}} 
                        />
                    </div>
                ) : (
                    <div className="h-full w-full flex flex-col items-center justify-center opacity-10">
                        <Users className="w-32 h-32 mb-6" />
                        <span className="font-orbitron text-xl uppercase tracking-[0.6em] font-black">Select Intel Unit</span>
                    </div>
                )}
            </div>
        </div>
    );
};
