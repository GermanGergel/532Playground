
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context';
import { Page, Button, Card, ToggleSwitch, useTranslation } from '../ui';
import { Session, RotationMode, SessionStatus } from '../types';
import { formatDate } from '../services/export';
import { newId } from './utils';
import { getRemoteActiveSession, isSupabaseConfigured } from '../db';
import { Cloud } from '../icons';

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
    const handleLoadFromCloud = async () => {
        if (!isSupabaseConfigured()) {
            alert("Cloud database not configured.");
            return;
        }
        
        setIsLoadingCloud(true);
        try {
            const remoteSession = await getRemoteActiveSession();
            if (remoteSession) {
                // Confirm overwrite implicitly by action
                setActiveSession(remoteSession);
                alert("Session loaded from cloud successfully!");
                navigate('/match'); // Jump straight to match assuming it's ready from Draft
            } else {
                alert("No active session found in cloud storage.");
            }
        } catch (error) {
            console.error("Cloud load failed", error);
            alert("Failed to load session from cloud.");
        } finally {
            setIsLoadingCloud(false);
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
                            {isLoadingCloud ? "DOWNLOADING..." : "LOAD CLOUD SESSION"}
                        </span>
                    </button>
                </div>
            </div>
        </Page>
    );
};
