
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
        <div className="relative flex flex-col items-center">
            {player ? (
                <>
                    <button onClick={onClear} className="absolute -top-1 -right-1 z-10 text-white/30 hover:text-white transition-colors"><XCircle className="w-5 h-5" /></button>
                    <PlayerAvatar player={player} size="xl" className={`
                        transition-all duration-500 border-2
                        ${side === 'p1' ? 'border-[#00F2FE]/80 shadow-[0_0_20px_rgba(0,242,254,0.2)]' : 'border-white/20 shadow-xl'}
                    `} />
                    <p className="font-chakra font-black text-[11px] text-white uppercase mt-2 drop-shadow-[0_0_8px_rgba(0,0,0,0.5)]">{player.nickname}</p>
                </>
            ) : (
                <div className={`
                    w-24 h-24 rounded-full flex flex-col items-center justify-center 
                    text-white/10
                    bg-white/[0.03] border-2 border-dashed border-white/10
                `}>
                    <Zap className="w-8 h-8" />
                    <p className="font-chakra font-black text-[8px] mt-1 uppercase text-white/40 tracking-widest">{t.legionnaire_select}</p>
                </div>
            )}
        </div>
    );
    
    return (
        <Modal isOpen={isOpen} onClose={onClose} size="sm" hideCloseButton containerClassName="!bg-transparent !p-0 !border-0 !shadow-none">
            <div className="p-5 rounded-[2.5rem] border border-white/10 shadow-2xl overflow-hidden relative" style={{ background: 'radial-gradient(ellipse at top, #0f172a 0%, #020617 65%, #01040a 100%)', boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.08), 0 30px 60px -12px rgba(0, 0, 0, 0.7)' }}>
                <button onClick={onClose} className="absolute top-4 right-4 z-50 text-white/30 hover:text-white transition-all hover:scale-110 active:scale-95"><XCircle className="w-6 h-6" /></button>
                <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] pointer-events-none"></div>
                <h3 className="font-russo text-lg text-white uppercase tracking-[0.25em] mb-8 text-center relative z-10">{t.duel_title}</h3>
                <div className="flex items-center justify-center gap-6 mb-8 relative z-10 px-4">
                    <PlayerSlot player={player1} onClear={() => setP1(null)} side="p1" />
                    <div className="flex flex-col items-center"><span className="font-blackops text-3xl text-white/10 select-none tracking-tighter">VS</span></div>
                    <PlayerSlot player={player2} onClear={() => setP2(null)} side="p2" />
                </div>
                <div className="relative mb-3 z-10 px-2">
                    <input type="text" placeholder={t.duel_id_unit} value={search} onChange={(e) => setSearch(e.target.value)} className="w-full bg-slate-900/60 border border-white/10 rounded-2xl p-3 pl-10 text-[10px] font-chakra font-black uppercase tracking-widest text-white focus:outline-none focus:border-[#00F2FE]/50 transition-all placeholder:text-white/20" />
                    <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                </div>
                <div className="max-h-48 overflow-y-auto custom-hub-scrollbar space-y-2 px-2 pr-1 mb-6 z-10 relative">
                    {availablePlayers.map(p => (
                        <button key={p.id} onClick={() => handleSelect(p.id)} className="w-full flex items-center justify-between p-2.5 rounded-2xl bg-white/[0.03] border border-white/5 hover:bg-[#00F2FE]/10 hover:border-[#00F2FE]/40 transition-all group">
                            <span className="font-chakra font-black text-xs text-white/70 group-hover:text-white uppercase tracking-wider">{p.nickname}</span>
                            <span className="font-russo text-base text-white group-hover:text-white transition-colors">{p.rating}</span>
                        </button>
                    ))}
                </div>
                <div className="px-2">
                    <button onClick={handleStartClick} disabled={!p1 || !p2} className="w-full bg-slate-300 text-black font-russo py-4 rounded-2xl text-xs uppercase tracking-[0.2em] transition-all disabled:opacity-20 disabled:grayscale hover:bg-[#00F2FE]/90 hover:shadow-[0_0_20px_rgba(0,242,254,0.3)] active:scale-95 relative z-10">{t.duel_initiate}</button>
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
                {/* SIDEBAR HEADER - REFINED ALIGNMENT */}
                <div className="p-6 pb-2 space-y-4 pt-10">
                    {/* Only shift this row to avoid corner rays - increased pl-24 as requested */}
                    <div className="flex items-center justify-between mb-2 pr-2 pl-24 transition-all duration-300">
                        <div className="max-w-fit">
                            <h3 className="font-russo text-[14px] uppercase tracking-[0.15em] text-white italic leading-tight">{t.hubPlayers}</h3>
                            <div className="h-[1px] w-full bg-[#00F2FE] mt-1.5 opacity-50 shadow-[0_0_5px_#00F2FE]"></div>
                        </div>
                        <button onClick={() => setIsDuelSetupOpen(true)} className="group flex items-center transition-all opacity-40 hover:opacity-100 hover:scale-105 active:scale-95">
                             <span className="font-russo text-[14px] text-white uppercase tracking-[0.2em] group-hover:text-[#00F2FE] group-hover:drop-shadow-[0_0_8px_rgba(0,242,254,0.6)] transition-all">DUEL</span>
                        </button>
                    </div>

                    {/* Search bar and filters are now aligned with the list below */}
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
                                {/* Refined Selection Indicator - More compact & aesthetic */}
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
                                            <span className={`font-russo text-2xl transition-all duration-300 ${isSelected ? 'text-[#00F2FE] scale-110' : 'text-white/30'}`}>{person.rating}</span>
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
