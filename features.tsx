
import React from 'react';
import { Player, BadgeType, PlayerForm } from './types';
import { 
    GoleadorBadgeIcon, PerfectFinishBadgeIcon, DynastyBadgeIcon, SniperBadgeIcon, 
    AssistantBadgeIcon, MvpBadgeIcon, DecisiveFactorBadgeIcon, UnsungHeroBadgeIcon, 
    FirstBloodBadgeIcon, DupletBadgeIcon, MaestroBadgeIcon, ComebackKingsBadgeIcon, 
    FortressBadgeIcon, ClubLegendBadgeIcon, VeteranBadgeIcon, 
    SessionTopScorerBadgeIcon, StableStrikerBadgeIcon, VictoryFinisherBadgeIcon, 
    SessionTopAssistantBadgeIcon, PassingStreakBadgeIcon, TeamConductorBadgeIcon, 
    TenInfluenceBadgeIcon, MasteryBalanceBadgeIcon, KeyPlayerBadgeIcon, 
    WinLeaderBadgeIcon, IronStreakBadgeIcon, UndefeatedBadgeIcon, 
    DominantParticipantBadgeIcon, Career100WinsBadgeIcon, Career150InfluenceBadgeIcon, 
    CareerSuperVeteranBadgeIcon, MercenaryBadgeIcon, DoubleAgentBadgeIcon, 
    JokerBadgeIcon, CrisisManagerBadgeIcon, IronLungBadgeIcon, StarIcon, Edit3, Camera, Image, WhatsApp
} from './icons';
import { convertCountryCodeAlpha3ToAlpha2 } from './utils/countries';
import { Button, Card, useTranslation } from './ui';
import { LastSessionBreakdown, ClubRankings, BestSessionCard, PlayerProgressChart } from './components/PlayerCardAnalytics';

export const BadgeIcon: React.FC<{ badge: BadgeType; className?: string; count?: number }> = ({ badge, className = "w-8 h-8", count }) => {
    const icons: Record<BadgeType, React.FC<React.SVGProps<SVGSVGElement>>> = {
        goleador: GoleadorBadgeIcon,
        perfect_finish: PerfectFinishBadgeIcon,
        dynasty: DynastyBadgeIcon,
        sniper: SniperBadgeIcon,
        assistant: AssistantBadgeIcon,
        mvp: MvpBadgeIcon,
        decisive_factor: DecisiveFactorBadgeIcon,
        unsung_hero: UnsungHeroBadgeIcon,
        first_blood: FirstBloodBadgeIcon,
        duplet: DupletBadgeIcon,
        maestro: MaestroBadgeIcon,
        comeback_kings: ComebackKingsBadgeIcon,
        fortress: FortressBadgeIcon,
        club_legend_goals: ClubLegendBadgeIcon,
        club_legend_assists: ClubLegendBadgeIcon,
        veteran: VeteranBadgeIcon,
        session_top_scorer: SessionTopScorerBadgeIcon,
        stable_striker: StableStrikerBadgeIcon,
        victory_finisher: VictoryFinisherBadgeIcon,
        session_top_assistant: SessionTopAssistantBadgeIcon,
        passing_streak: PassingStreakBadgeIcon,
        team_conductor: TeamConductorBadgeIcon,
        ten_influence: TenInfluenceBadgeIcon,
        mastery_balance: MasteryBalanceBadgeIcon,
        key_player: KeyPlayerBadgeIcon,
        win_leader: WinLeaderBadgeIcon,
        iron_streak: IronStreakBadgeIcon,
        undefeated: UndefeatedBadgeIcon,
        dominant_participant: DominantParticipantBadgeIcon,
        career_100_wins: Career100WinsBadgeIcon,
        career_150_influence: Career150InfluenceBadgeIcon,
        career_super_veteran: CareerSuperVeteranBadgeIcon,
        mercenary: MercenaryBadgeIcon,
        double_agent: DoubleAgentBadgeIcon,
        joker: JokerBadgeIcon,
        crisis_manager: CrisisManagerBadgeIcon,
        iron_lung: IronLungBadgeIcon
    };

    const IconComponent = icons[badge] || StarIcon;

    return (
        <div className="relative inline-block">
            <IconComponent className={className} />
            {count !== undefined && count > 1 && (
                <span className="absolute -bottom-1 -right-1 bg-dark-accent-start text-dark-bg text-[8px] font-black px-1 rounded-full border border-dark-bg">
                    x{count}
                </span>
            )}
        </div>
    );
};

