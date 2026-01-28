
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context';
import { Page, Button, Modal, useTranslation, Card } from '../ui';
import { TeamAvatar } from '../components/avatars';
import { Session, Game, Goal, Team, Player } from '../types';
import { calculateAllStats } from '../services/statistics';
import { shareOrDownloadImages } from '../services/export';
import { BrandedHeader, newId } from './utils';
import { homeScreenBackground } from '../assets';
import { Edit3, Trash2, PlusCircle, XCircle, TransferIcon } from '../icons';
import { useGameManager } from '../hooks/useGameManager';
import { GoalModal, EditGoalModal, LegionnaireModal } from '../modals';

const BrandedShareableReport: React.FC<{
    session: Session;
    children: React.ReactNode;
    className?: string;
    style?: React.CSSProperties;
    [key: string]: any;
}> = ({ session, children, className, style, ...props }) => {
    const defaultPadding = 40;
    const containerStyle: React.CSSProperties = {
        padding: `${defaultPadding}px`,
        backgroundColor: '#1A1D24',
        backgroundImage: `url("${homeScreenBackground}")`,
        backgroundSize: '100% 100%',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        boxSizing: 'border-box',
        ...style
    };
    return (
        <div className={`flex flex-col items-center text-dark-text ${className}`} style={containerStyle} data-export-target="true" {...props}>
            {children}
        </div>
    );
};

export interface ShareableReportProps {
    session: Session;
    visibleSection?: 'standings' | 'players' | 'rounds';
    isExport?: boolean;
    itemLimit?: number;
    isEditMode?: boolean;
    onEditMatch?: (game: Game) => void;
}

