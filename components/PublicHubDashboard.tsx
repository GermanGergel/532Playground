import React, { useMemo } from 'react';
import { useApp } from '../context';
import { calculateAllStats } from '../services/statistics';
import { TeamAvatar } from './avatars';
import { useTranslation } from '../ui';
import { BarChartDynamic } from '../icons';
import { Team } from '../types';

const SubtleDashboardAvatar: React.FC<{ team: Partial<Team>, size?: 'xxs' | 'xs' | 'sm', isLight?: boolean }> = ({ team, size = 'xxs', isLight }) => (
    <div className="opacity-80 hover:opacity-100 transition-opacity">
        <TeamAvatar team={team} size={size} isLight={isLight} hollow={true} />
    </div>
);

export const PublicHubDashboard: React.FC = () => {
    const { activeSession, history } = useApp();
    const t = useTranslation();

    // Use active session or latest from history
    const targetSession = activeSession || (history.length > 0 ? history[0] : null);

    const { teamStats } = useMemo(() => {
        if (!targetSession) return { teamStats: [], allPlayersStats: [] };
        return calculateAllStats(targetSession);
    }, [targetSession]);

    if (!targetSession) {
        return (
            <div className="h-full flex flex-col items-center justify-center opacity-30">
                <BarChartDynamic className="w-16 h-16 mb-4" />
                <span className="font-orbitron text-lg uppercase tracking-widest">NO DATA FEED</span>
            </div>
        );
    }

    return (
        <div className="h-full overflow-y-auto custom-hub-scrollbar p-4 md:p-8">
            <div className="w-full max-w-4xl mx-auto">
                <div className="flex items-center justify-between mb-4 px-2">
                    <h3 className="font-russo text-xl uppercase tracking-wider text-white">
                        {targetSession.sessionName || 'LATEST SESSION'}
                    </h3>
                    <span className="font-mono text-[10px] text-[#00F2FE] border border-[#00F2FE]/30 px-2 py-1 rounded bg-[#00F2FE]/5">
                        {new Date(targetSession.date).toLocaleDateString()}
                    </span>
                </div>

                <div className="relative overflow-hidden rounded-2xl bg-[#0a0c10] border border-white/10 shadow-2xl">
                    <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent pointer-events-none"></div>
                    
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-white/10 bg-white/5 text-[9px] font-black tracking-widest text-white/40 uppercase">
                                <th className="py-3 text-center w-[5%]">#</th>
                                <th className="py-3 text-center w-[30%]">{t.team}</th>
                                <th className="py-3 text-center w-[7%]">{t.thP}</th>
                                <th className="py-3 text-center w-[7%]">{t.thW}</th>
                                <th className="py-3 text-center w-[7%]">{t.thD}</th>
                                <th className="py-3 text-center w-[7%]">{t.thL}</th>
                                <th className="py-3 text-center w-[9%]">{t.thGF}</th>
                                <th className="py-3 text-center w-[9%]">{t.thGA}</th>
                                <th className="py-3 text-center w-[9%]">{t.thGD}</th>
                                <th className="py-3 text-center w-[10%] text-white">{t.thPts}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {teamStats.map((stat, idx) => (
                                <tr key={stat.team.id} className="group border-b border-white/5 last:border-0 transition-all duration-300 hover:bg-white/[0.02]">
                                    <td className="py-3 text-center text-[10px] font-bold text-white/30 relative overflow-hidden">{idx + 1}</td>
                                    <td className="py-3 align-middle">
                                        <div className="flex justify-center items-center w-full">
                                            <SubtleDashboardAvatar team={stat.team} size="xxs" isLight />
                                        </div>
                                    </td>
                                    <td className="py-3 text-center text-[11px] font-bold text-slate-300">{stat.gamesPlayed}</td>
                                    <td className="py-3 text-center text-[11px] font-bold text-slate-300">{stat.wins}</td>
                                    <td className="py-3 text-center text-[11px] font-bold text-slate-300">{stat.draws}</td>
                                    <td className="py-3 text-center text-[11px] font-bold text-slate-300">{stat.losses}</td>
                                    <td className="py-3 text-center text-[11px] font-bold text-slate-300">{stat.goalsFor}</td>
                                    <td className="py-3 text-center text-[11px] font-bold text-slate-300">{stat.goalsAgainst}</td>
                                    <td className={`py-3 text-center text-[11px] font-bold ${stat.goalDifference > 0 ? 'text-green-400' : stat.goalDifference < 0 ? 'text-red-400' : 'text-white/40'}`}>
                                        {stat.goalDifference > 0 ? `+${stat.goalDifference}` : stat.goalDifference}
                                    </td>
                                    <td className="py-3 text-center text-[14px] font-black text-white bg-white/[0.03]">{stat.points}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};