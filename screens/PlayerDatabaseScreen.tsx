
import React from 'react';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import { useApp } from '../context';
import { Page, Button, Card, useTranslation } from '../ui';
import { PlayerAvatar } from '../components/avatars';
import { Plus, ChevronLeft } from '../icons';
import { Player, PlayerStatus, PlayerTier } from '../types';
import { PlayerAddModal } from '../modals';

type SortBy = 'rating' | 'name' | 'date';

// Re-defined here to avoid circular dependency with features.tsx or icons.tsx
const TrophyIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg>
);


export const PlayerDatabaseScreen: React.FC = () => {
    const t = useTranslation();
    const navigate = useNavigate();
    const { allPlayers } = useApp();
    
    const [searchTerm, setSearchTerm] = React.useState('');
    const [sortBy, setSortBy] = React.useState<SortBy>('rating');
    
    // This screen is now the "Rankings", so it should only show confirmed players.
    const playersToList = React.useMemo(() => {
        return allPlayers
            .filter(p => p.status === PlayerStatus.Confirmed)
            .filter(p => 
                p.nickname.toLowerCase().includes(searchTerm.toLowerCase()) ||
                p.surname.toLowerCase().includes(searchTerm.toLowerCase())
            )
            .sort((a, b) => {
                switch (sortBy) {
                    case 'rating':
                        return b.rating - a.rating;
                    case 'name':
                        return a.nickname.localeCompare(b.nickname);
                    case 'date':
                    default:
                        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
                }
            });
    }, [allPlayers, searchTerm, sortBy]);

    const getTierStyling = (tier: PlayerTier) => {
        switch(tier) {
            case PlayerTier.Legend: return { color: '#A755F7', glow: 'shadow-[0_0_15px_rgba(167,85,247,0.5)]' };
            case PlayerTier.Elite: return { color: '#FBBF24', glow: 'shadow-[0_0_15px_rgba(251,191,36,0.5)]' };
            case PlayerTier.Strong: return { color: '#E5E7EB', glow: 'shadow-[0_0_15px_rgba(229,231,235,0.4)]' };
            case PlayerTier.Average: return { color: '#22D3EE', glow: 'shadow-[0_0_15px_rgba(34,211,238,0.5)]' };
            default: return { color: '#6B7280', glow: '' };
        }
    };

    const getRankColor = (rank: number) => {
        if (rank === 1) return 'text-yellow-400';
        if (rank === 2) return 'text-slate-300';
        if (rank === 3) return 'text-orange-400';
        return 'text-zinc-500';
    };

    const sortButtonClass = (sortType: SortBy) => `px-4 py-1.5 text-xs rounded-lg font-bold transition-colors uppercase tracking-wider border ${sortBy === sortType ? 'bg-[#00F2FE]/10 border-[#00F2FE] text-white shadow-[0_0_10px_rgba(0,242,254,0.3)]' : 'bg-transparent border-white/10 text-zinc-400 hover:bg-white/10 hover:text-white'}`;

    return (
        <Page className="!p-0">
            <div className="sticky top-0 z-20 bg-dark-bg/80 backdrop-blur-lg pt-6 pb-4 px-4 border-b border-white/5">
                <div className="flex items-center justify-center gap-2 mb-4">
                    <TrophyIcon className="w-6 h-6 text-dark-accent-start" />
                    <h1 className="text-2xl font-black font-orbitron uppercase tracking-wider text-white text-center">
                        Club Rankings
                    </h1>
                </div>

                <div className="space-y-3 max-w-sm mx-auto">
                    <input
                        type="text"
                        placeholder={t.searchPlayers}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full p-3 bg-dark-surface/80 rounded-lg border border-white/10 focus:ring-2 focus:ring-dark-accent-start focus:outline-none text-sm placeholder:text-dark-text-secondary/50"
                    />
                    <div className="flex items-center justify-center gap-2">
                        <button onClick={() => setSortBy('rating')} className={sortButtonClass('rating')}>{t.sortByRating}</button>
                        <button onClick={() => setSortBy('name')} className={sortButtonClass('name')}>{t.sortByName}</button>
                        <button onClick={() => setSortBy('date')} className={sortButtonClass('date')}>{t.sortByDate}</button>
                    </div>
                </div>
            </div>

            {playersToList.length > 0 ? (
                <ul className="space-y-2 p-2 max-w-sm mx-auto">
                    {playersToList.map((player, index) => {
                        const tierStyle = getTierStyling(player.tier);
                        const rank = index + 1;

                        return (
                            <li key={player.id} className="animate-in fade-in slide-in-from-bottom-4 duration-500" style={{ animationDelay: `${Math.min(index * 50, 500)}ms`}}>
                                <Link to={`/player/${player.id}`}>
                                    <div className="relative group bg-dark-surface/60 hover:bg-dark-surface/90 transition-all duration-300 rounded-2xl border border-white/10 p-3 overflow-hidden">
                                        {/* Tier Glow Effect */}
                                        <div className={`absolute -right-12 -top-12 w-32 h-32 rounded-full blur-2xl opacity-20 group-hover:opacity-30 transition-opacity`} style={{ backgroundColor: tierStyle.color }}></div>

                                        <div className="flex items-center gap-4 relative z-10">
                                            {/* Rank */}
                                            <div className="w-10 text-center flex-shrink-0">
                                                <span className={`font-orbitron font-black text-2xl ${getRankColor(rank)}`}>
                                                    #{rank}
                                                </span>
                                            </div>

                                            {/* Avatar & Name */}
                                            <PlayerAvatar player={player} size="md" />
                                            <div className="flex-grow min-w-0">
                                                <p className="font-bold truncate text-white">{player.nickname}</p>
                                                <p className="text-xs text-dark-text-secondary truncate">{player.surname || ' '}</p>
                                            </div>
                                            
                                            {/* Rating Badge */}
                                            <div className={`flex flex-col items-center justify-center w-20 h-20 rounded-xl border-2 ${tierStyle.glow}`} style={{ backgroundColor: `rgba(20,22,28,0.7)`, borderColor: tierStyle.color }}>
                                                <p className="font-orbitron font-black text-3xl leading-none" style={{ color: tierStyle.color, textShadow: `0 0 8px ${tierStyle.color}` }}>
                                                    {player.rating}
                                                </p>
                                                <p className="text-[10px] text-white/80 font-bold tracking-widest mt-1">OVG</p>
                                            </div>
                                        </div>
                                    </div>
                                </Link>
                            </li>
                        );
                    })}
                </ul>
            ) : (
                 <p className="text-center text-dark-text-secondary mt-10">{t.noPlayersFound}</p>
            )}
        </Page>
    );
};
