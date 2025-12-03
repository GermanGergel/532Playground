import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApp } from '../context';
import { Page, Button, Modal, useTranslation } from '../ui';
import { shareOrDownloadImages, exportSessionAsJson } from '../services/export';
import { BrandedHeader } from './utils';
import { ShareableReport } from './StatisticsScreen';
import { calculateAllStats } from '../services/statistics';

// Re-defining BrandedShareableReport locally to avoid import issues
const BrandedShareableReport: React.FC<{
    session: any;
    children: React.ReactNode;
    className?: string;
    style?: React.CSSProperties;
    [key: string]: any;
}> = ({ session, children, className, style, ...props }) => {
    const PADDING = 40;
    const homeScreenBackground = `data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 800 1200'%3e%3cdefs%3e%3cradialGradient id='g' cx='50%25' cy='50%25' r='50%25'%3e%3cstop offset='0%25' stop-color='%2300F2FE' stop-opacity='0.1' /%3e%3cstop offset='100%25' stop-color='%2300F2FE' stop-opacity='0' /%3e%3c/radialGradient%3e%3cfilter id='f'%3e%3cfeTurbulence type='fractalNoise' baseFrequency='0.02 0.05' numOctaves='3' /%3e%3c/filter%3e%3c/defs%3e%3crect width='100%25' height='100%25' fill='%231A1D24' /%3e%3cg stroke='%23FFFFFF' stroke-width='1' stroke-opacity='0.05' fill='none'%3e%3ccircle cx='400' cy='600' r='100' /%3e%3cpath d='M100 1200 H 700 M 100 600 H 700'/%3e%3c/g%3e%3crect x='0' y='0' width='100%25' height='100%25' fill='url(%23g)' /%3e%3crect x='0' y='0' width='100%25' height='100%25' filter='url(%23f)' opacity='0.03' /%3e%3c/svg%3e`;


    const containerStyle: React.CSSProperties = {
        padding: `${PADDING}px`,
        backgroundImage: `url("${homeScreenBackground}")`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
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
    const { history, isLoading } = useApp();
    const t = useTranslation();
    const navigate = useNavigate();
    const [isDownloadModalOpen, setIsDownloadModalOpen] = React.useState(false);
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
    
    const handleExport = (section: 'standings' | 'players') => {
        if (!exportContainerRef.current) return;
        
        const targetElement = exportContainerRef.current.querySelector(`[data-export-section="${section}"]`) as HTMLElement | null;

        if (targetElement) {
            shareOrDownloadImages([targetElement], session.sessionName, session.date, section.charAt(0).toUpperCase() + section.slice(1));
        }
        setIsDownloadModalOpen(false);
    };
    
    const displayDate = new Date(session.date).toLocaleString('en-GB', { year: 'numeric', month: 'long', day: 'numeric' });
    
    const combinedExportBackground = `data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 800 1200'%3e%3cdefs%3e%3cradialGradient id='g' cx='50%25' cy='50%25' r='50%25'%3e%3cstop offset='0%25' stop-color='%2300F2FE' stop-opacity='0.1' /%3e%3cstop offset='100%25' stop-color='%2300F2FE' stop-opacity='0' /%3e%3c/radialGradient%3e%3cfilter id='f'%3e%3cfeTurbulence type='fractalNoise' baseFrequency='0.02 0.05' numOctaves='3' /%3e%3c/filter%3e%3c/defs%3e%3crect width='100%25' height='100%25' fill='%231A1D24' /%3e%3crect x='0' y='0' width='100%25' height='100%25' fill='url(%23g)' /%3e%3crect x='0' y='0' width='100%25' height='100%25' filter='url(%23f)' opacity='0.03' /%3e%3c/svg%3e`;

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
                    <Button variant="secondary" onClick={() => handleExport('standings')} className="w-full shadow-lg shadow-dark-accent-start/20 hover:shadow-dark-accent-start/40">{t.exportStandings}</Button>
                    <Button variant="secondary" onClick={() => handleExport('players')} className="w-full shadow-lg shadow-dark-accent-start/20 hover:shadow-dark-accent-start/40">{t.exportPlayers}</Button>
                    <Button variant="secondary" onClick={() => setIsDownloadModalOpen(false)} className="w-full mt-2 shadow-lg shadow-dark-accent-start/20 hover:shadow-dark-accent-start/40">{t.cancel}</Button>
                </div>
            </Modal>
            <div className="w-full max-w-4xl mx-auto">
                 <BrandedHeader className="mb-4" />
                 <p className="text-dark-text-secondary mb-6">{new Date(session.date).toLocaleDateString('en-GB')}</p>
                
                <ShareableReport session={session} />
                
                <div className="mt-auto pt-6 w-full flex flex-col gap-3">
                    <Button variant="secondary" onClick={() => setIsDownloadModalOpen(true)} className="w-full shadow-lg shadow-dark-accent-start/20 hover:shadow-dark-accent-start/40 uppercase">{t.saveTable}</Button>
                    <Button variant="secondary" onClick={() => exportSessionAsJson(session)} className="w-full shadow-lg shadow-dark-accent-start/20 hover:shadow-dark-accent-start/40 uppercase">{t.exportJson}</Button>
                </div>
            </div>

            {/* Hidden elements for branded export */}
            <div 
                style={{ position: 'absolute', top: 0, left: 0, zIndex: -1, opacity: 0, pointerEvents: 'none', display: 'flex', flexDirection: 'column', gap: '2rem', alignItems: 'flex-start' }} 
                ref={exportContainerRef}
            >
                <BrandedShareableReport session={session} data-export-section="standings" style={{ width: '600px' }}>
                    <div className="mb-4 text-left w-full">
                        <BrandedHeader isExport={true} />
                        <p className="font-chakra text-dark-text mt-8 text-xl font-medium tracking-wider uppercase">{displayDate}</p>
                    </div>
                    <ShareableReport session={session} visibleSection="standings" isExport={true} />
                </BrandedShareableReport>

                <BrandedShareableReport 
                    session={session} 
                    data-export-section="players"
                    style={{ 
                        width: '900px',
                        backgroundImage: `url("${combinedExportBackground}")`
                    }}
                >
                    <div className="flex w-full items-start gap-4">
                        <div className="w-[60%]">
                            <ShareableReport session={session} visibleSection="players" isExport={true} />
                        </div>
                        <div className="w-[40%]">
                            <ShareableReport session={session} visibleSection="rounds" isExport={true} />
                        </div>
                    </div>
                    <div className="w-full text-center mt-4 font-bold text-lg text-white" style={{ textShadow: '0 0 5px rgba(255, 255, 255, 0.5)' }}>
                        #532Playground #SessionReport
                    </div>
                </BrandedShareableReport>
            </div>
        </Page>
    );
};
