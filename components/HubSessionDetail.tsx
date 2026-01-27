import React, { useMemo } from 'react';
import { Session, Team } from '../types';
import { calculateAllStats } from '../services/statistics';
import { TeamAvatar } from './avatars';
import { ChevronLeft } from '../icons';
import { useTranslation } from '../ui';

interface HubSessionDetailProps {
    session: Session;
    isEmbedded?: boolean;
    onBack: () => void;
}

const SubtleDashboardAvatar: React.FC<{ team: Partial<Team>, size?: 'xxs' | 'xs' | 'sm', isLight?: boolean }> = ({ team, size = 'xxs', isLight }) => (
    <div className="opacity-80 hover:opacity-100 transition-opacity">
        <TeamAvatar team={team} size={size} isLight={isLight} hollow={true} />
    </div>
);

export const HubSessionDetail: React.FC<HubSessionDetailProps> = ({ session, isEmbedded, onBack }) => {
    const t = useTranslation();
    const { teamStats } = useMemo(() => calculateAllStats(session), [session]);

    const tdBase = "py-3 text-center text-[11px] font-bold";

    return (
        <div className="h-full flex flex-col">
            {!isEmbedded && (
                <div className="flex items-center gap-4 p-4 border-b border-white/10 bg-[#0a0c10]">
                    <button onClick={onBack} className="p-2 rounded-full bg-white/5 hover:bg-white/10 text-white">
                        <ChevronLeft className="w-5 h-5" />
                    </button>
                    <div>
                        <h2 className="text-lg font-bold text-white uppercase tracking-wider">{session.sessionName}</h2>
                        <span className="text-xs text-white/50">{new Date(session.date).toLocaleDateString()}</span>
                    </div>
                </div>
            )}

            <div className="flex-grow overflow-y-auto custom-hub-scrollbar p-4 md:p-8">
                <div className="max-w-4xl mx-auto space-y-8">
                    
                    {/* STANDINGS */}
                    <div className="rounded-2xl bg-[#0a0c10] border border-white/10 overflow-hidden shadow-2xl">
                        <div className="bg-white/5 px-4 py-3 border-b border-white/10 flex justify-between items-center">
                            <h3 className="text-xs font-black uppercase tracking-widest text-white/70">{t.teamStandings}</h3>
                        </div>
                        <table className="w-full border-collapse">
                            <thead>
                                <tr className="border-b border-white/10 bg-black/20 text-[9px] font-black tracking-widest text-white/30 uppercase">
                                    <th className="py-2 w-[6%] text-center">#</th>
                                    <th className="py-2 w-[26%] text-center">{t.team}</th>
                                    <th className="py-2 w-[7%] text-center">{t.thP}</th>
                                    <th className="py-2 w-[7%] text-center">{t.thW}</th>
                                    <th className="py-2 w-[7%] text-center">{t.thD}</th>
                                    <th className="py-2 w-[7%] text-center">{t.thL}</th>
                                    <th className="py-2 w-[10%] text-center">{t.thGF}</th>
                                    <th className="py-2 w-[10%] text-center">{t.thGA}</th>
                                    <th className="py-2 w-[10%] text-center">{t.thGD}</th>
                                    <th className="py-2 w-[10%] text-center text-white">{t.thPts}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {teamStats.map((stat, idx) => (
                                    <tr key={stat.team.id} className="group border-b border-white/5 last:border-0 transition-all duration-300 hover:bg-white/[0.02]">
                                        <td className={`${tdBase} text-white/30 bg-white/[0.02]`}>{idx + 1}</td>
                                        <td className="w-[26%] py-1.5 align-middle">
                                            <div className="flex justify-center items-center w-full">
                                                <SubtleDashboardAvatar team={stat.team} size="xxs" isLight={true} />
                                            </div>
                                        </td>
                                        <td className={`${tdBase} text-slate-300`}>{stat.gamesPlayed}</td>
                                        <td className={`${tdBase} text-slate-300`}>{stat.wins}</td>
                                        <td className={`${tdBase} text-slate-300`}>{stat.draws}</td>
                                        <td className={`${tdBase} text-slate-300`}>{stat.losses}</td>
                                        <td className={`${tdBase} text-slate-300`}>{stat.goalsFor}</td>
                                        <td className={`${tdBase} text-slate-300`}>{stat.goalsAgainst}</td>
                                        <td className={`${tdBase} ${stat.goalDifference > 0 ? 'text-green-400' : stat.goalDifference < 0 ? 'text-red-400' : 'text-white/40'}`}>
                                            {stat.goalDifference > 0 ? `+${stat.goalDifference}` : stat.goalDifference}
                                        </td>
                                        <td className={`${tdBase} text-[12px] font-black text-white bg-white/[0.03]`}>{stat.points}</td>
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