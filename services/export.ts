



import { Session, EventType, GoalPayload, SubPayload, StartRoundPayload } from '../types';

// Data Export Utilities
export const formatDate = (date: Date) => date.toISOString().split('T')[0];

export const exportSessionAsJson = async (session: Session) => {
    const { eventLog } = session;

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
                    team: goalPayload.team,
                    // Explicitly set scorer to null for own goals to ensure format consistency.
                    scorer: goalPayload.isOwnGoal ? null : (goalPayload.scorer || null),
                    assist: goalPayload.assist || null,
                };
                break;
            case EventType.SUBSTITUTION:
                 payload = log.payload as SubPayload;
                 break;
            case EventType.START_ROUND:
                 payload = log.payload as StartRoundPayload;
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


export const shareOrDownloadImages = async (elementRefs: HTMLElement[], sessionName: string, date: string, sectionName?: string) => {
    if (!elementRefs || elementRefs.length === 0 || typeof (window as any).html2canvas === 'undefined') {
        console.error('Could not find the export library (html2canvas) or the elements to export.');
        alert('Image export failed: library or elements not found.');
        return;
    }

    const files: File[] = [];

    // Process each element sequentially
    for (let i = 0; i < elementRefs.length; i++) {
        const element = elementRefs[i];
        
        try {
            const canvas = await (window as any).html2canvas(element, {
                backgroundColor: null, // CRITICAL: Allows transparency for rounded corners
                scale: 6, // 6x scale for ultra-high quality
                useCORS: true,
                logging: false,
                onclone: (clonedDoc: Document) => {
                    const clonedElement = clonedDoc.body.querySelector('[data-export-target="true"]');
                    if (clonedElement) {
                        (clonedElement as HTMLElement).style.visibility = 'visible';
                    }
                    // Hide specific elements marked to be ignored during export
                    const ignoredElements = clonedDoc.body.querySelectorAll('[data-html2canvas-ignore="true"]');
                    ignoredElements.forEach(el => (el as HTMLElement).style.display = 'none');
                }
            });

            const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png', 1.0)); // Use max quality PNG
            
            if (blob) {
                const partSuffix = elementRefs.length > 1 ? `_Part${i + 1}` : '';
                const sectionSuffix = sectionName ? `_${sectionName}` : '';
                const filename = `532_Playground_${sessionName.replace(/\s/g, '_')}_${date}${sectionSuffix}${partSuffix}.png`;
                files.push(new File([blob], filename, { type: 'image/png' }));
            }

        } catch (error) {
            console.error(`Failed to capture image part ${i + 1}:`, error);
        }
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