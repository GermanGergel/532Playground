
import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '../context';
import { Calendar, History as HistoryIcon, Search, RefreshCw } from '../icons';
import { HubSessionDetail } from './HubSessionDetail';
import { useTranslation } from '../ui';
import { Session } from '../types';

interface HubArchiveProps {
    onViewSession?: (date: string | null) => void;
}

export const HubArchive: React.FC<HubArchiveProps> = ({ onViewSession }) => {
    const { history, fetchHistory } = useApp();
    const t = useTranslation();
    const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const loadFullHistory = async () => {
            setIsLoading(true);
            await fetchHistory(); 
            setIsLoading(false);
        };
        loadFullHistory();
    }, [fetchHistory]);

    const publicHistory = useMemo(() => {
        return history.filter(s => {
            const name = (s.sessionName || '').toLowerCase();
            return !name.includes('demo') && 
                   !name.includes('test') && 
                   !name.includes('демо') && 
                   !name.includes('тест');
        });
    }, [history]);

    useEffect(() => {
        if (!isLoading && !selectedSessionId && publicHistory.length > 0) {
            const latestSession = publicHistory[0];
            setSelectedSessionId(latestSession.id);
            if (onViewSession) {
                const dateStr = new Date(latestSession.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
                onViewSession(dateStr);
            }
        }
    }, [publicHistory, selectedSessionId, onViewSession, isLoading]);

    const filteredHistory = useMemo(() => {
        return publicHistory.filter(s => 
            s.sessionName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            new Date(s.date).toLocaleDateString().includes(searchTerm)
        );
    }, [publicHistory, searchTerm]);

    const selectedSession = useMemo(() => 
        publicHistory.find(s => s.id === selectedSessionId), 
    [publicHistory, selectedSessionId]);

    const handleSessionClick = (session: Session) => {
        setSelectedSessionId(session.id);
        if (onViewSession) {
            const dateStr = new Date(session.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
            onViewSession(dateStr);
        }
    };

    return (
        <div className="absolute inset-0 flex flex-row animate-in fade-in duration-700 overflow-hidden rounded-[2.5rem]">
            {/* --- SIDEBAR: SESSION LIST --- */}
            <div className="w-[350px] flex flex-col border-r border-white/5 bg-black/40 relative z-20 shrink-0">
                {/* Header Section */}
                <div className="pt-4 pl-40 flex flex-col items-start shrink-0"> 
                    <div className="flex flex-col items-center">
                        <span className="font-blackops text-[24px] text-[#00F2FE] uppercase tracking-[0.1em] italic leading-none" style={{ textShadow: '0 0 10px rgba(0,242,254,0.4)' }}>
                            ARCHIVE
                        </span>
                        <span className="text-[7px] font-black text-white/30 uppercase tracking-[0.3em] whitespace-nowrap mt-1">
                            Historical Data Access
                        </span>
                    </div>
                </div>

                {/* Search Bar */}
                <div className="mt-8 px-4 mb-4 shrink-0">
                    <div className="relative group w-full h-[34px]"> 
                        <input 
                            type="text" 
                            placeholder="SEARCH SESSIONS..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full h-full bg-white/5 border border-white/10 rounded-xl pl-4 pr-10 text-[10px] font-chakra font-black text-white uppercase tracking-[0.15em] focus:outline-none focus:border-[#00F2FE]/40 transition-all placeholder:text-white/20" 
                        />
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-[#00F2FE] transition-colors">
                            <Search className="w-4 h-4" />
                        </div>
                    </div>
                </div>

                {/* Session List container */}
                <div className="flex-grow relative overflow-hidden flex flex-col">
                    <div className="flex-grow overflow-y-auto custom-hub-scrollbar px-4 pb-12 pt-2 space-y-5">
                        {isLoading ? (
                            <div className="flex justify-center items-center h-full pt-10">
                                <RefreshCw className="w-6 h-6 text-white/20 animate-spin" />
                            </div>
                        ) : filteredHistory.length > 0 ? (
                            filteredHistory.map((session) => {
                                const isSelected = selectedSessionId === session.id;
                                return (
                                    <div 
                                        key={session.id} 
                                        onClick={() => handleSessionClick(session)}
                                        className={`group relative flex items-center h-[68px] w-full rounded-2xl transition-all duration-300 cursor-pointer border overflow-hidden
                                            ${isSelected 
                                                ? 'bg-gradient-to-br from-[#1e2329] to-[#12161b] border-white/20 shadow-[0_10px_20px_rgba(0,0,0,0.6),inset_0_1px_1px_rgba(255,255,255,0.1)]' 
                                                : 'bg-gradient-to-br from-[#0d1117] to-[#010409] border-white/5 shadow-[0_4px_10px_rgba(0,0,0,0.4),inset_0_1px_0.5px_rgba(255,255,255,0.05)] hover:border-white/10'
                                            }`}
                                    >
                                        <div className="absolute inset-0 opacity-[0.03] pointer-events-none z-0" style={{ backgroundImage: `linear-gradient(45deg, #fff 25%, transparent 25%, transparent 50%, #fff 50%, #fff 75%, transparent 75%, transparent)`, backgroundSize: '4px 4px' }}></div>
                                        <div 
                                            className="absolute left-0 top-1/2 -translate-y-1/2 w-[1.5px] h-6 rounded-r-full transition-all duration-500 z-10" 
                                            style={{ 
                                                backgroundColor: isSelected ? '#00F2FE' : 'transparent', 
                                                boxShadow: isSelected ? '0 0 10px #00F2FE' : 'none',
                                                opacity: isSelected ? 1 : 0
                                            }}
                                        ></div>
                                        
                                        <div className="flex items-center px-4 gap-3 w-full relative z-10">
                                            <div className={`w-8 h-8 rounded-xl flex items-center justify-center border transition-all duration-500 shrink-0
                                                ${isSelected ? 'bg-[#00F2FE]/10 border-[#00F2FE]/30 text-[#00F2FE]' : 'bg-white/5 border-white/5 text-white/20'}`}>
                                                <Calendar className="w-3.5 h-3.5" />
                                            </div>
                                            <div className="flex flex-col min-w-0 flex-grow">
                                                <span className={`font-chakra font-black text-[13px] uppercase tracking-tight truncate transition-colors ${isSelected ? 'text-white' : 'text-white/60'}`}>
                                                    {new Date(session.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                                                </span>
                                                <span className="text-[6.5px] font-mono font-black text-white/20 uppercase tracking-[0.2em] truncate">
                                                    {session.sessionName || 'UNIT SESSION'}
                                                </span>
                                            </div>
                                            <div className="flex gap-2.5 items-center shrink-0">
                                                <div className="flex flex-col items-end">
                                                    <span className={`font-russo text-[15px] leading-none transition-colors ${isSelected ? 'text-[#00F2FE]' : 'text-white/20'}`}>{session.numTeams || session.teams.length}</span>
                                                    <span className="text-[5px] font-mono font-black text-white/10 uppercase">TEAMS</span>
                                                </div>
                                                <div className="w-px h-5 bg-white/5"></div>
                                                <div className="flex flex-col items-end">
                                                    <span className={`font-russo text-[15px] leading-none transition-colors ${isSelected ? 'text-[#00F2FE]' : 'text-white/20'}`}>{session.playerPool.length}</span>
                                                    <span className="text-[5px] font-mono font-black text-white/10 uppercase">UNITS</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        ) : (
                            <div className="py-10 text-center opacity-20">
                                <span className="text-[9px] font-black uppercase tracking-widest">No Matches Found</span>
                            </div>
                        )}
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 h-5 bg-gradient-to-t from-[#05070a] to-transparent z-30 pointer-events-none"></div>
                </div>
            </div>

            {/* --- CONTENT AREA: SESSION DETAIL --- */}
            <div className="flex-grow relative bg-[#01040a] overflow-hidden">
                {selectedSession ? (
                    <div key={selectedSession.id} className="h-full w-full animate-in fade-in slide-in-from-right-4 duration-500">
                        <HubSessionDetail 
                            session={selectedSession} 
                            isEmbedded={true}
                            onBack={() => {}} 
                        />
                    </div>
                ) : !isLoading && (
                    <div className="h-full w-full flex flex-col items-center justify-center opacity-10">
                        <HistoryIcon className="w-32 h-32 mb-6" />
                        <span className="font-orbitron text-xl uppercase tracking-[0.6em] font-black">Select Session Intel</span>
                    </div>
                )}
            </div>
        </div>
    );
};
