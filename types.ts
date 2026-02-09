
export interface PromoData {
    nickname: string;
    surname: string;
    photoUrl: string | null;
}

export enum PlayerStatus {
    Confirmed = 'confirmed',
    Unconfirmed = 'unconfirmed'
}

export enum PlayerTier {
    Legend = 'legend',
    Elite = 'elite',
    Pro = 'pro',
    Regular = 'regular'
}

export type PlayerForm = 'hot_streak' | 'stable' | 'cold_streak';

export type BadgeType = 
    | 'goleador' | 'perfect_finish' | 'dynasty' | 'sniper' | 'assistant' | 'mvp' 
    | 'decisive_factor' | 'unsung_hero' | 'first_blood' | 'duplet' | 'maestro' 
    | 'comeback_kings' | 'fortress' | 'club_legend_goals' | 'club_legend_assists' | 'veteran'
    | 'session_top_scorer' | 'stable_striker' | 'victory_finisher' | 'session_top_assistant'
    | 'passing_streak' | 'team_conductor' | 'ten_influence' | 'mastery_balance'
    | 'key_player' | 'win_leader' | 'iron_streak' | 'undefeated' | 'dominant_participant'
    | 'career_100_wins' | 'career_150_influence' | 'career_super_veteran'
    | 'mercenary' | 'double_agent' | 'joker' | 'crisis_manager' | 'iron_lung';

export type SkillType = 'goalkeeper' | 'power_shot' | 'technique' | 'defender' | 'playmaker' | 'finisher' | 'versatile' | 'tireless_motor' | 'leader';

export interface PlayerRecords {
    bestGoalsInSession: { value: number; sessionId: string };
    bestAssistsInSession: { value: number; sessionId: string };
    bestWinRateInSession: { value: number; sessionId: string };
}

export interface PlayerHistoryEntry {
    date: string;
    rating: number;
    winRate: number;
    goals: number;
    assists: number;
}

export interface RatingBreakdown {
    previousRating: number;
    teamPerformance: number;
    individualPerformance: number;
    badgeBonus: number;
    finalChange: number;
    newRating: number;
    badgesEarned: BadgeType[];
}

export interface Player {
    id: string;
    nickname: string;
    surname: string;
    createdAt: string;
    countryCode: string;
    status: PlayerStatus;
    photo?: string;
    playerCard?: string;
    totalGoals: number;
    totalAssists: number;
    totalGames: number;
    totalWins: number;
    totalDraws: number;
    totalLosses: number;
    totalSessionsPlayed: number;
    rating: number;
    initialRating: number; // The floor below which rating cannot fall
    tier: PlayerTier;
    monthlyGoals: number;
    monthlyAssists: number;
    monthlyGames: number;
    monthlyWins: number;
    monthlySessionsPlayed: number;
    form: PlayerForm;
    badges: Partial<Record<BadgeType, number>>;
    skills: SkillType[];
    lastPlayedAt: string;
    sessionHistory: { winRate: number }[];
    records: PlayerRecords;
    historyData?: PlayerHistoryEntry[];
    lastRatingChange?: RatingBreakdown;
    consecutiveMissedSessions?: number;
    isImmuneToPenalty?: boolean; // Protects against inactivity drops
}

export interface Team {
    id: string;
    color: string;
    name: string;
    playerIds: string[];
    consecutiveGames: number;
    bigStars: number;
    logo?: string;
}

export enum GameStatus {
    Pending = 'pending',
    Active = 'active',
    Paused = 'paused',
    Finished = 'finished'
}

export interface Goal {
    id: string;
    gameId: string;
    teamId: string;
    scorerId?: string;
    assistantId?: string;
    isOwnGoal: boolean;
    timestampSeconds: number;
}

// Legionnaire System Types
export interface LegionnaireMove {
    playerId: string;
    fromTeamId: string;
    toTeamId: string;
}

