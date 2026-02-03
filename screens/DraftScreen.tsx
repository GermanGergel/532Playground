import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApp } from '../context';
import { DraftState, Game, GameStatus, EventLogEntry, EventType, StartRoundPayload, Player, SessionStatus } from '../types';
import { getDraftSession, updateDraftState, subscribeToDraft, saveRemoteActiveSession } from '../db';
import { PlayerAvatar } from '../components/avatars';
import { Users, CheckCircle, Wand, Share2, Play, Key, RefreshCw, XCircle, Link, Settings } from '../icons'; 
import { newId, BrandedHeader } from './utils';
import { Modal, Button } from '../ui';
import html2canvas from 'html2canvas';

// --- SHARED BRAND STYLE (Teal/Dark Blue Gradient) ---
const brandTextStyle: React.CSSProperties = {
    background: 'linear-gradient(180deg, #48CFCB 0%, #083344 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    filter: 'drop-shadow(1px 1px 0px #0E7490) drop-shadow(2px 2px 0px #000000)',
};

// --- SPLASH SCREEN FOR PLAYERS ---
const FinalSplashScreen: React.FC<{ isCreator?: boolean; onAdminReentry?: () => void }> = ({ isCreator, onAdminReentry }) => (
    <div className="fixed inset-0 z-[200] bg-[#0a0c10] flex flex-col items-center justify-center animate-in fade-in duration-1000">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-[#00F2FE]/10 via-[#0a0c10] to-black pointer-events-none"></div>
        <div className="relative z-10 flex flex-col items-center">
            <h1 className="font-blackops text-6xl md:text-8xl text-[#00F2FE] tracking-tighter drop-shadow-[0_0_20px_rgba(0,242,254,0.6)]">
                UNIT
            </h1>
            <div className="h-px w-32 bg-white/20 my-6"></div>
            <h2 className="font-russo text-2xl md:text-4xl text-white uppercase tracking-widest text-center leading-relaxed">
                DEPLOYMENT<br/>CONFIRMED
            </h2>
            <p className="mt-8 font-mono text-xs text-white/30 uppercase tracking-[0.3em]">
                PREPARE FOR BATTLE
            </p>
        </div>
        
        {isCreator && onAdminReentry && (
            <button 
                onClick={onAdminReentry}
                className="fixed bottom-12 left-1/2 -translate-x-1/2 z-[210] px-6 py-2 rounded-full border border-white/10 bg-white/5 text-[9px] font-black text-white/30 uppercase tracking-[0.3em] hover:text-[#00F2FE] hover:border-[#00F2FE]/30 transition-all active:scale-95"
            >
                Re-enter Command Center
            </button>
        )}
    </div>
);

// --- DEAD END SCREEN (INVALID LINK) ---
const InvalidLinkScreen: React.FC = () => (
    <div className="fixed inset-0 z-[9999] bg-[#05070a] flex flex-col items-center justify-center p-6 text-center select-none">
        <div className="w-24 h-24 rounded-full bg-red-900/10 border border-red-500/20 flex items-center justify-center mb-6 animate-pulse">
            <Link className="w-10 h-10 text-red-500 opacity-50" />
        </div>
        <h1 className="font-blackops text-3xl md:text-5xl text-red-500/80 tracking-widest uppercase mb-2">
            ACCESS DENIED
        </h1>
        <div className="h-px w-16 bg-red-500/30 my-4"></div>
        <p className="font-mono text-xs text-white/40 uppercase tracking-[0.2em] leading-loose max-w-md">
            The draft session you are looking for<br/>
            does not exist or has expired.
        </p>
    </div>
);

// --- REAL PLAYER CARD STYLE FOR CAPTAINS ---
const CaptainDraftCard: React.FC<{ 
    player: Player; 
    teamColor: string; 
    isCaptain?: boolean;
    isMyTeam?: boolean;
    isActive?: boolean;
    isReady?: boolean; // Prop to indicate if captain is logged in (colorful) or not (gray)
    onClick?: () => void;
}> = ({ player, teamColor, isCaptain, isMyTeam, isActive, isReady = false, onClick }) => {
    
    // UPDATED: Font sizes reduced slightly to look less bulky
    const getNicknameSize = (name: string) => {
        const n = name || '';
        if (n.length > 14) return 'text-base'; 
        if (n.length > 9) return 'text-xl'; 
        return 'text-2xl'; 
    };

    const getSurnameSize = (name: string) => {
        const n = name || '';
        if (n.length > 15) return 'text-[8px]';
        return 'text-[9px]';
    };

    const nicknameSize = getNicknameSize(player.nickname);
    const surnameSize = getSurnameSize(player.surname);

    // Dynamic styles based on readiness
    // If NOT ready: Grayscale, reduced opacity
    // If Ready: Full color, glow
    const filterStyle = isReady ? 'none' : 'grayscale(100%) brightness(0.6)';
    const containerShadow = isReady 
        ? (isActive ? `0 0 30px ${teamColor}` : `0 15px 25px -10px ${teamColor}80`)
        : '0 0 0 transparent'; // No glow if not ready

    return (
        <div 
            onClick={onClick}
            className={`
                relative w-full aspect-[0.75] rounded-3xl overflow-hidden cursor-pointer transition-all duration-500
                ${isActive ? 'scale-[1.02] z-10' : 'hover:scale-[1.01]'}
            `}
            style={{ 
                boxShadow: containerShadow, 
                backgroundColor: '#1A1D24',
                border: isActive ? 'none' : 'none',
                filter: filterStyle,
                opacity: isReady ? (isActive ? 1 : 0.9) : 0.7
            }}
        >
            {player.playerCard ? (
                <div 
                    className="absolute inset-0 bg-cover bg-center transition-transform duration-700 hover:scale-110"
                    style={{ backgroundImage: `url(${player.playerCard})` }}
                />
            ) : (
                <div className="absolute inset-0 bg-gray-800 flex items-center justify-center">
                    <Users className="w-16 h-16 text-white/20" />
                </div>
            )}

            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent"></div>

            {!isReady && (
                <div className="absolute inset-0 flex items-center justify-center z-20">
                    <div className="bg-black/50 p-2 rounded-full border border-white/20 backdrop-blur-sm animate-pulse">
                        <Key className="w-6 h-6 text-white/50" />
                    </div>
                </div>
            )}

            <div className="absolute inset-0 p-5 flex flex-col justify-between z-10 pointer-events-none">
                <div className="flex justify-between items-start">
                    <div className="flex flex-col pt-2">
                        <span className="font-russo text-2xl leading-none tracking-tighter" style={brandTextStyle}>
                            UNIT
                        </span>
                        {isCaptain && (
                            <div className="mt-1 bg-yellow-500/90 text-black text-[9px] font-black px-1.5 py-0.5 rounded shadow-lg w-fit backdrop-blur-md">
                                CAP
                            </div>
                        )}
                    </div>

                    <div className="flex flex-col items-end">
                        <span className="font-russo text-3xl leading-none text-[#00F2FE] drop-shadow-[0_0_10px_rgba(0,0,0,0.8)]">
                            {player.rating}
                        </span>
                        <span className="text-[7px] font-black text-white tracking-[0.2em] mt-1">OVR</span>
                    </div>
                </div>

                <div className="flex flex-col items-center pb-2 w-full px-1">
                    <span className={`font-russo ${nicknameSize} uppercase leading-none tracking-tight text-center w-full whitespace-nowrap overflow-visible`} style={brandTextStyle}>
                        {player.nickname}
                    </span>
                    <span className={`font-mono ${surnameSize} text-white/60 mt-1 uppercase tracking-wider w-full text-center whitespace-nowrap overflow-visible`}>
                        {player.surname}
                    </span>
                </div>
            </div>
            
            {isActive && isReady && (
                <div className="absolute inset-0 bg-[#00F2FE]/10 animate-pulse pointer-events-none mix-blend-overlay rounded-3xl"></div>
            )}
        </div>
    );
};

const MiniDraftCard: React.FC<{
    player: Player;
    onClick: () => void;
    disabled: boolean;
    isActive: boolean;
    pickingColor?: string; 
    isManualMode?: boolean;
}> = ({ player, onClick, disabled, isActive, pickingColor, isManualMode }) => {
    
    let borderStyle = {};
    
    if (isManualMode && !disabled) {
        borderStyle = { borderColor: '#FFD700', boxShadow: '0 0 10px rgba(255, 215, 0, 0.4)' };
    } else if (!disabled && pickingColor) {
        borderStyle = { borderColor: pickingColor, boxShadow: `0 0 8px ${pickingColor}40` };
    } else {
        borderStyle = { borderColor: 'transparent' };
    }

    return (
        <button
            onClick={onClick}
            disabled={disabled}
            className={`
                relative w-full aspect-[0.75] rounded-xl overflow-hidden transition-all duration-300 border
                ${disabled 
                    ? 'opacity-40 grayscale cursor-not-allowed scale-95 border-transparent' 
                    : 'cursor-pointer hover:scale-105'
                }
            `}
            style={{ 
                backgroundColor: '#1A1D24',
                ...borderStyle 
            }}
        >
             {player.playerCard ? (
                <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${player.playerCard})` }} />
            ) : (
                <div className="absolute inset-0 bg-[#232730] flex items-center justify-center"><Users className="w-8 h-8 text-white/10" /></div>
            )}

            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/10 to-transparent"></div>

            {isManualMode && !disabled && (
                <div className="absolute top-1 right-1 z-20">
                    <div className="w-4 h-4 bg-[#FFD700] rounded-full flex items-center justify-center shadow-lg"><Wand className="w-2.5 h-2.5 text-black" /></div>
                </div>
            )}

            <div className="absolute inset-0 p-2 flex flex-col justify-between z-10 pointer-events-none">
                <div className="flex justify-between items-start">
                    <span className="font-russo text-[10px] leading-none tracking-tighter text-white/50">UNIT</span>
                    <span className="font-russo text-xl leading-none text-[#00F2FE] drop-shadow-md">{player.rating}</span>
                </div>
                <div className="text-center w-full mb-1">
                    <span className="font-russo text-xs text-white uppercase leading-none tracking-tight block truncate drop-shadow-md w-full">
                        {player.nickname}
                    </span>
                </div>
            </div>
        </button>
    );
};

const RecapPlayerCard: React.FC<{ 
    player: Player; 
    teamColor: string; 
    isCaptain: boolean; 
}> = ({ player, teamColor, isCaptain }) => {
    return (
        <div 
            className="relative w-full aspect-[0.75] rounded-xl overflow-hidden shadow-lg border border-white/5"
            style={{ 
                backgroundColor: '#1A1D24',
                boxShadow: `0 10px 20px -8px ${teamColor}99, 0 0 0 1px ${teamColor}20` 
            }}
        >
             {player.playerCard ? (
                <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${player.playerCard})` }} />
            ) : (
                <div className="absolute inset-0 bg-[#232730] flex items-center justify-center"><Users className="w-8 h-8 text-white/10" /></div>
            )}

            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/10 to-transparent"></div>

            <div className="absolute inset-0 p-2 flex flex-col justify-between z-10 pointer-events-none">
                <div className="flex justify-between items-start">
                    <div className="flex flex-col items-start">
                        <span className="font-russo text-[10px] leading-none tracking-tighter" style={brandTextStyle}>UNIT</span>
                        {isCaptain && (
                            <div 
                                className="mt-1 bg-[#FFD700] text-black text-[5px] font-black px-1 py-px rounded-[2px] shadow-sm w-fit leading-none uppercase tracking-wider"
                                style={{ boxShadow: '0 0 4px rgba(255, 215, 0, 0.5)' }}
                            >
                                CAP
                            </div>
                        )}
                    </div>
                    <span className="font-russo text-xl leading-none text-[#00F2FE] drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">{player.rating}</span>
                </div>
                <div className="text-center w-full flex flex-col items-center">
                    <span className="font-russo text-xs uppercase leading-none tracking-tight block truncate w-full text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
                        {player.nickname}
                    </span>
                    <span className="font-mono text-[8px] uppercase tracking-wider block truncate w-full mt-0.5 text-white/60">
                        {player.surname}
                    </span>
                </div>
            </div>
        </div>
    );
};

