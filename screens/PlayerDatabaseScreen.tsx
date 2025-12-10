import React from 'react';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import { useApp } from '../context';
import { Page, Button, Card, useTranslation } from '../ui';
import { PlayerAvatar } from '../components/avatars';
import { Plus, ChevronLeft } from '../icons';
import { Player, PlayerStatus, PlayerTier } from '../types';
import { PlayerAddModal } from '../modals';
import { newId } from './utils';
import { getTierForRating } from '../services/rating';
import { saveSinglePlayerToDB } from '../db';

type SortBy = 'rating' | 'name' | 'date';

export const PlayerDatabaseScreen: React.FC = () => {
    const t = useTranslation();
    const navigate = useNavigate();
    const { allPlayers, setAllPlayers } = useApp();
    const location = useLocation();

    const params = new URLSearchParams(location.search);
    const statusToShow = params.get('status') === PlayerStatus.Unconfirmed ? PlayerStatus.Unconfirmed : PlayerStatus.Confirmed;
    
    const [isAddModalOpen, setIsAddModalOpen] = React.useState(false);
    const [searchTerm, setSearchTerm] = React.useState('');
    const [sortBy, setSortBy] = React.useState<SortBy>('date');
    
    const playersToList = React.useMemo(() => {
        return allPlayers
            .filter(p => p.status === statusToShow)
            .filter(p => 
                p.nickname.toLowerCase().includes(searchTerm.toLowerCase()) ||
                p.surname.toLowerCase().includes(searchTerm.toLowerCase())
            )
            .sort((a, b) => {
                if (a.id === 'test-player-showcase') return -1;
                if (b.id === 'test-player-showcase') return 1;
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
    }, [allPlayers, statusToShow, searchTerm, sortBy]);

    const handleAddPlayer = (nickname: string) => {
        const newPlayer: Player = {
            id: newId(),
            nickname,
            surname: '',
            createdAt: new Date().toISOString(),
            countryCode: 'UA',
            status: PlayerStatus.Unconfirmed,
            totalGoals: 0, totalAssists: 0, totalGames: 0, totalWins: 0, totalDraws: 0, totalLosses: 0,
            totalSessionsPlayed: 0,
            rating: 60, tier: getTierForRating(60),
            monthlyGoals: 0, monthlyAssists: 0, monthlyGames: 0, monthlyWins: 0,
            monthlySessionsPlayed: 0,
            form: 'stable', badges: {}, skills: [], lastPlayedAt: new Date().toISOString(),
            // FIX: Initialize the 'records' property for the new Player object.
            records: {
                bestGoalsInSession: { value: 0, sessionId: '' },
                bestAssistsInSession: { value: 0, sessionId: '' },
                bestWinRateInSession: { value: 0, sessionId: '' },
            },
        };
        setAllPlayers(prev => [...prev, newPlayer]);
        saveSinglePlayerToDB(newPlayer);
    };

    const getTierGlowClass = (tier: PlayerTier) => {
        switch(tier) {
            case PlayerTier.Legend: return '!shadow-purple-400/30 !border-purple-400/50';
            case PlayerTier.Elite: return '!shadow-yellow-400/30 !border-yellow-400/50';
            case PlayerTier.Strong: return '!shadow-slate-300/30 !border-slate-300/50';
            case PlayerTier.Average: return '!shadow-cyan-400/30 !border-cyan-400/50';
            default: return '';
        }
    };

    const pageTitle = statusToShow === PlayerStatus.Unconfirmed ? t.newPlayerManagement : t.playerDatabase;
    const sortButtonClass = (sortType: SortBy) => `px-3 py-1 text-xs rounded-full font-semibold transition-colors ${sortBy === sortType ? 'gradient-bg text-dark-bg' : 'bg-dark-surface hover:bg-white/10'}`;

    return (
        <Page>
            <PlayerAddModal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} onSave={handleAddPlayer} />
            
            <div className="flex items-center justify-between mb-4 pt-2 relative">
                <Button variant="ghost" className="!p-2 -ml-2 z-10" onClick={() => navigate(-1)}>
                    <ChevronLeft className="w-7 h-7" />
                </Button>
                <h2 className="text-base font-bold text-white uppercase tracking-wider absolute left-1/2 -translate-x-1/2 w-full text-center pointer-events-none">{pageTitle}</h2>
                <div className="w-9 flex justify-end z-10">
                    {statusToShow === PlayerStatus.Unconfirmed && (
                        <button onClick={() => setIsAddModalOpen(true)} className="w-8 h-8 rounded-full border border-dark-accent-start/60 flex items-center justify-center text-dark-accent-start hover:bg-dark-accent-start/10 transition-all duration-300 shadow-[0_0_8px_rgba(0,242,254,0.3)] active:scale-95">
                            <Plus className="w-5 h-5" strokeWidth={2.5} />
                        </button>
                    )}
                </div>
            </div>
            
            {/* Search and Sort UI */}
            {statusToShow === PlayerStatus.Confirmed && (
                <div className="mb-4 space-y-3">
                    <input
                        type="text"
                        placeholder={t.searchPlayers}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full p-2 bg-dark-surface/80 rounded-lg border border-white/10 focus:ring-1 focus:ring-dark-accent-start focus:outline-none text-sm placeholder:text-dark-text-secondary/50"
                    />
                    <div className="flex items-center justify-center gap-2">
                        <span className="text-xs font-semibold text-dark-text-secondary">{t.sortBy}</span>
                        <button onClick={() => setSortBy('rating')} className={sortButtonClass('rating')}>{t.sortByRating}</button>
                        <button onClick={() => setSortBy('name')} className={sortButtonClass('name')}>{t.sortByName}</button>
                        <button onClick={() => setSortBy('date')} className={sortButtonClass('date')}>{t.sortByDate}</button>
                    </div>
                </div>
            )}

            {playersToList.length > 0 ? (
                <ul className="space-y-3">
                    {playersToList.map(player => (
                        <li key={player.id}>
                            <Link to={`/player/${player.id}`}>
                                <Card className={`hover:bg-white/10 transition-all duration-300 !p-3 shadow-lg ${getTierGlowClass(player.tier)}`}>
                                    <div className="flex items-center gap-4">
                                        <PlayerAvatar player={player} size="md" />
                                        <div className="flex-grow">
                                            <p className="font-bold">{player.nickname}</p>
                                            <p className="text-sm text-dark-text-secondary">{player.surname || ' '}</p>
                                        </div>
                                         {player.status === PlayerStatus.Unconfirmed && (
                                            <span className="text-[9px] font-bold bg-yellow-500/10 text-yellow-500 px-1.5 py-0.5 rounded border border-yellow-500/30 animate-pulse tracking-wide">
                                                {t.unconfirmedBadge}
                                            </span>
                                        )}
                                        {player.status === PlayerStatus.Confirmed && (
                                            <span className="font-black text-lg text-dark-text mr-2">OVG {player.rating}</span>
                                        )}
                                    </div>
                                </Card>
                            </Link>
                        </li>
                    ))}
                </ul>
            ) : (
                 <p className="text-center text-dark-text-secondary mt-10">{t.noPlayersFound}</p>
            )}
        </Page>
    );
};