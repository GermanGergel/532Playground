
import React from 'react';
import { Player, BadgeType, PlayerStatus, SkillType } from '../types';
import { useTranslation } from '../ui';
import { BadgeIcon } from '../features';
import { StarIcon } from '../icons';
import { convertCountryCodeAlpha3ToAlpha2 } from '../utils/countries';

const skillAbbreviations: Record<SkillType, string> = {
    goalkeeper: 'GK',
    power_shot: 'PS',
    technique: 'TQ',
    defender: 'DF',
    playmaker: 'PM',
    finisher: 'FN',
    versatile: 'VS',
    tireless_motor: 'TM',
    leader: 'LD',
};

const Stat: React.FC<{ value: string | number, label: string }> = ({ value, label }) => (
    <div className="flex flex-col items-center gap-0 w-24 text-center">
      <p className="text-xl font-bold font-orbitron">{value}</p>
      <p className="text-[9px] tracking-widest uppercase text-dark-text-secondary">{label}</p>
    </div>
);

const RankItem: React.FC<{ label: string; rank: number; total: number }> = ({ label, rank, total }) => (
    <div className="flex flex-col items-center gap-0 text-center justify-center h-full">
        <div className="flex items-baseline gap-1">
            <p className="text-lg font-bold text-[#00F2FE]">#{rank}</p>
            <p className="text-[9px] text-dark-text-secondary font-medium">/ {total}</p>
        </div>
        <p className="text-[8px] text-dark-text-secondary uppercase font-semibold">{label}</p>
    </div>
);


