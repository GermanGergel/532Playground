
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

    // --- GLOBAL VOICE ASSISTANT LOGIC (UPDATED FOR AUDIO ASSETS) ---
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

        // Map seconds to { key: string, fallback: string }
        const milestones: Record<number, { key: string, text: string }> = {
            300: { key: 'five_minutes', text: 'Five minutes remaining' },
            180: { key: 'three_minutes', text: 'Three minutes remaining' },
            120: { key: 'two_minutes', text: 'Two minutes warning' },
            60:  { key: 'one_minute', text: 'Last minute' },
            30:  { key: 'thirty_seconds', text: 'Thirty seconds' },
            10:  { key: 'ten', text: 'Ten' },
            9:   { key: 'nine', text: 'Nine' },
            8:   { key: 'eight', text: 'Eight' },
            7:   { key: 'seven', text: 'Seven' },
            6:   { key: 'six', text: 'Six' },
            5:   { key: 'five', text: 'Five' },
            4:   { key: 'four', text: 'Four' },
            3:   { key: 'three', text: 'Three' },
            2:   { key: 'two', text: 'Two' },
            1:   { key: 'one', text: 'One' },
            0:   { key: 'finish_match', text: 'Time is up' }
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
