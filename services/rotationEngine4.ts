
import { Session, Game, RotationMode, Team } from '../types';

/**
 * Вспомогательная функция для подсчета завершенных игр команды в сессии.
 */
const countGamesPlayed = (session: Session, teamId: string): number => {
    return session.games.filter(g => 
        g.status === 'finished' && (g.team1Id === teamId || g.team2Id === teamId)
    ).length;
};

/**
 * Расчитывает следующую очередь для 4 команд.
 * 
 * НОВАЯ ЛОГИКА (Спортивная справедливость):
 * 1. Очередь на лавке (Pos 3 и Pos 4) неизменна. Кто первый сел, тот первый вышел.
 * 2. Приоритет по играм («Лояльность») работает ТОЛЬКО в момент, когда две команды 
 *    уходят с поля одновременно (ничья или ротация чемпиона).
 *    В этом случае тот, кто меньше играл за вечер, садится на Pos 3, а кто больше — на Pos 4.
 */
export const calculateNextQueue4 = (
    session: Session,
    finishedGame: Game
): string[] => {
    const currentQueue = session.rotationQueue && session.rotationQueue.length === 4 
        ? session.rotationQueue 
        : session.teams.map(t => t.id);
        
    // Структура очереди: [Team_Home, Team_Away, Bench_Pos3, Bench_Pos4]
    const [team1Id, team2Id, wait1Id, wait2Id] = currentQueue;
    
    const isDraw = finishedGame.isDraw;
    const winnerId = finishedGame.winnerTeamId;
    const rotationMode = session.rotationMode || RotationMode.AutoRotate;

    let nextQueue: string[] = [];

    // Проверяем, нужно ли победителю уйти (правило 3-х побед в AutoRotate)
    let mustWinnerRotate = false;
    if (!isDraw && winnerId && rotationMode === RotationMode.AutoRotate) {
        const winnerTeam = session.teams.find(t => t.id === winnerId);
        if (winnerTeam && (winnerTeam.consecutiveGames || 0) + 1 >= 3) {
            mustWinnerRotate = true;
        }
    }

    if (isDraw || mustWinnerRotate) {
        /**
         * СЦЕНАРИЙ: УХОДЯТ ДВОЕ
         * На поле выходят: wait1Id (Home) и wait2Id (Away).
         * На лавку садятся: team1Id и team2Id.
         * ПРИОРИТЕТ: Кто меньше играл за сессию, тот на Pos 3 (выйдет раньше).
         */
        const gamesT1 = countGamesPlayed(session, team1Id);
        const gamesT2 = countGamesPlayed(session, team2Id);

        let betterBenchId, worseBenchId;

        if (gamesT1 < gamesT2) {
            betterBenchId = team1Id;
            worseBenchId = team2Id;
        } else if (gamesT2 < gamesT1) {
            betterBenchId = team2Id;
            worseBenchId = team1Id;
        } else {
            // Если игр поровну, сохраняем порядок: Home -> Pos 3, Away -> Pos 4
            betterBenchId = team1Id;
            worseBenchId = team2Id;
        }

        nextQueue = [wait1Id, wait2Id, betterBenchId, worseBenchId];
    } else {
        /**
         * СЦЕНАРИЙ: ПОБЕДИТЕЛЬ ОСТАЕТСЯ (СТАНДАРТ)
         * Победитель остается на своем фланге.
         * wait1Id заходит на место проигравшего.
         * Проигравший идет в самый конец (Pos 4).
         * wait2Id перемещается на Pos 3.
         */
        if (winnerId === team1Id) {
            // Победитель был Home (Pos 1)
            nextQueue = [team1Id, wait1Id, wait2Id, team2Id];
        } else {
            // Победитель был Away (Pos 2)
            nextQueue = [wait1Id, team2Id, wait2Id, team1Id];
        }
    }

    return nextQueue.length === 4 ? nextQueue : currentQueue;
};

/**
 * Инициализирует случайную очередь для 4 команд в начале сессии.
 */
export const initializeQueue4 = (teams: Team[]): string[] => {
    const ids = teams.map(t => t.id);
    return [...ids].sort(() => Math.random() - 0.5);
};
