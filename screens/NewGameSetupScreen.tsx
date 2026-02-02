
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context';
import { Page, Button, Card, ToggleSwitch, useTranslation, Modal } from '../ui';
import { Session, RotationMode, SessionStatus } from '../types';
import { formatDate } from '../services/export';
import { newId } from './utils';
import { getRemoteActiveSession, isSupabaseConfigured, saveActiveSessionToDB, clearRemoteActiveSession } from '../db';
import { Cloud, Trash2, CheckCircle } from '../icons';

export const NewGameSetupScreen: React.FC = () => {
    const { setActiveSession } = useApp();
    const navigate = useNavigate();
    const t = useTranslation();

    const [sessionName, setSessionName] = React.useState('UNIT GAME');
    const [numTeams, setNumTeams] = React.useState(3);
    const [playersPerTeam, setPlayersPerTeam] = React.useState(5);
    const [matchDuration, setMatchDuration] = React.useState(7);
    const [goalsToWin, setGoalsToWin] = React.useState(2);
    const [rotationMode, setRotationMode] = React.useState<RotationMode>(RotationMode.AutoRotate);
    
    // State for Cloud Sync Feature
    const [isLoadingCloud, setIsLoadingCloud] = useState(false);
    const [foundRemoteSession, setFoundRemoteSession] = useState<Session | null>(null);
    const [isConflictModalOpen, setIsConflictModalOpen] = useState(false);

    const handleSubmit = () => {
        const isRotationApplicable = numTeams >= 3;
        const newSession: Session = {
            id: newId(),
            sessionName,
            date: formatDate(new Date()),
            numTeams,
            playersPerTeam,
            matchDurationMinutes: isRotationApplicable ? matchDuration : undefined,
            goalsToWin: isRotationApplicable && goalsToWin > 0 ? goalsToWin : undefined,
            rotationMode: isRotationApplicable ? rotationMode : undefined,
            status: SessionStatus.Active,
            createdAt: new Date().toISOString(),
            teams: [],
            games: [],
            playerPool: [],
            eventLog: [],
        };
        setActiveSession(newSession);
        navigate('/assign');
    };
    
    // --- LOAD FROM CLOUD (Admin feature for Draft Handoff) ---
    // STEP 1: Fetch and check. Do not load automatically to prevent zombie overwrites.
    const handleLoadFromCloud = async () => {
        if (!isSupabaseConfigured()) {
            alert("Cloud database not configured.");
            return;
        }
        
        setIsLoadingCloud(true);
        try {
            // Fetch fresh from Cloud Settings
            const remoteSession = await getRemoteActiveSession();
            
            if (remoteSession) {
                setFoundRemoteSession(remoteSession);
                setIsConflictModalOpen(true);
            } else {
                alert("Cloud Storage is Empty.");
                // Ensure local is clear just in case
                setActiveSession(null);
                await saveActiveSessionToDB(null);
            }
        } catch (error) {
            console.error("Cloud load failed", error);
            alert("Failed to connect to cloud.");
        } finally {
            setIsLoadingCloud(false);
        }
    };

    // STEP 2A: User Confirms Load
    const handleConfirmLoad = async () => {
        if (foundRemoteSession) {
            setActiveSession(foundRemoteSession);
            await saveActiveSessionToDB(foundRemoteSession);
            setIsConflictModalOpen(false);
            navigate('/match');
        }
    };

    // STEP 2B: User Deletes Zombie Session
    const handleClearCloud = async () => {
        if (window.confirm("Are you sure? This will delete the session data from the cloud so it stops appearing.")) {
            setIsLoadingCloud(true);
            try {
                await clearRemoteActiveSession();
                setFoundRemoteSession(null);
                setIsConflictModalOpen(false);
                alert("Cloud cache cleared.");
            } catch (e) {
                alert("Failed to clear cloud.");
            } finally {
                setIsLoadingCloud(false);
            }
        }
    };

    const numberInputClasses = `w-20 p-2 text-center bg-dark-bg rounded-lg border border-white/20 focus:ring-2 focus:ring-dark-accent-start focus:outline-none disabled:opacity-50`;
    const cardNeonClasses = "shadow-lg shadow-dark-accent-start/20 border border-dark-accent-start/40";
    const numTeamClasses = (val: number) => `px-5 py-1.5 rounded-full font-bold transition-colors text-md ${numTeams === val ? 'gradient-bg text-dark-bg' : 'bg-dark-bg hover:bg-white/10'}`;
    const externalLabelClasses = "block font-semibold mb-2 text-dark-text-secondary";

    return (
        <Page>
            <h1 className="text-2xl font-bold mb-6 text-center">{t.setupTitle}</h1>
            <div className="space-y-6">
                <div>
                    <label className={externalLabelClasses}>{t.sessionName}</label>
                    <Card className={`!p-3 ${cardNeonClasses}`}>
                        <input 
                            type="text" 
                            value={sessionName}
                            onChange={(e) => setSessionName(e.target.value)}
                            className="w-full bg-transparent border-none focus:ring-0 p-0 gradient-text font-bold text-lg uppercase"
                        />
                    </Card>
                </div>

                <div>
                    <label className={externalLabelClasses}>{t.gameParameters}</label>
                    <Card className={`!p-4 ${cardNeonClasses}`}>
                        <div className="space-y-5">
                            <div className="flex items-center justify-between">
                                <label>{t.numTeams}</label>
                                <div className="flex items-center gap-2">
                                    <button onClick={() => setNumTeams(2)} className={numTeamClasses(2)}>2</button>
                                    <button onClick={() => setNumTeams(3)} className={numTeamClasses(3)}>3</button>
                                    <button onClick={() => setNumTeams(4)} className={numTeamClasses(4)}>4</button>
                                </div>
                            </div>
                            <div className="flex items-center justify-between">
                                <label>{t.playersPerTeam}</label>
                                <input type="number" value={playersPerTeam} onChange={e => setPlayersPerTeam(parseInt(e.target.value))} min="1" className={numberInputClasses}/>
                            </div>
                            <div className={`flex items-center justify-between transition-opacity ${numTeams === 2 ? 'opacity-50' : 'opacity-100'}`}>
                                 <label>{t.matchDuration}</label>
                                <input 
                                    type="number" 
                                    value={matchDuration} 
                                    onChange={e => setMatchDuration(parseInt(e.target.value))} 
                                    min="1" 
                                    className={numberInputClasses}
                                    disabled={numTeams === 2}
                                />
                            </div>
                             <div className={`flex items-center justify-between transition-opacity ${numTeams === 2 ? 'opacity-50' : 'opacity-100'}`}>
                                <label>{t.goalsToWin}</label>
                                <input 
                                    type="number" 
                                    value={goalsToWin} 
                                    onChange={e => setGoalsToWin(parseInt(e.target.value))} 
                                    min="0" 
                                    className={numberInputClasses}
                                    disabled={numTeams === 2}
                                />
                            </div>
                            {numTeams >= 3 && (
                                <div className="flex items-center justify-between pt-4">
                                    <div className="pr-4 flex-1">
                                        <label className="font-bold">{t.autoRotate}</label>
                                        <p className="text-sm text-dark-text-secondary">
                                            {rotationMode === RotationMode.AutoRotate ? t.autoRotateDesc : t.playUntilLossDesc}
                                        </p>
                                    </div>
                                    <ToggleSwitch
                                        isOn={rotationMode === RotationMode.AutoRotate}
                                        onToggle={() => setRotationMode(prev => prev === RotationMode.AutoRotate ? RotationMode.PlayUntilLoss : RotationMode.AutoRotate)}
                                    />
                                </div>
                            )}
                        </div>
                    </Card>
                </div>
                
                <Button variant="secondary" onClick={handleSubmit} className="w-full font-chakra font-bold text-xl tracking-wider !py-3 shadow-lg shadow-dark-accent-start/20 hover:shadow-dark-accent-start/40">{t.addPlayers}</Button>

                {/* --- CLOUD LOAD SECTION (For Draft Handoff) --- */}
                <div className="mt-6 pt-6 border-t border-white/10 flex flex-col items-center gap-3 opacity-60 hover:opacity-100 transition-opacity">
                    <p className="text-[10px] text-white/40 uppercase tracking-widest text-center font-mono">
                        Already drafted on PC?
                    </p>
                    <button 
                        onClick={handleLoadFromCloud} 
                        disabled={isLoadingCloud}
                        className="w-full py-2.5 flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 hover:border-[#00F2FE]/30 text-white/60 hover:text-[#00F2FE] transition-all active:scale-95 group"
                    >
                        {isLoadingCloud ? (
                            <div className="w-4 h-4 border-2 border-[#00F2FE] border-t-transparent rounded-full animate-spin"></div>
                        ) : (
                            <Cloud className="w-4 h-4 group-hover:scale-110 transition-transform" />
                        )}
                        <span className="text-[10px] font-black uppercase tracking-widest">
                            {isLoadingCloud ? "SYNCING..." : "LOAD CLOUD SESSION"}
                        </span>
                    </button>
                </div>
            </div>

            {/* --- CONFLICT RESOLUTION MODAL --- */}
            <Modal 
                isOpen={isConflictModalOpen} 
                onClose={() => setIsConflictModalOpen(false)} 
                size="sm" 
                hideCloseButton
                containerClassName="!bg-[#1A1D24] border border-[#00F2FE]/40 shadow-[0_0_40px_rgba(0,242,254,0.15)]"
            >
                <div className="flex flex-col gap-4 text-center">
                    <div className="flex justify-center mb-2">
                        <div className="w-12 h-12 rounded-full bg-[#00F2FE]/10 flex items-center justify-center border border-[#00F2FE]/30">
                            <Cloud className="w-6 h-6 text-[#00F2FE]" />
                        </div>
                    </div>
                    
                    <h2 className="text-xl font-black text-white uppercase tracking-wider">Session Found</h2>
                    
                    <div className="bg-white/5 rounded-lg p-3 border border-white/10">
                        <p className="text-sm font-bold text-[#00F2FE] uppercase">{foundRemoteSession?.sessionName || 'Unnamed Session'}</p>
                        <p className="text-[10px] text-white/50 font-mono mt-1 uppercase tracking-wider">
                            {foundRemoteSession?.date} • {foundRemoteSession?.numTeams} Teams
                        </p>
                    </div>
                    
                    <p className="text-xs text-white/60 leading-relaxed px-2">
                        A session handoff data was found in the cloud. Do you want to load it to start the match, or delete it?
                    </p>

                    <div className="flex flex-col gap-3 mt-2">
                        <Button 
                            variant="primary" 
                            onClick={handleConfirmLoad}
                            className="w-full !py-3 shadow-[0_0_15px_rgba(0,242,254,0.3)]"
                        >
                            LOAD SESSION
                        </Button>
                        
                        <div className="flex gap-3">
                            <Button 
                                variant="secondary" 
                                onClick={handleClearCloud}
                                className="flex-1 !py-3 border-red-500/30 text-red-400 hover:bg-red-500/10 hover:border-red-500/50"
                            >
                                <div className="flex items-center justify-center gap-2">
                                    <Trash2 className="w-4 h-4" /> <span>DELETE</span>
                                </div>
                            </Button>
                            <Button 
                                variant="secondary" 
                                onClick={() => setIsConflictModalOpen(false)}
                                className="flex-1 !py-3"
                            >
                                CANCEL
                            </Button>
                        </div>
                    </div>
                </div>
            </Modal>
        </Page>
    );
};
