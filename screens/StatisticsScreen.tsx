import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context';
// FIX: Import directly from component files instead of barrel file to avoid import errors.
import { Page, Button, Modal, useTranslation } from '../ui';
import { TeamAvatar } from '../components/avatars';
import { Session } from '../types';
import { calculateAllStats } from '../services/statistics';
import { shareOrDownloadImages, exportSessionAsJson } from '../services/export';
import { BrandedHeader, hexToRgba, newId } from './utils';
import { homeScreenBackground } from '../assets';

// --- Statistics & Report Screen Components ---
export interface ShareableReportProps {
    session: Session;
    visibleSection?: 'standings' | 'players' | 'rounds';
    isExport?: boolean;
    itemLimit?: number;
}

export const ShareableReport: React.FC<ShareableReportProps> = ({ session, visibleSection, isExport = false, itemLimit }) => {
    const t = useTranslation();
    const { teamStats, allPlayersStats } = React.useMemo(() => calculateAllStats(session), [session]);
    
    const getCardClasses = (section: 'standings' | 'players' | 'rounds') => {
        // When exporting, all cards are transparent to show the branded background.
        const bgClass = isExport
            ? 'bg-transparent' 
            : 'bg-dark-bg';
        
        // Use standard padding for all cards for consistent spacing.
        const paddingClass = 'p-4';

        return `rounded-2xl ${paddingClass} border border-dark-accent-start/30 ${bgClass} w-full`;
    };
        
    const cardTitleClasses = "font-bold text-xl mb-4 text-dark-text";
    
    const sortedPlayers = allPlayersStats.sort((a,b) => (b.goals + b.assists) - (a.goals + a.assists));
    
    const finishedGames = session.games.filter(g => g.status === 'finished');
    const roundsToDisplay = itemLimit ? finishedGames.slice(0, itemLimit) : finishedGames;

    return (
        <div className="space-y-6">
            {/* Team Standings */}
            {(!visibleSection || visibleSection === 'standings') && (
            <div 
                className={getCardClasses('standings')}
                style={{ boxShadow: isExport ? 'none' : '0 8px 25px -5px rgba(0, 242, 254, 0.1), 0 5px 10px -6px rgba(0, 242, 254, 0.1)' }}
            >
                <h3 className={cardTitleClasses}>{t.teamStandings}</h3>
                <table className={`w-full text-sm text-center ${isExport ? 'table-fixed' : ''}`}>
                    <thead>
                        <tr className="text-dark-text-secondary">
                            <th className="text-left py-1 px-1 font-normal" style={{ width: '8%' }}>#</th>
                            <th className="py-1 px-1 font-normal text-center" style={{ width: '20%' }}>{t.team}</th>
                            <th className="py-1 px-1 font-normal" style={{ width: '10%' }}>{t.thP}</th>
                            <th className="py-1 px-1 font-normal" style={{ width: '10%' }}>{t.thW}</th>
                            <th className="py-1 px-1 font-normal" style={{ width: '10%' }}>{t.thD}</th>
                            <th className="py-1 px-1 font-normal" style={{ width: '10%' }}>{t.thL}</th>
                            <th className="py-1 px-1 font-normal" style={{ width: '12%' }}>{t.thGD}</th>
                            <th className="py-1 px-1 font-bold" style={{ width: '20%' }}>{t.thPts}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {teamStats.map(({ team, gamesPlayed, wins, draws, losses, goalDifference, points }, index) => (
                            <tr key={team.id} className="border-t border-white/10">
                                <td className="py-2 px-1 text-left">{index + 1}</td>
                                <td className={`py-2 px-1 flex justify-center`}><TeamAvatar team={team} size="xxs" /></td>
                                <td className="py-2 px-1">{gamesPlayed}</td>
                                <td className="py-2 px-1">{wins}</td>
                                <td className="py-2 px-1">{draws}</td>
                                <td className="py-2 px-1">{losses}</td>
                                <td className="py-2 px-1">{goalDifference > 0 ? `+${goalDifference}` : goalDifference}</td>
                                <td className="py-2 px-1 font-bold">{points}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            )}

            {/* Player Statistics */}
            {(!visibleSection || visibleSection === 'players') && (
             <div 
                className={getCardClasses('players')}
                style={{ boxShadow: isExport ? 'none' : '0 8px 25px -5px rgba(0, 242, 254, 0.1), 0 5px 10px -6px rgba(0, 242, 254, 0.1)' }}
             >
                <h3 className={cardTitleClasses}>{t.playerStatistics}</h3>
                <table className={`w-full text-sm text-center ${isExport ? 'table-fixed' : ''}`}>
                   <thead>
                        <tr className="text-dark-text-secondary">
                            <th className="text-left py-1 px-1 font-normal" style={{ width: '8%' }}>#</th>
                            <th className="text-left py-1 px-1 font-normal" style={{ width: '28%' }}>{t.players}</th>
                            <th className="py-1 px-1 font-normal" style={{ width: '15%' }}>{t.team}</th>
                            <th className="py-1 px-1 font-normal" style={{ width: '13%' }}>{t.thGP}</th>
                            <th className="py-1 px-1 font-normal" style={{ width: '12%' }}>{t.thG}</th>
                            <th className="py-1 px-1 font-normal" style={{ width: '12%' }}>{t.thA}</th>
                            <th className="py-1 px-1 font-bold" style={{ width: '12%' }}>{t.thTotal}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {sortedPlayers.map((stats, index) => (
                             <tr key={stats.player.id} className="border-t border-white/10">
                                <td className="py-2 px-1 text-left">{index + 1}</td>
                                <td className="py-2 px-1 text-left font-semibold truncate">{stats.player.nickname}</td>
                                <td className="py-2 px-1"><TeamAvatar team={stats.team} size="xxs" className="mx-auto" /></td>
                                <td className="py-2 px-1">{stats.gamesPlayed}</td>
                                <td className="py-2 px-1">{stats.goals}</td>
                                <td className="py-2 px-1">{stats.assists}</td>
                                <td className="py-2 px-1 font-bold">{stats.goals + stats.assists}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            )}
            
            {/* Round History */}
            {(!visibleSection || visibleSection === 'rounds') && finishedGames.length > 0 && (
             <div 
                className={getCardClasses('rounds')}
                style={{ fontVariantNumeric: 'tabular-nums', boxShadow: isExport ? 'none' : '0 8px 25px -5px rgba(0, 242, 254, 0.1), 0 5px 10px -6px rgba(0, 242, 254, 0.1)' }}
             >
                <h3 className={cardTitleClasses}>{t.gameHistory}</h3>
                <ul>
                    {roundsToDisplay.map((game, index) => {
                        const team1 = session.teams.find(t => t.id === game.team1Id);
                        const team2 = session.teams.find(t => t.id === game.team2Id);
                        if (!team1 || !team2) return null;
                        return (
                             <li key={game.id} className="flex items-center justify-between py-2 border-t border-white/10 first:border-t-0">
                                <span className="text-dark-text-secondary text-sm">{t.round} {game.gameNumber}</span>
                                <div className="flex items-center justify-end gap-3 flex-grow">
                                    <TeamAvatar team={team1} size="xxs" />
                                    <span className="font-bold text-sm">{game.team1Score} : {game.team2Score}</span>
                                    <TeamAvatar team={team2} size="xxs" />
                                </div>
                            </li>
                        )
                    })}
                </ul>
            </div>
            )}
        </div>
    );
};

const BrandedShareableReport: React.FC<{
    session: Session;
    children: React.ReactNode;
    className?: string;
    style?: React.CSSProperties;
    [key: string]: any;
}> = ({ session, children, className, style, ...props }) => {
    const PADDING = 40;

    const containerStyle: React.CSSProperties = {
        padding: `${PADDING}px`,
        backgroundImage: `url("${homeScreenBackground}")`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        boxSizing: 'border-box',
        ...style
    };

    return (
        <div 
            className={`flex flex-col items-center text-dark-text ${className}`} 
            style={containerStyle}
            data-export-target="true"
            {...props}
        >
            {children}
        </div>
    );
};


export const StatisticsScreen: React.FC = () => {
    const { activeSession } = useApp();
    const t = useTranslation();
    const navigate = useNavigate();
    const [isDownloadModalOpen, setIsDownloadModalOpen] = React.useState(false);
    const exportContainerRef = React.useRef<HTMLDivElement>(null);
    
    React.useEffect(() => {
        if (!activeSession) navigate('/');
    }, [activeSession, navigate]);

    if (!activeSession) return null;
    
    const handleExport = (section: 'standings' | 'players' | 'rounds') => {
        if (!exportContainerRef.current) return;
        
        const targetElement = exportContainerRef.current.querySelector(`[data-export-section="${section}"]`) as HTMLElement | null;

        if (targetElement) {
            shareOrDownloadImages([targetElement], activeSession.sessionName, activeSession.date, section.charAt(0).toUpperCase() + section.slice(1));
        }
        setIsDownloadModalOpen(false);
    };

    const displayDate = new Date(activeSession.date).toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric' });

    return (
        <Page>
             <Modal 
                isOpen={isDownloadModalOpen} 
                onClose={() => setIsDownloadModalOpen(false)} 
                size="xs"
                hideCloseButton
                containerClassName="border border-dark-accent-start/40 shadow-[0_0_20px_rgba(0,242,254,0.3)]"
            >
                <div className="flex flex-col gap-3">
                    <Button variant="secondary" onClick={() => handleExport('standings')} className="w-full shadow-lg shadow-dark-accent-start/20 hover:shadow-dark-accent-start/40">{t.exportStandings}</Button>
                    <Button variant="secondary" onClick={() => handleExport('players')} className="w-full shadow-lg shadow-dark-accent-start/20 hover:shadow-dark-accent-start/40">{t.exportPlayers}</Button>
                    <Button variant="secondary" onClick={() => handleExport('rounds')} className="w-full shadow-lg shadow-dark-accent-start/20 hover:shadow-dark-accent-start/40">{t.exportRounds}</Button>
                    <Button variant="secondary" onClick={() => setIsDownloadModalOpen(false)} className="w-full mt-2 shadow-lg shadow-dark-accent-start/20 hover:shadow-dark-accent-start/40">{t.cancel}</Button>
                </div>
            </Modal>
            <header className="text-center shrink-0 pt-4 mb-6">
                <h1 className="text-3xl font-black uppercase text-dark-text accent-text-glow">{t.liveStatistics}</h1>
            </header>
            
            <ShareableReport session={activeSession} />
            
            <div className="mt-auto pt-6 w-full flex flex-col gap-3">
                <Button variant="secondary" onClick={() => setIsDownloadModalOpen(true)} className="w-full shadow-lg shadow-dark-accent-start/20 hover:shadow-dark-accent-start/40">{t.saveTable}</Button>
                <Button variant="secondary" onClick={() => exportSessionAsJson(activeSession)} className="w-full shadow-lg shadow-dark-accent-start/20 hover:shadow-dark-accent-start/40">{t.exportJson}</Button>
            </div>

            {/* Hidden elements for branded export */}
            <div 
                style={{ position: 'absolute', top: 0, left: 0, zIndex: -1, opacity: 0, pointerEvents: 'none', display: 'flex', flexDirection: 'column', gap: '2rem', alignItems: 'flex-start' }} 
                ref={exportContainerRef}
            >
                <BrandedShareableReport session={activeSession} data-export-section="standings" style={{ width: '600px' }}>
                    <div className="mb-4 text-left w-full">
                        <BrandedHeader isExport={true} />
                        <p className="font-chakra text-dark-text mt-8 text-xl font-medium tracking-wider uppercase">{displayDate}</p>
                    </div>
                    <div className="p-4">
                        <ShareableReport session={activeSession} visibleSection="standings" isExport={true} />
                    </div>
                </BrandedShareableReport>
                
                <BrandedShareableReport 
                    session={activeSession} 
                    data-export-section="players"
                    style={{ width: '600px' }}
                >
                    <div className="mb-4 text-left w-full">
                        <BrandedHeader isExport={true} />
                        <p className="font-chakra text-dark-text mt-8 text-xl font-medium tracking-wider uppercase">{displayDate}</p>
                    </div>
                    <ShareableReport session={activeSession} visibleSection="players" isExport={true} />
                </BrandedShareableReport>
                
                <BrandedShareableReport 
                    session={activeSession} 
                    data-export-section="rounds"
                    style={{ width: '600px' }}
                >
                     <div className="mb-4 text-left w-full">
                        <BrandedHeader isExport={true} />
                        <p className="font-chakra text-dark-text mt-8 text-xl font-medium tracking-wider uppercase">{displayDate}</p>
                    </div>
                    <ShareableReport session={activeSession} visibleSection="rounds" isExport={true} />
                </BrandedShareableReport>
            </div>
        </Page>
    );
};