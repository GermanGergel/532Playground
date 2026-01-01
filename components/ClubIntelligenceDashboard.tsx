
import React, { useState, useEffect } from 'react';
import { HubRoster } from './HubRoster';
import { HubArchive } from './HubArchive';
import { HubPlayerIntel } from './HubPlayerIntel';
import { HubInfo } from './HubInfo';
import { HubDuel } from './HubDuel';
import { PublicHubDashboard } from './PublicHubDashboard';
import { logAnalyticsEvent } from '../db';

interface ClubIntelligenceDashboardProps {
    currentView: 'dashboard' | 'roster' | 'archive' | 'tournaments' | 'league' | 'info' | 'duel';
    setView: (view: any) => void;
    onArchiveViewChange?: (date: string | null) => void;
}

export const ClubIntelligenceDashboard: React.FC<ClubIntelligenceDashboardProps> = ({ currentView, setView, onArchiveViewChange }) => {
    const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
    const [duelPlayerIds, setDuelPlayerIds] = useState<[string | null, string | null]>([null, null]);
    const [hubSortBy, setHubSortBy] = useState<'name' | 'rating' | 'date'>('rating');
    const [hubSearch, setHubSearch] = useState('');

    // Analytics: Track Tab Changes
    useEffect(() => {
        logAnalyticsEvent('view_tab', currentView);
    }, [currentView]);

    useEffect(() => {
        if (currentView !== 'duel') {
            setDuelPlayerIds([null, null]);
        }
        if (currentView !== 'roster' && currentView !== 'duel') {
             setSelectedPlayerId(null);
        }
        if (currentView !== 'archive' && onArchiveViewChange) {
            onArchiveViewChange(null);
        }
    }, [currentView, onArchiveViewChange]);

    const handleStartDuel = (p1Id: string, p2Id: string) => {
        setDuelPlayerIds([p1Id, p2Id]);
        setView('duel');
        logAnalyticsEvent('start_duel', `${p1Id}_vs_${p2Id}`);
    };

    return (
        <div className="w-full h-full animate-in fade-in duration-700 relative overflow-hidden rounded-[2.5rem]">
            {/* UNIFIED PERSISTENT BACKGROUND */}
            <div className="absolute inset-0 z-0 pointer-events-none">
                {/* Primary Deep Space Gradient - Ends in absolute black */}
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#0f172a] via-[#020617] to-black"></div>
                
                {/* Tech Texture */}
                <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]"></div>
                
                {/* Bottom Depth Vignette - Forces content to fade into the black base */}
                <div className="absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-t from-black via-black/40 to-transparent z-10"></div>
            </div>

            {/* Content Container */}
            <div className="relative w-full h-[calc(100vh-110px)] md:h-[calc(100dvh-110px)] min-h-[650px] z-10">
                {currentView === 'dashboard' && <PublicHubDashboard />}
                {currentView === 'roster' && (
                    selectedPlayerId ? (
                        <HubPlayerIntel playerId={selectedPlayerId} onBack={() => setSelectedPlayerId(null)} />
                    ) : (
                        <HubRoster 
                            onSelectPlayer={(id) => {
                                setSelectedPlayerId(id);
                                logAnalyticsEvent('view_player', id);
                            }} 
                            sortBy={hubSortBy}
                            setSortBy={setHubSortBy}
                            search={hubSearch}
                            setSearch={setHubSearch}
                            onStartDuel={handleStartDuel}
                        />
                    )
                )}
                {currentView === 'duel' && <HubDuel p1Id={duelPlayerIds[0]} p2Id={duelPlayerIds[1]} onBack={() => setView('roster')} />}
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
