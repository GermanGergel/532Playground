import React from 'react';
import { Player, PlayerStatus } from '../types';
import { Card, useTranslation } from '../ui';
import { useApp } from '../context';

const BreakdownPill: React.FC<{ value: number, label: string }> = ({ value, label }) => {
    if (value === 0) return null;
    const isPositive = value > 0;
    const text = `${isPositive ? '+' : ''}${value.toFixed(1)}`;
    const colorClasses = isPositive ? 'text-green-400' : 'text-red-400';
    return (
        <div className="text-center">
            <p className={`text-sm font-bold ${colorClasses}`}>{text}</p>
            <p className="text-[9px] font-semibold uppercase text-dark-text-secondary -mt-1">{label}</p>
        </div>
    );
};

export const LastSessionBreakdown: React.FC<{ player: Player }> = ({ player }) => {
    const t = useTranslation();
    const breakdown = player.lastRatingChange;
    if (!breakdown || breakdown.finalChange === 0) return null;

    return (
        <Card title={t.lastSessionAnalysis} className="border border-white/10">
            <div className="flex items-center justify-between text-center py-1">
                {/* Before */}
                <div className="flex flex-col items-center space-y-1 w-[60px]">
                    <div className="w-12 h-12 rounded-full flex items-center justify-center bg-dark-surface border-2 border-white text-white font-black text-xl">
                        {breakdown.previousRating}
                    </div>
                    <span className="text-[7px] uppercase text-dark-text-secondary font-medium">{t.previousRating}</span>
                </div>

                {/* Connector */}
                <div className="flex-grow px-1 relative h-12 flex items-center">
                    <div className="absolute -top-3 left-0 right-0 flex justify-center gap-2 w-full">
                        <BreakdownPill value={breakdown.teamPerformance} label={t.lastSessionAnalysis_team} />
                        <BreakdownPill value={breakdown.individualPerformance} label={t.lastSessionAnalysis_indiv} />
                        <BreakdownPill value={breakdown.badgeBonus} label={t.lastSessionAnalysis_badge} />
                    </div>
                    <div className="h-0.5 w-full bg-dark-accent-start"></div>
                </div>

                {/* After */}
                <div className="flex flex-col items-center space-y-1 w-[60px]">
                    <div className="w-12 h-12 rounded-full flex items-center justify-center bg-dark-surface border-2 border-dark-accent-start text-dark-accent-start font-black text-xl">
                        {breakdown.newRating}
                    </div>
                    <span className="text-[7px] uppercase text-dark-text-secondary font-medium">{t.newRating}</span>
                </div>
            </div>
        </Card>
    );
};

export const ClubRankings: React.FC<{ player: Player }> = ({ player }) => {
    const t = useTranslation();
    const { allPlayers } = useApp();

    const confirmedPlayers = allPlayers.filter(p => p.status === PlayerStatus.Confirmed && p.totalGames > 0);
    
    // Sort by goals/game
    const scorers = [...confirmedPlayers].sort((a, b) => {
        const scoreA = a.totalGames > 0 ? a.totalGoals / a.totalGames : 0;
        const scoreB = b.totalGames > 0 ? b.totalGoals / b.totalGames : 0;
        return scoreB - scoreA;
    });
    const scorerRank = scorers.findIndex(p => p.id === player.id) + 1;

    // Sort by assists/game
    const assistants = [...confirmedPlayers].sort((a, b) => {
        const scoreA = a.totalGames > 0 ? a.totalAssists / a.totalGames : 0;
        const scoreB = b.totalGames > 0 ? b.totalAssists / b.totalGames : 0;
        return scoreB - scoreA;
    });
    const assistantRank = assistants.findIndex(p => p.id === player.id) + 1;

    // Sort by rating
    const topRated = [...confirmedPlayers].sort((a, b) => b.rating - a.rating);
    const ratingRank = topRated.findIndex(p => p.id === player.id) + 1;

    if (confirmedPlayers.length < 1) return null;
    
    const RankItem: React.FC<{ rank: number, total: number, label: string }> = ({ rank, total, label }) => {
        if (rank <= 0) return null;
        return (
            <div className="flex flex-col items-center">
                <p className="font-bold text-base leading-tight">
                    <span className="text-dark-accent-start text-lg">{rank}</span>
                    <span className="text-dark-text-secondary"> / {total}</span>
                </p>
                <p className="text-[9px] uppercase text-dark-text-secondary font-semibold">{label}</p>
            </div>
        );
    };

    return (
        <Card title={t.clubRankings} className="border border-white/10">
            <div className="flex justify-around text-center py-0.5">
                <RankItem rank={scorerRank} total={confirmedPlayers.length} label={t.topScorer} />
                <RankItem rank={assistantRank} total={confirmedPlayers.length} label={t.topAssistant} />
                <RankItem rank={ratingRank} total={confirmedPlayers.length} label={t.rating} />
            </div>
        </Card>
    );
};