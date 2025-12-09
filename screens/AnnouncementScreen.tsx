import React from 'react';
import { Page, PageHeader, Button, Card, useTranslation } from '../ui';
import { useAnnouncementGenerator } from '../hooks/useAnnouncementGenerator';
import { Upload, Image, Cloud } from '../icons';

export const AnnouncementScreen: React.FC = () => {
    const t = useTranslation();
    const {
        date, setDate,
        time, setTime,
        endTime, setEndTime,
        backgroundImage, handleImageUpload,
        isGenerating,
        handleGenerate,
        weather,
        isLoadingWeather,
        showWeather,
        setShowWeather,
        fetchWeather,
        citySearch, setCitySearch
    } = useAnnouncementGenerator();

    const fileInputRef = React.useRef<HTMLInputElement>(null);

    const baseInput = "w-full p-2 bg-dark-bg/60 rounded border border-white/10 focus:ring-1 focus:ring-dark-accent-start focus:outline-none text-center font-bold text-sm text-white appearance-none";
    const cardNeonClasses = "shadow-lg shadow-dark-accent-start/20 border border-dark-accent-start/40";

    const triggerFileUpload = () => {
        fileInputRef.current?.click();
    };

    return (
        <Page>
            <input
                type="file"
                ref={fileInputRef}
                onChange={handleImageUpload}
                accept="image/*"
                className="hidden"
            />
            <PageHeader title={t.announcementGeneratorTitle} />
            <div className="space-y-6">
                <Card className={`${cardNeonClasses} !p-3`}>
                    <div className="flex flex-col gap-3">
                        <div className="grid grid-cols-7 gap-2 items-center">
                            <div className="col-span-3">
                                <label className="block text-[9px] font-bold text-dark-text-secondary uppercase mb-1 text-center">{t.posterDate}</label>
                                <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={baseInput} />
                            </div>
                            <div className="col-span-2">
                                <label className="block text-[9px] font-bold text-dark-text-secondary uppercase mb-1 text-center">{t.posterTime}</label>
                                <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className={baseInput} />
                            </div>
                             <div className="col-span-2">
                                <label className="block text-[9px] font-bold text-dark-text-secondary uppercase mb-1 text-center">{t.posterEndTime}</label>
                                <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className={baseInput} />
                            </div>
                        </div>

                         <div className="grid grid-cols-2 gap-2">
                            <Button 
                                variant="secondary" 
                                onClick={triggerFileUpload} 
                                className="!py-3 flex items-center justify-center gap-2 font-chakra font-bold text-xl tracking-wider border-dashed border-2 border-dark-text-secondary/30 hover:border-dark-accent-start/50 shadow-lg shadow-dark-accent-start/20 hover:shadow-dark-accent-start/40"
                            >
                                {backgroundImage ? (
                                    <>
                                        <Image className="w-5 h-5 text-dark-accent-start" />
                                        {t.changeBackground}
                                    </>
                                ) : (
                                    <>
                                        <Upload className="w-5 h-5" />
                                        {t.uploadBackground}
                                    </>
                                )}
                            </Button>
                            
                            <div className="flex flex-col gap-2">
                                <input 
                                    type="text" 
                                    value={citySearch}
                                    onChange={(e) => setCitySearch(e.target.value)}
                                    placeholder="City (Optional)"
                                    className="w-full p-2 bg-dark-bg/60 rounded border border-white/10 text-xs text-center text-white placeholder:text-white/30 focus:outline-none focus:border-dark-accent-start"
                                />
                                <Button 
                                    variant={showWeather ? "primary" : "secondary"}
                                    onClick={() => {
                                        if (showWeather) {
                                            setShowWeather(false);
                                        } else {
                                            fetchWeather();
                                        }
                                    }}
                                    disabled={isLoadingWeather}
                                    className="!py-2 flex items-center justify-center gap-2 !text-xs w-full shadow-lg shadow-dark-accent-start/20 hover:shadow-dark-accent-start/40"
                                >
                                    <Cloud className="w-4 h-4" />
                                    {isLoadingWeather ? 'Loading...' : 'Update Weather'}
                                </Button>
                            </div>
                        </div>
                    </div>
                </Card>

                <Card className={`${cardNeonClasses} p-2 flex justify-center bg-dark-bg/50`}>
                    <div className="overflow-hidden rounded-lg bg-dark-bg w-full aspect-[3/4]">
                        {backgroundImage ? (
                            <img src={backgroundImage} alt="Preview" className="w-full h-full object-cover" />
                        ) : (
                             <div className="w-full h-full bg-dark-surface flex items-center justify-center text-center p-4">
                                <p className="text-dark-text-secondary text-sm">Upload a background to see the preview.</p>
                            </div>
                        )}
                    </div>
                </Card>

                <Button
                    variant="secondary"
                    onClick={handleGenerate}
                    disabled={isGenerating || !backgroundImage}
                    className="w-full font-chakra font-bold text-xl tracking-wider !py-3 shadow-lg shadow-dark-accent-start/20 hover:shadow-dark-accent-start/40"
                >
                    {isGenerating ? 'Generating...' : t.generateAndShare}
                </Button>
            </div>
        </Page>
    );
};