export const ExportPlayerCard: React.FC<{ player: Player; allPlayers: Player[] }> = ({ player, allPlayers }) => {
    const t = useTranslation();
    const countryCodeAlpha2 = React.useMemo(() => player.countryCode ? convertCountryCodeAlpha3ToAlpha2(player.countryCode) : null, [player.countryCode]);

    const topBadges = React.useMemo(() => {
        return Object.entries(player.badges || {})
            .sort(([, countA], [, countB]) => (Number(countB) || 0) - (Number(countA) || 0))
            .slice(0, 5)
            .map(([badge]) => badge as BadgeType);
    }, [player.badges]);

    const rankings = React.useMemo(() => {
        const confirmedPlayers = allPlayers.filter(p => p.status === PlayerStatus.Confirmed);
        if (confirmedPlayers.length < 1) return null;

        const sortedByGoals = [...confirmedPlayers].sort((a, b) => b.totalGoals - a.totalGoals);
        const sortedByAssists = [...confirmedPlayers].sort((a, b) => b.totalAssists - a.totalAssists);
        const sortedByRating = [...confirmedPlayers].sort((a, b) => b.rating - a.rating);

        const goalRank = sortedByGoals.findIndex(p => p.id === player.id) + 1;
        const assistRank = sortedByAssists.findIndex(p => p.id === player.id) + 1;
        const ratingRank = sortedByRating.findIndex(p => p.id === player.id) + 1;

        return {
            goalRank,
            assistRank,
            ratingRank,
            total: confirmedPlayers.length,
        };
    }, [allPlayers, player.id]);

    const winRate = player.totalGames > 0 ? `${Math.round((player.totalWins / player.totalGames) * 100)}%` : 'N/A';
    const generationDate = new Date().toLocaleDateString('en-CA');
    
    return (
        <div 
            id="export-card-to-capture" 
            style={{ 
                width: 400, 
                height: 711,
                boxShadow: 'inset 0 0 20px 10px rgba(0,0,0,0.5)' // Inner shadow for depth
            }} 
            className="relative font-chakra bg-dark-surface text-white overflow-hidden"
        >
            {/* Layer 0: Big Name in the back */}
            <div className="absolute inset-0 z-0 flex items-center justify-center pointer-events-none">
                <h2 
                    className="font-blackops text-[130px] uppercase text-white/10 -rotate-90 origin-center tracking-widest"
                    style={{ textShadow: '0 0 15px rgba(0,0,0,0.5)' }}
                >
                    {player.surname || player.nickname}
                </h2>
            </div>
            
            {/* Layer 1: Background Image Div (with depth effect) */}
            {player.playerCard ? (
                <div
                    className="absolute inset-0 w-full h-full bg-cover bg-center z-10"
                    style={{ 
                        backgroundImage: `url(${player.playerCard})`,
                        transform: 'scale(1.05) perspective(1000px)', // 3D effect
                    }}
                />
            ) : (
                <div className="absolute inset-0 bg-dark-bg z-10"></div>
            )}


            {/* Layer 2: Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/70 to-transparent z-20" />

            {/* Layer 3: Content Wrapper */}
            <div className="relative z-30 flex flex-col h-full p-6">
                {/* Header */}
                <header className="flex justify-between items-start">
                    <div>
                        <p className="font-blackops text-2xl text-dark-accent-start accent-text-glow">532</p>
                        <p className="text-xs tracking-[0.2em] font-semibold text-white/80">PLAYGROUND</p>
                        {countryCodeAlpha2 && (
                            <img 
                                src={`https://flagcdn.com/w40/${countryCodeAlpha2.toLowerCase()}.png`}
                                alt={`${player.countryCode} flag`}
                                className="w-8 h-auto mt-2 rounded-sm"
                            />
                        )}
                    </div>
                    <div className="text-right">
                        {/* UPDATED: Reduced font size from 6xl to 5xl for better proportions */}
                        <p className="font-orbitron font-bold text-5xl text-dark-accent-start accent-text-glow" style={{ textShadow: '0 0 8px rgba(0, 242, 254, 0.8)' }}>
                            {player.rating}
                        </p>
                        <div className="mt-2">
                            <p className="text-xl tracking-widest">OVG</p>
                            <p className="text-sm font-semibold uppercase text-white/90">{t[`tier${player.tier.charAt(0).toUpperCase() + player.tier.slice(1)}`as keyof typeof t]}</p>
                        </div>
                    </div>
                </header>
                
                {/* Skills on the left */}
                {/* UPDATED: Fixed position top-40, improved vertical alignment of text with star */}
                <div className="absolute top-40 left-4 z-30">
                    <div className="space-y-3">
                        {(player.skills || []).slice(0, 5).map(skill => (
                            <div key={skill} className="flex items-center gap-2" title={t[`skill_${skill}` as keyof typeof t] || skill}>
                                <StarIcon className="w-4 h-4 text-[#00F2FE]" style={{ filter: 'drop-shadow(0 0 3px #00F2FE)'}} />
                                {/* Added leading-none and -top-[2px] to lift text to star center */}
                                <span className="font-bold text-xs text-white tracking-wider leading-none relative -top-[2px]" style={{ textShadow: '0 1px 3px #000' }}>
                                    {skillAbbreviations[skill]}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="flex-grow" />

                {/* Player Name */}
                {/* UPDATED: Increased margin-bottom (mb-5) to lift name higher above the line */}
                <section className="text-center mb-5">
                    <h1 className="font-audiowide text-4xl uppercase drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] leading-tight">
                        {player.nickname} {player.surname}
                    </h1>
                </section>

                {/* Key Stats (more compact) */}
                <section className="flex justify-around items-center my-1 py-2 border-t-2 border-dark-accent-start/30">
                    <Stat value={player.totalGoals} label={t.monthlyGoals} />
                    <Stat value={player.totalAssists} label={t.monthlyAssists} />
                    <Stat value={winRate} label={t.winRate} />
                </section>

                {/* Club Rankings */}
                {rankings && (
                    <section className="mt-2 mb-5 py-3 border-y-2 border-dark-accent-start/30">
                        <div className="grid grid-cols-3 gap-2 divide-x divide-white/10 items-center">
                            <RankItem label={t.topScorer} rank={rankings.goalRank} total={rankings.total} />
                            <RankItem label={t.topAssistant} rank={rankings.assistRank} total={rankings.total} />
                            <RankItem label={t.rating} rank={rankings.ratingRank} total={rankings.total} />
                        </div>
                    </section>
                )}


                {/* Badges */}
                <footer className="flex justify-between items-center gap-4 h-10 mt-auto">
                    <div className="text-left">
                        <p className="text-[9px] font-bold text-dark-text-secondary opacity-60">532 AUTHENTIC CARD</p>
                        <p className="text-[9px] font-mono text-dark-text-secondary opacity-60">Generated: {generationDate}</p>
                    </div>
                    <div className="flex justify-center items-center gap-4">
                        {topBadges.length > 0 ? (
                            topBadges.map(badge => (
                                <div key={badge} title={t[`badge_${badge}` as keyof typeof t] || ''}>
                                    <BadgeIcon badge={badge} className="w-9 h-9" count={player.badges?.[badge]} />
                                </div>
                            ))
                        ) : (
                            <p className="text-xs text-dark-text-secondary">{t.noBadges}</p>
                        )}
                    </div>
                </footer>
            </div>
        </div>
    );
};
