
import React, { useEffect, useState, useMemo } from 'react';
import { useApp } from '../context';
import { Page, Button, Card, Modal, useTranslation } from '../ui';
import { Trash2, Cloud, Calendar, ChevronLeft, TrophyIcon, Target, Users, History as HistoryIcon } from '../icons';
import { Session } from '../types';
import { calculateAllStats } from '../services/statistics';
import { retrySyncPendingSessions, deleteSession } from '../db';
import { ShareableReport } from './StatisticsScreen';

// --- SUB-COMPONENTS FOR HISTORY HUB ---

const SessionSidebarItem: React.FC<{ 
    session: Session; 
    isSelected: boolean; 
    onClick: () => void;
    onDelete: (e: React.MouseEvent) => void;
}> = ({ session, isSelected, onClick, onDelete }) => {
    const dateObj = new Date(session.date);
    const day = dateObj.toLocaleDateString('en-GB', { day: '2-digit' });
    const month = dateObj.toLocaleDateString('en-GB', { month: 'short' }).toUpperCase();
    
    return (
        <div 
            onClick={onClick}
            className={`group relative flex items-center gap-3 p-3 rounded-2xl cursor-pointer transition-all duration-300 border
                ${isSelected 
                    ? 'bg-gradient-to-br from-[#1e2329] to-[#12161b] border-white/20 shadow-[0_10px_20px_rgba(0,0,0,0.4)]' 
                    : 'bg-white/[0.02] border-white/5 hover:bg-white/[0.05] hover:border-white/10'
                }`}
        >
            {/* Date Block */}
            <div className={`flex flex-col items-center justify-center w-12 h-12 rounded-xl border shrink-0 transition-all duration-500
                ${isSelected ? 'bg-[#00F2FE]/10 border-[#00F2FE]/40 text-[#00F2FE]' : 'bg-black/20 border-white/10 text-white/40 group-hover:border-white/20'}`}>
                <span className="text-sm font-black leading-none">{day}</span>
                <span className="text-[7px] font-bold tracking-widest mt-1">{month}</span>
            </div>

            <div className="flex-grow min-w-0">
                <h4 className={`text-sm font-black uppercase truncate tracking-wide transition-colors ${isSelected ? 'text-white' : 'text-white/60 group-hover:text-white/80'}`}>
                    {session.sessionName}
                </h4>
                <div className="flex items-center gap-2 mt-1">
                    <span className="text-[8px] font-mono text-white/20 uppercase tracking-widest italic">
                        {session.playerPool.length} Units
                    </span>
                    {session.syncStatus === 'synced' ? (
                        <Cloud className="w-3 h-3 text-[#4CFF5F]/40" />
                    ) : (
                        <Cloud className="w-3 h-3 text-yellow-500/40 animate-pulse" />
                    )}
                </div>
            </div>

            {/* Selection/Delete Actions */}
            <div className="flex items-center gap-1 shrink-0">
                {isSelected && session.syncStatus !== 'synced' && (
                    <button 
                        onClick={onDelete}
                        className="p-2 rounded-lg text-red-500/40 hover:text-red-500 hover:bg-red-500/10 transition-all"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                )}
                <div className={`w-1.5 h-1.5 rounded-full transition-all duration-500 ${isSelected ? 'bg-[#00F2FE] shadow-[0_0_8px_#00F2FE]' : 'bg-white/5'}`}></div>
            </div>
        </div>
    );
};

