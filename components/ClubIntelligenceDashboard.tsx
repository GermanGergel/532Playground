
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
        <div className="w-full h-full animate-in fade-in duration-700">
            {/* 
                Изменено: h-full вместо фиксированного calc. 
                Это позволяет плашке растягиваться до границ, заданных в PublicHubScreen.
            */}
            <div className="w-full h-full relative">
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
