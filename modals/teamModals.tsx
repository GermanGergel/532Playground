import React from 'react';

// --- TEAM COLOR PICKER MODAL ---
interface TeamColorPickerModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelectColor: (color: string) => void;
    currentColor: string;
    usedColors: string[];
}
const PALETTE = ['#2ECC40', '#0074D9', '#FF851B', '#FFDC00', '#FF4136'];
export const TeamColorPickerModal: React.FC<TeamColorPickerModalProps> = ({ isOpen, onClose, onSelectColor, currentColor, usedColors }) => {
    // Filter to show only the current color and other unused colors
    const availableColors = PALETTE.filter(color => color === currentColor || !usedColors.includes(color));

    if (!isOpen) return null;
    
    return (
        <div 
            className="fixed inset-0 bg-black/70 flex justify-center items-center z-50"
            onClick={onClose}
        >
            <div 
                className="bg-dark-surface/80 backdrop-blur-xl rounded-2xl p-4 border border-white/10"
                onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside
            >
                <div className="flex justify-center items-center gap-4">
                    {availableColors.map(color => (
                        <button
                            key={color}
                            onClick={() => {
                                onSelectColor(color);
                                onClose(); // Close on select
                            }}
                            className={`w-12 h-12 rounded-full transition-transform transform hover:scale-110 focus:outline-none ${currentColor === color ? 'ring-4 ring-white ring-offset-2 ring-offset-dark-surface' : ''}`}
                            style={{ backgroundColor: color }}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
};
