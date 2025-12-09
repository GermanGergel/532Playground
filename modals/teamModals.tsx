import React from 'react';
import { Modal } from '../ui';

// --- TEAM COLOR PICKER MODAL (Minimalist Design) ---
interface TeamColorPickerModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelectColor: (color: string) => void;
    currentColor: string;
    usedColors: string[];
}
const PALETTE = ['#2ECC40', '#0074D9', '#FF851B', '#FFDC00', '#FF4136'];

export const TeamColorPickerModal: React.FC<TeamColorPickerModalProps> = ({ isOpen, onClose, onSelectColor, currentColor, usedColors }) => {
    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            size="xs"
            // Minimalist styling: compact padding, no title, no close button.
            containerClassName="!p-4 border border-dark-accent-start/30 shadow-[0_0_20px_rgba(0,242,254,0.15)] bg-dark-surface/90 backdrop-blur-xl rounded-2xl"
            hideCloseButton={true}
        >
            {/* The content is just the row of colors. */}
            <div className="flex justify-center items-center gap-4">
                {PALETTE.map((color) => {
                    const isUsed = usedColors.includes(color) && color !== currentColor;
                    return (
                        <button
                            key={color}
                            disabled={isUsed}
                            // onSelectColor is connected to a handler that also closes the modal.
                            onClick={() => onSelectColor(color)}
                            className="w-10 h-10 rounded-full transition-all duration-200 transform hover:scale-110 active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed"
                            style={{
                                backgroundColor: color,
                                border: currentColor === color ? '3px solid white' : '3px solid transparent',
                                boxShadow: `0 0 12px ${color}`
                            }}
                        />
                    );
                })}
            </div>
        </Modal>
    );
};