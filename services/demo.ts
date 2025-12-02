import { 
    Player, Session, Team, Game, Goal, EventLogEntry, 
    EventType, PlayerStatus, PlayerTier, GameStatus, 
    RotationMode, SessionStatus, StartRoundPayload, GoalPayload 
} from '../types';
import { newId } from '../screens/utils';
import { getTierForRating, calculateRatingUpdate } from './rating';
import { calculateAllStats } from './statistics';

const DEMO_NAMES = [
    "Alex", "Dima", "Sergei", "Maxim", "Ivan", 
    "Andrey", "Pavel", "Viktor", "Igor", "Artem",
    "Luis", "Carlos", "Thiago", "Neymar", "Messi"
];

const COLORS = ['#FF4136', '#0074D9', '#2ECC40']; // Red, Blue, Green

export const generateDemoData = () => {
    // 1. Create Players
    const players: Player[] = DEMO_NAMES.map((name, index) => ({
        id: newId(),
        nickname: name,
        surname: `Demo ${index + 1}`,
        createdAt: new Date().toISOString(),
        countryCode: ['UA', 'BR', 'PT', 'ES', 'FR'][index % 5],
        status: PlayerStatus.Confirmed,
        totalGoals: 0, totalAssists: 0, totalGames: 0, totalWins: 0, totalDraws: 0, totalLosses: 0,
        totalSessionsPlayed: 0,
        rating: 60 + Math.floor(Math.random() * 20), // Random rating 60-80
        tier: PlayerTier.Average,
        monthlyGoals: 0, monthlyAssists: 0, monthlyGames: 0, monthlyWins: 0,
        monthlySessionsPlayed: 0,
        form: 'stable',
        badges: {},
        skills: index % 3 === 0 ? ['finisher'] : index % 3 === 1 ? ['playmaker'] : ['defender'],
        lastPlayedAt: new Date().toISOString(),
    }));

    // Update Tier based on random rating
    players.forEach(p => p.tier = getTierForRating(p.rating));

    // 2. Create Teams
    const teams: Team[] = COLORS.map((color, i) => ({
        id: newId(),
        color,
        name: `Team ${i + 1}`,
        playerIds: players.slice(i * 5, (i + 1) * 5).map(p => p.id),
        consecutiveGames: 0,
        bigStars: 0,
    }));

    // 3. Simulate Session & Games
    const session: Session = {
        id: newId(),
        sessionName: "Demo Session 16 Rounds",
        date: new Date().toISOString(),
        numTeams: 3,
        playersPerTeam: 5,
        matchDurationMinutes: 7,
        goalsToWin: 2,
        rotationMode: RotationMode.AutoRotate,
        status: SessionStatus.Completed,
        createdAt: new Date().toISOString(),
        teams: teams,
        games: [],
        playerPool: players,
        eventLog: []
    };

    // Simulation State
    let queue = [teams[0], teams[1], teams[2]]; // [Field 1, Field 2, Bench]
    
    // 4. Run 16 Rounds
    for (let round = 1; round <= 16; round++) {
        const team1 = queue[0];
        const team2 = queue[1];
        const waitingTeam = queue[2];

        // Decide Winner (Random, weighted slightly to Team 1 to create streaks)
        const team1Strength = Math.random();
        const team2Strength = Math.random();
        
        let team1Score = 0;
        let team2Score = 0;
        
        if (team1Strength > team2Strength) {
            team1Score = 2;
            team2Score = Math.floor(Math.random() * 2); // 0 or 1
        } else {
            team2Score = 2;
            team1Score = Math.floor(Math.random() * 2); // 0 or 1
        }

        const winnerId = team1Score > team2Score ? team1.id : team2.id;
        const winnerTeam = team1Score > team2Score ? team1 : team2;
        const loserTeam = team1Score > team2Score ? team2 : team1;

        // Create Game Object
        const game: Game = {
            id: newId(),
            gameNumber: round,
            team1Id: team1.id,
            team2Id: team2.id,
            team1Score,
            team2Score,
            winnerTeamId: winnerId,
            isDraw: false,
            durationSeconds: 300,
            elapsedSeconds: 300,
            elapsedSecondsOnPause: 0,
            goals: [],
            status: GameStatus.Finished,
            startTime: Date.now() - (16 - round) * 1000 * 60 * 10, // Fake timestamps
            endedAt: new Date().toISOString()
        };

        // Generate Goals
        const generateGoal = (teamId: string, isOwn: boolean = false): Goal => {
            const team = teams.find(t => t.id === teamId);
            
            // Safety check: if team doesn't exist or has no players, return minimal data
            if (!team || team.playerIds.length === 0) {
                 return {
                    id: newId(),
                    gameId: game.id,
                    teamId: teamId,
                    scorerId: undefined,
                    assistantId: undefined,
                    isOwnGoal: true, // fallback to avoid crash
                    timestampSeconds: Math.floor(Math.random() * 300)
                };
            }

            // Safe random selection based on actual array length
            const randomIndex = Math.floor(Math.random() * team.playerIds.length);
            const scorerId = team.playerIds[randomIndex];
            const scorer = players.find(p => p.id === scorerId);

            // Safety check: if scorer not found
            if (!scorer) {
                return {
                    id: newId(),
                    gameId: game.id,
                    teamId: teamId,
                    scorerId: undefined,
                    assistantId: undefined,
                    isOwnGoal: true,
                    timestampSeconds: Math.floor(Math.random() * 300)
                };
            }

            let assistId: string | undefined = undefined;
            // 30% chance of assist, must have teammate available
            if (!isOwn && Math.random() > 0.3 && team.playerIds.length > 1) {
                const possibleAssists = team.playerIds.filter(pid => pid !== scorer.id);
                if (possibleAssists.length > 0) {
                    assistId = possibleAssists[Math.floor(Math.random() * possibleAssists.length)];
                }
            }
            
            return {
                id: newId(),
                gameId: game.id,
                teamId: teamId,
                scorerId: isOwn ? undefined : scorer.id,
                assistantId: isOwn ? undefined : assistId,
                isOwnGoal: isOwn,
                timestampSeconds: Math.floor(Math.random() * 300)
            };
        };

        for (let g = 0; g < team1Score; g++) game.goals.push(generateGoal(team1.id));
        for (let g = 0; g < team2Score; g++) game.goals.push(generateGoal(team2.id));

        session.games.push(game);

        // Rotation Logic (Winner Stays, max 3)
        // Update consecutive games
        teams.forEach(t => {
            if (t.id === winnerTeam.id) t.consecutiveGames++;
            else if (t.id === loserTeam.id) t.consecutiveGames = 0;
        });

        // Determine next queue
        if (winnerTeam.consecutiveGames >= 3) {
            // Force rotate winner out
            winnerTeam.consecutiveGames = 0;
            queue = [waitingTeam, loserTeam, winnerTeam]; // Winner goes to bench
        } else {
            // Winner stays
            queue = [winnerTeam, waitingTeam, loserTeam]; // Loser goes to bench
        }
    }

    // 5. Calculate Stats and Update Players
    const { allPlayersStats } = calculateAllStats(session);

    // Update the player objects with these stats
    const updatedPlayers = players.map(p => {
        const stats = allPlayersStats.find(s => s.player.id === p.id);
        if (!stats) return p;

        // Use the actual rating engine to generate a breakdown
        const { delta, breakdown } = calculateRatingUpdate(p, stats, session, []);
        const newRating = Math.min(99, Math.max(40, Math.round(p.rating + delta)));
        
        return {
            ...p,
            totalGames: stats.gamesPlayed,
            totalGoals: stats.goals,
            totalAssists: stats.assists,
            totalWins: stats.wins,
            totalDraws: stats.draws,
            totalLosses: stats.losses,
            totalSessionsPlayed: 1,
            rating: newRating,
            tier: getTierForRating(newRating),
            form: delta > 0.5 ? 'hot_streak' : delta < -0.5 ? 'cold_streak' : 'stable',
            lastRatingChange: breakdown, // ADD THE BREAKDOWN HERE
            badges: stats.goals > 3 ? { 'goleador': 1 } : {}
        } as Player;
    });

    // Replace session player pool with updated players to ensure report is correct
    session.playerPool = updatedPlayers;

    return { session, players: updatedPlayers };
};

