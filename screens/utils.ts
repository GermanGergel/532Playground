import React from 'react';

export const newId = () => Math.random().toString(36).slice(2, 9);

export const hexToRgba = (hex: string, alpha: number) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

export const resizeImage = (base64Str: string, maxWidth: number = 2048): Promise<string> => {
    return new Promise((resolve) => {
        const img = new (window as any).Image();
        img.src = base64Str;
        img.onload = () => {
            const canvas = document.createElement('canvas');
            let width = img.width;
            let height = img.height;

            if (width > maxWidth) {
                height = Math.round((height * maxWidth) / width);
                width = maxWidth;
            }

            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx?.drawImage(img, 0, 0, width, height);
            resolve(canvas.toDataURL('image/png')); // Use PNG for lossless quality
        };
        img.onerror = () => {
            resolve(base64Str); // Fail safe
        };
    });
};


// FIX: Replaced JSX with React.createElement to be compatible with a .ts file.
export const BrandedHeader: React.FC<{className?: string}> = ({ className }) => (
    React.createElement('header', { className: `text-left ${className}`, style: { textShadow: '0 0 8px rgba(0, 242, 254, 0.5)' } },
        React.createElement('h1', { className: "text-5xl font-black uppercase leading-none", style: { color: '#00F2FE' } },
            "532"
        ),
        React.createElement('h2', { className: "text-5xl font-black uppercase text-dark-text leading-none tracking-widest" },
            "PLAYGROUND"
        )
    )
);