
import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../context';
import { Page, Button, Card, Modal, useTranslation } from '../ui';
import { Trash2, Cloud } from '../icons';
import { Session } from '../types';
import { BrandedHeader } from './utils';
import { retrySyncPendingSessions, deleteSession, forceSyncSession } from '../db';

export const HistoryScreen: React.FC = () => {
    const { history, setHistory, fetchHistory } = useApp();
    const t = useTranslation();
    const [isDeleteModalOpen, setIsDeleteModalOpen] = React.useState(false);
    const [sessionToDelete, setSessionToDelete] = React.useState<Session | null>(null);
    const [isLoadingMore, setIsLoadingMore] = React.useState(false);
    const [isSyncing, setIsSyncing] = React.useState(false);

    useEffect(() => {
        const syncAndRefresh = async () => {
            setIsLoadingMore(true);
            await retrySyncPendingSessions(); 
            await fetchHistory(10); 
            setIsLoadingMore(false);
        };
        syncAndRefresh();
    }, [fetchHistory]);

    const openDeleteModal = (session: Session) => {
        setSessionToDelete(session);
        setIsDeleteModalOpen(true);
    };

    const handleDelete = async () => {
        if (!sessionToDelete) return;
        await deleteSession(sessionToDelete.id);
        setHistory(prev => prev.filter(s => s.id !== sessionToDelete.id));
        setIsDeleteModalOpen(false);
        setSessionToDelete(null);
    };

    const handleManualSync = async (e: React.MouseEvent, session: Session) => {
        e.preventDefault();
        e.stopPropagation();
        
        if (isSyncing) return;
        setIsSyncing(true);
        
        try {
            // Attempt 1: Try straightforward sync (which now includes auto-stripping rotationQueue)
            const result = await forceSyncSession(session);
            
            if (result.success) {
                setHistory(prev => prev.map(s => s.id === session.id ? { ...s, syncStatus: 'synced' as const } : s));
                alert("Session synced successfully!");
            } else {
                alert(`Sync Failed: ${result.error}\n\nThis likely means the database schema is outdated.`);
            }
        } catch (err) {
            console.error(err);
            alert("Sync Error: Unknown");
        } finally {
            setIsSyncing(false);
        }
    };

    return (
        <Page>
            {/* UPDATED: Added 'short' prop to only show "UNIT" as requested */}
            <BrandedHeader className="mb-8" short />
            
            {history.length === 0 && !isLoadingMore ? (
                <p className="text-center text-dark-text-secondary">{t.noSessionsFound}</p>
            ) : (
                <>
                    <ul className="space-y-4">
                        {history.map(session => (
                            <li key={session.id} className="group flex items-center gap-2">
                                <Link to={`/report/${session.id}`} className="flex-grow">
                                    <Card className={`hover:bg-white/10 transition-colors duration-300 shadow-lg shadow-dark-accent-start/20 hover:shadow-dark-accent-start/40 !p-3 ${session.syncStatus === 'pending' ? 'border-yellow-500/50' : ''}`}>
                                        <div className="flex justify-between items-center">
                                            <div className="overflow-hidden">
                                                <h3 className="font-bold text-base truncate flex items-center gap-2">
                                                    {session.sessionName}
                                                    {session.syncStatus === 'pending' && (
                                                        <button 
                                                            onClick={(e) => handleManualSync(e, session)}
                                                            className="hover:scale-110 transition-transform active:scale-95"
                                                            title="Click to retry sync"
                                                        >
                                                            <Cloud className={`w-4 h-4 text-yellow-400 ${isSyncing ? 'animate-spin' : 'animate-pulse'}`} />
                                                        </button>
                                                    )}
                                                </h3>
                                                <p className="text-xs text-dark-text-secondary">{new Date(session.date).toLocaleDateString()}</p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {session.syncStatus === 'synced' && <Cloud className="w-4 h-4 text-[#4CFF5F]" />}
                                                <span className="text-[9px] font-semibold uppercase px-1.5 py-0.5 bg-dark-bg rounded-full flex-shrink-0 ml-2">{t.finished}</span>
                                            </div>
                                        </div>
                                    </Card>
                                </Link>
                                
                                {session.syncStatus !== 'synced' && (
                                    <div className="flex flex-col gap-2">
                                        <Button
                                            variant="ghost"
                                            className="!p-2 !text-white shadow-lg shadow-dark-accent-start/20 hover:shadow-dark-accent-start/40"
                                            style={{ textShadow: '0 0 10px #00F2FE, 0 0 15px #00F2FE' }}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                openDeleteModal(session);
                                            }}
                                        >
                                            <Trash2 className="w-5 h-5"/>
                                        </Button>
                                    </div>
                                )}
                            </li>
                        ))}
                    </ul>
                    {isLoadingMore && (
                        <div className="flex justify-center mt-4">
                            <div className="w-6 h-6 border-2 border-dark-accent-start border-t-transparent rounded-full animate-spin"></div>
                        </div>
                    )}
                    {!isLoadingMore && history.length >= 5 && (
                        <p className="text-center text-[10px] text-dark-text-secondary mt-6 uppercase tracking-widest opacity-50">
                            Showing last 10 sessions
                        </p>
                    )}
                </>
            )}
             <Modal 
                isOpen={isDeleteModalOpen} 
                onClose={() => setIsDeleteModalOpen(false)} 
                size="xs"
                hideCloseButton
                containerClassName="border border-dark-accent-start/40 shadow-[0_0_20px_rgba(0,242,254,0.3)]"
             >
                <div className="flex flex-col gap-4 text-center">
                    <h3 className="text-xl font-bold text-dark-text">{t.confirmDeletion}</h3>
                    <p className="text-xs text-dark-text-secondary">Remove this unsynced session?</p>
                    <div className="flex justify-center gap-3">
                        <Button variant="secondary" onClick={() => setIsDeleteModalOpen(false)} className="w-full shadow-lg shadow-dark-accent-start/20 hover:shadow-dark-accent-start/40">{t.cancel}</Button>
                        <Button variant="secondary" className="w-full shadow-lg shadow-dark-accent-start/20 hover:shadow-dark-accent-start/40" onClick={handleDelete}>{t.delete}</Button>
                    </div>
                </div>
             </Modal>
        </Page>
    );
};
