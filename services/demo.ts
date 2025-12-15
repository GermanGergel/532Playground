
import { 
    Player, Session, Team, Game, Goal, EventLogEntry, 
    EventType, PlayerStatus, PlayerTier, GameStatus, 
    RotationMode, SessionStatus, StartRoundPayload, GoalPayload, NewsItem, BadgeType,
    PlayerForm, SkillType 
} from '../types';
import { newId } from '../screens/utils';
import { getTierForRating, calculateRatingUpdate, calculateEarnedBadges } from './rating';
import { calculateAllStats } from './statistics';
import { generateNewsUpdates } from './news';

const DEMO_NAMES = [
    "Alex", "Dima", "Sergei", "Maxim", "Ivan", 
    "Andrey", "Pavel", "Viktor", "Igor", "Artem",
    "Luis", "Carlos", "Thiago", "Neymar", "Messi"
];

const COLORS = ['#FF4136', '#0074D9', '#2ECC40']; // Red, Blue, Green

// Helper to ensure all demo IDs are recognizable
const newDemoId = (prefix: string = '') => `demo_${prefix}${newId()}`;

export const generateTestPlayers = (count: number = 15): Player[] => {
    return Array.from({ length: count }).map((_, index) => {
        const skills: SkillType[] = index % 3 === 0 ? ['finisher'] : index % 3 === 1 ? ['playmaker'] : ['defender'];
        
        return {
            id: newDemoId(`player_${index}_`),
            nickname: DEMO_NAMES[index % DEMO_NAMES.length] + (index >= 15 ? ` ${index}` : ''),
            surname: `TestBot ${index + 1}`,
            createdAt: new Date().toISOString(),
            countryCode: ['UA', 'BR', 'PT', 'ES', 'FR'][index % 5],
            status: PlayerStatus.Confirmed,
            totalGoals: 0, totalAssists: 0, totalGames: 0, totalWins: 0, totalDraws: 0, totalLosses: 0,
            totalSessionsPlayed: 0,
            rating: 60 + Math.floor(Math.random() * 20), // Random rating 60-80
            tier: PlayerTier.Average,
            monthlyGoals: 0, monthlyAssists: 0, monthlyGames: 0, monthlyWins: 0,
            monthlySessionsPlayed: 0,
            form: 'stable' as PlayerForm,
            badges: {},
            skills: skills,
            lastPlayedAt: new Date().toISOString(),
            sessionHistory: [],
            records: {
                bestGoalsInSession: { value: 0, sessionId: '' },
                bestAssistsInSession: { value: 0, sessionId: '' },
                bestWinRateInSession: { value: 0, sessionId: '' },
            },
        } as Player;
    }).map(p => ({
        ...p,
        tier: getTierForRating(p.rating)
    }));
};

