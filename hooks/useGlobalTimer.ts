
import React from 'react';
import { Session, GameStatus } from '../types';
import { playAnnouncement } from '../lib';

export const useGlobalTimer = (
    activeSession: Session | null,
    setActiveSession: React.Dispatch<React.SetStateAction<Session | null>>
) => {
    const [displayTime, setDisplayTime] = React.useState(0);
    const animationFrameRef = React.useRef<number | null>(null);
    const lastAnnouncedSecondRef = React.useRef<number | null>(null);

    const currentGame = activeSession?.games[activeSession.games.length - 1];
    const isTimerBasedGame = activeSession?.numTeams === 3;

    // --- GLOBAL TIMER LOGIC ---
    React.useEffect(() => {
        const getGlobalTime = () => {
            if (!activeSession || !currentGame) return 0;

            let elapsed = currentGame.elapsedSecondsOnPause;
            if (currentGame.status === GameStatus.Active && currentGame.lastResumeTime) {
                elapsed += (Date.now() - currentGame.lastResumeTime) / 1000;
            }

            if (activeSession.numTeams === 2) {
                return elapsed;
            }

            if (currentGame.durationSeconds !== undefined) {
                return Math.max(0, currentGame.durationSeconds - elapsed);
            }

            return 0;
        };

        const tick = () => {
            if (activeSession && currentGame && currentGame.status === GameStatus.Active) {
                setDisplayTime(getGlobalTime());
                animationFrameRef.current = requestAnimationFrame(tick);
            }
        };

        if (currentGame?.status === GameStatus.Active) {
            animationFrameRef.current = requestAnimationFrame(tick);
        } else {
            setDisplayTime(getGlobalTime());
        }

        return () => {
            if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
        };
    }, [activeSession, currentGame]);

    // --- GLOBAL VOICE ASSISTANT LOGIC (SIMPLIFIED) ---
    React.useEffect(() => {
        if (!activeSession || !currentGame || currentGame.status !== GameStatus.Active || !isTimerBasedGame) {
            return;
        }

        const remainingSeconds = Math.round(displayTime);

        // OPTIMIZATION: Only run logic if the second has changed.
        if (remainingSeconds === lastAnnouncedSecondRef.current) {
            return;
        }

        lastAnnouncedSecondRef.current = remainingSeconds;

        if (remainingSeconds < 0) return;

        const alreadyAnnounced = currentGame.announcedMilestones || [];

        // Simplified Milestones: 3m -> 1m -> 30s -> Countdown (5-1) -> Finish
        const milestones: Record<number, { key: string, text: string }> = {
            180: { key: 'three_minutes', text: 'Three minutes left' },
            60:  { key: 'one_minute', text: 'Last minute' },
            30:  { key: 'thirty_seconds', text: 'Thirty seconds' },
            5:   { key: 'sound_5', text: 'Five' },
            4:   { key: 'sound_4', text: 'Four' },
            3:   { key: 'sound_3', text: 'Three' },
            2:   { key: 'sound_2', text: 'Two' },
            1:   { key: 'sound_1', text: 'One' },
            0:   { key: 'finish_match', text: 'Last Play' }
        };

        const milestone = milestones[remainingSeconds];

        if (milestone && !alreadyAnnounced.includes(remainingSeconds)) {
            playAnnouncement(milestone.key, milestone.text);
            
            setActiveSession(s => {
                if (!s) return null;
                const games = [...s.games];
                const lastGame = { ...games[games.length - 1] };
                if (!lastGame) return s;
                lastGame.announcedMilestones = [...(lastGame.announcedMilestones || []), remainingSeconds];
                games[games.length - 1] = lastGame;
                return { ...s, games };
            });
        }
    }, [displayTime, currentGame, isTimerBasedGame, activeSession, setActiveSession]);
    
    return { displayTime };
};
