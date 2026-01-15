import React, { useMemo, useState, useEffect } from 'react';
import { useApp } from '../context';
import { Player, PlayerStatus, Session } from '../types';
import { TrophyIcon, Users, History as HistoryIcon } from '../icons';
import { useTranslation } from '../ui';
import { HubRoster } from './HubRoster';
import { HubArchive } from './HubArchive';
import { HubInfo } from './HubInfo';
import { HubNews } from './HubNews';
import { HubPlayerIntel } from './HubPlayerIntel';
import { HubDuel } from './HubDuel';
import { HubSessionDetail } from './HubSessionDetail';

// --- MAIN DASHBOARD WIDGET ---

const CinematicStatCard: React.FC<{ value: string | number; label: string; }> = ({ value, label }) => (
    <div className="w-full h-40">
        <div className="relative rounded-3xl overflow-hidden bg-white/[0.03] border border-white/10 shadow-2xl h-full backdrop-blur-md">
            <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-40"></div>
            <div className="absolute top-0 left-0 right-0 h-16 bg-gradient-to-b from-white/5 to-transparent blur-xl"></div>
            <div className="relative h-full z-10 flex flex-col items-center justify-center gap-2">
                <span className="font-russo font-black text-6xl text-white tracking-widest leading-none">{value}</span>
                <span className="font-chakra font-bold text-xs text-white/50 uppercase tracking-[0.2em]">{label}</span>
            </div>
        </div>
    </div>
);

const ClubVitalsWidget: React.FC = () => {
    const { allPlayers, history } = useApp();
    const t = useTranslation();

    const clubStats = useMemo(() => {
        const confirmedPlayers = allPlayers.filter(p => p.status === PlayerStatus.Confirmed);
        const totalPlayers = confirmedPlayers.length;
        
        // FIX: Removed the incorrect "+ 1" to accurately reflect the number of completed sessions.
        const totalSessions = history.length || 0;
        
        const avgRating = totalPlayers > 0 
            ? Math.round(confirmedPlayers.reduce((sum, p) => sum + p.rating, 0) / totalPlayers) 
            : 0;
            
        return { totalPlayers, totalSessions, avgRating };
    }, [allPlayers, history]);

    return (
        <div className="grid grid-cols-3 gap-4">
            <CinematicStatCard value={clubStats.totalPlayers} label={t.hubStatsMembers} />
            <CinematicStatCard value={clubStats.totalSessions} label={t.hubSessionsPlayed} />
            <CinematicStatCard value={clubStats.avgRating} label={t.hubAvgRating} />
        </div>
    );
};


// --- MAIN DASHBOARD EXPORT ---

interface ClubIntelligenceDashboardProps {
    currentView: 'dashboard' | 'roster' | 'archive' | 'tournaments' | 'league' | 'info' | 'duel';
    setView: (view: any) => void;
    onArchiveViewChange?: (date: string | null) => void;
}

export const ClubIntelligenceDashboard: React.FC<ClubIntelligenceDashboardProps> = ({ currentView, setView, onArchiveViewChange }) => {
    
    // Roster states
    const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
    const [hubSortBy, setHubSortBy] = useState<'name' | 'rating' | 'date'>('rating');
    const [hubSearch, setHubSearch] = useState('');

    useEffect(() => {
        if (currentView !== 'archive' && onArchiveViewChange) {
            onArchiveViewChange(null);
        }
    }, [currentView, onArchiveViewChange]);

    return (
        <div className="w-full h-full animate-in fade-in duration-700 relative">
            {/* Main Content Area */}
            <div className="w-full h-full relative overflow-hidden">
                {currentView === 'dashboard' && (
                    <div className="p-8">
                        <ClubVitalsWidget />
                    </div>
                )}
                
                {(currentView === 'roster' || currentView === 'duel') && (
                    <HubRoster 
                        selectedPlayerId={selectedPlayerId}
                        onSelectPlayer={setSelectedPlayerId} 
                        sortBy={hubSortBy}
                        setSortBy={setHubSortBy}
                        search={hubSearch}
                        setSearch={setHubSearch}
                        onStartDuel={() => {}} 
                    />
                )}
                
                {currentView === 'archive' && <HubArchive onViewSession={onArchiveViewChange} />}

                {currentView === 'info' && <HubInfo />}
                
                {(currentView === 'tournaments' || currentView === 'league') && (
                    <div className="h-full flex flex-col items-center justify-center opacity-20">
                        <span className="font-orbitron text-xl uppercase tracking-[0.5em] text-white font-black animate-pulse">Coming Soon</span>
                    </div>
                )}
            </div>
            
            <style dangerouslySetInnerHTML={{ __html: `
                .custom-hub-scrollbar::-webkit-scrollbar { width: 4px; }
                .custom-hub-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-hub-scrollbar::-webkit-scrollbar-thumb { background: rgba(0, 242, 254, 0.1); border-radius: 10px; }
            `}} />
        </div>
    );
};