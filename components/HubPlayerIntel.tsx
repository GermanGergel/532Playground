
import React from 'react';
import { useApp } from '../context';
import { useTranslation } from '../ui';
import { History as HistoryIcon, StarIcon, TrophyIcon } from '../icons';
import { PlayerAvatar } from './avatars';

// Local components for HubPlayerIntel
const BentoBox: React.FC<{ children: React.ReactNode, className?: string, contentClassName?: string }> = ({ children, className = "", contentClassName = "" }) => (
    <div className={`relative overflow-hidden rounded-3xl bg-white/[0.03] border border-white/10 shadow-lg flex flex-col ${className}`}>
        <div className={`relative z-10 p-4 ${contentClassName}`}>
            {children}
        </div>
    </div>
);

const IntelHeader: React.FC<{ title: string, icon: any, accent?: string }> = ({ title, icon: Icon, accent = "#00F2FE" }) => (
    <div className="flex items-center gap-2 mb-4">
        <Icon className="w-4 h-4" style={{ color: accent }} />
        <h4 className="font-russo text-xs uppercase tracking-widest text-white/80">{title}</h4>
    </div>
);

const TerminalStat: React.FC<{ label: string, value: string | number, size?: string, color?: string }> = ({ label, value, size = "text-xl", color = "#00F2FE" }) => (
    <div className="flex flex-col items-center">
        <span className={`font-russo ${size} leading-none`} style={{ color }}>{value}</span>
        <span className="text-[8px] font-bold text-white/40 uppercase tracking-wider mt-1">{label}</span>
    </div>
);

interface HubPlayerIntelProps {
    playerId: string | null;
    isEmbedded?: boolean;
    onBack: () => void;
}

export const HubPlayerIntel: React.FC<HubPlayerIntelProps> = ({ playerId }) => {
    const { allPlayers } = useApp();
    const t = useTranslation();
    const player = allPlayers.find(p => p.id === playerId);

    if (!player) return <div className="h-full flex items-center justify-center text-white/30 text-xs font-bold uppercase tracking-widest">Select a player</div>;

    const winRate = player.totalGames > 0 ? `${Math.round((player.totalWins / player.totalGames) * 100)}%` : '0%';
    const goalsPerSession = player.totalSessionsPlayed > 0 ? (player.totalGoals / player.totalSessionsPlayed).toFixed(2) : '0.00';
    const assistsPerSession = player.totalSessionsPlayed > 0 ? (player.totalAssists / player.totalSessionsPlayed).toFixed(2) : '0.00';
    
    const safeRecords = {
        bestGoalsInSession: player.records?.bestGoalsInSession || { value: 0, sessionId: '' },
        bestAssistsInSession: player.records?.bestAssistsInSession || { value: 0, sessionId: '' },
        bestWinRateInSession: player.records?.bestWinRateInSession || { value: 0, sessionId: '' },
    };

    return (
        <div className="h-full w-full p-6 overflow-y-auto custom-hub-scrollbar">
            <div className="flex flex-col gap-6">
                {/* Header */}
                <div className="flex items-center gap-6">
                    <PlayerAvatar player={player} size="xl" className="w-24 h-24 shadow-2xl border-2 border-white/10" />
                    <div className="flex flex-col">
                        <h1 className="font-russo text-3xl uppercase text-white leading-none">{player.nickname}</h1>
                        <span className="font-chakra text-sm font-bold text-white/40 uppercase tracking-[0.2em]">{player.surname || 'NO SURNAME'}</span>
                        <div className="flex items-center gap-3 mt-3">
                            <div className="px-3 py-1 rounded-full bg-[#00F2FE]/10 border border-[#00F2FE]/30 text-[#00F2FE] text-[10px] font-black uppercase tracking-wider">
                                OVR {player.rating}
                            </div>
                            <div className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-white/60 text-[10px] font-black uppercase tracking-wider">
                                {player.tier}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <BentoBox className="h-full" contentClassName="h-full">
                        <IntelHeader title={t?.allTimeStats} icon={HistoryIcon} />
                        <div className="grid grid-cols-2 gap-y-6 pt-2">
                            <TerminalStat size="text-2xl" label={t?.thSessions} value={player.totalSessionsPlayed} />
                            <TerminalStat size="text-2xl" label={t?.winRate} value={winRate} color="#fff" />
                            <TerminalStat size="text-2xl" label={t?.thG} value={player.totalGoals} />
                            <TerminalStat size="text-2xl" label={t?.thA} value={player.totalAssists} />
                        </div>
                    </BentoBox>
                    
                    <BentoBox className="h-full" contentClassName="h-full flex flex-col">
                        <IntelHeader title={t?.careerStats || "CAREER AVERAGES"} icon={StarIcon} accent="#FFD700" />
                        <div className="flex-grow flex flex-col justify-center">
                            <div className="grid grid-cols-2 gap-2 items-center justify-items-center h-full">
                                <TerminalStat size="text-2xl" label={t?.goalsPerSession} value={goalsPerSession} color="#fff" />
                                <TerminalStat size="text-2xl" label={t?.assistsPerSession} value={assistsPerSession} color="#fff" />
                            </div>
                        </div>
                    </BentoBox>
                    
                    <BentoBox className="h-full" contentClassName="h-full flex flex-col">
                        <IntelHeader title={t?.bestSessionTitle} icon={TrophyIcon} accent="#FFD700" />
                        <div className="flex-grow flex flex-col justify-center">
                            <div className="grid grid-cols-3 gap-1 items-center justify-items-center h-full">
                                <TerminalStat size="text-2xl" label="G" value={safeRecords.bestGoalsInSession?.value || 0} />
                                <TerminalStat size="text-2xl" label="A" value={safeRecords.bestAssistsInSession?.value || 0} />
                                <TerminalStat size="text-xl" label="Win%" value={`${safeRecords.bestWinRateInSession?.value || 0}%`} color="#fff" />
                            </div>
                        </div>
                    </BentoBox>
                </div>
            </div>
        </div>
    );
};
