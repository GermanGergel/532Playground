
import React from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../context';
import { Page, Button, Card, Modal, useTranslation } from '../ui';
import { Trash2, RefreshCw } from '../icons';
import { Session } from '../types';
import { BrandedHeader } from './utils';
import { processFinishedSession } from '../services/sessionProcessor';
import { savePlayersToDB, saveNewsToDB, saveHistoryToDB, DbResult } from '../db';

export const HistoryScreen: React.FC = () => {
    const { history, setHistory, allPlayers, setAllPlayers, newsFeed, setNewsFeed } = useApp();
    const t = useTranslation();
    const [isDeleteModalOpen, setIsDeleteModalOpen] = React.useState(false);
    const [isRecalcModalOpen, setIsRecalcModalOpen] = React.useState(false);
    const [sessionToDelete, setSessionToDelete] = React.useState<Session | null>(null);
    const [sessionToRecalc, setSessionToRecalc] = React.useState<Session | null>(null);
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

    const openRecalcModal = (session: Session) => {
        setSessionToRecalc(session);
        setIsRecalcModalOpen(true);
    };

    const handleRecalculate = async () => {
        if (!sessionToRecalc || isProcessing) return;
        setIsProcessing(true);

        try {
            // Process the session using the current state of players
            const {
                updatedPlayers,
                playersToSave,
                finalSession,
                updatedNewsFeed
            } = processFinishedSession({
                session: sessionToRecalc,
                oldPlayers: allPlayers,
                newsFeed: newsFeed,
            });

            const results: DbResult[] = [];

            // Save to DB
            if (playersToSave.length > 0) {
                const res = await savePlayersToDB(playersToSave);
                results.push(res);
                setAllPlayers(updatedPlayers);
            }

            if (updatedNewsFeed.length > newsFeed.length) {
                const res = await saveNewsToDB(updatedNewsFeed);
                results.push(res);
                setNewsFeed(updatedNewsFeed);
            }
            
            const histRes = await saveHistoryToDB([finalSession]); 
            results.push(histRes);
            
            // Update local history state if the session object changed
            setHistory(prev => prev.map(s => s.id === finalSession.id ? finalSession : s));

            // Check for any cloud failures
            const failures = results.filter(r => !r.success);
            if (failures.length > 0) {
                // Combine unique error messages
                const errors = Array.from(new Set(failures.map(f => f.message))).join('\n');
                alert(`⚠️ Stats recalculated and saved LOCALLY, but Cloud Sync failed:\n${errors}\n\nCheck your internet or Supabase RLS policies.`);
            } else {
                alert('Stats recalculated and saved successfully to Cloud and Device!');
            }

            setIsRecalcModalOpen(false);
            setSessionToRecalc(null);

        } catch (error) {
            console.error("Recalculation error:", error);
            alert("Failed to recalculate stats. Check console.");
        } finally {
            setIsProcessing(false);
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
                            <div className="flex flex-col gap-2">
                                <Button
                                    variant="ghost"
                                    className="!p-2 !text-white shadow-lg shadow-green-500/20 hover:shadow-green-500/40"
                                    title="Recalculate Stats"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        openRecalcModal(session);
                                    }}
                                >
                                    <RefreshCw className="w-5 h-5" />
                                </Button>
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
                isOpen={isRecalcModalOpen} 
                onClose={() => setIsRecalcModalOpen(false)} 
                size="xs"
                hideCloseButton
                containerClassName="border border-green-500/40 shadow-[0_0_20px_rgba(76,255,95,0.3)]"
             >
                <div className="flex flex-col gap-4 text-center">
                    <h3 className="text-xl font-bold text-dark-text">Force Update Stats?</h3>
                    <p className="text-sm text-dark-text-secondary">
                        This will re-run the rating and badge calculations for this session and force-update the player database. Use this if the stats were not saved correctly after the match.
                    </p>
                    <div className="flex justify-center gap-3">
                        <Button variant="secondary" onClick={() => setIsRecalcModalOpen(false)} disabled={isProcessing} className="w-full shadow-lg">{t.cancel}</Button>
                        <Button variant="primary" className="w-full shadow-lg !text-dark-bg" onClick={handleRecalculate} disabled={isProcessing}>
                            {isProcessing ? 'Processing...' : 'Update'}
                        </Button>
                    </div>
                </div>
             </Modal>
        </Page>
    );
};
