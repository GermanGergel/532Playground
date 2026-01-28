import React from 'react';

export const newId = () => Math.random().toString(36).slice(2, 9);

export const hexToRgba = (hex: string, alpha: number) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

// UPDATED: Clean UNIT style for export to avoid artifacts (stripes)
export const BrandedHeader: React.FC<{className?: string; isExport?: boolean; short?: boolean}> = ({ className, isExport }) => (
    React.createElement('header', { className: `text-center ${className} ${isExport ? 'mb-2' : ''}` },
        React.createElement('h1', { 
            className: `text-6xl font-black uppercase leading-none font-russo tracking-[0.15em]`, 
            style: { 
                background: 'linear-gradient(180deg, #00F2FE 0%, #0E7490 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                // Removed complex filters that cause artifacts in html2canvas
                textShadow: isExport ? '0 2px 4px rgba(0,0,0,0.3)' : '0 0 20px rgba(0, 242, 254, 0.3)',
                filter: isExport ? 'none' : 'drop-shadow(2px 2px 0px #000000)',
            } 
        }, "UNIT")
    )
);