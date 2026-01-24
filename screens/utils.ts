
import React from 'react';

export const newId = () => Math.random().toString(36).slice(2, 9);

export const hexToRgba = (hex: string, alpha: number) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

// UPDATED: Now uses a muted turquoise metallic gradient
export const BrandedHeader: React.FC<{className?: string; isExport?: boolean}> = ({ className, isExport }) => (
    React.createElement('header', { className: `text-center ${className} ${isExport ? '-mt-4' : ''}` },
        React.createElement('h1', { 
            className: `text-6xl font-black uppercase leading-none font-russo tracking-[0.15em]`, 
            style: { 
                // Muted Turquoise Metal Gradient
                background: 'linear-gradient(180deg, #48CFCB 0%, #083344 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                filter: `
                    drop-shadow(1px 1px 0px #0E7490) 
                    drop-shadow(2px 2px 0px #000000) 
                    drop-shadow(4px 10px 15px rgba(0, 0, 0, 0.8))
                `,
            } 
        }, "UNIT")
    )
);
