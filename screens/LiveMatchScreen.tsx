import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context';
import { Button, Modal, Page, useTranslation, SessionModeIndicator } from '../ui';
import { TeamAvatar } from '../components/avatars';
import { StarIcon, Plus, Pause, Play, Edit3, Cloud, CloudFog, TransferIcon } from '../icons';
import { Session, Game, GameStatus, Goal, Team, Player } from '../types';
import { playAnnouncement, initAudioContext } from '../lib';
import { GoalModal, EditGoalModal, EndSessionModal, SelectWinnerModal, SubstitutionModal, LegionnaireModal } from '../modals';
import { hexToRgba } from './utils';
import { useGameManager, SaveStatus } from '../hooks/useGameManager';

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
    onTransferToggle: (teamId: string) => void; // Toggle transfer mode
    isTransferMode: boolean;
}> = React.memo(({ team, session, onPlayerClick, onTransferToggle, isTransferMode }) => {
    const t = useTranslation();
    const players = team.playerIds.map(id => session.playerPool.find(p => p.id === id)).filter(Boolean) as Player[];
    const activePlayers = players.slice(0, session.playersPerTeam);
    const subs = players.slice(session.playersPerTeam);
    
    const accentColor = '#00F2FE';
    const playerCardStyle = {
        boxShadow: `0 0 8px ${hexToRgba(accentColor, 0.4)}`,
        border: `1px solid ${hexToRgba(accentColor, 0.6)}`
    };

    return (
         <div className="text-sm">
            <div className="relative">
                <ul className="space-y-1">
                    {activePlayers.map(p => 
                        <li 
                            key={p.id} 
                            onClick={() => (subs.length > 0 || isTransferMode) && onPlayerClick(team.id, p.id)}
                            className={`bg-dark-surface/50 p-2 rounded-full text-center truncate transition-all duration-300 ${subs.length > 0 || isTransferMode ? 'cursor-pointer hover:bg-dark-surface/80' : ''} ${isTransferMode ? 'animate-pulse ring-2 ring-yellow-500 bg-yellow-500/10' : ''}`}
                            style={isTransferMode ? { borderColor: '#EAB308' } : playerCardStyle}
                        >
                            {p.nickname}
                        </li>
                    )}
                </ul>
                
                {/* Transfer Toggle Button */}
                <div className="flex justify-center mt-2">
                    <button 
                        onClick={() => onTransferToggle(team.id)}
                        className={`w-8 h-8 rounded-full border flex items-center justify-center transition-colors ${isTransferMode ? 'bg-yellow-500 text-black border-yellow-500' : 'bg-dark-bg text-yellow-500 border-yellow-500/50 hover:bg-yellow-500/10'}`}
                        title="Transfer Player (Temp)"
                    >
                        <TransferIcon className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {subs.length > 0 && (
                <div className="mt-3">
                    <h4 className="font-semibold text-xs text-dark-text-secondary text-center mb-1 uppercase">{t.onBench}</h4>
                    <ul className="space-y-1 opacity-70">
                       {subs.map(p => <li key={p.id} className="bg-dark-surface/50 p-2 rounded-full text-center truncate" style={playerCardStyle}>{p.nickname}</li>)}
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

// --- SAVE STATUS OVERLAY ---
const SaveStatusOverlay: React.FC<{ status: SaveStatus; onExit: () => void }> = ({ status, onExit }) => {
    if (status === 'idle') return null;

    let content = null;

    if (status === 'saving') {
        content = (
            <>
                <div className="w-16 h-16 border-4 border-dark-accent-start border-t-transparent rounded-full animate-spin mb-4"></div>
                <h2 className="text-2xl font-bold text-white animate-pulse uppercase tracking-wider text-center">Синхронізація...</h2>
                <p className="text-dark-text-secondary mt-2 text-sm text-center">Будь ласка, зачекайте, поки ми зберігаємо ваші дані.</p>
            </>
        );
    } else if (status === 'cloud_success') {
        content = (
            <>
                <div className="relative mb-6">
                    <div className="absolute inset-0 bg-green-500 blur-2xl opacity-20 rounded-full"></div>
                    <Cloud className="w-24 h-24 text-green-400 drop-shadow-[0_0_15px_rgba(74,222,128,0.5)]" />
                    <div className="absolute -bottom-2 -right-2 bg-green-500 rounded-full p-1 border-4 border-black">
                        <svg className="w-6 h-6 text-black font-bold" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M5 13l4 4L19 7" /></svg>
                    </div>
                </div>
                <h2 className="text-3xl font-black text-green-400 uppercase tracking-widest text-center mb-2">Збережено в хмару</h2>
                <p className="text-gray-300 text-center max-w-xs mb-8">Дані сесії надійно збережено в базі даних. Тепер можна безпечно закрити додаток.</p>
                <Button variant="secondary" onClick={onExit} className="w-full !py-4 font-bold text-xl border border-green-500/50 text-green-400 hover:bg-green-500/10">НА ГОЛОВНУ</Button>
            </>
        );
    } else if (status === 'local_success') {
        content = (
            <>
                <div className="relative mb-6">
                    <div className="absolute inset-0 bg-yellow-500 blur-2xl opacity-20 rounded-full"></div>
                    <CloudFog className="w-24 h-24 text-yellow-400 drop-shadow-[0_0_15px_rgba(250,204,21,0.5)]" />
                </div>
                <h2 className="text-3xl font-black text-yellow-400 uppercase tracking-widest text-center mb-2">Збережено локально</h2>
                <p className="text-gray-300 text-center max-w-xs mb-8 font-bold">
                    Немає підключення до бази даних.
                    <br/>
                    <span className="font-normal text-sm opacity-80 block mt-2">Дані збережено лише на цьому пристрої. Будь ласка, підключіться до Інтернету пізніше для синхронізації.</span>
                </p>
                <Button variant="secondary" onClick={onExit} className="w-full !py-4 font-bold text-xl border border-yellow-500/50 text-yellow-400 hover:bg-yellow-500/10">Я ЗРОЗУМІВ</Button>
            </>
        );
    } else if (status === 'error') {
        content = (
            <>
                <div className="w-20 h-20 rounded-full bg-red-500/20 flex items-center justify-center mb-6 border-2 border-red-500">
                    <span className="text-4xl">❌</span>
                </div>
                <h2 className="text-2xl font-black text-red-500 uppercase tracking-widest text-center mb-4">Помилка збереження</h2>
                <p className="text-gray-300 text-center max-w-xs mb-8">Сталася критична помилка. Будь ласка, перевірте з'єднання та спробуйте ще раз.</p>
                <Button variant="secondary" onClick={onExit} className="w-full !py-4 font-bold text-xl">ЗАКРИТИ</Button>
            </>
        );
    }

    return (
        <div className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-md flex flex-col items-center justify-center p-6 animate-in fade-in duration-300">
            {content}
        </div>
    );
};


export const LiveMatchScreen: React.FC = () => {
    const { activeSession, activeVoicePack, displayTime } = useApp();
    const navigate = useNavigate();
    const t = useTranslation();
    
    const gameManager = useGameManager();
    const {
        currentGame, isTimerBasedGame, scoringTeamForModal, isEndSessionModalOpen,
        isSelectWinnerModalOpen, goalToEdit, saveStatus, subModalState, legionnaireModalState,
        setScoringTeamForModal, setIsEndSessionModalOpen, setGoalToEdit, setSubModalState, setLegionnaireModalState,
        finishCurrentGameAndSetupNext, handleStartGame, handleTogglePause,
        handleGoalSave, handleGoalUpdate, handleSubstitution, handleFinishSession, handleLegionnaireSwap, resetSession
    } = gameManager;
    
    // NEW STATE: Transfer Mode Target
    const [transferModeTeamId, setTransferModeTeamId] = useState<string | null>(null);
    const [transferPlayerOutId, setTransferPlayerOutId] = useState<string | null>(null);

    React.useEffect(() => {
        if (activeSession?.numTeams !== 3) return;

        const handleInteraction = () => {
            initAudioContext();
            playAnnouncement('silence', '', activeVoicePack);
            window.removeEventListener('click', handleInteraction);
            window.removeEventListener('touchstart', handleInteraction);
        };
        
        window.addEventListener('click', handleInteraction);
        window.addEventListener('touchstart', handleInteraction);

        return () => {
            window.removeEventListener('click', handleInteraction);
            window.removeEventListener('touchstart', handleInteraction);
        };
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
    
    const restingTeam = activeSession.teams.find(t => t.id !== team1.id && t.id !== team2.id);

    const isTimerFinished = isTimerBasedGame && displayTime <= 0;
    const isGameActive = currentGame.status === GameStatus.Active;
    const isGamePaused = currentGame.status === GameStatus.Paused;
    const isGamePending = currentGame.status === GameStatus.Pending;
    
    const canFinishGame = (isGameActive || isGamePaused) && isTimerFinished;
    const mainButtonText = isGamePending ? t.startGame : t.finishGame;
    const showIndicators = activeSession.numTeams === 3 && activeSession.rotationMode === 'auto_rotate';

    if (!team1 || !team2) return null;

    const teamForSub = subModalState.teamId ? activeSession.teams.find(t => t.id === subModalState.teamId) : undefined;
    const playerOutForSub = subModalState.playerOutId ? activeSession.playerPool.find(p => p.id === subModalState.playerOutId) : undefined;
    
    // Updated Handler for Player Clicks
    const handlePlayerClick = (teamId: string, playerOutId: string) => {
        if (transferModeTeamId === teamId) {
            // TRANSFER LOGIC
            setTransferPlayerOutId(playerOutId);
            setLegionnaireModalState({ isOpen: true, teamId });
            setTransferModeTeamId(null); // Turn off mode after selection
        } else {
            // SUBSTITUTION LOGIC
            setSubModalState({ isOpen: true, teamId, playerOutId });
        }
    };

    const handleTransferToggle = (teamId: string) => {
        if (transferModeTeamId === teamId) {
            setTransferModeTeamId(null);
        } else {
            setTransferModeTeamId(teamId);
        }
    };
    
    // Find player object for transfer modal
    const playerOutForTransfer = transferPlayerOutId ? activeSession.playerPool.find(p => p.id === transferPlayerOutId) : null;

    return (
        <div className="pb-28 flex flex-col min-h-screen">
            <SaveStatusOverlay status={saveStatus} onExit={resetSession} />
            
            <GoalModal isOpen={!!scoringTeamForModal} onClose={() => setScoringTeamForModal(null)} onSave={handleGoalSave} game={currentGame} session={activeSession} scoringTeamId={scoringTeamForModal} />
            <EditGoalModal isOpen={!!goalToEdit} onClose={() => setGoalToEdit(null)} onSave={handleGoalUpdate} goal={goalToEdit} game={currentGame} session={activeSession} />
            <EndSessionModal 
                isOpen={isEndSessionModalOpen} 
                onClose={() => setIsEndSessionModalOpen(false)} 
                onConfirm={handleFinishSession} 
            />
            
            <SelectWinnerModal isOpen={isSelectWinnerModalOpen} onClose={() => {}} onSelect={finishCurrentGameAndSetupNext} team1={team1} team2={team2}/>
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
            
            {legionnaireModalState.isOpen && legionnaireModalState.teamId && playerOutForTransfer && (
                <LegionnaireModal
                    isOpen={legionnaireModalState.isOpen}
                    onClose={() => setLegionnaireModalState({ isOpen: false })}
                    onSelect={(inId) => handleLegionnaireSwap(legionnaireModalState.teamId!, playerOutForTransfer.id, inId)}
                    restingTeam={restingTeam}
                    session={activeSession}
                    playerOut={playerOutForTransfer}
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
                                <TeamAvatar team={team1} size="lg" />
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
                                <TeamAvatar team={team2} size="lg" />
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
                            onClick={() => setScoringTeamForModal(team1.id)} 
                            disabled={!isGameActive && !isGamePaused}
                            className="w-14 h-14 rounded-full flex items-center justify-center border-2 transition-transform active:scale-90 disabled:opacity-50"
                            style={{ borderColor: team1.color, boxShadow: `0 0 12px ${team1.color}`}}
                        >
                            <Plus className="w-7 h-7" style={{ color: team1.color }}/>
                        </button>
                    </div>
                    <div className="flex justify-center items-center">
                        {!isGamePending && (
                            <Button onClick={handleTogglePause} variant="ghost" className="!p-2">
                                {isGameActive ? <Pause className="w-8 h-8"/> : <Play className="w-8 h-8"/>}
                            </Button>
                        )}
                    </div>
                    <div className="flex justify-center">
                        <button 
                            onClick={() => setScoringTeamForModal(team2.id)} 
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
                        onClick={isGamePending ? handleStartGame : () => finishCurrentGameAndSetupNext()} 
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
                                    <Button variant="ghost" className="!p-1 !rounded-md flex-shrink-0" onClick={() => setGoalToEdit(goal)}>
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
                        />
                        <TeamRoster 
                            team={team2} 
                            session={activeSession} 
                            onPlayerClick={handlePlayerClick}
                            onTransferToggle={handleTransferToggle}
                            isTransferMode={transferModeTeamId === team2.id}
                        />
                    </div>
                </div>
            </div>

            <div className="mt-auto shrink-0 py-4 px-4 max-w-xl mx-auto w-full">
                 <Button variant="secondary" className="w-full font-chakra font-bold text-xl tracking-wider !py-3 shadow-lg shadow-dark-accent-start/20 hover:shadow-dark-accent-start/40" onClick={() => setIsEndSessionModalOpen(true)}>{t.endSession}</Button>
            </div>
        </div>
    );
};