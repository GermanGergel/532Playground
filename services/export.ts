
import { Session, EventType, GoalPayload, SubPayload, StartRoundPayload, Player } from '../types';
import html2canvas from 'html2canvas'; // Import html2canvas

// Data Export Utilities
export const formatDate = (date: Date) => date.toISOString().split('T')[0];

export const exportSessionAsJson = async (session: Session) => {
    const { eventLog, playerPool } = session;

    // Ensure playerPool is fully hydrated with Player objects
    if (!playerPool || playerPool.length === 0 || typeof playerPool[0] === 'string') {
        console.error("Cannot export JSON: playerPool is not hydrated.");
        return;
    }
    const playerMap = new Map((playerPool as Player[]).map(p => [p.id, p]));
    const getPlayerNickname = (id?: string) => id ? playerMap.get(id)?.nickname : undefined;


    const formattedLog = eventLog.map(log => {
        const base = {
            timestamp: log.timestamp,
            round: log.round,
            type: log.type,
        };

        let payload: any = {};

        switch (log.type) {
             case EventType.GOAL:
                const goalPayload = log.payload as GoalPayload;
                payload = {
                    team: goalPayload.teamColor,
                    scorer: getPlayerNickname(goalPayload.scorerId) || null,
                    assist: getPlayerNickname(goalPayload.assistId) || null,
                    isOwnGoal: goalPayload.isOwnGoal,
                };
                if(goalPayload.isOwnGoal) payload.scorer = null; // Enforce null for own goals
                break;
            case EventType.SUBSTITUTION:
                 const subPayload = log.payload as SubPayload;
                 payload = {
                    side: subPayload.side,
                    out: getPlayerNickname(subPayload.outId),
                    in: getPlayerNickname(subPayload.inId),
                 };
                 break;
            case EventType.START_ROUND:
                 const startPayload = log.payload as StartRoundPayload;
                 payload = {
                     leftTeam: startPayload.leftTeamColor,
                     rightTeam: startPayload.rightTeamColor,
                     leftPlayers: startPayload.leftPlayerIds.map(id => getPlayerNickname(id)),
                     rightPlayers: startPayload.rightPlayerIds.map(id => getPlayerNickname(id)),
                 };
                 break;
            default:
                payload = {};
        }

        return { ...base, payload };
    });

    formattedLog.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    const dataStr = JSON.stringify(formattedLog, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const filename = `${session.sessionName.replace(/\s/g, '_')}_${session.date}.json`;

    if ('showSaveFilePicker' in window) {
        try {
            const handle = await (window as any).showSaveFilePicker({
                suggestedName: filename,
                types: [{
                    description: 'JSON file',
                    accept: { 'application/json': ['.json'] },
                }],
            });
            const writable = await handle.createWritable();
            await writable.write(dataBlob);
            await writable.close();
            return;
        } catch (err) {
            if (err instanceof DOMException && err.name === 'AbortError') {
                console.log('User cancelled save dialog.');
                return; 
            }
            console.error('Error using showSaveFilePicker, falling back to download link.', err);
        }
    }
    
    // Fallback for older browsers
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
};


// NEW HELPER FUNCTION TO FIX RACE CONDITION
const waitForImages = (container: HTMLElement): Promise<void[]> => {
    const images = Array.from(container.getElementsByTagName('img'));
    return Promise.all(
        images.map(img => {
            return new Promise<void>((resolve, reject) => {
                // If the image is already loaded (e.g., from cache), resolve immediately.
                if (img.complete) {
                    resolve();
                } else {
                    // Otherwise, wait for it to load.
                    img.onload = () => resolve();
                    // Or reject if it fails to load.
                    img.onerror = () => reject(new Error(`Could not load image: ${img.src}`));
                }
            });
        })
    );
};


export const shareOrDownloadImages = async (elementId: string, sessionName: string, date: string, sectionName?: string) => {
    const element = document.getElementById(elementId);

    if (!element) {
        console.error(`Could not find the element with ID #${elementId} to export.`);
        alert('Image export failed: element not found.');
        return;
    }
    
    // FIX: Wait for all images inside the element to load before capturing.
    // This prevents race conditions where the capture happens before an image is downloaded.
    try {
        await waitForImages(element);
    } catch (error) {
        console.error("Error waiting for images to load before export:", error);
        // We can choose to proceed anyway, but it might result in a broken image.
    }
    
    // FIX: Wait for all custom fonts to be fully loaded before rendering the canvas.
    // This is the definitive solution to prevent text and numbers from being rendered with
    // fallback fonts, which causes significant layout shifts and misalignment.
    await document.fonts.ready;

    const files: File[] = [];

    try {
        const canvas = await html2canvas(element, {
            backgroundColor: null, // Transparent corners if container has them
            scale: 3, // OPTIMIZED: Increased for maximum quality exports.
            useCORS: true,
            logging: false,
            windowWidth: 1200, // Force desktop-like rendering width
            onclone: (clonedDoc: Document) => {
                // Since we are cloning a specific ID, we can find it again
                const clonedElement = clonedDoc.getElementById(elementId);
                if (clonedElement) {
                    // This element is already visible by nature of being cloned, so this might be redundant, but safe.
                    clonedElement.style.visibility = 'visible';
                }
                // Hide specific elements marked to be ignored during export
                const ignoredElements = clonedDoc.body.querySelectorAll('[data-html2canvas-ignore="true"]');
                ignoredElements.forEach(el => (el as HTMLElement).style.display = 'none');
            }
        });

        const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png', 1.0)); // Use max quality PNG
        
        if (blob) {
            const sectionSuffix = sectionName ? `_${sectionName}` : '';
            const filename = `532_Playground_${sessionName.replace(/\s/g, '_')}_${date}${sectionSuffix}.png`;
            files.push(new File([blob], filename, { type: 'image/png' }));
        }

    } catch (error) {
        console.error(`Failed to capture image for element #${elementId}:`, error);
    }

    if (files.length === 0) return;

    // Try to share as a gallery/album
    try {
        if (navigator.share && navigator.canShare && navigator.canShare({ files })) {
            await navigator.share({
                files: files,
            });
        } else {
            throw new Error('Sharing not supported');
        }
    } catch (shareError: any) {
        if (shareError.name === 'AbortError') {
            console.log('Share cancelled by user.');
            return; // Don't fall back to download
        }
        console.log('Sharing failed or not supported, falling back to download.', shareError);
        // Fallback: Download each file sequentially
        files.forEach(file => {
            const dataUrl = URL.createObjectURL(file);
            const link = document.createElement('a');
            link.download = file.name;
            link.href = dataUrl;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(dataUrl);
        });
    }
};
