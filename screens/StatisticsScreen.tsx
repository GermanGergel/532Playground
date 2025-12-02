
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
    isExport?: boolean; // New prop for export mode
}

export const ShareableReport: React.FC<ShareableReportProps> = ({ session, visibleSection, isExport }) => {
    const t = useTranslation();
    const { teamStats, allPlayersStats } = React.useMemo(() => calculateAllStats(session), [session]);
    
    // Adjusted cardClasses to be conditional based on isExport
    const cardClasses = "rounded-2xl bg-dark-surface p-4 border border-dark-accent-start/30";
    // When exporting, remove all padding to rely solely on BrandedShareableReport's padding
    const effectiveCardClasses = isExport ? "rounded-2xl bg-dark-surface border border-dark-accent-start/30" : cardClasses;
    const cardTitleClasses = "font-bold text-xl mb-4 text-dark-text";
    
    const sortedPlayers = allPlayersStats.sort((a,b) => (b.goals + b.assists) - (a.goals + b.assists));
    const activePlayers = sortedPlayers;
    
    const finishedGames = session.games.filter(g => g.status === 'finished');
    const activeGames = finishedGames;

    return (
        <div className="bg-transparent text-dark-text font-sans w-full" style={isExport ? { width: '100%', margin: 0, padding: 0 } : undefined}>
            <div className="space-y-6 w-full" style={isExport ? { width: '100%', margin: 0, padding: 0, spaceY: 0, gap: '24px', display: 'flex', flexDirection: 'column' } : undefined}>
                {/* Team Standings */}
                {(!visibleSection || visibleSection === 'standings') && (
                <div 
                    className={effectiveCardClasses}
                    style={{ width: '100%', boxSizing: 'border-box', boxShadow: isExport ? 'none' : '0 8px 25px -5px rgba(0, 242, 254, 0.1), 0 5px 10px -6px rgba(0, 242, 254, 0.1)' }}
                >
                    <h3 className={cardTitleClasses} style={isExport ? { padding: '16px 16px 0 16px', marginBottom: '16px' } : undefined}>{t.teamStandings}</h3>
                    <div style={isExport ? { padding: '0 16px 16px 16px' } : undefined}>
                        <table className="w-full text-sm text-center rounded-lg" style={{ width: '100%', tableLayout: 'fixed', borderCollapse: 'collapse', margin: 0, padding: 0 }}>
                            <thead>
                                <tr className="text-dark-text-secondary">
                                    <th className="text-left py-1 px-2" style={{ width: '8%', boxSizing: 'border-box' }}>#</th>
                                    <th className="text-left py-1 px-2" style={{ width: '20%', boxSizing: 'border-box' }}>{t.team}</th>
                                    <th className="py-1 px-2" style={{ width: '10%', boxSizing: 'border-box' }}>{t.thP}</th>
                                    <th className="py-1 px-2" style={{ width: '10%', boxSizing: 'border-box' }}>{t.thW}</th>
                                    <th className="py-1 px-2" style={{ width: '10%', boxSizing: 'border-box' }}>{t.thD}</th>
                                    <th className="py-1 px-2" style={{ width: '10%', boxSizing: 'border-box' }}>{t.thL}</th>
                                    <th className="py-1 px-2" style={{ width: '12%', boxSizing: 'border-box' }}>{t.thGD}</th>
                                    <th className="py-1 px-2 font-bold" style={{ width: '20%', boxSizing: 'border-box' }}>{t.thPts}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {teamStats.map(({ team, gamesPlayed, wins, draws, losses, goalDifference, points }, index) => (
                                    <tr key={team.id} className="border-t border-white/10">
                                        <td className="py-2 px-2 text-left" style={{ width: '8%', boxSizing: 'border-box' }}>{index + 1}</td>
                                        <td className="py-2 px-2 text-left" style={{ width: '20%', boxSizing: 'border-box' }}><TeamAvatar team={team} size="xxs" /></td>
                                        <td className="py-2 px-2" style={{ width: '10%', boxSizing: 'border-box' }}>{gamesPlayed}</td>
                                        <td className="py-2 px-2" style={{ width: '10%', boxSizing: 'border-box' }}>{wins}</td>
                                        <td className="py-2 px-2" style={{ width: '10%', boxSizing: 'border-box' }}>{draws}</td>
                                        <td className="py-2 px-2" style={{ width: '10%', boxSizing: 'border-box' }}>{losses}</td>
                                        <td className="py-2 px-2" style={{ width: '12%', boxSizing: 'border-box' }}>{goalDifference > 0 ? `+${goalDifference}` : goalDifference}</td>
                                        <td className="py-2 px-2 font-bold" style={{ width: '20%', boxSizing: 'border-box' }}>{points}</td>
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
                    className={effectiveCardClasses}
                    style={{ width: '100%', boxSizing: 'border-box', boxShadow: isExport ? 'none' : '0 8px 25px -5px rgba(0, 242, 254, 0.1), 0 5px 10px -6px rgba(0, 242, 254, 0.1)' }}
                 >
                    <h3 className={cardTitleClasses} style={isExport ? { padding: '16px 16px 0 16px', marginBottom: '16px' } : undefined}>{t.playerStatistics}</h3>
                    <div style={isExport ? { padding: '0 16px 16px 16px' } : undefined}>
                        <table className="w-full text-sm text-center rounded-lg" style={{ width: '100%', tableLayout: 'fixed', borderCollapse: 'collapse', margin: 0, padding: 0 }}>
                        <thead>
                                <tr className="text-dark-text-secondary">
                                    <th className="text-left py-1 px-2" style={{ width: '8%', boxSizing: 'border-box' }}>#</th>
                                    <th className="text-left py-1 px-2" style={{ width: '28%', boxSizing: 'border-box' }}>{t.players}</th>
                                    <th className="py-1 px-2" style={{ width: '15%', boxSizing: 'border-box' }}>{t.team}</th>
                                    <th className="py-1 px-2" style={{ width: '13%', boxSizing: 'border-box' }}>{t.thGP}</th>
                                    <th className="py-1 px-2" style={{ width: '12%', boxSizing: 'border-box' }}>{t.thG}</th>
                                    <th className="py-1 px-2" style={{ width: '12%', boxSizing: 'border-box' }}>{t.thA}</th>
                                    <th className="py-1 px-2" style={{ width: '12%', boxSizing: 'border-box' }}>{t.thTotal}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {activePlayers.map((stats, index) => (
                                    <tr key={stats.player.id} className="border-t border-white/10">
                                        <td className="py-2 px-2 text-left" style={{ width: '8%', boxSizing: 'border-box' }}>{index + 1}</td>
                                        <td className="py-2 px-2 text-left font-semibold" style={{ width: '28%', boxSizing: 'border-box' }}>{stats.player.nickname}</td>
                                        <td className="py-2 px-2" style={{ width: '15%', boxSizing: 'border-box' }}><TeamAvatar team={stats.team} size="xxs" className="mx-auto" /></td>
                                        <td className="py-2 px-2" style={{ width: '13%', boxSizing: 'border-box' }}>{stats.gamesPlayed}</td>
                                        <td className="py-2 px-2" style={{ width: '12%', boxSizing: 'border-box' }}>{stats.goals}</td>
                                        <td className="py-2 px-2" style={{ width: '12%', boxSizing: 'border-box' }}>{stats.assists}</td>
                                        <td className="py-2 px-2 font-bold" style={{ width: '12%', boxSizing: 'border-box' }}>{stats.goals + stats.assists}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
                )}
                
                {/* Round History */}
                {(!visibleSection || visibleSection === 'rounds') && activeGames.length > 0 && (
                 <div 
                    className={effectiveCardClasses}
                    style={{ width: '100%', boxSizing: 'border-box', fontVariantNumeric: 'tabular-nums', boxShadow: isExport ? 'none' : '0 8px 25px -5px rgba(0, 242, 254, 0.1), 0 5px 10px -6px rgba(0, 242, 254, 0.1)' }}
                 >
                    <h3 className={cardTitleClasses} style={isExport ? { padding: '16px 16px 0 16px', marginBottom: '16px' } : undefined}>{t.gameHistory}</h3>
                    <div style={isExport ? { padding: '0 16px 16px 16px' } : undefined}>
                        <ul className="w-full block" style={{ width: '100%', boxSizing: 'border-box', margin: 0, padding: 0 }}>
                            {activeGames.map(game => {
                                const team1 = session.teams.find(t => t.id === game.team1Id);
                                const team2 = session.teams.find(t => t.id === game.team2Id);
                                if (!team1 || !team2) return null;
                                return (
                                    <li key={game.id} className={`w-full flex items-center py-2 text-sm border-t border-white/10 first:border-t-0 px-0`} style={{ width: '100%', boxSizing: 'border-box' }}>
                                        <span className="flex-shrink-0" style={{ width: '30%', display: 'block', boxSizing: 'border-box' }}>{t.round} {game.gameNumber}</span>
                                        <div className="flex items-center justify-end gap-3" style={{ width: '70%', boxSizing: 'border-box' }}>
                                            <TeamAvatar team={team1} size="xxs" />
                                            <span className="font-bold text-sm">{game.team1Score} : {game.team2Score}</span>
                                            <TeamAvatar team={team2} size="xxs" />
                                        </div>
                                    </li>
                                )
                            })}
                        </ul>
                    </div>
                </div>
                )}
            </div>
        </div>
    );
};

export const BrandedShareableReport = React.forwardRef<
    HTMLDivElement,
    {
        session: Session;
        visibleSection?: 'standings' | 'players' | 'rounds';
        includeHeader?: boolean;
        isExport?: boolean; // Added for ShareableReport prop forwarding
    }
>(({ session, visibleSection, includeHeader = true, isExport }, ref) => {
    const displayDate = new Date(session.date).toLocaleDateString('en-GB').replace(/\//g, '.');
    const isRounds = visibleSection === 'rounds';
    
    // STRICT EXPORT LAYOUT CONSTANTS
    const EXPORT_WIDTH = 600;
    const CONTENT_WIDTH = 540;
    const PADDING = 30; // (600 - 540) / 2

    // Styles tailored specifically for html2canvas export
    const containerStyle: React.CSSProperties = isExport ? {
        width: `${EXPORT_WIDTH}px`,
        minWidth: `${EXPORT_WIDTH}px`,
        maxWidth: `${EXPORT_WIDTH}px`,
        height: 'auto',
        boxSizing: 'border-box',
        padding: `${PADDING}px`,
        backgroundColor: '#1A1D24', // Explicit dark background
        margin: 0,
        position: 'relative',
        left: 0,
        top: 0,
        // No border or shadow on the root container to avoid sub-pixel width issues
        border: 'none',
        boxShadow: 'none',
    } : {
        // Fallback for non-export rendering (though this component is mainly for export)
        width: '540px',
        padding: '24px',
        boxSizing: 'border-box',
        backgroundColor: '#1A1D24'
    };

    return (
        <div 
            ref={ref} 
            className="relative flex flex-col text-dark-text shrink-0" 
            style={containerStyle}
            data-export-target="true"
        >
            {/* Header Section */}
            {includeHeader && (
                <div className="shrink-0 mb-4 text-left w-full">
                        <h1 className="text-6xl font-black uppercase leading-none" style={{ color: '#00F2FE', textShadow: '0 0 20px rgba(0, 242, 254, 0.6)' }}>
                        532
                    </h1>
                    <h2 className="text-5xl font-black uppercase text-white leading-none tracking-widest drop-shadow-lg">
                        PLAYGROUND
                    </h2>
                    <p className="text-dark-text-secondary mt-2 text-xl font-medium tracking-wider uppercase">{displayDate}</p>
                </div>
            )}
            
            {/* Content Section - Strict Width Wrapper */}
            <div style={{ width: '100%', boxSizing: 'border-box' }}>
                 <ShareableReport session={session} visibleSection={visibleSection} isExport={true} />
            </div>
            
            {/* Footer Section */}
            {isRounds && (
                <div className="shrink-0 mt-6 pt-2 border-t border-white/10 text-center w-full">
                    <p className="text-[#00F2FE] text-lg font-bold tracking-wider opacity-90">
                        #532Playground #FootballHub #DaNang
                    </p>
                </div>
            )}
             {!isRounds && <div className="h-2"></div>}
        </div>
    );
});

export const StatisticsScreen: React.FC = () => {
    const { activeSession } = useApp();
    const t = useTranslation();
    const navigate = useNavigate();
    const [isDownloadModalOpen, setIsDownloadModalOpen] = React.useState(false);

    const standingsRef = React.useRef<HTMLDivElement>(null);
    const playersRef = React.useRef<HTMLDivElement>(null);
    const roundsRef = React.useRef<HTMLDivElement>(null);
    
    React.useEffect(() => {
        if (!activeSession) navigate('/');
    }, [activeSession, navigate]);

    if (!activeSession) return null;
    
    const handleExportStandings = () => {
         if(standingsRef.current) shareOrDownloadImages([standingsRef.current], activeSession.sessionName, activeSession.date, 'Standings');
         setIsDownloadModalOpen(false);
    };
    
    const handleExportPlayers = () => {
        if(playersRef.current) shareOrDownloadImages([playersRef.current], activeSession.sessionName, activeSession.date, 'Players');
        setIsDownloadModalOpen(false);
    };
    
    const handleExportRounds = () => {
         if(roundsRef.current) shareOrDownloadImages([roundsRef.current], activeSession.sessionName, activeSession.date, 'Rounds');
         setIsDownloadModalOpen(false);
    };


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
                    <Button variant="secondary" onClick={handleExportStandings} className="w-full shadow-lg shadow-dark-accent-start/20 hover:shadow-dark-accent-start/40">{t.exportStandings}</Button>
                    <Button variant="secondary" onClick={handleExportPlayers} className="w-full shadow-lg shadow-dark-accent-start/20 hover:shadow-dark-accent-start/40">{t.exportPlayers}</Button>
                    <Button variant="secondary" onClick={handleExportRounds} className="w-full shadow-lg shadow-dark-accent-start/20 hover:shadow-dark-accent-start/40">{t.exportRounds}</Button>
                    <Button variant="secondary" onClick={() => setIsDownloadModalOpen(false)} className="w-full mt-2 shadow-lg shadow-dark-accent-start/20 hover:shadow-dark-accent-start/40">{t.cancel}</Button>
                </div>
            </Modal>
            <header className="text-center shrink-0 pt-4 mb-6">
                <h1 className="text-3xl font-black uppercase text-dark-text accent-text-glow">{t.liveStatistics}</h1>
            </header>
            <div className="space-y-6">
                <ShareableReport session={activeSession} visibleSection="standings" />
                <ShareableReport session={activeSession} visibleSection="players" />
                <ShareableReport session={activeSession} visibleSection="rounds" />
            </div>
            
            <div className="mt-auto pt-6 w-full flex flex-col gap-3">
                <Button variant="secondary" onClick={() => setIsDownloadModalOpen(true)} className="w-full shadow-lg shadow-dark-accent-start/20 hover:shadow-dark-accent-start/40">{t.saveTable}</Button>
                <Button variant="secondary" onClick={() => exportSessionAsJson(activeSession)} className="w-full shadow-lg shadow-dark-accent-start/20 hover:shadow-dark-accent-start/40">{t.exportJson}</Button>
            </div>

            {/* Hidden elements for branded export - Rigid container */}
            <div style={{ position: 'fixed', top: 0, left: '-10000px', pointerEvents: 'none', display: 'flex', flexDirection: 'column' }}>
                <BrandedShareableReport ref={standingsRef} session={activeSession} visibleSection="standings" isExport={true} />
                <BrandedShareableReport ref={playersRef} session={activeSession} visibleSection="players" includeHeader={false} isExport={true} />
                <BrandedShareableReport ref={roundsRef} session={activeSession} visibleSection="rounds" includeHeader={false} isExport={true} />
            </div>
        </Page>
    );
};
