import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context';
import { Page, Button, Card, ToggleSwitch, useTranslation } from '../components';
import { Session, RotationMode, SessionStatus } from '../types';
import { formatDate } from '../services/export';
import { newId } from './utils';

export const NewGameSetupScreen: React.FC = () => {
    const { setActiveSession } = useApp();
    const navigate = useNavigate();
    const t = useTranslation();

    const [sessionName, setSessionName] = React.useState('532 PLAYGROUND GAME');
    const [numTeams, setNumTeams] = React.useState(3);
    const [playersPerTeam, setPlayersPerTeam] = React.useState(5);
    const [matchDuration, setMatchDuration] = React.useState(7);
    const [goalsToWin, setGoalsToWin] = React.useState(2);
    const [rotationMode, setRotationMode] = React.useState<RotationMode>(RotationMode.AutoRotate);
    
    const handleSubmit = () => {
        const newSession: Session = {
            id: newId(),
            sessionName,
            date: formatDate(new Date()),
            numTeams,
            playersPerTeam,
            matchDurationMinutes: numTeams === 3 ? matchDuration : undefined,
            goalsToWin: numTeams === 3 && goalsToWin > 0 ? goalsToWin : undefined,
            rotationMode: numTeams === 3 ? rotationMode : undefined,
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
                            className="w-full bg-transparent border-none focus:ring-0 p-0 gradient-text font-bold text-lg"
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
                            {numTeams === 3 && (
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
                
                <Button variant="secondary" onClick={handleSubmit} className="w-full !text-xl !py-4 shadow-lg shadow-dark-accent-start/20 hover:shadow-dark-accent-start/40">{t.addPlayers}</Button>
            </div>
        </Page>
    );
};