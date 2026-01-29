
import { Session, EventType, GoalPayload, SubPayload, StartRoundPayload, Player } from '../types';
import html2canvas from 'html2canvas';

export const formatDate = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

/**
 * Расширенный экспорт для видео-продакшена (Broadcast Ready).
 * Генерирует JSON, который можно скормить в Remotion или Adobe After Effects scripts.
 */
export const exportSessionAsJson = async (session: Session) => {
    const { eventLog, playerPool, teams, games } = session;

    // 1. Подготовка метаданных команд для оверлея
    const teamsMeta = teams.map(t => ({
        id: t.id,
        name: t.name,
        color: t.color,
        logo: t.logo || null,
        roster_ids: t.playerIds
    }));

    // 2. Подготовка базы игроков для титров (Lineups / Goal Cards)
    const playersMeta = playerPool.map(p => ({
        id: p.id,
        nickname: p.nickname,
        surname: p.surname,
        number: 0, // В будущем можно добавить игровые номера
        avatar_url: p.photo || p.playerCard || null,
        country: p.countryCode,
        stats: {
            rating: p.rating,
            tier: p.tier
        }
    }));

    // 3. Синхронизация таймлайна
    // Находим первое событие начала игры, чтобы считать relative_time (секунды от начала матча)
    const firstGameStart = eventLog.find(e => e.type === EventType.TIMER_START || e.type === EventType.START_ROUND);
    const sessionStartTime = firstGameStart ? new Date(firstGameStart.timestamp).getTime() : new Date(session.createdAt).getTime();

    const formattedLog = eventLog.map(log => {
        const logTime = new Date(log.timestamp).getTime();
        const relativeSeconds = (logTime - sessionStartTime) / 1000;

        const base = {
            id: `evt_${logTime}`,
            timestamp_iso: log.timestamp, 
            timestamp_unix: logTime,
            relative_time_sec: relativeSeconds, // Ключевое поле для синхронизации с видео
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
                photo: p.photo,
                tier: p.tier
            };
        };

        switch (log.type) {
            case EventType.GOAL:
                const goalPayload = log.payload as GoalPayload;
                // Находим текущий счет на момент этого лога
                // (Это сложно вычислить "на лету" в видео-редакторе, лучше дать готовым)
                payload = {
                    team_color: goalPayload.team,
                    is_own_goal: goalPayload.isOwnGoal || false,
                    scorer: getPlayerData(goalPayload.scorer),
                    assist: getPlayerData(goalPayload.assist),
                    // Добавляем ID команды для связи с teamMeta
                    team_id: teams.find(t => t.color === goalPayload.team)?.id
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
                    left_team_color: startPayload.leftTeam,
                    right_team_color: startPayload.rightTeam,
                    left_team_id: teams.find(t => t.color === startPayload.leftTeam)?.id,
                    right_team_id: teams.find(t => t.color === startPayload.rightTeam)?.id,
                };
                break;
            default:
                payload = log.payload;
        }

        return { ...base, data: payload };
    });

    // Метаданные всей сессии
    const exportData = {
        version: "UNIT_BROADCAST_V2",
        generated_at: new Date().toISOString(),
        session_info: {
            id: session.id,
            name: session.sessionName,
            date: session.date,
            location: session.location || "Unit Stadium",
            weather: session.weather
        },
        assets: {
            teams: teamsMeta,
            players: playersMeta
        },
        // Сгруппированные матчи для удобства нарезки
        matches: games.map(g => ({
            game_number: g.gameNumber,
            team_1_id: g.team1Id,
            team_2_id: g.team2Id,
            final_score: `${g.team1Score} - ${g.team2Score}`,
            winner_id: g.winnerTeamId,
            duration_sec: g.durationSeconds
        })),
        // Полный лог событий для наложения
        timeline: formattedLog.sort((a, b) => a.timestamp_unix - b.timestamp_unix)
    };

    const dataStr = JSON.stringify(exportData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const filename = `UNIT_BROADCAST_${session.sessionName.replace(/\s/g, '_')}_${session.date}.json`;

    if ('showSaveFilePicker' in window) {
        try {
            const handle = await (window as any).showSaveFilePicker({
                suggestedName: filename,
                types: [{
                    description: 'UNIT Broadcast JSON',
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

        const filename = `UNIT_${sessionName.replace(/\s/g, '_')}_${sessionDate}_${sectionName}.png`;
        const file = new File([blob], filename, { type: 'image/png' });

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
