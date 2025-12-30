
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context';
import { Button, Page, useTranslation, SessionModeIndicator } from '../ui';
import { TeamAvatar } from '../components/avatars';
import { StarIcon, Plus, Pause, Play, Edit3, TransferIcon } from '../icons';
import { Session, GameStatus, Team, Player } from '../types';
import { audioManager } from '../lib'; // Import Manager directly
import { GoalModal, EditGoalModal, SelectWinnerModal, SubstitutionModal, LegionnaireModal, SessionSummaryModal } from '../modals';
import { hexToRgba } from './utils';
import { useGameManager } from '../hooks/useGameManager';

const GameIndicators: React.FC<{ count: number; color: string }> = ({ count, color }) => {
    return (
        <div className="absolute -top-5 left-1/2 -translate-x-1/2 flex justify-center items-center gap-2 mb-2 h-4 w-full">
            <div className="flex items-center justify-center gap-1.5">
                {Array.from({ length: 3 }).map((_, i) => (
                    <StarIcon
                        key={i}
                        className="w-5 h-5 transition-all duration-300"
                        style={{
                            color: i < count ? color : '#374151',
                            stroke: i < count ? color : '#4B5563',
                            filter: i < count ? `drop-shadow(0 0 5px ${color})` : 'none',
                            opacity: i < count ? 1 : 0.3,
                        }}
                    />
                ))}
            </div>
        </div>
    );
};

const TeamRoster: React.FC<{
    team: Team;
    session: Session;
    onPlayerClick: (teamId: string, playerOutId: string) => void;
    onTransferToggle?: (teamId: string) => void;
    isTransferMode?: boolean;
    activeLegionnaireIds?: string[]; // IDs of players who are currently legionnaires (swapped in)
}> = React.memo(({ team, session, onPlayerClick, onTransferToggle, isTransferMode, activeLegionnaireIds = [] }) => {
    const t = useTranslation();
    const players = team.playerIds.map(id => session.playerPool.find(p => p.id === id)).filter(Boolean) as Player[];
    const activePlayers = players.slice(0, session.playersPerTeam);
    const subs = players.slice(session.playersPerTeam);
    
    // Default Blue Neon
    const blueNeonColor = '#00F2FE';
    const blueNeonStyle = {
        boxShadow: `0 0 8px ${hexToRgba(blueNeonColor, 0.4)}`,
        border: `1px solid ${hexToRgba(blueNeonColor, 0.6)}`
    };

    // New Yellow Neon (For Transfer Selection & Active Legionnaires)
    const yellowNeonColor = '#FFD700'; // Gold/Yellow
    const yellowNeonStyle = {
        boxShadow: `0 0 8px ${hexToRgba(yellowNeonColor, 0.6)}`,
        border: `1px solid ${hexToRgba(yellowNeonColor, 0.8)}`,
        color: '#FFD700'
    };

    // Only show transfer button if 3+ teams exist
    const showTransferBtn = session.numTeams >= 3;

    return (
         <div className="text-sm">
            <ul className="space-y-1">
                {activePlayers.map(p => {
                    const isLegionnaire = activeLegionnaireIds.includes(p.id);
                    // Use yellow glow if in transfer mode OR if player is a legionnaire
                    const useYellow = isTransferMode || isLegionnaire;
                    
                    return (
                        <li 
                            key={p.id} 
                            onClick={() => onPlayerClick(team.id, p.id)} 
                            className={`bg-dark-surface/50 p-2 rounded-full text-center truncate transition-all duration-300 cursor-pointer hover:bg-dark-surface/80`}
                            style={useYellow ? yellowNeonStyle : blueNeonStyle}
                        >
                            {p.nickname}
                        </li>
                    );
                })}
            </ul>
            
            {showTransferBtn && onTransferToggle && (
                <div className="flex justify-center mt-2">
                    <button 
                        onClick={() => onTransferToggle(team.id)}
                        className={`w-8 h-8 rounded-full border flex items-center justify-center transition-colors ${isTransferMode ? 'bg-yellow-500 text-black border-yellow-500 shadow-[0_0_10px_rgba(234,179,8,0.5)]' : 'bg-dark-bg text-yellow-500 border-yellow-500/50 hover:bg-yellow-500/10'}`}
                        title="Transfer Player (Temp)"
                    >
                        <TransferIcon className="w-4 h-4" />
                    </button>
                </div>
            )}

            {subs.length > 0 && (
                <div className="mt-3">
                    <h4 className="font-semibold text-xs text-dark-text-secondary text-center mb-1 uppercase">{t.onBench}</h4>
                    <ul className="space-y-1 opacity-70">
                       {subs.map(p => (
                           <li 
                               key={p.id} 
                               className="bg-dark-surface/50 p-2 rounded-full text-center truncate" 
                               style={blueNeonStyle}
                           >
                               {p.nickname}
                           </li>
                       ))}
                    </ul>
                </div>
            )}
        </div>
    )
});

