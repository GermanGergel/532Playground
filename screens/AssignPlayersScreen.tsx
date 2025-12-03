
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context';
// FIX: Import directly from component files instead of barrel file to avoid import errors.
import { Button, Card, useTranslation, Modal } from '../ui';
import { TeamAvatar, PlayerAvatar } from '../components/avatars';
import { Wand, XCircle } from '../icons';
import { Team, Player, Game, GameStatus, EventLogEntry, EventType, StartRoundPayload, PlayerStatus, PlayerTier } from '../types';
import { TeamColorPickerModal } from '../modals';
import { newId, hexToRgba } from './utils';
import { getTierForRating } from '../services/rating';
import { saveSinglePlayerToDB } from '../db';

const COLORS = [
  '#FF5733', '#33FF57', '#3357FF', '#FF33A1', '#A133FF', '#33FFA1',
  '#FFC300', '#DAF7A6', '#C70039', '#900C3F', '#581845'
];

export const AssignPlayersScreen: React.FC = () => {
    const { activeSession, setActiveSession, allPlayers, setAllPlayers } = useApp();
    const navigate = useNavigate();
    const t = useTranslation();

    const [playerSearch, setPlayerSearch] = React.useState('');
    const [isColorPickerOpen, setIsColorPickerOpen] = React.useState(false);
    const [selectedTeam, setSelectedTeam] = React.useState<Team | null>(null);
    const [isCancelModalOpen, setIsCancelModalOpen] = React.useState(false);
    const [isAutoBalanceModalOpen, setIsAutoBalanceModalOpen] = React.useState(false);
    
    const [isActionBarVisible, setIsActionBarVisible] = React.useState(true);
    const lastScrollY = React.useRef(0);
    const scrollContainerRef = React.useRef<HTMLDivElement>(null);

    const handleScroll = () => {
        if (scrollContainerRef.current) {
            const currentScrollY = scrollContainerRef.current.scrollTop;
            if (currentScrollY > lastScrollY.current && currentScrollY > 10) {
                if (isActionBarVisible) setIsActionBarVisible(false);
            } else if (currentScrollY < lastScrollY.current) {
                if (!isActionBarVisible) setIsActionBarVisible(true);
            }
            lastScrollY.current = currentScrollY;
        }
    };


    React.useEffect(() => {
        if (activeSession) {
            if (activeSession.teams.length === 0 && activeSession.numTeams > 0) {
                const defaultColors = ['#0074D9', '#FFDC00', '#FF851B'].slice(0, activeSession.numTeams);
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


    if (!activeSession) return null;
    
    const sessionPlayerIds = new Set(activeSession.playerPool.map(p => p.id));
    const searchResults = playerSearch
        ? allPlayers.filter(p => 
            !sessionPlayerIds.has(p.id) &&
            p.nickname.toLowerCase().includes(playerSearch.toLowerCase())
          )
        : [];

    const handleAddPlayer = (player: Player | { nickname: string }) => {
        let playerToAdd: Player;

        if ('id' in player) {
            playerToAdd = player;
        } else {
            const existingPlayer = allPlayers.find(p => p.nickname.toLowerCase() === player.nickname.toLowerCase());
            if (existingPlayer) {
                playerToAdd = existingPlayer;
            } else {
                playerToAdd = {
                    id: newId(),
                    nickname: player.nickname,
                    surname: '',
                    createdAt: new Date().toISOString(),
                    countryCode: 'UA',
                    status: PlayerStatus.Unconfirmed,
                    totalGoals: 0, totalAssists: 0, totalGames: 0, totalWins: 0, totalDraws: 0, totalLosses: 0,
                    totalSessionsPlayed: 0,
                    rating: 60, tier: getTierForRating(60),
                    monthlyGoals: 0, monthlyAssists: 0, monthlyGames: 0, monthlyWins: 0,
                    monthlySessionsPlayed: 0,
                    form: 'stable', badges: {}, skills: [], lastPlayedAt: new Date().toISOString(),
                };
                setAllPlayers(prev => [...prev, playerToAdd]);
                saveSinglePlayerToDB(playerToAdd); // Save new player to DB immediately
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

    const handleColorChange = (color: string) => {
        if (selectedTeam) {
            setActiveSession(s => {
                if (!s) return null;
                const updatedTeams = s.teams.map(t => t.id === selectedTeam.id ? { ...t, color } : t);
                return { ...s, teams: updatedTeams };
            });
        }
        setIsColorPickerOpen(false);
        setSelectedTeam(null);
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
        if (!activeSession.teams || activeSession.teams.length < 2) return;

        const getPlayerNickname = (id: string) => (activeSession.playerPool || []).find(p => p.id === id)?.nickname || '';

        const updatedTeams = activeSession.teams.map((team, index) => ({
            ...team,
            name: `${t.team} ${index + 1}`
        }));

        let teamsForFirstGame = [...updatedTeams];
        if (activeSession.numTeams === 3) {
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
        
        setActiveSession(s => s ? { ...s, teams: updatedTeams, games: [firstGame], eventLog: [startRoundEvent] } : null);
        navigate('/match');
    };
    
    const handleCancelSetup = () => {
        setIsCancelModalOpen(false);
        setActiveSession(null);
        navigate('/');
    };

    const assignedPlayerIds = new Set(activeSession.teams.flatMap(t => t.playerIds));
    const unassignedPlayers = (activeSession.playerPool || []).filter(p => !assignedPlayerIds.has(p.id));
    
    const canStart = unassignedPlayers.length === 0 && (activeSession.playerPool || []).length > 0;
    const isManualAssignmentStarted = activeSession.teams.some(team => team.playerIds.length > 0);

    const inputClasses = "w-full p-3 bg-dark-bg rounded-lg border border-white/20 focus:ring-2 focus:ring-dark-accent-start focus:outline-none";

    const gridColsClass = activeSession.numTeams === 2 ? 'grid-cols-2' : 'grid-cols-3';
    const cardNeonClasses = "shadow-lg shadow-dark-accent-start/20 border border-dark-accent-start/40";

    return (
        <div className="flex flex-col h-screen bg-dark-bg">
            {selectedTeam && (
                <TeamColorPickerModal
                    isOpen={isColorPickerOpen}
                    onClose={() => setIsColorPickerOpen(false)}
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
                    <Button variant="secondary" onClick={handleCancelSetup} className="w-full !py-3 uppercase">{t.confirm}</Button>
                    <Button variant="secondary" onClick={() => setIsCancelModalOpen(false)} className="w-full !py-3 uppercase">{t.cancel}</Button>
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
                        <Button variant="secondary" onClick={handleConfirmAutoBalance} className="w-full !py-3 uppercase">{t.confirm}</Button>
                        <Button variant="secondary" onClick={() => setIsAutoBalanceModalOpen(false)} className="w-full !py-3 uppercase">{t.cancel}</Button>
                    </div>
                </div>
            </Modal>
            
            <div className="p-4 pt-6 shrink-0 z-10 bg-dark-bg">
                <h1 className="text-3xl font-bold mb-8 text-center accent-text-glow uppercase">{t.assignPlayersTitle}</h1>
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
                        <Button variant="secondary" onClick={() => playerSearch.trim() && handleAddPlayer({ nickname: playerSearch.trim() })} className="!py-3 !px-5 shadow-lg shadow-dark-accent-start/20 hover:shadow-dark-accent-start/40">{t.addPlayer}</Button>
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

            <div
                ref={scrollContainerRef}
                onScroll={handleScroll}
                className="flex-grow overflow-y-auto px-4 min-h-0 relative"
            >
                <div className="flex flex-col min-h-full pb-80">
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
                        <div className="my-6 max-w-md mx-auto w-full flex-grow flex flex-col">
                             <Card title={t.playerPool} className={`!p-2 ${cardNeonClasses} flex-grow flex flex-col`}>
                                <div className="space-y-2 overflow-y-auto">
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
                            <div className="text-center text-dark-text-secondary text-sm mt-6">
                                {t.allPlayersAssigned}
                            </div>
                        )}
                </div>
            </div>

            <div
                className={`fixed bottom-[7.5rem] inset-x-0 z-20 px-4 transition-transform duration-300 pointer-events-none ${isActionBarVisible ? 'translate-y-0' : 'translate-y-full'}`}
            >
                <div className="max-w-md mx-auto flex flex-col gap-3 pointer-events-auto">
                    <Button variant="secondary" onClick={() => setIsAutoBalanceModalOpen(true)} disabled={isManualAssignmentStarted} className="!bg-dark-surface !backdrop-blur-none w-full !text-md shadow-lg !py-2.5 shadow-dark-accent-start/20 hover:shadow-dark-accent-start/40 flex items-center justify-center gap-2">
                        <Wand className="w-5 h-5" /> {t.autoBalanceTeams}
                    </Button>
                    <Button variant="secondary" onClick={handleStartSession} disabled={!canStart} className="!bg-dark-surface !backdrop-blur-none w-full !text-xl !py-4 shadow-lg shadow-dark-accent-start/20 hover:shadow-dark-accent-start/40">
                        {t.startSession}
                    </Button>
                    <Button variant="secondary" onClick={() => setIsCancelModalOpen(true)} className="!bg-dark-surface !backdrop-blur-none w-full !py-2.5 shadow-lg shadow-dark-accent-start/20 hover:shadow-dark-accent-start/40">
                        {t.cancelSetup}
                    </Button>
                </div>
            </div>
        </div>
    );
};