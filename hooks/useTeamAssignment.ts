
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context';
import { useTranslation } from '../ui';
import { Team, Player, Game, GameStatus, EventLogEntry, EventType, StartRoundPayload, PlayerStatus } from '../types';
import { newId } from '../screens/utils';
import { getTierForRating } from '../services/rating';
import { saveSinglePlayerToDB } from '../db';
import { initializeQueue4 } from '../services/rotationEngine4';

const COLORS = [
  '#FF5733', '#33FF57', '#3357FF', '#FF33A1', '#A133FF', '#33FFA1',
  '#FFC300', '#DAF7A6', '#C70039', '#900C3F', '#581845'
];

export const useTeamAssignment = () => {
    const { activeSession, setActiveSession, allPlayers, setAllPlayers } = useApp();
    const navigate = useNavigate();
    const t = useTranslation();

    const [playerSearch, setPlayerSearch] = React.useState('');
    const [isColorPickerOpen, setIsColorPickerOpen] = React.useState(false);
    const [selectedTeam, setSelectedTeam] = React.useState<Team | null>(null);
    const [isCancelModalOpen, setIsCancelModalOpen] = React.useState(false);
    const [isAutoBalanceModalOpen, setIsAutoBalanceModalOpen] = React.useState(false);

    React.useEffect(() => {
        if (activeSession) {
            if (activeSession.teams.length === 0 && activeSession.numTeams > 0) {
                const defaultColors = ['#0074D9', '#D00000', '#FF9500', '#2ECC40'].slice(0, activeSession.numTeams);
                const newTeams = Array.from({ length: activeSession.numTeams }, (_, i) => ({
                    id: newId(),
                    color: defaultColors[i] || COLORS[i % COLORS.length],
                    name: `${t.team} ${i + 1}`,
                    playerIds: [],
                    consecutiveGames: 0,
                    bigStars: 0,
                }));
                setActiveSession(s => s ? { ...s, teams: newTeams } : s);
            }
        } else {
            navigate('/');
        }
    }, [activeSession, t.team, navigate, setActiveSession]);

    const sessionPlayerIds = new Set(activeSession?.playerPool.map(p => p.id));
    
    // Always filter based on real players now, no test mode branch
    const searchResults = playerSearch
        ? allPlayers.filter(p => 
            !sessionPlayerIds.has(p.id) &&
            p.nickname.toLowerCase().includes(playerSearch.toLowerCase())
          )
        : [];

    const handleAddPlayer = (player: Player | { nickname: string }) => {
        if (!activeSession) return;
        let playerToAdd: Player;

        if ('id' in player) {
            playerToAdd = player;
        } else {
            const existingPlayer = allPlayers.find(p => p.nickname.toLowerCase() === player.nickname.toLowerCase());
            
            if (existingPlayer) {
                playerToAdd = existingPlayer;
            } else {
                const startRating = 68;
                playerToAdd = {
                    id: newId(),
                    nickname: player.nickname,
                    surname: '',
                    createdAt: new Date().toISOString(),
                    countryCode: 'UA',
                    status: PlayerStatus.Unconfirmed,
                    totalGoals: 0, totalAssists: 0, totalGames: 0, totalWins: 0, totalDraws: 0, totalLosses: 0,
                    totalSessionsPlayed: 0,
                    rating: startRating,
                    initialRating: startRating, // Set floor to 68
                    tier: getTierForRating(startRating),
                    monthlyGoals: 0, monthlyAssists: 0, monthlyGames: 0, monthlyWins: 0,
                    monthlySessionsPlayed: 0,
                    form: 'stable', badges: {}, skills: [], lastPlayedAt: new Date().toISOString(),
                    sessionHistory: [],
                    records: {
                        bestGoalsInSession: { value: 0, sessionId: '' },
                        bestAssistsInSession: { value: 0, sessionId: '' },
                        bestWinRateInSession: { value: 0, sessionId: '' },
                    },
                };
                
                // Always save new player
                setAllPlayers(prev => [...prev, playerToAdd]);
                saveSinglePlayerToDB(playerToAdd);
            }
        }
        
        const isPlayerAlreadyInSession = activeSession.playerPool.some(p => p.id === playerToAdd.id);
        if (!isPlayerAlreadyInSession) {
            setActiveSession(s => s ? { ...s, playerPool: [...s.playerPool, playerToAdd] } : s);
        }
        
        setPlayerSearch('');
    };
    
    const handleAssignPlayer = (playerId: string, teamId: string) => {
         setActiveSession(s => {
            if (!s) return null;
            const currentTeam = s.teams.find(team => team.playerIds.includes(playerId));
            
            if (currentTeam?.id === teamId) {
                const updatedTeams = s.teams.map(team => ({
                    ...team,
                    playerIds: team.playerIds.filter(pid => pid !== playerId)
                }));
                 return { ...s, teams: updatedTeams };
            }

            const updatedTeams = s.teams.map(team => {
                let newPlayerIds = team.playerIds.filter(pid => pid !== playerId);
                if (team.id === teamId) {
                    newPlayerIds.push(playerId);
                }
                return { ...team, playerIds: newPlayerIds };
            });

            return { ...s, teams: updatedTeams };
        });
    };

    const handleRemovePlayerFromPool = (playerId: string) => {
        setActiveSession(s => {
            if (!s) return null;
            
            const updatedPlayerPool = s.playerPool.filter(p => p.id !== playerId);

            const updatedTeams = s.teams.map(team => ({
                ...team,
                playerIds: team.playerIds.filter(pid => pid !== playerId)
            }));
            
            return { ...s, playerPool: updatedPlayerPool, teams: updatedTeams };
        });
    };

    const closeColorPicker = () => {
        setIsColorPickerOpen(false);
        setSelectedTeam(null);
    };

    const handleColorChange = (color: string) => {
        if (selectedTeam) {
            setActiveSession(s => {
                if (!s) return null;
                const updatedTeams = s.teams.map(t => t.id === selectedTeam.id ? { ...t, color } : t);
                return { ...s, teams: updatedTeams };
            });
        }
        closeColorPicker();
    };

    const openColorPicker = (team: Team) => {
        setSelectedTeam(team);
        setIsColorPickerOpen(true);
    };

    const handleConfirmAutoBalance = () => {
        setActiveSession(s => {
            if (!s) return null;

            const calibratedPlayers = s.playerPool
                .sort((a, b) => b.rating - a.rating);

            const numTeams = s.teams.length;
            const newTeams = s.teams.map(t => ({ ...t, playerIds: [] as string[] }));

            let teamIndex = 0;
            let direction = 1;

            calibratedPlayers.forEach(player => {
                newTeams[teamIndex].playerIds.push(player.id);
                teamIndex += direction;

                if (teamIndex >= numTeams) {
                    teamIndex = numTeams - 1;
                    direction = -1;
                } else if (teamIndex < 0) {
                    teamIndex = 0;
                    direction = 1;
                }
            });
            return { ...s, teams: newTeams };
        });
        setIsAutoBalanceModalOpen(false);
    };

    const handleStartSession = () => {
        if (!activeSession || !activeSession.teams || activeSession.teams.length < 2) return;

        const getPlayerNickname = (id: string) => (activeSession.playerPool || []).find(p => p.id === id)?.nickname || '';

        const updatedTeams = activeSession.teams.map((team, index) => ({
            ...team,
            name: `${t.team} ${index + 1}`
        }));

        let rotationQueue: string[] | undefined;
        let teamsForFirstGame = [...updatedTeams];

        if (activeSession.numTeams === 4) {
            rotationQueue = initializeQueue4(updatedTeams);
            const t1 = updatedTeams.find(t => t.id === rotationQueue![0])!;
            const t2 = updatedTeams.find(t => t.id === rotationQueue![1])!;
            teamsForFirstGame = [t1, t2];
        } else if (activeSession.numTeams === 3) {
            teamsForFirstGame.sort(() => Math.random() - 0.5);
        }

        const team1 = teamsForFirstGame[0];
        const team2 = teamsForFirstGame[1];

        const firstGame: Game = {
            id: newId(),
            gameNumber: 1,
            team1Id: team1.id,
            team2Id: team2.id,
            team1Score: 0,
            team2Score: 0,
            isDraw: false,
            durationSeconds: activeSession.matchDurationMinutes ? activeSession.matchDurationMinutes * 60 : undefined,
            elapsedSeconds: 0,
            elapsedSecondsOnPause: 0,
            goals: [],
            status: GameStatus.Pending,
        };

        const startRoundEvent: EventLogEntry = {
            timestamp: new Date().toISOString(),
            round: 1,
            type: EventType.START_ROUND,
            payload: {
                leftTeam: team1.color,
                rightTeam: team2.color,
                leftPlayers: team1.playerIds.slice(0, activeSession.playersPerTeam).map(getPlayerNickname),
                rightPlayers: team2.playerIds.slice(0, activeSession.playersPerTeam).map(getPlayerNickname),
            } as StartRoundPayload,
        };
        
        setActiveSession(s => s ? { ...s, teams: updatedTeams, games: [firstGame], eventLog: [startRoundEvent], rotationQueue } : null);
        navigate('/match');
    };
    
    const handleCancelSetup = () => {
        setIsCancelModalOpen(false);
        setActiveSession(null);
        navigate('/');
    };

    const assignedPlayerIds = new Set(activeSession?.teams.flatMap(t => t.playerIds));
    const unassignedPlayers = (activeSession?.playerPool || []).filter(p => !assignedPlayerIds.has(p.id));
    
    const canStart =
        unassignedPlayers.length === 0 &&
        (activeSession?.playerPool || []).length > 0 &&
        (activeSession?.teams || []).every(team => team.playerIds.length > 0);
        
    const isManualAssignmentStarted = activeSession?.teams.some(team => team.playerIds.length > 0);
    
    return {
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
    };
};
