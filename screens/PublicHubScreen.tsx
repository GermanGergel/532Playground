
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context';
import { Player, PlayerStatus } from '../types';
import { TrophyIcon, Users, WhatsApp, BarChartDynamic, StarIcon, ChevronLeft, Zap } from '../icons';
import { PlayerAvatar } from '../components/avatars';

// --- SUB-COMPONENTS ---

const CinematicBackground: React.FC = () => {
    return (
        <div className="fixed inset-0 z-0 bg-[#0a0c10] pointer-events-none overflow-hidden">
            {/* TOP: Cinematic Line & Glow */}
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#00F2FE] to-transparent opacity-100 z-50"></div>
            <div className="absolute top-0 left-0 right-0 h-96 bg-gradient-to-b from-[#00F2FE]/10 to-transparent blur-[120px] opacity-40"></div>
            
            {/* BOTTOM: Cinematic Line & Glow (Pinned) */}
            <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#00F2FE] to-transparent opacity-100 z-50"></div>
            <div className="absolute bottom-0 left-0 right-0 h-96 bg-gradient-to-t from-[#00F2FE]/10 to-transparent blur-[120px] opacity-40"></div>

            {/* Accent light blobs for depth */}
            <div className="absolute top-[20%] left-[-10%] w-[40%] h-[40%] rounded-full bg-[#00F2FE]/5 blur-[120px]"></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-[#4CFF5F]/5 blur-[120px]"></div>
        </div>
    );
};

const FloatingNav: React.FC<{ onBack: () => void }> = ({ onBack }) => {
    return (
        <nav className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex items-center justify-between w-[97%] px-8 py-2.5 bg-[#0a0c10]/80 backdrop-blur-xl border border-[#1e293b] rounded-2xl shadow-[0_15px_40px_rgba(0,0,0,0.7)]">
            <div className="flex items-center gap-8">
                <button onClick={onBack} className="group p-1.5 bg-white/5 rounded-xl border border-white/10 hover:border-[#00F2FE] hover:bg-[#00F2FE]/10 transition-all">
                    <ChevronLeft className="w-5 h-5 text-white group-hover:text-[#00F2FE]" />
                </button>
                <div className="flex items-baseline gap-3">
                    <span className="font-black text-3xl text-white tracking-tighter">532</span>
                    <div className="h-4 w-px bg-white/20"></div>
                    <span className="font-bold text-[10px] tracking-[0.4em] text-[#00F2FE] uppercase">Command Center</span>
                </div>
            </div>
            
            <div className="hidden xl:flex gap-12 items-center">
                {['Analytics', 'Deployment', 'Hall of Fame', 'Network'].map((item, i) => (
                    <span key={item} className={`text-[10px] font-black tracking-[0.3em] uppercase cursor-pointer transition-all hover:text-white ${i === 0 ? 'text-[#00F2FE]' : 'text-white/30'}`}>
                        {item}
                    </span>
                ))}
            </div>

            <div className="flex items-center gap-4">
                 <div className="flex flex-col items-end">
                    <span className="text-[8px] font-mono text-[#4CFF5F] animate-pulse tracking-widest">UPLINK_STABLE</span>
                    <span className="text-[10px] font-black text-white/30 tracking-widest uppercase">Node: DN_CENTRAL</span>
                 </div>
            </div>
        </nav>
    );
};

const HeroTitle: React.FC = () => {
    return (
        <div className="text-center mt-48 mb-32 relative">
            <div className="inline-block relative">
                <span className="block text-xs font-black tracking-[1.5em] text-[#00F2FE] uppercase mb-6 opacity-60">High Performance Ecosystem</span>
                <h1 className="font-russo text-7xl md:text-[10rem] text-white leading-none uppercase tracking-tighter drop-shadow-2xl">
                    CLUB <span className="text-transparent bg-clip-text bg-gradient-to-b from-white to-white/10">OPERATIONS</span>
                </h1>
                <div className="mt-12 h-px w-64 bg-[#00F2FE] mx-auto shadow-[0_0_20px_#00F2FE]"></div>
            </div>
        </div>
    );
};

const CinematicCard: React.FC<{ player: Player, rank: number }> = ({ player, rank }) => {
    const isFirst = rank === 1;
    const accent = isFirst ? '#FFD700' : rank === 2 ? '#C0C0C0' : '#CD7F32';
    
    return (
        <div className={`relative flex flex-col items-center group transition-all duration-700 ${isFirst ? 'scale-110 z-20' : 'scale-100 z-10 opacity-80 hover:opacity-100'}`}>
            <div className={`relative ${isFirst ? 'w-[320px] h-[440px]' : 'w-[260px] h-[360px] mt-12'} bg-[#0a0c10] border border-[#1e293b] rounded-[2.5rem] shadow-2xl flex flex-col items-center justify-center p-10 overflow-hidden group-hover:border-[#00F2FE]/50 transition-all`}>
                
                <div className="absolute top-0 left-0 w-px h-full bg-gradient-to-b from-transparent via-[#1e293b] to-transparent opacity-50"></div>
                <div className="absolute top-0 right-0 w-px h-full bg-gradient-to-b from-transparent via-[#1e293b] to-transparent opacity-50"></div>

                <div className="absolute top-8 left-1/2 -translate-x-1/2 px-6 py-1.5 rounded-full bg-white/5 border border-white/10">
                    <span className="text-xs font-black font-orbitron tracking-widest" style={{ color: accent }}>RANK #{rank}</span>
                </div>

                <div className="mb-8 transform transition-transform group-hover:scale-110 duration-500">
                    <PlayerAvatar player={player} size={isFirst ? "xl" : "lg"} />
                </div>
                
                <div className="w-full text-center">
                    <h4 className="font-russo text-3xl text-white truncate uppercase tracking-wider mb-3">{player.nickname}</h4>
                    <div className="inline-flex items-center gap-4 px-6 py-3 bg-white/[0.03] rounded-2xl border border-white/5">
                        <span className="text-[10px] font-black text-white/30 tracking-[0.3em]">OVR</span>
                        <span className="text-4xl font-black text-[#00F2FE]" style={{ textShadow: '0 0 20px rgba(0,242,254,0.5)' }}>{player.rating}</span>
                    </div>
                </div>

                <div className={`absolute bottom-0 left-0 right-0 h-1.5 bg-gradient-to-r from-transparent via-${isFirst ? '[#FFD700]' : '[#00F2FE]'} to-transparent opacity-40`} />
            </div>
            
            <div className="mt-8 flex items-center gap-4">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: accent, boxShadow: `0 0 15px ${accent}` }}></div>
                <span className="text-xs font-black text-white/40 tracking-[0.5em] uppercase">{player.tier}</span>
            </div>
        </div>
    );
};

