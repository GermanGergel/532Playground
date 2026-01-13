
import React, { useMemo } from 'react';
import { useApp } from '../context';
import { YouTubeIcon, TrophyIcon, Activity, Calendar, Users } from '../icons';
import { useTranslation } from '../ui';
import { Session } from '../types';

export const PublicHubDashboard: React.FC = () => {
    const { history, activeSession } = useApp();
    const t = useTranslation();

    const latestSession = useMemo(() => {
        if (activeSession) return activeSession;
        if (history.length > 0) return history[0];
        return null;
    }, [activeSession, history]);

    const videoLink = latestSession?.videoUrl;

    if (!latestSession) {
        return (
            <div className="h-full w-full flex items-center justify-center opacity-30">
                <span className="font-orbitron text-xl uppercase tracking-widest">AWAITING DATA UPLINK...</span>
            </div>
        );
    }

    return (
        <div className="h-full w-full overflow-y-auto custom-hub-scrollbar p-4 md:p-8">
            <div className="max-w-3xl mx-auto space-y-6">
                
                {/* Header */}
                <div className="flex flex-col items-center justify-center text-center py-8">
                    <span className="font-blackops text-4xl md:text-6xl text-[#00F2FE] uppercase tracking-tighter" style={{ textShadow: '0 0 20px rgba(0,242,254,0.4)' }}>
                        532
                    </span>
                    <span className="font-chakra text-sm text-white/50 uppercase tracking-[0.5em] mt-2">
                        INTELLIGENCE CENTER
                    </span>
                </div>

                {/* Latest Session Card */}
                <div className="bg-[#0a0c10] border border-white/10 rounded-3xl p-6 relative overflow-hidden group">
                    <div className="absolute inset-0 bg-gradient-to-br from-[#00F2FE]/5 to-transparent opacity-50"></div>
                    
                    <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                        <div>
                            <div className="flex items-center gap-2 mb-2">
                                <div className={`w-2 h-2 rounded-full ${activeSession ? 'bg-green-500 animate-pulse' : 'bg-gray-500'}`}></div>
                                <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">
                                    {activeSession ? 'LIVE SESSION' : 'LATEST REPORT'}
                                </span>
                            </div>
                            <h3 className="font-russo text-2xl text-white uppercase tracking-wide">
                                {latestSession.sessionName}
                            </h3>
                            <p className="text-xs text-white/50 font-mono mt-1">
                                {new Date(latestSession.date).toLocaleDateString()}
                            </p>
                        </div>

                        {/* Media Link */}
                        <div 
                            className={`flex items-center gap-3 border border-white/5 py-3 px-4 rounded-xl transition-all ${videoLink ? 'bg-white/5 hover:bg-white/10 cursor-pointer group/btn' : 'opacity-30 cursor-default'}`}
                            onClick={() => videoLink ? window.open(videoLink, '_blank') : null}
                        >
                            <div className="w-10 h-10 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500 shrink-0 shadow-[0_0_10px_rgba(239,68,68,0.15)] group-hover/btn:shadow-[0_0_15px_rgba(239,68,68,0.4)] transition-all">
                                <YouTubeIcon className="w-5 h-5 fill-current drop-shadow-[0_0_3px_rgba(239,68,68,0.6)]" />
                            </div>
                            <div className="flex flex-col">
                                <span className="text-[8px] font-black text-white/30 uppercase tracking-[0.2em] mb-0.5">MEDIA</span>
                                <span className={`font-chakra font-bold text-sm tracking-wide transition-colors ${videoLink ? 'text-slate-200 group-hover/btn:text-[#00F2FE]' : 'text-white/20'}`}>
                                    {videoLink ? 'WATCH REPLAY' : 'NO FOOTAGE'}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Quick Stats Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col items-center justify-center">
                        <TrophyIcon className="w-6 h-6 text-[#FFD700] mb-2 opacity-80" />
                        <span className="text-2xl font-black font-russo text-white">{latestSession.games.filter(g => g.status === 'finished').length}</span>
                        <span className="text-[8px] font-bold text-white/30 uppercase tracking-widest">Matches</span>
                    </div>
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col items-center justify-center">
                        <Activity className="w-6 h-6 text-[#4CFF5F] mb-2 opacity-80" />
                        <span className="text-2xl font-black font-russo text-white">
                            {latestSession.games.reduce((acc, g) => acc + g.team1Score + g.team2Score, 0)}
                        </span>
                        <span className="text-[8px] font-bold text-white/30 uppercase tracking-widest">Goals</span>
                    </div>
                     <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col items-center justify-center">
                        <Users className="w-6 h-6 text-[#00F2FE] mb-2 opacity-80" />
                        <span className="text-2xl font-black font-russo text-white">{latestSession.playerPool.length}</span>
                        <span className="text-[8px] font-bold text-white/30 uppercase tracking-widest">Players</span>
                    </div>
                     <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col items-center justify-center">
                        <Calendar className="w-6 h-6 text-[#A9B1BD] mb-2 opacity-80" />
                        <span className="text-xl font-black font-russo text-white truncate w-full text-center">
                            {latestSession.numTeams}
                        </span>
                        <span className="text-[8px] font-bold text-white/30 uppercase tracking-widest">Squads</span>
                    </div>
                </div>

            </div>
        </div>
    );
};
