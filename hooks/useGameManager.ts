
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context';
import { Session, Game, GameStatus, Goal, GoalPayload, SubPayload, EventLogEntry, EventType, StartRoundPayload, Player, BadgeType, RotationMode, Team, SessionStatus, LegionnaireMove, LegionnairePayload } from '../types';
import { playAnnouncement, initAudioContext } from '../lib';
import { processFinishedSession } from '../services/sessionProcessor';
import { newId } from '../screens/utils';
import { savePlayersToDB, saveNewsToDB, saveHistoryLocalOnly, saveHistoryToDB } from '../db';
import { useTranslation } from '../ui';
import { SessionSummaryData } from '../modals/SessionSummaryModal';
import { calculateNextQueue4 } from '../services/rotationEngine4';

export const useGameManager = () => {
    const { activeSession, setActiveSession, setHistory, setAllPlayers, setNewsFeed, allPlayers: oldPlayersState, newsFeed, activeVoicePack } = useApp();
    const navigate = useNavigate();
    const t = useTranslation();

    const [scoringTeamForModal, setScoringTeamForModal] = React.useState<string | null>(null);
    const [isEndSessionModalOpen, setIsEndSessionModalOpen] = React.useState(false);
    const [isSelectWinnerModalOpen, setIsSelectWinnerModalOpen] = React.useState(false);
    const [goalToEdit, setGoalToEdit] = React.useState<Goal | null>(null);
    const [isSavingSession, setIsSavingSession] = React.useState(false);
    
    const [subModalState, setSubModalState] = React.useState<{
        isOpen: boolean;
        teamId?: string;
        playerOutId?: string;
    }>({ isOpen: false });

    const [legionnaireModalState, setLegionnaireModalState] = React.useState<{
        isOpen: boolean;
        teamId?: string;
        playerOutId?: string;
    }>({ isOpen: false });

    const currentGame = activeSession?.games[activeSession.games.length - 1];
    const isTimerBasedGame = activeSession?.numTeams && activeSession.numTeams >= 3;

    // --- ROSTER MANAGEMENT LOGIC ---

    // 1. Remove Player (Ghost Slot)
    const removePlayerFromSession = (teamId: string, playerId: string) => {
        setActiveSession(session => {
            if (!session) return null;
            // Remove from Team Roster
            const updatedTeams = session.teams.map(team => {
                if (team.id === teamId) {
                    return { ...team, playerIds: team.playerIds.filter(id => id !== playerId) };
                }
                return team;
            });
            
            // Note: We deliberately KEEP them in playerPool so historical logs (goals/assists) don't break.
            // If they truly never played, they just won't have stats at the end.
            
            return { ...session, teams: updatedTeams };
        });
    };

    // 2. Replace Player (Full Substitution)
    const replacePlayerInSession = (teamId: string, oldPlayerId: string, newPlayer: Player) => {
        // First ensure new player is in global state (if new)
        setAllPlayers(prev => {
            if (prev.some(p => p.id === newPlayer.id)) return prev;
            return [...prev, newPlayer];
        });

        setActiveSession(session => {
            if (!session) return null;

            // 1. Update Player Pool
            let updatedPool = [...session.playerPool];
            if (!updatedPool.some(p => p.id === newPlayer.id)) {
                updatedPool.push(newPlayer);
            }
            // We can optionally remove oldPlayer from pool if they have 0 stats, but safer to keep for now.

            // 2. Update Team Roster
            const updatedTeams = session.teams.map(team => {
                if (team.id === teamId) {
                    return { 
                        ...team, 
                        playerIds: team.playerIds.map(id => id === oldPlayerId ? newPlayer.id : id) 
                    };
                }
                return team;
            });

            // 3. Update History (Retroactive Fix)
            // This is the "Replace" magic: we assume the old player wasn't there.
            const updatedGames = session.games.map(game => {
                const updatedGoals = game.goals.map(goal => ({
                    ...goal,
                    scorerId: goal.scorerId === oldPlayerId ? newPlayer.id : goal.scorerId,
                    assistantId: goal.assistantId === oldPlayerId ? newPlayer.id : goal.assistantId
                }));
                
                // Also check legionnaire moves history
                const updatedMoves = game.legionnaireMoves?.map(move => ({
                    ...move,
                    playerId: move.playerId === oldPlayerId ? newPlayer.id : move.playerId
                }));

                return { ...game, goals: updatedGoals, legionnaireMoves: updatedMoves };
            });

            return { 
                ...session, 
                playerPool: updatedPool, 
                teams: updatedTeams, 
                games: updatedGames 
            };
        });
    };

    // 3. Swap Teams (Rebalance)
    const swapPlayerTeam = (playerId: string, sourceTeamId: string, targetTeamId: string, swapWithPlayerId?: string) => {
        setActiveSession(session => {
            if (!session) return null;

            const updatedTeams = session.teams.map(team => {
                // Source Team: Remove Player A, (optionally Add Player B)
                if (team.id === sourceTeamId) {
                    let newIds = team.playerIds.filter(id => id !== playerId);
                    if (swapWithPlayerId) newIds.push(swapWithPlayerId);
                    return { ...team, playerIds: newIds };
                }
                
                // Target Team: Add Player A, (optionally Remove Player B)
                if (team.id === targetTeamId) {
                    let newIds = team.playerIds;
                    if (swapWithPlayerId) newIds = newIds.filter(id => id !== swapWithPlayerId);
                    newIds.push(playerId);
                    return { ...team, playerIds: newIds };
                }
                
                return team;
            });

            return { ...session, teams: updatedTeams };
        });
    };

    // 4. Add Player (Mid-session join)
    const addPlayerToSession = (teamId: string, newPlayer: Player) => {
        // Ensure global consistency
        setAllPlayers(prev => {
            if (prev.some(p => p.id === newPlayer.id)) return prev;
            return [...prev, newPlayer];
        });

        setActiveSession(session => {
            if (!session) return null;

            // 1. Add to Player Pool if needed
            let updatedPool = [...session.playerPool];
            if (!updatedPool.some(p => p.id === newPlayer.id)) {
                updatedPool.push(newPlayer);
            }

            // 2. Add to Team Roster
            const updatedTeams = session.teams.map(team => {
                if (team.id === teamId) {
                    return { 
                        ...team, 
                        playerIds: [...team.playerIds, newPlayer.id] 
                    };
                }
                return team;
            });

            return { 
                ...session, 
                playerPool: updatedPool, 
                teams: updatedTeams 
            };
        });
    };

    // ---------------------------------

    const handleManualTeamSwap = (side: 'left' | 'right', newTeamId: string) => {
        setActiveSession(session => {
            if (!session || !currentGame || currentGame.status !== GameStatus.Pending) return session;

            const updatedGames = [...session.games];
            const game = { ...updatedGames[updatedGames.length - 1] };
            
            const oldTeamId = side === 'left' ? game.team1Id : game.team2Id;

            if (side === 'left') game.team1Id = newTeamId;
            else game.team2Id = newTeamId;
            
            updatedGames[updatedGames.length - 1] = game;

            let updatedQueue = session.rotationQueue ? [...session.rotationQueue] : undefined;
            if (updatedQueue) {
                const oldIdx = updatedQueue.indexOf(oldTeamId);
                const newIdx = updatedQueue.indexOf(newTeamId);
                if (oldIdx > -1 && newIdx > -1) {
                    [updatedQueue[oldIdx], updatedQueue[newIdx]] = [updatedQueue[newIdx], updatedQueue[oldIdx]];
                }
            }

            const updatedLog = [...session.eventLog];
            let lastStartRoundIdx = -1;
            for (let i = updatedLog.length - 1; i >= 0; i--) {
                if (updatedLog[i].type === EventType.START_ROUND) {
                    lastStartRoundIdx = i;
                    break;
                }
            }
            
            if (lastStartRoundIdx > -1) {
                const entry = { ...updatedLog[lastStartRoundIdx] };
                const payload = { ...entry.payload as StartRoundPayload };
                
                const newTeam = session.teams.find(t => t.id === newTeamId)!;
                const getPlayerNickname = (id: string) => session.playerPool.find(p => p.id === id)?.nickname || '';

                if (side === 'left') {
                    payload.leftTeam = newTeam.color;
                    payload.leftPlayers = newTeam.playerIds.slice(0, session.playersPerTeam).map(getPlayerNickname);
                } else {
                    payload.rightTeam = newTeam.color;
                    payload.rightPlayers = newTeam.playerIds.slice(0, session.playersPerTeam).map(getPlayerNickname);
                }
                entry.payload = payload;
                updatedLog[lastStartRoundIdx] = entry;
            }

            return { ...session, games: updatedGames, rotationQueue: updatedQueue, eventLog: updatedLog };
        });
    };

    const handleLegionnaireSwap = (teamId: string, playerOutId: string, playerInId: string) => {
        setActiveSession(session => {
            if (!session || !currentGame) return session;
            const games = [...session.games];
            const game = { ...games[games.length - 1] };
            const fromTeam = session.teams.find(t => t.playerIds.includes(playerInId));
            if (!fromTeam) return session;
            const newMove: LegionnaireMove = { playerId: playerInId, fromTeamId: fromTeam.id, toTeamId: teamId };
            
            const isGhostFill = !session.teams.find(t => t.id === teamId)?.playerIds.includes(playerOutId);
            
            if (isGhostFill) {
                 game.legionnaireMoves = [...(game.legionnaireMoves || []), newMove];
            } else {
                const reverseMove: LegionnaireMove = { playerId: playerOutId, fromTeamId: teamId, toTeamId: fromTeam.id };
                game.legionnaireMoves = [...(game.legionnaireMoves || []), newMove, reverseMove];
                
                const teams = session.teams.map(team => {
                    if (team.id === teamId) return { ...team, playerIds: team.playerIds.map(id => id === playerOutId ? playerInId : id) };
                    if (team.id === fromTeam.id) return { ...team, playerIds: team.playerIds.map(id => id === playerInId ? playerOutId : id) };
                    return team;
                });
                
                const getPlayerName = (id: string) => session.playerPool.find(p => p.id === id)?.nickname || 'Unknown';
                const logEntry: EventLogEntry = {
                    timestamp: new Date().toISOString(),
                    round: game.gameNumber,
                    type: EventType.LEGIONNAIRE_SIGN,
                    payload: { player: getPlayerName(playerInId), toTeam: session.teams.find(t => t.id === teamId)?.name || 'Team' } as LegionnairePayload
                };
                
                return { ...session, teams, games: [...games.slice(0, -1), game], eventLog: [...session.eventLog, logEntry] };
            }
            
            return { ...session, games: [...games.slice(0, -1), game] };
        });
        setLegionnaireModalState({ isOpen: false });
    };

    const finishCurrentGameAndSetupNext = React.useCallback((manualWinnerId?: string) => {
        setActiveSession(session => {
            if (!session || !session.games.length) return session;
            const game = session.games[session.games.length - 1];
            if (game.status === GameStatus.Finished) return session;

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
                elapsedSeconds: finalElapsedSeconds 
            };
            
            if (session.numTeams === 2) {
                 const updatedGames = [...session.games.slice(0, -1), finishedGame];
                 return { ...session, games: updatedGames, eventLog: [...session.eventLog, finishRoundEvent] };
            }

            let currentTeams = [...session.teams];
            
            // REVERT LEGIONNAIRE SWAPS (Restore original rosters)
            if (finishedGame.legionnaireMoves && finishedGame.legionnaireMoves.length > 0) {
                const movesToRevert = [...finishedGame.legionnaireMoves].reverse();
                movesToRevert.forEach(move => {
                    const hostIdx = currentTeams.findIndex(t => t.id === move.toTeamId);
                    const benchIdx = currentTeams.findIndex(t => t.id === move.fromTeamId);
                    
                    if (hostIdx > -1 && benchIdx > -1) {
                        const host = { ...currentTeams[hostIdx] };
                        const bench = { ...currentTeams[benchIdx] };
                        
                        if (host.playerIds.includes(move.playerId)) {
                            host.playerIds = host.playerIds.filter(id => id !== move.playerId);
                            if (!bench.playerIds.includes(move.playerId)) {
                                bench.playerIds = [...bench.playerIds, move.playerId];
                            }
                            currentTeams[hostIdx] = host;
                            currentTeams[benchIdx] = bench;
                        }
                    }
                });
            }
            
            // --- 4 TEAMS LOGIC ---
            if (session.numTeams === 4) {
                const updatedGames = [...session.games.slice(0, -1), finishedGame];
                const nextQueue = calculateNextQueue4(session, finishedGame);
                
                const finalUpdatedTeams = currentTeams.map(t => {
                    let newBigStars = t.bigStars || 0;
                    if (t.id === winnerId && t.consecutiveGames === 2 && session.rotationMode === RotationMode.AutoRotate) {
                        newBigStars += 1;
                    }
                    
                    const staysOnField = (nextQueue[0] === t.id || nextQueue[1] === t.id);
                    if (staysOnField) {
                        const wasPlaying = (t.id === game.team1Id || t.id === game.team2Id);
                        return { 
                            ...t, 
                            consecutiveGames: (wasPlaying && t.id === winnerId && !isDraw) ? t.consecutiveGames + 1 : 0, 
                            bigStars: newBigStars 
                        };
                    }
                    return { ...t, consecutiveGames: 0, bigStars: newBigStars };
                });

                const nextTeam1 = finalUpdatedTeams.find(t => t.id === nextQueue[0])!;
                const nextTeam2 = finalUpdatedTeams.find(t => t.id === nextQueue[1])!;

                const nextGame: Game = { 
                    id: newId(), gameNumber: game.gameNumber + 1, team1Id: nextTeam1.id, team2Id: nextTeam2.id, 
                    team1Score: 0, team2Score: 0, isDraw: false, 
                    durationSeconds: session.matchDurationMinutes ? session.matchDurationMinutes * 60 : undefined, 
                    elapsedSeconds: 0, elapsedSecondsOnPause: 0, goals: [], status: GameStatus.Pending 
                };

                const getPlayerNickname = (id: string) => session.playerPool.find(p => p.id === id)?.nickname || '';
                const startRoundEvent: EventLogEntry = {
                    timestamp: new Date().toISOString(), round: nextGame.gameNumber, type: EventType.START_ROUND,
                    payload: { leftTeam: nextTeam1.color, rightTeam: nextTeam2.color, 
                    leftPlayers: nextTeam1.playerIds.slice(0, session.playersPerTeam).map(getPlayerNickname),
                    rightPlayers: nextTeam2.playerIds.slice(0, session.playersPerTeam).map(getPlayerNickname) } as StartRoundPayload,
                };

                return { ...session, games: [...updatedGames, nextGame], teams: finalUpdatedTeams, rotationQueue: nextQueue, eventLog: [...session.eventLog, finishRoundEvent, startRoundEvent] };
            }

            // --- 3 TEAMS LOGIC ---
            let teamToStayOnFieldId: string | undefined;
            const team1 = currentTeams.find(t => t.id === game.team1Id)!;
            const team2 = currentTeams.find(t => t.id === game.team2Id)!;

            if (isDraw) {
                if (game.gameNumber === 1) {
                    if (manualWinnerId) teamToStayOnFieldId = manualWinnerId;
                    else { setIsSelectWinnerModalOpen(true); return session; }
                } else teamToStayOnFieldId = team1.consecutiveGames > team2.consecutiveGames ? team2.id : team1.id;
            } else teamToStayOnFieldId = winnerId;
            
            if (!teamToStayOnFieldId) return session;
            setIsSelectWinnerModalOpen(false);
            
            const updatedGames = [...session.games.slice(0, -1), finishedGame];
            const teamThatStays = currentTeams.find(t => t.id === teamToStayOnFieldId)!;
            const teamThatLeaves = teamThatStays.id === team1.id ? team2 : team1;
            const restingTeam = currentTeams.find(t => t.id !== team1.id && t.id !== team2.id)!;

            const winnersG = teamThatStays.consecutiveGames;
            const mustRotate = session.rotationMode === RotationMode.AutoRotate && !isDraw && (winnersG + 1) >= 3;
            const mustRotateOnDraw = session.rotationMode === RotationMode.AutoRotate && isDraw && (teamThatStays.consecutiveGames >= 2);

            const teamToRestNext = mustRotate || mustRotateOnDraw ? teamThatStays : teamThatLeaves;
            const teamOnFieldForNextRound = teamToRestNext.id === teamThatStays.id ? teamThatLeaves : teamThatStays;
            const challengerTeam = restingTeam;

            const awardBigStar = session.rotationMode === RotationMode.AutoRotate && !isDraw && teamThatStays.consecutiveGames === 2;
            
            const finalUpdatedTeams = currentTeams.map(t => {
                let newBigStars = t.bigStars || 0;
                if (t.id === teamThatStays.id && awardBigStar) newBigStars += 1;
                if (t.id === teamToRestNext.id) return { ...t, consecutiveGames: 0, bigStars: newBigStars };
                if (t.id === teamOnFieldForNextRound.id) return { ...t, consecutiveGames: t.consecutiveGames + 1, bigStars: newBigStars };
                return { ...t, consecutiveGames: 0, bigStars: newBigStars }; 
            });

            // --- SIDE PRESERVATION LOGIC ---
            const winnerOriginalSide = teamThatStays.id === game.team1Id ? 1 : 2;
            const staysOnItsSide = teamThatStays.id === teamOnFieldForNextRound.id;

            let nextTeam1Id: string;
            let nextTeam2Id: string;

            if (staysOnItsSide) {
                if (winnerOriginalSide === 1) {
                    nextTeam1Id = teamThatStays.id;
                    nextTeam2Id = challengerTeam.id;
                } else {
                    nextTeam1Id = challengerTeam.id;
                    nextTeam2Id = teamThatStays.id;
                }
            } else {
                const loserOriginalSide = teamThatLeaves.id === game.team1Id ? 1 : 2;
                if (loserOriginalSide === 1) {
                    nextTeam1Id = teamThatLeaves.id;
                    nextTeam2Id = challengerTeam.id;
                } else {
                    nextTeam1Id = challengerTeam.id;
                    nextTeam2Id = teamThatLeaves.id;
                }
            }

            const nextTeam1 = finalUpdatedTeams.find(t => t.id === nextTeam1Id)!;
            const nextTeam2 = finalUpdatedTeams.find(t => t.id === nextTeam2Id)!;
    
            const nextGame: Game = { 
                id: newId(), gameNumber: game.gameNumber + 1, team1Id: nextTeam1.id, team2Id: nextTeam2.id, 
                team1Score: 0, team2Score: 0, isDraw: false, durationSeconds: session.matchDurationMinutes ? session.matchDurationMinutes * 60 : undefined, 
                elapsedSeconds: 0, elapsedSecondsOnPause: 0, goals: [], status: GameStatus.Pending 
            };
            
            const getPlayerNickname = (id: string) => session.playerPool.find(p => p.id === id)?.nickname || '';
            const startRoundEvent: EventLogEntry = {
                timestamp: new Date().toISOString(), round: nextGame.gameNumber, type: EventType.START_ROUND,
                payload: { leftTeam: nextTeam1.color, rightTeam: nextTeam2.color, 
                leftPlayers: nextTeam1.playerIds.slice(0, session.playersPerTeam).map(getPlayerNickname),
                rightPlayers: nextTeam2.playerIds.slice(0, session.playersPerTeam).map(getPlayerNickname) } as StartRoundPayload,
            };

            return { ...session, games: [...updatedGames, nextGame], teams: finalUpdatedTeams, eventLog: [...session.eventLog, finishRoundEvent, startRoundEvent] };
        });
    }, [setActiveSession]);
    
    const handleStartGame = () => {
        if (isTimerBasedGame) {
            initAudioContext();
            if (activeSession?.matchDurationMinutes) playAnnouncement('start_match', 'Game started', activeVoicePack);
        }
        setActiveSession(s => {
            if (!s) return null;
            const games = [...s.games];
            const currentGame = { ...games[games.length - 1] };
            if (currentGame.status !== GameStatus.Pending) return s;
            currentGame.status = GameStatus.Active;
            currentGame.lastResumeTime = Date.now();
            if (!currentGame.startTime) currentGame.startTime = currentGame.lastResumeTime;
            currentGame.announcedMilestones = [];
            games[games.length - 1] = currentGame;
            const startEvent: EventLogEntry = { timestamp: new Date().toISOString(), round: currentGame.gameNumber, type: EventType.TIMER_START, payload: {} };
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
            } else return s;
            games[games.length - 1] = currentGame;
            const event: EventLogEntry = { timestamp: new Date().toISOString(), round: currentGame.gameNumber, type: EventType.TIMER_STOP, payload: {} };
            return { ...s, games, eventLog: [...s.eventLog, event] };
        });
    };

    const handleGoalSave = (goalData: Omit<Goal, 'id' | 'gameId' | 'timestampSeconds'>, goalPayload: GoalPayload) => {
        setActiveSession(s => {
            if (!s) return null;
            const games = [...s.games];
            let targetGameIndex = s.games.length - 1;
            let currentGame = { ...games[targetGameIndex] };
            if (currentGame.status === GameStatus.Finished) return s;
            const currentTotalElapsed = currentGame.status === GameStatus.Active && currentGame.lastResumeTime
                ? currentGame.elapsedSecondsOnPause + (Date.now() - currentGame.lastResumeTime) / 1000
                : currentGame.elapsedSecondsOnPause;
            const newGoal: Goal = { ...goalData, id: newId(), gameId: currentGame.id, timestampSeconds: Math.floor(currentTotalElapsed) };
            currentGame.goals = [...currentGame.goals, newGoal];
            if (newGoal.teamId === currentGame.team1Id) currentGame.team1Score++; else currentGame.team2Score++;
            games[targetGameIndex] = currentGame;
            const goalEvent: EventLogEntry = { timestamp: new Date().toISOString(), round: currentGame.gameNumber, type: EventType.GOAL, payload: goalPayload };
            return { ...s, games, eventLog: [...s.eventLog, goalEvent] };
        });
    };

    const replaceGame = (updatedGame: Game) => {
        setActiveSession(s => { if (!s) return null; const games = s.games.map(g => g.id === updatedGame.id ? updatedGame : g); return { ...s, games }; });
    };

    const deleteGoal = (goalId: string) => {
        setActiveSession(s => {
            if (!s) return s;
            const games = [...s.games];
            let gameIndex = -1; let goalIndex = -1;
            for(let i=0; i<games.length; i++) {
                const g = games[i];
                const gIdx = g.goals.findIndex(goal => goal.id === goalId);
                if (gIdx !== -1) { gameIndex = i; goalIndex = gIdx; break; }
            }
            if (gameIndex === -1) return s;
            const updatedGame = { ...games[gameIndex] };
            const goalToDelete = updatedGame.goals[goalIndex];
            if (goalToDelete.teamId === updatedGame.team1Id) updatedGame.team1Score = Math.max(0, updatedGame.team1Score - 1); else updatedGame.team2Score = Math.max(0, updatedGame.team2Score - 1);
            updatedGame.goals = updatedGame.goals.filter(g => g.id !== goalId);
            if (updatedGame.team1Score > updatedGame.team2Score) { updatedGame.winnerTeamId = updatedGame.team1Id; updatedGame.isDraw = false; } else if (updatedGame.team2Score > updatedGame.team1Score) { updatedGame.winnerTeamId = updatedGame.team2Id; updatedGame.isDraw = false; } else { updatedGame.winnerTeamId = undefined; updatedGame.isDraw = true; }
            games[gameIndex] = updatedGame; return { ...s, games };
        });
    };

    const handleGoalUpdate = (goalId: string, updates: { scorerId?: string; assistantId?: string; isOwnGoal: boolean }) => {
        setActiveSession(s => {
            if (!s) return s; 
            const games = [...s.games];
            let gameIndex = -1; let goalIndex = -1;
            for(let i=0; i<games.length; i++) {
                const g = games[i];
                const gIdx = g.goals.findIndex(goal => goal.id === goalId);
                if (gIdx !== -1) { gameIndex = i; goalIndex = gIdx; break; }
            }
            if (gameIndex === -1) return s;
            const updatedGame = { ...games[gameIndex] };
            const originalGoal = updatedGame.goals[goalIndex];
            const updatedGoal = { ...originalGoal, ...updates };
            if (updates.isOwnGoal) { updatedGoal.scorerId = undefined; updatedGoal.assistantId = undefined; }
            updatedGame.goals[goalIndex] = updatedGoal;
            games[gameIndex] = updatedGame;
            setGoalToEdit(null);
            return { ...s, games };
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
                timestamp: new Date().toISOString(), round: currentLiveGame.gameNumber, type: EventType.SUBSTITUTION,
                payload: { side: teamId === currentLiveGame.team1Id ? 'left' : 'right', out: getPlayerNickname(playerOutId), in: getPlayerNickname(playerInId) } as SubPayload,
            };
            return { ...currentSession, teams: updatedTeams, eventLog: [...currentSession.eventLog, subEvent] };
        });
        setSubModalState({ isOpen: false });
    };
    
    const handleFinishSession = async (summaryData?: SessionSummaryData) => {
        if (!activeSession || isSavingSession) return;

        // --- CHECK IF ANY GAMES WERE PLAYED ---
        const finishedGamesCount = activeSession.games.filter(g => g.status === GameStatus.Finished).length;

        if (finishedGamesCount === 0) {
            // ZERO GAMES PLAYED: DISCARD SESSION
            // Reset active session, close modal, go to Home
            setActiveSession(null);
            setIsEndSessionModalOpen(false);
            navigate('/');
            return;
        }

        // --- PROCEED WITH SAVING ---
        setIsSavingSession(true); 
        const sessionToProcess = { ...activeSession };
        if (summaryData) {
            sessionToProcess.location = summaryData.location;
            sessionToProcess.timeString = summaryData.timeString;
            sessionToProcess.weather = summaryData.weather;
        }
        const { updatedPlayers, playersToSave, finalSession, updatedNewsFeed } = processFinishedSession({ session: sessionToProcess, oldPlayers: oldPlayersState, newsFeed: newsFeed });
        finalSession.syncStatus = 'pending';
        try {
            await saveHistoryLocalOnly([finalSession]); 
            setAllPlayers(updatedPlayers); 
            setNewsFeed(updatedNewsFeed);
            setHistory(prev => [finalSession, ...prev]);
            setActiveSession(null);
            await Promise.all([ savePlayersToDB(playersToSave), saveNewsToDB(updatedNewsFeed), saveHistoryToDB([finalSession]) ]);
        } catch (error) { console.error("Save Error:", error); } finally {
            setIsEndSessionModalOpen(false);
            setIsSavingSession(false);
            navigate('/history');
        }
    };
    
    const resetSession = () => { setActiveSession(null); navigate('/'); };
    const swapTeams = (side: 'left' | 'right', targetTeamId: string) => { handleManualTeamSwap(side, targetTeamId); };

    React.useEffect(() => {
        if (!activeSession || !currentGame || currentGame.status !== GameStatus.Active) return;
        const goalLimit = activeSession.goalsToWin;
        if (goalLimit && goalLimit > 0) {
            if (currentGame.team1Score >= goalLimit || currentGame.team2Score >= goalLimit) finishCurrentGameAndSetupNext();
        }
    }, [currentGame?.team1Score, currentGame?.team2Score, activeSession, currentGame, finishCurrentGameAndSetupNext]);

    return {
        scoringTeamForModal, isEndSessionModalOpen, isSelectWinnerModalOpen, goalToEdit, subModalState, legionnaireModalState, 
        currentGame, isTimerBasedGame, setScoringTeamForModal, setIsEndSessionModalOpen, setGoalToEdit, setSubModalState, setLegionnaireModalState, 
        finishCurrentGameAndSetupNext, handleStartGame, handleTogglePause, handleGoalSave, handleGoalUpdate, handleSubstitution, handleFinishSession, handleLegionnaireSwap,
        resetSession, replaceGame, deleteGoal, swapTeams,
        // New methods for Roster Edit
        removePlayerFromSession, replacePlayerInSession, swapPlayerTeam, addPlayerToSession
    };
};
