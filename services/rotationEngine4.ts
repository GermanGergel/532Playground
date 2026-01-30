
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
 * Включает логику "Справедливости" (Fairness Logic): приоритет команде с меньшим числом игр.
 */
export const calculateNextQueue4 = (
    session: Session,
    finishedGame: Game
): string[] => {
    const currentQueue = session.rotationQueue && session.rotationQueue.length === 4 
        ? session.rotationQueue 
        : session.teams.map(t => t.id);
        
    // Deconstruct current state: [Home, Away, Bench1, Bench2]
    const [team1Id, team2Id, wait1Id, wait2Id] = currentQueue;
    
    // --- FAIRNESS LOGIC ---
    // Check who has played fewer games among the bench players.
    // If the 2nd team on bench has fewer games than the 1st, they jump the queue.
    const gamesWait1 = countGamesPlayed(session, wait1Id);
    const gamesWait2 = countGamesPlayed(session, wait2Id);

    let challengerId = wait1Id;
    let remainingBenchId = wait2Id;

    if (gamesWait2 < gamesWait1) {
        // Swap priority because Wait2 played fewer games
        challengerId = wait2Id;
        remainingBenchId = wait1Id;
    }
    // ----------------------

    const isDraw = finishedGame.isDraw;
    const winnerId = finishedGame.winnerTeamId;
    const rotationMode = session.rotationMode || RotationMode.AutoRotate;

    let nextQueue: string[] = [];

    if (isDraw) {
        // НИЧЬЯ: Оба на выход.
        // На поле выходят оба со скамейки.
        // Порядок выхода (Home/Away) сохраняем согласно их приоритету (challenger идет первым).
        // Очередь: [New_Home, New_Away, Old_Home, Old_Away]
        nextQueue = [challengerId, remainingBenchId, team1Id, team2Id];
    } else {
        const winnerIdActual = winnerId!;
        const winnerTeam = session.teams.find(t => t.id === winnerIdActual);
        const winnerGamesCount = winnerTeam ? (winnerTeam.consecutiveGames || 0) : 0;
        const mustWinnerRotate = rotationMode === RotationMode.AutoRotate && (winnerGamesCount + 1) >= 3;

        if (mustWinnerRotate) {
            // Победитель выиграл 3-ю игру: оба на выход.
            // Победитель уходит в самый конец (Pos 4), проигравший перед ним (Pos 3).
            // На поле выходят оба со скамейки.
            const loserId = (winnerIdActual === team1Id) ? team2Id : team1Id;
            nextQueue = [challengerId, remainingBenchId, loserId, winnerIdActual];
        } else {
            // СТАНДАРТ: Победитель остается НА СВОЕМ фланге.
            // Challenger заходит на место проигравшего.
            // RemainingBench остается ждать (но теперь он стал первым в очереди на скамейке).
            // Проигравший уходит в самый конец.
            
            if (winnerIdActual === team1Id) {
                // Победитель слева (Pos 1).
                // Next Queue: [Winner, Challenger, Bench_Next, Loser]
                nextQueue = [team1Id, challengerId, remainingBenchId, team2Id];
            } else {
                // Победитель справа (Pos 2).
                // Next Queue: [Challenger, Winner, Bench_Next, Loser]
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
