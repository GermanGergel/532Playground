
import { Session, Player, Team, Game, Goal, EventLogEntry, EventType, GoalPayload, StartRoundPayload, SubPayload, PlayerTier, BadgeType, RatingBreakdown } from '../types';
import { PlayerStats } from './statistics';

// RATING CALCULATION LOGIC
export const getTierForRating = (rating: number): PlayerTier => {
    if (rating >= 87) return PlayerTier.Legend;
    if (rating >= 79) return PlayerTier.Elite;
    if (rating >= 73) return PlayerTier.Pro;
    return PlayerTier.Regular;
};

// --- "532 PRO" HYBRID RATING ENGINE with MATCH CONTEXT & REPUTATION ---
export const calculateRatingUpdate = (player: Player, stats: PlayerStats, session: Session, earnedBadges: BadgeType[]): { delta: number, breakdown: RatingBreakdown } => {
    // Simplified logic for 2-team sessions
    if (session.numTeams === 2) {
        let delta = 0.1; // Draw by default
        if (stats.wins > stats.losses) {
            delta = 0.5; // Win
        } else if (stats.losses > stats.wins) {
            delta = -0.3; // Loss
        }
        const newRating = Math.round(player.rating + delta);
        return {
            delta,
            breakdown: {
                previousRating: player.rating,
                teamPerformance: delta, // Simplified
                individualPerformance: 0,
                badgeBonus: 0,
                finalChange: delta,
                newRating: newRating,
                badgesEarned: earnedBadges,
            }
        };
    }

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
            badgesEarned: [],
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
        // new badges
        session_top_scorer: 0.3, session_top_assistant: 0.3, win_leader: 0.3,
        ten_influence: 0.25, iron_streak: 0.25, undefeated: 0.25,
        key_player: 0.2, mastery_balance: 0.2, team_conductor: 0.2,
        stable_striker: 0.1, passing_streak: 0.1, dominant_participant: 0.1,
        victory_finisher: 0.1,
        // Legionnaire badges
        double_agent: 0.5, iron_lung: 0.4, crisis_manager: 0.3, mercenary: 0.3, joker: 0.2
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
        badgesEarned: earnedBadges,
    };

    return { delta: finalDelta, breakdown };
};


