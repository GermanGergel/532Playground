
import React, { useMemo } from 'react';
import { useApp } from '../context';
import { useTranslation } from '../ui';
import { calculateAllStats } from '../services/statistics';
import { TrophyIcon } from '../icons';

const SubtleDashboardAvatar: React.FC<{ team: any }> = ({ team }) => {
    const color = team?.color || '#A9B1BD';
    return (
        <div className="relative flex items-center justify-center shrink-0">
            <div 
                className="w-6 h-6 rounded-full flex items-center justify-center transition-all duration-500 bg-black/40 opacity-90"
                style={{ 
                    border: `1px solid ${color}`,
                    boxShadow: `0 0 5px ${color}66, 0 0 1.5px ${color}`, 
                }}
            >
                {team?.logo ? (
                    <img src={team.logo} className="w-full h-full rounded-full object-cover" alt="" />
                ) : (
                    <svg className="w-[55%] h-[55%]" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M20.38 3.46L16 2a4 4 0 0 0-8 0L3.62 3.46a2 2 0 0 0-1.34 2.23l.58 3.47a1 1 0 0 0 .99 .84H6v10c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V10h2.15a1 1 0 0 0 .99-.84l.58-3.47a2 2 0 0 0-1.34-2.23z" fill={color} fillOpacity="0.35" stroke={color} strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                )}
            </div>
        </div>
    );
};

export const PublicHubDashboard: React.FC = () => {
    const { history, activeSession } = useApp();
    const t = useTranslation();

    // Use active session or latest history session
    const targetSession = activeSession || (history.length > 0 ? history[0] : null);

    const { teamStats } = useMemo(() => {
        if (!targetSession) return { teamStats: [], allPlayersStats: [] };
        return calculateAllStats(targetSession);
    }, [targetSession]);

    if (!targetSession) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-white/20">
                <TrophyIcon className="w-16 h-16 mb-4" />
                <span className="font-orbitron text-xl uppercase tracking-widest">NO DATA</span>
            </div>
        );
    }

    const thStandings = "py-3 text-white/40 uppercase tracking-tighter text-[9px] font-black text-center sticky top-0 bg-[#12161b] backdrop-blur-md z-10 border-b border-white/5";
    const tdBase = "py-3 text-center text-[12px] font-bold transition-colors border-b border-white/5 group-last:border-0";

    return (
        <div className="absolute inset-0 flex flex-col p-4 md:p-8 overflow-hidden">
            <div className="w-full max-w-4xl mx-auto h-full flex flex-col">
                <div className="flex items-center gap-3 mb-6 shrink-0">
                    <div className="p-2 rounded-xl bg-white/5 border border-white/10 shadow-[0_0_15px_rgba(255,255,255,0.05)]">
                        <TrophyIcon className="w-5 h-5 text-[#FFD700]" />
                    </div>
                    <div>
                        <h4 className="font-russo text-xl text-white tracking-tight leading-none uppercase">{t.hubSessionLeaders}</h4>
                        <span className="text-[10px] font-mono text-[#00F2FE] uppercase tracking-wider">{targetSession.sessionName}</span>
                    </div>
                </div>

                <div className="flex-grow overflow-hidden rounded-3xl bg-gradient-to-br from-[#0d1117] to-[#010409] border border-white/[0.06] shadow-[0_25px_50px_-12px_rgba(0,0,0,0.9),inset_0_1px_1px_rgba(255,255,255,0.05)] relative flex flex-col">
                     <div className="absolute inset-0 opacity-[0.03] pointer-events-none z-0" style={{ backgroundImage: `linear-gradient(45deg, #fff 25%, transparent 25%, transparent 50%, #fff 50%, #fff 75%, transparent 75%, transparent)`, backgroundSize: '4px 4px' }}></div>
                     
                     <div className="relative z-10 flex-grow overflow-y-auto custom-hub-scrollbar p-1">
                        <table className="w-full table-fixed border-collapse">
                            <thead>
                                <tr className="bg-white/5 border-b border-white/10">
                                    <th className={`${thStandings} w-[5%]`}>#</th>
                                    <th className={`${thStandings} w-[28%]`}>{t.team}</th>
                                    <th className={`${thStandings} w-[7%]`}>{t.thP}</th>
                                    <th className={`${thStandings} w-[7%]`}>{t.thW}</th>
                                    <th className={`${thStandings} w-[7%]`}>{t.thD}</th>
                                    <th className={`${thStandings} w-[7%]`}>{t.thL}</th>
                                    <th className={`${thStandings} w-[9%]`}>{t.thGF}</th>
                                    <th className={`${thStandings} w-[9%]`}>{t.thGA}</th>
                                    <th className={`${thStandings} w-[11%]`}>{t.thGD}</th>
                                    <th className={`${thStandings} w-[10%] text-white bg-white/[0.03]`}>PTS</th>
                                </tr>
                            </thead>
                            <tbody>
                                {teamStats.map((stat, idx) => (
                                    <tr key={stat.team.id} className="group hover:bg-white/[0.02] transition-colors">
                                        <td className={`${tdBase} text-white/30 bg-white/[0.02]`}>{idx + 1}</td>
                                        <td className="py-2 flex items-center justify-center border-b border-white/5 group-last:border-0">
                                            <SubtleDashboardAvatar team={stat.team} />
                                        </td>
                                        <td className={`${tdBase} text-slate-300`}>{stat.gamesPlayed}</td>
                                        <td className={`${tdBase} text-slate-300`}>{stat.wins}</td>
                                        <td className={`${tdBase} text-slate-300`}>{stat.draws}</td>
                                        <td className={`${tdBase} text-slate-300`}>{stat.losses}</td>
                                        <td className={`${tdBase} text-slate-300`}>{stat.goalsFor}</td>
                                        <td className={`${tdBase} text-slate-300`}>{stat.goalsAgainst}</td>
                                        <td className={`${tdBase} text-white/40`}>{stat.goalDifference > 0 ? `+${stat.goalDifference}` : stat.goalDifference}</td>
                                        <td className={`${tdBase} text-[14px] font-black text-[#FFD700] bg-white/[0.03]`}>{stat.points}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                     </div>
                </div>
            </div>
        </div>
    );
};
