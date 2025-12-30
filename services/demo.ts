
import { 
    Player, Session, Team, Game, Goal, EventLogEntry, 
    EventType, PlayerStatus, PlayerTier, GameStatus, 
    RotationMode, SessionStatus, StartRoundPayload, GoalPayload, NewsItem, BadgeType, SkillType 
} from '../types';
import { newId } from '../screens/utils';
import { getTierForRating, calculateRatingUpdate, calculateEarnedBadges } from './rating';
import { calculateAllStats } from './statistics';
import { generateNewsUpdates } from './news';

const DEMO_NAMES = [
    "Alex", "Dima", "Sergei", "Maxim", "Ivan", 
    "Andrey", "Pavel", "Viktor", "Igor", "Artem",
    "Luis", "Carlos", "Thiago", "Neymar", "Messi",
    "Cristiano", "Zlatan", "Kevin", "Luka", "Kylian"
];

const COLORS = ['#FF4136', '#0074D9', '#2ECC40', '#FFDC00', '#FF851B'];

const ALL_SKILLS: SkillType[] = ['goalkeeper', 'power_shot', 'technique', 'defender', 'playmaker', 'finisher', 'versatile', 'tireless_motor', 'leader'];

// Expanded list for better variety
const POTENTIAL_BADGES: BadgeType[] = [
    'mvp', 'goleador', 'assistant', 'sniper', 'dynasty', 'fortress', 'club_legend_goals', 
    'veteran', 'double_agent', 'iron_lung', 'mercenary', 'joker', 'crisis_manager',
    'session_top_scorer', 'stable_striker', 'undefeated', 'iron_streak', 'ten_influence'
];

const newDemoId = (prefix: string = '') => `demo_${prefix}${newId()}`;

const generateGoal = (gameId: string, teamId: string, playerIds: string[], isOwn: boolean = false): Goal => {
    const randomIndex = Math.floor(Math.random() * playerIds.length);
    const scorerId = playerIds[randomIndex];
    
    let assistId: string | undefined = undefined;
    if (!isOwn && Math.random() > 0.4 && playerIds.length > 1) {
        assistId = playerIds.filter(id => id !== scorerId)[Math.floor(Math.random() * (playerIds.length - 1))];
    }

    return {
        id: newDemoId('goal_'),
        gameId,
        teamId,
        scorerId: isOwn ? undefined : scorerId,
        assistantId: isOwn ? undefined : assistId,
        isOwnGoal: isOwn,
        timestampSeconds: Math.floor(Math.random() * 300)
    };
};