export const getBadgePriority = (badge: BadgeType): number => {
    // FIX: Added missing 'victory_finisher' to the priorities map to satisfy Record<BadgeType, number>
    const priorities: Record<BadgeType, number> = {
        mvp: 100, dynasty: 95, session_top_scorer: 90, session_top_assistant: 85,
        career_super_veteran: 80, career_150_influence: 75, career_100_wins: 70,
        club_legend_goals: 65, club_legend_assists: 60, veteran: 55,
        goleador: 50, assistant: 45, decisive_factor: 40, fortress: 35,
        undefeated: 30, iron_streak: 25, iron_lung: 20, double_agent: 15,
        perfect_finish: 10, sniper: 10, maestro: 5, duplet: 5,
        first_blood: 1, stable_striker: 1, passing_streak: 1,
        team_conductor: 1, ten_influence: 1, mastery_balance: 1,
        key_player: 1, win_leader: 1, dominant_participant: 1,
        mercenary: 1, joker: 1, crisis_manager: 1, unsung_hero: 1, comeback_kings: 1,
        victory_finisher: 1
    };
    return priorities[badge] || 0;
};

export const FormArrowIndicator: React.FC<{ form: PlayerForm }> = ({ form }) => {
    if (form === 'hot_streak') return <span className="text-green-400">▲</span>;
    if (form === 'cold_streak') return <span className="text-red-400">▼</span>;
    return <span className="text-gray-400">▶</span>;
};

export interface PlayerCardProps {
    player: Player;
    onEdit?: () => void;
    onDelete?: () => void;
    onUploadCard?: () => void;
    onConfirmInitialRating?: (rating: number) => void;
    onDownloadCard?: () => void;
    onShareProfile?: () => void;
    isDownloading?: boolean;
}

export const PlayerCard: React.FC<PlayerCardProps> = ({ 
    player, onEdit, onDelete, onUploadCard, onConfirmInitialRating, 
    onDownloadCard, onShareProfile, isDownloading 
}) => {
    const t = useTranslation();
    const countryCodeAlpha2 = React.useMemo(() => player.countryCode ? convertCountryCodeAlpha3ToAlpha2(player.countryCode) : null, [player.countryCode]);

    return (
        <div className="space-y-6">
            <Card className="relative overflow-hidden !p-0 border-2 border-dark-accent-start/30 shadow-[0_0_25px_rgba(0,242,254,0.15)] group">
                <div 
                    className="aspect-[3/4] w-full bg-cover bg-center transition-transform duration-700 group-hover:scale-105"
                    style={{ backgroundImage: `url("${player.playerCard || 'https://images.unsplash.com/photo-1560272564-c83b66b1ad12?q=80&w=800&auto=format&fit=crop'}")` }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#1A1D24] via-[#1A1D24]/40 to-transparent" />
                
                <div className="absolute inset-0 p-6 flex flex-col justify-between">
                    <div className="flex justify-between items-start">
                        <div>
                            <p style={{ color: '#00F2FE' }} className="text-xl font-black leading-none">532</p>
                            <p className="text-white text-[8px] font-bold tracking-[0.2em] mt-1">PLAYGROUND</p>
                            {countryCodeAlpha2 && (
                                <img 
                                    src={`https://flagcdn.com/w40/${countryCodeAlpha2.toLowerCase()}.png`}
                                    alt={`${player.countryCode} flag`}
                                    className="w-8 h-auto mt-4 rounded-sm shadow-md"
                                />
                            )}
                        </div>
                        <div className="flex flex-col items-center">
                            <div className="text-5xl font-black leading-none" style={{ color: '#00F2FE' }}>{Math.round(player.rating)}</div>
                            <p className="font-bold text-white tracking-widest text-lg">OVG</p>
                            <div className="mt-1"><FormArrowIndicator form={player.form} /></div>
                        </div>
                    </div>

                    <div className="text-center">
                        <h2 className="text-4xl font-black text-white uppercase tracking-tighter mb-1 drop-shadow-lg italic">
                            {player.nickname}
                        </h2>
                        <p className="text-sm font-bold text-dark-accent-start uppercase tracking-[0.3em] opacity-80">
                            {player.surname}
                        </p>
                    </div>
                </div>
            </Card>

            <div className="grid grid-cols-2 gap-3">
                <Button variant="secondary" onClick={onEdit} className="flex items-center justify-center gap-2 !py-2.5">
                    <Edit3 className="w-4 h-4" /> {t.editData}
                </Button>
                <Button variant="secondary" onClick={onUploadCard} className="flex items-center justify-center gap-2 !py-2.5">
                    <Camera className="w-4 h-4" /> {t.uploadPhoto}
                </Button>
                <Button variant="secondary" onClick={onDownloadCard} disabled={isDownloading} className="flex items-center justify-center gap-2 !py-2.5">
                    <Image className="w-4 h-4" /> {isDownloading ? t.loading : t.downloadCard}
                </Button>
                <Button variant="secondary" onClick={onShareProfile} className="flex items-center justify-center gap-2 !py-2.5">
                    <WhatsApp className="w-4 h-4" /> {t.shareProfile}
                </Button>
            </div>

            <LastSessionBreakdown player={player} />
            <PlayerProgressChart history={player.historyData || []} />
            <ClubRankings player={player} />
            <BestSessionCard player={player} />

            <div className="pt-4">
                <Button variant="danger" onClick={onDelete} className="w-full !py-2 text-sm">
                    {t.deletePlayer}
                </Button>
            </div>
        </div>
    );
};
