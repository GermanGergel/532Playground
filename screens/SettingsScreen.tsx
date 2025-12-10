
import React from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../context';
import { Card, useTranslation, Button, Modal } from '../ui';
import { isSupabaseConfigured, loadPlayersFromDB, savePlayersToDB } from '../db';
import { generateDemoData } from '../services/demo';
import { calculateAllStats } from '../services/statistics';
import { calculateEarnedBadges } from '../services/rating'; // Imported for badge recalculation
import { Player, BadgeType } from '../types';
import { Wand, User } from '../icons';

export const SettingsScreen: React.FC = () => {
    const t = useTranslation();
    const { language, setLanguage, allPlayers, setAllPlayers, history, setHistory, setNewsFeed } = useApp();
    const [cloudStatus, setCloudStatus] = React.useState<{ connected: boolean, count: number } | null>(null);
    
    // Repair State
    const [isScanning, setIsScanning] = React.useState(false);
    const [foundGhosts, setFoundGhosts] = React.useState<Player[]>([]);
    const [isConfirmRepairOpen, setIsConfirmRepairOpen] = React.useState(false);

    React.useEffect(() => {
        const checkCloud = async () => {
            if (isSupabaseConfigured()) {
                const cloudPlayers = await loadPlayersFromDB();
                setCloudStatus({
                    connected: true,
                    count: Array.isArray(cloudPlayers) ? cloudPlayers.length : 0
                });
            } else {
                setCloudStatus({ connected: false, count: 0 });
            }
        };
        checkCloud();
        const intervalId = setInterval(checkCloud, 5000); // Re-check every 5 seconds
        return () => clearInterval(intervalId);
    }, [allPlayers.length]);


    const handleGenerateDemo = () => {
        const { session, players: demoPlayers, news } = generateDemoData();
        setHistory(prev => [session, ...prev].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
        const existingPlayerIds = new Set(allPlayers.map(p => p.id));
        const newDemoPlayers = demoPlayers.filter(p => !existingPlayerIds.has(p.id));
        if (newDemoPlayers.length > 0) {
            setAllPlayers(prev => [...prev, ...newDemoPlayers]);
        }
        setNewsFeed(prev => [...news, ...prev].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
        alert('Demo session generated. This data is temporary.');
    };

    // Step 1: Scan for missing players
    const handleScanForGhosts = () => {
        if (!history || history.length === 0) {
            alert("No history found to restore from.");
            return;
        }

        setIsScanning(true);
        
        setTimeout(() => {
            const existingIds = new Set(allPlayers.map(p => p.id));
            const ghostsMap = new Map<string, Player>();

            // Iterate backwards (newest to oldest) to get the most recent profile data snapshot
            [...history].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).forEach(session => {
                session.playerPool.forEach(p => {
                    if (!existingIds.has(p.id) && !ghostsMap.has(p.id)) {
                        // Found a missing player. Initialize with a clean slate for stats
                        // We will rebuild these stats from zero based on history
                        ghostsMap.set(p.id, {
                            ...p,
                            totalGoals: 0, totalAssists: 0, totalGames: 0, 
                            totalWins: 0, totalDraws: 0, totalLosses: 0,
                            totalSessionsPlayed: 0,
                            monthlyGoals: 0, monthlyAssists: 0, monthlyGames: 0, monthlyWins: 0, monthlySessionsPlayed: 0,
                            badges: {}, // Reset badges to recalculate
                            sessionHistory: [], // Reset trend
                            records: { // Reset records
                                bestGoalsInSession: { value: 0, sessionId: '' },
                                bestAssistsInSession: { value: 0, sessionId: '' },
                                bestWinRateInSession: { value: 0, sessionId: '' },
                            }
                        });
                    }
                });
            });

            const ghosts = Array.from(ghostsMap.values());
            
            if (ghosts.length === 0) {
                alert("Scan complete. No missing players found.");
            } else {
                setFoundGhosts(ghosts);
                setIsConfirmRepairOpen(true);
            }
            setIsScanning(false);
        }, 100);
    };

    // Step 2: Restore confirmed players with FULL RECALCULATION
    const handleConfirmRestore = async () => {
        if (foundGhosts.length === 0) return;

        const restoredPlayers: Player[] = [];
        
        // IMPORTANT: Sort history OLDEST to NEWEST to rebuild records and trends chronologically
        const chronologicalHistory = [...history].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

        // For each ghost, replay history
        foundGhosts.forEach(ghost => {
            let restoredGhost = { ...ghost };
            
            // Ensure data structures exist
            if (!restoredGhost.badges) restoredGhost.badges = {};
            if (!restoredGhost.records) restoredGhost.records = { bestGoalsInSession: { value: 0, sessionId: '' }, bestAssistsInSession: { value: 0, sessionId: '' }, bestWinRateInSession: { value: 0, sessionId: '' } };
            if (!restoredGhost.sessionHistory) restoredGhost.sessionHistory = [];

            chronologicalHistory.forEach(session => {
                // Check if player was in this session
                const wasInSession = session.playerPool.some(p => p.id === ghost.id);
                
                if (wasInSession) {
                    const { allPlayersStats } = calculateAllStats(session);
                    const stats = allPlayersStats.find(s => s.player.id === ghost.id);
                    
                    if (stats) {
                        // 1. Accumulate Totals
                        restoredGhost.totalGames += stats.gamesPlayed;
                        restoredGhost.totalGoals += stats.goals;
                        restoredGhost.totalAssists += stats.assists;
                        restoredGhost.totalWins += stats.wins;
                        restoredGhost.totalDraws += stats.draws;
                        restoredGhost.totalLosses += stats.losses;
                        restoredGhost.totalSessionsPlayed += 1;
                        
                        // Monthly stats (simple check)
                        const sessionDate = new Date(session.date);
                        const now = new Date();
                        if (sessionDate.getMonth() === now.getMonth() && sessionDate.getFullYear() === now.getFullYear()) {
                            restoredGhost.monthlyGames += stats.gamesPlayed;
                            restoredGhost.monthlyGoals += stats.goals;
                            restoredGhost.monthlyAssists += stats.assists;
                            restoredGhost.monthlyWins += stats.wins;
                            restoredGhost.monthlySessionsPlayed += 1;
                        }

                        // 2. Recalculate Badges for this session
                        const badgesEarned = calculateEarnedBadges(restoredGhost, stats, session, allPlayersStats);
                        badgesEarned.forEach(badge => {
                            restoredGhost.badges[badge] = (restoredGhost.badges[badge] || 0) + 1;
                        });

                        // 3. Update Session History (Trend)
                        const sessionWinRate = stats.gamesPlayed > 0 ? Math.round((stats.wins / stats.gamesPlayed) * 100) : 0;
                        restoredGhost.sessionHistory.push({ winRate: sessionWinRate });
                        if (restoredGhost.sessionHistory.length > 5) restoredGhost.sessionHistory.shift();

                        // 4. Update Best Session Records
                        // Goals
                        if (stats.goals > restoredGhost.records.bestGoalsInSession.value) {
                            restoredGhost.records.bestGoalsInSession = { value: stats.goals, sessionId: session.id };
                        }
                        // Assists
                        if (stats.assists > restoredGhost.records.bestAssistsInSession.value) {
                            restoredGhost.records.bestAssistsInSession = { value: stats.assists, sessionId: session.id };
                        }
                        // Win Rate (only if better or equal value, but prioritize more recent)
                        if (sessionWinRate >= restoredGhost.records.bestWinRateInSession.value) {
                            restoredGhost.records.bestWinRateInSession = { value: sessionWinRate, sessionId: session.id };
                        }
                    }
                }
            });
            restoredPlayers.push(restoredGhost);
        });

        // Merge and Save
        const newAllPlayers = [...allPlayers, ...restoredPlayers];
        setAllPlayers(newAllPlayers);
        await savePlayersToDB(newAllPlayers);

        setIsConfirmRepairOpen(false);
        setFoundGhosts([]);
        alert(`Successfully restored ${restoredPlayers.length} players with full stats, badges, and records!`);
    };

    const langClasses = (lang: string) => `px-3 py-1 rounded-full font-bold transition-colors text-base ${language === lang ? 'gradient-bg text-dark-bg' : 'bg-dark-surface hover:bg-white/10'}`;

    const NetworkHud = () => {
        const isLoading = cloudStatus === null;
        const isOnline = cloudStatus?.connected === true;

        const onlineTheme = {
            color: '#00F2FE',
            glowColor: 'rgba(0, 242, 254, 0.2)',
            borderColor: 'border-dark-accent-start',
            textStyle: { color: '#00F2FE', textShadow: '0 0 10px #00F2FE' }
        };
    
        const offlineTheme = {
            color: '#A9B1BD',
            glowColor: 'rgba(169, 177, 189, 0.1)',
            borderColor: 'border-gray-600',
            textStyle: { color: '#A9B1BD', textShadow: '0 0 8px rgba(169, 177, 189, 0.5)' }
        };

        const theme = isOnline ? onlineTheme : offlineTheme;
        
        return (
            <div className={`relative overflow-hidden rounded-xl border ${theme.borderColor}/50 bg-black/60 p-5 shadow-[0_0_20px_${theme.glowColor}] transition-all duration-500`}>
                <div 
                    className="absolute inset-0 opacity-10 pointer-events-none"
                    style={{ 
                        backgroundImage: `linear-gradient(${theme.color} 1px, transparent 1px), linear-gradient(90deg, ${theme.color} 1px, transparent 1px)`,
                        backgroundSize: '20px 20px'
                    }}
                />
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/5 to-transparent h-full w-full animate-pulse pointer-events-none" style={{ animationDuration: '3s' }} />

                <div className="relative z-10 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="relative flex items-center justify-center w-12 h-12">
                            <span className="absolute w-full h-full rounded-full opacity-75 animate-ping" style={{ backgroundColor: theme.color }}></span>
                            <span className="relative w-4 h-4 rounded-full shadow-[0_0_10px_currentColor]" style={{ backgroundColor: theme.color }}></span>
                            <svg className="absolute w-12 h-12 animate-spin" style={{ animationDuration: '4s' }} viewBox="0 0 50 50">
                                <circle cx="25" cy="25" r="23" fill="none" stroke={theme.color} strokeWidth="1" strokeDasharray="30 20" opacity="0.5" />
                            </svg>
                        </div>

                        <div className="flex flex-col">
                            <h3 className="text-[10px] font-bold tracking-[0.2em] text-dark-text-secondary uppercase mb-0.5">
                                DATABASE UPLINK
                            </h3>
                            <div className="flex items-center gap-2">
                                <span className="text-xl font-black italic tracking-wider" style={theme.textStyle}>
                                    {isLoading ? 'CONNECTING...' : isOnline ? 'SYSTEM ONLINE' : 'LOCAL MODE'}
                                </span>
                            </div>
                        </div>
                    </div>
                    <div className="text-right">
                        <div className="flex flex-col items-end">
                            <span className="text-[9px] text-dark-text-secondary font-mono">
                                {isLoading ? 'AWAITING' : isOnline ? 'SYNC STATUS' : 'OFFLINE'}
                            </span>
                            <div className="flex items-baseline gap-1">
                                {(isLoading || !isOnline) ? (
                                     <span className="text-lg font-bold font-mono" style={{color: theme.color}}>--</span>
                                ) : (
                                    <>
                                        <span className="text-2xl font-bold font-mono text-white">
                                            {cloudStatus?.count}
                                        </span>
                                        <span className="text-[9px] text-dark-text-secondary font-bold">/ {allPlayers.length}</span>
                                    </>
                                )}
                            </div>
                            {isOnline && cloudStatus?.count !== allPlayers.length && (
                                <span className="text-[9px] font-bold animate-pulse" style={{ color: onlineTheme.color }}>
                                    SYNCING...
                                </span>
                            )}
                        </div>
                    </div>
                </div>
                <div className="absolute bottom-0 left-0 w-8 h-1 bg-white/20"></div>
                <div className="absolute top-0 right-0 w-8 h-1 bg-white/20"></div>
            </div>
        );
    };

    const cardNeonClasses = "shadow-lg shadow-dark-accent-start/20 border border-dark-accent-start/40 bg-dark-surface/80 hover:bg-dark-surface/100 transition-all duration-300";

    return (
        <div className="flex flex-col min-h-screen pb-28">
            {/* --- REPAIR CONFIRMATION MODAL --- */}
            <Modal
                isOpen={isConfirmRepairOpen}
                onClose={() => setIsConfirmRepairOpen(false)}
                size="sm"
                containerClassName="border border-dark-accent-start/40 shadow-[0_0_20px_rgba(0,242,254,0.3)] !p-5"
                hideCloseButton
            >
                <div className="text-center">
                    <Wand className="w-12 h-12 text-yellow-400 mx-auto mb-3" />
                    <h3 className="text-xl font-black text-white uppercase tracking-wider mb-2">
                        {foundGhosts.length} Missing Players Found
                    </h3>
                    <p className="text-sm text-dark-text-secondary mb-4">
                        The system found these players in the history who are missing from your database.
                        <br/><br/>
                        <span className="text-yellow-400 font-bold">Confirming will restore stats, badges, and records.</span>
                        <br/>Existing players will NOT be changed.
                    </p>
                    
                    <div className="max-h-48 overflow-y-auto bg-dark-bg/50 rounded-lg p-2 mb-6 border border-white/10">
                        {foundGhosts.map(p => (
                            <div key={p.id} className="flex items-center gap-3 p-2 border-b border-white/5 last:border-0">
                                <div className="w-8 h-8 rounded-full bg-dark-surface flex items-center justify-center border border-white/20">
                                    <User className="w-4 h-4 text-dark-text-secondary" />
                                </div>
                                <div className="text-left">
                                    <p className="font-bold text-sm text-white">{p.nickname}</p>
                                    <p className="text-[10px] text-dark-text-secondary">ID: ...{p.id.slice(-6)}</p>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="flex gap-3">
                        <Button 
                            variant="ghost" 
                            onClick={() => setIsConfirmRepairOpen(false)} 
                            className="flex-1 font-bold"
                        >
                            Cancel
                        </Button>
                        <Button 
                            variant="secondary" 
                            onClick={handleConfirmRestore} 
                            className="flex-1 font-bold !bg-yellow-500/20 !text-yellow-200 !border-yellow-500/50 hover:!bg-yellow-500/30"
                        >
                            Confirm Restore
                        </Button>
                    </div>
                </div>
            </Modal>

            <div className="p-4 flex-grow">
                <h1 className="text-2xl font-bold text-center mb-8">{t.settingsTitle}</h1>
                <div className="space-y-3">
                    {/* Compact Card: Language */}
                    <Card className={`${cardNeonClasses} !p-3`}>
                        <div className="flex items-center justify-between">
                            <h2 className="text-lg font-bold text-white tracking-wide">{t.language}</h2>
                            <div className="flex items-center gap-2">
                                <button onClick={() => setLanguage('en')} className={langClasses('en')}>EN</button>
                                <button onClick={() => setLanguage('ua')} className={langClasses('ua')}>UA</button>
                                <button onClick={() => setLanguage('vn')} className={langClasses('vn')}>VN</button>
                                <button onClick={() => setLanguage('ru')} className={langClasses('ru')}>RU</button>
                            </div>
                        </div>
                    </Card>

                    {/* Compact Card: Voice Assistant */}
                    <Link to="/settings/voice" className="block">
                         <Card className={`${cardNeonClasses} !p-3`}>
                             <div className="flex justify-center items-center">
                                <h2 className="font-chakra font-bold text-xl text-white tracking-wider">{t.voiceAssistant}</h2>
                            </div>
                        </Card>
                    </Link>

                    {/* Compact Card: Database Tools */}
                    <Card className={`${cardNeonClasses} !p-3 space-y-3`}>
                         <Button variant="ghost" onClick={handleGenerateDemo} className="w-full !justify-center !p-0">
                            <h2 className="font-chakra font-bold text-xl text-white tracking-wider">{t.generateDemoSession}</h2>
                        </Button>
                        <div className="border-t border-white/10 pt-2">
                            <Button 
                                variant="secondary" 
                                onClick={handleScanForGhosts} 
                                disabled={isScanning}
                                className="w-full !justify-center !p-3 !bg-yellow-500/10 !border-yellow-500/30 !text-yellow-200"
                            >
                                <div className="flex items-center gap-2">
                                    <Wand className="w-5 h-5" />
                                    <span className="font-chakra font-bold text-lg tracking-wider">
                                        {isScanning ? 'Scanning History...' : 'Restore Missing Players'}
                                    </span>
                                </div>
                            </Button>
                            <p className="text-[10px] text-center text-dark-text-secondary mt-1">
                                Safe scan: Checks history for deleted players and asks for confirmation before restoring.
                            </p>
                        </div>
                    </Card>
                </div>
            </div>

            <div className="p-4 shrink-0 space-y-4">
                <NetworkHud />
                <div className="text-center opacity-40 hover:opacity-100 transition-opacity duration-500">
                    <p className="font-orbitron font-bold text-sm tracking-widest text-dark-accent-start">532 PLAYGROUND</p>
                    <p className="text-[10px] text-dark-text-secondary font-mono mt-1">v3.0.0 • SYSTEM READY</p>
                </div>
            </div>
        </div>
    );
};
