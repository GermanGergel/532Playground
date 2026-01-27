
import { Session, Game, RotationMode, Team } from '../types';

/**
 * Расчитывает следующую очередь и состав матча для 4 команд.
 * Сохраняет привязку команды к стороне поля (Home/Away).
 */
export const calculateNextQueue4 = (
    session: Session,
    finishedGame: Game
): string[] => {
    const currentQueue = session.rotationQueue && session.rotationQueue.length === 4 
        ? session.rotationQueue 
        : session.teams.map(t => t.id);
        
    const [team1Id, team2Id, team3Id, team4Id] = currentQueue;
    
    const isDraw = finishedGame.isDraw;
    const winnerId = finishedGame.winnerTeamId;
    const rotationMode = session.rotationMode || RotationMode.AutoRotate;

    let nextQueue: string[] = [];

    if (isDraw) {
        // НИЧЬЯ: Оба на выход.
        // Очередь: [Wait1, Wait2, Home_Out, Away_Out]
        nextQueue = [team3Id, team4Id, team1Id, team2Id];
    } else {
        const winnerIdActual = winnerId!;
        const winnerTeam = session.teams.find(t => t.id === winnerIdActual);
        const winnerGamesCount = winnerTeam ? (winnerTeam.consecutiveGames || 0) : 0;
        const mustWinnerRotate = rotationMode === RotationMode.AutoRotate && (winnerGamesCount + 1) >= 3;

        if (mustWinnerRotate) {
            // Победитель выиграл 3-ю игру: оба на выход.
            // Победитель уходит в самый конец (Pos 4), проигравший перед ним (Pos 3).
            // Очередь: [Wait1, Wait2, Loser, Winner]
            const loserId = (winnerIdActual === team1Id) ? team2Id : team1Id;
            nextQueue = [team3Id, team4Id, loserId, winnerIdActual];
        } else {
            // СТАНДАРТ: Победитель остается НА СВОЕМ фланге.
            // Новый соперник (team3Id) заходит на место проигравшего.
            if (winnerIdActual === team1Id) {
                // Победитель слева (Pos 1): [Winner_L, New_R, Wait2, Loser_R]
                nextQueue = [team1Id, team3Id, team4Id, team2Id];
            } else {
                // Победитель справа (Pos 2): [New_L, Winner_R, Wait2, Loser_L]
                nextQueue = [team3Id, team2Id, team4Id, team1Id];
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
