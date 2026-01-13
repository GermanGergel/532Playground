
import React from 'react';
import { Session } from '../types';
import { ShareableReport } from '../screens/StatisticsScreen';
import { ChevronLeft, YouTubeIcon } from '../icons';
import { useTranslation } from '../ui';

interface HubSessionDetailProps {
    session: Session;
    isEmbedded?: boolean;
    onBack: () => void;
}

export const HubSessionDetail: React.FC<HubSessionDetailProps> = ({ session, isEmbedded, onBack }) => {
    const videoLink = session.videoUrl;

    return (
        <div className={`h-full w-full flex flex-col ${!isEmbedded ? 'p-6' : ''}`}>
            {!isEmbedded && (
                <div className="flex items-center gap-4 mb-6 shrink-0">
                    <button onClick={onBack} className="p-2 rounded-full bg-white/5 hover:bg-white/10 transition-colors">
                        <ChevronLeft className="w-6 h-6 text-white" />
                    </button>
                    <h2 className="font-russo text-2xl uppercase tracking-widest text-white">{session.sessionName}</h2>
                </div>
            )}
            
            <div className="flex-grow overflow-y-auto custom-hub-scrollbar px-1 md:px-4 pb-20">
                 {/* Video Link Section */}
                 {videoLink && (
                    <div className="mb-6 flex justify-center">
                        <button 
                            onClick={() => window.open(videoLink, '_blank')}
                            className="flex items-center gap-3 px-6 py-3 rounded-2xl bg-red-600/10 border border-red-600/30 hover:bg-red-600/20 transition-all group shadow-[0_0_20px_rgba(220,38,38,0.2)]"
                        >
                            <YouTubeIcon className="w-6 h-6 text-red-500 group-hover:text-red-400 drop-shadow-[0_0_5px_rgba(220,38,38,0.5)]" />
                            <span className="font-chakra font-bold text-sm text-white uppercase tracking-wider">Watch Match Replay</span>
                        </button>
                    </div>
                 )}

                 <div className="max-w-4xl mx-auto">
                    {/* Reuse the shareable report component but purely for display here */}
                    <ShareableReport session={session} isExport={true} />
                 </div>
            </div>
        </div>
    );
};
