
import React from 'react';
import { TOTMBadgeIcon } from '../icons';

interface HubTOTMButtonProps {
    onClick: () => void;
    isActive: boolean;
}

export const HubTOTMButton: React.FC<HubTOTMButtonProps> = ({ onClick, isActive }) => {
    return (
        <button 
            onClick={onClick}
            className={`flex flex-col items-center justify-center gap-1 transition-all duration-300 h-full min-w-[50px] group cursor-pointer hover:scale-110`}
        >
            <div className={`w-8 h-8 rounded-full border flex items-center justify-center transition-all duration-300 
                ${isActive 
                    ? 'text-[#FFD700] border-[#FFD700] bg-[#FFD700]/10 shadow-[0_0_15px_rgba(255,215,0,0.5),inset_0_0_6px_rgba(255,215,0,0.2)]' 
                    : 'text-white/60 border-white/20 shadow-[0_0_10px_rgba(255,255,255,0.2)] hover:border-[#FFD700]/40 hover:text-white hover:shadow-[0_0_15px_rgba(255,215,0,0.3)]'
                }`}>
                <TOTMBadgeIcon className="w-4 h-4" />
            </div>
            <span className={`text-[6px] font-black tracking-widest uppercase transition-colors ${isActive ? 'text-[#FFD700]' : 'text-white/30 group-hover:text-white/60'}`}>
                TOTM
            </span>
        </button>
    );
};
