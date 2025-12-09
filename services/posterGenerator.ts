
import { WeatherData, getWeatherIconType } from './weather';

interface PosterData {
    date: string;
    time: string;
    endTime: string;
    backgroundImage: string;
    weather: WeatherData | null;
}

const ICONS: Record<string, string> = {
  sun: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>`,
  cloud: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.5 19c0-1.7-1.3-3-3-3h-1.1c-.2-3.4-3.1-6-6.5-6-3.8 0-6.8 3.1-6.8 7s3 7 6.8 7h8a4 4 0 0 0 2.6-7.3Z"/></svg>`,
  rain: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242"/><path d="M16 14v6"/><path d="M8 14v6"/><path d="M12 16v6"/></svg>`,
  snow: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242"/><path d="M8 15h.01"/><path d="M8 19h.01"/><path d="M12 17h.01"/><path d="M12 21h.01"/><path d="M16 15h.01"/><path d="M16 19h.01"/></svg>`,
  zap: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>`,
  fog: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242"/><path d="M16 17H7"/><path d="M17 21H9"/></svg>`
};

const loadImage = (src: string): Promise<HTMLImageElement> => new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(e);
    img.src = src;
});

export const generateAndSharePoster = async (options: PosterData) => {
    const W = 1200; // width
    const H = 1600; // height (3:4 aspect ratio)
    const P = 40; // padding
    const S = W / 400; // scale factor based on ~400px preview width

    const canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error("Could not get canvas context");

    // Load fonts first
    await Promise.all([
        document.fonts.load(`700 ${S * 14}px "Orbitron"`),
        document.fonts.load(`400 ${S * 7}px "Orbitron"`),
        document.fonts.load(`bold ${S * 28}px "Teko"`),
        document.fonts.load(`700 ${S * 100}px "Orbitron"`),
        document.fonts.load(`400 ${S * 25}px "Orbitron"`),
        document.fonts.load(`bold ${S * 36}px "Teko"`),
        document.fonts.load(`400 ${S * 20}px "Teko"`),
        document.fonts.load(`900 ${S * 14}px "Chakra Petch"`),
    ]);

    // Draw Background
    const bgImage = await loadImage(options.backgroundImage);
    ctx.drawImage(bgImage, 0, 0, W, H);

    // Header
    const headerY = P + S * 10;
    const headerX = P + S * 10;
    const logoY = headerY + S * 17;
    
    // --- Logo with background plank ---
    ctx.textAlign = 'left';
    ctx.shadowColor = 'rgba(0, 242, 254, 0.4)';
    ctx.shadowBlur = 8;
    
    // 532 Text
    ctx.font = `700 ${S * 14}px "Orbitron"`;
    ctx.fillStyle = '#00F2FE';
    ctx.fillText("532", headerX, logoY + S * 13.5);
    const text532Metrics = ctx.measureText("532");

    const gap = S * 2; // Closer gap
    const playgroundX = headerX + text532Metrics.width + gap;
    const playgroundY = logoY + S * 14; // Lowered slightly
    ctx.font = `400 ${S * 7}px "Orbitron"`;
    ctx.fillStyle = '#FFF';
    ctx.fillText("PLAYGROUND", playgroundX, playgroundY);
    
    ctx.shadowBlur = 0; // Reset shadow for other elements


    // Weather
    if (options.weather) {
        const iconType = getWeatherIconType(options.weather.weatherCode);
        const iconSvg = ICONS[iconType];
        const iconUrl = `data:image/svg+xml;base64,${btoa(iconSvg)}`;
        try {
            const iconImg = await loadImage(iconUrl);
            ctx.shadowColor = 'rgba(0,0,0,0.5)';
            ctx.shadowBlur = 5;
            ctx.drawImage(iconImg, W - P - S * 60, headerY + S * 8, S * 24, S * 24);
            
            ctx.fillStyle = '#FFF';
            ctx.font = `bold ${S * 28}px "Teko"`;
            ctx.textAlign = 'right';
            // Corrected: Temperature adjustment from +3 to +1
            ctx.fillText(`${Math.round(options.weather.temperature) + 1}°`, W - P, headerY + S * 35);
            ctx.shadowBlur = 0;
            ctx.textAlign = 'left';
        } catch (e) {
            console.error("Could not draw weather icon", e);
        }
    }

    // Main Title ("GAME" wider than "DAY" style)
    const titleCenterY = H * 0.58;
    ctx.fillStyle = '#FFFFFF';
    ctx.shadowColor = 'rgba(0,0,0,0.7)';
    ctx.shadowBlur = S * 6;

    // "GAME" part (Big, centered)
    ctx.textAlign = 'center';
    ctx.font = `700 ${S * 100}px "Orbitron"`; 
    ctx.letterSpacing = `${S * 5}px`;
    ctx.fillText("GAME", W / 2, titleCenterY);

    // Get metrics of "GAME" to align "DAY"
    const gameMetrics = ctx.measureText("GAME");
    const gameRightEdge = W / 2 + gameMetrics.width / 2;

    // "DAY" part (Small, right-aligned under "GAME")
    ctx.textAlign = 'right'; // Align to the right
    ctx.font = `400 ${S * 25}px "Orbitron"`;
    ctx.letterSpacing = `${S * 15}px`; // Keep wide spacing for style
    ctx.fillText("DAY", gameRightEdge, titleCenterY + S * 40);
    
    ctx.shadowBlur = 0;
    ctx.letterSpacing = '0px';
    ctx.textAlign = 'left'; // Reset alignment


    // Footer
    const footerY = H - P - S * 108;
    const offsetX = S * 10;
    const gradient = ctx.createLinearGradient(0, footerY - S * 100, 0, H);
    gradient.addColorStop(0, 'rgba(0,0,0,0)');
    gradient.addColorStop(0.4, 'rgba(0,0,0,0.6)');
    gradient.addColorStop(1, 'rgba(0,0,0,0.9)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, footerY - S * 100, W, H - (footerY - S * 100));

    // Horizontal line moved up
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.fillRect(P, footerY + S * 42, W - P * 2, 1);

    // Labels moved up
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.font = `bold ${S * 9}px sans-serif`;
    ctx.letterSpacing = '0.2em';
    const dateLabelX = P;
    ctx.fillText("DATE", dateLabelX, footerY + S * 32);
    ctx.textAlign = 'right';
    const timeLabelX = W - P;
    ctx.fillText("TIME", timeLabelX, footerY + S * 32);
    ctx.textAlign = 'left';
    ctx.letterSpacing = '0px';

    // Vertical Divider adjusted
    ctx.fillRect(P + S * 125 + offsetX, footerY + S * 42, 1, S * 58);
    
    const dateObj = new Date(options.date);
    const day = dateObj.toLocaleDateString('en-US', { day: '2-digit', timeZone: 'UTC' });
    const month = dateObj.toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' }).toUpperCase();
    const year = dateObj.toLocaleDateString('en-US', { year: 'numeric', timeZone: 'UTC' });
    
    ctx.shadowColor = 'rgba(0, 242, 254, 0.5)';
    ctx.shadowBlur = 8;
    ctx.fillStyle = '#00F2FE';
    ctx.font = `bold ${S * 48}px "Teko"`;
    const dateBlockX = dateLabelX + offsetX;
    ctx.fillText(day, dateBlockX, footerY + S * 100);
    
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#FFF';
    ctx.font = `900 ${S * 14}px "Chakra Petch"`;
    ctx.fillText(month, dateBlockX + S * 48, footerY + S * 83);

    ctx.fillStyle = '#A9B1BD';
    ctx.font = `${S * 10}px "Chakra Petch"`;
    ctx.fillText(year, dateBlockX + S * 48, footerY + S * 100);
    
    ctx.textAlign = 'right';
    ctx.shadowColor = 'rgba(0, 242, 254, 0.5)';
    ctx.shadowBlur = 5;
    ctx.fillStyle = '#00F2FE';
    ctx.font = `bold ${S * 36}px "Teko"`;
    
    const timeBlockX = timeLabelX;

    ctx.fillText(options.time, timeBlockX - S*121, footerY + S * 95);
    ctx.fillStyle = '#A9B1BD';
    ctx.font = `400 ${S * 20}px "Teko"`;
    ctx.fillText("/", timeBlockX - S*101, footerY + S * 90);
    ctx.fillStyle = '#00F2FE';
    ctx.font = `bold ${S * 36}px "Teko"`;
    ctx.fillText(options.endTime, timeBlockX - S*21, footerY + S * 95);
    ctx.shadowColor = 'transparent';

    // Export
    const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png', 0.95));
    if (!blob) throw new Error('Failed to create blob from canvas.');

    const filename = `532_Playground_Announcement.png`;
    const file = new File([blob], filename, { type: 'image/png' });

    if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
            await navigator.share({ files: [file] });
        } catch (error: any) {
            // AbortError is triggered when the user cancels the share dialog.
            // We should not treat this as a failure.
            if (error.name === 'AbortError') {
                console.log('Share cancelled by user.');
                return;
            }
            throw error;
        }
    } else {
        const link = document.createElement('a');
        link.download = filename;
        link.href = URL.createObjectURL(file);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(link.href);
    }
};
