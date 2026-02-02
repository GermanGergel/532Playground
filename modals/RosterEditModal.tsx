
import React, { useState } from 'react';
import { Button, Modal, useTranslation } from '../ui';
import { Session, Player, PlayerStatus } from '../types';
import { XCircle, RefreshCw, TransferIcon, Search, PlusCircle, Trash2, UserPlus, ChevronLeft } from '../icons';
import { PlayerAvatar } from '../components/avatars';
import { newId } from '../screens/utils';
import { getTierForRating } from '../services/rating';

interface RosterEditModalProps {
    isOpen: boolean;
    onClose: () => void;
    session: Session;
    allPlayers: Player[]; // needed for search/replace
    onRemove: (teamId: string, playerId: string) => void;
    onReplace: (teamId: string, oldPlayerId: string, newPlayer: Player) => void;
    onSwap: (playerId: string, sourceTeamId: string, targetTeamId: string, swapWithId?: string) => void;
    onAdd: (teamId: string, newPlayer: Player) => void; 
}

type RosterMenuMode = 'menu' | 'select_action_target' | 'replace_search' | 'add_search' | 'add_select_team' | 'swap_target' | 'remove_confirm';

export const RosterEditModal: React.FC<RosterEditModalProps> = ({ 
    isOpen, onClose, session, allPlayers, onRemove, onReplace, onSwap, onAdd
}) => {
    const t = useTranslation();
    const [mode, setMode] = useState<RosterMenuMode>('menu');
    const [actionType, setActionType] = useState<'remove' | 'replace' | 'transfer' | null>(null);
    
    // State for specific flows
    const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
    const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
    
    // New state for "Add Player" reverse flow
    const [pendingAddPlayer, setPendingAddPlayer] = useState<Player | null>(null);

    // For Replace/Add Search
    const [searchTerm, setSearchTerm] = useState('');

    // Reset state on open
    React.useEffect(() => {
        if (isOpen) {
            resetToMenu();
        }
    }, [isOpen]);

    const resetToMenu = () => {
        setMode('menu');
        setActionType(null);
        setSelectedPlayerId(null);
        setSelectedTeamId(null);
        setPendingAddPlayer(null);
        setSearchTerm('');
    };

    // --- MENU HANDLERS ---
    const handleMenuClick = (type: 'add' | 'remove' | 'replace' | 'transfer') => {
        if (type === 'add') {
            // New Flow: Search First
            setMode('add_search');
        } else {
            setActionType(type);
            setMode('select_action_target');
        }
    };

    // --- LIST SELECTION HANDLER (Common for Remove, Replace, Transfer) ---
    const handleTargetSelect = (teamId: string, playerId: string) => {
        setSelectedTeamId(teamId);
        setSelectedPlayerId(playerId);

        if (actionType === 'remove') {
            setMode('remove_confirm');
        } else if (actionType === 'replace') {
            setMode('replace_search');
        } else if (actionType === 'transfer') {
            setMode('swap_target');
        }
    };

    // --- ADD PLAYER LOGIC (REVERSED) ---
    const handlePlayerSelectForAdd = (player: Player) => {
        setPendingAddPlayer(player);
        setMode('add_select_team');
    };

    const handleTeamSelectForAdd = (teamId: string) => {
        if (pendingAddPlayer) {
            onAdd(teamId, pendingAddPlayer);
            resetToMenu(); // or onClose()
        }
    };

    // --- SWAP LOGIC ---
    const handleSwapTargetSelect = (targetTeamId: string) => {
        if (!selectedPlayerId || !selectedTeamId) return;
        const targetTeam = session.teams.find(t => t.id === targetTeamId);
        if (!targetTeam) return;

        if (targetTeam.playerIds.length < session.playersPerTeam) {
            onSwap(selectedPlayerId, selectedTeamId, targetTeamId);
            resetToMenu();
            return;
        }
    };

    const handleSwapWithPlayer = (targetPlayerId: string) => {
        if (!selectedPlayerId || !selectedTeamId) return;
        const targetTeam = session.teams.find(t => t.playerIds.includes(targetPlayerId));
        if (targetTeam) {
            onSwap(selectedPlayerId, selectedTeamId, targetTeam.id, targetPlayerId);
            resetToMenu();
        }
    };

    // --- SEARCH LOGIC ---
    const activePlayerIds = new Set(session.teams.flatMap(t => t.playerIds));
    const searchResults = allPlayers.filter(p => 
        !activePlayerIds.has(p.id) && 
        (p.nickname.toLowerCase().includes(searchTerm.toLowerCase()) || 
         p.surname.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    // --- REPLACE LOGIC ---
    const handleReplaceConfirm = (newPlayer: Player) => {
        if (selectedTeamId && selectedPlayerId) {
            onReplace(selectedTeamId, selectedPlayerId, newPlayer);
            resetToMenu();
        }
    };

    const createPlayerObject = (nickname: string) => {
        const startRating = 68;
        return {
            id: newId(),
            nickname,
            surname: '',
            createdAt: new Date().toISOString(),
            countryCode: 'UA',
            status: PlayerStatus.Unconfirmed,
            totalGoals: 0, totalAssists: 0, totalGames: 0, totalWins: 0, totalDraws: 0, totalLosses: 0,
            totalSessionsPlayed: 0, rating: startRating, initialRating: startRating, tier: getTierForRating(startRating),
            monthlyGoals: 0, monthlyAssists: 0, monthlyGames: 0, monthlyWins: 0, monthlySessionsPlayed: 0,
            form: 'stable' as const, badges: {}, skills: [], lastPlayedAt: new Date().toISOString(), sessionHistory: [],
            records: { bestGoalsInSession: { value: 0, sessionId: '' }, bestAssistsInSession: { value: 0, sessionId: '' }, bestWinRateInSession: { value: 0, sessionId: '' } },
        } as Player;
    };

    const handleCreateAndAction = (nickname: string) => {
        const newPlayer = createPlayerObject(nickname);
        if (mode === 'add_search') {
            handlePlayerSelectForAdd(newPlayer);
        } else {
            handleReplaceConfirm(newPlayer);
        }
    };

    // --- REMOVE LOGIC ---
    const handleRemoveConfirm = () => {
        if (selectedTeamId && selectedPlayerId) {
            onRemove(selectedTeamId, selectedPlayerId);
            resetToMenu();
        }
    };

    if (!isOpen) return null;

    const selectedPlayer = selectedPlayerId ? session.playerPool.find(p => p.id === selectedPlayerId) : null;

    // --- COMPONENTS ---
    const MenuButton = ({ icon: Icon, label, colorClass, onClick, desc }: any) => (
        <button 
            onClick={onClick}
            className={`w-full p-3 rounded-xl border bg-white/5 flex items-center justify-between group transition-all duration-200 active:scale-95 ${colorClass}`}
        >
            <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center bg-black/40 border border-white/5`}>
                    <Icon className="w-4 h-4" />
                </div>
                <div className="flex flex-col items-start">
                    <span className="font-bold text-sm uppercase tracking-wide leading-none">{label}</span>
                    <span className="text-[9px] text-white/40 uppercase tracking-wider font-mono mt-0.5">{desc}</span>
                </div>
            </div>
            <ChevronLeft className="w-4 h-4 rotate-180 opacity-50" />
        </button>
    );

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            size="xs" // Keeps it compact
            hideCloseButton
            // UPDATED: Removed mb-20, fixed width behavior
            containerClassName="!bg-[#12161b] border border-white/10 shadow-2xl !p-0 overflow-hidden w-[90vw] max-w-[340px] rounded-2xl"
        >
            {/* UPDATED: Changed h-full to h-auto so it wraps content */}
            <div className="flex flex-col h-auto max-h-[70vh]">
                {/* Header */}
                <div className="p-3 border-b border-white/5 bg-[#0a0c10] flex justify-between items-center shrink-0">
                    <div className="flex flex-col">
                        <span className="text-[8px] font-black text-[#00F2FE] uppercase tracking-[0.2em]">ROSTER</span>
                        <h3 className="text-white font-bold text-xs uppercase tracking-wide truncate max-w-[200px]">
                            {mode === 'menu' ? 'Select Action' : 
                             mode === 'select_action_target' ? `Select Target` :
                             mode === 'add_search' ? 'Find Player' :
                             mode === 'add_select_team' ? 'Select Team' :
                             mode === 'replace_search' ? 'Find Replacement' :
                             mode === 'remove_confirm' ? 'Confirm Removal' :
                             'Action'}
                        </h3>
                    </div>
                    <button onClick={mode === 'menu' ? onClose : resetToMenu} className="p-1.5 rounded-full bg-white/5 hover:bg-white/10 text-white/50 hover:text-white transition-colors">
                        {mode === 'menu' ? <XCircle className="w-4 h-4" /> : <div className="text-[9px] font-bold px-1">BACK</div>}
                    </button>
                </div>

                {/* Content Area - UPDATED: Removed flex-grow to avoid stretching */}
                <div className="overflow-y-auto px-3 py-3 custom-hub-scrollbar bg-[#12161b]">
                    
                    {/* 1. MENU */}
                    {mode === 'menu' && (
                        <div className="flex flex-col gap-2">
                            <MenuButton 
                                icon={UserPlus} 
                                label="Add" 
                                desc="New player" 
                                colorClass="border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/10"
                                onClick={() => handleMenuClick('add')}
                            />
                            {session.numTeams >= 3 && (
                                <MenuButton 
                                    icon={TransferIcon} 
                                    label="Transfer" 
                                    desc="Move team" 
                                    colorClass="border-blue-500/20 text-blue-400 hover:bg-blue-500/10"
                                    onClick={() => handleMenuClick('transfer')}
                                />
                            )}
                            <MenuButton 
                                icon={RefreshCw} 
                                label="Replace" 
                                desc="Sub & fix" 
                                colorClass="border-yellow-500/20 text-yellow-400 hover:bg-yellow-500/10"
                                onClick={() => handleMenuClick('replace')}
                            />
                            <MenuButton 
                                icon={Trash2} 
                                label="Remove" 
                                desc="Delete" 
                                colorClass="border-red-500/20 text-red-400 hover:bg-red-500/10"
                                onClick={() => handleMenuClick('remove')}
                            />
                        </div>
                    )}

                    {/* 2. ADD: SEARCH PLAYER */}
                    {(mode === 'add_search' || mode === 'replace_search') && (
                        <div className="flex flex-col h-full">
                            <div className="relative mb-2 sticky top-0 bg-[#12161b] z-10">
                                <input 
                                    type="text" 
                                    placeholder="Name..." 
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full bg-black/60 border border-white/20 rounded-lg p-2.5 pl-9 text-white text-xs focus:border-[#00F2FE] focus:outline-none"
                                    autoFocus
                                />
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                            </div>

                            <div className="flex-grow space-y-1">
                                {searchTerm.trim().length > 0 && !searchResults.find(p => p.nickname.toLowerCase() === searchTerm.toLowerCase()) && (
                                    <button 
                                        onClick={() => handleCreateAndAction(searchTerm)}
                                        className="w-full p-2.5 rounded-lg bg-[#00F2FE]/10 border border-[#00F2FE]/30 flex items-center justify-center gap-2 hover:bg-[#00F2FE]/20 transition-all mb-2"
                                    >
                                        <PlusCircle className="w-4 h-4 text-[#00F2FE]" />
                                        <span className="text-[10px] font-black text-[#00F2FE] uppercase tracking-wider">Create "{searchTerm}"</span>
                                    </button>
                                )}
                                
                                {searchResults.map(p => (
                                    <button 
                                        key={p.id}
                                        onClick={() => mode === 'add_search' ? handlePlayerSelectForAdd(p) : handleReplaceConfirm(p)}
                                        className="w-full p-2 flex items-center justify-between rounded-lg bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/20 transition-colors group"
                                    >
                                        <div className="flex items-center gap-3">
                                            <PlayerAvatar player={p} size="sm" className="w-8 h-8 rounded-md" />
                                            <div className="flex flex-col items-start">
                                                <span className="text-xs font-bold text-white group-hover:text-[#00F2FE]">{p.nickname}</span>
                                                <span className="text-[8px] text-white/40">{p.surname}</span>
                                            </div>
                                        </div>
                                        <div className="px-1.5 py-0.5 rounded bg-black/40 border border-white/10">
                                            <span className="text-[8px] font-mono text-[#00F2FE] font-bold">{p.rating}</span>
                                        </div>
                                    </button>
                                ))}
                                {searchResults.length === 0 && !searchTerm && (
                                    <p className="text-center text-[10px] text-white/20 mt-4 uppercase">Start typing...</p>
                                )}
                            </div>
                        </div>
                    )}

                    {/* 3. ADD: SELECT TEAM */}
                    {mode === 'add_select_team' && pendingAddPlayer && (
                        <div className="flex flex-col gap-2">
                             <div className="p-2 mb-2 bg-white/5 rounded-lg flex items-center gap-3 border border-white/10">
                                <PlayerAvatar player={pendingAddPlayer} size="sm" className="w-8 h-8 rounded-md" />
                                <div>
                                    <span className="text-[9px] text-white/40 uppercase tracking-widest block">Adding</span>
                                    <span className="text-sm font-bold text-white uppercase">{pendingAddPlayer.nickname}</span>
                                </div>
                             </div>

                            <p className="text-[9px] font-bold text-white/30 uppercase tracking-widest text-center mb-1">Select Destination</p>

                            {session.teams.map(team => (
                                <button
                                    key={team.id}
                                    onClick={() => handleTeamSelectForAdd(team.id)}
                                    className="w-full p-3 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between hover:bg-emerald-500/10 hover:border-emerald-500/50 transition-all group"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-3 h-3 rounded-full shadow-[0_0_8px_currentColor]" style={{ backgroundColor: team.color, color: team.color }}></div>
                                        <span className="font-black text-xs text-white uppercase group-hover:text-emerald-400 transition-colors">
                                            {t.team}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-1 text-white/20">
                                        <span className="text-[9px] font-mono">{team.playerIds.length}/{session.playersPerTeam}</span>
                                        <PlusCircle className="w-4 h-4 group-hover:text-emerald-400" />
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}

                    {/* 4. REMOVE/REPLACE/TRANSFER: SELECT TARGET */}
                    {mode === 'select_action_target' && (
                        <div className="flex flex-col gap-3">
                            {session.teams.map(team => (
                                <div key={team.id} className="bg-white/[0.02] rounded-xl border border-white/5 overflow-hidden">
                                    <div className="px-2 py-1.5 bg-white/[0.02] flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: team.color }}></div>
                                        <span className="text-[9px] font-black text-white/60 uppercase tracking-wider">{t.team}</span>
                                    </div>
                                    <div className="flex flex-col">
                                        {team.playerIds.map(pid => {
                                            const player = session.playerPool.find(p => p.id === pid);
                                            if (!player) return null;
                                            return (
                                                <button 
                                                    key={pid} 
                                                    onClick={() => handleTargetSelect(team.id, pid)}
                                                    className="flex items-center justify-between px-3 py-2 hover:bg-white/10 border-t border-white/5 text-left group transition-colors"
                                                >
                                                    <span className="font-bold text-xs text-white group-hover:text-[#00F2FE]">{player.nickname}</span>
                                                    {actionType === 'remove' && <Trash2 className="w-3.5 h-3.5 text-red-500/50 group-hover:text-red-500" />}
                                                    {actionType === 'replace' && <RefreshCw className="w-3.5 h-3.5 text-yellow-500/50 group-hover:text-yellow-500" />}
                                                    {actionType === 'transfer' && <TransferIcon className="w-3.5 h-3.5 text-blue-500/50 group-hover:text-blue-500" />}
                                                </button>
                                            );
                                        })}
                                        {team.playerIds.length === 0 && (
                                            <div className="p-2 text-center text-[9px] text-white/20 italic">Empty</div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* 5. REMOVE CONFIRM */}
                    {mode === 'remove_confirm' && selectedPlayer && (
                         <div className="flex flex-col items-center justify-center py-4 space-y-4">
                            <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center border border-red-500/30 animate-pulse">
                                <Trash2 className="w-8 h-8 text-red-500" />
                            </div>
                            <div className="text-center">
                                <h3 className="text-sm font-black text-white uppercase">Remove {selectedPlayer.nickname}?</h3>
                                <p className="text-[10px] text-white/50 mt-1 max-w-[200px] mx-auto">This action cannot be undone for the current session.</p>
                            </div>
                            <Button 
                                onClick={handleRemoveConfirm} 
                                variant="danger" 
                                className="w-full !py-3 !text-xs tracking-widest uppercase font-black"
                            >
                                DELETE
                            </Button>
                        </div>
                    )}

                     {/* 6. SWAP TARGET */}
                     {mode === 'swap_target' && selectedTeamId && (
                        <div className="flex flex-col gap-2">
                             <div className="p-2 mb-2 bg-white/5 rounded-lg flex items-center gap-3 border border-white/10">
                                <PlayerAvatar player={selectedPlayer!} size="sm" className="w-8 h-8 rounded-md" />
                                <div>
                                    <span className="text-[9px] text-white/40 uppercase tracking-widest block">Moving</span>
                                    <span className="text-sm font-bold text-white uppercase">{selectedPlayer?.nickname}</span>
                                </div>
                             </div>
                             
                             <p className="text-[9px] font-bold text-white/30 uppercase tracking-widest text-center mb-1">Select Destination</p>

                            {session.teams.filter(t => t.id !== selectedTeamId).map(team => (
                                <div key={team.id} className="p-2 rounded-xl bg-white/5 border border-white/10">
                                    <div className="flex justify-between items-center mb-2">
                                        <div className="flex items-center gap-2">
                                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: team.color }}></div>
                                            <span className="font-bold text-xs uppercase text-white/80">{t.team}</span>
                                        </div>
                                        {team.playerIds.length < session.playersPerTeam ? (
                                            <Button variant="secondary" onClick={() => handleSwapTargetSelect(team.id)} className="!py-1 !px-3 !text-[9px] !h-7 bg-[#00F2FE]/10 border-[#00F2FE]/30 text-[#00F2FE]">Move Here</Button>
                                        ) : (
                                            <span className="text-[8px] text-red-400 uppercase font-bold bg-red-500/10 px-2 py-0.5 rounded">FULL - SWAP</span>
                                        )}
                                    </div>
                                    
                                    {team.playerIds.length >= session.playersPerTeam && (
                                        <div className="flex flex-col gap-1">
                                            {team.playerIds.map(pid => {
                                                const p = session.playerPool.find(pl => pl.id === pid);
                                                return (
                                                    <button 
                                                        key={pid}
                                                        onClick={() => handleSwapWithPlayer(pid)}
                                                        className="flex items-center justify-between p-1.5 rounded bg-black/20 hover:bg-white/10 transition-colors text-left border border-white/5 group"
                                                    >
                                                        <span className="text-[10px] font-bold text-white/70 group-hover:text-white">{p?.nickname}</span>
                                                        <div className="text-[8px] text-[#00F2FE] font-bold border border-[#00F2FE]/30 px-1.5 py-0.5 rounded bg-[#00F2FE]/5">Swap</div>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}

                </div>
            </div>
        </Modal>
    );
};