export const generateSingleDemoSession = (name: string, dateOffsetDays: number): Session => {
    const date = new Date();
    date.setDate(date.getDate() - dateOffsetDays);

    const players: Player[] = DEMO_NAMES.slice(0, 15).map((n, i) => {
        // UPDATED: Min rating is now 68 (Regular)
        const r = 68 + Math.floor(Math.random() * 17); // Range: 68 - 85
        return {
            id: newDemoId(`p_${i}_`),
            nickname: n.toUpperCase(),
            surname: `Demo`,
            createdAt: date.toISOString(),
            countryCode: 'VN',
            status: PlayerStatus.Confirmed,
            totalGoals: 0, totalAssists: 0, totalGames: 0, totalWins: 0, totalDraws: 0, totalLosses: 0,
            totalSessionsPlayed: 0,
            rating: r,
            initialRating: 68,
            tier: getTierForRating(r),
            monthlyGoals: 0, monthlyAssists: 0, monthlyGames: 0, monthlyWins: 0, monthlySessionsPlayed: 0,
            form: 'stable', badges: {}, skills: [], lastPlayedAt: date.toISOString(),
            sessionHistory: [], records: { bestGoalsInSession: { value: 0, sessionId: '' }, bestAssistsInSession: { value: 0, sessionId: '' }, bestWinRateInSession: { value: 0, sessionId: '' } }
        };
    });

    const teams: Team[] = COLORS.slice(0, 3).map((color, i) => ({
        id: newDemoId(`t_${i}_`),
        color,
        name: `SQUAD ${String.fromCharCode(65 + i)}`,
        playerIds: players.slice(i * 5, (i + 1) * 5).map(p => p.id),
        consecutiveGames: 0,
        bigStars: 0,
    }));

    const session: Session = {
        id: newDemoId('sess_'),
        sessionName: name,
        date: date.toISOString(),
        numTeams: 3,
        playersPerTeam: 5,
        status: SessionStatus.Completed,
        createdAt: date.toISOString(),
        teams,
        games: [],
        playerPool: players,
        eventLog: [],
        rotationMode: RotationMode.AutoRotate
    };

    let queue = [...teams];
    for (let i = 1; i <= 15; i++) {
        const t1 = queue[0];
        const t2 = queue[1];
        const bench = queue[2];

        const t1Score = Math.floor(Math.random() * 3);
        const t2Score = Math.floor(Math.random() * 3);
        const winnerId = t1Score > t2Score ? t1.id : (t2Score > t1Score ? t2.id : undefined);

        const game: Game = {
            id: newDemoId(`g_${i}_`),
            gameNumber: i,
            team1Id: t1.id,
            team2Id: t2.id,
            team1Score: t1Score,
            team2Score: t2Score,
            winnerTeamId: winnerId,
            isDraw: !winnerId,
            elapsedSeconds: 420,
            elapsedSecondsOnPause: 0,
            goals: [],
            status: GameStatus.Finished,
            endedAt: date.toISOString()
        };

        for (let g = 0; g < t1Score; g++) game.goals.push(generateGoal(game.id, t1.id, t1.playerIds));
        for (let g = 0; g < t2Score; g++) game.goals.push(generateGoal(game.id, t2.id, t2.playerIds));

        session.games.push(game);
        
        if (winnerId === t1.id) queue = [t1, bench, t2];
        else if (winnerId === t2.id) queue = [t2, bench, t1];
        else queue = [t2, bench, t1]; // rotation on draw
    }

    return session;
};

