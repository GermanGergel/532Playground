import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context';
import { Session, Game, GameStatus, Goal, GoalPayload, SubPayload, EventLogEntry, EventType, StartRoundPayload, Player, BadgeType, RotationMode, Team, SessionStatus, LegionnaireMove, LegionnairePayload } from '../types';
import { playAnnouncement, initAudioContext } from '../lib';
import { processFinishedSession } from '../services/sessionProcessor';
import { newId } from '../screens/utils';
import { savePlayersToDB, saveNewsToDB, saveHistoryToDB } from '../db';
import { useTranslation } from '../ui';

// New Type for Save Status Feedback
export type SaveStatus = 'idle' | 'saving' | 'cloud_success' | 'local_success' | 'error';

export const useGameManager = () => {
    const { activeSession, setActiveSession, setHistory, setAllPlayers, setNewsFeed, allPlayers: oldPlayersState, newsFeed, activeVoicePack } = useApp();
    const navigate = useNavigate();
    const t = useTranslation();

    const [scoringTeamForModal, setScoringTeamForModal] = React.useState<string | null>(null);
    const [isEndSessionModalOpen, setIsEndSessionModalOpen] = React.useState(false);
    const [isSelectWinnerModalOpen, setIsSelectWinnerModalOpen] = React.useState(false);
    const [goalToEdit, setGoalToEdit] = React.useState<Goal | null>(null);
    
    // Replaces generic isSaving boolean with detailed status
    const [saveStatus, setSaveStatus] = React.useState<SaveStatus>('idle');
    
    const [subModalState, setSubModalState] = React.useState<{
        isOpen: boolean;
        teamId?: string;
        playerOutId?: string;
    }>({ isOpen: false });

    // Legionnaire Modal State
    const [legionnaireModalState, setLegionnaireModalState] = React.useState<{
        isOpen: boolean;
        teamId?: string;
    }>({ isOpen: false });

    const currentGame = activeSession?.games[activeSession.games.length - 1];
    const isTimerBasedGame = activeSession?.numTeams === 3;

    // --- LEGIONNAIRE LOGIC ---
    const handleLegionnaireSwap = (teamId: string, playerOutId: string, playerInId: string) => {
        setActiveSession(session => {
            if (!session || !currentGame) return session;

            // 1. Log the move in the current game object so we can revert it later
            const games = [...session.games];
            const game = { ...games[games.length - 1] };
            
            // Determine where the replacement player is coming from (resting team)
            const fromTeam = session.teams.find(t => t.playerIds.includes(playerInId));
            if (!fromTeam) return session;

            const newMove: LegionnaireMove = {
                playerId: playerInId,
                fromTeamId: fromTeam.id,
                toTeamId: teamId
            };
            
            // Also need to track the player leaving (to put them back)
            // Ideally we swap them. The playerOut goes to fromTeam (Bench).
            const reverseMove: LegionnaireMove = {
                playerId: playerOutId,
                fromTeamId: teamId,
                toTeamId: fromTeam.id
            };

            game.legionnaireMoves = [...(game.legionnaireMoves || []), newMove, reverseMove];
            games[games.length - 1] = game;

            // 2. Perform the physical swap in session.teams
            const teams = session.teams.map(team => {
                if (team.id === teamId) {
                    // This is the playing team (Host)
                    return {
                        ...team,
                        playerIds: team.playerIds.map(id => id === playerOutId ? playerInId : id)
                    };
                }
                if (team.id === fromTeam.id) {
                    // This is the resting team (Source)
                    return {
                        ...team,
                        playerIds: team.playerIds.map(id => id === playerInId ? playerOutId : id)
                    };
                }
                return team;
            });

            // 3. Log event
            const getPlayerName = (id: string) => session.playerPool.find(p => p.id === id)?.nickname || 'Unknown';
            const logEntry: EventLogEntry = {
                timestamp: new Date().toISOString(),
                round: game.gameNumber,
                type: EventType.LEGIONNAIRE_SIGN,
                payload: {
                    player: getPlayerName(playerInId),
                    toTeam: teams.find(t => t.id === teamId)?.name || 'Team'
                } as LegionnairePayload
            };

            return { ...session, teams, games, eventLog: [...session.eventLog, logEntry] };
        });
        
        setLegionnaireModalState({ isOpen: false });
    };

    const finishCurrentGameAndSetupNext = React.useCallback((manualWinnerId?: string) => {
        setActiveSession(session => {
            if (!session || !session.games.length) return session;
            const game = session.games[session.games.length - 1];
            if (game.status === GameStatus.Finished) return session;

            // --- 1. SNAPSHOT & FINISH GAME ---
            
            // Snapshot current rosters (with Legionnaires) for statistics
            const team1Snapshot = session.teams.find(t => t.id === game.team1Id)?.playerIds || [];
            const team2Snapshot = session.teams.find(t => t.id === game.team2Id)?.playerIds || [];

            const finishRoundEvent: EventLogEntry = {
                timestamp: new Date().toISOString(),
                round: game.gameNumber,
                type: EventType.FINISH_ROUND,
                payload: {},
            };
            
            const finalElapsedSeconds = game.status === GameStatus.Active && game.lastResumeTime
                ? game.elapsedSecondsOnPause + (Date.now() - game.lastResumeTime) / 1000
                : game.elapsedSecondsOnPause;

            let winnerId: string | undefined = undefined;
            if (game.team1Score > game.team2Score) {
                winnerId = game.team1Id;
            } else if (game.team2Score > game.team1Score) {
                winnerId = game.team2Id;
            }
            const isDraw = !winnerId;

            const finishedGame: Game = { 
                ...game, 
                status: GameStatus.Finished, 
                winnerTeamId: winnerId,
                isDraw: isDraw, 
                endedAt: new Date().toISOString(), 
                elapsedSeconds: finalElapsedSeconds,
                team1Roster: team1Snapshot, // SAVE SNAPSHOT
                team2Roster: team2Snapshot  // SAVE SNAPSHOT
            };
            
            // --- 2. REVERT LEGIONNAIRES ---
            // Before calculating rotation, put everyone back where they belong
            let currentTeams = [...session.teams];
            
            if (finishedGame.legionnaireMoves && finishedGame.legionnaireMoves.length > 0) {
                // Reverse the moves. If move was A -> B, we move A back to A (from B).
                // We process in reverse order of application to be safe.
                const movesToRevert = [...finishedGame.legionnaireMoves].reverse();
                
                movesToRevert.forEach(move => {
                    // Move playerId FROM toTeamId BACK TO fromTeamId
                    const currentHostTeamIndex = currentTeams.findIndex(t => t.id === move.toTeamId);
                    const currentBenchTeamIndex = currentTeams.findIndex(t => t.id === move.fromTeamId);
                    
                    if (currentHostTeamIndex > -1 && currentBenchTeamIndex > -1) {
                        const hostTeam = { ...currentTeams[currentHostTeamIndex] };
                        const benchTeam = { ...currentTeams[currentBenchTeamIndex] };
                        
                        // Check if player is actually in the host team (should be)
                        if (hostTeam.playerIds.includes(move.playerId)) {
                            // Remove from Host
                            hostTeam.playerIds = hostTeam.playerIds.filter(id => id !== move.playerId);
                            // Add back to Bench (Source)
                            benchTeam.playerIds = [...benchTeam.playerIds, move.playerId];
                            
                            currentTeams[currentHostTeamIndex] = hostTeam;
                            currentTeams[currentBenchTeamIndex] = benchTeam;
                        }
                    }
                });
            }

            // --- 3. ROTATION LOGIC (Using Original Rosters) ---
            
            if (session.numTeams === 2) {
                 const updatedGames = [...session.games.slice(0, -1), finishedGame];
                 return { ...session, games: updatedGames, eventLog: [...session.eventLog, finishRoundEvent], teams: currentTeams };
            }
            
            let teamToStayOnFieldId: string | undefined;

            const team1 = currentTeams.find(t => t.id === game.team1Id)!;
            const team2 = currentTeams.find(t => t.id === game.team2Id)!;

            if (isDraw) {
                if (game.gameNumber === 1) {
                    if (manualWinnerId) {
                        teamToStayOnFieldId = manualWinnerId;
                    } else {
                        setIsSelectWinnerModalOpen(true);
                        return session; 
                    }
                } else {
                    teamToStayOnFieldId = team1.consecutiveGames > team2.consecutiveGames ? team2.id : team1.id;
                }
            } else {
                teamToStayOnFieldId = winnerId;
            }
            
            if (!teamToStayOnFieldId) {
                console.error("Critical logic error: Could not determine team to stay on field.");
                return session;
            }
            setIsSelectWinnerModalOpen(false);
            
            const updatedGames = [...session.games.slice(0, -1), finishedGame];

            const teamThatStays = currentTeams.find(t => t.id === teamToStayOnFieldId)!;
            const teamThatLeaves = teamThatStays.id === team1.id ? team2 : team1;
            const restingTeam = currentTeams.find(t => t.id !== team1.id && t.id !== team2.id)!;

            const winnerGamesPlayed = teamThatStays.consecutiveGames;
            const mustRotate = session.rotationMode === RotationMode.AutoRotate && !isDraw && (winnerGamesPlayed + 1) >= 3;
            const mustRotateOnDraw = session.rotationMode === RotationMode.AutoRotate && isDraw && (teamThatStays.consecutiveGames >= 2);

            const teamToRestNext = mustRotate || mustRotateOnDraw ? teamThatStays : teamThatLeaves;
            const teamOnFieldForNextRound = teamToRestNext.id === teamThatStays.id ? teamThatLeaves : teamThatStays;
            const challengerTeam = restingTeam;

            const awardBigStar = session.rotationMode === RotationMode.AutoRotate && !isDraw && teamThatStays.consecutiveGames === 2;
            
            const finalUpdatedTeams = currentTeams.map(t => {
                let newBigStars = t.bigStars || 0;
                if (t.id === teamThatStays.id && awardBigStar) {
                    newBigStars += 1;
                }

                if (t.id === teamToRestNext.id) {
                    return { ...t, consecutiveGames: 0, bigStars: newBigStars };
                }
                if (t.id === teamOnFieldForNextRound.id) {
                    return { ...t, consecutiveGames: t.consecutiveGames + 1, bigStars: newBigStars };
                }
                return { ...t, consecutiveGames: 0, bigStars: newBigStars }; 
            });
            
            const getUpdatedTeam = (id: string) => finalUpdatedTeams.find(t => t.id === id)!;
            
            let nextTeam1 = getUpdatedTeam(teamOnFieldForNextRound.id);
            let nextTeam2 = getUpdatedTeam(challengerTeam.id);

            const teamThatStaysWasTeam1 = teamOnFieldForNextRound.id === game.team1Id;
            if(!teamThatStaysWasTeam1) {
                [nextTeam1, nextTeam2] = [nextTeam2, nextTeam1];
            }
    
            const nextGame: Game = { 
                id: newId(), 
                gameNumber: game.gameNumber + 1, 
                team1Id: nextTeam1.id, 
                team2Id: nextTeam2.id, 
                team1Score: 0, 
                team2Score: 0, 
                isDraw: false, 
                durationSeconds: session.matchDurationMinutes ? session.matchDurationMinutes * 60 : undefined, 
                elapsedSeconds: 0, 
                elapsedSecondsOnPause: 0, 
                goals: [], 
                status: GameStatus.Pending 
            };
            
            const getPlayerNickname = (id: string) => session.playerPool.find(p => p.id === id)?.nickname || '';
            const startRoundEvent: EventLogEntry = {
                timestamp: new Date().toISOString(),
                round: nextGame.gameNumber,
                type: EventType.START_ROUND,
                payload: {
                    leftTeam: nextTeam1.color,
                    rightTeam: nextTeam2.color,
                    leftPlayers: nextTeam1.playerIds.slice(0, session.playersPerTeam).map(getPlayerNickname),
                    rightPlayers: nextTeam2.playerIds.slice(0, session.playersPerTeam).map(getPlayerNickname),
                } as StartRoundPayload,
            };

            return { ...session, games: [...updatedGames, nextGame], teams: finalUpdatedTeams, eventLog: [...session.eventLog, finishRoundEvent, startRoundEvent] };
        });
    }, [setActiveSession]);
    
    const handleStartGame = () => {
        if (isTimerBasedGame) {
            initAudioContext();
            if (activeSession?.matchDurationMinutes) {
                playAnnouncement('start_match', 'Game started', activeVoicePack);
            }
        }
        
        setActiveSession(s => {
            if (!s) return null;
            const games = [...s.games];
            const currentGame = { ...games[games.length - 1] };
            if (currentGame.status !== GameStatus.Pending) return s;

            currentGame.status = GameStatus.Active;
            currentGame.lastResumeTime = Date.now();
            if (!currentGame.startTime) {
                currentGame.startTime = currentGame.lastResumeTime;
            }
            currentGame.announcedMilestones = [];

            games[games.length - 1] = currentGame;
            
            const startEvent: EventLogEntry = {
                timestamp: new Date().toISOString(),
                round: currentGame.gameNumber,
                type: EventType.TIMER_START,
                payload: {},
            };
            
            return { ...s, games, eventLog: [...s.eventLog, startEvent] };
        });
    };

    const handleTogglePause = () => {
        setActiveSession(s => {
            if (!s) return null;
            const games = [...s.games];
            const currentGame = { ...games[games.length - 1] };
            
            if (currentGame.status === GameStatus.Active) {
                const elapsedSinceResume = (Date.now() - (currentGame.lastResumeTime || Date.now())) / 1000;
                currentGame.elapsedSecondsOnPause += elapsedSinceResume;
                currentGame.status = GameStatus.Paused;
            } else if (currentGame.status === GameStatus.Paused) {
                currentGame.status = GameStatus.Active;
                currentGame.lastResumeTime = Date.now();
            } else {
                return s;
            }
            
            games[games.length - 1] = currentGame;

            const event: EventLogEntry = {
                timestamp: new Date().toISOString(),
                round: currentGame.gameNumber,
                type: EventType.TIMER_STOP,
                payload: {},
            };
            
            return { ...s, games, eventLog: [...s.eventLog, event] };
        });
    };

    const handleGoalSave = (goalData: Omit<Goal, 'id' | 'gameId' | 'timestampSeconds'>, goalPayload: GoalPayload) => {
        setActiveSession(s => {
            if (!s) return null;
            const games = [...s.games];
            let currentGame = { ...games[s.games.length - 1] };
            
            if (currentGame.status === GameStatus.Finished) return s;

            const currentTotalElapsed = currentGame.status === GameStatus.Active && currentGame.lastResumeTime
                ? currentGame.elapsedSecondsOnPause + (Date.now() - currentGame.lastResumeTime) / 1000
                : currentGame.elapsedSecondsOnPause;

            const newGoal: Goal = { 
                ...goalData, 
                id: newId(), 
                gameId: currentGame.id, 
                timestampSeconds: Math.floor(currentTotalElapsed)
            };
            
            currentGame.goals = [...currentGame.goals, newGoal];

            if (newGoal.teamId === currentGame.team1Id) {
                currentGame.team1Score++;
            } else {
                currentGame.team2Score++;
            }
            
            games[s.games.length - 1] = currentGame;

             const goalEvent: EventLogEntry = {
                timestamp: new Date().toISOString(),
                round: currentGame.gameNumber,
                type: EventType.GOAL,
                payload: goalPayload,
            };
            
            return { ...s, games, eventLog: [...s.eventLog, goalEvent] };
        });
    };

    const handleGoalUpdate = (goalId: string, updates: { scorerId?: string; assistantId?: string; isOwnGoal: boolean }) => {
        setActiveSession(s => {
            if (!s || !currentGame) return s;
    
            const games = [...s.games];
            const gameIndex = games.findIndex(g => g.id === currentGame.id);
            if (gameIndex === -1) return s;
    
            const updatedGame = { ...games[gameIndex] };
            const goalIndex = updatedGame.goals.findIndex(g => g.id === goalId);
            if (goalIndex === -1) return s;
    
            const originalGoal = updatedGame.goals[goalIndex];
            const updatedGoal = { ...originalGoal, ...updates };

            if (updates.isOwnGoal) {
                updatedGoal.scorerId = undefined;
                updatedGoal.assistantId = undefined;
            }
            updatedGame.goals[goalIndex] = updatedGoal;
            games[gameIndex] = updatedGame;
    
            const getPlayerNickname = (id?: string) => s.playerPool.find(p => p.id === id)?.nickname;
            
            const eventLog = [...s.eventLog];
            let eventUpdated = false;
            for (let i = eventLog.length - 1; i >= 0; i--) {
                const event = eventLog[i];
                 if (event.round === updatedGame.gameNumber && event.type === EventType.GOAL) {
                    const eventTimestamp = new Date(event.timestamp).getTime();
                    const goalTimestamp = (updatedGame.startTime || 0) + originalGoal.timestampSeconds * 1000;
                    
                    if (Math.abs(eventTimestamp - goalTimestamp) < 2000) {
                        const payload = event.payload as GoalPayload;
                        const originalTeamColor = s.teams.find(t => t.id === originalGoal.teamId)?.color;
                        
                        if(payload.team === originalTeamColor){
                             const newPayload: GoalPayload = {
                                ...payload,
                                scorer: getPlayerNickname(updatedGoal.scorerId),
                                assist: getPlayerNickname(updatedGoal.assistantId),
                                isOwnGoal: updatedGoal.isOwnGoal,
                            };
                            eventLog[i] = { ...event, payload: newPayload };
                            eventUpdated = true;
                            break;
                        }
                    }
                }
            }
            
            setGoalToEdit(null);
            return { ...s, games, eventLog: eventUpdated ? eventLog : s.eventLog };
        });
    };

    const handleSubstitution = (playerInId: string) => {
        const { teamId, playerOutId } = subModalState;
        if (!teamId || !playerOutId) return;
    
        setActiveSession(currentSession => {
            if (!currentSession) return null;
    
            const teamIndex = currentSession.teams.findIndex(t => t.id === teamId);
            if (teamIndex === -1) return currentSession;
    
            const teamToUpdate = { ...currentSession.teams[teamIndex] };
            const playerIds = [...teamToUpdate.playerIds];
            const outIndex = playerIds.indexOf(playerOutId);
            const inIndex = playerIds.indexOf(playerInId);
    
            if (outIndex === -1 || inIndex === -1) return currentSession;
    
            [playerIds[outIndex], playerIds[inIndex]] = [playerIds[inIndex], playerIds[outIndex]];
            teamToUpdate.playerIds = playerIds;
    
            const updatedTeams = [...currentSession.teams];
            updatedTeams[teamIndex] = teamToUpdate;
    
            const currentLiveGame = currentSession.games[currentSession.games.length - 1];
            if (!currentLiveGame) return { ...currentSession, teams: updatedTeams };
    
            const getPlayerNickname = (id: string) => currentSession.playerPool.find(p => p.id === id)?.nickname || '';
            const subEvent: EventLogEntry = {
                timestamp: new Date().toISOString(),
                round: currentLiveGame.gameNumber,
                type: EventType.SUBSTITUTION,
                payload: {
                    side: teamId === currentLiveGame.team1Id ? 'left' : 'right',
                    out: getPlayerNickname(playerOutId),
                    in: getPlayerNickname(playerInId),
                } as SubPayload,
            };
    
            return { ...currentSession, teams: updatedTeams, eventLog: [...currentSession.eventLog, subEvent] };
        });
    
        setSubModalState({ isOpen: false });
    };
    
    const handleFinishSession = async () => {
        if (!activeSession || saveStatus === 'saving') return;

        // Test Mode: immediate exit, no save
        if (activeSession.isTestMode) {
            setIsEndSessionModalOpen(false);
            setActiveSession(null);
            navigate('/');
            return;
        }
        
        setSaveStatus('saving');
        setIsEndSessionModalOpen(false); // Close the confirm modal, the SaveOverlay will take over
        
        try {
            const {
                updatedPlayers,
                playersToSave,
                finalSession,
                updatedNewsFeed
            } = processFinishedSession({
                session: activeSession,
                oldPlayers: oldPlayersState,
                newsFeed: newsFeed,
            });

            // Parallel save execution would be faster, but let's do sequential for safer status reporting
            // We care most about Session History being cloud-saved.
            
            if (playersToSave.length > 0) {
                await savePlayersToDB(playersToSave);
                setAllPlayers(updatedPlayers); 
            }

            if (updatedNewsFeed.length > newsFeed.length) {
                await saveNewsToDB(updatedNewsFeed);
                setNewsFeed(updatedNewsFeed);
            }

            // Save History is the critical path
            const historyResult = await saveHistoryToDB([finalSession]);
            setHistory(prev => [finalSession, ...prev]);

            // Determine final status
            if (historyResult.cloudSaved) {
                setSaveStatus('cloud_success');
            } else {
                setSaveStatus('local_success');
            }

        } catch (error) {
            console.error("Error ending session:", error);
            setSaveStatus('error');
        }
    };
    
    const resetSession = () => {
        setActiveSession(null);
        setSaveStatus('idle');
        navigate('/');
    };

    React.useEffect(() => {
        if (!activeSession || !currentGame || currentGame.status !== GameStatus.Active) return;
    
        const goalLimit = activeSession.goalsToWin;
        if (goalLimit && goalLimit > 0) {
            if (currentGame.team1Score >= goalLimit || currentGame.team2Score >= goalLimit) {
                finishCurrentGameAndSetupNext();
            }
        }
    }, [currentGame?.team1Score, currentGame?.team2Score, activeSession, currentGame, finishCurrentGameAndSetupNext]);

    return {
        // State
        scoringTeamForModal,
        isEndSessionModalOpen,
        isSelectWinnerModalOpen,
        goalToEdit,
        saveStatus,
        subModalState,
        legionnaireModalState, // Export new state
        // Derived state
        currentGame,
        isTimerBasedGame,
        // Handlers
        setScoringTeamForModal,
        setIsEndSessionModalOpen,
        setGoalToEdit,
        setSubModalState,
        setLegionnaireModalState, // Export new setter
        finishCurrentGameAndSetupNext,
        handleStartGame,
        handleTogglePause,
        handleGoalSave,
        handleGoalUpdate,
        handleSubstitution,
        handleFinishSession,
        handleLegionnaireSwap, // Export new handler
        resetSession 
    };
};