import React, { useState } from 'react';
import { ClubIntelligenceDashboard } from '../components/ClubIntelligenceDashboard';
import { LayoutDashboard, Users, History, InfoIcon } from '../icons';

export const PublicHubScreen: React.FC = () => {
    const [currentView, setCurrentView] = useState<'dashboard' | 'roster' | 'archive' | 'tournaments' | 'league' | 'info' | 'duel'>('dashboard');
    const [archiveDate, setArchiveDate] = useState<string | null>(null);

    const navItems = [
        { id: 'dashboard', icon: LayoutDashboard, label: 'DASHBOARD' },
        { id: 'roster', icon: Users, label: 'ROSTER' },
        { id: 'archive', icon: History, label: 'ARCHIVE' },
        { id: 'info', icon: InfoIcon, label: 'INTEL' },
    ];

    return (
        <div className="w-full h-screen bg-[#05070a] text-white overflow-hidden flex flex-col font-sans selection:bg-[#00F2FE] selection:text-black">
            <div className="flex-grow relative overflow-hidden">
                <ClubIntelligenceDashboard 
                    currentView={currentView} 
                    setView={setCurrentView}
                    onArchiveViewChange={setArchiveDate}
                />
            </div>

            {/* Bottom Navigation Dock */}
            <div className="h-20 shrink-0 border-t border-white/5 bg-[#0a0c10] px-4 flex items-center justify-center relative z-50">
                <div className="flex items-center gap-1 bg-white/5 p-1 rounded-2xl border border-white/5 shadow-2xl backdrop-blur-md">
                    {navItems.map((item) => {
                        const isActive = currentView === item.id || (item.id === 'roster' && currentView === 'duel');
                        const Icon = item.icon;
                        
                        return (
                            <button
                                key={item.id}
                                onClick={() => setCurrentView(item.id as any)}
                                className={`
                                    relative flex flex-col items-center justify-center w-20 h-14 rounded-xl transition-all duration-300 group
                                    ${isActive 
                                        ? 'bg-[#00F2FE]/10 text-[#00F2FE] shadow-[0_0_15px_rgba(0,242,254,0.2)] border border-[#00F2FE]/30' 
                                        : 'text-white/30 hover:text-white hover:bg-white/5 border border-transparent'
                                    }
                                `}
                            >
                                <Icon className={`w-5 h-5 mb-1 transition-transform duration-300 ${isActive ? 'scale-110' : 'group-hover:scale-110'}`} />
                                <span className="text-[9px] font-black tracking-widest uppercase">{item.label}</span>
                                
                                {isActive && (
                                    <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-[#00F2FE] rounded-full shadow-[0_0_5px_#00F2FE]"></div>
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};