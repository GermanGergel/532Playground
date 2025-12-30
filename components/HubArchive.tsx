
import React, { useState } from 'react';
import { useApp } from '../context';
import { Calendar, History as HistoryIcon } from '../icons';
import { HubSessionDetail } from './HubSessionDetail';

interface HubArchiveProps {
    onViewSession?: (date: string | null) => void;
}

export const HubArchive: React.FC<HubArchiveProps> = ({ onViewSession }) => {
    const { history } = useApp();
    const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);

    const selectedSession = history.find(s => s.id === selectedSessionId);

    if (selectedSession) {
        return <HubSessionDetail 
            session={selectedSession} 
            onBack={() => {
                setSelectedSessionId(null);
                if (onViewSession) onViewSession(null);
            }} 
        />;
    }

    const handleSessionClick = (session: any) => {
        setSelectedSessionId(session.id);
        if (onViewSession) {
            const dateStr = new Date(session.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
            onViewSession(dateStr);
        }
    };

    return (
        <div className="absolute inset-0 z-20 flex flex-col animate-in fade-in duration-500 rounded-[2.5rem] overflow-hidden">
            <div className="absolute inset-0 z-0 pointer-events-none">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#0f172a] via-[#020617] to-black"></div>
                <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]"></div>
            </div>
            
            <div className="flex-grow overflow-y-auto px-4 md:px-16 lg:px-40 xl:px-60 space-y-3 custom-hub-scrollbar pb-32 pt-28 relative z-10">
                {history.map((session) => (
                    <div 
                        key={session.id} 
                        onClick={() => handleSessionClick(session)}
                        className="group relative flex items-center justify-between h-[84px] w-full rounded-2xl transition-all duration-500 cursor-pointer active:scale-[0.98]"
                    >
                        {/* BENTO STYLE BACKGROUND */}
                        <div className="absolute inset-0 rounded-2xl overflow-hidden z-1 bg-gradient-to-br from-[#161b22] to-[#0a0d14] border border-white/[0.06] group-hover:border-[#00F2FE]/30 transition-all duration-500 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.9),inset_0_1px_1px_rgba(255,255,255,0.05)]">
                            {/* Mesh Texture */}
                            <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ 
                                backgroundImage: `linear-gradient(45deg, #fff 25%, transparent 25%, transparent 50%, #fff 50%, #fff 75%, transparent 75%, transparent)`,
                                backgroundSize: '4px 4px'
                            }}></div>
                            
                            {/* Ambient Glow */}
                            <div className="absolute -top-10 -left-10 w-20 h-20 bg-[#00F2FE]/[0.05] rounded-full blur-[30px] pointer-events-none group-hover:bg-[#00F2FE]/10 transition-colors"></div>

                            {/* Blue accent line on left */}
                            <div className="absolute top-0 left-0 w-1.5 h-full bg-[#00F2FE]/20 group-hover:bg-[#00F2FE] transition-colors duration-500 shadow-[0_0_10px_rgba(0,242,254,0.2)]"></div>
                        </div>

                        <div className="relative z-10 h-full w-full flex items-center px-6 gap-5">
                            <div className="w-11 h-11 rounded-xl bg-[#00F2FE]/5 border border-white/5 flex items-center justify-center text-[#00F2FE]/60 group-hover:text-[#00F2FE] group-hover:border-[#00F2FE]/20 transition-all duration-500">
                                <Calendar className="w-6 h-6" />
                            </div>
                            
                            <div className="flex flex-col flex-grow min-w-0">
                                <span className="font-chakra font-black text-xl text-white/90 uppercase tracking-wide leading-tight group-hover:text-white transition-colors truncate">
                                    {new Date(session.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'long' })}
                                </span>
                                <div className="flex items-center gap-2 mt-1">
                                    <span className="text-[9px] font-black text-white/20 uppercase tracking-[0.2em] group-hover:text-white/40 transition-colors">
                                        {new Date(session.date).getFullYear()} • {session.sessionName || '532 SQUAD'}
                                    </span>
                                    <div className="h-[1px] w-4 bg-white/5 rounded-full"></div>
                                </div>
                            </div>

                            <div className="flex items-center gap-5 shrink-0">
                                <div className="flex flex-col items-end">
                                    <span className="font-russo text-xl text-white/80 group-hover:text-[#00F2FE] transition-colors leading-none">{session.playerPool.length}</span>
                                    <span className="text-[7px] font-black text-white/20 uppercase tracking-[0.3em] mt-1">UNITS</span>
                                </div>
                                <div className="w-px h-8 bg-white/5"></div>
                                <div className="flex flex-col items-end">
                                    <span className="font-russo text-xl text-white/80 group-hover:text-[#00F2FE] transition-colors leading-none">{session.numTeams}</span>
                                    <span className="text-[7px] font-black text-white/20 uppercase tracking-[0.3em] mt-1">TEAMS</span>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}

                {history.length === 0 && (
                    <div className="h-full flex flex-col items-center justify-center py-24 opacity-20 gap-6">
                        <div className="w-20 h-20 rounded-full border-2 border-dashed border-white/20 animate-spin-slow flex items-center justify-center">
                            <HistoryIcon className="w-10 h-10 text-white/40" />
                        </div>
                        <span className="font-orbitron text-[12px] uppercase tracking-[0.8em] text-white text-center ml-8 font-black">Archive Empty</span>
                    </div>
                )}
            </div>

            <style dangerouslySetInnerHTML={{ __html: `
                @keyframes spin-slow { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                .animate-spin-slow { animation: spin-slow 12s linear infinite; }
            `}} />
        </div>
    );
};
