
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context';
import { Button, Modal, Page, useTranslation } from '../ui';
import { TeamAvatar } from '../components/avatars';
import { StarIcon, Plus, Pause, Play, Edit3 } from '../icons';
import { silentAudioMp3 } from '../assets';
import { Session, Game, GameStatus, Goal, GoalPayload, SubPayload, EventLogEntry, EventType, StartRoundPayload, Player, BadgeType, RotationMode, Team, SessionStatus } from '../types';
import { speak } from '../lib';
import { calculateAllStats } from '../services/statistics';
import { calculateEarnedBadges, calculateRatingUpdate, getTierForRating } from '../services/rating';
import { generateNewsUpdates, manageNewsFeedSize } from '../services/news';
import { GoalModal, EditGoalModal, EndSessionModal, SelectWinnerModal, SubstitutionModal } from '../modals';
import { hexToRgba, newId } from './utils';

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
}> = React.memo(({ team, session, onPlayerClick }) => {
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
            <ul className="space-y-1">
                {activePlayers.map(p => 
                    <li 
                        key={p.id} 
                        onClick={() => subs.length > 0 && onPlayerClick(team.id, p.id)}
                        className={`bg-dark-surface/50 p-2 rounded-full text-center truncate transition-all duration-300 ${subs.length > 0 ? 'cursor-pointer hover:bg-dark-surface/80' : ''}`}
                        style={playerCardStyle}
                    >
                        {p.nickname}
                    </li>
                )}
            </ul>
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

export const LiveMatchScreen: React.FC = () => {
    const { activeSession, setActiveSession, setHistory, displayTime, setAllPlayers, setNewsFeed, allPlayers: oldPlayersState } = useApp();
    const navigate = useNavigate();
    const t = useTranslation();

    const [scoringTeamForModal, setScoringTeamForModal] = React.useState<string | null>(null);
    const [isEndSessionModalOpen, setIsEndSessionModalOpen] = React.useState(false);
    const [isSelectWinnerModalOpen, setIsSelectWinnerModalOpen] = React.useState(false);
    const [goalToEdit, setGoalToEdit] = React.useState<Goal | null>(null);
    const [subModalState, setSubModalState] = React.useState<{
        isOpen: boolean;
        teamId?: string;
        playerOutId?: string;
    }>({ isOpen: false });
    
    const silentAudioRef = React.useRef<HTMLAudioElement | null>(null);

    React.useEffect(() => {
        silentAudioRef.current = new Audio(silentAudioMp3);
        silentAudioRef.current.loop = true;
        silentAudioRef.current.volume = 0.01;

        return () => {
            if (silentAudioRef.current) {
                silentAudioRef.current.pause();
                silentAudioRef.current = null;
            }
        };
    }, []);
    
    const currentGame = activeSession?.games[activeSession.games.length - 1];
    const isTimerBasedGame = activeSession?.numTeams === 3;

    const handlePlayerClickForSub = React.useCallback((teamId: string, playerOutId: string) => {
        setSubModalState({ isOpen: true, teamId, playerOutId });
    }, []);

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
            
            if (session.numTeams === 2) {
                const finalElapsedSeconds = game.status === GameStatus.Active && game.lastResumeTime
                    ? game.elapsedSecondsOnPause + (Date.now() - game.lastResumeTime) / 1000
                    : game.elapsedSecondsOnPause;
                 const finishedGame = { ...game, status: GameStatus.Finished, endedAt: new Date().toISOString(), elapsedSeconds: finalElapsedSeconds };
                 const updatedGames = [...session.games.slice(0, -1), finishedGame];
                 return { ...session, games: updatedGames, eventLog: [...session.eventLog, finishRoundEvent] };
            }

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
            
            let teamToStayOnFieldId: string | undefined;

            const team1 = session.teams.find(t => t.id === game.team1Id)!;
            const team2 = session.teams.find(t => t.id === game.team2Id)!;

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

            const finishedGame: Game = { 
                ...game, 
                status: GameStatus.Finished, 
                winnerTeamId: isDraw ? undefined : teamToStayOnFieldId,
                isDraw: isDraw, 
                endedAt: new Date().toISOString(), 
                elapsedSeconds: finalElapsedSeconds 
            };
            
            const updatedGames = [...session.games.slice(0, -1), finishedGame];

            const teamThatStays = session.teams.find(t => t.id === teamToStayOnFieldId)!;
            const teamThatLeaves = teamThatStays.id === team1.id ? team2 : team1;
            const restingTeam = session.teams.find(t => t.id !== team1.id && t.id !== team2.id)!;

            const winnerGamesPlayed = teamThatStays.consecutiveGames;
            const mustRotate = session.rotationMode === RotationMode.AutoRotate && !isDraw && (winnerGamesPlayed + 1) >= 3;
            const mustRotateOnDraw = session.rotationMode === RotationMode.AutoRotate && isDraw && (teamThatStays.consecutiveGames >= 2);

            const teamToRestNext = mustRotate || mustRotateOnDraw ? teamThatStays : teamThatLeaves;
            const teamOnFieldForNextRound = teamToRestNext.id === teamThatStays.id ? teamThatLeaves : teamThatStays;
            const challengerTeam = restingTeam;

            const awardBigStar = session.rotationMode === RotationMode.AutoRotate && !isDraw && teamThatStays.consecutiveGames === 2;
            
            const finalUpdatedTeams = session.teams.map(t => {
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
    }, [setActiveSession, setIsSelectWinnerModalOpen]);
    
     const handleStartGame = () => {
        if (silentAudioRef.current) {
            const audio = silentAudioRef.current;
            if (audio.paused) {
                audio.play().catch(() => {});
            }
        }

        if (activeSession?.matchDurationMinutes && isTimerBasedGame) {
            const minutes = activeSession.matchDurationMinutes;
            if (minutes === 5) speak('Five minutes go');
            else if (minutes === 7) speak('Seven minutes go');
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
            if (!s) return s;
    
            const games = [...s.games];
            const gameIndex = games.findIndex(g => g.id === currentGame?.id);
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
    
            if (outIndex === -1 || inIndex === -1) {
                return currentSession;
            }
    
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
    
    const handleFinishSession = () => {
        setIsEndSessionModalOpen(false);
        if (!activeSession) return;
        
        if (silentAudioRef.current) {
            silentAudioRef.current.pause();
        }

        const { allPlayersStats } = calculateAllStats(activeSession);
        
        let calculatedNewPlayers: Player[] = [];

        setAllPlayers(currentAllPlayers => {
            const playerStatsMap = new Map(allPlayersStats.map(stat => [stat.player.id, stat]));
            
            let updatedPlayers = currentAllPlayers.map(player => {
                const sessionStats = playerStatsMap.get(player.id);
                if (sessionStats) {
                    const updatedPlayer: Player = {
                        ...player,
                        totalGames: player.totalGames + sessionStats.gamesPlayed,
                        totalGoals: player.totalGoals + sessionStats.goals,
                        totalAssists: player.totalAssists + sessionStats.assists,
                        totalWins: player.totalWins + sessionStats.wins,
                        totalDraws: player.totalDraws + sessionStats.draws,
                        totalLosses: player.totalLosses + sessionStats.losses,
                        totalSessionsPlayed: (player.totalSessionsPlayed || 0) + 1,
                        monthlyGames: player.monthlyGames + sessionStats.gamesPlayed,
                        monthlyGoals: player.monthlyGoals + sessionStats.goals,
                        monthlyAssists: player.monthlyAssists + sessionStats.assists,
                        monthlyWins: player.monthlyWins + sessionStats.wins,
                        monthlySessionsPlayed: (player.monthlySessionsPlayed || 0) + 1,
                        lastPlayedAt: new Date().toISOString(),
                    };
                    return updatedPlayer;
                }
                return player;
            });

            updatedPlayers = updatedPlayers.map(player => {
                const sessionStats = playerStatsMap.get(player.id);
                if (sessionStats) {
                    const badgesEarnedThisSession = calculateEarnedBadges(player, sessionStats, activeSession, allPlayersStats);
                    const currentBadges = player.badges || {};
                    const badgesNewThisSession = badgesEarnedThisSession.filter(b => !currentBadges[b]);

                    const { delta, breakdown } = calculateRatingUpdate(player, sessionStats, activeSession, badgesNewThisSession);
                    const newRating = Math.round(player.rating + delta);
                    
                    let newForm: 'hot_streak' | 'stable' | 'cold_streak' = 'stable';
                    if (delta >= 0.5) newForm = 'hot_streak';
                    else if (delta <= -0.5) newForm = 'cold_streak';
                    
                    const newTier = getTierForRating(newRating);

                    const updatedBadges: Partial<Record<BadgeType, number>> = { ...currentBadges };
                    badgesEarnedThisSession.forEach(badge => {
                        updatedBadges[badge] = (updatedBadges[badge] || 0) + 1;
                    });
                    
                    const sessionHistory = [...(player.sessionHistory || [])];
                    if (sessionStats.gamesPlayed > 0) {
                        sessionHistory.push({ winRate: Math.round((sessionStats.wins / sessionStats.gamesPlayed) * 100) });
                    }
                    if (sessionHistory.length > 5) sessionHistory.shift();

                    return { 
                        ...player, 
                        rating: newRating, 
                        tier: newTier, 
                        form: newForm,
                        badges: updatedBadges,
                        sessionHistory: sessionHistory,
                        lastRatingChange: breakdown,
                    };
                }
                return player;
            });
            
            calculatedNewPlayers = updatedPlayers;
            return updatedPlayers;
        });

        if (calculatedNewPlayers.length > 0) {
            const newNewsItems = generateNewsUpdates(oldPlayersState, calculatedNewPlayers);
            if (newNewsItems.length > 0) {
                setNewsFeed(prev => manageNewsFeedSize([...newNewsItems, ...prev]));
            }
        }

        const finalSession: Session = { 
            ...activeSession, 
            status: SessionStatus.Completed,
        };
        
        setHistory(prev => [finalSession, ...prev]);
        setActiveSession(null);
        navigate('/');
    };
    
    const handleFinishGameManually = () => {
        finishCurrentGameAndSetupNext();
    };

    React.useEffect(() => {
        if (!activeSession || !currentGame) {
            navigate('/', { replace: true });
        }
    }, [activeSession, currentGame, navigate]);

    React.useEffect(() => {
        if (!activeSession || !currentGame || currentGame.status !== GameStatus.Active) return;
    
        const goalLimit = activeSession.goalsToWin;
        if (goalLimit && goalLimit > 0) {
            if (currentGame.team1Score >= goalLimit || currentGame.team2Score >= goalLimit) {
                finishCurrentGameAndSetupNext();
            }
        }
    }, [currentGame?.team1Score, currentGame?.team2Score, activeSession, currentGame, finishCurrentGameAndSetupNext]);


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

    const showIndicators = activeSession.numTeams === 3 && activeSession.rotationMode === RotationMode.AutoRotate;

    if (!team1 || !team2) return null;

    const teamForSub = subModalState.teamId ? activeSession.teams.find(t => t.id === subModalState.teamId) : undefined;
    const playerOutForSub = subModalState.playerOutId ? activeSession.playerPool.find(p => p.id === subModalState.playerOutId) : undefined;
    
    return (
        <div className="pb-28 flex flex-col min-h-screen">
            <GoalModal isOpen={!!scoringTeamForModal} onClose={() => setScoringTeamForModal(null)} onSave={handleGoalSave} game={currentGame} session={activeSession} scoringTeamId={scoringTeamForModal} />
            <EditGoalModal isOpen={!!goalToEdit} onClose={() => setGoalToEdit(null)} onSave={handleGoalUpdate} goal={goalToEdit} game={currentGame} session={activeSession} />
            <EndSessionModal isOpen={isEndSessionModalOpen} onClose={() => setIsEndSessionModalOpen(false)} onConfirm={handleFinishSession} />
            <SelectWinnerModal isOpen={isSelectWinnerModalOpen} onClose={() => setIsSelectWinnerModalOpen(false)} onSelect={finishCurrentGameAndSetupNext} team1={team1} team2={team2}/>
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

            <header className="text-center shrink-0 pt-4">
                <h1 className="text-3xl font-black uppercase text-dark-text accent-text-glow">{t.liveMatch}</h1>
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
                        onClick={isGamePending ? handleStartGame : handleFinishGameManually} 
                        disabled={!isGamePending && !canFinishGame}
                        className="w-full shadow-lg shadow-dark-accent-start/20 hover:shadow-dark-accent-start/40 uppercase"
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
                        <TeamRoster team={team1} session={activeSession} onPlayerClick={handlePlayerClickForSub} />
                        <TeamRoster team={team2} session={activeSession} onPlayerClick={handlePlayerClickForSub} />
                    </div>
                </div>
            </div>

            <div className="mt-auto shrink-0 py-4 px-4 max-w-xl mx-auto w-full">
                 <Button variant="secondary" className="w-full shadow-lg shadow-dark-accent-start/20 hover:shadow-dark-accent-start/40 uppercase" onClick={() => setIsEndSessionModalOpen(true)}>{t.endSession}</Button>
            </div>
        </div>
    );
};