const RecapView: React.FC<{ draft: DraftState, allPlayers: Player[], isExport?: boolean }> = ({ draft, allPlayers, isExport = false }) => {
    
    const containerStyle: React.CSSProperties = isExport ? {
        backgroundColor: '#0a0c10',
        padding: '40px', 
        width: '1920px', 
        height: 'auto',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
    } : {
        padding: '1rem',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
    };

    return (
        <div style={containerStyle}>
            <div className="flex flex-col items-center mb-10 w-full text-center">
                <span 
                    className="font-blackops text-6xl tracking-widest uppercase mb-1" 
                    style={isExport ? { ...brandTextStyle, fontSize: '90px' } : brandTextStyle} 
                >
                    SQUADS
                </span>
                
                <span className="font-mono text-xl text-white/60 tracking-widest uppercase mb-2">
                    {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                </span>
                
                <div className="flex items-center gap-4 mt-1">
                    <div className="h-px w-16 bg-white/20"></div>
                    <span className="text-[10px] font-bold text-white/40 uppercase tracking-[0.4em]">
                        OFFICIAL DEPLOYMENT
                    </span>
                    <div className="h-px w-16 bg-white/20"></div>
                </div>
            </div>

            <div className="flex flex-col gap-12 w-full">
                {draft.teams.map((team, idx) => {
                    const allTeamPlayers = team.playerIds.map(pid => allPlayers.find(p => p.id === pid)).filter(Boolean) as Player[];
                    
                    return (
                        <div key={team.id} className="w-full">
                            <div className="flex flex-row justify-between items-center gap-4 w-full">
                                {allTeamPlayers.map(p => (
                                    <div key={p.id} className="flex-1 min-w-0">
                                        <RecapPlayerCard 
                                            player={p} 
                                            teamColor={team.color} 
                                            isCaptain={p.id === team.captainId}
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>
            
            {isExport && (
                <div className="mt-20 flex flex-col items-center justify-center opacity-40 gap-1">
                    <div className="w-16 h-px bg-gradient-to-r from-transparent via-white/50 to-transparent"></div>
                    <span className="text-white text-xl font-black tracking-[0.8em] uppercase font-russo">UNIT CLUB</span>
                </div>
            )}
        </div>
    );
};

const Toast: React.FC<{ message: string; isVisible: boolean }> = ({ message, isVisible }) => (
    <div className={`fixed top-24 left-1/2 -translate-x-1/2 z-[200] transition-all duration-500 pointer-events-none ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'}`}>
        <div className="bg-[#00F2FE] text-black px-6 py-3 rounded-full shadow-[0_0_20px_rgba(0,242,254,0.6)] flex items-center gap-3 border border-white/20 backdrop-blur-md">
            <CheckCircle className="w-5 h-5 text-black" />
            <span className="font-black text-xs uppercase tracking-widest">{message}</span>
        </div>
    </div>
);

// --- MAIN COMPONENT ---
export const DraftScreen: React.FC = () => {
    const { id: draftId } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { activeSession, setActiveSession, allPlayers } = useApp();
    
    const [draft, setDraft] = useState<DraftState | null>(null);
    const [isNotFound, setIsNotFound] = useState(false);
    
    const [currentUserTeamId, setCurrentUserTeamId] = useState<string | null>(null);
    const [pinInput, setPinInput] = useState('');
    const [isPinModalOpen, setIsPinModalOpen] = useState(false);
    const [teamToAuth, setTeamToAuth] = useState<string | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    
    // --- AUTH LOGIC (LOCALSTORAGE) ---
    // Only the device that created the draft is "Admin"
    const isCreator = useMemo(() => localStorage.getItem(`draft_admin_${draftId}`) === 'true', [draftId]);
    
    const [isAdminMode, setIsAdminMode] = useState(isCreator);
    const [isManualMode, setIsManualMode] = useState(false);
    const [manualAssignPlayer, setManualAssignPlayer] = useState<Player | null>(null);

    const [isSummaryModalOpen, setIsSummaryModalOpen] = useState(false);
    const [isExporting, setIsExporting] = React.useState(false);
    
    const exportRef = useRef<HTMLDivElement>(null);

    const [toastMessage, setToastMessage] = useState('');
    const [showToast, setShowToast] = useState(false);

    const notify = (msg: string) => {
        setToastMessage(msg);
        setShowToast(true);
        setTimeout(() => setShowToast(false), 2500);
    };

    useEffect(() => {
        // Ensure admin mode is strictly bound to creator status on mount
        setIsAdminMode(localStorage.getItem(`draft_admin_${draftId}`) === 'true');
    }, [draftId]);

    // --- FORCE SYNC POLLING ---
    // Poll every 3 seconds to keep clients in sync and prevent "frozen captain"
    useEffect(() => {
        if (!draftId) return;

        const syncDraft = async () => {
            // Only poll if draft is not finished (to save resources) or if we are actively drafting
            if (draft?.status === 'finished_view') return; 
            
            const remoteData = await getDraftSession(draftId);
            if (remoteData) {
                // Determine if we need to update state
                setDraft(prev => {
                    if (JSON.stringify(prev) !== JSON.stringify(remoteData)) {
                        return remoteData;
                    }
                    return prev;
                });
                setIsNotFound(false);
            } else {
                // Only mark as not found if we don't have a draft state yet (initial load failure)
                // or if it explicitly returns null (deleted).
                if (!draft) setIsNotFound(true);
            }
        };

        // Initial Load
        syncDraft();

        // Polling Interval
        const intervalId = setInterval(syncDraft, 3000); 

        // Realtime Subscription (Keep this as primary, polling as backup)
        const subscription = subscribeToDraft(draftId, (newState) => {
            setDraft(newState);
            setIsNotFound(false);
        });

        return () => {
            clearInterval(intervalId);
            // @ts-ignore
            if (subscription && typeof subscription.unsubscribe === 'function') subscription.unsubscribe();
        };
    }, [draftId, draft]); // Depend on draft to avoid flickering

    // --- SORT TEAMS BY PICK ORDER ---
    // This creates a linear visual layout where the 1st picker is always on the left.
    const sortedTeams = useMemo(() => {
        if (!draft) return [];
        // Get unique team IDs in order of their first appearance in pickOrder
        const initialOrder = Array.from(new Set(draft.pickOrder));
        
        // Sort draft.teams based on their position in initialOrder
        return [...draft.teams].sort((a, b) => {
            const indexA = initialOrder.indexOf(a.id);
            const indexB = initialOrder.indexOf(b.id);
            // Handle edge cases where team ID might not be in pickOrder (shouldn't happen)
            if (indexA === -1) return 1;
            if (indexB === -1) return -1;
            return indexA - indexB;
        });
    }, [draft?.teams, draft?.pickOrder]);

    const handleCaptainAuth = async () => {
        if (draft && teamToAuth && pinInput === draft.pin) {
            setCurrentUserTeamId(teamToAuth);
            setIsPinModalOpen(false);
            setPinInput('');
            
            // --- UPDATE SERVER STATE: MARK CAPTAIN AS READY ---
            // This triggers the visual update for Admin and other clients
            const updatedTeams = draft.teams.map(t => 
                t.id === teamToAuth ? { ...t, isCaptainReady: true } : t
            );
            
            const updatedDraft = { ...draft, teams: updatedTeams };
            
            // Optimistic update locally
            setDraft(updatedDraft);
            
            // Push to cloud
            await updateDraftState(updatedDraft);
            
        } else {
            notify("INCORRECT PIN");
        }
    };

    const handleStartDraft = async () => {
        if (!draft) return;
        const updatedDraft = { ...draft, status: 'active' as const };
        await updateDraftState(updatedDraft);
    };

    const handleManualAssign = async (targetTeamId: string) => {
        if (!draft || !manualAssignPlayer || isProcessing) return;
        setIsProcessing(true);
        const teamIndex = draft.teams.findIndex(t => t.id === targetTeamId);
        if (teamIndex === -1) { setIsProcessing(false); return; }

        const updatedTeams = [...draft.teams];
        updatedTeams[teamIndex] = { ...updatedTeams[teamIndex], playerIds: [...updatedTeams[teamIndex].playerIds, manualAssignPlayer.id] };
        const updatedAvailable = draft.availablePlayerIds.filter(id => id !== manualAssignPlayer.id);
        const updatedDraft = {
            ...draft, teams: updatedTeams, availablePlayerIds: updatedAvailable,
            status: updatedAvailable.length === 0 ? 'completed' as const : draft.status
        };
        await updateDraftState(updatedDraft);
        setIsProcessing(false);
        setManualAssignPlayer(null);
        setIsManualMode(false); 
        notify(`${manualAssignPlayer.nickname} ASSIGNED`);
    };

    const handlePickPlayer = async (playerId: string) => {
        if (!draft || isProcessing) return;
        if (isManualMode && isAdminMode) {
            const p = allPlayers.find(pl => pl.id === playerId);
            if (p) setManualAssignPlayer(p);
            return;
        }
        const currentTurnTeamId = draft.pickOrder[draft.currentTurnIndex];
        if (!isAdminMode && currentUserTeamId !== currentTurnTeamId) return;

        setIsProcessing(true);
        const teamIndex = draft.teams.findIndex(t => t.id === currentTurnTeamId);
        if (teamIndex === -1) return;

        const updatedTeams = [...draft.teams];
        updatedTeams[teamIndex] = { ...updatedTeams[teamIndex], playerIds: [...updatedTeams[teamIndex].playerIds, playerId] };
        const updatedAvailable = draft.availablePlayerIds.filter(id => id !== playerId);
        const nextIndex = draft.currentTurnIndex + 1;
        const isComplete = nextIndex >= draft.pickOrder.length;
        const nextStatus = isComplete && updatedAvailable.length === 0 ? 'completed' as const : 'active' as const;

        const updatedDraft = { ...draft, teams: updatedTeams, availablePlayerIds: updatedAvailable, currentTurnIndex: nextIndex, status: nextStatus };
        await updateDraftState(updatedDraft);
        setIsProcessing(false);
    };

    const handleOpenSummary = () => {
        setIsSummaryModalOpen(true);
    };

    const handleConfirmAndPlay = async () => {
        if (!draft || !activeSession) return;
        
        // 1. First, set draft status to 'finished_view' so captains see splash screen
        const finishingDraft = { ...draft, status: 'finished_view' as const };
        await updateDraftState(finishingDraft);

        const finalTeams = draft.teams.map(dt => ({ id: dt.id, color: dt.color, name: dt.name, playerIds: dt.playerIds, consecutiveGames: 0, bigStars: 0 }));
        let rotationQueue: string[] | undefined;
        let teamsForFirstGame = [...finalTeams];

        if (finalTeams.length === 4) {
             const ids = finalTeams.map(t => t.id);
             rotationQueue = [...ids].sort(() => Math.random() - 0.5);
             const t1 = finalTeams.find(t => t.id === rotationQueue![0])!;
             const t2 = finalTeams.find(t => t.id === rotationQueue![1])!;
             teamsForFirstGame = [t1, t2];
        } else if (finalTeams.length === 3) {
             teamsForFirstGame.sort(() => Math.random() - 0.5);
        }

        const t1 = teamsForFirstGame[0];
        const t2 = teamsForFirstGame[1];

        const firstGame: Game = {
            id: newId(), gameNumber: 1, team1Id: t1.id, team2Id: t2.id, team1Score: 0, team2Score: 0, isDraw: false,
            durationSeconds: activeSession.matchDurationMinutes ? activeSession.matchDurationMinutes * 60 : undefined,
            elapsedSeconds: 0, elapsedSecondsOnPause: 0, goals: [], status: GameStatus.Pending,
        };

        const getPlayerNickname = (id: string) => allPlayers.find(p => p.id === id)?.nickname || '';
        const startRoundEvent: EventLogEntry = {
            timestamp: new Date().toISOString(), round: 1, type: EventType.START_ROUND,
            payload: { leftTeam: t1.color, rightTeam: t2.color, leftPlayers: t1.playerIds.map(getPlayerNickname), rightPlayers: t2.playerIds.map(getPlayerNickname) } as StartRoundPayload,
        };

        const newSession = { ...activeSession, teams: finalTeams, games: [firstGame], eventLog: [startRoundEvent], rotationQueue, status: SessionStatus.Active };
        
        // 2. SET LOCAL SESSION
        setActiveSession(newSession);
        
        // 3. SAVE TO CLOUD (HANDOFF)
        await saveRemoteActiveSession(newSession);
        
        navigate('/match');
    };

    const handleShareSummary = async () => {
        if (!exportRef.current || isExporting) return;
        setIsExporting(true);
        try {
            await new Promise(resolve => setTimeout(resolve, 300));

            const canvas = await html2canvas(exportRef.current, { 
                backgroundColor: '#0a0c10', 
                scale: 2, 
                useCORS: true,
                allowTaint: true,
                logging: false,
                width: exportRef.current.scrollWidth,
                height: exportRef.current.scrollHeight,
                scrollX: 0,
                scrollY: 0,
                onclone: (doc) => {
                    const el = doc.querySelector('[data-export-target="draft-squads"]');
                    if (el instanceof HTMLElement) {
                        el.style.display = 'flex';
                        el.style.visibility = 'visible';
                        el.style.position = 'static';
                        el.style.transform = 'none';
                    }
                }
            });
            
            const blob = await new Promise<Blob|null>(resolve => canvas.toBlob(resolve, 'image/png', 1.0));
            if (!blob) throw new Error("Blob creation failed");
    
            const filename = `UNIT_Squads_${new Date().getTime()}.png`;
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            notify("IMAGE DOWNLOADED");

        } catch (error) {
            console.error("Share failed", error);
            notify("DOWNLOAD FAILED");
        } finally {
            setIsExporting(false);
        }
    };

    const copyToClipboard = (text: string, msg: string) => {
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text).then(() => notify(msg)).catch(() => notify("COPY FAILED"));
        } else {
            const textArea = document.createElement("textarea");
            textArea.value = text;
            document.body.appendChild(textArea);
            textArea.select();
            try { document.execCommand("copy"); notify(msg); } catch (err) { notify("COPY FAILED"); }
            document.body.removeChild(textArea);
        }
    };

    const shareCaptainLink = () => {
        if (!draft) return;
        const text = `UNIT DRAFT CAPTAIN\nLobby: ${draftId}\nPIN: ${draft.pin}\nLink: ${window.location.href}`;
        if (navigator.share) { navigator.share({ title: 'Unit Draft Captain', text, url: window.location.href }).catch(() => copyToClipboard(text, "LINK COPIED")); } 
        else { copyToClipboard(text, "LINK COPIED"); }
    };

    const shareSpectatorLink = () => {
        const text = `Watch Unit Draft Live: ${window.location.href}`;
        if (navigator.share) { navigator.share({ title: 'Unit Draft Live', text, url: window.location.href }).catch(() => copyToClipboard(window.location.href, "LINK COPIED")); } 
        else { copyToClipboard(window.location.href, "LINK COPIED"); }
    };

    // --- PHASE 0: NOT FOUND ---
    if (isNotFound) {
        return <InvalidLinkScreen />;
    }

    if (!draft) return (
        <div className="flex items-center justify-center min-h-screen bg-[#0a0c10] text-white">
            <div className="flex flex-col items-center gap-4">
                <div className="w-12 h-12 border-4 border-[#00F2FE] border-t-transparent rounded-full animate-spin"></div>
                <p className="font-chakra font-bold tracking-widest uppercase text-center">Connecting to Unit Server...</p>
            </div>
        </div>
    );

    // --- PHASE B: FINISHED SCREEN ---
    if (draft.status === 'finished_view' && !isAdminMode) {
        return <FinalSplashScreen isCreator={isCreator} onAdminReentry={() => setIsAdminMode(true)} />;
    }

    // --- PHASE A: COMPLETED (RECAP) VIEW ---
    if (draft.status === 'completed' && !isAdminMode) {
        return (
            <div className="min-h-screen bg-[#0a0c10] overflow-y-auto relative">
                {isCreator && (
                    <button 
                        onClick={() => setIsAdminMode(true)}
                        className="fixed top-6 right-6 z-[300] px-4 py-2 rounded-full border border-[#00F2FE]/30 bg-[#00F2FE]/10 text-[9px] font-black text-[#00F2FE] uppercase tracking-[0.2em] shadow-[0_0_15px_rgba(0,242,254,0.3)] backdrop-blur-md active:scale-95 transition-all"
                    >
                        <div className="flex items-center gap-2">
                            <Settings className="w-3 h-3" />
                            <span>Admin Panel</span>
                        </div>
                    </button>
                )}
                <div className="p-4 md:p-8">
                     <div className="text-center mb-6">
                        <div className="inline-block border border-white/20 bg-white/5 px-4 py-1.5 rounded-full backdrop-blur-md">
                            <span className="text-[10px] font-black text-[#00F2FE] tracking-[0.2em] uppercase">DRAFT COMPLETED</span>
                        </div>
                    </div>
                    <RecapView draft={draft} allPlayers={allPlayers} isExport={false} />
                </div>
            </div>
        );
    }

    const currentTeamId = draft.status === 'active' ? draft.pickOrder[draft.currentTurnIndex] : null;
    const activeTeamColor = draft.teams.find(t => t.id === currentTeamId)?.color;
    const poolPlayers = allPlayers.filter(p => draft.availablePlayerIds.includes(p.id)).sort((a,b) => b.rating - a.rating);
    const isMyTurn = (currentUserTeamId && currentUserTeamId === currentTeamId && draft.status === 'active') || (isAdminMode && draft.status === 'active');
    const gridCols = draft.teams.length === 2 ? 'grid-cols-1 md:grid-cols-2' : draft.teams.length === 3 ? 'grid-cols-1 md:grid-cols-3' : 'grid-cols-2 md:grid-cols-4';

    const headerBtnStyle = (active: boolean, color: string = '#00F2FE') => `
        w-full h-7 rounded-full border-[1.5px] transition-all duration-300
        text-[8px] font-black uppercase tracking-[0.2em] shadow-lg
        flex items-center justify-center
        hover:scale-105 active:scale-95
        ${active ? `border-[${color}] text-[${color}] bg-[${color}]/10 shadow-[0_0_12px_${color}40]` : `border-white/10 text-white/40 bg-white/5 hover:border-[${color}]/50 hover:text-[${color}] hover:bg-[${color}]/5`}`;

    return (
        <div className="min-h-screen bg-[#0a0c10] text-white flex flex-col relative overflow-hidden">
            <Toast message={toastMessage} isVisible={showToast} />
            
            {/* HEADER */}
            <div className="relative z-10 p-6 pt-8 border-b border-white/5 bg-[#0a0c10] flex flex-col gap-4">
                <div className="flex justify-between items-start relative w-full">
                    {/* LEFT CONTROLS (ADMIN ONLY) */}
                    <div className="w-36 flex flex-col gap-2 items-stretch min-h-[60px]">
                        {isCreator && (
                            <>
                                <button onClick={() => setIsManualMode(!isManualMode)} className={headerBtnStyle(isManualMode, '#FFD700')}>MANUAL</button>
                                <button onClick={() => { setIsAdminMode(!isAdminMode); setIsManualMode(false); }} className={headerBtnStyle(isAdminMode, '#00F2FE')}>ADMIN</button>
                            </>
                        )}
                    </div>

                    {/* CENTER TITLE & START */}
                    <div className="flex flex-col items-center">
                        <h1 className="font-blackops text-5xl md:text-7xl uppercase leading-[0.8] tracking-[0.1em]" style={brandTextStyle}>UNIT DRAFT</h1>
                        <div className="mt-4 flex flex-col items-center gap-1">
                            {/* START BUTTON (ADMIN ONLY) */}
                            {isAdminMode && (
                                <div className="flex justify-center h-8">
                                    {draft.status === 'waiting' && (
                                        <button onClick={handleStartDraft} className="px-6 py-1 rounded-full text-white font-black text-xs tracking-[0.2em] uppercase shadow-[0_0_20px_rgba(0,242,254,0.3)] hover:scale-105 transition-all border border-[#48CFCB]/50" style={brandTextStyle}>START DRAFT</button>
                                    )}
                                    <button onClick={handleOpenSummary} className={`px-8 py-2 rounded-full bg-emerald-600/30 border border-emerald-500 text-emerald-100 font-bold text-xs tracking-[0.2em] uppercase shadow-[0_0_15px_rgba(16,185,129,0.3)] hover:bg-emerald-600/50 hover:scale-105 transition-all ${draft.status === 'waiting' ? 'hidden' : ''}`}>FINISH & START MATCH</button>
                                </div>
                            )}
                            {/* STATUS TEXT (EVERYONE) */}
                            {isManualMode ? <span className="text-[9px] font-bold text-[#FFD700] uppercase tracking-wider animate-pulse">MANUAL ASSIGNMENT ACTIVE</span> : draft.status === 'active' && <span className="text-[9px] font-mono text-[#00F2FE] animate-pulse uppercase tracking-widest">DRAFT IN PROGRESS</span>}
                        </div>
                    </div>

                    {/* RIGHT CONTROLS (ADMIN ONLY) */}
                    <div className="w-36 flex flex-col gap-2 items-stretch min-h-[60px]">
                        {isCreator && (
                            <>
                                <button onClick={shareCaptainLink} className={headerBtnStyle(false)}>CPT LINK</button>
                                <button onClick={shareSpectatorLink} className={headerBtnStyle(false)}>PUB LINK</button>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* TEAMS GRID */}
            <div className="relative z-10 p-4 pt-12 w-full overflow-y-auto">
                <div className={`grid ${gridCols} gap-6 w-full max-w-[1600px] mx-auto`}>
                    {sortedTeams.map((team, index) => {
                        const isCurrentTurn = team.id === currentTeamId;
                        const isMyTeam = team.id === currentUserTeamId;
                        const captain = allPlayers.find(p => p.id === team.captainId);
                        const pickedIds = team.playerIds.slice(1);
                        const slotsTotal = draft.sessionConfig.playersPerTeam - 1;
                        const currentCount = team.playerIds.length;
                        const avgRating = team.playerIds.length > 0 ? Math.round(team.playerIds.reduce((sum, pid) => sum + (allPlayers.find(p=>p.id===pid)?.rating||0), 0) / team.playerIds.length) : 0;
                        
                        // LOBBY LOGIC:
                        // Card is READY (colored) if:
                        // 1. The draft has started (status === active or completed) OR
                        // 2. The specific captain has successfully logged in (isCaptainReady === true)
                        const isCardReady = draft.status !== 'waiting' || !!team.isCaptainReady;

                        return (
                            <div key={team.id} className="flex flex-col items-center">
                                <div className="flex flex-col gap-8 w-full max-w-[260px]">
                                    {/* Captain Card with Lobby Logic */}
                                    {captain && (
                                        <CaptainDraftCard 
                                            player={captain} 
                                            teamColor={team.color} 
                                            isCaptain 
                                            isMyTeam={isMyTeam} 
                                            isActive={isCurrentTurn} 
                                            isReady={isCardReady}
                                            onClick={() => { 
                                                // Only prompt for login if not already logged in/ready
                                                if (!currentUserTeamId && !isAdminMode && !team.isCaptainReady) { 
                                                    setTeamToAuth(team.id); 
                                                    setIsPinModalOpen(true); 
                                                }
                                            }} 
                                        />
                                    )}
                                    
                                    <div className="flex justify-center w-full mb-3 mt-4">
                                        <div className="px-3 py-1 rounded-full bg-white/5 border border-white/10 flex items-center gap-2 shadow-sm">
                                            <span className="text-[8px] font-black text-white/30 uppercase tracking-[0.2em]">MEMBERS</span>
                                            <span className="font-mono text-[10px] font-bold text-white"><span className={currentCount === draft.sessionConfig.playersPerTeam ? 'text-[#4CFF5F]' : 'text-[#00F2FE]'}>{currentCount}</span><span className="text-white/20 mx-0.5">/</span>{draft.sessionConfig.playersPerTeam}</span>
                                        </div>
                                    </div>
                                    <div className="flex flex-col gap-1.5 w-full">
                                        {pickedIds.map(pid => {
                                            const p = allPlayers.find(pl => pl.id === pid);
                                            return <div key={pid} className="h-9 w-full bg-[#1A1D24] border-l-2 rounded-r-lg flex items-center justify-between px-3 shadow-md animate-in slide-in-from-left-2 fade-in duration-300" style={{ borderLeftColor: team.color }}><span className="font-chakra font-bold text-sm text-white truncate w-full uppercase tracking-wide">{p?.nickname}</span><span className="font-mono text-[10px] font-bold text-[#00F2FE] ml-2">{p?.rating}</span></div>;
                                        })}
                                        {Array.from({ length: Math.max(0, slotsTotal - pickedIds.length) }).map((_, i) => <div key={`empty_${i}`} className="h-9 w-full bg-[#1A1D24]/50 border border-white/[0.05] rounded-lg flex items-center justify-center"></div>)}
                                    </div>
                                    <div className="mt-2 w-full flex justify-between items-center border-t border-white/10 pt-2 px-2"><span className="text-[8px] font-black text-white/30 uppercase tracking-widest">AVG OVR</span><span className="font-russo text-xl text-white tracking-widest">{avgRating}</span></div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* PLAYER POOL */}
            <div className="flex-grow relative z-10 bg-[#05070a] p-4 overflow-y-auto border-t border-white/5 shadow-[0_-10px_40px_rgba(0,0,0,0.5)]">
                <div className="sticky top-0 bg-[#05070a]/95 backdrop-blur-md z-20 py-3 mb-4 border-b border-white/5 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="p-1.5 bg-white/5 rounded-lg"><Users className="w-4 h-4 text-white/60" /></div>
                        <h3 className="font-orbitron text-sm font-bold tracking-[0.2em] text-white/80 uppercase">AVAILABLE UNITS <span className="text-[#00F2FE]">({poolPlayers.length})</span></h3>
                    </div>
                    {!currentUserTeamId && !isAdminMode && draft.status !== 'completed' && <span className="text-[9px] font-bold text-yellow-500 animate-pulse bg-yellow-500/10 px-3 py-1.5 rounded-lg border border-yellow-500/20 uppercase tracking-wider">TAP CARD TO LOGIN</span>}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-7 gap-3 pb-10">
                    {poolPlayers.map(player => (
                        <MiniDraftCard key={player.id} player={player} onClick={() => handlePickPlayer(player.id)} disabled={!(isMyTurn || (isAdminMode && (draft.status === 'active' || isManualMode))) || isProcessing} isActive={isMyTurn} pickingColor={(isMyTurn || (isAdminMode && draft.status === 'active')) ? activeTeamColor : undefined} isManualMode={isManualMode} />
                    ))}
                </div>
            </div>

            {/* MODALS */}
            {isPinModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4">
                    <div className="w-full max-w-xs bg-[#12161b] border border-[#00F2FE]/30 rounded-3xl p-8 shadow-[0_0_50px_rgba(0,242,254,0.2)]">
                        <h3 className="text-center font-blackops text-2xl text-white mb-2 uppercase tracking-wide">CAPTAIN ACCESS</h3>
                        <p className="text-center text-[10px] text-white/40 mb-6 uppercase tracking-[0.2em]">SECURITY CLEARANCE REQUIRED</p>
                        <input type="tel" className="w-full bg-black/50 border border-white/20 rounded-xl p-4 text-center text-3xl font-mono tracking-[0.5em] text-[#00F2FE] focus:border-[#00F2FE] focus:outline-none mb-8 placeholder:text-white/10" maxLength={4} value={pinInput} onChange={(e) => setPinInput(e.target.value)} placeholder="----" autoFocus />
                        <div className="flex gap-3"><button onClick={() => setIsPinModalOpen(false)} className="flex-1 py-3 rounded-xl bg-white/5 border border-white/10 text-white font-bold text-xs hover:bg-white/10 transition-all uppercase tracking-wider">CANCEL</button><button onClick={handleCaptainAuth} className="flex-1 py-3 rounded-xl bg-[#00F2FE] text-black font-black text-xs hover:bg-[#00F2FE]/80 shadow-[0_0_20px_rgba(0,242,254,0.4)] transition-all uppercase tracking-wider">CONFIRM</button></div>
                    </div>
                </div>
            )}

            {manualAssignPlayer && (
                <Modal isOpen={!!manualAssignPlayer} onClose={() => setManualAssignPlayer(null)} size="xs" containerClassName="!bg-[#1A1D24] border border-[#FFD700]/30 shadow-[0_0_30px_rgba(255,215,0,0.15)]" hideCloseButton>
                    <div className="text-center mb-6"><span className="text-[10px] font-black text-[#FFD700] tracking-[0.2em] uppercase mb-1 block animate-pulse">MANUAL OVERRIDE</span><h3 className="font-russo text-xl text-white uppercase">ASSIGN <span className="text-[#FFD700]">{manualAssignPlayer.nickname}</span></h3><p className="text-[10px] text-white/40 mt-2 font-mono">Select target squad for immediate transfer</p></div>
                    <div className="flex flex-col gap-3">{draft.teams.map(team => (<button key={team.id} onClick={() => handleManualAssign(team.id)} className="w-full p-3 rounded-xl border border-white/10 hover:border-[#FFD700] hover:bg-[#FFD700]/10 transition-all group flex items-center justify-between"><div className="flex items-center gap-3"><div className="w-3 h-3 rounded-full shadow-[0_0_5px_currentColor]" style={{ backgroundColor: team.color }}></div><span className="font-black text-sm text-white uppercase group-hover:text-[#FFD700] transition-colors">TEAM</span></div><span className="text-[10px] font-mono text-white/30">{team.playerIds.length} Players</span></button>))}</div>
                    <Button variant="ghost" onClick={() => setManualAssignPlayer(null)} className="w-full mt-4 text-xs font-bold text-white/30 hover:text-white">CANCEL OPERATION</Button>
                </Modal>
            )}

            {isSummaryModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-6">
                    <div className="absolute inset-0 bg-black/95 backdrop-blur-xl animate-in fade-in duration-300"></div>
                    <div className="relative w-full max-w-5xl h-[90vh] flex flex-col bg-[#0a0c10] border border-white/10 rounded-3xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 duration-500">
                        <div className="flex-grow overflow-y-auto p-6 custom-hub-scrollbar bg-[#0a0c10]">
                            <RecapView draft={draft} allPlayers={allPlayers} isExport={false} />
                        </div>
                        {/* Hidden Export Container */}
                        <div ref={exportRef} data-export-target="draft-squads" style={{ position: 'fixed', left: '-9999px', top: '0', zIndex: -100, width: 'fit-content', minWidth: '1920px' }}>
                            <RecapView draft={draft} allPlayers={allPlayers} isExport={true} />
                        </div>
                        <div className="p-3 bg-[#12161b] border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0 z-20">
                            <button onClick={() => setIsSummaryModalOpen(false)} className="text-[10px] font-bold text-white/40 hover:text-white uppercase tracking-wider transition-colors px-3 py-1">BACK TO EDIT</button>
                            <div className="flex items-center gap-2 w-full sm:w-auto">
                                <Button variant="secondary" onClick={handleShareSummary} disabled={isExporting} className="flex-1 sm:flex-none flex items-center justify-center gap-2 !py-2 !px-4 bg-white/5 border border-white/10 hover:bg-white/10 text-xs"><Share2 className="w-3.5 h-3.5" /><span>{isExporting ? 'SAVING...' : 'SHARE SQUADS'}</span></Button>
                                <Button variant="primary" onClick={handleConfirmAndPlay} className="flex-1 sm:flex-none flex items-center justify-center gap-2 !py-2 !px-6 shadow-[0_0_20px_rgba(0,242,254,0.3)] hover:shadow-[0_0_30px_rgba(0,242,254,0.5)] transition-all text-xs"><Play className="w-3.5 h-3.5" /><span>START MATCH</span></Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
