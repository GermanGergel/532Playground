
import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../context';
import { Page, Button, Card, Modal, useTranslation } from '../ui';
import { Trash2, Cloud } from '../icons';
import { Session } from '../types';
import { BrandedHeader } from './utils';
import { retrySyncPendingSessions, deleteSessionFromDB } from '../db';

export const HistoryScreen: React.FC = () => {
    const { history, setHistory, fetchHistory } = useApp();
    const t = useTranslation();
    const [isDeleteModalOpen, setIsDeleteModalOpen] = React.useState(false);
    const [sessionToDelete, setSessionToDelete] = React.useState<Session | null>(null);
    const [isLoadingMore, setIsLoadingMore] = React.useState(false);

    // AUTO-SYNC LOGIC:
    useEffect(() => {
        const syncAndRefresh = async () => {
            setIsLoadingMore(true);
            
            // 1. Try to push any local-only sessions to the cloud
            await retrySyncPendingSessions(); 
            
            // 2. Fetch the latest history (this updates the UI from Yellow -> Green if successful)
            await fetchHistory(5); 
            
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
        
        // 1. Optimistically update UI
        setHistory(prev => prev.filter(s => s.id !== sessionToDelete.id));
        
        // 2. Perform actual deletion (Local IDB overwrite + Cloud)
        await deleteSessionFromDB(sessionToDelete.id);
        
        setIsDeleteModalOpen(false);
        setSessionToDelete(null);
    };

    const handleRetrySync = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        
        const result = await retrySyncPendingSessions();
        
        if (result.cloudSaved) {
            await fetchHistory(5);
            // Optional: Success message
            // alert("Sync successful!");
        } else {
            // Show the exact error why it failed
            alert(`Sync Failed: ${result.message || "Unknown Error"}. Check your connection or database limits.`);
        }
    };

    return (
        <Page>
            <BrandedHeader className="mb-8" />
            
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
                                                            onClick={handleRetrySync} 
                                                            className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse cursor-pointer hover:scale-150 transition-transform" 
                                                            title="Sync Pending - Click to Retry" 
                                                        />
                                                    )}
                                                </h3>
                                                <p className="text-xs text-dark-text-secondary">{new Date(session.date).toLocaleDateString()}</p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {session.syncStatus === 'synced' && <Cloud className="w-3 h-3 text-green-500 opacity-70" />}
                                                <span className="text-[9px] font-semibold uppercase px-1.5 py-0.5 bg-dark-bg rounded-full flex-shrink-0 ml-2">{t.finished}</span>
                                            </div>
                                        </div>
                                    </Card>
                                </Link>
                                <div className="flex flex-col gap-2">
                                    {/* Delete button only for pending/local sessions as requested */}
                                    {session.syncStatus !== 'synced' && (
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
                                    )}
                                </div>
                            </li>
                        ))}
                    </ul>
                    {isLoadingMore && (
                        <div className="flex justify-center mt-4">
                            <div className="w-6 h-6 border-2 border-dark-accent-start border-t-transparent rounded-full animate-spin"></div>
                        </div>
                    )}
                    {!isLoadingMore && history.length >= 3 && (
                        <p className="text-center text-[10px] text-dark-text-secondary mt-6 uppercase tracking-widest opacity-50">
                            Showing recent sessions
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
                    <div className="flex justify-center gap-3">
                        <Button variant="secondary" onClick={() => setIsDeleteModalOpen(false)} className="w-full shadow-lg shadow-dark-accent-start/20 hover:shadow-dark-accent-start/40">{t.cancel}</Button>
                        <Button variant="secondary" className="w-full shadow-lg shadow-dark-accent-start/20 hover:shadow-dark-accent-start/40" onClick={handleDelete}>{t.delete}</Button>
                    </div>
                </div>
             </Modal>
        </Page>
    );
};
