
import { Session, Game, RotationMode, Team } from '../types';

/**
 * Helper to count finished games for a specific team in the current session.
 */
const countGamesPlayed = (session: Session, teamId: string): number => {
    return session.games.filter(g => 
        g.status === 'finished' && (g.team1Id === teamId || g.team2Id === teamId)
    ).length;
};

/**
 * Расчитывает следующую очередь и состав матча для 4 команд.
 * Сохраняет привязку команды к стороне поля (Home/Away).
 * 
 * ОБНОВЛЕННАЯ ЛОГИКА «Порог значимости»:
 * Приоритет отдается живой очереди (FIFO). Команда с позиции 4 может 
 * перепрыгнуть команду с позиции 3 ТОЛЬКО если разница в сыгранных матчах составляет 2 и более.
 */
export const calculateNextQueue4 = (
    session: Session,
    finishedGame: Game
): string[] => {
    const currentQueue = session.rotationQueue && session.rotationQueue.length === 4 
        ? session.rotationQueue 
        : session.teams.map(t => t.id);
        
    // Deconstruct current state: [Home, Away, Bench1 (Pos 3), Bench2 (Pos 4)]
    const [team1Id, team2Id, wait1Id, wait2Id] = currentQueue;
    
    // --- HYBRID FAIRNESS LOGIC (Significance Threshold) ---
    const gamesWait1 = countGamesPlayed(session, wait1Id);
    const gamesWait2 = countGamesPlayed(session, wait2Id);

    let challengerId = wait1Id;
    let remainingBenchId = wait2Id;

    /**
     * ПРАВИЛО: Перепрыгнуть очередь можно только если разница >= 2 игр.
     * Если разница 0 или 1 — соблюдаем порядок, в котором команды пришли на скамейку.
     */
    if ((gamesWait1 - gamesWait2) >= 2) {
        // Команда на Pos 4 (wait2) засиделась гораздо сильнее (на 2+ игры меньше сыграно)
        challengerId = wait2Id;
        remainingBenchId = wait1Id;
    }
    // ------------------------------------------------------

    const isDraw = finishedGame.isDraw;
    const winnerId = finishedGame.winnerTeamId;
    const rotationMode = session.rotationMode || RotationMode.AutoRotate;

    let nextQueue: string[] = [];

    if (isDraw) {
        // НИЧЬЯ: Обе команды уходят.
        // На поле выходят обе отдыхавшие команды согласно определенному приоритету.
        nextQueue = [challengerId, remainingBenchId, team1Id, team2Id];
    } else {
        const winnerIdActual = winnerId!;
        const winnerTeam = session.teams.find(t => t.id === winnerIdActual);
        const winnerGamesCount = winnerTeam ? (winnerTeam.consecutiveGames || 0) : 0;
        const mustWinnerRotate = rotationMode === RotationMode.AutoRotate && (winnerGamesCount + 1) >= 3;

        if (mustWinnerRotate) {
            // Победитель выиграл 3-ю игру (Auto-Rotate): оба на выход.
            const loserId = (winnerIdActual === team1Id) ? team2Id : team1Id;
            nextQueue = [challengerId, remainingBenchId, loserId, winnerIdActual];
        } else {
            // СТАНДАРТ: Победитель остается НА СВОЕМ фланге.
            // Претендент (Challenger) заходит на место проигравшего.
            if (winnerIdActual === team1Id) {
                // Победитель был Home (Pos 1)
                nextQueue = [team1Id, challengerId, remainingBenchId, team2Id];
            } else {
                // Победитель был Away (Pos 2)
                nextQueue = [challengerId, team2Id, remainingBenchId, team1Id];
            }
        }
    }

    return nextQueue.length === 4 ? nextQueue : currentQueue;
};

/**
 * Инициализирует случайную очередь для 4 команд.
 */
export const initializeQueue4 = (teams: Team[]): string[] => {
    const ids = teams.map(t => t.id);
    return [...ids].sort(() => Math.random() - 0.5);
};
