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
        <div className={`flex flex-col items-center justify-center px-2 py-1 rounded-lg ${colorClasses}`}>
            <span className="text-sm font-bold leading-none">{text}</span>
            <span className="text-[9px] font-semibold uppercase leading-none">{label}</span>
        </div>
    );
};

// FIX: Export LastSessionBreakdown component
export const LastSessionBreakdown: React.FC<{ player: Player }> = ({ player }) => {
    const t = useTranslation();
    const breakdown = player.lastRatingChange;
    if (!breakdown || breakdown.finalChange === 0) return null;

    return (
        <Card title={t.lastSessionAnalysis} className="border border-white/10 shadow-[0_0_15px_rgba(0,242,254,0.3)]">
            <div className="flex items-center justify-between text-center">
                <div className="flex flex-col items-center">
                    <span className="text-2xl font-bold key-stat-glow">{breakdown.newRating}</span>
                    <span className="text-[10px] uppercase text-dark-text-secondary">{t.newRating}</span>
                </div>
                <div className="flex gap-1.5">
                    <RatingChangePill value={breakdown.teamPerformance} label={t.lastSessionAnalysis_team} />
                    <RatingChangePill value={breakdown.individualPerformance} label={t.lastSessionAnalysis_indiv} />
                    <RatingChangePill value={breakdown.badgeBonus} label={t.lastSessionAnalysis_badge} />
                </div>
            </div>
        </Card>
    );
};

// FIX: Export ClubRankings component
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
    
    const rankPillClass = `flex-1 flex items-center gap-2 p-1.5 rounded-lg bg-dark-bg`;
    const rankTextClass = "text-sm";

    if (confirmedPlayers.length < 3) return null;

    return (
        <Card title={t.clubRankings} className="border border-white/10 shadow-[0_0_15px_rgba(0,242,254,0.3)] !p-2">
            <div className="flex gap-1.5 justify-center">
                {scorerRank > 0 && (
                    <div className={rankPillClass}>
                        <BootIcon className="w-5 h-5 text-yellow-400" />
                        <span className={rankTextClass}>Top {scorerRank}</span>
                    </div>
                )}
                 {assistantRank > 0 && (
                    <div className={rankPillClass}>
                        <HandshakeIcon className="w-5 h-5 text-green-400" />
                        <span className={rankTextClass}>Top {assistantRank}</span>
                    </div>
                )}
                 {ratingRank > 0 && (
                    <div className={rankPillClass}>
                        <CrownIcon className="w-5 h-5 text-purple-400" />
                        <span className={rankTextClass}>Top {ratingRank}</span>
                    </div>
                )}
            </div>
        </Card>
    );
};