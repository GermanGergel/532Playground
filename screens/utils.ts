
import React from 'react';

export const newId = () => Math.random().toString(36).slice(2, 9);

export const hexToRgba = (hex: string, alpha: number) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

// UPDATED: Standardized "UNIT" style with white-to-faded gradient as per Club Hub "Define Your" style
export const BrandedHeader: React.FC<{className?: string; isExport?: boolean; short?: boolean}> = ({ className, isExport }) => (
    React.createElement('header', { className: `text-center ${className} ${isExport ? '-mt-4' : ''}` },
        React.createElement('h1', { 
            className: `text-5xl font-black uppercase leading-none font-russo tracking-[0.2em]`, 
            style: { 
                // Unified Style: White to White/20 Gradient
                background: 'linear-gradient(180deg, #FFFFFF 0%, rgba(255, 255, 255, 0.2) 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                filter: `
                    drop-shadow(4px 10px 15px rgba(0, 0, 0, 0.8))
                `,
            } 
        }, "UNIT")
    )
);
