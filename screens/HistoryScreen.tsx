import React from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../context';
import { Page, Button, Card, Modal, useTranslation } from '../ui';
import { Trash2 } from '../icons';
import { Session } from '../types';
import { BrandedHeader } from './utils';

export const HistoryScreen: React.FC = () => {
    const { history, setHistory, fetchHistory } = useApp();
    const t = useTranslation();
    const [isDeleteModalOpen, setIsDeleteModalOpen] = React.useState(false);
    const [sessionToDelete, setSessionToDelete] = React.useState<Session | null>(null);
    const [isLoadingMore, setIsLoadingMore] = React.useState(false);

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

    // THIS LOGIC WAS THE CAUSE OF THE BUG.
    // It was forcing a fetch from the cloud on screen load, overwriting the local state
    // that contained the unsynced session. By removing it, the component will now
    // correctly display whatever is in the AppContext, including local-only data.
    // React.useEffect(() => {
    //     const loadRecentHistory = async () => {
    //         setIsLoadingMore(true);
    //         await fetchHistory(3);
    //         setIsLoadingMore(false);
    //     };
    //     loadRecentHistory();
    // }, []);

    const handleLoadMore = async () => {
        setIsLoadingMore(true);
        // Fetch all history when user requests it
        await fetchHistory(); 
        setIsLoadingMore(false);
    }

    // Determine if "Load More" should be shown. This is a simplified check.
    // A more robust system might track if all items have been fetched.
    const canLoadMore = history.length < 50; // Assuming 50 is a reasonable max to display initially.

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
                                    <Card className="hover:bg-white/10 transition-colors duration-300 shadow-lg shadow-dark-accent-start/20 hover:shadow-dark-accent-start/40 !p-3">
                                        <div className="flex justify-between items-center">
                                            <div className="overflow-hidden">
                                                <h3 className="font-bold text-base truncate">{session.sessionName}</h3>
                                                <p className="text-xs text-dark-text-secondary">{new Date(session.date).toLocaleDateString()}</p>
                                            </div>
                                            <span className="text-[9px] font-semibold uppercase px-1.5 py-0.5 bg-dark-bg rounded-full flex-shrink-0 ml-2">{t.finished}</span>
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
                    {canLoadMore && !isLoadingMore && (
                        <div className="mt-6 text-center">
                            <Button variant="secondary" onClick={handleLoadMore}>
                                Load Full History
                            </Button>
                        </div>
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