export const generateDiverseDemoPlayers = (count: number = 10): Player[] => {
    const today = new Date().toISOString();
    return Array.from({ length: count }, (_, i) => {
        // UPDATED: Min rating is now 68. Range: 68 - 95
        const rating = 68 + Math.floor(Math.random() * 27);
        
        // Randomly pick 3-4 skills
        const shuffledSkills = [...ALL_SKILLS].sort(() => 0.5 - Math.random());
        const skills = shuffledSkills.slice(0, 3 + Math.floor(Math.random() * 2));

        // CRITICAL CHANGE: Increase number of badges to test +X counter
        const badges: Partial<Record<BadgeType, number>> = {};
        // 30% chance for a "Mega Legend" with many badges
        const numBadges = (Math.random() > 0.7) ? 8 + Math.floor(Math.random() * 6) : 2 + Math.floor(Math.random() * 4);
        
        const shuffledBadges = [...POTENTIAL_BADGES].sort(() => 0.5 - Math.random());
        for(let b=0; b < Math.min(numBadges, shuffledBadges.length); b++) {
            const bType = shuffledBadges[b];
            badges[bType] = 1 + Math.floor(Math.random() * 5);
        }

        // Generate 10 history entries for a nice chart
        // Ensure history doesn't drop below 68 visually
        const historyData = Array.from({ length: 10 }, (_, hIdx) => {
            const histRating = Math.max(68, rating - (10 - hIdx) + Math.floor(Math.random() * 3));
            return {
                date: `${hIdx + 1}/10`,
                rating: histRating,
                winRate: 40 + Math.floor(Math.random() * 50),
                goals: Math.floor(Math.random() * 5),
                assists: Math.floor(Math.random() * 4)
            };
        });

        const totalGoals = historyData.reduce((acc, curr) => acc + curr.goals, 0) + 20;
        const totalAssists = historyData.reduce((acc, curr) => acc + curr.assists, 0) + 15;
        const totalWins = 15 + Math.floor(Math.random() * 20);
        const totalSessions = historyData.length + 5;

        return {
            id: newId(),
            nickname: DEMO_NAMES[i % DEMO_NAMES.length].toUpperCase(),
            surname: "DEMO UNIT",
            createdAt: today,
            countryCode: ["VN", "UA", "RU", "BR", "FR", "GB", "US"][Math.floor(Math.random() * 7)],
            status: PlayerStatus.Confirmed,
            totalGoals,
            totalAssists,
            totalGames: totalSessions * 4,
            totalWins,
            totalDraws: 5,
            totalLosses: (totalSessions * 4) - totalWins - 5,
            totalSessionsPlayed: totalSessions,
            rating: rating,
            initialRating: 68,
            tier: getTierForRating(rating),
            monthlyGoals: Math.floor(totalGoals / 3),
            monthlyAssists: Math.floor(totalAssists / 3),
            monthlyGames: 12,
            monthlyWins: 7,
            monthlySessionsPlayed: 3,
            form: ['hot_streak', 'stable', 'cold_streak'][Math.floor(Math.random() * 3)] as any,
            badges,
            skills,
            lastPlayedAt: today,
            sessionHistory: Array.from({ length: 5 }, () => ({ winRate: 40 + Math.floor(Math.random() * 60) })),
            records: {
                bestGoalsInSession: { value: 6 + Math.floor(Math.random() * 4), sessionId: 'demo' },
                bestAssistsInSession: { value: 4 + Math.floor(Math.random() * 3), sessionId: 'demo' },
                bestWinRateInSession: { value: 100, sessionId: 'demo' },
            },
            historyData,
            lastRatingChange: {
                previousRating: Math.max(68, rating - 1.2),
                teamPerformance: 0.8,
                individualPerformance: 0.3,
                badgeBonus: 0.1,
                finalChange: 1.2,
                newRating: rating,
                badgesEarned: ['mvp', 'sniper']
            }
        };
    });
};

export const createShowcasePlayer = (): Player => {
    return {
        id: newDemoId('showcase_'),
        nickname: "MAVERICK",
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
        initialRating: 94,
        tier: PlayerTier.Legend,
        monthlyGoals: 12,
        monthlyAssists: 8,
        monthlyGames: 10,
        monthlyWins: 9,
        monthlySessionsPlayed: 2,
        form: 'hot_streak',
        skills: ['finisher', 'power_shot', 'leader', 'technique'],
        // UPDATED: Added more unique badges to showcase "+X" counter
        badges: { 
            'goleador': 5, 
            'mvp': 10, 
            'sniper': 3, 
            'club_legend_goals': 1, 
            'dynasty': 2,
            'undefeated': 1,
            'fortress': 2,
            'double_agent': 1,
            'iron_streak': 3
        },
        lastPlayedAt: new Date().toISOString(),
        records: { bestGoalsInSession: { value: 12, sessionId: 'demo' }, bestAssistsInSession: { value: 9, sessionId: 'demo' }, bestWinRateInSession: { value: 80, sessionId: 'demo' } },
        sessionHistory: [{winRate: 80}, {winRate: 100}, {winRate: 60}, {winRate: 80}, {winRate: 100}],
        historyData: Array.from({ length: 10 }, (_, i) => ({
            date: `${i+1}`,
            rating: 85 + i,
            winRate: 70 + (i % 20),
            goals: 2 + (i % 3),
            assists: 1 + (i % 2)
        })),
        lastRatingChange: {
            previousRating: 92.5,
            teamPerformance: 0.9,
            individualPerformance: 0.4,
            badgeBonus: 0.2,
            finalChange: 1.5,
            newRating: 94,
            badgesEarned: ['mvp', 'goleador']
        }
    };
};
