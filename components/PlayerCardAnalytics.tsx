
import React from 'react';
import { Player, PlayerStatus } from '../types';
import { Card, useTranslation } from '../ui';
import { useApp } from '../context';
import { BootIcon, HandshakeIcon, CrownIcon } from '../icons';

const RatingChangePill: React.FC<{ value: number, label: string }> = ({ value, label }) => {
    if (value === 0) return null;
    const isPositive = value > 0;
    const text = `${isPositive ? '+' : ''}${value.toFixed(1)}`;
    const colorClasses = isPositive 
        ? 'bg-green-500/30 text-green-300' 
        : 'bg-red-500/30 text-red-300';
    
    return (
        <div className="flex flex-col items-center">
            <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${colorClasses}`}>
                {text}
            </span>
            <span className="text-[8px] text-dark-text-secondary uppercase mt-0.5">{label}</span>
        </div>
    );
};

export const LastSessionBreakdown: React.FC<{ player: Player }> = ({ player }) => {
    const t = useTranslation();
    const breakdown = player.lastRatingChange;

    if (!breakdown) return null;

    // Дополнительная проверка на целостность данных для предотвращения сбоев
    const isValidBreakdown = 
        typeof breakdown.previousRating === 'number' &&
        typeof breakdown.teamPerformance === 'number' &&
        typeof breakdown.individualPerformance === 'number' &&
        typeof breakdown.badgeBonus === 'number' &&
        typeof breakdown.finalChange === 'number' &&
        typeof breakdown.newRating === 'number';

    if (!isValidBreakdown) {
        console.error("Malformed lastRatingChange data for player:", player.id, breakdown);
        return null; // Не рендерить, если данные повреждены
    }

    const cardClass = "border border-white/10 shadow-[0_0_15px_rgba(0,242,254,0.3)]";
    
    const RatingCircle: React.FC<{ rating: number, isNew?: boolean }> = ({ rating, isNew }) => (
        <div className="flex flex-col items-center gap-1.5 w-auto">
            <div className={`
                w-16 h-16 rounded-full flex items-center justify-center shrink-0 
                ${isNew 
                    ? 'bg-dark-accent-start/10 border-2 border-[#00F2FE]'
                    : 'bg-dark-surface border-2 border-dark-text-secondary/50'
                }
            `}>
                <span className={`font-black text-2xl leading-none ${isNew ? 'text-[#00F2FE]' : 'text-dark-text'}`} style={{ textShadow: 'none' }}>
                    {rating.toFixed(0)}
                </span>
            </div>
            <span className={`text-[9px] font-bold uppercase text-center leading-none tracking-tight ${isNew ? 'text-[#00F2FE]' : 'text-dark-text-secondary'}`}>
                {isNew ? t.newRating : t.previousRating}
            </span>
        </div>
    );

    return (
        <Card className={cardClass}>
            <div className="flex items-center justify-between px-1">
                <RatingCircle rating={breakdown.previousRating} />
                
                <div className="flex flex-col items-center justify-center gap-2 flex-grow px-2 -mt-3">
                     <div className="flex items-start justify-center gap-2 text-center">
                        <RatingChangePill value={breakdown.teamPerformance} label={t.lastSessionAnalysis_team} />
                        <RatingChangePill value={breakdown.individualPerformance} label={t.lastSessionAnalysis_indiv} />
                        <RatingChangePill value={breakdown.badgeBonus} label={t.lastSessionAnalysis_badge} />
                    </div>
                     <div className="w-full h-px bg-gradient-to-r from-transparent via-dark-accent-start to-transparent opacity-50 my-0.5"></div>
                     <div className="flex flex-col items-center justify-center text-center">
                        <p className={`text-base font-bold leading-tight ${breakdown.finalChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                           {breakdown.finalChange >= 0 ? '+' : ''}{breakdown.finalChange.toFixed(1)}
                        </p>
                        <p className="text-[10px] text-dark-text-secondary uppercase leading-none mt-0.5">{t.finalChange}</p>
                     </div>
                </div>

                <RatingCircle rating={breakdown.newRating} isNew />
            </div>
        </Card>
    );
};

export const ClubRankings: React.FC<{ player: Player }> = ({ player }) => {
    const t = useTranslation();
    const { allPlayers } = useApp();
    
    const cardClass = "border border-white/10 shadow-[0_0_15px_rgba(0,242,254,0.3)]";

    const rankings = React.useMemo(() => {
        const confirmedPlayers = allPlayers.filter(p => p.status === PlayerStatus.Confirmed);
        
        if (confirmedPlayers.length < 2) return null;

        const sortedByGoals = [...confirmedPlayers].sort((a, b) => b.totalGoals - a.totalGoals);
        const sortedByAssists = [...confirmedPlayers].sort((a, b) => b.totalAssists - a.totalAssists);
        const sortedByRating = [...confirmedPlayers].sort((a, b) => b.rating - a.rating);

        const goalRank = sortedByGoals.findIndex(p => p.id === player.id) + 1;
        const assistRank = sortedByAssists.findIndex(p => p.id === player.id) + 1;
        const ratingRank = sortedByRating.findIndex(p => p.id === player.id) + 1;

        return { goalRank, assistRank, ratingRank, total: confirmedPlayers.length };
    }, [allPlayers, player.id]);
    
    const RankItem: React.FC<{ label: string; rank: number; total: number }> = ({ label, rank, total }) => (
        <div className="flex flex-col items-center gap-1 text-center py-1">
            <div className="flex items-baseline gap-1">
                <p className="text-lg font-bold text-[#00F2FE]">{rank}</p>
                <p className="text-[10px] text-dark-text-secondary font-medium">/ {total}</p>
            </div>
            <p className="text-[9px] text-dark-text-secondary uppercase font-semibold">{label}</p>
        </div>
    );
    
    if (!rankings) return null;

    return (
        <Card className={`${cardClass} !py-1`}>
            <div className="grid grid-cols-3 gap-2 divide-x divide-white/10">
                <RankItem label={t.topScorer} rank={rankings.goalRank} total={rankings.total} />
                <RankItem label={t.topAssistant} rank={rankings.assistRank} total={rankings.total} />
                <RankItem label={t.rating} rank={rankings.ratingRank} total={rankings.total} />
            </div>
        </Card>
    );
};
