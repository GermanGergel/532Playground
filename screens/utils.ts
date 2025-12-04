import React from 'react';

export const newId = () => Math.random().toString(36).slice(2, 9);

export const hexToRgba = (hex: string, alpha: number) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

// FIX: Replaced JSX with React.createElement to be compatible with a .ts file.
export const BrandedHeader: React.FC<{className?: string; isExport?: boolean}> = ({ className, isExport }) => (
    React.createElement('header', { className: `text-left ${className} ${isExport ? '-mt-4' : ''}`, style: { textShadow: '0 0 8px rgba(0, 242, 254, 0.5)' } },
        React.createElement('h1', { className: `text-5xl font-black uppercase leading-none`, style: { color: '#00F2FE' } },
            "532"
        ),
        React.createElement('h2', { className: "text-5xl font-black uppercase text-dark-text leading-none tracking-widest" },
            "PLAYGROUND"
        )
    )
);