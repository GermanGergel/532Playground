import { Session, Player, Team, Game, Goal, EventLogEntry, EventType, GoalPayload, StartRoundPayload, SubPayload, PlayerTier, BadgeType, RatingBreakdown } from '../types';
import { PlayerStats } from './statistics';

// RATING CALCULATION LOGIC
export const getTierForRating = (rating: number): PlayerTier => {
    if (rating >= 89) return PlayerTier.Legend;
    if (rating >= 79) return PlayerTier.Elite;
    if (rating >= 69) return PlayerTier.Strong;
    if (rating >= 58) return PlayerTier.Average;
    return PlayerTier.Developing;
};

// --- "532 PRO" HYBRID RATING ENGINE with MATCH CONTEXT & REPUTATION ---
export const calculateRatingUpdate = (player: Player, stats: PlayerStats, session: Session, earnedBadges: BadgeType[]): { delta: number, breakdown: RatingBreakdown } => {
    const playerGames = session.games.filter(g => g.status === 'finished' && (
        session.teams.find(t => t.id === g.team1Id)?.playerIds.includes(player.id) ||
        session.teams.find(t => t.id === g.team2Id)?.playerIds.includes(player.id)
    ));

    const defaultReturn = {
        delta: 0,
        breakdown: {
            previousRating: player.rating,
            teamPerformance: 0,
            individualPerformance: 0,
            badgeBonus: 0,
            finalChange: 0,
            newRating: player.rating,
        }
    };

    if (playerGames.length === 0) return defaultReturn;

    // 1. Identify Roles
    const skills = player.skills || [];
    const isDefensive = skills.includes('goalkeeper') || skills.includes('defender');
    const isPlaymaker = skills.includes('playmaker');
    const isAttacker = skills.includes('finisher') || skills.includes('power_shot');

    let totalTeamPoints = 0;
    let totalIndividualPoints = 0;

    playerGames.forEach(game => {
        let teamPoints = 0;
        let individualPoints = 0;

        const myTeam = session.teams.find(t => t.playerIds.includes(player.id));
        if (!myTeam) return;

        const isTeam1 = game.team1Id === myTeam.id;
        const myScore = isTeam1 ? game.team1Score : game.team2Score;
        const oppScore = isTeam1 ? game.team2Score : game.team1Score;
        const goalDiff = myScore - oppScore;

        // A. TEAM SUCCESS with CONTEXT
        if (game.isDraw) {
            teamPoints += 0.4;
        } else if (game.winnerTeamId === myTeam.id) {
            if (goalDiff >= 2) {
                teamPoints += 1.3; // Dominant Win
            } else {
                let trailed = false;
                let myTeamScoreTracker = 0, oppScoreTracker = 0;
                const sortedGoals = [...game.goals].sort((a,b) => a.timestampSeconds - b.timestampSeconds);
                for (const goal of sortedGoals) {
                     if ((goal.teamId === myTeam.id && !goal.isOwnGoal) || (goal.teamId !== myTeam.id && goal.isOwnGoal)) myTeamScoreTracker++;
                     else oppScoreTracker++;
                     if (oppScoreTracker > myTeamScoreTracker) trailed = true;
                }
                if (trailed) teamPoints += 1.5; // Comeback Win
                else teamPoints += 1.0; // Standard Win
            }
        } else { // Loss
            if (goalDiff <= -2) teamPoints -= 0.8; // Heavy Loss
            else teamPoints -= 0.5; // Standard loss
        }
        
        // B. INDIVIDUAL IMPACT
        const myGoals = game.goals.filter(g => g.scorerId === player.id && !g.isOwnGoal).length;
        const myAssists = game.goals.filter(g => g.assistantId === player.id).length;
        const myOwnGoals = game.goals.filter(g => g.scorerId === player.id && g.isOwnGoal).length;

        if (oppScore === 0) individualPoints += isDefensive ? 2.0 : 1.0; // Clean Sheet bonus
        individualPoints += myGoals * (isAttacker ? 1.2 : 1.0);
        individualPoints += myAssists * (isPlaymaker ? 1.0 : 0.7);
        individualPoints += myOwnGoals * -1.5;

        totalTeamPoints += teamPoints;
        totalIndividualPoints += individualPoints;
    });

    // 3. Calculate Average Match Rating & Apply Badge Bonuses
    const numGames = playerGames.length;
    const avgTeamPoints = numGames > 0 ? totalTeamPoints / numGames : 0;
    const avgIndividualPoints = numGames > 0 ? totalIndividualPoints / numGames : 0;
    
    let avgMatchRating = 6.0 + avgTeamPoints + avgIndividualPoints;
    let badgeBonusPoints = 0;
    
    const badgeBonuses: Partial<Record<BadgeType, number>> = {
        mvp: 0.4, dynasty: 0.4, goleador: 0.3, assistant: 0.3, fortress: 0.3,
        decisive_factor: 0.2, comeback_kings: 0.2, sniper: 0.2, unsung_hero: 0.2,
        first_blood: 0.1, perfect_finish: 0.1, duplet: 0.1, maestro: 0.1,
    };
    
    for (const badge of earnedBadges) {
        if (badge in badgeBonuses) {
            const bonus = badgeBonuses[badge as keyof typeof badgeBonuses]!;
            avgMatchRating += bonus;
            badgeBonusPoints += bonus;
        }
    }

    const performanceLevel = Math.max(40, Math.min(99, avgMatchRating * 10));
    const diff = performanceLevel - player.rating;

    // 4. Apply FIFA-like Experience Scale
    let kFactor: number;
    if (player.totalSessionsPlayed < 3) kFactor = 0.25;
    else if (player.totalSessionsPlayed < 15) kFactor = 0.1;
    else if (player.totalSessionsPlayed < 30) kFactor = 0.07;
    else kFactor = 0.04;

    // 5. Calculate Change & Add Dominance Bonus
    let delta = diff * kFactor;
    const winRate = stats.gamesPlayed > 0 ? stats.wins / stats.gamesPlayed : 0;
    if (winRate >= 0.75) delta += 0.3;
    if (winRate <= 0.20) delta -= 0.3;
    
    if (stats.wins === 0 && stats.goals === 0 && stats.assists === 0 && stats.cleanSheets === 0) {
        delta -= 0.5;
    }

    // 6. Safety Cap
    const cap = player.totalSessionsPlayed < 3 ? 3.0 : 2.0;
    const finalDelta = Math.max(-cap, Math.min(cap, delta));

    const breakdown: RatingBreakdown = {
        previousRating: player.rating,
        teamPerformance: avgTeamPoints,
        individualPerformance: avgIndividualPoints,
        badgeBonus: badgeBonusPoints,
        finalChange: finalDelta,
        newRating: Math.round(player.rating + finalDelta),
    };

    return { delta: finalDelta, breakdown };
};


