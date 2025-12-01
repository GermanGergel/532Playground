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
}

export const ShareableReport: React.FC<ShareableReportProps> = ({ session, visibleSection }) => {
    const t = useTranslation();
    const { teamStats, allPlayersStats } = React.useMemo(() => calculateAllStats(session), [session]);
    
    const cardClasses = "rounded-2xl bg-black/40 backdrop-blur-sm p-4 border border-dark-accent-start/30";
    const cardTitleClasses = "font-bold text-xl mb-4 text-dark-text";
    
    const sortedPlayers = allPlayersStats.sort((a,b) => (b.goals + b.assists) - (a.goals + a.assists));
    const activePlayers = sortedPlayers;
    
    const finishedGames = session.games.filter(g => g.status === 'finished');
    const activeGames = finishedGames;

    return (
        <div className="bg-transparent text-dark-text font-sans">
            <div className="space-y-6">
                {/* Team Standings */}
                {(!visibleSection || visibleSection === 'standings') && (
                <div 
                    className={cardClasses}
                    style={{ boxShadow: '0 8px 25px -5px rgba(0, 242, 254, 0.1), 0 5px 10px -6px rgba(0, 242, 254, 0.1)' }}
                >
                    <h3 className={cardTitleClasses}>{t.teamStandings}</h3>
                    <table className="w-full text-sm text-center rounded-lg">
                        <thead>
                            <tr className="text-dark-text-secondary">
                                <th className="text-left py-1 px-2">#</th>
                                <th className="text-left py-1 px-2">{t.team}</th>
                                <th className="py-1 px-2">{t.thP}</th>
                                <th className="py-1 px-2">{t.thW}</th>
                                <th className="py-1 px-2">{t.thD}</th>
                                <th className="py-1 px-2">{t.thL}</th>
                                <th className="py-1 px-2">{t.thGD}</th>
                                <th className="py-1 px-2 font-bold">{t.thPts}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {teamStats.map(({ team, gamesPlayed, wins, draws, losses, goalDifference, points }, index) => (
                                <tr key={team.id} className="border-t border-white/10">
                                    <td className="py-2 px-2 text-left">{index + 1}</td>
                                    <td className="py-2 px-2 text-left"><TeamAvatar team={team} size="xxs" /></td>
                                    <td className="py-2 px-2">{gamesPlayed}</td>
                                    <td className="py-2 px-2">{wins}</td>
                                    <td className="py-2 px-2">{draws}</td>
                                    <td className="py-2 px-2">{losses}</td>
                                    <td className="py-2 px-2">{goalDifference > 0 ? `+${goalDifference}` : goalDifference}</td>
                                    <td className="py-2 px-2 font-bold">{points}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                )}

                {/* Player Statistics */}
                {(!visibleSection || visibleSection === 'players') && (
                 <div 
                    className={cardClasses}
                    style={{ boxShadow: '0 8px 25px -5px rgba(0, 242, 254, 0.1), 0 5px 10px -6px rgba(0, 242, 254, 0.1)' }}
                 >
                    <h3 className={cardTitleClasses}>{t.playerStatistics}</h3>
                    <table className="w-full text-sm text-center rounded-lg">
                       <thead>
                            <tr className="text-dark-text-secondary">
                                <th className="text-left py-1 px-2">#</th>
                                <th className="text-left py-1 px-2">{t.players}</th>
                                <th className="py-1 px-2">{t.team}</th>
                                <th className="py-1 px-2">{t.thGP}</th>
                                <th className="py-1 px-2">{t.thG}</th>
                                <th className="py-1 px-2">{t.thA}</th>
                                <th className="py-1 px-2">{t.thTotal}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {activePlayers.map((stats, index) => (
                                <tr key={stats.player.id} className="border-t border-white/10">
                                    <td className="py-2 px-2 text-left">{index + 1}</td>
                                    <td className="py-2 px-2 text-left font-semibold">{stats.player.nickname}</td>
                                    <td className="py-2 px-2"><TeamAvatar team={stats.team} size="xxs" className="mx-auto" /></td>
                                    <td className="py-2 px-2">{stats.gamesPlayed}</td>
                                    <td className="py-2 px-2">{stats.goals}</td>
                                    <td className="py-2 px-2">{stats.assists}</td>
                                    <td className="py-2 px-2 font-bold">{stats.goals + stats.assists}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                )}
                
                {/* Round History */}
                {(!visibleSection || visibleSection === 'rounds') && activeGames.length > 0 && (
                 <div 
                    className={cardClasses}
                    style={{ fontVariantNumeric: 'tabular-nums', boxShadow: '0 8px 25px -5px rgba(0, 242, 254, 0.1), 0 5px 10px -6px rgba(0, 242, 254, 0.1)' }}
                 >
                    <h3 className={cardTitleClasses}>{t.gameHistory}</h3>
                    <ul className="">
                         {activeGames.map(game => {
                            const team1 = session.teams.find(t => t.id === game.team1Id);
                            const team2 = session.teams.find(t => t.id === game.team2Id);
                            if (!team1 || !team2) return null;
                            return (
                                <li key={game.id} className="flex items-center justify-between py-2 px-1 text-sm border-t border-white/10 first:border-t-0">
                                    <span className="w-20">{t.round} {game.gameNumber}</span>
                                    <div className="flex items-center justify-end gap-3 flex-grow pr-2">
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
        </div>
    );
};

export const BrandedShareableReport = React.forwardRef<
    HTMLDivElement,
    {
        session: Session;
        visibleSection?: 'standings' | 'players' | 'rounds';
        includeHeader?: boolean;
    }
>(({ session, visibleSection, includeHeader = true }, ref) => {
    const displayDate = new Date(session.date).toLocaleDateString('en-GB').replace(/\//g, '.');
    const isRounds = visibleSection === 'rounds';
    
    const isStandings = visibleSection === 'standings' || (!visibleSection);
    const containerWidth = isStandings ? '540px' : '720px';

    return (
        <div 
            ref={ref} 
            className="relative flex flex-col text-dark-text" 
            style={{ 
                width: containerWidth,
                height: 'auto',
                boxSizing: 'border-box',
                padding: '24px',
                backgroundColor: '#1A1D24',
            }}
            data-export-target="true"
        >
            {/* Header Section - Only displayed if includeHeader is true (Standings) */}
            {includeHeader && (
                <div className="shrink-0 mb-8 text-left">
                        <h1 className="text-6xl font-black uppercase leading-none" style={{ color: '#00F2FE', textShadow: '0 0 20px rgba(0, 242, 254, 0.6)' }}>
                        532
                    </h1>
                    <h2 className="text-5xl font-black uppercase text-white leading-none tracking-widest drop-shadow-lg">
                        PLAYGROUND
                    </h2>
                    <p className="text-dark-text-secondary mt-2 text-xl font-medium tracking-wider uppercase">{displayDate}</p>
                </div>
            )}
            
            {/* Content Section */}
            <div className="flex-grow flex flex-col">
                 <ShareableReport session={session} visibleSection={visibleSection} />
            </div>
            
            {/* Footer Section - Hashtags only for Rounds */}
            {isRounds && (
                <div className="shrink-0 mt-6 pt-2 border-t border-white/10 text-center">
                    <p className="text-[#00F2FE] text-lg font-bold tracking-wider opacity-90">
                        #532Playground #FootballHub #DaNang
                    </p>
                </div>
            )}
             {/* Minimal padding bottom for aesthetics */}
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

            {/* Hidden elements for branded export - Positioned to be invisible but renderable */}
            <div style={{ position: 'fixed', top: 0, left: 0, zIndex: -1, visibility: 'hidden', pointerEvents: 'none' }}>
                <BrandedShareableReport ref={standingsRef} session={activeSession} visibleSection="standings" />
                <BrandedShareableReport ref={playersRef} session={activeSession} visibleSection="players" includeHeader={false} />
                <BrandedShareableReport ref={roundsRef} session={activeSession} visibleSection="rounds" includeHeader={false} />
            </div>
        </Page>
    );
};