export const generateDemoData = () => {
    // 1. Create Players (15 for full squad)
    const initialPlayers = generateTestPlayers(15);

    // 2. Create Teams
    const teams: Team[] = COLORS.map((color, i) => ({
        id: newDemoId(`team_${i}_`),
        color,
        name: `Team ${i + 1}`,
        playerIds: initialPlayers.slice(i * 5, (i + 1) * 5).map(p => p.id),
        consecutiveGames: 0,
        bigStars: 0,
    }));

    // 3. Simulate Session & Games
    const sessionId = newDemoId('session_');
    const session: Session = {
        id: sessionId,
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
        playerPool: initialPlayers,
        eventLog: [],
        isTestMode: true, // Mark demo sessions as test mode
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
        const gameId = newDemoId(`game_${round}_`);
        const game: Game = {
            id: gameId,
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
            
            if (!team || team.playerIds.length === 0) {
                 return { id: newDemoId('goal_'), gameId: game.id, teamId: teamId, isOwnGoal: true, timestampSeconds: Math.floor(Math.random() * 300) };
            }

            const randomIndex = Math.floor(Math.random() * team.playerIds.length);
            const scorerId = team.playerIds[randomIndex];
            const scorer = initialPlayers.find(p => p.id === scorerId);

            if (!scorer) {
                return { id: newDemoId('goal_'), gameId: game.id, teamId: teamId, isOwnGoal: true, timestampSeconds: Math.floor(Math.random() * 300) };
            }

            let assistId: string | undefined = undefined;
            if (!isOwn && Math.random() > 0.3 && team.playerIds.length > 1) {
                const possibleAssists = team.playerIds.filter(pid => pid !== scorer.id);
                if (possibleAssists.length > 0) {
                    assistId = possibleAssists[Math.floor(Math.random() * possibleAssists.length)];
                }
            }
            
            return {
                id: newDemoId('goal_'),
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

        if (session.rotationMode === RotationMode.AutoRotate) {
            teams.forEach(t => {
                if (t.id === winnerTeam.id) t.consecutiveGames++;
                else if (t.id === loserTeam.id) t.consecutiveGames = 0;
            });
            if (winnerTeam.consecutiveGames >= 3) {
                winnerTeam.consecutiveGames = 0;
                queue = [waitingTeam, loserTeam, winnerTeam];
            } else {
                queue = [winnerTeam, waitingTeam, loserTeam];
            }
        } else {
             queue = [winnerTeam, waitingTeam, loserTeam];
        }
    }

    // 5. Calculate Stats and Update Players
    const { allPlayersStats } = calculateAllStats(session);
    
    const badgesByPlayer = new Map<string, BadgeType[]>();
    allPlayersStats.forEach(stats => {
        const earnedBadges = calculateEarnedBadges(stats.player, stats, session, allPlayersStats);
        badgesByPlayer.set(stats.player.id, earnedBadges);
    });


    const updatedPlayers = initialPlayers.map(p => {
        const stats = allPlayersStats.find(s => s.player.id === p.id);
        if (!stats) return p;
        
        const earnedBadges = badgesByPlayer.get(p.id) || [];
        const { delta, breakdown } = calculateRatingUpdate(p, stats, session, earnedBadges);
        const newRating = Math.min(99, Math.max(40, Math.round(p.rating + delta)));
        
        const updatedBadges: Partial<Record<BadgeType, number>> = { ...p.badges };
        earnedBadges.forEach(badge => {
            updatedBadges[badge] = (updatedBadges[badge] || 0) + 1;
        });

        const sessionWinRate = stats.gamesPlayed > 0 ? Math.round((stats.wins / stats.gamesPlayed) * 100) : 0;
        const records = {
            bestGoalsInSession: { value: stats.goals, sessionId: session.id },
            bestAssistsInSession: { value: stats.assists, sessionId: session.id },
            bestWinRateInSession: { value: sessionWinRate, sessionId: session.id },
        };

        return {
            ...p,
            totalGames: p.totalGames + stats.gamesPlayed,
            totalGoals: p.totalGoals + stats.goals,
            totalAssists: p.totalAssists + stats.assists,
            totalWins: p.totalWins + stats.wins,
            totalDraws: p.totalDraws + stats.draws,
            totalLosses: p.totalLosses + stats.losses,
            totalSessionsPlayed: (p.totalSessionsPlayed || 0) + 1,
            rating: newRating,
            tier: getTierForRating(newRating),
            form: (delta > 0.5 ? 'hot_streak' : delta < -0.5 ? 'cold_streak' : 'stable') as PlayerForm,
            lastRatingChange: breakdown,
            badges: updatedBadges,
            records: records,
        } as Player;
    });
    
    // 6. Generate News based on the changes
    const news = generateNewsUpdates(initialPlayers, updatedPlayers).map(n => ({ ...n, id: newDemoId('news_') }));

    session.playerPool = updatedPlayers;

    return { session, players: updatedPlayers, news };
};

export const createShowcasePlayer = (): Player => {
    return {
        id: newDemoId('showcase_'),
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
        form: 'hot_streak' as PlayerForm,
        skills: ['finisher', 'power_shot', 'leader', 'technique'],
        badges: {
            'goleador': 5,
            'mvp': 10,
            'sniper': 3,
            'club_legend_goals': 1,
            'dynasty': 2
        },
        lastPlayedAt: new Date().toISOString(),
        lastRatingChange: {
            previousRating: 92.5,
            teamPerformance: 0.8,
            individualPerformance: 0.5,
            badgeBonus: 0.2,
            finalChange: 1.5,
            newRating: 94,
            badgesEarned: ['mvp', 'goleador'],
        },
        records: {
            bestGoalsInSession: { value: 12, sessionId: 'demo-session-id' },
            bestAssistsInSession: { value: 9, sessionId: 'demo-session-id' },
            bestWinRateInSession: { value: 80, sessionId: 'demo-session-id' },
        },
        sessionHistory: [],
    };
};
