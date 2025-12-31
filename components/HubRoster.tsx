
import React, { useMemo, useState, useEffect } from 'react';
import { useApp } from '../context';
import { PlayerTier, PlayerStatus, Player } from '../types';
import { Search, XCircle, Zap } from '../icons';
import { Modal, useTranslation } from '../ui';
import { PlayerAvatar } from './avatars';

const HubPortraitAvatar: React.FC<{ photo?: string; tierColor: string }> = ({ photo, tierColor }) => (
    <div 
        className="relative w-[62px] h-[78px] rounded-[1.2rem] overflow-hidden bg-[#0C0E12] transition-all duration-500 ease-out z-10 
        border border-white/20 
        group-hover:scale-110 group-hover:-translate-y-1
        group-hover:border-[color:var(--tier-color)]
        group-hover:shadow-[0_10px_20px_-5px_rgba(0,0,0,0.5),0_0_15px_var(--tier-color)]"
        style={{ 
            boxShadow: `0 4px 6px -1px rgba(0, 0, 0, 0.5)` 
        }}
    >
        <div 
            className="absolute inset-0 bg-cover transition-transform duration-700" 
            style={{ 
                backgroundImage: photo ? `url(${photo})` : 'none',
                backgroundPosition: 'center 12%' // Поднимаем фокус на лицо
            }}
        >
            {!photo && (
                <div className="absolute inset-0 flex items-center justify-center bg-white/5">
                     <Search className="w-6 h-6 text-white/10" />
                </div>
            )}
        </div>
        {/* Градиентная маска для объема */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-white/10 opacity-60"></div>
        <div className="absolute inset-0 border border-white/5 pointer-events-none rounded-[1.1rem]"></div>
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
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            size="sm"
            hideCloseButton
            containerClassName="!bg-transparent !p-0 !border-0 !shadow-none"
        >
            <div
                className="p-5 rounded-[2.5rem] border border-white/10 shadow-2xl overflow-hidden relative"
                style={{
                    background: 'radial-gradient(ellipse at top, #0f172a 0%, #020617 65%, black 100%)',
                    boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.08), 0 30px 60px -12px rgba(0, 0, 0, 0.7)'
                }}
            >
                <button onClick={onClose} className="absolute top-4 right-4 z-50 text-white/30 hover:text-white transition-all hover:scale-110 active:scale-95"><XCircle className="w-6 h-6" /></button>
                <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] pointer-events-none"></div>
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-80 h-40 bg-[#00F2FE]/10 blur-[80px] pointer-events-none"></div>
                <h3 className="font-russo text-lg text-white uppercase tracking-[0.25em] mb-8 text-center relative z-10" style={{ textShadow: '0 0 30px rgba(0,242,254,0.4)' }}>{t.duel_title}</h3>
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
    onSelectPlayer: (id: string) => void;
    sortBy: SortOption;
    setSortBy: (opt: SortOption) => void;
    search: string;
    setSearch: (val: string) => void;
    onStartDuel: (p1Id: string, p2Id: string) => void;
}