export const HistoryScreen: React.FC = () => {
    const { history, setHistory, fetchHistory } = useApp();
    const t = useTranslation();
    
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [sessionToDelete, setSessionToDelete] = useState<Session | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        const init = async () => {
            setIsLoading(true);
            await retrySyncPendingSessions(); 
            await fetchHistory(20); 
            setIsLoading(false);
        };
        init();
    }, [fetchHistory]);

    // Выбираем первую сессию автоматически, если ничего не выбрано
    useEffect(() => {
        if (!selectedId && history.length > 0) {
            setSelectedId(history[0].id);
        }
    }, [history, selectedId]);

    const activeSession = useMemo(() => history.find(s => s.id === selectedId), [history, selectedId]);

    const handleDeleteClick = (e: React.MouseEvent, session: Session) => {
        e.stopPropagation();
        setSessionToDelete(session);
        setIsDeleteModalOpen(true);
    };

    const confirmDelete = async () => {
        if (!sessionToDelete) return;
        await deleteSession(sessionToDelete.id);
        setHistory(prev => prev.filter(s => s.id !== sessionToDelete.id));
        if (selectedId === sessionToDelete.id) {
            setSelectedId(history.find(s => s.id !== sessionToDelete.id)?.id || null);
        }
        setIsDeleteModalOpen(false);
        setSessionToDelete(null);
    };

    return (
        <div className="fixed inset-0 bg-[#0a0c10] flex overflow-hidden">
            {/* SIDEBAR - LEFT COLUMN */}
            <div className="w-[300px] md:w-[350px] flex flex-col border-r border-white/5 bg-black/40 relative z-20 shrink-0">
                <div className="p-6 pb-4 border-b border-white/5">
                    <h2 className="font-russo text-xl text-white uppercase tracking-wider flex items-center gap-3">
                        <HistoryIcon className="w-5 h-5 text-[#00F2FE]" />
                        {t.navHistory}
                    </h2>
                    <p className="text-[9px] font-black text-white/20 uppercase tracking-[0.3em] mt-1 italic">Tactical Archive</p>
                </div>

                <div className="flex-grow overflow-y-auto custom-hub-scrollbar p-4 space-y-2 pb-32">
                    {history.map(session => (
                        <SessionSidebarItem 
                            key={session.id}
                            session={session}
                            isSelected={selectedId === session.id}
                            onClick={() => setSelectedId(session.id)}
                            onDelete={(e) => handleDeleteClick(e, session)}
                        />
                    ))}
                    
                    {history.length === 0 && !isLoading && (
                        <div className="flex flex-col items-center justify-center py-20 opacity-20 text-center px-6">
                            <HistoryIcon className="w-12 h-12 mb-4" />
                            <p className="text-xs font-bold uppercase tracking-widest">{t.noSessionsFound}</p>
                        </div>
                    )}
                </div>
            </div>

            {/* CONTENT AREA - RIGHT COLUMN */}
            <div className="flex-grow relative bg-[#01040a] overflow-hidden flex flex-col">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#0a1121] via-black to-black opacity-60"></div>
                <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]"></div>

                {activeSession ? (
                    <div className="relative z-10 flex flex-col h-full animate-in fade-in slide-in-from-right-4 duration-500">
                        {/* Session Detail Header */}
                        <div className="p-8 pb-4 shrink-0 flex justify-between items-end">
                            <div>
                                <span className="text-[10px] font-black text-[#00F2FE] tracking-[0.4em] uppercase mb-1 block">ARCHIVE REPORT</span>
                                <h1 className="text-4xl font-russo text-white uppercase tracking-tighter leading-none">
                                    {activeSession.sessionName}
                                </h1>
                            </div>
                            <div className="text-right">
                                <span className="text-lg font-chakra font-bold text-white/60 block leading-none">
                                    {new Date(activeSession.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                                </span>
                                <span className="text-[9px] font-mono text-white/20 uppercase tracking-widest mt-1 block">Verified Entry</span>
                            </div>
                        </div>

                        {/* Scrollable Statistics Content */}
                        <div className="flex-grow overflow-y-auto custom-hub-scrollbar px-8 pb-32">
                            <div className="max-w-4xl">
                                <ShareableReport session={activeSession} />
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="h-full w-full flex flex-col items-center justify-center opacity-10">
                        <Target className="w-32 h-32 mb-6" />
                        <span className="font-orbitron text-xl uppercase tracking-[0.6em] font-black">Select Session Unit</span>
                    </div>
                )}
            </div>

            {/* DELETE MODAL */}
            <Modal 
                isOpen={isDeleteModalOpen} 
                onClose={() => setIsDeleteModalOpen(false)} 
                size="xs"
                hideCloseButton
                containerClassName="!bg-[#0a0c10] border border-red-500/20 shadow-2xl !p-6"
            >
                <div className="flex flex-col gap-4 text-center">
                    <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-2">
                        <Trash2 className="w-6 h-6 text-red-500" />
                    </div>
                    <h3 className="text-xl font-bold text-white uppercase tracking-wider">{t.confirmDeletion}</h3>
                    <p className="text-xs text-white/40 leading-relaxed uppercase">Remove this session from tactical memory?</p>
                    <div className="flex gap-3 mt-4">
                        <Button variant="ghost" onClick={() => setIsDeleteModalOpen(false)} className="flex-1 bg-white/5 border border-white/10 hover:bg-white/10 text-xs font-bold uppercase">{t.cancel}</Button>
                        <Button variant="danger" className="flex-1 !py-3 shadow-lg shadow-red-500/20 text-xs font-bold uppercase" onClick={confirmDelete}>{t.delete}</Button>
                    </div>
                </div>
            </Modal>
            
            <style dangerouslySetInnerHTML={{ __html: `
                .custom-hub-scrollbar::-webkit-scrollbar { width: 4px; }
                .custom-hub-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-hub-scrollbar::-webkit-scrollbar-thumb { background: rgba(0, 242, 254, 0.1); border-radius: 10px; }
            `}} />
        </div>
    );
};
