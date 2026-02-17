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

const getPlayerById = (id: string, sessionPool: Player[], globalPool: Player[]) => {
    return sessionPool.find(p => p.id === id) || globalPool.find(p => p.id === id);
};

export const calculateAllStats = (session: Session, globalPlayers: Player[] = []) => {
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

    // FUTURE FIX: Get all unique IDs from teams and find their profile objects
    // If player is not in session.playerPool, find them in globalPlayers (the backup)
    const allUniqueParticipantIds = Array.from(new Set(teams.flatMap(t => t.playerIds)));
    
    const allPlayersInSession = allUniqueParticipantIds
        .map(pid => getPlayerById(pid, playerPool, globalPlayers))
        .filter(Boolean) as Player[];

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

// ... (remaining statistics logic kept intact)
export const getPlayerKeyStats = (player: Player): { isTopScorer: boolean; isTopWinner: boolean } => {
    if (player.totalGames < 10) { return { isTopScorer: false, isTopWinner: false }; }
    const avgOffense = (player.totalGoals + player.totalAssists) / player.totalGames;
    const winRate = (player.totalWins / player.totalGames) * 100;
    return { isTopScorer: avgOffense >= 1.5, isTopWinner: winRate >= 75 };
};

export const calculatePlayerMonthlyStats = (playerId: string, history: Session[]) => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const stats = { goals: 0, assists: 0, wins: 0, games: 0, sessions: 0 };
    history.forEach(session => {
        const sDate = new Date(session.date);
        if (sDate.getMonth() === currentMonth && sDate.getFullYear() === currentYear && session.status === 'completed') {
            const playerInSession = session.playerPool.some(p => p.id === playerId) || session.teams.some(t => t.playerIds.includes(playerId));
            if (playerInSession) {
                stats.sessions++;
                const defaultTeam = session.teams.find(t => t.playerIds.includes(playerId));
                session.games.forEach(game => {
                    if (game.status === 'finished') {
                        game.goals.forEach(g => {
                            if (g.scorerId === playerId && !g.isOwnGoal) stats.goals++;
                            if (g.assistantId === playerId) stats.assists++;
                        });
                        let playedForTeamId: string | undefined;
                        const legionnaireMove = game.legionnaireMoves?.find(m => m.playerId === playerId && (m.toTeamId === game.team1Id || m.toTeamId === game.team2Id));
                        if (legionnaireMove) playedForTeamId = legionnaireMove.toTeamId;
                        else if (defaultTeam) {
                            if (game.team1Id === defaultTeam.id) playedForTeamId = defaultTeam.id;
                            else if (game.team2Id === defaultTeam.id) playedForTeamId = defaultTeam.id;
                        }
                        if (playedForTeamId) {
                            stats.games++;
                            if (game.winnerTeamId === playedForTeamId) stats.wins++;
                        }
                    }
                });
            }
        }
    });
    return stats;
};

export const getTotmPlayerIds = (history: Session[], allPlayers: Player[]): Set<string> => {
    if (!history || history.length === 0 || allPlayers.length < 5) return new Set();
    const today = new Date();
    const lastDayOfPrevMonth = new Date(today.getFullYear(), today.getMonth(), 0);
    const tMonth = lastDayOfPrevMonth.getMonth();
    const tYear = lastDayOfPrevMonth.getFullYear();
    const targetSessions = history.filter(s => {
        if (!s || !s.date) return false;
        try {
            const d = new Date(s.date);
            return d.getMonth() === tMonth && d.getFullYear() === tYear;
        } catch { return false; }
    }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    if (targetSessions.length === 0) return new Set();
    const stats: Record<string, { goals: number, assists: number, wins: number, games: number, cleanSheets: number, lastOvr: number }> = {};
    targetSessions.forEach(session => {
        const teams = session.teams || [];
        const games = session.games || [];
        session.playerPool.forEach(p => {
            if (!stats[p.id]) stats[p.id] = { goals: 0, assists: 0, wins: 0, games: 0, cleanSheets: 0, lastOvr: 0 };
            stats[p.id].lastOvr = p.rating;
        });
        games.forEach(game => {
            if (game.status !== 'finished') return;
            const score1 = game.team1Score;
            const score2 = game.team2Score;
            const t1 = teams.find(t => t.id === game.team1Id);
            const t2 = teams.find(t => t.id === game.team2Id);
            t1?.playerIds?.forEach(pid => { if(stats[pid]) stats[pid].games++ });
            t2?.playerIds?.forEach(pid => { if(stats[pid]) stats[pid].games++ });
            if (score1 > score2) {
                t1?.playerIds?.forEach(pid => { if(stats[pid]) stats[pid].wins++ });
                if (score2 === 0) t1?.playerIds?.forEach(pid => { if(stats[pid]) stats[pid].cleanSheets++ });
            } else if (score2 > score1) {
                t2?.playerIds?.forEach(pid => { if(stats[pid]) stats[pid].wins++ });
                if (score1 === 0) t2?.playerIds?.forEach(pid => { if(stats[pid]) stats[pid].cleanSheets++ });
            }
            game.goals.forEach(g => {
                if (!g.isOwnGoal && g.scorerId && stats[g.scorerId]) stats[g.scorerId].goals++;
                if (g.assistantId && stats[g.assistantId]) stats[g.assistantId].assists++;
            });
        });
    });
    const candidates = allPlayers.filter(p => stats[p.id] && stats[p.id].games >= 2);
    if (candidates.length < 3) return new Set();
    const corePool = candidates.filter(p => stats[p.id].games >= 4);
    const reservePool = candidates.filter(p => stats[p.id].games < 4);
    const pickBest = (criteriaFn: (pid: string) => number, tieBreakerFn: (pid: string) => number, excludeIds: Set<string>): string | null => {
        let pool = corePool.filter(p => !excludeIds.has(p.id));
        if (pool.length === 0) pool = reservePool.filter(p => !excludeIds.has(p.id));
        if (pool.length === 0) return null;
        const winner = pool.sort((a, b) => {
            const valA = criteriaFn(a.id);
            const valB = criteriaFn(b.id);
            if (valB !== valA) return valB - valA; 
            return tieBreakerFn(b.id) - tieBreakerFn(a.id);
        })[0];
        return winner ? winner.id : null;
    };
    const winners = new Set<string>();
    const getHistOvr = (pid: string) => stats[pid].lastOvr;
    const getG = (pid: string) => stats[pid].goals;
    const getA = (pid: string) => stats[pid].assists;
    const getW = (pid: string) => stats[pid].wins;
    const getCS = (pid: string) => stats[pid].cleanSheets;
    const getGP = (pid: string) => stats[pid].games;
    const mvpId = pickBest(getHistOvr, pid => getG(pid) + getA(pid), winners);
    if (mvpId) winners.add(mvpId);
    const sniperId = pickBest(getG, pid => -getGP(pid), winners);
    if (sniperId) winners.add(sniperId);
    const architectId = pickBest(getA, getG, winners);
    if (architectId) winners.add(architectId);
    const winnerId = pickBest(getW, getGP, winners);
    if (winnerId) winners.add(winnerId);
    const fortressId = pickBest(getCS, getGP, winners);
    if (fortressId) winners.add(fortressId);
    return winners;
};