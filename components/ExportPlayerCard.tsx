
import React from 'react';
import { Player, BadgeType, PlayerStatus, SkillType, PlayerForm, Session } from '../types';
import { useTranslation } from '../ui';
import { BadgeIcon, getBadgePriority } from '../features';
import { StarIcon } from '../icons';
import { convertCountryCodeAlpha3ToAlpha2 } from '../utils/countries';
import { useApp } from '../context';
import { MiniSquadBadge } from './MiniSquadBadge';

const skillAbbreviations: Record<SkillType, string> = {
    goalkeeper: 'GK', power_shot: 'PS', technique: 'TQ', defender: 'DF', 
    playmaker: 'PM', finisher: 'FN', versatile: 'VS', tireless_motor: 'TM', leader: 'LD',
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
    const { totmPlayerIds } = useApp();
    
    // Check if player is currently in Team of the Month
    const isTotm = totmPlayerIds.has(player.id);

    const countryCodeAlpha2 = React.useMemo(() => player.countryCode ? convertCountryCodeAlpha3ToAlpha2(player.countryCode) : null, [player.countryCode]);

    const topBadges = React.useMemo(() => {
        return Object.entries(player.badges || {})
            .map(([badge]) => badge as BadgeType)
            .sort((a, b) => getBadgePriority(b) - getBadgePriority(a))
            .slice(0, 6); 
    }, [player.badges]);

    const rankings = React.useMemo(() => {
        const confirmedPlayers = allPlayers.filter(p => p.status === PlayerStatus.Confirmed);
        if (confirmedPlayers.length < 1) return null;

        const getWR = (p: Player) => p.totalGames > 0 ? (p.totalWins / p.totalGames) : 0;

        // TIE-BREAKER LOGIC MATCHING CLUB HUB LEADERS
        const sortedByGoals = [...confirmedPlayers].sort((a, b) => {
            if (b.totalGoals !== a.totalGoals) return b.totalGoals - a.totalGoals;
            if (b.rating !== a.rating) return b.rating - a.rating;
            if (b.totalAssists !== a.totalAssists) return b.totalAssists - a.totalAssists;
            const wrA = getWR(a); const wrB = getWR(b);
            if (wrB !== wrA) return wrB - wrA;
            return b.totalGames - a.totalGames;
        });

        const sortedByAssists = [...confirmedPlayers].sort((a, b) => {
            if (b.totalAssists !== a.totalAssists) return b.totalAssists - a.totalAssists;
            if (b.rating !== a.rating) return b.rating - a.rating;
            if (b.totalGoals !== a.totalGoals) return b.totalGoals - a.totalGoals;
            const wrA = getWR(a); const wrB = getWR(b);
            if (wrB !== wrA) return wrB - wrA;
            return b.totalGames - a.totalGames;
        });

        const sortedByRating = [...confirmedPlayers].sort((a, b) => {
            if (b.rating !== a.rating) return b.rating - a.rating;
            const scoreA = (a.totalGoals || 0) + (a.totalAssists || 0);
            const scoreB = (b.totalGoals || 0) + (b.totalAssists || 0);
            if (scoreB !== scoreA) return scoreB - scoreA;
            const wrA = getWR(a); const wrB = getWR(b);
            if (wrB !== wrA) return wrB - wrA;
            return b.totalGames - a.totalGames;
        });

        return {
            goalRank: sortedByGoals.findIndex(p => p.id === player.id) + 1,
            assistRank: sortedByAssists.findIndex(p => p.id === player.id) + 1,
            ratingRank: sortedByRating.findIndex(p => p.id === player.id) + 1,
            total: confirmedPlayers.length,
        };
    }, [allPlayers, player.id]);

    const winRate = player.totalGames > 0 ? `${Math.round((player.totalWins / player.totalGames) * 100)}%` : 'N/A';
    
    return (
        <div 
            id="export-card-to-capture" 
            style={{ 
                width: 400, 
                height: 711,
                boxShadow: 'inset 0 0 20px 10px rgba(0,0,0,0.5)'
            }} 
            className="relative font-chakra bg-dark-bg text-white overflow-hidden"
        >
            {/* Background Branding Name */}
            <div className="absolute inset-0 z-0 flex items-center justify-center pointer-events-none">
                <h2 
                    className="font-russo text-[130px] uppercase text-white/10 -rotate-90 origin-center tracking-widest"
                    style={{ textShadow: '0 0 15px rgba(0,0,0,0.5)' }}
                >
                    {player.surname || player.nickname}
                </h2>
            </div>
            
            {/* Main Player Photo */}
            {player.playerCard ? (
                <div
                    className="absolute inset-0 w-full h-full bg-cover bg-center z-10"
                    style={{ 
                        backgroundImage: `url(${player.playerCard})`,
                        transform: 'scale(1.05)',
                    }}
                />
            ) : (
                <div className="absolute inset-0 bg-dark-bg z-10"></div>
            )}

            {/* Cinematic Gradient */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/70 to-transparent z-20" />

            <div className="relative z-30 flex flex-col h-full p-6">
                <header className="flex justify-between items-start">
                    <div className="pt-2">
                        {/* EXPORT BRAND REPLACEMENT: DARK TURQUOISE */}
                        <p 
                            className="font-russo text-4xl leading-none tracking-tighter"
                            style={{ 
                                background: 'linear-gradient(180deg, #155e75 0%, #083344 100%)',
                                WebkitBackgroundClip: 'text',
                                WebkitTextFillColor: 'transparent',
                                opacity: 0.8,
                            }}
                        >
                            UNIT
                        </p>
                        {countryCodeAlpha2 && (
                            <img 
                                src={`https://flagcdn.com/w40/${countryCodeAlpha2.toLowerCase()}.png`}
                                alt={`${player.countryCode} flag`}
                                className="w-8 h-auto mt-6 rounded-sm shadow-md opacity-90"
                            />
                        )}
                    </div>
                    <div className="text-right flex flex-col items-end">
                        <p className="font-orbitron font-bold text-5xl text-dark-accent-start accent-text-glow leading-none" style={{ textShadow: '0 0 8px rgba(0, 242, 254, 0.8)' }}>
                            {player.rating}
                        </p>
                        <div className="mt-6 flex flex-col items-end">
                            <p className="text-xl tracking-widest leading-none font-bold">OVR</p>
                            <p className="text-sm font-semibold uppercase text-white/80 mt-1">{t[`tier${player.tier.charAt(0).toUpperCase() + player.tier.slice(1)}`as keyof typeof t]}</p>
                        </div>
                    </div>
                </header>
                
                {/* Fixed Skill Alignment & TOTM Badge */}
                <div className="absolute top-40 left-6 z-30">
                    <div className="space-y-4">
                        {(player.skills || []).slice(0, 5).map(skill => (
                            <div key={skill} className="flex items-center gap-2 h-6" title={t[`skill_${skill}` as keyof typeof t] || skill}>
                                <div className="shrink-0 flex items-center justify-center w-5 h-5">
                                    <StarIcon className="w-5 h-5 text-[#00F2FE]" style={{ filter: 'drop-shadow(0 0 3px #00F2FE)'}} />
                                </div>
                                <span className="font-black text-[12px] text-white tracking-widest leading-none" style={{ textShadow: '0 1px 4px #000' }}>
                                    {skillAbbreviations[skill]}
                                </span>
                            </div>
                        ))}
                    </div>

                    {/* Team of the Month Badge (Export Version) */}
                    {isTotm && (
                        <div className="mt-6 -ml-1">
                            <MiniSquadBadge size="w-12 h-12" />
                        </div>
                    )}
                </div>

                <div className="flex-grow" />

                <section className="text-center mb-5">
                    <h1 
                        className="font-russo text-4xl uppercase leading-tight"
                        style={{ 
                            background: 'linear-gradient(180deg, #155e75 0%, #083344 100%)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            opacity: 0.9,
                            filter: 'drop-shadow(0 1px 4px rgba(0,0,0,0.8))',
                        }}
                    >
                        {player.nickname} {player.surname}
                    </h1>
                </section>

                <section className="flex justify-around items-center my-1 py-2 border-t-2 border-dark-accent-start/30">
                    <Stat value={player.totalGoals} label={t.monthlyGoals} />
                    <Stat value={player.totalAssists} label={t.monthlyAssists} />
                    <Stat value={winRate} label={t.winRate} />
                </section>

                {rankings && (
                    <section className="mt-2 mb-2 py-3 border-y-2 border-dark-accent-start/30">
                        <div className="grid grid-cols-3 gap-2 divide-x divide-white/10 items-center">
                            <RankItem label={t.topScorer} rank={rankings.goalRank} total={rankings.total} />
                            <RankItem label={t.topAssistant} rank={rankings.assistRank} total={rankings.total} />
                            <RankItem label={t.rating} rank={rankings.ratingRank} total={rankings.total} />
                        </div>
                    </section>
                )}

                <footer className="h-14 mt-auto border-t border-white/10 flex items-center">
                    <div className="flex justify-evenly items-center w-full px-1">
                        {topBadges.length > 0 ? topBadges.map(badge => (
                            <div key={badge} className="relative z-10">
                                <BadgeIcon badge={badge} className="w-9 h-9 drop-shadow-md" count={player.badges?.[badge]} />
                            </div>
                        )) : (
                            <div className="w-full text-center">
                                <p className="text-[10px] font-bold text-dark-text-secondary opacity-40 tracking-[0.3em]">UNIT AUTHENTIC</p>
                            </div>
                        )}
                    </div>
                </footer>
            </div>
        </div>
    );
};