const MetricWidget: React.FC<{ label: string, value: number, color: string, icon: React.FC<any> }> = ({ label, value, color, icon: Icon }) => {
    return (
        <div className="relative group overflow-hidden bg-[#0a0c10] border border-[#1e293b] rounded-[2.5rem] p-10 transition-all hover:border-[#00F2FE]/40 shadow-2xl flex-1">
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#1e293b] to-transparent opacity-50"></div>
            
            <div className="flex items-center justify-between mb-8">
                <div className="p-4 bg-white/5 rounded-2xl border border-white/10 group-hover:border-[#00F2FE]/30 transition-all">
                    <Icon className="w-8 h-8" style={{ color }} />
                </div>
                <span className="text-xs font-mono text-white/10 tracking-widest">DATA_POINT_REF_{Math.floor(Math.random()*9999)}</span>
            </div>

            <div className="flex flex-col">
                <span className="text-8xl font-black text-white tracking-tighter mb-4 group-hover:text-[#00F2FE] transition-colors tabular-nums">{value}</span>
                <span className="text-sm font-black text-white/30 tracking-[0.5em] uppercase">{label}</span>
            </div>

            {/* Background Icon Watermark */}
            <div className="absolute bottom-[-30px] right-[-30px] opacity-[0.03] transform -rotate-12">
                <Icon className="w-48 h-48 text-white" />
            </div>
        </div>
    );
};

// --- MAIN SCREEN ---

