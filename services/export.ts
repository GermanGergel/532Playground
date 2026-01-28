
import { Session, EventType, GoalPayload, SubPayload, StartRoundPayload, Player } from '../types';
import html2canvas from 'html2canvas';

export const formatDate = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

/**
 * Расширенный экспорт для видео-продакшена.
 * Включает real_timestamp и полные объекты игроков.
 */
export const exportSessionAsJson = async (session: Session) => {
    const { eventLog, playerPool } = session;

    const formattedLog = eventLog.map(log => {
        const base = {
            timestamp: log.timestamp, // ISO string
            real_timestamp: new Date(log.timestamp).getTime(), // Unix ms для точной синхронизации
            round: log.round,
            type: log.type,
        };

        let payload: any = {};

        const getPlayerData = (nickname?: string) => {
            if (!nickname) return null;
            const p = playerPool.find(player => player.nickname === nickname);
            if (!p) return { nickname };
            return {
                id: p.id,
                nickname: p.nickname,
                surname: p.surname,
                rating: p.rating,
                tier: p.tier,
                photo: p.photo,
                skills: p.skills
            };
        };

        switch (log.type) {
            case EventType.GOAL:
                const goalPayload = log.payload as GoalPayload;
                payload = {
                    team_color: goalPayload.team,
                    is_own_goal: goalPayload.isOwnGoal || false,
                    scorer: getPlayerData(goalPayload.scorer),
                    assist: getPlayerData(goalPayload.assist),
                };
                break;
            case EventType.SUBSTITUTION:
                const subPayload = log.payload as SubPayload;
                payload = {
                    side: subPayload.side,
                    player_out: getPlayerData(subPayload.out),
                    player_in: getPlayerData(subPayload.in),
                };
                break;
            case EventType.START_ROUND:
                const startPayload = log.payload as StartRoundPayload;
                payload = {
                    left_team: startPayload.leftTeam,
                    right_team: startPayload.rightTeam,
                    left_players: startPayload.leftPlayers.map(n => getPlayerData(n)),
                    right_players: startPayload.rightPlayers.map(n => getPlayerData(n)),
                };
                break;
            default:
                payload = log.payload;
        }

        return { ...base, payload };
    });

    // Метаданные всей сессии для титров
    const exportData = {
        version: "532_PRO_VIDEO_V1",
        session_info: {
            id: session.id,
            name: session.sessionName,
            date: session.date,
            location: session.location,
            weather: session.weather
        },
        events: formattedLog.sort((a, b) => a.real_timestamp - b.real_timestamp)
    };

    const dataStr = JSON.stringify(exportData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const filename = `PRO_VIDEO_${session.sessionName.replace(/\s/g, '_')}_${session.date}.json`;

    if ('showSaveFilePicker' in window) {
        try {
            const handle = await (window as any).showSaveFilePicker({
                suggestedName: filename,
                types: [{
                    description: '532 Video Intel JSON',
                    accept: { 'application/json': ['.json'] },
                }],
            });
            const writable = await handle.createWritable();
            await writable.write(dataBlob);
            await writable.close();
            return;
        } catch (err) {}
    }
    
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
};

/**
 * Captures a DOM element as an image and shares it via the Web Share API or downloads it.
 */
export const shareOrDownloadImages = async (elementId: string, sessionName: string, sessionDate: string, sectionName: string) => {
    const element = document.getElementById(elementId);
    if (!element) {
        console.error(`Element with id ${elementId} not found.`);
        return;
    }

    try {
        const canvas = await html2canvas(element, {
            useCORS: true,
            scale: 2,
            backgroundColor: '#1A1D24',
        });

        const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
        if (!blob) throw new Error('Canvas to Blob conversion failed');

        const filename = `532_${sessionName.replace(/\s/g, '_')}_${sessionDate}_${sectionName}.png`;
        const file = new File([blob], filename, { type: 'image/png' });

        // Clean share data: Only the file, no text caption.
        const shareData = {
            files: [file],
        };

        const canShare = navigator.share && typeof navigator.canShare === 'function' && navigator.canShare(shareData);

        if (canShare) {
            await navigator.share(shareData);
        } else {
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        }
    } catch (error: any) {
        if (error.name !== 'AbortError') {
            console.error('Error in shareOrDownloadImages:', error);
            throw error;
        }
    }
};
