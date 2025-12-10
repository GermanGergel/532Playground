
import React from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../context';
import { Page, Button, Card, Modal, useTranslation } from '../ui';
import { Trash2, Zap } from '../icons';
import { Session } from '../types';
import { BrandedHeader } from './utils';
import { processFinishedSession } from '../services/sessionProcessor';
import { savePlayersToDB, saveNewsToDB, saveSingleSessionToDB, deleteSessionFromDB } from '../db';

export const HistoryScreen: React.FC = () => {
    const { history, setHistory, allPlayers, setAllPlayers, newsFeed, setNewsFeed } = useApp();
    const t = useTranslation();
    
    // Deletion State
    const [isDeleteModalOpen, setIsDeleteModalOpen] = React.useState(false);
    const [sessionToDelete, setSessionToDelete] = React.useState<Session | null>(null);
    const [isProcessing, setIsProcessing] = React.useState(false);

    // Recalculation State
    const [isRecalcModalOpen, setIsRecalcModalOpen] = React.useState(false);
    const [sessionToRecalc, setSessionToRecalc] = React.useState<Session | null>(null);

    const openDeleteModal = (session: Session) => {
        setSessionToDelete(session);
        setIsDeleteModalOpen(true);
    };

    const handleDelete = async () => {
        if (!sessionToDelete) return;
        setIsProcessing(true);
        try {
            // Explicitly delete from cloud/local storage
            await deleteSessionFromDB(sessionToDelete.id);
            // Update local state (triggers cache save via Context)
            setHistory(prev => prev.filter(s => s.id !== sessionToDelete.id));
            setIsDeleteModalOpen(false);
            setSessionToDelete(null);
        } catch (error) {
            console.error("Delete failed:", error);
            alert("Failed to delete session.");
        } finally {
            setIsProcessing(false);
        }
    };

    const openRecalcModal = (session: Session) => {
        setSessionToRecalc(session);
        setIsRecalcModalOpen(true);
    };

    const handleRecalculate = async () => {
        if (!sessionToRecalc || isProcessing) return;
        setIsProcessing(true);

        try {
            // Apply logic to CURRENT players based on the session data
            const {
                updatedPlayers,
                playersToSave,
                finalSession,
                updatedNewsFeed
            } = processFinishedSession({
                session: sessionToRecalc,
                oldPlayers: allPlayers, // Uses the current global player state
                newsFeed: newsFeed,
            });

            // 1. Explicit Cloud Sync for Players
            if (playersToSave.length > 0) {
                await savePlayersToDB(playersToSave);
            }
            // Update state (triggers local cache save)
            setAllPlayers(updatedPlayers);

            // 2. Explicit Cloud Sync for News
            if (updatedNewsFeed.length > newsFeed.length) {
                await saveNewsToDB(updatedNewsFeed);
            }
            // Update state (triggers local cache save)
            setNewsFeed(updatedNewsFeed);

            // 3. Explicit Cloud Sync for Session
            // ONLY sync the single session that changed
            await saveSingleSessionToDB(finalSession);
            
            // 4. Update History State (Replace the old session object with the new one)
            setHistory(prev => prev.map(s => s.id === finalSession.id ? finalSession : s));

            alert("Session recalculated and stats updated successfully!");
        } catch (error) {
            console.error("Recalculation failed:", error);
            alert("Failed to recalculate statistics. Check console for details.");
        } finally {
            setIsProcessing(false);
            setIsRecalcModalOpen(false);
            setSessionToRecalc(null);
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
                            
                            <div className="flex flex-col gap-1">
                                {/* Recalculate Button */}
                                <Button
                                    variant="ghost"
                                    className="!p-2 !text-yellow-400 bg-dark-surface/50 hover:bg-white/10"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        openRecalcModal(session);
                                    }}
                                    title={t.recalculateStats}
                                    disabled={isProcessing}
                                >
                                    <Zap className="w-5 h-5"/>
                                </Button>

                                {/* Delete Button */}
                                <Button
                                    variant="ghost"
                                    className="!p-2 !text-red-500 bg-dark-surface/50 hover:bg-white/10"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        openDeleteModal(session);
                                    }}
                                    disabled={isProcessing}
                                >
                                    <Trash2 className="w-5 h-5"/>
                                </Button>
                            </div>
                        </li>
                    ))}
                </ul>
            )}
            
             {/* Delete Confirmation Modal */}
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
                        <Button variant="secondary" onClick={() => setIsDeleteModalOpen(false)} className="w-full shadow-lg shadow-dark-accent-start/20 hover:shadow-dark-accent-start/40" disabled={isProcessing}>{t.cancel}</Button>
                        <Button variant="secondary" className="w-full shadow-lg shadow-dark-accent-start/20 hover:shadow-dark-accent-start/40 !text-red-400" onClick={handleDelete} disabled={isProcessing}>
                            {isProcessing ? "..." : t.delete}
                        </Button>
                    </div>
                </div>
             </Modal>

             {/* Recalculate Confirmation Modal */}
             <Modal 
                isOpen={isRecalcModalOpen} 
                onClose={() => setIsRecalcModalOpen(false)} 
                size="xs"
                hideCloseButton
                containerClassName="border border-yellow-500/40 shadow-[0_0_20px_rgba(255,200,0,0.3)]"
             >
                <div className="flex flex-col gap-4 text-center">
                    <h3 className="text-xl font-bold text-yellow-400 uppercase">{t.recalculateConfirm}</h3>
                    <p className="text-sm text-white/80 leading-relaxed">
                        {t.recalculateWarning}
                    </p>
                    <div className="flex justify-center gap-3 mt-2">
                        <Button variant="secondary" onClick={() => setIsRecalcModalOpen(false)} className="w-full">{t.cancel}</Button>
                        <Button 
                            variant="secondary" 
                            className="w-full !text-yellow-400 border-yellow-500/30 hover:bg-yellow-500/10" 
                            onClick={handleRecalculate}
                            disabled={isProcessing}
                        >
                            {isProcessing ? "..." : t.confirm}
                        </Button>
                    </div>
                </div>
             </Modal>
        </Page>
    );
};
