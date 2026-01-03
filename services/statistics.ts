import { Session, Player, Team } from '../types';

// Statistics Calculation Utilities

export interface PlayerStats {
    player: Player;
    team: Team;
    goals: number;
    assists: number;
    ownGoals: number;
    gamesPlayed: number;
    wins: number;
    draws: number;
    losses: number;
    cleanSheets: number;
    cleanSheetWins: number;
}

interface TeamStats {
    team: Team;
    gamesPlayed: number;
    wins: number;
    draws: number;
    losses: number;
    goalsFor: number;
    goalsAgainst: number;
    goalDifference: number;
    points: number;
    cleanSheets: number; // Helper to track team clean sheets
}

const getPlayerById = (id: string, players: Player[]) => players.find(p => p.id === id);

/**
 * Unified sorting logic for all player leaderboards and rankings.
 * Priority: 
 * 1. Rating (DESC)
 * 2. Total Contributions (Goals + Assists) (DESC)
 * 3. Win Rate (DESC)
 * 4. Games Played (DESC)
 */
export const sortPlayersByRating = (players: Player[]): Player[] => {
    return [...players].sort((a, b) => {
        // 1. Rating
        if (b.rating !== a.rating) return b.rating - a.rating;

        // 2. Tie-breaker: Goals + Assists
        const scoreA = (a.totalGoals || 0) + (a.totalAssists || 0);
        const scoreB = (b.totalGoals || 0) + (b.totalAssists || 0);
        if (scoreB !== scoreA) return scoreB - scoreA;

        // 3. Tie-breaker: Win Rate
        const wrA = a.totalGames > 0 ? (a.totalWins / a.totalGames) : 0;
        const wrB = b.totalGames > 0 ? (b.totalWins / b.totalGames) : 0;
        if (wrB !== wrA) return wrB - wrA;

        // 4. Tie-breaker: Experience (Total games played)
        return (b.totalGames || 0) - (a.totalGames || 0);
    });
};

export const calculateAllStats = (session: Session) => {
    // Safeguard: ensure teams exists (handle corrupted legacy data)
    const teams = session.teams || [];
    const playerPool = session.playerPool || [];
    const games = session.games || [];

    const playerTeamMap = new Map<string, Team>();
    teams.forEach(team => {
        team.playerIds.forEach(playerId => {
            playerTeamMap.set(playerId, team);
        });
    });

    const allPlayersInSession = teams.flatMap(t => t.playerIds).map(pid => getPlayerById(pid, playerPool)).filter(Boolean) as Player[];

    const playerStats: PlayerStats[] = allPlayersInSession.map(player => {
        const team = playerTeamMap.get(player.id);
        if (!team) return null;
        return {
            player,
            team,
            goals: 0,
            assists: 0,
            ownGoals: 0,
            gamesPlayed: 0,
            wins: 0,
            draws: 0,
            losses: 0,
            cleanSheets: 0,
            cleanSheetWins: 0,
        };
    }).filter(Boolean) as PlayerStats[];

    const teamStats: TeamStats[] = teams.map(team => ({
        team,
        gamesPlayed: 0,
        wins: 0,
        draws: 0,
        losses: 0,
        goalsFor: 0,
        goalsAgainst: 0,
        goalDifference: 0,
        points: 0,
        cleanSheets: 0,
    }));

    games.forEach(game => {
        if (game.status !== 'finished') return;

        const team1Stat = teamStats.find(ts => ts.team.id === game.team1Id);
        const team2Stat = teamStats.find(ts => ts.team.id === game.team2Id);

        if (team1Stat && team2Stat) {
            team1Stat.gamesPlayed++;
            team2Stat.gamesPlayed++;
            
            team1Stat.goalsFor += game.team1Score;
            team2Stat.goalsFor += game.team2Score;
            
            team1Stat.goalsAgainst += game.team2Score;
            team2Stat.goalsAgainst += game.team1Score;

            // Track Clean Sheets (Score against is 0)
            if (game.team2Score === 0) team1Stat.cleanSheets++;
            if (game.team1Score === 0) team2Stat.cleanSheets++;

            if (game.winnerTeamId === team1Stat.team.id) {
                team1Stat.wins++;
                team2Stat.losses++;
                team1Stat.points += 3;
            } else if (game.winnerTeamId === team2Stat.team.id) {
                team2Stat.wins++;
                team1Stat.losses++;
                team2Stat.points += 3;
            } else if (game.isDraw) {
                team1Stat.draws++;
                team2Stat.draws++;
                team1Stat.points += 1;
                team2Stat.points += 1;
            }
        }
        
        game.goals.forEach(goal => {
            const scorerStat = playerStats.find(ps => ps.player.id === goal.scorerId);
            const assistantStat = playerStats.find(ps => ps.player.id === goal.assistantId);

            if (goal.isOwnGoal) {
                if (scorerStat) scorerStat.ownGoals++;
            } else {
                if (scorerStat) scorerStat.goals++;
                if (assistantStat) assistantStat.assists++;
            }
        });
        
        // Update Individual Stats based on Game Result
        const team1 = teams.find(t => t.id === game.team1Id);
        const team2 = teams.find(t => t.id === game.team2Id);
        if (!team1 || !team2) return;
        
        const participatingPlayerIds = new Set([...team1.playerIds, ...team2.playerIds]);
        
        playerStats.forEach(ps => {
            if (participatingPlayerIds.has(ps.player.id)) {
                ps.gamesPlayed++;
                
                // Add Clean Sheet to individual stats if their team kept a clean sheet in this game
                const isTeam1 = ps.team.id === game.team1Id;
                const conceded = isTeam1 ? game.team2Score : game.team1Score;
                if (conceded === 0) ps.cleanSheets++;

                if(game.winnerTeamId === ps.team.id) {
                    ps.wins++;
                    if (conceded === 0) {
                        ps.cleanSheetWins++;
                    }
                }
                else if (game.isDraw) ps.draws++;
                else ps.losses++;
            }
        });
    });

    teamStats.forEach(ts => {
        ts.goalDifference = ts.goalsFor - ts.goalsAgainst;
    });

    // Sort stats
    teamStats.sort((a, b) => b.points - a.points || b.goalDifference - a.goalDifference || b.goalsFor - a.goalsFor);
    
    return { teamStats, allPlayersStats: playerStats };
};

// KEY STATS CALCULATION
export const getPlayerKeyStats = (player: Player): { isTopScorer: boolean; isTopWinner: boolean } => {
    if (player.totalGames < 10) { // Require more games for key stats
        return { isTopScorer: false, isTopWinner: false };
    }

    const avgOffense = (player.totalGoals + player.totalAssists) / player.totalGames;
    const winRate = (player.totalWins / player.totalGames) * 100;

    // Thresholds for what is considered "elite" or a "key stat"
    const isTopScorer = avgOffense >= 1.5; // e.g., averages 1.5 goal contributions per game
    const isTopWinner = winRate >= 75; // e.g., wins 75% or more of their games

    return { isTopScorer, isTopWinner };
};