export const HubRoster: React.FC<HubRosterProps> = ({ onSelectPlayer, sortBy, setSortBy, search, setSearch, onStartDuel }) => {
    const { allPlayers } = useApp();
    const t = useTranslation();
    const [isDuelSetupOpen, setIsDuelSetupOpen] = useState(false);

    const confirmedPersonnel = useMemo(() => {
        return allPlayers
            .filter(p => p.status === PlayerStatus.Confirmed)
            .filter(p => p.nickname?.toLowerCase().includes(search.toLowerCase()))
            .sort((a, b) => {
                if (sortBy === 'name') return (a.nickname || '').localeCompare(b.nickname || '');
                if (sortBy === 'rating') return (b.rating || 0) - (a.rating || 0);
                if (sortBy === 'date') return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
                return 0;
            });
    }, [allPlayers, search, sortBy]);

    const sortBtnClass = (opt: SortOption) => `
        relative px-4 py-1 text-[9px] font-black uppercase tracking-[0.15em] rounded-full border transition-all duration-500 h-8 flex items-center justify-center min-w-[80px] z-10
        ${sortBy === opt ? 'bg-slate-900/60 border-[#00F2FE] text-[#00F2FE] shadow-[0_0_8px_rgba(0,242,254,0.25)]' : 'bg-slate-900/40 border-white/5 text-white/30 hover:text-white/60 hover:border-white/10'}
    `;

    return (
        <div className="absolute inset-0 flex flex-col animate-in fade-in duration-700 overflow-hidden rounded-[2.5rem]">
            <div className="absolute inset-0 z-0 pointer-events-none">
                {/* Радиальный градиент в более темной гамме (темнее, чем на дашборде) */}
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#0a1121] via-[#01040a] to-black"></div>
                <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] pointer-events-none"></div>
            </div>
            
            {/* TOP NAVIGATION BLOCK */}
            <div className="pt-2 mb-2 shrink-0 flex flex-col md:flex-row md:items-center justify-between gap-4 px-10 md:px-24 lg:px-32 relative z-10">
                <div className="flex items-center gap-10 ml-4 transition-all duration-500">
                    <div className="max-w-fit">
                        <h3 className="font-russo text-[18px] uppercase tracking-[0.1em] text-white italic leading-tight whitespace-nowrap" style={{ textShadow: '0 0 20px rgba(255,255,255,0.2)' }}>{t.hubPlayers}</h3>
                        <div className="h-[2px] w-full bg-[#00F2FE] mt-2 rounded-full shadow-[0_0_10px_rgba(0,242,254,0.5)]"></div>
                    </div>
                    <button onClick={() => setIsDuelSetupOpen(true)} className="max-w-fit group relative text-left">
                        <h3 className="font-russo text-[18px] uppercase tracking-[0.1em] text-white/30 group-hover:text-slate-200 transition-all duration-500 italic leading-tight whitespace-nowrap">DUEL</h3>
                        <div className="h-[2px] w-full bg-white/10 group-hover:bg-slate-400/50 mt-2 rounded-full transition-all duration-500"></div>
                    </button>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-4">
                    <div className="relative group w-full sm:w-64 h-8">
                        <input type="text" placeholder="FIND UNIT..." value={search} onChange={(e) => setSearch(e.target.value)} className="relative w-full h-full bg-slate-900/60 border border-white/10 rounded-full pl-5 pr-10 text-[10px] font-chakra font-black text-white uppercase tracking-[0.15em] focus:outline-none focus:border-[#00F2FE]/40 transition-all placeholder:text-white/20 z-10" />
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-[#00F2FE] transition-colors z-20"><Search className="w-3.5 h-3.5" /></div>
                    </div>
                    <div className="flex gap-2 items-center h-8">
                        {(['name', 'rating', 'date'] as SortOption[]).map((opt) => (
                            <button key={opt} onClick={() => setSortBy(opt)} className={sortBtnClass(opt)} style={sortBy === opt ? { textShadow: '0 0 8px rgba(0, 242, 254, 0.6)' } : {}}>{opt.toUpperCase()}</button>
                        ))}
                    </div>
                </div>
            </div>
            
            {/* PLAYER PLAQUES CONTAINER */}
            <div className="flex-grow overflow-y-auto px-6 md:px-12 lg:px-20 pt-12 custom-hub-scrollbar relative z-10">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5 pb-24 max-w-7xl mx-auto">
                    {confirmedPersonnel.map((person, idx) => {
                        const tierColor = TIER_COLORS[person.tier] || '#94a3b8';
                        return (
                            <div key={person.id} onClick={() => person.id && onSelectPlayer(person.id)} className="group relative flex items-center justify-between h-[84px] w-full rounded-2xl transition-all duration-500 cursor-pointer" style={{ '--tier-color': tierColor } as React.CSSProperties}>
                                <div className="absolute inset-0 rounded-2xl overflow-hidden z-1 bg-gradient-to-br from-[#161b22] to-[#0a0d14] border border-white/[0.06] group-hover:border-[var(--tier-color)] transition-all duration-500 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.9),inset_0_1px_1px_rgba(255,255,255,0.05)] group-hover:shadow-[0_0_20px_var(--tier-color)]">
                                    <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: `linear-gradient(45deg, #fff 25%, transparent 25%, transparent 50%, #fff 50%, #fff 75%, transparent 75%, transparent)`, backgroundSize: '4px 4px' }}></div>
                                    <div className="absolute -top-10 -left-10 w-20 h-20 bg-[var(--tier-color)] rounded-full blur-[40px] pointer-events-none opacity-5 group-hover:opacity-20 transition-opacity"></div>
                                    <div className="absolute top-0 left-0 w-1.5 h-full bg-[var(--tier-color)] opacity-30 group-hover:opacity-100 transition-opacity duration-500"></div>
                                </div>
                                <div className="relative z-10 h-full w-full flex items-center px-4 gap-4">
                                    <span className="font-mono text-[10px] text-white/5 w-5 shrink-0 font-black tracking-tighter group-hover:text-white/10 transition-colors">{(idx + 1).toString().padStart(2, '0')}</span>
                                    
                                    {/* ОБНОВЛЕННЫЙ АВАТАР - КАПСУЛА */}
                                    <div className="shrink-0 transition-transform duration-500">
                                        <HubPortraitAvatar photo={person.playerCard} tierColor={tierColor} />
                                    </div>

                                    <div className="flex flex-col gap-0.5 flex-grow min-w-0">
                                        <span className="font-chakra font-black text-base text-white/80 uppercase tracking-wide group-hover:text-white transition-colors truncate leading-tight">{person.nickname}</span>
                                        <div className="flex items-center gap-2">
                                            <span className="font-mono text-[7px] text-white/40 group-hover:text-[var(--tier-color)] uppercase tracking-[0.2em] font-black transition-colors" style={{ textShadow: '0 0 5px rgba(0,0,0,0.5)' }}>{person.tier}</span>
                                            <div className="h-[1px] w-4 bg-white/5 rounded-full"></div>
                                        </div>
                                    </div>
                                    <div className="flex flex-col items-end shrink-0 w-20">
                                        <div className="flex items-baseline gap-1.5">
                                            <span className="font-russo text-3xl text-white/90 group-hover:text-[var(--tier-color)] group-hover:scale-110 transition-all duration-500 leading-none" style={{ textShadow: '0 0 10px rgba(0,0,0,0.5)' }}>{person.rating}</span>
                                            <div className="flex flex-col items-start leading-none mb-0.5"><span className="font-mono font-black text-[7px] text-white/20 group-hover:text-[var(--tier-color)] uppercase tracking-[0.1em] transition-colors">OVR</span></div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
            <DuelSetupModal isOpen={isDuelSetupOpen} onClose={() => setIsDuelSetupOpen(false)} players={confirmedPersonnel} onStart={onStartDuel} />
        </div>
    );
};