export const createShowcasePlayer = (): Player => {
    return {
        id: newId(),
        nickname: "Maverick",
        surname: "Top Gun",
        createdAt: new Date().toISOString(),
        countryCode: 'US',
        status: PlayerStatus.Confirmed,
        totalGoals: 142,
        totalAssists: 88,
        totalGames: 200,
        totalWins: 150,
        totalDraws: 20,
        totalLosses: 30,
        totalSessionsPlayed: 45,
        rating: 94,
        tier: PlayerTier.Legend,
        monthlyGoals: 12,
        monthlyAssists: 8,
        monthlyGames: 10,
        monthlyWins: 9,
        monthlySessionsPlayed: 2,
        form: 'hot_streak',
        skills: ['finisher', 'power_shot', 'leader', 'technique'],
        badges: {
            'goleador': 5,
            'mvp': 10,
            'sniper': 3,
            'club_legend_goals': 1,
            'dynasty': 2
        },
        lastPlayedAt: new Date().toISOString(),
        // ADD A REALISTIC BREAKDOWN FOR THE SHOWCASE PLAYER
        lastRatingChange: {
            previousRating: 92.5,
            teamPerformance: 0.8,
            individualPerformance: 0.5,
            badgeBonus: 0.2,
            finalChange: 1.5,
            newRating: 94,
        }
    };
};