// --- BADGE ENGINE (37 Badges) ---
export const calculateEarnedBadges = (
    player: Player, 
    stats: PlayerStats, 
    session: Session, 
    allPlayersStats: PlayerStats[]
): BadgeType[] => {
    if (session.numTeams === 2) return [];

    const earned = new Set<BadgeType>();
    const addBadge = (b: BadgeType) => earned.add(b);
    
    const playerGames = session.games.filter(g => g.status === 'finished' && (
        session.teams.find(t => t.id === g.team1Id)?.playerIds.includes(player.id) ||
        session.teams.find(t => t.id === g.team2Id)?.playerIds.includes(player.id)
    )).sort((a, b) => a.gameNumber - b.gameNumber);

    // --- SESSION AGGREGATES & COMPARATIVE ---
    if (stats.goals >= 7) addBadge('goleador');
    if (stats.assists >= 6) addBadge('assistant');
    if (stats.goals >= 5 && stats.assists >= 5 && stats.wins >= 5) addBadge('mvp');
    if (stats.goals + stats.assists >= 10) addBadge('ten_influence');
    if (stats.goals >= 3 && stats.assists >= 3) addBadge('mastery_balance');
    if (stats.gamesPlayed >= 10) addBadge('dominant_participant');
    if (stats.gamesPlayed >= 6 && stats.losses === 0) addBadge('undefeated');

    const maxGoals = Math.max(...allPlayersStats.map(s => s.goals));
    if (stats.goals > 0 && stats.goals === maxGoals) addBadge('session_top_scorer');

    const maxAssists = Math.max(...allPlayersStats.map(s => s.assists));
    if (stats.assists > 0 && stats.assists === maxAssists) addBadge('session_top_assistant');

    const maxWins = Math.max(...allPlayersStats.map(s => s.wins));
    if (stats.wins > 0 && stats.wins === maxWins) addBadge('win_leader');
    
    // --- IMPROVED Unsung Hero ---
    if (stats.wins > 0 && stats.wins === maxWins && maxWins >= 3 && (stats.goals + stats.assists) <= 1) {
        addBadge('unsung_hero');
    }

    // --- LEGIONNAIRE LOGIC ---
    let legionnaireGamesPlayed = 0;
    let legionnaireWins = 0;
    let ownTeamWins = 0;
    let ironLungSequence: ('own_win' | 'leg_win' | 'other')[] = [];

    // Helper: Check if player was a legionnaire in a specific game
    const wasLegionnaireInGame = (g: Game, pid: string) => {
        // A move exists where playerId is this player, AND the team they moved TO is one of the playing teams
        return g.legionnaireMoves?.some(m => m.playerId === pid && (m.toTeamId === g.team1Id || m.toTeamId === g.team2Id));
    };

    // Helper: Get the ID of the team the player actually played for in this game
    const getPlayerTeamIdInGame = (g: Game, pid: string) => {
        // Check if moved
        const move = g.legionnaireMoves?.find(m => m.playerId === pid && (m.toTeamId === g.team1Id || m.toTeamId === g.team2Id));
        if (move) return move.toTeamId;
        
        // Otherwise use original team
        const originalTeam = session.teams.find(t => t.playerIds.includes(pid));
        return originalTeam?.id;
    };

    // --- GAME-LEVEL & STREAK ANALYSIS ---
    let sniperCount = 0, firstBloodCount = 0, comebackCount = 0;
    let dupletCount = 0, maestroCount = 0, fortressCount = 0, conductorCount = 0;
    
    let goalStreak = 0, maxGoalStreak = 0;
    let assistStreak = 0, maxAssistStreak = 0;
    let winStreak = 0, maxWinStreak = 0;
    let winContributionStreak = 0, maxWinContributionStreak = 0;
    
    playerGames.forEach(g => {
        const myTeamId = getPlayerTeamIdInGame(g, player.id);
        if (!myTeamId) return; // Should not happen given filters

        const isLegionnaire = wasLegionnaireInGame(g, player.id);
        const isMyTeamWinner = g.winnerTeamId === myTeamId;
        
        const myGoals = g.goals.filter(goal => goal.scorerId === player.id && !goal.isOwnGoal);
        const myAssists = g.goals.filter(goal => goal.assistantId === player.id);
        const hasContribution = myGoals.length > 0 || myAssists.length > 0;
        
        // Legionnaire tracking
        if (isLegionnaire) {
            legionnaireGamesPlayed++;
            if (isMyTeamWinner) legionnaireWins++;
            
            // Joker: Legionnaire + Goal or Assist
            if (hasContribution) addBadge('joker');

            // Crisis Manager: Legionnaire + (Goals + Assists >= 2)
            if (myGoals.length + myAssists.length >= 2) addBadge('crisis_manager');
        } else {
            if (isMyTeamWinner) ownTeamWins++;
        }

        // Iron Lung Tracking
        if (isMyTeamWinner) {
            ironLungSequence.push(isLegionnaire ? 'leg_win' : 'own_win');
        } else {
            ironLungSequence.push('other');
        }

        // Streaks
        goalStreak = myGoals.length > 0 ? goalStreak + 1 : 0;
        if (goalStreak > maxGoalStreak) maxGoalStreak = goalStreak;
        
        assistStreak = myAssists.length > 0 ? assistStreak + 1 : 0;
        if (assistStreak > maxAssistStreak) maxAssistStreak = assistStreak;

        winStreak = isMyTeamWinner ? winStreak + 1 : 0;
        if (winStreak > maxWinStreak) maxWinStreak = winStreak;

        winContributionStreak = (isMyTeamWinner && hasContribution) ? winContributionStreak + 1 : 0;
        if (winContributionStreak > maxWinContributionStreak) maxWinContributionStreak = winContributionStreak;

        // Counts for badges
        if (g.goals.length > 0 && g.goals.sort((a,b) => a.timestampSeconds - b.timestampSeconds)[0].scorerId === player.id) {
            firstBloodCount++;
        }

        if (isMyTeamWinner) {
            if (myGoals.length >= 2) dupletCount++;
            if (myAssists.length >= 2) maestroCount++;
            if (myAssists.length > 0) conductorCount++;

            const opponentScore = g.team1Id === myTeamId ? g.team2Score : g.team1Score;
            if (opponentScore === 0) fortressCount++;

            const sortedGoals = [...g.goals].sort((a,b) => a.timestampSeconds - b.timestampSeconds);
            let scoreA = 0, scoreB = 0;
            // Assuming current team ID logic
            const myTeamIsA = g.team1Id === myTeamId;
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
            if (lastGoal.scorerId === player.id && myTeamWonByOne) sniperCount++;
        }
    });

    // --- APPLY LEGIONNAIRE BADGES ---
    // Mercenary: Play 4+ games as legionnaire
    if (legionnaireGamesPlayed >= 4) addBadge('mercenary');

    // Double Agent: 3 Own Wins + 3 Legionnaire Wins
    if (ownTeamWins >= 3 && legionnaireWins >= 3) addBadge('double_agent');

    // Iron Lung: Sequence Own(W) -> Leg(W) -> Own(W)
    for (let i = 0; i < ironLungSequence.length - 2; i++) {
        const s1 = ironLungSequence[i];
        const s2 = ironLungSequence[i+1];
        const s3 = ironLungSequence[i+2];
        // Sequence: Own -> Leg -> Own (All Wins)
        if (s1 === 'own_win' && s2 === 'leg_win' && s3 === 'own_win') {
            addBadge('iron_lung');
            break;
        }
    }

    if (maxGoalStreak >= 3) addBadge('stable_striker');
    if (maxAssistStreak >= 3) addBadge('passing_streak');
    if (maxWinStreak >= 5) addBadge('iron_streak');
    if (maxWinStreak >= 9) addBadge('dynasty');
    if (maxWinContributionStreak >= 3) addBadge('key_player');

    if (firstBloodCount >= 3) addBadge('first_blood');
    if (dupletCount >= 2) addBadge('duplet');
    if (maestroCount >= 2) addBadge('maestro');
    if (conductorCount >= 3) addBadge('team_conductor');
    if (fortressCount >= 3) addBadge('fortress');
    if (sniperCount >= 3) addBadge('sniper');
    if (comebackCount >= 3) addBadge('comeback_kings');
    
    // Victory Finisher
    const lastGame = session.games.filter(g => g.status === 'finished').sort((a,b) => b.gameNumber - a.gameNumber)[0];
    if (lastGame) {
        const myTeamId = getPlayerTeamIdInGame(lastGame, player.id);
        if (myTeamId && lastGame.winnerTeamId === myTeamId) {
            const sortedGoals = [...lastGame.goals].sort((a,b) => a.timestampSeconds - b.timestampSeconds);
            const lastGoal = sortedGoals[sortedGoals.length - 1];
            if (lastGoal.scorerId === player.id && Math.abs(lastGame.team1Score - lastGame.team2Score) === 1) {
                addBadge('victory_finisher');
            }
        }
    }

    // Decisive Factor
    const myWins = playerGames.filter(g => {
        const myTeamId = getPlayerTeamIdInGame(g, player.id);
        return myTeamId && g.winnerTeamId === myTeamId;
    });
    if (myWins.length >= 3) {
        const contributedInAll = myWins.every(g => g.goals.some(goal => goal.scorerId === player.id || goal.assistantId === player.id));
        if (contributedInAll) addBadge('decisive_factor');
    }
    
    // Perfect Finish
    let perfectFinishCount = 0;
    playerGames.forEach(g => {
         const myTeamId = getPlayerTeamIdInGame(g, player.id);
         if (!myTeamId || g.winnerTeamId !== myTeamId) return;
         const myGoals = g.goals.filter(goal => goal.scorerId === player.id && !goal.isOwnGoal);
         const myTeamScore = g.team1Id === myTeamId ? g.team1Score : g.team2Score;
         if (session.goalsToWin === 2 && myTeamScore === 2 && myGoals.length === 2) {
             perfectFinishCount++;
         }
    });
    if (perfectFinishCount >= 3) addBadge('perfect_finish');


    // --- CAREER MILESTONES ---
    const totalG = player.totalGoals + stats.goals;
    const totalA = player.totalAssists + stats.assists;
    const totalSess = (player.totalSessionsPlayed || 0) + 1;
    const totalWins = player.totalWins + stats.wins;
    const totalInfluence = totalG + totalA;

    if ([40, 60, 80].some(m => totalG >= m && player.totalGoals < m)) addBadge('club_legend_goals');
    if ([40, 60, 80].some(m => totalA >= m && player.totalAssists < m)) addBadge('club_legend_assists');
    if ([20, 50].some(m => totalSess >= m && (player.totalSessionsPlayed || 0) < m)) addBadge('veteran');

    if (totalWins >= 100 && player.totalWins < 100) addBadge('career_100_wins');
    if (totalInfluence >= 150 && (player.totalGoals + player.totalAssists) < 150) addBadge('career_150_influence');
    if (totalSess >= 100 && (player.totalSessionsPlayed || 0) < 100) addBadge('career_super_veteran');


    return Array.from(earned);
};