export const PublicHubScreen: React.FC = () => {
    const navigate = useNavigate();
    const { allPlayers } = useApp();
    
    const stats = useMemo(() => {
        const confirmed = allPlayers.filter(p => p.status === PlayerStatus.Confirmed);
        const sorted = [...confirmed].sort((a, b) => b.rating - a.rating);
        return {
            top: sorted.slice(0, 3),
            totalGoals: sorted.reduce((acc, p) => acc + (p.totalGoals || 0), 0),
            totalAssists: sorted.reduce((acc, p) => acc + (p.totalAssists || 0), 0),
            totalCount: confirmed.length
        };
    }, [allPlayers]);

    return (
        <div className="min-h-screen text-white relative selection:bg-[#00F2FE] selection:text-black overflow-x-hidden">
            <CinematicBackground />
            <FloatingNav onBack={() => navigate('/')} />

            <div className="relative z-10 w-full px-12 pb-40">
                <HeroTitle />

                {/* PODIUM SECTION - Full Width Distribution */}
                <div className="flex flex-wrap items-end justify-center gap-20 mb-48 w-full">
                    {stats.top[1] && <CinematicCard player={stats.top[1]} rank={2} />}
                    {stats.top[0] && <CinematicCard player={stats.top[0]} rank={1} />}
                    {stats.top[2] && <CinematicCard player={stats.top[2]} rank={3} />}
                </div>

                {/* METRICS SECTION - Stretching grid */}
                <div className="mb-48">
                    <div className="flex items-center gap-10 mb-16 px-4">
                        <Zap className="w-6 h-6 text-[#00F2FE] animate-pulse" />
                        <h3 className="text-sm font-black tracking-[0.8em] text-white/40 uppercase">Strategic Deployment Metrics</h3>
                        <div className="flex-grow h-px bg-gradient-to-r from-[#1e293b] via-transparent to-transparent"></div>
                    </div>
                    
                    <div className="flex flex-col lg:flex-row gap-10 w-full">
                        <MetricWidget label="Elite Personnel" value={stats.totalCount} color="#00F2FE" icon={Users} />
                        <MetricWidget label="Offensive Strikes" value={stats.totalGoals} color="#4CFF5F" icon={TrophyIcon} />
                        <MetricWidget label="Tactical Support" value={stats.totalAssists} color="#FFD700" icon={BarChartDynamic} />
                    </div>
                </div>

                {/* CTA / FOOTER - Wide Panel */}
                <div className="relative overflow-hidden rounded-[4rem] bg-[#0a0c10] border border-[#1e293b] p-20 md:p-32 text-center shadow-2xl w-full">
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[1px] bg-gradient-to-r from-transparent via-[#00F2FE]/50 to-transparent"></div>
                    
                    <h2 className="font-russo text-6xl md:text-9xl mb-10 uppercase tracking-tighter">Ready to Deploy?</h2>
                    <p className="text-base md:text-2xl text-white/30 mb-20 uppercase tracking-[0.6em] max-w-4xl mx-auto leading-relaxed">
                        Secure your position in the high-performance futsal community of Da Nang
                    </p>
                    
                    <div className="flex flex-col md:flex-row justify-center gap-12">
                        <a 
                            href="https://chat.whatsapp.com/CAJnChuM4lQFf3s2YUnhQr" 
                            target="_blank" 
                            rel="noreferrer"
                            className="group relative inline-flex items-center justify-center gap-8 bg-[#00F2FE] px-24 py-8 rounded-[2rem] shadow-[0_0_50px_rgba(0,242,254,0.3)] transition-all hover:scale-105 active:scale-95 overflow-hidden"
                        >
                            <WhatsApp className="w-10 h-10 fill-current text-black" />
                            <span className="font-black text-2xl text-black tracking-[0.2em]">JOIN THE SQUAD</span>
                        </a>
                        
                        <button 
                            className="px-24 py-8 rounded-[2rem] border border-[#1e293b] bg-white/5 hover:bg-[#00F2FE]/10 hover:border-[#00F2FE]/50 transition-all text-2xl font-black tracking-[0.2em] text-white/60 hover:text-white"
                        >
                            ACCESS PROTOCOL
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
