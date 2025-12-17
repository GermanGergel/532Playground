
import React from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../context';
import { Page, Button, Card, Modal, useTranslation } from '../ui';
import { Trash2, RefreshCw, CloudFog, Cloud } from '../icons';
import { Session } from '../types';
import { BrandedHeader } from './utils';
import { retrySyncPendingSessions } from '../db';

export const HistoryScreen: React.FC = () => {
    const { history, setHistory, fetchHistory } = useApp();
    const t = useTranslation();
    const [isDeleteModalOpen, setIsDeleteModalOpen] = React.useState(false);
    const [sessionToDelete, setSessionToDelete] = React.useState<Session | null>(null);
    const [isLoadingMore, setIsLoadingMore] = React.useState(false);
    const [isSyncing, setIsSyncing] = React.useState(false);

    // TRAFFIC OPTIMIZATION: Only load the last 3 sessions when visiting this screen.
    // The user must access the database directly for older records.
    React.useEffect(() => {
        const loadRecentHistory = async () => {
            setIsLoadingMore(true);
            await fetchHistory(5); // Increased to 5 to catch more pending items
            setIsLoadingMore(false);
        };
        loadRecentHistory();
    }, []);

    const openDeleteModal = (session: Session) => {
        setSessionToDelete(session);
        setIsDeleteModalOpen(true);
    };

    const handleDelete = () => {
        if (!sessionToDelete) return;
        setHistory(prev => prev.filter(s => s.id !== sessionToDelete.id));
        setIsDeleteModalOpen(false);
        setSessionToDelete(null);
    };

    const handleRetrySync = async () => {
        setIsSyncing(true);
        try {
            await retrySyncPendingSessions();
            await fetchHistory(5); // Refresh list
        } finally {
            setIsSyncing(false);
        }
    };

    const pendingSessionsCount = history.filter(s => s.syncStatus === 'pending').length;

    return (
        <Page>
            <BrandedHeader className="mb-8" />
            
            {pendingSessionsCount > 0 && (
                <div className="mb-6 p-4 bg-yellow-900/40 border border-yellow-500/50 rounded-xl flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <CloudFog className="w-6 h-6 text-yellow-400" />
                        <div>
                            <p className="text-sm font-bold text-yellow-200">{pendingSessionsCount} Unsynced Sessions</p>
                            <p className="text-[10px] text-yellow-200/70">Data is safe on device.</p>
                        </div>
                    </div>
                    <Button 
                        variant="ghost" 
                        onClick={handleRetrySync} 
                        disabled={isSyncing}
                        className={`!p-2 text-yellow-400 ${isSyncing ? 'animate-spin' : ''}`}
                    >
                        <RefreshCw className="w-5 h-5" />
                    </Button>
                </div>
            )}

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
                                                    {session.syncStatus === 'pending' && <span className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse" title="Pending Sync"></span>}
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
                            </li>
                        ))}
                    </ul>
                    {isLoadingMore && (
                        <div className="flex justify-center mt-4">
                            <div className="w-6 h-6 border-2 border-dark-accent-start border-t-transparent rounded-full animate-spin"></div>
                        </div>
                    )}
                    {/* Visual cue that only recent history is shown */}
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
