
import React from 'react';
import { Button, Card, useTranslation, Modal, SessionModeIndicator } from '../ui';
import { TeamAvatar, PlayerAvatar } from '../components/avatars';
import { Wand, XCircle, Users, TrophyIcon, Plus, CheckCircle } from '../icons';
import { TeamColorPickerModal } from '../modals';
import { hexToRgba, newId } from './utils';
import { useTeamAssignment } from '../hooks/useTeamAssignment';
import { createDraftSession, isSupabaseConfigured } from '../db';
import { DraftState, DraftTeam } from '../types';
import { useNavigate } from 'react-router-dom';

const DraftSetupModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    playerPool: any[];
    numTeams: number;
    teamColors: string[];
}> = ({ isOpen, onClose, playerPool, numTeams, teamColors }) => {
    const navigate = useNavigate();
    const [selectedCaptainIds, setSelectedCaptainIds] = React.useState<string[]>([]);
    const [isCreating, setIsCreating] = React.useState(false);

    // Reset selection when modal opens
    React.useEffect(() => {
        if (isOpen) setSelectedCaptainIds([]);
    }, [isOpen]);

    const toggleCaptain = (playerId: string) => {
        if (selectedCaptainIds.includes(playerId)) {
            setSelectedCaptainIds(prev => prev.filter(id => id !== playerId));
        } else {
            if (selectedCaptainIds.length < numTeams) {
                setSelectedCaptainIds(prev => [...prev, playerId]);
            }
        }
    };

    const handleCreateDraft = async () => {
        if (selectedCaptainIds.length !== numTeams) return;
        setIsCreating(true);

        const draftId = newId();
        const pin = Math.floor(1000 + Math.random() * 9000).toString();

        // Assign selected captains to teams (order doesn't strictly matter here as pick order is shuffled later)
        const teams: DraftTeam[] = selectedCaptainIds.map((captainId, idx) => ({
            id: `team_${idx}_${newId()}`,
            name: `TEAM ${idx + 1}`,
            color: teamColors[idx],
            captainId: captainId,
            playerIds: [captainId] // Captain is first player
        }));

        // Players NOT selected as captains
        const availablePlayerIds = playerPool
            .filter(p => !selectedCaptainIds.includes(p.id))
            .map(p => p.id);

        // --- TRUE RANDOMIZATION LOGIC (Fisher-Yates) ---
        let initialTeamOrder = teams.map(t => t.id);
        
        for (let i = initialTeamOrder.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [initialTeamOrder[i], initialTeamOrder[j]] = [initialTeamOrder[j], initialTeamOrder[i]];
        }

        // Build Snake Draft Order
        const pickOrder: string[] = [];
        const totalPicksNeeded = availablePlayerIds.length;
        let round = 0;
        
        while (pickOrder.length < totalPicksNeeded) {
            const roundOrder = [...initialTeamOrder];
            if (round % 2 !== 0) roundOrder.reverse();
            pickOrder.push(...roundOrder);
            round++;
        }
        
        const finalPickOrder = pickOrder.slice(0, totalPicksNeeded);

        const draftState: DraftState = {
            id: draftId,
            pin,
            status: 'waiting',
            teams,
            availablePlayerIds,
            currentTurnIndex: 0,
            pickOrder: finalPickOrder,
            sessionConfig: {
                numTeams,
                playersPerTeam: Math.ceil(playerPool.length / numTeams)
            },
            version: 1
        };

        await createDraftSession(draftState);
        navigate(`/draft/${draftId}`);
    };

    if (!isOpen) return null;

    const isReady = selectedCaptainIds.length === numTeams;

    return (
        <Modal 
            isOpen={isOpen} 
            onClose={onClose} 
            size="sm" 
            hideCloseButton
            containerClassName="!bg-[#1A1D24] border border-white/10 shadow-2xl !p-0 overflow-hidden rounded-3xl"
        >
            {/* Minimal Header */}
            <div className="p-4 border-b border-white/5 bg-[#15171C] flex justify-between items-center">
                <div className="flex flex-col">
                    <h2 className="text-white font-bold text-sm uppercase tracking-wider">Select Captains</h2>
                    <span className={`text-[10px] font-bold ${isReady ? 'text-[#4CFF5F]' : 'text-white/40'}`}>
                        {selectedCaptainIds.length} / {numTeams} SELECTED
                    </span>
                </div>
                <button onClick={onClose} className="p-2 bg-white/5 rounded-full hover:bg-white/10 transition-colors">
                    <XCircle className="w-5 h-5 text-white/40" />
                </button>
            </div>

            {/* Compact Grid List */}
            <div className="p-2 max-h-[60vh] overflow-y-auto bg-[#0a0c10]">
                <div className="grid grid-cols-1 gap-2">
                    {playerPool.map(player => {
                        const isSelected = selectedCaptainIds.includes(player.id);
                        const isDisabled = !isSelected && selectedCaptainIds.length >= numTeams;

                        return (
                            <button
                                key={player.id}
                                onClick={() => toggleCaptain(player.id)}
                                disabled={isDisabled}
                                className={`
                                    relative w-full p-2 rounded-xl flex items-center justify-between transition-all duration-200 border
                                    ${isSelected 
                                        ? 'bg-[#FFD700]/10 border-[#FFD700] shadow-[0_0_15px_rgba(255,215,0,0.2)]' 
                                        : isDisabled 
                                            ? 'opacity-30 grayscale border-transparent'
                                            : 'bg-[#1A1D24] border-white/5 hover:bg-white/5'
                                    }
                                `}
                            >
                                <div className="flex items-center gap-3">
                                    <PlayerAvatar player={player} size="sm" className={isSelected ? 'ring-2 ring-[#FFD700]' : ''} />
                                    <span className={`font-bold text-sm uppercase ${isSelected ? 'text-[#FFD700]' : 'text-white'}`}>
                                        {player.nickname}
                                    </span>
                                </div>
                                
                                {isSelected && (
                                    <div className="bg-[#FFD700] text-black p-1 rounded-full">
                                        <CheckCircle className="w-4 h-4" />
                                    </div>
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Footer */}
            <div className="p-4 bg-[#15171C] border-t border-white/5">
                <Button 
                    variant="primary" 
                    className={`w-full !py-3 font-black text-sm tracking-[0.2em] uppercase transition-all
                        ${isReady 
                            ? 'bg-[#FFD700] text-black hover:bg-[#FFD700]/90 shadow-[0_0_20px_rgba(255,215,0,0.4)]' 
                            : 'bg-white/5 text-white/20 border border-white/5 cursor-not-allowed'
                        }
                    `}
                    disabled={!isReady || isCreating}
                    onClick={handleCreateDraft}
                >
                    {isCreating ? "INITIALIZING..." : "CONFIRM & START"}
                </Button>
            </div>
        </Modal>
    );
};

export const AssignPlayersScreen: React.FC = () => {
    const t = useTranslation();
    const [isDraftModalOpen, setIsDraftModalOpen] = React.useState(false);
    
    const {
        activeSession,
        playerSearch, setPlayerSearch,
        isColorPickerOpen,
        selectedTeam,
        isCancelModalOpen, setIsCancelModalOpen,
        isAutoBalanceModalOpen, setIsAutoBalanceModalOpen,
        searchResults,
        unassignedPlayers,
        canStart,
        isManualAssignmentStarted,
        handleAddPlayer,
        handleAssignPlayer,
        handleRemovePlayerFromPool,
        closeColorPicker,
        handleColorChange,
        openColorPicker,
        handleConfirmAutoBalance,
        handleStartSession,
        handleCancelSetup,
    } = useTeamAssignment();

    if (!activeSession) return null;

    const inputClasses = "w-full p-3 bg-dark-bg rounded-lg border border-white/20 focus:ring-2 focus:ring-dark-accent-start focus:outline-none";
    const gridColsClass = activeSession.numTeams === 3 ? 'grid-cols-3' : 'grid-cols-2';
    const cardNeonClasses = "shadow-lg shadow-dark-accent-start/20 border border-dark-accent-start/40";

    const canStartDraft = activeSession.playerPool.length >= (activeSession.numTeams * activeSession.playersPerTeam);

    return (
        <div className="flex flex-col min-h-screen bg-dark-bg pb-24">
            <DraftSetupModal 
                isOpen={isDraftModalOpen} 
                onClose={() => setIsDraftModalOpen(false)}
                playerPool={activeSession.playerPool}
                numTeams={activeSession.numTeams}
                teamColors={activeSession.teams.map(t => t.color)}
            />

            {selectedTeam && (
                <TeamColorPickerModal
                    isOpen={isColorPickerOpen}
                    onClose={closeColorPicker}
                    onSelectColor={handleColorChange}
                    currentColor={selectedTeam.color}
                    usedColors={activeSession.teams.map(t => t.color)}
                />
            )}
            <Modal 
                isOpen={isCancelModalOpen} 
                onClose={() => setIsCancelModalOpen(false)} 
                size="xs" 
                hideCloseButton
                containerClassName={cardNeonClasses}
            >
                <div className="flex flex-col gap-3">
                    <Button variant="secondary" onClick={handleCancelSetup} className="w-full font-chakra font-bold text-xl tracking-wider !py-3">{t.confirm}</Button>
                    <Button variant="secondary" onClick={() => setIsCancelModalOpen(false)} className="w-full font-chakra font-bold text-xl tracking-wider !py-3">{t.cancel}</Button>
                </div>
            </Modal>
            <Modal 
                isOpen={isAutoBalanceModalOpen} 
                onClose={() => setIsAutoBalanceModalOpen(false)} 
                size="xs" 
                hideCloseButton
                containerClassName={cardNeonClasses}
            >
                <div className="text-center">
                    <h3 className="text-xl font-bold mb-2 text-dark-text accent-text-glow">{t.autoBalanceConfirmTitle}</h3>
                    <p className="text-sm text-dark-text-secondary mb-6">{t.autoBalanceConfirmDesc}</p>

                    <div className="flex flex-col gap-3">
                        <Button variant="secondary" onClick={handleConfirmAutoBalance} className="w-full font-chakra font-bold text-xl tracking-wider !py-3">{t.confirm}</Button>
                        <Button variant="secondary" onClick={() => setIsAutoBalanceModalOpen(false)} className="w-full font-chakra font-bold text-xl tracking-wider !py-3">{t.cancel}</Button>
                    </div>
                </div>
            </Modal>

            <div className="p-4 pt-6 shrink-0 z-10 bg-dark-bg">
                <div className="flex items-center justify-center gap-3 mb-8">
                    <h1 className="text-3xl font-bold text-center accent-text-glow uppercase">{t.assignPlayersTitle}</h1>
                    <SessionModeIndicator />
                </div>
                <div className="relative max-w-md mx-auto">
                    <div className="flex items-center gap-2 mb-4">
                            <input
                            type="text"
                            value={playerSearch}
                            onChange={(e) => setPlayerSearch(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && playerSearch.trim() && handleAddPlayer({ nickname: playerSearch.trim() })}
                            placeholder={t.searchOrAddPlayer}
                            className={inputClasses}
                        />
                        <Button variant="secondary" onClick={() => playerSearch.trim() && handleAddPlayer({ nickname: playerSearch.trim() })} className="!py-3 !px-5 shadow-lg font-chakra font-bold text-xl tracking-wider shadow-dark-accent-start/20 hover:shadow-dark-accent-start/40">{t.addPlayer}</Button>
                    </div>
                    {searchResults.length > 0 && (
                        <div className="absolute top-full left-0 right-0 z-20 bg-dark-surface border border-dark-accent-start/40 rounded-lg mt-1 max-h-48 overflow-y-auto">
                            {searchResults.map(player => (
                                <div 
                                    key={player.id} 
                                    className="p-2 flex items-center gap-3 cursor-pointer hover:bg-white/10"
                                    onClick={() => handleAddPlayer(player)}
                                >
                                    <PlayerAvatar player={player} size="sm" />
                                    <span>{player.nickname}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            <div className="flex-grow overflow-y-auto px-4"> 
                <div className={`grid ${gridColsClass} gap-y-8 gap-x-2 items-start mt-4`}>
                    {activeSession.teams.map(team => (
                        <div key={team.id} className="flex flex-col items-center gap-4">
                            <TeamAvatar 
                                team={team} 
                                size="lg" 
                                hollow={true}
                                onClick={() => openColorPicker(team)}
                                countText={`${team.playerIds.length}/${activeSession.playersPerTeam}`}
                            />
                            <div className="w-full max-w-[100px] space-y-2">
                                {team.playerIds.map(playerId => {
                                    const player = (activeSession.playerPool || []).find(p => p.id === playerId);
                                    return player ? (
                                        <div 
                                            key={playerId} 
                                            className="h-9 w-full group flex items-center justify-between px-2 rounded-lg bg-dark-surface/80 transition-all duration-300"
                                            style={{
                                                boxShadow: `0 0 4px ${hexToRgba(team.color, 0.3)}`,
                                                border: `1px solid ${hexToRgba(team.color, 0.5)}`
                                            }}
                                        >
                                            <span className="font-semibold truncate text-dark-text">{player.nickname}</span>
                                            <button onClick={() => handleAssignPlayer(player.id, team.id)} className="ml-2 text-dark-text-secondary hover:text-dark-danger opacity-0 group-hover:opacity-100 transition-opacity">
                                                <XCircle className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ) : null;
                                })}
                            </div>
                        </div>
                    ))}
                </div>

                {(unassignedPlayers.length > 0) && (
                    <div className="my-6 max-w-md mx-auto w-full">
                         <Card title={t.playerPool} className={`!p-2 ${cardNeonClasses}`}>
                            <div className="space-y-2 max-h-64 overflow-y-auto">
                                {unassignedPlayers.map((player, index) => (
                                    <div key={player.id} className="p-2 flex items-center justify-between rounded-lg bg-dark-bg/50">
                                        <div className="flex items-center gap-3">
                                            <span className="text-sm font-mono text-dark-text-secondary w-5 text-right">{index + 1}.</span>
                                            <span className="font-semibold truncate">{player.nickname}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {activeSession.teams.map(team => (
                                                <TeamAvatar
                                                    key={team.id}
                                                    team={team}
                                                    size="xs"
                                                    hollow={true}
                                                    onClick={() => handleAssignPlayer(player.id, team.id)}
                                                    className={team.playerIds.includes(player.id) ? 'ring-2 ring-white' : ''}
                                                />
                                            ))}
                                            <button onClick={() => handleRemovePlayerFromPool(player.id)} className="text-dark-text-secondary hover:text-dark-danger transition-colors ml-2">
                                                <XCircle className="w-5 h-5" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </Card>
                    </div>
                )}
                 {unassignedPlayers.length === 0 && (activeSession.playerPool || []).length > 0 && (
                        <div className="text-center text-dark-text-secondary text-sm my-6">
                            {t.allPlayersAssigned}
                        </div>
                    )}
            </div>

            <div className="shrink-0 mt-auto p-4 bg-dark-bg/30 backdrop-blur-md z-10 border-t border-white/10">
                <div className="max-w-md mx-auto flex flex-col gap-3">
                    <Button 
                        variant="secondary" 
                        onClick={() => setIsAutoBalanceModalOpen(true)} 
                        disabled={isManualAssignmentStarted} 
                        className="!bg-dark-surface !backdrop-blur-none w-full font-chakra font-bold text-xl tracking-wider !py-3 shadow-lg shadow-dark-accent-start/20 hover:shadow-dark-accent-start/40 flex items-center justify-center gap-2"
                    >
                        <Wand className="w-5 h-5" /> {t.autoBalanceTeams}
                    </Button>
                    
                    <Button 
                        variant="secondary" 
                        onClick={handleStartSession} 
                        disabled={!canStart} 
                        className="!bg-dark-surface !backdrop-blur-none w-full font-chakra font-bold text-xl tracking-wider !py-3 shadow-lg shadow-dark-accent-start/20 hover:shadow-dark-accent-start/40"
                    >
                        {t.startSession}
                    </Button>

                    <Button 
                        variant="secondary" 
                        onClick={() => setIsCancelModalOpen(true)} 
                        className="!bg-dark-surface !backdrop-blur-none w-full font-chakra font-bold text-xl tracking-wider !py-3 shadow-lg shadow-dark-accent-start/20 hover:shadow-dark-accent-start/40"
                    >
                        {t.cancelSetup}
                    </Button>

                    <Button 
                        variant="secondary" 
                        onClick={() => setIsDraftModalOpen(true)}
                        disabled={isManualAssignmentStarted || !canStartDraft}
                        className="!bg-gradient-to-r !from-[#FFD700] !to-[#FFA500] !text-black !border-none w-full font-black text-xl tracking-wider !py-3 shadow-[0_0_15px_rgba(255,215,0,0.4)] flex items-center justify-center gap-2"
                        title={isManualAssignmentStarted ? "Draft is disabled if players are already assigned manually." : ""}
                    >
                        <Users className="w-5 h-5" /> DRAFT
                    </Button>
                </div>
            </div>
        </div>
    );
};
