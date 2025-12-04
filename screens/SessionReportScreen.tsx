
import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApp } from '../context';
import { Page, Button, Modal, useTranslation } from '../ui';
import { shareOrDownloadImages, exportSessionAsJson } from '../services/export';
import { BrandedHeader, newId } from './utils';
import { ShareableReport } from './StatisticsScreen';
import { calculateAllStats } from '../services/statistics';
import { calculateEarnedBadges, calculateRatingUpdate, getTierForRating } from '../services/rating';
import { generateNewsUpdates, manageNewsFeedSize } from '../services/news';
import { savePlayersToDB, saveNewsToDB, saveHistoryToDB } from '../db';
import { Player, BadgeType, RatingBreakdown } from '../types';

// Re-defining BrandedShareableReport locally to avoid import issues
const BrandedShareableReport: React.FC<{
    session: any;
    children: React.ReactNode;
    className?: string;
    style?: React.CSSProperties;
    [key: string]: any;
}> = ({ session, children, className, style, ...props }) => {
    const PADDING = 40;
    const homeScreenBackground = `data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 800 1200'%3e%3cdefs%3e%3cradialGradient id='g' cx='50%25' cy='50%25' r='50%25'%3e%3cstop offset='0%25' stop-color='%2300F2FE' stop-opacity='0.1' /%3e%3cstop offset='100%25' stop-color='%2300F2FE' stop-opacity='0' /%3e%3c/radialGradient%3e%3cfilter id='f'%3e%3cfeTurbulence type='fractalNoise' baseFrequency='0.02 0.05' numOctaves='3' /%3e%3c/filter%3e%3c/defs%3e%3crect width='100%25' height='100%25' fill='%231A1D24' /%3e%3crect x='0' y='0' width='100%25' height='100%25' fill='url(%23g)' /%3e%3crect x='0' y='0' width='100%25' height='100%25' filter='url(%23f)' opacity='0.03' /%3e%3c/svg%3e`;


    const containerStyle: React.CSSProperties = {
        padding: `${PADDING}px`,
        backgroundImage: `url("${homeScreenBackground}")`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        boxSizing: 'border-box',
        ...style,
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

export const SessionReportScreen: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const { history, isLoading, setAllPlayers, setNewsFeed, setHistory, allPlayers: currentGlobalPlayers, newsFeed: currentNews } = useApp();
    const t = useTranslation();
    const navigate = useNavigate();
    const [isDownloadModalOpen, setIsDownloadModalOpen] = React.useState(false);
    const [isExporting, setIsExporting] = React.useState(false);
    const [isRecovering, setIsRecovering] = React.useState(false);
    const exportContainerRef = React.useRef<HTMLDivElement>(null);

    const session = history.find(s => s.id === id);

    React.useEffect(() => {
        if (!isLoading && !session) {
             navigate('/history'); 
        }
    }, [isLoading, session, navigate]);
    

    if (isLoading) {
        return <Page><p className="text-center mt-10">{t.loading}</p></Page>;
    }

    if (!session) {
        return null;
    }
    
    // --- RESTORED RECOVERY FUNCTIONALITY ---
    const handleRecoverStats = async () => {
        if (!session || isRecovering || !window.confirm("⚠️ This will RECALCULATE all stats for players in this session and save to database. Use only if data was lost. Continue?")) return;
        setIsRecovering(true);

        try {
            // 1. Calculate Stats based on this session
            const { allPlayersStats } = calculateAllStats(session);
            
            // 2. Map updates to current global players
            const updatedPlayers: Player[] = [];
            const playersToSaveToDB: Player[] = [];

            const newPlayersList = currentGlobalPlayers.map(player => {
                const sessionStats = allPlayersStats.find(s => s.player.id === player.id);
                
                // If player didn't play in this session, skip update
                if (!sessionStats || sessionStats.gamesPlayed === 0) return player;

                // Re-apply stats addition (Note: this adds ON TOP of current. 
                // If data is already correct in memory, this will double count.
                // Assuming user uses this when data is MISSING).
                
                // However, to be safe, we should probably just re-save the current state if it's correct?
                // No, the user asked for the RECOVER function.
                // Standard logic:
                
                const updatedPlayer: Player = {
                    ...player,
                    totalGames: player.totalGames + sessionStats.gamesPlayed,
                    totalGoals: player.totalGoals + sessionStats.goals,
                    totalAssists: player.totalAssists + sessionStats.assists,
                    totalWins: player.totalWins + sessionStats.wins,
                    totalDraws: player.totalDraws + sessionStats.draws,
                    totalLosses: player.totalLosses + sessionStats.losses,
                    totalSessionsPlayed: (player.totalSessionsPlayed || 0) + 1,
                    // Basic Month logic (assume current month for recovery)
                    monthlyGames: player.monthlyGames + sessionStats.gamesPlayed,
                    monthlyGoals: player.monthlyGoals + sessionStats.goals,
                    monthlyAssists: player.monthlyAssists + sessionStats.assists,
                    monthlyWins: player.monthlyWins + sessionStats.wins,
                    monthlySessionsPlayed: (player.monthlySessionsPlayed || 0) + 1,
                    lastPlayedAt: new Date().toISOString(),
                };

                // Recalculate Badges & Rating
                const badgesEarnedThisSession = calculateEarnedBadges(player, sessionStats, session, allPlayersStats);
                const currentBadges = player.badges || {};
                const badgesNewThisSession = badgesEarnedThisSession.filter(b => !currentBadges[b]);

                const { delta, breakdown } = calculateRatingUpdate(player, sessionStats, session, badgesNewThisSession);
                const newRating = Math.round(player.rating + delta);
                const newTier = getTierForRating(newRating);
                
                let newForm: 'hot_streak' | 'stable' | 'cold_streak' = 'stable';
                if (delta >= 0.5) newForm = 'hot_streak';
                else if (delta <= -0.5) newForm = 'cold_streak';

                const updatedBadges: Partial<Record<BadgeType, number>> = { ...currentBadges };
                badgesEarnedThisSession.forEach(badge => {
                    updatedBadges[badge] = (updatedBadges[badge] || 0) + 1;
                });

                const sessionHistory = [...(player.sessionHistory || [])];
                if (sessionStats.gamesPlayed > 0) {
                    sessionHistory.push({ winRate: Math.round((sessionStats.wins / sessionStats.gamesPlayed) * 100) });
                }
                if (sessionHistory.length > 5) sessionHistory.shift();

                const finalPlayer = {
                    ...updatedPlayer,
                    rating: newRating,
                    tier: newTier,
                    form: newForm,
                    badges: updatedBadges,
                    sessionHistory,
                    lastRatingChange: breakdown
                };
                
                updatedPlayers.push(finalPlayer);
                playersToSaveToDB.push(finalPlayer); // Add to save list
                return finalPlayer;
            });

            // 3. Update State
            setAllPlayers(newPlayersList);

            // 4. SAVE TO DB (Force)
            if (playersToSaveToDB.length > 0) {
                await savePlayersToDB(playersToSaveToDB); // Now uses chunking from db.ts
            }

            // 5. Generate News
            const newNewsItems = generateNewsUpdates(currentGlobalPlayers, newPlayersList);
            if (newNewsItems.length > 0) {
                const updatedFeed = manageNewsFeedSize([...newNewsItems, ...currentNews]);
                setNewsFeed(updatedFeed);
                await saveNewsToDB(updatedFeed);
            }
            
            alert("✅ Stats recovered and saved to Cloud Database!");

        } catch (error) {
            console.error("Recovery failed:", error);
            alert("❌ Recovery failed. Check console.");
        } finally {
            setIsRecovering(false);
        }
    };

    
    const handleExport = async (section: 'standings' | 'players') => {
        if (isExporting || !exportContainerRef.current || !session) return;
        setIsExporting(true);

        await new Promise(res => setTimeout(res, 50));

        const targetElement = exportContainerRef.current.querySelector(`[data-export-section="${section}"]`) as HTMLElement | null;
        const exportId = `export-target-${section}-${newId()}`;

        if (targetElement) {
            targetElement.id = exportId;
            try {
                await shareOrDownloadImages(exportId, session.sessionName, session.date, section.charAt(0).toUpperCase() + section.slice(1));
            } finally {
                targetElement.id = '';
                setIsExporting(false);
                setIsDownloadModalOpen(false);
            }
        } else {
            console.error(`Export target for section "${section}" not found.`);
            setIsExporting(false);
        }
    };
    
    const displayDate = new Date(session.date).toLocaleString('en-GB', { year: 'numeric', month: 'long', day: 'numeric' });
    
    const combinedExportBackground = `data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 800 1200'%3e%3cdefs%3e%3cradialGradient id='g' cx='50%25' cy='50%25' r='50%25'%3e%3cstop offset='0%25' stop-color='%2300F2FE' stop-opacity='0.1' /%3e%3cstop offset='100%25' stop-color='%2300F2FE' stop-opacity='0' /%3e%3c/radialGradient%3e%3cfilter id='f'%3e%3cfeTurbulence type='fractalNoise' baseFrequency='0.02 0.05' numOctaves='3' /%3e%3c/filter%3e%3c/defs%3e%3crect width='100%25' height='100%25' fill='%231A1D24' /%3e%3crect x='0' y='0' width='100%25' height='100%25' fill='url(%23g)' /%3e%3crect x='0' y='0' width='100%25' height='100%25' filter='url(%23f)' opacity='0.03' /%3e%3c/svg%3e`;

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
                    <Button variant="secondary" onClick={() => handleExport('standings')} disabled={isExporting} className="w-full shadow-lg shadow-dark-accent-start/20 hover:shadow-dark-accent-start/40">{isExporting ? 'Exporting...' : t.exportStandings}</Button>
                    <Button variant="secondary" onClick={() => handleExport('players')} disabled={isExporting} className="w-full shadow-lg shadow-dark-accent-start/20 hover:shadow-dark-accent-start/40">{isExporting ? 'Exporting...' : t.exportCombined}</Button>
                    <Button variant="secondary" onClick={() => setIsDownloadModalOpen(false)} disabled={isExporting} className="w-full mt-2 shadow-lg shadow-dark-accent-start/20 hover:shadow-dark-accent-start/40">{t.cancel}</Button>
                </div>
            </Modal>
            <div className="w-full max-w-4xl mx-auto">
                 <BrandedHeader className="mb-4" />
                 <p className="text-dark-text-secondary mb-6">{new Date(session.date).toLocaleDateString('en-GB')}</p>
                
                <ShareableReport session={session} />
                
                <div className="mt-auto pt-6 w-full flex flex-col gap-3">
                    <Button variant="secondary" onClick={() => setIsDownloadModalOpen(true)} className="w-full shadow-lg shadow-dark-accent-start/20 hover:shadow-dark-accent-start/40 uppercase">{t.saveTable}</Button>
                    <Button variant="secondary" onClick={() => exportSessionAsJson(session)} className="w-full shadow-lg shadow-dark-accent-start/20 hover:shadow-dark-accent-start/40 uppercase">{t.exportJson}</Button>
                    
                    {/* RESTORED RECOVERY BUTTON */}
                    <div className="pt-8 text-center">
                        <p className="text-[10px] text-dark-text-secondary mb-2 uppercase tracking-widest">Danger Zone</p>
                        <Button 
                            variant="danger" 
                            onClick={handleRecoverStats} 
                            disabled={isRecovering}
                            className="w-full !py-2 !text-xs opacity-70 hover:opacity-100"
                        >
                            {isRecovering ? 'RECOVERING...' : '🛠️ RECOVER MISSING STATS'}
                        </Button>
                    </div>
                </div>
            </div>

            {/* Hidden elements for branded export */}
            <div 
                style={{ position: 'absolute', top: 0, left: 0, zIndex: -1, opacity: 0, pointerEvents: 'none', display: 'flex', flexDirection: 'column', gap: '2rem', alignItems: 'flex-start' }} 
                ref={exportContainerRef}
            >
                <BrandedShareableReport session={session} data-export-section="standings" style={{ width: '600px' }}>
                    <div className="mb-4 text-left w-full">
                        <BrandedHeader isExport={true} />
                        <p className="font-chakra text-dark-text mt-8 text-xl font-medium tracking-wider uppercase">{displayDate}</p>
                    </div>
                    <ShareableReport session={session} visibleSection="standings" isExport={true} />
                </BrandedShareableReport>

                <BrandedShareableReport 
                    session={session} 
                    data-export-section="players"
                    style={{ 
                        width: '900px',
                        backgroundImage: `url("${combinedExportBackground}")`
                    }}
                >
                    <div className="flex w-full items-start gap-4">
                        <div className="w-[60%] flex flex-col items-center">
                            <ShareableReport session={session} visibleSection="players" isExport={true} />
                            <div className="mt-4 font-bold text-lg text-white">
                                #532Playground #SessionReport
                            </div>
                        </div>
                        <div className="w-[40%]">
                            <ShareableReport session={session} visibleSection="rounds" isExport={true} />
                        </div>
                    </div>
                </BrandedShareableReport>
            </div>
        </Page>
    );
};
