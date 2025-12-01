import React from 'react';
import { Button, Modal, useTranslation } from '../ui';
import { Goal, GoalPayload, Game, Session, Team, Player } from '../types';
import { Edit3 } from '../icons';
import { TeamAvatar } from '../components/avatars';

// --- GOAL MODAL ---
interface GoalModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (goal: Omit<Goal, 'id' | 'gameId' | 'timestampSeconds'>, goalPayload: GoalPayload) => void;
    game: Game;
    session: Session;
    scoringTeamId: string | null;
}

export const GoalModal: React.FC<GoalModalProps> = ({ isOpen, onClose, onSave, game, session, scoringTeamId: initialScoringTeamId }) => {
    const t = useTranslation();
    const [scorerId, setScorerId] = React.useState<string | undefined>(undefined);
    const [assistantId, setAssistantId] = React.useState<string | undefined>(undefined);
    const [step, setStep] = React.useState<'scorer' | 'assistant'>('scorer');

    React.useEffect(() => {
        if (isOpen) {
            setScorerId(undefined);
            setAssistantId(undefined);
            setStep('scorer');
        }
    }, [isOpen]);

    if (!initialScoringTeamId) return null;

    const scoringTeam = session.teams.find(t => t.id === initialScoringTeamId);
    if (!scoringTeam) return null;
    
    const defendingTeam = session.teams.find(t => t.id === (game.team1Id === initialScoringTeamId ? game.team2Id : game.team1Id));
    if (!defendingTeam) return null;
    
    const playersOnField = scoringTeam.playerIds.map(pid => session.playerPool.find(p => p.id === pid)).filter(Boolean) as Player[];
    const getPlayerNickname = (id?: string) => id ? session.playerPool.find(p => p.id === id)?.nickname : undefined;

    const handleScorerSelect = (id: string) => {
        setScorerId(id);
        setStep('assistant');
    };

    const handleSave = (finalAssistantId?: string) => {
        const payload: GoalPayload = {
            team: scoringTeam.color,
            scorer: getPlayerNickname(scorerId),
            assist: getPlayerNickname(finalAssistantId),
            isOwnGoal: false,
        };
        onSave({ teamId: scoringTeam.id, scorerId, assistantId: finalAssistantId, isOwnGoal: false }, payload);
        onClose();
    };
    
    const handleOwnGoalClick = () => {
        const payload: GoalPayload = {
            team: defendingTeam.color,
            isOwnGoal: true,
        };
        onSave({ 
            teamId: defendingTeam.id, 
            scorerId: undefined, // No scorer for own goal in the game data
            isOwnGoal: true,
        }, payload);
        onClose();
    };
    
    const modalTitle = step === 'scorer' ? t.goal : t.assistant;

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            size="xs"
            containerClassName="border border-dark-accent-start/40 shadow-[0_0_20px_rgba(0,242,254,0.3)]"
        >
             <h3 className="text-center text-xl font-bold mb-4 text-dark-text">{modalTitle}</h3>
             <div className="space-y-2">
                {step === 'scorer' && (
                    <>
                        <div className="flex flex-col gap-2 max-h-64 overflow-y-auto">
                             {playersOnField.map(p => <Button key={p.id} variant="secondary" className="w-full !py-2" onClick={() => handleScorerSelect(p.id)}>{p.nickname}</Button>)}
                        </div>
                        <Button 
                            onClick={handleOwnGoalClick} 
                            variant="secondary" 
                            className="w-full mt-2 !border-dark-accent-start/60 !shadow-[0_0_8px_rgba(0,242,254,0.5)]"
                        >
                            {t.ownGoal}
                        </Button>
                    </>
                )}
                {step === 'assistant' && (
                     <>
                        <div className="flex flex-col gap-2 max-h-64 overflow-y-auto">
                             {playersOnField.filter(p => p.id !== scorerId).map(p => <Button key={p.id} variant="secondary" className="w-full !py-2" onClick={() => {setAssistantId(p.id); handleSave(p.id)}}>{p.nickname}</Button>)}
                        </div>
                         <Button 
                            onClick={() => handleSave(undefined)} 
                            variant="secondary" 
                            className="w-full mt-2 !border-dark-accent-start/60 !shadow-[0_0_8px_rgba(0,242,254,0.5)]"
                         >
                            {t.withoutAssist}
                         </Button>
                    </>
                )}
             </div>
        </Modal>
    );
};

// --- END SESSION MODAL ---
export const EndSessionModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
}> = ({ isOpen, onClose, onConfirm }) => {
    const t = useTranslation();
    return (
        <Modal 
            isOpen={isOpen} 
            onClose={onClose} 
            size="xs" 
            hideCloseButton
            containerClassName="shadow-lg shadow-dark-accent-start/20 border border-dark-accent-start/40"
        >
            <div className="text-center">
                <div className="flex flex-col gap-3">
                    <Button 
                        variant="secondary" 
                        onClick={onConfirm} 
                        className="w-full uppercase shadow-lg shadow-dark-accent-start/20 hover:shadow-dark-accent-start/40"
                    >
                        {t.confirm}
                    </Button>
                    <Button 
                        variant="secondary" 
                        onClick={onClose} 
                        className="w-full uppercase shadow-lg shadow-dark-accent-start/20 hover:shadow-dark-accent-start/40"
                    >
                        {t.cancel}
                    </Button>
                </div>
            </div>
        </Modal>
    );
};

