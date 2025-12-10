import React from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../context';
import { Page, Button, Card, Modal, useTranslation } from '../ui';
import { Trash2, RefreshCw } from '../icons';
import { Session, Player, NewsItem } from '../types';
import { BrandedHeader } from './utils';
import { processFinishedSession } from '../services/sessionProcessor';
import { savePlayersToDB, saveNewsToDB } from '../db';

export const HistoryScreen: React.FC = () => {
    const { history, setHistory, allPlayers, setAllPlayers, newsFeed, setNewsFeed } = useApp();
    const t = useTranslation();
    const [isDeleteModalOpen, setIsDeleteModalOpen] = React.useState(false);
    const [sessionToDelete, setSessionToDelete] = React.useState<Session | null>(null);
    const [isRecalculateModalOpen, setIsRecalculateModalOpen] = React.useState(false);
    const [sessionToRecalculate, setSessionToRecalculate] = React.useState<Session | null>(null);
    const [isProcessing, setIsProcessing] = React.useState(false);

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

    const openRecalculateModal = (session: Session) => {
        setSessionToRecalculate(session);
        setIsRecalculateModalOpen(true);
    };

    const handleRecalculate = async () => {
        if (!sessionToRecalculate || isProcessing) return;
    
        setIsProcessing(true);
        try {
            // Step 1: Process data purely in memory, forcing re-evaluation
            const {
                updatedPlayers,
                playersToSave,
                updatedNewsFeed
            } = processFinishedSession({
                session: sessionToRecalculate,
                oldPlayers: allPlayers,
                newsFeed: newsFeed,
                force: true, // Force recalculation, ignoring local `processedSessionIds`
            });
    
            // If processFinishedSession determines no actual changes are needed (e.g., no players participated)
            if (playersToSave.length === 0) {
                alert("No new statistics to calculate for this session.");
                setIsProcessing(false);
                setIsRecalculateModalOpen(false);
                setSessionToRecalculate(null);
                return;
            }
    
            // Step 2: Attempt to save to the database FIRST. This will throw on failure.
            await savePlayersToDB(playersToSave);
            await saveNewsToDB(updatedNewsFeed);
            
            // Step 3: ONLY on successful save, update the local React state.
            setAllPlayers(updatedPlayers); 
            setNewsFeed(updatedNewsFeed);
            
            alert("Statistics successfully recalculated and saved to the cloud!");
    
        } catch (error) {
            console.error("Error recalculating session:", error);
            alert("Failed to save recalculated data to the cloud. Please check your connection and try again. No local data has been changed.");
        } finally {
            setIsProcessing(false);
            setIsRecalculateModalOpen(false);
            setSessionToRecalculate(null);
        }
    };


    return (
        <Page>
            <BrandedHeader className="mb-8" />
            {history.length === 0 ? (
                <p className="text-center text-dark-text-secondary">{t.noSessionsFound}</p>
            ) : (
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
                             <Button
                                variant="ghost"
                                className="!p-3 !text-white shadow-lg shadow-dark-accent-start/20 hover:shadow-dark-accent-start/40"
                                style={{ textShadow: '0 0 10px #00F2FE, 0 0 15px #00F2FE' }}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    openRecalculateModal(session);
                                }}
                            >
                                <RefreshCw className="w-5 h-5"/>
                            </Button>
                             <Button
                                variant="ghost"
                                className="!p-3 !text-white shadow-lg shadow-dark-accent-start/20 hover:shadow-dark-accent-start/40"
                                style={{ textShadow: '0 0 10px #00F2FE, 0 0 15px #00F2FE' }}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    openDeleteModal(session);
                                }}
                            >
                                <Trash2 className="w-5 h-5"/>
                            </Button>
                        </li>
                    ))}
                </ul>
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
             <Modal 
                isOpen={isRecalculateModalOpen} 
                onClose={() => setIsRecalculateModalOpen(false)} 
                size="xs"
                hideCloseButton
                containerClassName="border border-dark-accent-start/40 shadow-[0_0_20px_rgba(0,242,254,0.3)]"
             >
                <div className="flex flex-col gap-4 text-center">
                    <h3 className="text-xl font-bold text-dark-text">{t.recalculateStatsTitle}</h3>
                    <p className="text-sm text-dark-text-secondary">{t.recalculateStatsDesc}</p>
                    <div className="flex justify-center gap-3">
                        <Button variant="secondary" onClick={() => setIsRecalculateModalOpen(false)} disabled={isProcessing} className="w-full shadow-lg shadow-dark-accent-start/20 hover:shadow-dark-accent-start/40">{t.cancel}</Button>
                        <Button variant="secondary" className="w-full shadow-lg shadow-dark-accent-start/20 hover:shadow-dark-accent-start/40" onClick={handleRecalculate} disabled={isProcessing}>
                            {isProcessing ? t.loading : t.recalculateStats}
                        </Button>
                    </div>
                </div>
             </Modal>
        </Page>
    );
};