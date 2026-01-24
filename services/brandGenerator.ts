
import { homeScreenBackground } from '../assets';

export const generateAndShareBrandAssets = async (type: 'logo' | 'cover') => {
    const isLogo = type === 'logo';
    const W = isLogo ? 1080 : 1640; // Facebook Cover standard width
    const H = isLogo ? 1080 : 856;  // Facebook Cover standard height (mobile safe zone consideration)
    
    const canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error("Could not get canvas context");

    // Load Fonts
    await Promise.all([
        document.fonts.load(`900 ${isLogo ? 300 : 150}px "Orbitron"`),
        document.fonts.load(`700 ${isLogo ? 80 : 60}px "Orbitron"`),
        document.fonts.load(`bold ${isLogo ? 60 : 40}px "Teko"`),
    ]);

    // 1. Background
    // Dark cyber background
    const gradient = ctx.createLinearGradient(0, 0, W, H);
    gradient.addColorStop(0, '#1A1D24');
    gradient.addColorStop(1, '#0f1115');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, W, H);

    // Grid effect
    ctx.strokeStyle = 'rgba(0, 242, 254, 0.05)';
    ctx.lineWidth = 2;
    const gridSize = 50;
    for (let x = 0; x < W; x += gridSize) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
    }
    for (let y = 0; y < H; y += gridSize) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    }

    // Glow blob
    const gradGlow = ctx.createRadialGradient(W/2, H/2, 0, W/2, H/2, W/1.5);
    gradGlow.addColorStop(0, 'rgba(0, 242, 254, 0.1)');
    gradGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = gradGlow;
    ctx.fillRect(0, 0, W, H);

    // 2. Content
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    const centerX = W / 2;
    const centerY = H / 2;

    // Shadow
    ctx.shadowColor = 'rgba(0, 242, 254, 0.8)';
    ctx.shadowBlur = 40;

    if (isLogo) {
        // --- LOGO GENERATION (Square) ---
        // "532"
        ctx.font = '900 350px "Orbitron"';
        ctx.fillStyle = '#00F2FE';
        ctx.fillText("532", centerX, centerY - 60);
        
        ctx.shadowBlur = 20;
        
        // "PLAYGROUND"
        ctx.font = '700 80px "Orbitron"';
        ctx.fillStyle = '#FFFFFF';
        ctx.letterSpacing = '20px';
        ctx.fillText("PLAYGROUND", centerX, centerY + 140);
        
    } else {
        // --- COVER GENERATION (Rectangle) ---
        // "532"
        ctx.font = '900 250px "Orbitron"';
        ctx.fillStyle = '#00F2FE';
        ctx.fillText("532", centerX, centerY - 80);
        
        // "PLAYGROUND"
        ctx.shadowBlur = 20;
        ctx.font = '700 60px "Orbitron"';
        ctx.fillStyle = '#FFFFFF';
        ctx.letterSpacing = '15px';
        ctx.fillText("PLAYGROUND", centerX, centerY + 70);

        // Tagline
        ctx.shadowBlur = 0;
        ctx.font = 'bold 40px "Teko"';
        ctx.fillStyle = '#A9B1BD';
        ctx.letterSpacing = '2px';
        ctx.fillText("DA NANG • FOOTBALL COMMUNITY", centerX, centerY + 160);
        
        // Decorative lines
        ctx.fillStyle = '#00F2FE';
        ctx.fillRect(centerX - 100, centerY + 130, 200, 2);
    }

    // Export
    const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png', 1.0));
    if (!blob) throw new Error('Failed to create blob.');

    const filename = isLogo ? '532_Logo.png' : '532_Facebook_Cover.png';
    const file = new File([blob], filename, { type: 'image/png' });

    if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
            await navigator.share({ files: [file] });
        } catch (error: any) {
            if (error.name !== 'AbortError') {
                console.error("Brand share error:", error);
            }
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
