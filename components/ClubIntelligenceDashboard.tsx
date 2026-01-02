
import React, { useState, useEffect, useMemo } from 'react';
import { HubRoster } from './HubRoster';
import { HubArchive } from './HubArchive';
import { HubInfo } from './HubInfo';
import { PublicHubDashboard } from './PublicHubDashboard';
import { logAnalyticsEvent } from '../db';

interface ClubIntelligenceDashboardProps {
    currentView: 'dashboard' | 'roster' | 'archive' | 'tournaments' | 'league' | 'info' | 'duel';
    setView: (view: any) => void;
    onArchiveViewChange?: (date: string | null) => void;
}

const VIEW_THEMES: Record<string, { bottomStop: string }> = {
    dashboard: { bottomStop: '#0a0c10' }, 
    roster: { bottomStop: '#0a0c10' },    
    archive: { bottomStop: '#0a0c10' },   
    info: { bottomStop: '#0a0c10' },      
    tournaments: { bottomStop: '#0a0c10' },
    league: { bottomStop: '#0a0c10' },
};

export const ClubIntelligenceDashboard: React.FC<ClubIntelligenceDashboardProps> = ({ currentView, setView, onArchiveViewChange }) => {
    const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
    const [hubSortBy, setHubSortBy] = useState<'name' | 'rating' | 'date'>('rating');
    const [hubSearch, setHubSearch] = useState('');

    const activeTheme = useMemo(() => {
        return VIEW_THEMES[currentView] || { bottomStop: '#0a0c10' };
    }, [currentView]);

    useEffect(() => {
        logAnalyticsEvent('view_tab', currentView);
    }, [currentView]);

    useEffect(() => {
        if (currentView !== 'archive' && onArchiveViewChange) {
            onArchiveViewChange(null);
        }
    }, [currentView, onArchiveViewChange]);

    return (
        <div className="w-full h-full animate-in fade-in duration-700 relative bg-[#0a0c10]">
            {/* Dynamic Top Fade */}
            <div 
                className="fixed top-0 left-0 right-0 h-20 md:h-24 z-[95] pointer-events-none transition-all duration-700 ease-in-out"
                style={{
                    background: `linear-gradient(to bottom, 
                        #0a0c10 0%, 
                        ${activeTheme.bottomStop} 40%, 
                        transparent 100%)`
                }}
            ></div>

            <div className="w-full h-[calc(100vh-110px)] md:h-[calc(100dvh-110px)] min-h-[650px] relative overflow-hidden bg-[#0a0c10]">
                {currentView === 'dashboard' && <PublicHubDashboard />}
                
                {(currentView === 'roster' || currentView === 'duel') && (
                    <HubRoster 
                        selectedPlayerId={selectedPlayerId}
                        onSelectPlayer={(id) => {
                            setSelectedPlayerId(id);
                            if (id) logAnalyticsEvent('view_player', id);
                        }} 
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
                    <div className="h-full flex flex-col items-center justify-center opacity-20 bg-[#0a0c10]">
                        <span className="font-orbitron text-xl uppercase tracking-[0.5em] text-white font-black animate-pulse">Coming Soon</span>
                    </div>
                )}
            </div>

            {/* Dynamic Bottom Fade */}
            <div 
                className="fixed bottom-0 left-0 right-0 h-8 md:h-10 z-[150] pointer-events-none transition-all duration-700 ease-in-out"
                style={{
                    background: `linear-gradient(to bottom, 
                        transparent 0%, 
                        ${activeTheme.bottomStop} 20%, 
                        #0a0c10 100%)`
                }}
            ></div>
            
            <style dangerouslySetInnerHTML={{ __html: `
                .custom-hub-scrollbar::-webkit-scrollbar { width: 4px; }
                .custom-hub-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-hub-scrollbar::-webkit-scrollbar-thumb { background: rgba(0, 242, 254, 0.1); border-radius: 10px; }
            `}} />
        </div>
    );
};
