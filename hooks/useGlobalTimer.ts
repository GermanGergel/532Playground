import React from 'react';
import { Session, GameStatus } from '../types';
import { speak } from '../lib';

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

    // --- GLOBAL VOICE ASSISTANT LOGIC (OPTIMIZED) ---
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

        const milestones = activeSession.matchDurationMinutes === 7
            ? { 300: 'Five minutes', 180: 'Three minutes', 120: 'Two minutes', 60: 'One minute', 30: 'Thirty seconds', 5: 'Five', 4: 'Four', 3: 'Three', 2: 'Two', 1: 'One', 0: 'Last action' }
            : { 180: 'Three minutes', 60: 'One minute', 30: 'Thirty seconds', 5: 'Five', 4: 'Four', 3: 'Three', 2: 'Two', 1: 'One', 0: 'Last action' };

        const milestoneToAnnounce = Object.keys(milestones)
            .map(Number)
            .find(sec => remainingSeconds === sec && !alreadyAnnounced.includes(sec));

        if (milestoneToAnnounce !== undefined) {
            speak(milestones[milestoneToAnnounce as keyof typeof milestones]);
            setActiveSession(s => {
                if (!s) return null;
                const games = [...s.games];
                const lastGame = { ...games[games.length - 1] };
                if (!lastGame) return s;
                lastGame.announcedMilestones = [...(lastGame.announcedMilestones || []), milestoneToAnnounce];
                games[games.length - 1] = lastGame;
                return { ...s, games };
            });
        }
    }, [displayTime, currentGame, isTimerBasedGame, activeSession, setActiveSession]);
    
    return { displayTime };
};