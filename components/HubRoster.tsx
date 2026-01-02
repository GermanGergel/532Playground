
import React, { useMemo, useState, useEffect } from 'react';
import { useApp } from '../context';
import { PlayerTier, PlayerStatus, Player } from '../types';
import { Search, XCircle, Zap, Users, ChevronLeft } from '../icons';
import { useTranslation } from '../ui';
import { HubPlayerIntel } from './HubPlayerIntel';
import { HubDuel } from './HubDuel';

const HubPortraitAvatar: React.FC<{ photo?: string; tierColor: string }> = ({ photo, tierColor }) => (
    <div 
        className="relative w-[54px] h-[68px] rounded-xl overflow-hidden bg-[#0C0E12] transition-all duration-500 ease-out z-10 
        border border-white/10"
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
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-white/5 opacity-60"></div>
    </div>
);

const TIER_COLORS = {
    [PlayerTier.Legend]: '#d946ef',
    [PlayerTier.Elite]: '#fbbf24',
    [PlayerTier.Pro]: '#94a3b8',
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
                if (prev[0] === id) return [null, prev[1]];
                if (prev[1] === id) return [prev[0], null];
                if (!prev[0]) return [id, prev[1]];
                if (!prev[1]) return [prev[0], id];
                // Если оба заняты, заменяем второй
                return [prev[0], id];
            });
        } else {
            onSelectPlayer(id);
        }
    };

    const toggleDuelMode = () => {
        if (viewMode === 'duel') {
            setViewMode('intel');
        } else {
            setViewMode('duel');
            // Сбрасываем слоты, чтобы пользователь выбирал обоих игроков вручную
            setDuelSlots([null, null]);
        }
    };

    return (
        <div className="absolute inset-0 flex flex-row animate-in fade-in duration-700 overflow-hidden rounded-[2.5rem]">
            {/* SIDEBAR - LEFT COLUMN */}
            <div className="w-[380px] flex flex-col border-r border-white/5 bg-[#0a0a0a] relative z-20 shrink-0">
                <div className="p-6 pb-2 space-y-4 pt-6">
                    <div className="flex items-center justify-center mb-2">
                        <button 
                            onClick={toggleDuelMode} 
                            className="group relative flex flex-col items-center w-full px-6 py-3 transition-all active:scale-95 overflow-hidden"
                        >
                             <div className={`absolute inset-0 border-2 rounded-2xl transition-all ${viewMode === 'duel' ? 'bg-[#00F2FE]/10 border-[#00F2FE] shadow-[0_0_20px_rgba(0,242,254,0.3)]' : 'bg-white/5 border-white/10 group-hover:border-[#00F2FE]/40'}`}></div>
                             <div className="relative z-10 flex flex-col items-center">
                                <span className="font-russo text-[28px] uppercase tracking-[0.1em] text-white leading-none italic">
                                    DUEL
                                </span>
                                <span className="text-[7px] font-black text-white/40 uppercase tracking-[0.3em] mt-1.5 group-hover:text-[#00F2FE] transition-colors">
                                    {viewMode === 'duel' ? 'EXIT SIMULATION' : 'INITIATE SIMULATION'}
                                </span>
                             </div>
                        </button>
                    </div>

                    <div className="relative group w-full h-[38px]">
                        <input type="text" placeholder="FIND PLAYER UNIT..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full h-full bg-white/5 border border-white/10 rounded-xl pl-4 pr-10 text-[11px] font-chakra font-black text-white uppercase tracking-[0.15em] focus:outline-none focus:border-[#00F2FE]/40 transition-all placeholder:text-white/20" />
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-[#00F2FE] transition-colors"><Search className="w-4 h-4" /></div>
                    </div>

                    <div className="flex gap-2">
                        {(['rating', 'name', 'date'] as SortOption[]).map((opt) => (
                            <button 
                                key={opt} 
                                onClick={() => setSortBy(opt)} 
                                className={`flex-1 py-2 text-[9px] font-black uppercase tracking-widest rounded-xl border transition-all ${sortBy === opt ? 'bg-white/10 border-white/30 text-white shadow-lg' : 'bg-transparent border-white/5 text-white/20 hover:text-white/40'}`}
                            >
                                {opt}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="flex-grow overflow-y-auto custom-hub-scrollbar p-4 space-y-3 pt-6">
                    {confirmedPersonnel.map((person) => {
                        const isSelected = viewMode === 'intel' ? selectedPlayerId === person.id : duelSlots.includes(person.id);
                        const tierColor = TIER_COLORS[person.tier] || '#94a3b8';
                        
                        return (
                            <div 
                                key={person.id} 
                                onClick={() => handlePlayerClick(person.id)} 
                                className={`group/unit relative flex items-center justify-between h-[90px] w-full rounded-[1.2rem] transition-all duration-300 cursor-pointer border
                                    ${isSelected 
                                        ? 'bg-[#1A1D24] border-white/20 shadow-2xl' 
                                        : 'bg-[#111111] border-transparent hover:bg-white/[0.03]'
                                    }`}
                            >
                                {/* LEFT ACCENT BAR */}
                                <div 
                                    className="absolute left-0 top-1/2 -translate-y-1/2 w-[4px] h-10 rounded-r-full transition-all duration-500" 
                                    style={{ 
                                        backgroundColor: tierColor, 
                                        boxShadow: isSelected ? `0 0 15px ${tierColor}` : `0 0 5px ${tierColor}44`,
                                        opacity: isSelected ? 1 : 0.4
                                    }}
                                ></div>
                                
                                <div className="flex items-center px-5 gap-5 w-full">
                                    <div className="shrink-0 transition-transform duration-500 group-hover/unit:scale-105">
                                        <HubPortraitAvatar photo={person.playerCard} tierColor={tierColor} />
                                    </div>
                                    
                                    <div className="flex flex-col min-w-0 flex-grow">
                                        <span className={`font-russo text-[17px] uppercase tracking-tight truncate transition-colors ${isSelected ? 'text-white' : 'text-white/70'}`}>
                                            {person.nickname}
                                        </span>
                                        <span className="text-[9px] font-chakra font-black text-white/30 uppercase tracking-[0.2em] mt-0.5">{person.tier}</span>
                                    </div>

                                    <div className="flex flex-col items-end shrink-0">
                                        <div className="flex items-baseline gap-1.5">
                                            <span 
                                                className="font-russo text-4xl font-black transition-all duration-500"
                                                style={{ 
                                                    color: tierColor,
                                                    textShadow: `0 0 20px ${tierColor}44`
                                                }}
                                            >
                                                {person.rating}
                                            </span>
                                            <span className="text-[8px] font-black text-white/20 uppercase tracking-tighter">OVR</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* CONTENT AREA - RIGHT COLUMN */}
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
