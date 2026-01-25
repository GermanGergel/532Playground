
import React from 'react';
import * as Icons from './icons';
import { Player, BadgeType, PlayerTier } from './types';
import { Card, Button, useTranslation } from './ui';
import { LastSessionBreakdown, ClubRankings, BestSessionCard, PlayerProgressChart } from './components/PlayerCardAnalytics';

/**
 * Badge priority map for sorting
 */
const BADGE_PRIORITY: Partial<Record<BadgeType, number>> = {
    mvp: 10, dynasty: 9, goleador: 8, assistant: 8, fortress: 7, 
    decisive_factor: 6, comeback_kings: 6, sniper: 5, unsung_hero: 5,
    first_blood: 4, perfect_finish: 4, duplet: 4, maestro: 4,
    career_150_influence: 3, career_100_wins: 3, career_super_veteran: 3
};

// FIX: Exported sortBadgesByPriority to fix build error in PublicHubScreen.tsx
export const sortBadgesByPriority = (badges: BadgeType[]): BadgeType[] => {
    return [...badges].sort((a, b) => (BADGE_PRIORITY[b] || 0) - (BADGE_PRIORITY[a] || 0));
};

const badgeIconMap: Record<BadgeType, React.FC<any>> = {
    goleador: Icons.GoleadorBadgeIcon,
    perfect_finish: Icons.PerfectFinishBadgeIcon,
    dynasty: Icons.DynastyBadgeIcon,
    sniper: Icons.SniperBadgeIcon,
    assistant: Icons.AssistantBadgeIcon,
    mvp: Icons.MvpBadgeIcon,
    decisive_factor: Icons.DecisiveFactorBadgeIcon,
    unsung_hero: Icons.UnsungHeroBadgeIcon,
    first_blood: Icons.FirstBloodBadgeIcon,
    duplet: Icons.DupletBadgeIcon,
    maestro: Icons.MaestroBadgeIcon,
    comeback_kings: Icons.ComebackKingsBadgeIcon,
    fortress: Icons.FortressBadgeIcon,
    club_legend_goals: Icons.ClubLegendBadgeIcon,
    club_legend_assists: Icons.ClubLegendBadgeIcon,
    veteran: Icons.VeteranBadgeIcon,
    session_top_scorer: Icons.SessionTopScorerBadgeIcon,
    stable_striker: Icons.StableStrikerBadgeIcon,
    victory_finisher: Icons.VictoryFinisherBadgeIcon,
    session_top_assistant: Icons.SessionTopAssistantBadgeIcon,
    passing_streak: Icons.PassingStreakBadgeIcon,
    team_conductor: Icons.TeamConductorBadgeIcon,
    ten_influence: Icons.TenInfluenceBadgeIcon,
    mastery_balance: Icons.MasteryBalanceBadgeIcon,
    key_player: Icons.KeyPlayerBadgeIcon,
    win_leader: Icons.WinLeaderBadgeIcon,
    iron_streak: Icons.IronStreakBadgeIcon,
    undefeated: Icons.UndefeatedBadgeIcon,
    dominant_participant: Icons.DominantParticipantBadgeIcon,
    career_100_wins: Icons.Career100WinsBadgeIcon,
    career_150_influence: Icons.Career150InfluenceBadgeIcon,
    career_super_veteran: Icons.CareerSuperVeteranBadgeIcon,
    mercenary: Icons.MercenaryBadgeIcon,
    double_agent: Icons.DoubleAgentBadgeIcon,
    joker: Icons.JokerBadgeIcon,
    crisis_manager: Icons.CrisisManagerBadgeIcon,
    iron_lung: Icons.IronLungBadgeIcon,
};

// FIX: Exported BadgeIcon to fix build errors in multiple screens
export const BadgeIcon: React.FC<{ badge: BadgeType; className?: string; count?: number }> = ({ badge, className = "w-6 h-6", count }) => {
    const IconComponent = badgeIconMap[badge] || Icons.StarIcon;
    return (
        <div className={`relative ${className}`}>
            <IconComponent className="w-full h-full" />
            {count !== undefined && count > 1 && (
                <span className="absolute -bottom-1 -right-1 bg-dark-accent-start text-dark-bg text-[8px] font-bold px-1 rounded-full border border-dark-bg leading-none flex items-center justify-center min-w-[12px] h-[12px]">
                    {count}
                </span>
            )}
        </div>
    );
};

