
import React, { useMemo, useState, useEffect } from 'react';
import { useApp } from '../context';
import { PlayerTier, PlayerStatus, Player } from '../types';
import { Search, XCircle, Zap, Users } from '../icons';
import { Modal, useTranslation } from '../ui';
import { PlayerAvatar } from './avatars';
import { HubPlayerIntel } from './HubPlayerIntel';

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

const DuelSetupModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    players: Player[];
    onStart: (p1Id: string, p2Id: string) => void;
}> = ({ isOpen, onClose, players, onStart }) => {
    const t = useTranslation();
    const [p1, setP1] = useState<string | null>(null);
    const [p2, setP2] = useState<string | null>(null);
    const [search, setSearch] = useState('');

    const player1 = players.find(p => p.id === p1);
    const player2 = players.find(p => p.id === p2);

    const availablePlayers = useMemo(() => {
        return players
            .filter(p => p.id !== p1 && p.id !== p2)
            .filter(p => p.nickname.toLowerCase().includes(search.toLowerCase()));
    }, [players, search, p1, p2]);

    const handleSelect = (playerId: string) => {
        if (!p1) setP1(playerId);
        else if (!p2) setP2(playerId);
    };

    const handleStartClick = () => {
        if (p1 && p2) onStart(p1, p2);
    };
    
    useEffect(() => {
        if (!isOpen) {
            setP1(null); setP2(null); setSearch('');
        }
    }, [isOpen]);

    const PlayerSlot: React.FC<{ player: Player | undefined, onClear: () => void, side: 'p1' | 'p2' }> = ({ player, onClear, side }) => (
        <div className="relative flex flex-col items-center group/slot">
            {player ? (
                <div className="animate-in zoom-in duration-300 flex flex-col items-center">
                    <button onClick={onClear} className="absolute -top-2 -right-2 z-20 text-white/30 hover:text-red-500 transition-all hover:scale-110"><XCircle className="w-6 h-6" /></button>
                    <div className="relative p-1 rounded-full border border-[#00F2FE]/30 shadow-[0_0_15px_rgba(0,242,254,0.2)] bg-black/40">
                         <PlayerAvatar player={player} size="lg" className="border-2 border-white/10" />
                    </div>
                    <p className="font-russo text-[11px] text-[#00F2FE] uppercase mt-3 tracking-widest drop-shadow-[0_0_8px_rgba(0,242,254,0.4)]">{player.nickname}</p>
                    <div className="flex items-baseline gap-1 mt-0.5">
                        <span className="text-[14px] font-black font-russo text-white/80">{player.rating}</span>
                        <span className="text-[6px] font-black text-white/30 uppercase">OVR</span>
                    </div>
                </div>
            ) : (
                <div className={`
                    w-20 h-20 md:w-24 md:h-24 rounded-full flex flex-col items-center justify-center 
                    bg-white/[0.02] border-2 border-dashed border-white/5 relative group-hover/slot:border-[#00F2FE]/20 transition-all duration-500
                `}>
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-[#00F2FE]/5 via-transparent to-transparent opacity-0 group-hover/slot:opacity-100 transition-opacity"></div>
                    <Zap className="w-8 h-8 text-white/5 animate-pulse" />
                    <p className="font-chakra font-black text-[7px] mt-1.5 uppercase text-white/20 tracking-[0.2em]">{t.legionnaire_select}</p>
                </div>
            )}
        </div>
    );
    
    return (
        <Modal isOpen={isOpen} onClose={onClose} size="sm" hideCloseButton containerClassName="!bg-transparent !p-0 !border-0 !shadow-none">
            <div className="rounded-[2.5rem] border border-white/10 shadow-[0_30px_60px_-12px_rgba(0,0,0,0.9)] overflow-hidden relative bg-[#0a0c10]">
                {/* Neon Header Accent */}
                <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-[#00F2FE] to-transparent shadow-[0_0_10px_#00F2FE]"></div>
                
                {/* Background Texture */}
                <div className="absolute inset-0 opacity-[0.03] bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] pointer-events-none"></div>
                
                <div className="p-6 relative z-10">
                    <div className="flex justify-between items-center mb-8 px-2">
                        <div className="flex flex-col">
                            <h3 className="font-russo text-xl text-white uppercase tracking-[0.1em] italic">{t.duel_title}</h3>
                            <span className="text-[7px] font-black text-[#00F2FE] tracking-[0.4em] uppercase opacity-70">Simulation Protocol v5.3.2</span>
                        </div>
                        <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/30 hover:text-white transition-all hover:scale-110 active:scale-95"><XCircle className="w-5 h-5" /></button>
                    </div>

                    <div className="flex items-center justify-around gap-2 mb-10 px-2 relative">
                        <PlayerSlot player={player1} onClear={() => setP1(null)} side="p1" />
                        
                        <div className="flex flex-col items-center shrink-0">
                            <div className="w-10 h-10 rounded-full border border-white/5 flex items-center justify-center bg-black/40 mb-2">
                                <span className="font-blackops text-xl text-white/10 italic">VS</span>
                            </div>
                            <div className="h-4 w-px bg-gradient-to-b from-white/10 to-transparent"></div>
                        </div>

                        <PlayerSlot player={player2} onClear={() => setP2(null)} side="p2" />
                    </div>

                    <div className="space-y-4">
                        <div className="relative group px-1">
                            <input 
                                type="text" 
                                placeholder={t.duel_id_unit} 
                                value={search} 
                                onChange={(e) => setSearch(e.target.value)} 
                                className="w-full bg-black/40 border border-white/5 rounded-2xl p-3.5 pl-11 text-[10px] font-chakra font-black uppercase tracking-widest text-white focus:outline-none focus:border-[#00F2FE]/30 transition-all placeholder:text-white/10 shadow-inner" 
                            />
                            <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/10 group-focus-within:text-[#00F2FE]/50 transition-colors" />
                        </div>

                        <div className="max-h-44 overflow-y-auto custom-hub-scrollbar space-y-1.5 px-1 pr-1.5">
                            {availablePlayers.map(p => (
                                <button 
                                    key={p.id} 
                                    onClick={() => handleSelect(p.id)} 
                                    className="w-full flex items-center justify-between p-3 rounded-2xl bg-white/[0.02] border border-white/[0.03] hover:bg-[#00F2FE]/5 hover:border-[#00F2FE]/20 transition-all group/item"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-1.5 h-1.5 rounded-full bg-white/5 group-hover/item:bg-[#00F2FE] group-hover/item:shadow-[0_0_8px_#00F2FE] transition-all"></div>
                                        <span className="font-chakra font-black text-[11px] text-white/60 group-hover/item:text-white uppercase tracking-wider transition-colors">{p.nickname}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-[10px] font-mono text-white/10 group-hover/item:text-white/30 uppercase tracking-tighter transition-colors">{p.tier}</span>
                                        <span className="font-russo text-sm text-white group-hover/item:text-[#00F2FE] transition-colors">{p.rating}</span>
                                    </div>
                                </button>
                            ))}
                        </div>

                        <div className="pt-4 px-1">
                            <button 
                                onClick={handleStartClick} 
                                disabled={!p1 || !p2} 
                                className="w-full relative overflow-hidden group/btn bg-[#0a0c10] border border-[#00F2FE]/30 py-4 rounded-2xl transition-all hover:border-[#00F2FE] hover:shadow-[0_0_25px_rgba(0,242,254,0.3)] active:scale-95 disabled:opacity-10 disabled:grayscale"
                            >
                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#00F2FE]/5 to-transparent opacity-0 group-hover/btn:opacity-100 transition-opacity"></div>
                                <span className="relative z-10 font-russo text-[11px] text-[#00F2FE] uppercase tracking-[0.3em] group-hover/btn:text-white transition-colors">{t.duel_initiate}</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </Modal>
    );
};

interface HubRosterProps {
    selectedPlayerId: string | null;
    onSelectPlayer: (id: string | null) => void;
    sortBy: SortOption;
    setSortBy: (opt: SortOption) => void;
    search: string;
    setSearch: (val: string) => void;
    onStartDuel: (p1Id: string, p2Id: string) => void;
}

export const HubRoster: React.FC<HubRosterProps> = ({ selectedPlayerId, onSelectPlayer, sortBy, setSortBy, search, setSearch, onStartDuel }) => {
    const { allPlayers } = useApp();
    const t = useTranslation();
    const [isDuelSetupOpen, setIsDuelSetupOpen] = useState(false);

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
        // Auto-select first player on mount if none selected
        if (!selectedPlayerId && confirmedPersonnel.length > 0) {
            onSelectPlayer(confirmedPersonnel[0].id);
        }
    }, [confirmedPersonnel, selectedPlayerId, onSelectPlayer]);

    return (
        <div className="absolute inset-0 flex flex-row animate-in fade-in duration-700 overflow-hidden rounded-[2.5rem]">
            {/* SIDEBAR - LEFT COLUMN */}
            <div className="w-[350px] flex flex-col border-r border-white/5 bg-black/40 relative z-20 shrink-0">
                {/* SIDEBAR HEADER - Positioned upward closer to hanging tags */}
                <div className="p-6 pb-2 space-y-3 pt-1">
                    <div className="flex items-center justify-start mb-1 pr-2 pl-40 transition-all duration-300">
                        <button onClick={() => setIsDuelSetupOpen(true)} className="group flex flex-col items-center transition-all opacity-40 hover:opacity-100 active:scale-95">
                             <div className="max-w-fit flex flex-col items-center">
                                <span className="font-blackops text-[24px] text-white uppercase tracking-[0.1em] group-hover:text-[#00F2FE] transition-colors italic">DUEL</span>
                                <div className="h-[2px] w-full bg-gradient-to-r from-transparent via-[#00F2FE] to-transparent mt-1 shadow-[0_0_8px_#00F2FE]"></div>
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

                {/* SCROLLABLE PLAYER LIST (1 COLUMN) */}
                <div className="flex-grow overflow-y-auto custom-hub-scrollbar p-4 pt-4 space-y-2.5">
                    {confirmedPersonnel.map((person, idx) => {
                        const isSelected = selectedPlayerId === person.id;
                        const tierColor = TIER_COLORS[person.tier] || '#94a3b8';
                        return (
                            <div 
                                key={person.id} 
                                onClick={() => onSelectPlayer(person.id)} 
                                className={`group/unit relative flex items-center justify-between h-[68px] w-full rounded-2xl transition-all duration-300 cursor-pointer 
                                    ${isSelected ? 'bg-white/10 border-white/15 shadow-xl' : 'bg-white/[0.02] border-transparent hover:bg-white/[0.05]'} border`}
                            >
                                <div 
                                    className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-6 rounded-r-full transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)]" 
                                    style={{ 
                                        backgroundColor: isSelected ? tierColor : 'transparent', 
                                        boxShadow: isSelected ? `0 0 12px ${tierColor}, 0 0 4px ${tierColor}` : 'none',
                                        opacity: isSelected ? 1 : 0,
                                        transform: isSelected ? 'translateY(-50%) scaleX(1)' : 'translateY(-50%) scaleX(0)'
                                    }}
                                ></div>
                                
                                <div className="flex items-center px-4 gap-4 w-full">
                                    <div className="shrink-0 transition-transform duration-300 group-hover/unit:scale-105">
                                        <HubPortraitAvatar photo={person.playerCard} tierColor={tierColor} />
                                    </div>
                                    <div className="flex flex-col min-w-0 flex-grow">
                                        <span className={`font-chakra font-black text-sm uppercase tracking-wide truncate transition-colors ${isSelected ? 'text-white' : 'text-white/60'}`}>
                                            {person.nickname}
                                        </span>
                                        <span className="text-[7px] font-mono font-black text-white/20 uppercase tracking-[0.2em]">{person.tier}</span>
                                    </div>
                                    <div className="flex flex-col items-end shrink-0">
                                        <div className="flex items-baseline gap-1">
                                            {/* RATING COLOR matches tier color when selected */}
                                            <span 
                                                className={`font-russo text-2xl transition-all duration-300 ${isSelected ? 'scale-110' : 'text-white/30'}`}
                                                style={{ 
                                                    color: isSelected ? tierColor : undefined,
                                                    textShadow: isSelected ? `0 0 12px ${tierColor}66` : 'none'
                                                }}
                                            >
                                                {person.rating}
                                            </span>
                                            <span className="text-[6px] font-mono font-black text-white/10 uppercase">OVR</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* CONTENT AREA - RIGHT COLUMN (70%) */}
            <div className="flex-grow relative bg-[#01040a] overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#0a1121] via-black to-black opacity-60"></div>
                <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]"></div>

                {selectedPlayerId ? (
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

            <DuelSetupModal isOpen={isDuelSetupOpen} onClose={() => setIsDuelSetupOpen(false)} players={confirmedPersonnel} onStart={onStartDuel} />
        </div>
    );
};