// --- SELECT WINNER MODAL ---
export const SelectWinnerModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSelect: (winnerId: string) => void;
    team1: Team;
    team2: Team;
}> = ({ isOpen, onClose, onSelect, team1, team2 }) => {
    const t = useTranslation();
    return (
        <Modal 
            isOpen={isOpen} 
            onClose={onClose} 
            size="xs"
            containerClassName="border border-dark-accent-start/40 shadow-[0_0_20px_rgba(0,242,254,0.3)] !p-4"
        >
            <div className="flex flex-col items-center gap-3 pt-4">
                <h3 className="text-center text-xs font-normal text-dark-text-secondary mt-4 mb-2">{t.selectWinnerDesc}</h3>
                <div className="flex justify-around w-full">
                     <TeamAvatar team={team1} size="lg" onClick={() => onSelect(team1.id)} />
                     <TeamAvatar team={team2} size="lg" onClick={() => onSelect(team2.id)} />
                </div>
            </div>
        </Modal>
    );
};

// --- SUBSTITUTION MODAL ---
export const SubstitutionModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSelect: (playerInId: string) => void;
    team: Team;
    session: Session;
    playerOut: Player;
}> = ({ isOpen, onClose, onSelect, team, session, playerOut }) => {
    const t = useTranslation();
    const subs = team.playerIds
        .slice(session.playersPerTeam)
        .map(id => session.playerPool.find(p => p.id === id))
        .filter(Boolean) as Player[];

    return (
        <Modal 
            isOpen={isOpen} 
            onClose={onClose}
            size="xs"
            containerClassName="border border-dark-accent-start/40 shadow-[0_0_20px_rgba(0,242,254,0.3)]"
        >
            <h3 className="text-center text-xl font-bold mb-4 text-dark-text accent-text-glow">{`Replace ${playerOut.nickname}`}</h3>
            <div className="space-y-2">
                {subs.length > 0 ? (
                    subs.map(playerIn => (
                        <Button key={playerIn.id} variant="secondary" className="w-full !py-2" onClick={() => onSelect(playerIn.id)}>
                            {playerIn.nickname}
                        </Button>
                    ))
                ) : (
                    <p className="text-center text-dark-text-secondary">No players on the bench</p>
                )}
            </div>
        </Modal>
    );
};

// --- EDIT GOAL MODAL ---
export const EditGoalModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSave: (goalId: string, updates: { scorerId?: string; assistantId?: string; isOwnGoal: boolean }) => void;
    goal: Goal | null;
    game: Game;
    session: Session;
}> = ({ isOpen, onClose, onSave, goal, game, session }) => {
    const t = useTranslation();
    const [scorerId, setScorerId] = React.useState<string | undefined>();
    const [assistantId, setAssistantId] = React.useState<string | undefined>();
    const [isOwnGoal, setIsOwnGoal] = React.useState(false);

    React.useEffect(() => {
        if (goal) {
            setScorerId(goal.scorerId);
            setAssistantId(goal.assistantId);
            setIsOwnGoal(goal.isOwnGoal);
        }
    }, [goal]);

    if (!isOpen || !goal) return null;

    const scoringTeam = session.teams.find(t => t.id === goal.teamId);
    const playersOnField = scoringTeam
        ? scoringTeam.playerIds.map(pid => session.playerPool.find(p => p.id === pid)).filter(Boolean) as Player[]
        : [];
        
    const handleSave = () => {
        onSave(goal.id, { scorerId, assistantId, isOwnGoal });
        onClose();
    };

    const handleSetOwnGoal = () => {
        setIsOwnGoal(true);
        setScorerId(undefined);
        setAssistantId(undefined);
    };

    return (
        <Modal 
            isOpen={isOpen} 
            onClose={onClose} 
            size="xs"
            containerClassName="border border-dark-accent-start/40 shadow-[0_0_20px_rgba(0,242,254,0.3)]"
        >
            <h3 className="text-center text-xl font-bold mb-4 text-dark-text">{t.editGoal}</h3>
            <div className="space-y-2">
                <div>
                    <label className="font-semibold text-dark-text-secondary text-sm">{t.scorer}</label>
                    <div className="grid grid-cols-3 gap-1 mt-1">
                        {playersOnField.map(p => (
                            <Button
                                key={p.id}
                                variant={scorerId === p.id && !isOwnGoal ? 'primary' : 'secondary'}
                                onClick={() => { setIsOwnGoal(false); setScorerId(p.id); }}
                                className="!py-1.5 !text-sm truncate"
                                disabled={isOwnGoal}
                            >
                                {p.nickname}
                            </Button>
                        ))}
                    </div>
                </div>
                <div>
                    <label className="font-semibold text-dark-text-secondary text-sm">{t.assistant}</label>
                    <div className="grid grid-cols-3 gap-1 mt-1">
                        <Button variant={!assistantId && !isOwnGoal ? 'primary' : 'secondary'} onClick={() => setAssistantId(undefined)} className="!py-1.5 !text-sm" disabled={isOwnGoal}>
                            {t.withoutAssist}
                        </Button>
                        {playersOnField.filter(p => p.id !== scorerId).map(p => (
                            <Button
                                key={p.id}
                                variant={assistantId === p.id && !isOwnGoal ? 'primary' : 'secondary'}
                                onClick={() => { if (!isOwnGoal) setAssistantId(p.id); }}
                                className="!py-1.5 !text-sm truncate"
                                disabled={isOwnGoal}
                            >
                                {p.nickname}
                            </Button>
                        ))}
                    </div>
                </div>
                 <Button onClick={handleSetOwnGoal} variant="secondary" className="w-full mt-2 !border-dark-accent-start/60 !shadow-[0_0_8px_rgba(0,242,254,0.5)] !py-1.5 !text-sm">{t.ownGoal}</Button>
                 <Button onClick={handleSave} variant="secondary" className="w-full mt-2 !border-dark-accent-start/60 !shadow-[0_0_8px_rgba(0,242,254,0.5)] !py-1.5 !text-sm">{t.saveChanges}</Button>
            </div>
        </Modal>
    );
};