// --- BADGE ENGINE (16 Badges) ---
export const calculateEarnedBadges = (
    player: Player, 
    stats: PlayerStats, 
    session: Session, 
    allPlayersStats: PlayerStats[]
): BadgeType[] => {
    const earned = new Set<BadgeType>();
    
    // Helper to add a badge to the set for this session
    const addBadge = (b: BadgeType) => earned.add(b);
    
    const playerGames = session.games.filter(g => g.status === 'finished' && (
        session.teams.find(t => t.id === g.team1Id)?.playerIds.includes(player.id) ||
        session.teams.find(t => t.id === g.team2Id)?.playerIds.includes(player.id)
    ));

    // 1. SESSION AGGREGATES
    if (stats.goals >= 7) addBadge('goleador');
    if (stats.assists >= 6) addBadge('assistant');
    if (stats.goals >= 5 && stats.assists >= 5 && stats.wins >= 5) addBadge('mvp');

    // 2. GAME-LEVEL ANALYSIS
    let perfectFinishCount = 0; // 2 goals in a game
    let sniperCount = 0; // Winning goal
    let firstBloodCount = 0; // First goal of the game
    let dupletCount = 0; // 2 goals (Used for Duplet badge)
    let maestroCount = 0; // 2 assists in a game
    let comebackCount = 0; // Wins after trailing
    let fortressCount = 0; // Clean sheets
    
    // 3. TEAM-LEVEL ANALYSIS
    // Find winningest team
    const teamWins = session.teams.map(t => {
        const wins = session.games.filter(g => g.status === 'finished' && g.winnerTeamId === t.id).length;
        return { id: t.id, wins };
    });
    const maxWins = Math.max(...teamWins.map(t => t.wins));
    const winningestTeams = teamWins.filter(t => t.wins === maxWins && t.wins >= 3).map(t => t.id); // Min 3 wins to qualify

    // Unsung Hero: In winningest team, 0G 0A
    const playerTeam = session.teams.find(t => t.playerIds.includes(player.id));
    if (playerTeam && winningestTeams.includes(playerTeam.id) && stats.goals === 0 && stats.assists === 0) {
        addBadge('unsung_hero');
    }

    // Decisive Factor: Goal or Assist in EVERY win
    const myWins = playerGames.filter(g => {
        const myTeam = session.teams.find(t => t.playerIds.includes(player.id));
        return myTeam && g.winnerTeamId === myTeam.id;
    });
    if (myWins.length >= 3) { // Min 3 wins
        const contributedInAll = myWins.every(g => {
            const myGoals = g.goals.filter(goal => goal.scorerId === player.id).length;
            const myAssists = g.goals.filter(goal => goal.assistantId === player.id).length;
            return myGoals > 0 || myAssists > 0;
        });
        if (contributedInAll) addBadge('decisive_factor');
    }

    // Loop through games for detail stats
    playerGames.forEach(g => {
        const myTeam = session.teams.find(t => t.playerIds.includes(player.id));
        if (!myTeam) return;

        const isMyTeamWinner = g.winnerTeamId === myTeam.id;
        const myGoals = g.goals.filter(goal => goal.scorerId === player.id);
        const myAssists = g.goals.filter(goal => goal.assistantId === player.id);
        
        // Duplet / Perfect Finish
        if (myGoals.length >= 2) {
            dupletCount++;
            const myTeamScore = g.team1Id === myTeam.id ? g.team1Score : g.team2Score;
            // FIX: goalsToWin is a session-level property, not game-level.
            if (myTeamScore === 2 && myGoals.length === 2 && session.goalsToWin === 2) {
                perfectFinishCount++;
            }
        }

        // Maestro
        if (myAssists.length >= 2) maestroCount++;

        // Fortress (Clean Sheet)
        const opponentScore = g.team1Id === myTeam.id ? g.team2Score : g.team1Score;
        if (opponentScore === 0) fortressCount++;

        // First Blood
        if (g.goals.length > 0) {
            const sortedGoals = [...g.goals].sort((a,b) => a.timestampSeconds - b.timestampSeconds);
            if (sortedGoals[0].scorerId === player.id) firstBloodCount++;
        }

        // Sniper & Comeback
        if (isMyTeamWinner) {
            const sortedGoals = [...g.goals].sort((a,b) => a.timestampSeconds - b.timestampSeconds);
            let scoreA = 0;
            let scoreB = 0;
            const myTeamIsA = g.team1Id === myTeam.id;
            let trailed = false;

            for (const gl of sortedGoals) {
                const goalForA = (gl.teamId === g.team1Id && !gl.isOwnGoal) || (gl.teamId === g.team2Id && gl.isOwnGoal);
                if (goalForA) scoreA++; else scoreB++;
                
                const myScore = myTeamIsA ? scoreA : scoreB;
                const oppScore = myTeamIsA ? scoreB : scoreA;
                if (oppScore > myScore) trailed = true;
            }
            if(trailed) comebackCount++;
            
            const lastGoal = sortedGoals[sortedGoals.length - 1];
            const myTeamWonByOne = Math.abs(g.team1Score - g.team2Score) === 1;
            if (lastGoal.scorerId === player.id && myTeamWonByOne) {
                sniperCount++;
            }
        }
    });

    if (perfectFinishCount >= 3) addBadge('perfect_finish');
    if (sniperCount >= 3) addBadge('sniper');
    if (firstBloodCount >= 5) addBadge('first_blood');
    if (dupletCount >= 2) addBadge('duplet');
    if (maestroCount >= 2) addBadge('maestro');
    if (comebackCount >= 3) addBadge('comeback_kings');
    if (fortressCount >= 3) addBadge('fortress');

    // Dynasty: 9 wins in a row
    let currentWinStreak = 0;
    let maxWinStreak = 0;
    session.games.filter(g => g.status === 'finished').forEach(g => {
        const myTeam = session.teams.find(t => t.playerIds.includes(player.id));
        const myTeamInGame = myTeam && (g.team1Id === myTeam.id || g.team2Id === myTeam.id);

        if (myTeamInGame && g.winnerTeamId === myTeam.id) {
            currentWinStreak++;
        } else if (myTeamInGame) {
            currentWinStreak = 0;
        }
        if (currentWinStreak > maxWinStreak) maxWinStreak = currentWinStreak;
    });
    if (maxWinStreak >= 9) addBadge('dynasty');


    // 4. CAREER MILESTONES
    const totalG = player.totalGoals + stats.goals;
    const totalA = player.totalAssists + stats.assists;
    const totalSess = (player.totalSessionsPlayed || 0) + 1;

    if ([40, 60, 80].some(milestone => totalG >= milestone && player.totalGoals < milestone)) addBadge('club_legend_goals');
    if ([40, 60, 80].some(milestone => totalA >= milestone && player.totalAssists < milestone)) addBadge('club_legend_assists');
    if ([20, 50].some(milestone => totalSess >= milestone && (player.totalSessionsPlayed || 0) < milestone)) addBadge('veteran');

    return Array.from(earned);
};