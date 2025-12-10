
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context';
// FIX: Import directly from component files instead of barrel file to avoid import errors.
import { Page, Button, Modal, useTranslation } from '../ui';
import { TeamAvatar } from '../components/avatars';
import { Session } from '../types';
import { calculateAllStats } from '../services/statistics';
import { shareOrDownloadImages } from '../services/export';
import { BrandedHeader, newId } from './utils';
import { homeScreenBackground } from '../assets';

// --- Local Component Definition for Exports ---
const BrandedShareableReport: React.FC<{
    session: Session;
    children: React.ReactNode;
    className?: string;
    style?: React.CSSProperties;
    [key: string]: any;
}> = ({ session, children, className, style, ...props }) => {
    // Default padding, can be overridden by style prop
    const defaultPadding = 40;

    const containerStyle: React.CSSProperties = {
        padding: `${defaultPadding}px`,
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

        // Added overflow-hidden to prevent inner content from breaking out of rounded corners
        return `rounded-2xl ${paddingClass} border border-dark-accent-start/30 ${bgClass} w-full overflow-hidden`;
    };
        
    const cardTitleClasses = "font-bold text-xl mb-4 text-dark-text";
    
    const sortedPlayers = allPlayersStats.sort((a,b) => (b.goals + b.assists) - (a.goals + a.assists));
    
    const finishedGames = session.games.filter(g => g.status === 'finished');
    const roundsToDisplay = itemLimit ? finishedGames.slice(0, itemLimit) : finishedGames;

    // FIX: Reduced text size to text-[10px] or text-xs and enforced table-fixed to prevent overflow
    const tableTextClass = "text-[10px] sm:text-xs text-center table-fixed"; 
    const cellPadding = "py-1.5 px-0.5";

    return (
        <div className="space-y-6 w-full max-w-full">
            {/* Team Standings */}
            {(!visibleSection || visibleSection === 'standings') && (
            <div 
                className={getCardClasses('standings')}
                style={{ boxShadow: isExport ? 'none' : '0 8px 25px -5px rgba(0, 242, 254, 0.1), 0 5px 10px -6px rgba(0, 242, 254, 0.1)' }}
            >
                <h3 className={cardTitleClasses}>{t.teamStandings}</h3>
                <div className="overflow-x-hidden">
                    <table className={`w-full ${tableTextClass}`}>
                        <thead>
                            <tr className="text-dark-text-secondary">
                                <th className={`text-left font-normal ${cellPadding}`} style={{ width: '8%' }}>#</th>
                                <th className={`font-normal text-center ${cellPadding}`} style={{ width: '20%' }}>{t.team}</th>
                                <th className={`font-normal ${cellPadding}`} style={{ width: '10%' }}>{t.thP}</th>
                                <th className={`font-normal ${cellPadding}`} style={{ width: '10%' }}>{t.thW}</th>
                                <th className={`font-normal ${cellPadding}`} style={{ width: '10%' }}>{t.thD}</th>
                                <th className={`font-normal ${cellPadding}`} style={{ width: '10%' }}>{t.thL}</th>
                                <th className={`font-normal ${cellPadding}`} style={{ width: '12%' }}>{t.thGD}</th>
                                <th className={`font-bold ${cellPadding}`} style={{ width: '20%' }}>{t.thPts}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {teamStats.map(({ team, gamesPlayed, wins, draws, losses, goalDifference, points }, index) => (
                                <tr key={team.id} className="border-t border-white/10">
                                    <td className={`${cellPadding} text-left`}>{index + 1}</td>
                                    <td className={`${cellPadding} flex justify-center items-center`}>
                                        <TeamAvatar team={team} size="xxs" className={isExport ? 'translate-y-2' : ''} />
                                    </td>
                                    <td className={cellPadding}>{gamesPlayed}</td>
                                    <td className={cellPadding}>{wins}</td>
                                    <td className={cellPadding}>{draws}</td>
                                    <td className={cellPadding}>{losses}</td>
                                    <td className={cellPadding}>{goalDifference > 0 ? `+${goalDifference}` : goalDifference}</td>
                                    <td className={`${cellPadding} font-bold`}>{points}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
            )}

            {/* Player Statistics */}
            {(!visibleSection || visibleSection === 'players') && (
             <div 
                className={getCardClasses('players')}
                style={{ boxShadow: isExport ? 'none' : '0 8px 25px -5px rgba(0, 242, 254, 0.1), 0 5px 10px -6px rgba(0, 242, 254, 0.1)' }}
             >
                <h3 className={cardTitleClasses}>{t.playerStatistics}</h3>
                <div className="overflow-x-hidden">
                    <table className={`w-full ${tableTextClass}`}>
                    <thead>
                            <tr className="text-dark-text-secondary">
                                <th className={`text-left font-normal ${cellPadding}`} style={{ width: '10%' }}>#</th>
                                <th className={`text-left font-normal ${cellPadding}`} style={{ width: '35%' }}>{t.players}</th>
                                <th className={`font-normal ${cellPadding}`} style={{ width: '15%' }}>{t.team}</th>
                                <th className={`font-normal ${cellPadding}`} style={{ width: '10%' }}>{t.thGP}</th>
                                <th className={`font-normal ${cellPadding}`} style={{ width: '10%' }}>{t.thG}</th>
                                <th className={`font-normal ${cellPadding}`} style={{ width: '10%' }}>{t.thA}</th>
                                <th className={`font-bold ${cellPadding}`} style={{ width: '10%' }}>{t.thTotal}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {sortedPlayers.map((stats, index) => (
                                <tr key={stats.player.id} className="border-t border-white/10">
                                    <td className={`${cellPadding} text-left`}>{index + 1}</td>
                                    {/* Truncate long names to prevent layout shift */}
                                    <td className={`${cellPadding} text-left font-semibold truncate pr-2 max-w-[80px] sm:max-w-[100px]`} title={stats.player.nickname}>
                                        {stats.player.nickname}
                                    </td>
                                    <td className={cellPadding}><TeamAvatar team={stats.team} size="xxs" className={`mx-auto ${isExport ? 'translate-y-2' : ''}`} /></td>
                                    <td className={cellPadding}>{stats.gamesPlayed}</td>
                                    <td className={cellPadding}>{stats.goals}</td>
                                    <td className={cellPadding}>{stats.assists}</td>
                                    <td className={`${cellPadding} font-bold`}>{stats.goals + stats.assists}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
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
                                <span className="text-dark-text-secondary text-xs">{t.round} {game.gameNumber}</span>
                                <div className="flex items-center justify-end gap-2 flex-grow">
                                    <TeamAvatar team={team1} size="xxs" className={isExport ? 'translate-y-2' : ''} />
                                    <span className={`font-bold tabular-nums w-16 text-center text-sm`}>{game.team1Score} : {game.team2Score}</span>
                                    <TeamAvatar team={team2} size="xxs" className={isExport ? 'translate-y-2' : ''} />
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

export const StatisticsScreen: React.FC = () => {
    const { activeSession } = useApp();
    const t = useTranslation();
    const navigate = useNavigate();
    const [isDownloadModalOpen, setIsDownloadModalOpen] = React.useState(false);
    const [isExporting, setIsExporting] = React.useState(false);
    const exportContainerRef = React.useRef<HTMLDivElement>(null);
    
    React.useEffect(() => {
        if (!activeSession) navigate('/');
    }, [activeSession, navigate]);

    if (!activeSession) return null;
    
    const handleExport = async (section: 'standings' | 'players' | 'rounds') => {
        if (isExporting || !exportContainerRef.current) return;
        setIsExporting(true);

        // Wait for UI to update with loading state
        await new Promise(res => setTimeout(res, 50));

        const targetElement = exportContainerRef.current.querySelector(`[data-export-section="${section}"]`) as HTMLElement | null;
        const exportId = `export-target-${section}-${newId()}`;

        if (targetElement) {
            targetElement.id = exportId;
            try {
                await shareOrDownloadImages(exportId, activeSession.sessionName, activeSession.date, section.charAt(0).toUpperCase() + section.slice(1));
            } finally {
                targetElement.id = ''; // Cleanup ID
                setIsExporting(false);
                setIsDownloadModalOpen(false);
            }
        } else {
            console.error(`Export target for section "${section}" not found.`);
            setIsExporting(false);
        }
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
                    <Button variant="secondary" onClick={() => handleExport('standings')} disabled={isExporting} className="w-full font-chakra font-bold text-xl tracking-wider !py-3 shadow-lg shadow-dark-accent-start/20 hover:shadow-dark-accent-start/40">{isExporting ? 'Exporting...' : t.exportStandings}</Button>
                    <Button variant="secondary" onClick={() => handleExport('players')} disabled={isExporting} className="w-full font-chakra font-bold text-xl tracking-wider !py-3 shadow-lg shadow-dark-accent-start/20 hover:shadow-dark-accent-start/40">{isExporting ? 'Exporting...' : t.exportPlayers}</Button>
                    <Button variant="secondary" onClick={() => handleExport('rounds')} disabled={isExporting} className="w-full font-chakra font-bold text-xl tracking-wider !py-3 shadow-lg shadow-dark-accent-start/20 hover:shadow-dark-accent-start/40">{isExporting ? 'Exporting...' : t.exportRounds}</Button>
                    <Button variant="secondary" onClick={() => setIsDownloadModalOpen(false)} disabled={isExporting} className="w-full font-chakra font-bold text-xl tracking-wider !py-3 mt-2 shadow-lg shadow-dark-accent-start/20 hover:shadow-dark-accent-start/40">{t.cancel}</Button>
                </div>
            </Modal>
            <header className="text-center shrink-0 pt-4 mb-6">
                <h1 className="text-3xl font-black uppercase text-dark-text accent-text-glow">{t.liveStatistics}</h1>
            </header>
            
            <ShareableReport session={activeSession} />
            
            <div className="mt-auto pt-6 w-full flex flex-col gap-3">
                <Button variant="secondary" onClick={() => setIsDownloadModalOpen(true)} className="w-full font-chakra font-bold text-xl tracking-wider !py-3 shadow-lg shadow-dark-accent-start/20 hover:shadow-dark-accent-start/40">{t.saveTable}</Button>
            </div>

            {/* Hidden elements for branded export - STRICTLY SEPARATED */}
            <div 
                style={{ position: 'absolute', top: 0, left: 0, zIndex: -1, opacity: 0, pointerEvents: 'none', display: 'flex', flexDirection: 'column', gap: '2rem', alignItems: 'flex-start' }} 
                ref={exportContainerRef}
            >
                {/* 1. STANDINGS - Full Header (Standard) */}
                <BrandedShareableReport session={activeSession} data-export-section="standings" style={{ width: '600px' }}>
                    <div className="mb-4 text-left w-full">
                        <BrandedHeader isExport={true} />
                        <p className="font-chakra text-dark-text mt-8 text-xl font-medium tracking-wider uppercase">{displayDate}</p>
                    </div>
                    <div className="p-4 w-full">
                        <ShareableReport session={activeSession} visibleSection="standings" isExport={true} />
                    </div>
                </BrandedShareableReport>
                
                {/* 2. PLAYERS - Compact (No Header) */}
                <BrandedShareableReport 
                    session={activeSession} 
                    data-export-section="players"
                    style={{ width: '500px', padding: '20px' }}
                >
                    <div className="mb-2 text-center w-full border-b border-white/10 pb-2">
                        <p className="font-chakra text-dark-text text-lg font-bold tracking-widest uppercase">{displayDate}</p>
                    </div>
                    <ShareableReport session={activeSession} visibleSection="players" isExport={true} />
                </BrandedShareableReport>
                
                {/* 3. ROUNDS - Compact (No Header) */}
                <BrandedShareableReport 
                    session={activeSession} 
                    data-export-section="rounds"
                    style={{ width: '500px', padding: '20px' }}
                >
                     <div className="mb-2 text-center w-full border-b border-white/10 pb-2">
                        <p className="font-chakra text-dark-text text-lg font-bold tracking-widest uppercase">{displayDate}</p>
                    </div>
                    <ShareableReport session={activeSession} visibleSection="rounds" isExport={true} />
                </BrandedShareableReport>
            </div>
        </Page>
    );
};