interface PlayerCardProps {
    player: Player;
    onEdit: () => void;
    onDelete: () => void;
    onUploadCard: () => void;
    onConfirmInitialRating: (rating: number) => void;
    onDownloadCard: () => void;
    onShareProfile: () => void;
    isDownloading?: boolean;
}

// FIX: Re-implemented and exported PlayerCard to fix build error in PlayerProfileScreen.tsx
export const PlayerCard: React.FC<PlayerCardProps> = ({
    player, onEdit, onDelete, onUploadCard, onConfirmInitialRating, onDownloadCard, onShareProfile, isDownloading
}) => {
    const t = useTranslation();
    
    return (
        <div className="space-y-6">
            <Card className="!p-0 overflow-hidden border-white/10 shadow-2xl relative aspect-[3/4] max-w-sm mx-auto">
                {player.playerCard && (
                    <div 
                        className="absolute inset-0 bg-cover bg-no-repeat grayscale-[0.2] opacity-80"
                        style={{ backgroundImage: `url(${player.playerCard})`, backgroundPosition: 'center 5%' }}
                    />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent"></div>
                
                <div className="relative z-30 flex flex-col h-full p-6">
                    <header className="flex justify-between items-start">
                        <div className="pt-2">
                            {/* BRAND REPLACEMENT: UNIT (Unified White Gradient) - COMPACT WIDTH */}
                            <p 
                                className="font-russo text-3xl leading-none tracking-tighter"
                                style={{ 
                                    background: 'linear-gradient(180deg, #FFFFFF 0%, rgba(255, 255, 255, 0.2) 100%)',
                                    WebkitBackgroundClip: 'text',
                                    WebkitTextFillColor: 'transparent',
                                }}
                            >
                                UNIT
                            </p>
                        </div>
                        <div className="flex flex-col items-end">
                            <span className="text-5xl font-black text-white leading-none">{player.rating}</span>
                            <span className="text-xs font-bold text-white/50 tracking-widest mt-1">OVR</span>
                        </div>
                    </header>

                    <div className="flex-grow flex flex-col justify-end items-center pb-8">
                        <h1 className="text-4xl font-black font-russo uppercase tracking-tighter text-white drop-shadow-lg text-center leading-none">
                            {player.nickname}
                        </h1>
                        {player.surname && (
                            <p className="text-sm font-bold text-white/40 uppercase tracking-[0.3em] mt-2">
                                {player.surname}
                            </p>
                        )}
                        <p className="text-[10px] font-black text-dark-accent-start uppercase tracking-[0.5em] mt-4 opacity-70">
                            {player.tier}
                        </p>
                    </div>

                    <footer className="grid grid-cols-3 gap-2 border-t border-white/10 pt-4">
                        <div className="flex flex-col items-center">
                            <span className="text-lg font-bold text-white">{player.totalGoals}</span>
                            <span className="text-[8px] font-black text-white/30 uppercase tracking-widest">{t.thG}</span>
                        </div>
                        <div className="flex flex-col items-center">
                            <span className="text-lg font-bold text-white">{player.totalAssists}</span>
                            <span className="text-[8px] font-black text-white/30 uppercase tracking-widest">{t.thA}</span>
                        </div>
                        <div className="flex flex-col items-center">
                            <span className="text-lg font-bold text-white">{player.totalWins}</span>
                            <span className="text-[8px] font-black text-white/30 uppercase tracking-widest">{t.thW}</span>
                        </div>
                    </footer>
                </div>
            </Card>

            <div className="grid grid-cols-2 gap-3">
                <Button variant="secondary" onClick={onEdit}>{t.editData}</Button>
                <Button variant="secondary" onClick={onUploadCard}>{t.uploadPhoto}</Button>
                <Button variant="secondary" onClick={onDownloadCard} disabled={isDownloading}>{isDownloading ? t.loading : t.downloadCard}</Button>
                <Button variant="secondary" onClick={onShareProfile}>{t.shareProfile}</Button>
            </div>

            <LastSessionBreakdown player={player} />
            <ClubRankings player={player} />
            <BestSessionCard player={player} />
            {player.historyData && <PlayerProgressChart history={player.historyData} />}

            <Button variant="danger" onClick={onDelete} className="w-full mt-4">{t.deletePlayer}</Button>
        </div>
    );
};
