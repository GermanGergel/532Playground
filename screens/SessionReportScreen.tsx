import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApp } from '../context';
import { Page, Button, Modal, useTranslation } from '../ui';
import { shareOrDownloadImages, exportSessionAsJson } from '../services/export';
import { BrandedHeader } from './utils';
import { BrandedShareableReport, ShareableReport } from './StatisticsScreen';

export const SessionReportScreen: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const { history, isLoading } = useApp();
    const t = useTranslation();
    const navigate = useNavigate();
    const [isDownloadModalOpen, setIsDownloadModalOpen] = React.useState(false);

    const standingsRef = React.useRef<HTMLDivElement>(null);
    const playersRef = React.useRef<HTMLDivElement>(null);
    const roundsRef = React.useRef<HTMLDivElement>(null);

    const session = history.find(s => s.id === id);

    React.useEffect(() => {
        if (!isLoading && !session) {
             navigate('/history'); 
        }
    }, [isLoading, session, navigate]);

    if (isLoading) {
        return <Page><p className="text-center mt-10">{t.loading}</p></Page>;
    }

    if (!session) {
        return null;
    }

     const handleExportStandings = () => {
         if(standingsRef.current) shareOrDownloadImages([standingsRef.current], session.sessionName, session.date, 'Standings');
         setIsDownloadModalOpen(false);
    };
    
    const handleExportPlayers = () => {
        if(playersRef.current) shareOrDownloadImages([playersRef.current], session.sessionName, session.date, 'Players');
        setIsDownloadModalOpen(false);
    };
    
    const handleExportRounds = () => {
         if(roundsRef.current) shareOrDownloadImages([roundsRef.current], session.sessionName, session.date, 'Rounds');
         setIsDownloadModalOpen(false);
    };
    
    return (
        <Page>
             <Modal 
                isOpen={isDownloadModalOpen} 
                onClose={() => setIsDownloadModalOpen(false)} 
                size="xs" 
                hideCloseButton
                containerClassName="border border-dark-accent-start/40 shadow-[0_0_20px_rgba(0,242,254,0.3)]"
            >
                <div className="flex flex-col gap-3">
                    <Button variant="secondary" onClick={handleExportStandings} className="w-full shadow-lg shadow-dark-accent-start/20 hover:shadow-dark-accent-start/40">{t.exportStandings}</Button>
                    <Button variant="secondary" onClick={handleExportPlayers} className="w-full shadow-lg shadow-dark-accent-start/20 hover:shadow-dark-accent-start/40">{t.exportPlayers}</Button>
                    <Button variant="secondary" onClick={handleExportRounds} className="w-full shadow-lg shadow-dark-accent-start/20 hover:shadow-dark-accent-start/40">{t.exportRounds}</Button>
                    <Button variant="secondary" onClick={() => setIsDownloadModalOpen(false)} className="w-full mt-2 shadow-lg shadow-dark-accent-start/20 hover:shadow-dark-accent-start/40">{t.cancel}</Button>
                </div>
            </Modal>
            <div className="w-full max-w-4xl mx-auto">
                 <BrandedHeader className="mb-4" />
                 <p className="text-dark-text-secondary mb-6">{new Date(session.date).toLocaleDateString()}</p>
                
                <div className="space-y-6">
                    <ShareableReport session={session} visibleSection="standings" />
                    <ShareableReport session={session} visibleSection="players" />
                    <ShareableReport session={session} visibleSection="rounds" />
                </div>
                
                <div className="mt-auto pt-6 w-full flex flex-col gap-3">
                    <Button variant="secondary" onClick={() => setIsDownloadModalOpen(true)} className="w-full shadow-lg shadow-dark-accent-start/20 hover:shadow-dark-accent-start/40 uppercase">{t.saveTable}</Button>
                    <Button variant="secondary" onClick={() => exportSessionAsJson(session)} className="w-full shadow-lg shadow-dark-accent-start/20 hover:shadow-dark-accent-start/40 uppercase">{t.exportJson}</Button>
                </div>
            </div>

           {/* Hidden elements for branded export - Positioned to be invisible but renderable */}
            <div style={{ position: 'fixed', top: 0, left: 0, zIndex: -1, visibility: 'hidden', pointerEvents: 'none' }}>
                <BrandedShareableReport ref={standingsRef} session={session} visibleSection="standings" />
                <BrandedShareableReport ref={playersRef} session={session} visibleSection="players" includeHeader={false} />
                <BrandedShareableReport ref={roundsRef} session={session} visibleSection="rounds" includeHeader={false} />
            </div>
        </Page>
    );
};