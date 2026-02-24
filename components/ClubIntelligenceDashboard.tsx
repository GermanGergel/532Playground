
import React, { useState, useEffect } from 'react';
import { HubRoster } from './HubRoster';
import { HubArchive } from './HubArchive';
import { HubInfo } from './HubInfo';
import { PublicHubDashboard } from './PublicHubDashboard';
import { logAnalyticsEvent } from '../db';

import { ClubNewsItem } from '../types';

interface ClubIntelligenceDashboardProps {
    currentView: 'dashboard' | 'roster' | 'archive' | 'tournaments' | 'league' | 'info' | 'duel';
    setView: (view: any) => void;
    onArchiveViewChange?: (date: string | null) => void;
    customTeamEmblems?: Record<string, string>;
    clubNews?: ClubNewsItem[];
}

export const ClubIntelligenceDashboard: React.FC<ClubIntelligenceDashboardProps> = ({ currentView, onArchiveViewChange, customTeamEmblems = {}, clubNews = [] }) => {
    const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
    const [hubSortBy, setHubSortBy] = useState<'name' | 'rating' | 'date'>('rating');
    const [hubSearch, setHubSearch] = useState('');

    useEffect(() => {
        logAnalyticsEvent('view_tab', currentView);
    }, [currentView]);

    useEffect(() => {
        if (currentView !== 'archive' && onArchiveViewChange) {
            onArchiveViewChange(null);
        }
    }, [currentView, onArchiveViewChange]);

    return (
        <div className="w-full h-full animate-in fade-in duration-700 relative">
            {/* Main Content Area */}
            <div className="w-full h-full relative overflow-hidden">
                {currentView === 'dashboard' && <PublicHubDashboard customTeamEmblems={customTeamEmblems} clubNews={clubNews} />}
                
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
                
                {currentView === 'archive' && <HubArchive onViewSession={onArchiveViewChange} customTeamEmblems={customTeamEmblems} />}
                {currentView === 'info' && <HubInfo />}
                
                {(currentView === 'tournaments' || currentView === 'league') && (
                    <div className="h-full flex flex-col items-center justify-center opacity-20">
                        <span className="font-orbitron text-xl uppercase tracking-[0.5em] text-white font-black animate-pulse">Coming Soon</span>
                    </div>
                )}
            </div>
            
            <style dangerouslySetInnerHTML={{ __html: `
                .custom-hub-scrollbar::-webkit-scrollbar { width: 4px; height: 4px; }
                .custom-hub-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-hub-scrollbar::-webkit-scrollbar-thumb { background: rgba(0, 242, 254, 0.1); border-radius: 10px; }
            `}} />
        </div>
    );
};
