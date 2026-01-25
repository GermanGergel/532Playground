
import React from 'react';

export const newId = () => Math.random().toString(36).slice(2, 9);

export const hexToRgba = (hex: string, alpha: number) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

// UPDATED: Subtle dark turquoise metallic gradient for "UNIT" brand identity
export const BrandedHeader: React.FC<{className?: string; isExport?: boolean; short?: boolean}> = ({ className, isExport }) => (
    React.createElement('header', { className: `text-center ${className} ${isExport ? '-mt-4' : ''}` },
        React.createElement('h1', { 
            className: `text-5xl font-black uppercase leading-none font-russo tracking-[0.2em]`, 
            style: { 
                background: 'linear-gradient(180deg, #155e75 0%, #083344 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                opacity: 0.85,
                filter: `
                    drop-shadow(0 1px 3px rgba(0, 0, 0, 0.4))
                `,
            } 
        }, "UNIT")
    )
);
