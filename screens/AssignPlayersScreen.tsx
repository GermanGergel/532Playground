
import React from 'react';
// FIX: Import directly from component files instead of barrel file to avoid import errors.
import { Button, Card, useTranslation, Modal, SessionModeIndicator } from '../ui';
import { TeamAvatar, PlayerAvatar } from '../components/avatars';
import { Wand, XCircle } from '../icons';
import { TeamColorPickerModal } from '../modals';
import { hexToRgba } from './utils';
import { useTeamAssignment } from '../hooks/useTeamAssignment';
import { Player } from '../types';


export const AssignPlayersScreen: React.FC = () => {
    const t = useTranslation();
    
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
    const gridColsClass = activeSession.numTeams === 2 ? 'grid-cols-2' : 'grid-cols-3';
    const cardNeonClasses = "shadow-lg shadow-dark-accent-start/20 border border-dark-accent-start/40";

    return (
        <div className="flex flex-col min-h-screen bg-dark-bg pb-24">
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
                <div className={`grid ${gridColsClass} gap-x-2 items-start mt-4`}>
                    {activeSession.teams.map(team => (
                        <div key={team.id} className="flex flex-col items-center gap-4">
                            <TeamAvatar 
                                team={team} 
                                size="lg" 
                                onClick={() => openColorPicker(team)}
                                countText={`${team.playerIds.length}/${activeSession.playersPerTeam}`}
                            />
                            <div className="w-full max-w-[100px] space-y-2">
                                {team.playerIds.map(playerId => {
                                    // FIX: Cast playerPool to Player[] to avoid type errors when accessing properties.
                                    const player = (activeSession.playerPool as Player[]).find(p => p.id === playerId);
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
                    <Button variant="secondary" onClick={() => setIsAutoBalanceModalOpen(true)} disabled={isManualAssignmentStarted} className="!bg-dark-surface !backdrop-blur-none w-full font-chakra font-bold text-xl tracking-wider !py-3 shadow-dark-accent-start/20 hover:shadow-dark-accent-start/40 flex items-center justify-center gap-2">
                        <Wand className="w-5 h-5" /> {t.autoBalanceTeams}
                    </Button>
                    <Button variant="secondary" onClick={handleStartSession} disabled={!canStart} className="!bg-dark-surface !backdrop-blur-none w-full font-chakra font-bold text-xl tracking-wider !py-3 shadow-lg shadow-dark-accent-start/20 hover:shadow-dark-accent-start/40">
                        {t.startSession}
                    </Button>
                    <Button variant="secondary" onClick={() => setIsCancelModalOpen(true)} className="!bg-dark-surface !backdrop-blur-none w-full font-chakra font-bold text-xl tracking-wider !py-3 shadow-lg shadow-dark-accent-start/20 hover:shadow-dark-accent-start/40">
                        {t.cancelSetup}
                    </Button>
                </div>
            </div>
        </div>
    );
};
