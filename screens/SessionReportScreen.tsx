
import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApp } from '../context';
import { Page, Button, Modal, useTranslation } from '../ui';
import { shareOrDownloadImages, exportSessionAsJson } from '../services/export';
import { BrandedHeader, newId } from './utils';
import { ShareableReport } from './StatisticsScreen';
import { YouTubeIcon } from '../icons';
import { saveHistoryToDB } from '../db';

const BrandedShareableReport: React.FC<{
    session: any;
    children: React.ReactNode;
    className?: string;
    style?: React.CSSProperties;
    [key: string]: any;
}> = ({ session, children, className, style, ...props }) => {
    const PADDING = 40;
    const containerStyle: React.CSSProperties = {
        padding: `${PADDING}px`,
        paddingBottom: `${PADDING + 40}px`,
        backgroundColor: '#1A1D24', // Unified solid background
        boxSizing: 'border-box',
        ...style,
    };

    return (
        <div 
            className={`flex flex-col items-center text-dark-text ${className}`} 
            style={containerStyle}
            data-export-target="true"
            {...props}
        >
            {children}
        </div>
    );
};

export const SessionReportScreen: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const { history, setHistory, isLoading } = useApp();
    const t = useTranslation();
    const navigate = useNavigate();
    const [isDownloadModalOpen, setIsDownloadModalOpen] = React.useState(false);
    const [isExporting, setIsExporting] = React.useState(false);
    const exportContainerRef = React.useRef<HTMLDivElement>(null);

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
    
    const handleExport = async (section: 'standings' | 'players') => {
        if (isExporting || !exportContainerRef.current || !session) return;
        setIsExporting(true);

        await new Promise(res => setTimeout(res, 50));

        const targetElement = exportContainerRef.current.querySelector(`[data-export-section="${section}"]`) as HTMLElement | null;
        const exportId = `export-target-${section}-${newId()}`;

        if (targetElement) {
            targetElement.id = exportId;
            try {
                await shareOrDownloadImages(exportId, session.sessionName, session.date, section.charAt(0).toUpperCase() + section.slice(1));
            } finally {
                targetElement.id = '';
                setIsExporting(false);
                setIsDownloadModalOpen(false);
            }
        } else {
            console.error(`Export target for section "${section}" not found.`);
            setIsExporting(false);
        }
    };

    const handleVideoLink = async () => {
        const savedLink = session.videoUrl || '';
        let newLink = prompt("YouTube Video Link:", savedLink);
        if (newLink !== null) {
            const updatedSession = { ...session, videoUrl: newLink, syncStatus: 'pending' as const };
            setHistory(prev => prev.map(s => s.id === session.id ? updatedSession : s));
            try {
                await saveHistoryToDB([updatedSession]);
            } catch (error) {
                console.error("Failed to save video link to DB", error);
                alert("Failed to save link to cloud. Check connection.");
            }
        }
    };
    
    const displayDate = new Date(session.date).toLocaleString('en-GB', { year: 'numeric', month: 'long', day: 'numeric' });
    
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
                    <Button variant="secondary" onClick={() => handleExport('standings')} disabled={isExporting} className="w-full font-chakra font-bold text-xl tracking-wider !py-3 shadow-lg shadow-dark-accent-start/20 hover:shadow-dark-accent-start/40">{isExporting ? 'Exporting...' : t.exportStandings}</Button>
                    <Button variant="secondary" onClick={() => handleExport('players')} disabled={isExporting} className="w-full font-chakra font-bold text-xl tracking-wider !py-3 shadow-lg shadow-dark-accent-start/20 hover:shadow-dark-accent-start/40">{isExporting ? 'Exporting...' : t.exportCombined}</Button>
                    <Button variant="secondary" onClick={() => setIsDownloadModalOpen(false)} disabled={isExporting} className="w-full font-chakra font-bold text-xl tracking-wider !py-3 mt-2 shadow-lg shadow-dark-accent-start/20 hover:shadow-dark-accent-start/40">{t.cancel}</Button>
                </div>
            </Modal>
            <div className="w-full max-w-4xl mx-auto">
                 <BrandedHeader className="mb-4" short />
                 <p className="text-dark-text-secondary mb-6">{new Date(session.date).toLocaleDateString('en-GB')}</p>
                
                <ShareableReport session={session} />
                
                <div className="mt-auto pt-6 w-full flex flex-col gap-3">
                    <Button variant="secondary" onClick={() => setIsDownloadModalOpen(true)} className="w-full font-chakra font-bold text-xl tracking-wider !py-3 shadow-lg shadow-dark-accent-start/20 hover:shadow-dark-accent-start/40">{t.saveTable}</Button>
                    <Button variant="secondary" onClick={() => exportSessionAsJson(session)} className="w-full font-chakra font-bold text-xl tracking-wider !py-3 shadow-lg shadow-dark-accent-start/20 hover:shadow-dark-accent-start/40">{t.exportJson}</Button>
                    
                    <Button 
                        variant="secondary" 
                        onClick={handleVideoLink} 
                        className="w-full font-chakra font-bold text-xl tracking-wider !py-3 shadow-lg shadow-dark-accent-start/20 hover:shadow-dark-accent-start/40 flex items-center justify-center gap-2"
                    >
                        <YouTubeIcon className="w-6 h-6 text-gray-500" />
                        {session.videoUrl ? 'EDIT VIDEO LINK' : 'ADD VIDEO LINK'}
                    </Button>
                </div>
            </div>

            {/* Hidden elements for branded export */}
            <div 
                style={{ position: 'absolute', top: 0, left: 0, zIndex: -1, opacity: 0, pointerEvents: 'none', display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'center' }} 
                ref={exportContainerRef}
            >
                <BrandedShareableReport session={session} data-export-section="standings" style={{ width: '600px' }}>
                    <div className="mb-2 w-full"><BrandedHeader isExport={true} /></div>
                    <p className="font-chakra text-dark-text mb-4 text-xl font-medium tracking-wider uppercase">{displayDate}</p>
                    <ShareableReport session={session} visibleSection="standings" isExport={true} />
                </BrandedShareableReport>

                <BrandedShareableReport 
                    session={session} 
                    data-export-section="players"
                    style={{ width: '900px' }}
                >
                    <div className="mb-2 w-full"><BrandedHeader isExport={true} /></div>
                    <div className="flex w-full items-stretch gap-4">
                        <div className="w-[60%] flex flex-col items-center">
                            <ShareableReport session={session} visibleSection="players" isExport={true} />
                            <div className="mt-8 font-bold text-lg text-white shrink-0">
                                #532Playground #SessionReport
                            </div>
                        </div>
                        <div className="w-[40%]">
                            <ShareableReport session={session} visibleSection="rounds" isExport={true} />
                        </div>
                    </div>
                </BrandedShareableReport>
            </div>
        </Page>
    );
};
