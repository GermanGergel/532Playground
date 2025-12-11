
export enum PlayerStatus {
  Confirmed = 'confirmed',
  Unconfirmed = 'unconfirmed',
}

export enum PlayerTier {
    Legend = 'legend',
    Elite = 'elite',
    Strong = 'strong',
    Average = 'average',
    Developing = 'developing',
}

export type PlayerForm = 'hot_streak' | 'stable' | 'cold_streak';
export type BadgeType = 
  // Retained Old Badges
  'goleador' | 
  'perfect_finish' | 
  'dynasty' | 
  'sniper' | 
  'assistant' | 
  'mvp' | 
  'decisive_factor' | 
  'unsung_hero' |
  'first_blood' |
  'duplet' |
  'maestro' |
  'comeback_kings' |
  'fortress' |
  'club_legend_goals' |
  'club_legend_assists' |
  'veteran' |
  // NEW BADGES FROM USER LIST
  'session_top_scorer' |
  'stable_striker' |
  'victory_finisher' |
  'session_top_assistant' |
  'passing_streak' |
  'team_conductor' |
  'ten_influence' |
  'mastery_balance' |
  'key_player' |
  'win_leader' |
  'iron_streak' |
  'undefeated' |
  'dominant_participant' |
  'career_100_wins' |
  'career_150_influence' |
  'career_super_veteran';

export type SkillType = 'goalkeeper' | 'power_shot' | 'technique' | 'defender' | 'playmaker' | 'finisher' | 'versatile' | 'tireless_motor' | 'leader';

export type RatingBreakdown = {
  previousRating: number;
  teamPerformance: number;
  individualPerformance: number;
  badgeBonus: number;
  finalChange: number;
  newRating: number;
  badgesEarned: BadgeType[];
};

export type PlayerRecords = {
  bestGoalsInSession: { value: number; sessionId: string; };
  bestAssistsInSession: { value: number; sessionId: string; };
  bestWinRateInSession: { value: number; sessionId: string; };
};

// NEW: History Data Structure for the Chart
export interface PlayerHistoryEntry {
    date: string; // "YYYY-MM" or ISO
    rating: number;
    winRate: number;
    goals: number; // Goals accumulated up to this point or in this month
    assists: number;
}

export interface Player {
  id: string;
  nickname: string;
  surname: string;
  photo?: string; // URL to avatar in Supabase Storage
  playerCard?: string; // URL to the full card image in Supabase Storage
  createdAt: string; // ISO string
  countryCode?: string; // e.g., 'RU', 'US', 'BR'
  
  // New properties for Player Hub
  status: PlayerStatus;

  // Lifetime Statistics
  totalGoals: number;
  totalAssists: number;
  totalGames: number;
  totalWins: number;
  totalDraws: number;
  totalLosses: number;
  totalSessionsPlayed: number;

  // Rating System
  rating: number; // 0-100
  tier: PlayerTier;
  
  // Monthly Statistics (resets every month)
  monthlyGoals: number;
  monthlyAssists: number;
  monthlyGames: number;
  monthlyWins: number;
  monthlySessionsPlayed: number;
  
  // Dynamic properties
  form: PlayerForm;
  badges: Partial<Record<BadgeType, number>>;
  skills?: SkillType[];
  lastPlayedAt: string; // ISO string
  sessionHistory?: { winRate: number }[];
  lastRatingChange?: RatingBreakdown;
  records: PlayerRecords;
  consecutiveMissedSessions?: number; // Tracks inactivity penalties
  
  // Historical Data for Graphs
  historyData?: PlayerHistoryEntry[]; 
}

export enum RotationMode {
  AutoRotate = "auto_rotate",
  PlayUntilLoss = "play_until_loss",
}

export enum SessionStatus {
  Active = "active",
  Completed = "completed",
}

export interface Team {
  id: string;
  color: string;
  name: string;
  playerIds: string[];
  consecutiveGames: number;
  logo?: string; // base64 string
  logoPrompt?: string; // For AI generation
  bigStars?: number;
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

export enum GameStatus {
    Pending = 'pending',
    Active = 'active',
    Paused = 'paused',
    Finished = 'finished'
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
  startTime?: number; // timestamp
  elapsedSeconds: number;
  lastResumeTime?: number; // timestamp
  elapsedSecondsOnPause: number;
  endedAt?: string;
  goals: Goal[];
  status: GameStatus;
  announcedMilestones?: number[];
}

// --- EVENT LOGGING SYSTEM ---

export enum EventType {
  START_ROUND = 'start_round',
  FINISH_ROUND = 'finish_round',
  GOAL = 'goal',
  SUBSTITUTION = 'sub',
  TIMER_START = 'start',
  TIMER_STOP = 'stop',
}

export interface StartRoundPayload {
  leftTeam: string; // color
  rightTeam: string; // color
  leftPlayers: string[]; // nicknames
  rightPlayers: string[]; // nicknames
}

export interface GoalPayload {
  team: string; // color
  scorer?: string; // nickname
  assist?: string; // nickname
  isOwnGoal: boolean;
}

export interface SubPayload {
  side: 'left' | 'right';
  out: string; // nickname
  in: string; // nickname
}

export type EventPayload = StartRoundPayload | GoalPayload | SubPayload | {};

export interface EventLogEntry {
  timestamp: string; // ISO string
  round: number;
  type: EventType;
  payload: EventPayload;
}


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
  isTestMode?: boolean;
}

// --- NEWS FEED SYSTEM ---

export type NewsType = 'milestone' | 'tier_up' | 'badge' | 'hot_streak' | 'rating_surge' | 'transfer' | 'penalty';

export interface NewsItem {
    id: string;
    playerId: string;
    playerName: string;
    playerPhoto?: string;
    type: NewsType;
    message: string;
    subMessage?: string; // For hashtags or extra context
    timestamp: string;
    isHot: boolean; // Triggers the fire emoji and special styling
    statsSnapshot?: { // Snapshot for the visual card
        rating: number;
        tier: PlayerTier;
    };
}