export const ShareableReport: React.FC<ShareableReportProps> = ({ session, visibleSection, isExport = false, itemLimit, isEditMode, onEditMatch }) => {
    const t = useTranslation();
    const { teamStats, allPlayersStats } = React.useMemo(() => calculateAllStats(session), [session]);
    
    const getCardClasses = (section: 'standings' | 'players' | 'rounds') => {
        const bgClass = isExport ? 'bg-transparent' : 'bg-dark-bg';
        const paddingClass = isExport ? 'p-4 pb-12' : 'p-4';
        const overflowClass = isExport ? '' : 'overflow-hidden';
        const heightClass = isExport ? 'h-full flex flex-col' : '';
        return `rounded-2xl ${paddingClass} border border-dark-accent-start/30 ${bgClass} w-full ${overflowClass} ${heightClass}`;
    };
        
    const cardTitleClasses = "font-bold text-xl mb-4 text-dark-text shrink-0";
    const sortedPlayers = allPlayersStats.sort((a,b) => (b.goals + b.assists) - (a.goals + a.assists));
    const finishedGames = session.games.filter(g => g.status === 'finished');
    const roundsToDisplay = itemLimit ? finishedGames.slice(0, itemLimit) : finishedGames;
    const tableTextClass = "text-[10px] sm:text-xs text-center table-fixed border-collapse"; 
    
    // СТРОГОЕ ВЫРАВНИВАНИЕ ДЛЯ ЭКСПОРТА
    const cellPadding = isExport ? "py-3 px-0.5 align-middle" : "py-2 px-0.5 align-middle";
    const playerNameClass = isExport ? `${cellPadding} text-left font-semibold truncate max-w-[200px] pr-2` : `${cellPadding} text-left font-semibold truncate pr-2 max-w-[80px] sm:max-w-[100px]`;

    return (
        <div className={`space-y-6 w-full max-w-full ${isExport ? 'h-full flex flex-col' : ''}`}>
            {(!visibleSection || visibleSection === 'standings') && (
            <div className={getCardClasses('standings')} style={{ boxShadow: isExport ? 'none' : '0 8px 25px -5px rgba(0, 242, 254, 0.1), 0 5px 10px -6px rgba(0, 242, 254, 0.1)' }}>
                <h3 className={cardTitleClasses}>{t.teamStandings}</h3>
                <div className="w-full overflow-x-auto touch-pan-y overscroll-x-contain">
                    <table className={`w-full ${tableTextClass} min-w-[280px]`}>
                        <thead>
                            <tr className="text-dark-text-secondary border-b border-white/5">
                                <th className={`text-left font-normal ${cellPadding}`} style={{ width: '8%' }}>#</th>
                                <th className={`font-normal text-center ${cellPadding}`} style={{ width: '20%' }}>{t.team}</th>
                                <th className={`font-normal ${cellPadding}`} style={{ width: '10%' }}>{t.thP}</th>
                                <th className={`font-normal ${cellPadding}`} style={{ width: '10%' }}>{t.thW}</th>
                                <th className={`font-normal ${cellPadding}`} style={{ width: '10%' }}>{t.thD}</th>
                                <th className={`font-normal ${cellPadding}`} style={{ width: '10%' }}>{t.thL}</th>
                                <th className={`font-normal ${cellPadding}`} style={{ width: '12%' }}>{t.thGD}</th>
                                <th className={`font-bold ${cellPadding}`} style={{ width: '20%' }}>{t.thPts}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {teamStats.map(({ team, gamesPlayed, wins, draws, losses, goalDifference, points }, index) => (
                                <tr key={team.id} className="border-t border-white/10" style={isExport ? { height: '40px' } : {}}>
                                    <td className={`${cellPadding} text-left`}>{index + 1}</td>
                                    <td className={`${cellPadding}`}>
                                        <div className="flex justify-center items-center w-full h-full">
                                            <div style={isExport ? { transform: 'translateY(3px)' } : {}}>
                                                <TeamAvatar team={team} size="xxs" hollow={true} />
                                            </div>
                                        </div>
                                    </td>
                                    <td className={cellPadding}>{gamesPlayed}</td>
                                    <td className={cellPadding}>{wins}</td>
                                    <td className={cellPadding}>{draws}</td>
                                    <td className={cellPadding}>{losses}</td>
                                    <td className={cellPadding}>{goalDifference > 0 ? `+${goalDifference}` : goalDifference}</td>
                                    <td className={`${cellPadding} font-bold`}>{points}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
            )}
            {(!visibleSection || visibleSection === 'players') && (
             <div className={getCardClasses('players')} style={{ boxShadow: isExport ? 'none' : '0 8px 25px -5px rgba(0, 242, 254, 0.1), 0 5px 10px -6px rgba(0, 242, 254, 0.1)' }}>
                <h3 className={cardTitleClasses}>{t.playerStatistics}</h3>
                <div className="w-full overflow-x-auto touch-pan-y overscroll-x-contain">
                    <table className={`w-full ${tableTextClass} min-w-[280px]`}>
                    <thead>
                            <tr className="text-dark-text-secondary border-b border-white/5">
                                <th className={`text-left font-normal ${cellPadding}`} style={{ width: '8%' }}>#</th>
                                <th className={`text-left font-normal ${cellPadding}`} style={{ width: isExport ? '42%' : '35%' }}>{t.players}</th>
                                <th className={`font-normal ${cellPadding}`} style={{ width: '10%' }}>{t.team}</th>
                                <th className={`font-normal ${cellPadding}`} style={{ width: '10%' }}>{t.thGP}</th>
                                <th className={`font-normal ${cellPadding}`} style={{ width: '10%' }}>{t.thG}</th>
                                <th className={`font-normal ${cellPadding}`} style={{ width: '10%' }}>{t.thA}</th>
                                <th className={`font-bold ${cellPadding}`} style={{ width: '10%' }}>{t.thTotal}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {sortedPlayers.map((stats, index) => (
                                <tr key={stats.player.id} className="border-t border-white/10" style={isExport ? { height: '40px' } : {}}>
                                    <td className={`${cellPadding} text-left`}>{index + 1}</td>
                                    <td className={playerNameClass} title={stats.player.nickname}>{stats.player.nickname}</td>
                                    <td className={cellPadding}>
                                        <div className="flex justify-center items-center w-full h-full">
                                            <div style={isExport ? { transform: 'translateY(3px)' } : {}}>
                                                <TeamAvatar team={stats.team} size="xxs" hollow={true} />
                                            </div>
                                        </div>
                                    </td>
                                    <td className={cellPadding}>{stats.gamesPlayed}</td>
                                    <td className={cellPadding}>{stats.goals}</td>
                                    <td className={cellPadding}>{stats.assists}</td>
                                    <td className={`${cellPadding} font-bold`}>{stats.goals + stats.assists}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
            )}
            {(!visibleSection || visibleSection === 'rounds') && finishedGames.length > 0 && (
             <div className={getCardClasses('rounds')} style={{ fontVariantNumeric: 'tabular-nums', boxShadow: isExport ? 'none' : '0 8px 25px -5px rgba(0, 242, 254, 0.1), 0 5px 10px -6px rgba(0, 242, 254, 0.1)' }}>
                <div className="flex justify-between items-center mb-4"><h3 className="font-bold text-xl text-dark-text shrink-0 m-0">{t.gameHistory}</h3></div>
                <ul className="flex-grow">
                    {roundsToDisplay.map((game, index) => {
                        const team1 = session.teams.find(t => t.id === game.team1Id);
                        const team2 = session.teams.find(t => t.id === game.team2Id);
                        if (!team1 || !team2) return null;
                        return (
                             <li key={game.id} className={`flex items-center justify-between py-2 border-t border-white/10 first:border-t-0 ${isEditMode ? 'cursor-pointer hover:bg-white/5 pr-2' : ''}`} onClick={() => isEditMode && onEditMatch && onEditMatch(game)}>
                                <span className="text-dark-text-secondary text-[10px] sm:text-xs shrink-0">{t.round} {game.gameNumber}</span>
                                <div className="flex items-center justify-end gap-3 flex-grow">
                                    <div className="flex items-center" style={isExport ? { height: '24px', transform: 'translateY(3px)' } : { height: '24px' }}>
                                        <TeamAvatar team={team1} size="xxs" hollow={true} />
                                    </div>
                                    <span className={`font-bold tabular-nums w-14 sm:w-16 text-center text-sm leading-none flex items-center justify-center ${isEditMode ? 'text-dark-accent-start' : ''}`} style={{ height: '24px' }}>{game.team1Score} : {game.team2Score}</span>
                                    <div className="flex items-center" style={isExport ? { height: '24px', transform: 'translateY(3px)' } : { height: '24px' }}>
                                        <TeamAvatar team={team2} size="xxs" hollow={true} />
                                    </div>
                                    {isEditMode && <Edit3 className="w-4 h-4 text-dark-text-secondary opacity-50" />}
                                </div>
                            </li>
                        )
                    })}
                </ul>
            </div>
            )}
        </div>
    );
};

export const StatisticsScreen: React.FC = () => {
    const { activeSession } = useApp();
    const t = useTranslation();
    const navigate = useNavigate();
    const [isDownloadModalOpen, setIsDownloadModalOpen] = React.useState(false);
    const [isExporting, setIsExporting] = React.useState(false);
    const exportContainerRef = React.useRef<HTMLDivElement>(null);
    const [isEditMode, setIsEditMode] = useState(false);
    const [tempEditingGame, setTempEditingGame] = useState<Game | null>(null);
    const [goalModalState, setGoalModalState] = useState<{ isOpen: boolean, teamId: string | null }>({ isOpen: false, teamId: null });
    const { goalToEdit, setGoalToEdit, replaceGame, handleGoalUpdate } = useGameManager();
    const [isTransferMode, setIsTransferMode] = useState(false);
    const [legionnaireModalState, setLegionnaireModalState] = useState<{ isOpen: boolean; teamId?: string; playerOutId?: string; }>({ isOpen: false });

    React.useEffect(() => {
        if (!activeSession) navigate('/');
    }, [activeSession, navigate]);

    if (!activeSession) return null;
    
    const handleExport = async (section: 'standings' | 'players' | 'rounds') => {
        if (isExporting || !exportContainerRef.current) return;
        setIsExporting(true);
        await new Promise(res => setTimeout(res, 50));
        const targetElement = exportContainerRef.current.querySelector(`[data-export-section="${section}"]`) as HTMLElement | null;
        const exportId = `export-target-${section}-${newId()}`;
        if (targetElement) {
            targetElement.id = exportId;
            try {
                await shareOrDownloadImages(exportId, activeSession.sessionName, activeSession.date, section.charAt(0).toUpperCase() + section.slice(1));
            } finally {
                targetElement.id = '';
                setIsExporting(false);
                setIsDownloadModalOpen(false);
            }
        } else {
            console.error(`Export target for section "${section}" not found.`);
            setIsExporting(false);
        }
    };

    const displayDate = new Date(activeSession.date).toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric' });
    const startEditing = (game: Game) => { setTempEditingGame(JSON.parse(JSON.stringify(game))); setIsTransferMode(false); };
    const closeEditor = () => { setTempEditingGame(null); setIsTransferMode(false); };
    const saveEditorChanges = () => { if (tempEditingGame) { replaceGame(tempEditingGame); setTempEditingGame(null); } };

    const team1 = tempEditingGame ? activeSession.teams.find(t => t.id === tempEditingGame.team1Id) : null;
    const team2 = tempEditingGame ? activeSession.teams.find(t => t.id === tempEditingGame.team2Id) : null;
    const restingTeams = tempEditingGame ? activeSession.teams.filter(t => t.id !== tempEditingGame.team1Id && t.id !== tempEditingGame.team2Id) : [];

    const handleOpenGoalModal = (teamId: string) => { setGoalModalState({ isOpen: true, teamId }); };
    const handleAddGoalToTemp = (goalData: any, payload: any) => {
        if (!tempEditingGame) return;
        const game = { ...tempEditingGame };
        const newGoal: Goal = { ...goalData, id: newId(), gameId: game.id, timestampSeconds: game.elapsedSeconds };
        game.goals = [...game.goals, newGoal];
        if (newGoal.teamId === game.team1Id) { game.team1Score++; } else { game.team2Score++; }
        if (game.team1Score > game.team2Score) { game.winnerTeamId = game.team1Id; game.isDraw = false; } else if (game.team2Score > game.team1Score) { game.winnerTeamId = game.team2Id; game.isDraw = false; } else { game.winnerTeamId = undefined; game.isDraw = true; }
        setTempEditingGame(game);
    };
    const handleDeleteGoalFromTemp = (goalId: string) => {
        if (!tempEditingGame) return;
        const game = { ...tempEditingGame };
        const goalToDelete = game.goals.find(g => g.id === goalId);
        if (goalToDelete) {
            if (goalToDelete.teamId === game.team1Id) { game.team1Score = Math.max(0, game.team1Score - 1); } else { game.team2Score = Math.max(0, game.team2Score - 1); }
            game.goals = game.goals.filter(g => g.id !== goalId);
            if (game.team1Score > game.team2Score) { game.winnerTeamId = game.team1Id; game.isDraw = false; } else if (game.team2Score > game.team1Score) { game.winnerTeamId = game.team2Id; game.isDraw = false; } else { game.winnerTeamId = undefined; game.isDraw = true; }
            setTempEditingGame(game);
        }
    };
    const handlePlayerClickInEditor = (teamId: string, playerOutId: string) => { if (!isTransferMode) return; setLegionnaireModalState({ isOpen: true, teamId, playerOutId }); };
    const handleLegionnaireSwapInTemp = (playerInId: string) => {
        if (!tempEditingGame || !legionnaireModalState.teamId || !legionnaireModalState.playerOutId) return;
        const game = { ...tempEditingGame };
        const { teamId } = legionnaireModalState;
        const fromTeam = activeSession.teams.find(t => t.playerIds.includes(playerInId));
        if (!fromTeam) return;
        const newMove = { playerId: playerInId, fromTeamId: fromTeam.id, toTeamId: teamId };
        game.legionnaireMoves = [...(game.legionnaireMoves || []), newMove];
        setTempEditingGame(game);
        setLegionnaireModalState({ isOpen: false });
        setIsTransferMode(false);
    };

    return (
        <Page className="!pb-24">
             <Modal isOpen={isDownloadModalOpen} onClose={() => setIsDownloadModalOpen(false)} size="xs" hideCloseButton containerClassName="border border-dark-accent-start/40 shadow-[0_0_20px_rgba(0,242,254,0.3)]">
                <div className="flex flex-col gap-3">
                    <Button variant="secondary" onClick={() => handleExport('standings')} disabled={isExporting} className="w-full font-chakra font-bold text-xl tracking-wider !py-3 shadow-lg shadow-dark-accent-start/20 hover:shadow-dark-accent-start/40">{isExporting ? 'Exporting...' : t.exportStandings}</Button>
                    <Button variant="secondary" onClick={() => handleExport('players')} disabled={isExporting} className="w-full font-chakra font-bold text-xl tracking-wider !py-3 shadow-lg shadow-dark-accent-start/20 hover:shadow-dark-accent-start/40">{isExporting ? 'Exporting...' : t.exportPlayers}</Button>
                    <Button variant="secondary" onClick={() => handleExport('rounds')} disabled={isExporting} className="w-full font-chakra font-bold text-xl tracking-wider !py-3 shadow-lg shadow-dark-accent-start/20 hover:shadow-dark-accent-start/40">{isExporting ? 'Exporting...' : t.exportRounds}</Button>
                    <Button variant="secondary" onClick={() => setIsDownloadModalOpen(false)} disabled={isExporting} className="w-full font-chakra font-bold text-xl tracking-wider !py-3 mt-2 shadow-lg shadow-dark-accent-start/20 hover:shadow-dark-accent-start/40">{t.cancel}</Button>
                </div>
            </Modal>
            <Modal
                isOpen={!!tempEditingGame}
                onClose={closeEditor}
                size="md"
                hideCloseButton
                containerClassName="!bg-[#0a0c10] border border-white/10 shadow-2xl !p-0 w-[95%] max-w-[280px] rounded-2xl overflow-hidden"
            >
                {tempEditingGame && team1 && team2 && (
                    <div className="flex flex-col max-h-[85vh]">
                        <div className="flex justify-between items-center p-2.5 border-b border-white/10 bg-[#12161b] relative">
                            <button onClick={() => setIsTransferMode(!isTransferMode)} className={`w-7 h-7 rounded-full border flex items-center justify-center transition-all ${isTransferMode ? 'bg-yellow-500 text-black border-yellow-500 shadow-[0_0_10px_#ea7708]' : 'bg-dark-bg text-yellow-500 border-yellow-500/30'}`}><TransferIcon className="w-3.5 h-3.5" /></button>
                            <div className="flex-grow"></div>
                            <button onClick={closeEditor} className="text-white/50 hover:text-white"><XCircle className="w-5 h-5" /></button>
                        </div>
                        <div className="p-3 flex flex-col gap-4 bg-gradient-to-b from-[#12161b] to-[#0a0c10]">
                            <div className="flex justify-between items-start gap-4 px-1">
                                <div className="flex flex-col items-center gap-1.5 w-[85px]">
                                    <TeamAvatar team={team1} size="sm" hollow />
                                    <div className="flex items-center gap-1.5">
                                        <span className="font-russo text-2xl text-white leading-none">{tempEditingGame.team1Score}</span>
                                        <button onClick={() => handleOpenGoalModal(team1.id)} className="w-5 h-5 rounded-full bg-[#00F2FE]/20 text-[#00F2FE] flex items-center justify-center hover:bg-[#00F2FE] hover:text-black transition-all"><PlusCircle className="w-4 h-4" /></button>
                                    </div>
                                    <ul className="w-full space-y-1 mt-1">
                                        {team1.playerIds.map(pid => {
                                            const p = activeSession.playerPool.find(pl => pl.id === pid);
                                            return (
                                                <li key={pid} onClick={() => handlePlayerClickInEditor(team1.id, pid)} className={`text-[8px] font-bold p-1 rounded-full text-center truncate border transition-all ${isTransferMode ? 'border-yellow-500 text-yellow-500 shadow-[0_0_5px_rgba(234,179,8,0.4)] cursor-pointer bg-yellow-500/5' : 'border-white/10 text-white/40 bg-black/20'}`}>{p?.nickname}</li>
                                            );
                                        })}
                                    </ul>
                                </div>
                                <div className="pt-6 opacity-20 font-russo text-xs text-white">VS</div>
                                <div className="flex flex-col items-center gap-1.5 w-[85px]">
                                    <TeamAvatar team={team2} size="sm" hollow />
                                    <div className="flex items-center gap-1.5">
                                        <span className="font-russo text-2xl text-white leading-none">{tempEditingGame.team2Score}</span>
                                        <button onClick={() => handleOpenGoalModal(team2.id)} className="w-5 h-5 rounded-full bg-[#00F2FE]/20 text-[#00F2FE] flex items-center justify-center hover:bg-[#00F2FE] hover:text-black transition-all"><PlusCircle className="w-4 h-4" /></button>
                                    </div>
                                    <ul className="w-full space-y-1 mt-1">
                                        {team2.playerIds.map(pid => {
                                            const p = activeSession.playerPool.find(pl => pl.id === pid);
                                            return (
                                                <li key={pid} onClick={() => handlePlayerClickInEditor(team2.id, pid)} className={`text-[8px] font-bold p-1 rounded-full text-center truncate border transition-all ${isTransferMode ? 'border-yellow-500 text-yellow-500 shadow-[0_0_5px_rgba(234,179,8,0.4)] cursor-pointer bg-yellow-500/5' : 'border-white/10 text-white/40 bg-black/20'}`}>{p?.nickname}</li>
                                            );
                                        })}
                                    </ul>
                                </div>
                            </div>
                        </div>
                        <div className="flex-grow overflow-y-auto p-3 bg-[#0a0c10] border-t border-white/5 min-h-[120px]">
                            <h4 className="text-[8px] font-black text-white/30 uppercase tracking-[0.2em] mb-2">Event Timeline</h4>
                            <div className="space-y-1">
                                {tempEditingGame.goals.length === 0 ? (<p className="text-center text-[9px] text-white/20 py-2">No events recorded</p>) : (
                                    tempEditingGame.goals.map(goal => {
                                        const scorer = activeSession.playerPool.find(p => p.id === goal.scorerId);
                                        const assist = activeSession.playerPool.find(p => p.id === goal.assistantId);
                                        const team = activeSession.teams.find(t => t.id === goal.teamId);
                                        return (
                                            <div key={goal.id} className="flex items-center justify-between p-1.5 bg-white/5 rounded-lg border border-white/5">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-0.5 h-4 rounded-full" style={{ backgroundColor: team?.color }}></div>
                                                    <div>
                                                        <p className="font-bold text-[10px] text-white truncate max-w-[120px]">{scorer?.nickname || (goal.isOwnGoal ? t.ownGoal : 'Unknown')}</p>
                                                        {assist && <p className="text-[8px] text-white/50">Assist: {assist.nickname}</p>}
                                                    </div>
                                                </div>
                                                <button onClick={() => handleDeleteGoalFromTemp(goal.id)} className="p-1 hover:bg-red-500/20 rounded text-white/60 hover:text-red-500"><Trash2 className="w-3 h-3" /></button>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>
                        <div className="p-3 border-t border-white/10 bg-[#12161b]">
                            <Button variant="secondary" onClick={saveEditorChanges} className="w-full !py-2 !text-[10px] font-chakra font-bold tracking-widest shadow-[0_0_15px_rgba(0,242,254,0.2)] border border-[#00F2FE]/30 uppercase">Confirm Changes</Button>
                        </div>
                    </div>
                )}
            </Modal>
            {legionnaireModalState.isOpen && restingTeams.length > 0 && (
                <LegionnaireModal isOpen={legionnaireModalState.isOpen} onClose={() => setLegionnaireModalState({ isOpen: false })} onSelect={handleLegionnaireSwapInTemp} restingTeams={restingTeams} session={activeSession} playerOut={activeSession.playerPool.find(p => p.id === legionnaireModalState.playerOutId)!} />
            )}
            <GoalModal isOpen={goalModalState.isOpen} onClose={() => setGoalModalState({ isOpen: false, teamId: null })} onSave={handleAddGoalToTemp} game={tempEditingGame || activeSession.games[0]} session={activeSession} scoringTeamId={goalModalState.teamId} />
            <EditGoalModal isOpen={!!goalToEdit} onClose={() => setGoalToEdit(null)} onSave={handleGoalUpdate} goal={goalToEdit} game={activeSession.games.find(g => g.id === goalToEdit?.gameId) || activeSession.games[0]} session={activeSession} />
            <header className="text-center shrink-0 pt-4 mb-6"><h1 className="text-3xl font-black uppercase text-dark-text accent-text-glow">{t.liveStatistics}</h1></header>
            <ShareableReport session={activeSession} isEditMode={isEditMode} onEditMatch={(game) => startEditing(game)} />
            <div className="mt-auto pt-6 w-full flex flex-col gap-3 pb-4">
                <Button variant="secondary" onClick={() => setIsEditMode(!isEditMode)} className={`w-full font-chakra font-bold text-xl tracking-wider !py-3 shadow-lg transition-all duration-300 ${isEditMode ? 'shadow-[#00F2FE]/40 border-[#00F2FE] text-[#00F2FE] bg-[#00F2FE]/10' : 'shadow-dark-accent-start/20 hover:shadow-dark-accent-start/40'}`}>GAME CORRECTION MODE</Button>
                <Button variant="secondary" onClick={() => setIsDownloadModalOpen(true)} className="w-full font-chakra font-bold text-xl tracking-wider !py-3 shadow-lg shadow-dark-accent-start/20 hover:shadow-dark-accent-start/40">{t.saveTable}</Button>
            </div>
            <div style={{ position: 'fixed', left: '-9999px', top: 0, zIndex: -1, opacity: 0, pointerEvents: 'none', display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'center' }} ref={exportContainerRef}>
                <BrandedShareableReport session={activeSession} data-export-section="standings" style={{ width: '600px' }}>
                    <div className="mb-2 w-full"><BrandedHeader isExport={true} /></div>
                    <p className="font-chakra text-dark-text mb-4 text-xl font-medium tracking-wider uppercase">{displayDate}</p>
                    <div className="w-full"><ShareableReport session={activeSession} visibleSection="standings" isExport={true} /></div>
                </BrandedShareableReport>
                <BrandedShareableReport session={activeSession} data-export-section="players" style={{ width: '650px', padding: '20px' }}>
                    <div className="mb-2 w-full"><BrandedHeader isExport={true} /></div>
                    <ShareableReport session={activeSession} visibleSection="players" isExport={true} />
                </BrandedShareableReport>
                <BrandedShareableReport session={activeSession} data-export-section="rounds" style={{ width: '500px', padding: '20px' }}>
                    <div className="mb-2 w-full"><BrandedHeader isExport={true} /></div>
                    <ShareableReport session={activeSession} visibleSection="rounds" isExport={true} />
                </BrandedShareableReport>
            </div>
        </Page>
    );
};