export interface Game {
    id: string;
    gameNumber: number;
    team1Id: string;
    team2Id: string;
    team1Score: number;
    team2Score: number;
    winnerTeamId?: string;
    isDraw: boolean;
    durationSeconds?: number;
    elapsedSeconds: number;
    elapsedSecondsOnPause: number;
    goals: Goal[];
    status: GameStatus;
    startTime?: number;
    lastResumeTime?: number;
    endedAt?: string;
    announcedMilestones?: number[];
    legionnaireMoves?: LegionnaireMove[]; // Track temporary transfers
}

export enum SessionStatus {
    Active = 'active',
    Completed = 'completed'
}

export enum RotationMode {
    AutoRotate = 'auto_rotate',
    PlayUntilLoss = 'play_until_loss'
}

export enum EventType {
    START_ROUND = 'start_round',
    GOAL = 'goal',
    SUBSTITUTION = 'substitution',
    FINISH_ROUND = 'finish_round',
    TIMER_START = 'timer_start',
    TIMER_STOP = 'timer_stop',
    LEGIONNAIRE_SIGN = 'legionnaire_sign'
}

export interface StartRoundPayload {
    leftTeam: string;
    rightTeam: string;
    leftPlayers: string[];
    rightPlayers: string[];
}

export interface GoalPayload {
    team: string;
    scorer?: string;
    assist?: string;
    isOwnGoal?: boolean;
}

export interface SubPayload {
    side: 'left' | 'right';
    out: string;
    in: string;
}

export interface LegionnairePayload {
    player: string;
    toTeam: string;
}

export interface EventLogEntry {
    timestamp: string;
    round: number;
    type: EventType;
    payload: StartRoundPayload | GoalPayload | SubPayload | LegionnairePayload | {};
}

export type SyncState = 'synced' | 'pending' | 'error';

export type WeatherCondition = 'clear' | 'cloud' | 'rain' | 'storm';

export interface Session {
    id: string;
    sessionName: string;
    date: string;
    numTeams: number;
    playersPerTeam: number;
    matchDurationMinutes?: number;
    goalsToWin?: number;
    rotationMode?: RotationMode;
    status: SessionStatus;
    createdAt: string;
    teams: Team[];
    games: Game[];
    playerPool: Player[];
    eventLog: EventLogEntry[];
    syncStatus?: SyncState;
    // New Fields for Match Report
    location?: string;
    timeString?: string; // e.g. "19:30 - 21:00"
    weather?: {
        temperature: number;
        condition: WeatherCondition;
    };
    videoUrl?: string; // YouTube Link for Hub
    rotationQueue?: string[]; // Очередь ID команд для ротации (особенно для 4 команд)
}

export type NewsType = 'tier_up' | 'badge' | 'milestone' | 'hot_streak' | 'penalty';

export interface NewsItem {
    id: string;
    playerId: string;
    playerName: string;
    playerPhoto?: string;
    type: NewsType;
    message: string;
    subMessage: string;
    timestamp: string;
    isHot: boolean;
    statsSnapshot?: { rating: number; tier: PlayerTier };
    priority?: number;
}

// --- DRAFT MODE TYPES ---
export interface DraftState {
    id: string; // Draft ID (UUID)
    pin: string; // PIN for captains
    status: 'waiting' | 'lottery' | 'active' | 'completed' | 'finished_view'; // Added 'lottery'
    teams: DraftTeam[];
    availablePlayerIds: string[];
    currentTurnIndex: number; // Index in the snake order
    pickOrder: string[]; // Array of teamIds in pick order
    sessionConfig: {
        numTeams: number;
        playersPerTeam: number;
    };
    version: number; // For sync logic
}

export interface DraftTeam {
    id: string; // Team ID from session
    name: string;
    color: string;
    captainId: string;
    playerIds: string[]; // Including captain
    isCaptainReady?: boolean; // New Flag: Shows if captain has logged in
}