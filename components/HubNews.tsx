
import React from 'react';
import { useApp } from '../context';
import { StarIcon, BarChartDynamic } from '../icons';

export const HubNews: React.FC = () => {
    const { newsFeed } = useApp();

    return (
        <div className="h-full flex flex-col">
            <div className="mb-6 flex justify-between items-end">
                <h4 className="font-audiowide text-[10px] text-[#FF00D6] tracking-[0.3em] uppercase">Intelligence Feed</h4>
                <span className="font-mono text-[9px] text-white/30 uppercase">Global Distribution</span>
            </div>

            <div className="flex-grow overflow-y-auto pr-2 custom-scrollbar space-y-3">
                {newsFeed.map((news) => (
                    <div 
                        key={news.id} 
                        className="group relative flex items-start gap-4 p-4 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-[#FF00D6]/30 transition-all duration-300"
                    >
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border border-white/5 ${news.isHot ? 'bg-[#FF00D6]/10 text-[#FF00D6]' : 'bg-white/5 text-white/40'}`}>
                            {news.type === 'tier_up' ? <BarChartDynamic className="w-5 h-5" /> : <StarIcon className="w-5 h-5" />}
                        </div>
                        
                        <div className="flex-grow min-w-0">
                            <div className="flex justify-between items-start mb-1">
                                <h5 className="font-chakra font-black text-xs text-white uppercase tracking-tight truncate group-hover:text-[#FF00D6] transition-colors">
                                    {news.playerName}
                                </h5>
                                <span className="font-mono text-[7px] text-white/20 ml-2">
                                    {new Date(news.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                            </div>
                            <p className="font-chakra text-[11px] text-white/50 leading-snug line-clamp-2">
                                {news.message.replace(news.playerName, '').trim() || news.subMessage}
                            </p>
                            <div className="mt-2 flex items-center gap-2">
                                <span className="text-[7px] font-black text-[#FF00D6] tracking-widest uppercase border border-[#FF00D6]/30 px-1.5 py-0.5 rounded bg-[#FF00D6]/5">
                                    {news.type.replace('_', ' ')}
                                </span>
                                {news.isHot && (
                                    <span className="text-[7px] font-black text-white tracking-widest uppercase bg-red-500 px-1.5 py-0.5 rounded animate-pulse">
                                        TRENDING
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                ))}

                {newsFeed.length === 0 && (
                    <div className="h-full flex items-center justify-center opacity-20">
                        <span className="font-orbitron text-[8px] uppercase tracking-[1em]">Quiet sector</span>
                    </div>
                )}
            </div>
        </div>
    );
};