const formatTime = (totalSeconds: number) => {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = Math.floor(totalSeconds % 60);
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};

export const LiveMatchScreen: React.FC = () => {
    const { activeSession, activeVoicePack, displayTime } = useApp();
    const navigate = useNavigate();
    const t = useTranslation();
    
    const gameManager = useGameManager();
    const {
        currentGame, isTimerBasedGame, scoringTeamForModal, isEndSessionModalOpen,
        isSelectWinnerModalOpen, goalToEdit, subModalState, legionnaireModalState,
        setScoringTeamForModal, setIsEndSessionModalOpen, setGoalToEdit, setSubModalState, setLegionnaireModalState,
        finishCurrentGameAndSetupNext, handleStartGame, handleTogglePause,
        handleGoalSave, handleGoalUpdate, handleSubstitution, handleFinishSession, handleLegionnaireSwap
    } = gameManager;
    
    // UI State for Transfer Mode
    const [transferModeTeamId, setTransferModeTeamId] = React.useState<string | null>(null);
    const [transferPlayerOutId, setTransferPlayerOutId] = React.useState<string | null>(null);

    // --- AUDIO LIFECYCLE MANAGEMENT ---
    React.useEffect(() => {
        if (activeSession?.numTeams === 3) {
            // 1. Preload audio into memory immediately when match screen mounts
            audioManager.preloadPack(activeVoicePack);

            // 2. Setup iOS unlock handler (plays silence on first touch)
            const handleInteraction = () => {
                audioManager.forceResume(); // Более надежное пробуждение
                // Remove listeners after first successful unlock
                window.removeEventListener('click', handleInteraction);
                window.removeEventListener('touchstart', handleInteraction);
            };
            
            window.addEventListener('click', handleInteraction);
            window.addEventListener('touchstart', handleInteraction);

            return () => {
                window.removeEventListener('click', handleInteraction);
                window.removeEventListener('touchstart', handleInteraction);
            };
        }
    }, [activeSession?.numTeams, activeVoicePack]);

    React.useEffect(() => {
        if (!activeSession || !currentGame) {
            navigate('/', { replace: true });
        }
    }, [activeSession, currentGame, navigate]);

    if (!activeSession || !currentGame) {
        return <Page><p className="text-center text-lg">{t.loading}</p></Page>;
    }

    const {team1, team2} = {
      team1: activeSession.teams.find(t => t.id === currentGame.team1Id)!,
      team2: activeSession.teams.find(t => t.id === currentGame.team2Id)!
    };
    
    const isTimerFinished = isTimerBasedGame && displayTime <= 0;
    const isGameActive = currentGame.status === GameStatus.Active;
    const isGamePaused = currentGame.status === GameStatus.Paused;
    const isGamePending = currentGame.status === GameStatus.Pending;
    
    const canFinishGame = (isGameActive || isGamePaused) && isTimerFinished;
    const mainButtonText = isGamePending ? t.startGame : t.finishGame;
    const showIndicators = activeSession.numTeams === 3 && activeSession.rotationMode === 'auto_rotate';

    if (!team1 || !team2) return null;

    // Determine Resting Team (for Legionnaire Swap)
    const restingTeam = activeSession.teams.find(t => t.id !== team1.id && t.id !== team2.id);

    // Modal Helpers
    const teamForSub = subModalState.teamId ? activeSession.teams.find(t => t.id === subModalState.teamId) : undefined;
    const playerOutForSub = subModalState.playerOutId ? activeSession.playerPool.find(p => p.id === subModalState.playerOutId) : undefined;
    
    const teamForLegionnaire = legionnaireModalState.teamId ? activeSession.teams.find(t => t.id === legionnaireModalState.teamId) : undefined;
    const playerOutForLegionnaire = transferPlayerOutId ? activeSession.playerPool.find(p => p.id === transferPlayerOutId) : undefined;

    // --- IDENTIFY LEGIONNAIRES ---
    // A player is a legionnaire in this game if they appear in `currentGame.legionnaireMoves`
    // We specifically want to highlight the player who moved TO the playing team.
    const activeLegionnaireIds = currentGame.legionnaireMoves?.map(move => move.playerId) || [];

    // --- HANDLERS ---
    
    const handleTransferToggle = (teamId: string) => {
        audioManager.forceResume(); // Побудка звука при нажатии
        if (transferModeTeamId === teamId) {
            setTransferModeTeamId(null); // Toggle Off
        } else {
            setTransferModeTeamId(teamId); // Toggle On
        }
    };

    const handlePlayerClick = (teamId: string, playerOutId: string) => {
        audioManager.forceResume(); // Побудка звука при нажатии
        const team = activeSession.teams.find(t => t.id === teamId);
        if (!team) return;

        // Check if there are subs available
        const hasSubs = team.playerIds.length > activeSession.playersPerTeam;

        if (transferModeTeamId === teamId) {
            // LEGIONNAIRE LOGIC
            setTransferPlayerOutId(playerOutId);
            setLegionnaireModalState({ isOpen: true, teamId });
            setTransferModeTeamId(null); // Turn off mode
        } else {
            // SUBSTITUTION LOGIC
            if (hasSubs) {
                setSubModalState({ isOpen: true, teamId, playerOutId });
            }
        }
    };

    return (
        <div className="pb-28 flex flex-col min-h-screen" onClick={() => audioManager.forceResume()}>
            <GoalModal isOpen={!!scoringTeamForModal} onClose={() => setScoringTeamForModal(null)} onSave={handleGoalSave} game={currentGame} session={activeSession} scoringTeamId={scoringTeamForModal} />
            <EditGoalModal isOpen={!!goalToEdit} onClose={() => setGoalToEdit(null)} onSave={handleGoalUpdate} goal={goalToEdit} game={currentGame} session={activeSession} />
            
            {/* UPDATED: Replaced simple EndSessionModal with SessionSummaryModal */}
            <SessionSummaryModal 
                isOpen={isEndSessionModalOpen}
                onClose={() => setIsEndSessionModalOpen(false)}
                onConfirm={handleFinishSession}
            />
            
            <SelectWinnerModal isOpen={isSelectWinnerModalOpen} onClose={() => {}} onSelect={finishCurrentGameAndSetupNext} team1={team1} team2={team2}/>
            
            {/* STANDARD SUB MODAL */}
            {subModalState.isOpen && teamForSub && playerOutForSub && (
                <SubstitutionModal 
                    isOpen={subModalState.isOpen}
                    onClose={() => setSubModalState({isOpen: false})}
                    onSelect={handleSubstitution}
                    team={teamForSub}
                    session={activeSession}
                    playerOut={playerOutForSub}
                />
            )}

            {/* LEGIONNAIRE MODAL */}
            {legionnaireModalState.isOpen && teamForLegionnaire && playerOutForLegionnaire && restingTeam && (
                <LegionnaireModal
                    isOpen={legionnaireModalState.isOpen}
                    onClose={() => setLegionnaireModalState({ isOpen: false })}
                    onSelect={(playerInId) => handleLegionnaireSwap(teamForLegionnaire.id, playerOutForLegionnaire.id, playerInId)}
                    restingTeam={restingTeam}
                    session={activeSession}
                    playerOut={playerOutForLegionnaire}
                />
            )}

            <header className="text-center shrink-0 pt-4">
                <div className="flex items-center justify-center gap-3">
                    <h1 className="text-3xl font-black uppercase text-dark-text accent-text-glow">{t.liveMatch}</h1>
                    <SessionModeIndicator />
                </div>
            </header>
            
            <div className={`flex-grow flex flex-col px-2`}>
                <div className="relative my-4">
                    {isGamePaused && (
                        <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
                            <p className="font-russo text-6xl md:text-7xl font-black text-dark-accent-start uppercase select-none" style={{ textShadow: '0 0 5px rgba(0, 242, 254, 0.6), 0 0 10px rgba(76, 255, 95, 0.4)' }}>
                                {t.paused}
                            </p>
                        </div>
                    )}
                    <div className={`transition-all duration-500 bg-dark-surface/50 backdrop-blur-xl rounded-2xl p-4 w-full border border-dark-accent-start/40 shadow-[inset_0_2px_10px_rgba(0,0,0,0.5),0_0_30px_rgba(0,242,254,0.15)] ${isGamePaused ? 'blur-sm brightness-75' : ''}`}>
                        { isTimerBasedGame && <div className="text-center font-bold text-lg text-dark-text accent-text-glow mb-4">{t.round} {currentGame.gameNumber}</div> }
                        
                        <div className="grid grid-cols-3 items-start gap-4">
                            {/* Team 1 Column */}
                            <div className="relative flex flex-col items-center gap-2 pt-4">
                                {showIndicators && <GameIndicators count={team1.consecutiveGames} color={team1.color} />}
                                <TeamAvatar team={team1} size="lg" hollow={true} />
                                <div className="flex justify-center items-center h-6 mt-2 gap-1">
                                    {(team1.bigStars ?? 0) > 0 && Array.from({ length: team1.bigStars ?? 0 }).map((_, i) => (
                                        <StarIcon
                                            key={i}
                                            className="w-6 h-6"
                                            style={{
                                                color: '#FFD700',
                                                filter: 'drop-shadow(0 0 5px #FFD700)'
                                            }}
                                        />
                                    ))}
                                </div>
                                <div className="text-6xl font-black tabular-nums text-center" style={{ color: team1.color, textShadow: `0 0 10px ${team1.color}`}}>
                                    {currentGame.team1Score}
                                </div>
                            </div>

                            {/* Center Column (Timer) */}
                            <div className="text-center pt-8">
                                <div className="text-4xl font-bold tabular-nums text-dark-text accent-text-glow">{formatTime(displayTime)}</div>
                            </div>

                            {/* Team 2 Column */}
                            <div className="relative flex flex-col items-center gap-2 pt-4">
                                {showIndicators && <GameIndicators count={team2.consecutiveGames} color={team2.color} />}
                                <TeamAvatar team={team2} size="lg" hollow={true} />
                                <div className="flex justify-center items-center h-6 mt-2 gap-1">
                                    {(team2.bigStars ?? 0) > 0 && Array.from({ length: team2.bigStars ?? 0 }).map((_, i) => (
                                        <StarIcon
                                            key={i}
                                            className="w-6 h-6"
                                            style={{
                                                color: '#FFD700',
                                                filter: 'drop-shadow(0 0 5px #FFD700)'
                                            }}
                                        />
                                    ))}
                                </div>
                                <div className="text-6xl font-black tabular-nums text-center" style={{ color: team2.color, textShadow: `0 0 10px ${team2.color}`}}>
                                    {currentGame.team2Score}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-3 items-center w-full mt-2">
                    <div className="flex justify-center">
                         <button 
                            onClick={() => { audioManager.forceResume(); setScoringTeamForModal(team1.id); }} 
                            disabled={!isGameActive && !isGamePaused}
                            className="w-14 h-14 rounded-full flex items-center justify-center border-2 transition-transform active:scale-90 disabled:opacity-50"
                            style={{ borderColor: team1.color, boxShadow: `0 0 12px ${team1.color}`}}
                        >
                            <Plus className="w-7 h-7" style={{ color: team1.color }}/>
                        </button>
                    </div>
                    <div className="flex justify-center items-center">
                        {!isGamePending && (
                            <Button onClick={() => { audioManager.forceResume(); handleTogglePause(); }} variant="ghost" className="!p-2">
                                {isGameActive ? <Pause className="w-8 h-8"/> : <Play className="w-8 h-8"/>}
                            </Button>
                        )}
                    </div>
                    <div className="flex justify-center">
                        <button 
                            onClick={() => { audioManager.forceResume(); setScoringTeamForModal(team2.id); }} 
                            disabled={!isGameActive && !isGamePaused}
                            className="w-14 h-14 rounded-full flex items-center justify-center border-2 transition-transform active:scale-90 disabled:opacity-50"
                            style={{ borderColor: team2.color, boxShadow: `0 0 12px ${team2.color}`}}
                        >
                            <Plus className="w-7 h-7" style={{ color: team2.color }}/>
                        </button>
                    </div>
                </div>

                <div className="py-4 space-y-3 shrink-0 max-w-xl mx-auto w-full">
                     <Button 
                        variant="secondary"
                        onClick={() => { audioManager.forceResume(); isGamePending ? handleStartGame() : finishCurrentGameAndSetupNext(); }} 
                        disabled={!isGamePending && !canFinishGame}
                        className="w-full font-chakra font-bold text-xl tracking-wider !py-3 shadow-lg shadow-dark-accent-start/20 hover:shadow-dark-accent-start/40"
                    >
                        {mainButtonText}
                    </Button>
                </div>
                
                {(isGameActive || isGamePaused) && currentGame.goals.length > 0 && (
                    <div className="max-w-xl mx-auto w-full mb-4 bg-dark-surface/80 backdrop-blur-sm rounded-lg p-2 border border-white/10">
                        <ul className="space-y-1 max-h-32 overflow-y-auto">
                            {currentGame.goals.map(goal => {
                            const team = activeSession.teams.find(t => t.id === goal.teamId);
                            const scorer = activeSession.playerPool.find(p => p.id === goal.scorerId);
                            const assistant = activeSession.playerPool.find(p => p.id === goal.assistantId);
                            return (
                                <li key={goal.id} className="flex items-center justify-between p-1.5 bg-dark-bg/60 rounded-md text-sm">
                                    <div className="flex items-center gap-2 overflow-hidden">
                                        <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: team?.color }}></div>
                                        <p className="truncate">
                                            <span className="font-semibold">{scorer?.nickname || t.ownGoal}</span>
                                            {assistant && <span className="text-xs text-dark-text-secondary"> (A: {assistant.nickname})</span>}
                                        </p>
                                    </div>
                                    <Button variant="ghost" className="!p-1 !rounded-md flex-shrink-0" onClick={() => { audioManager.forceResume(); setGoalToEdit(goal); }}>
                                        <Edit3 className="w-3.5 h-3.5" />
                                    </Button>
                                </li>
                            );
                            })}
                        </ul>
                    </div>
                )}


                <div className="max-w-xl mx-auto w-full">
                     <div className="grid grid-cols-2 gap-4">
                        <TeamRoster 
                            team={team1} 
                            session={activeSession} 
                            onPlayerClick={handlePlayerClick}
                            onTransferToggle={handleTransferToggle}
                            isTransferMode={transferModeTeamId === team1.id}
                            activeLegionnaireIds={activeLegionnaireIds}
                        />
                        <TeamRoster 
                            team={team2} 
                            session={activeSession} 
                            onPlayerClick={handlePlayerClick}
                            onTransferToggle={handleTransferToggle}
                            isTransferMode={transferModeTeamId === team2.id}
                            activeLegionnaireIds={activeLegionnaireIds}
                        />
                    </div>
                </div>
            </div>

            <div className="mt-auto shrink-0 py-4 px-4 max-w-xl mx-auto w-full">
                 <Button variant="secondary" className="w-full font-chakra font-bold text-xl tracking-wider !py-3 shadow-lg shadow-dark-accent-start/20 hover:shadow-dark-accent-start/40" onClick={() => { audioManager.forceResume(); setIsEndSessionModalOpen(true); }}>{t.endSession}</Button>
            </div>
        </div>
    );
};
