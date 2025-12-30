import React, { useState, useEffect } from 'react';
import { Modal, Button, useTranslation } from '../components/ui';
import { fetchWeatherForDate } from '../services/weather';
import { WeatherCondition } from '../types';

// Local Icons for this modal to ensure style consistency
const MoonIcon = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
    </svg>
);

const CloudIcon = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M17.5 19c0-1.7-1.3-3-3-3h-1.1c-.2-3.4-3.1-6-6.5-6-3.8 0-6.8 3.1-6.8 7s3 7 6.8 7h8a4 4 0 0 0 2.6-7.3Z" />
    </svg>
);

const RainIcon = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242" />
        <path d="M16 14v6" />
        <path d="M8 14v6" />
        <path d="M12 16v6" />
    </svg>
);

const SunIcon = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2" />
        <path d="M12 20v2" />
        <path d="m4.93 4.93 1.41 1.41" />
        <path d="m17.66 17.66 1.41 1.41" />
        <path d="M2 12h2" />
        <path d="M20 12h2" />
        <path d="m6.34 17.66-1.41 1.41" />
        <path d="m19.07 4.93-1.41 1.41" />
    </svg>
);

export interface SessionSummaryData {
    location: string;
    timeString: string;
    weather: {
        temperature: number;
        condition: WeatherCondition;
    };
}

interface SessionSummaryModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (data: SessionSummaryData) => void;
}

const PREDEFINED_LOCATIONS = [
    "Sân bóng đá Phan Tứ",
    "My An Sport Center"
];

export const SessionSummaryModal: React.FC<SessionSummaryModalProps> = ({ isOpen, onClose, onConfirm }) => {
    const t = useTranslation();
    
    // State
    const [location, setLocation] = useState(PREDEFINED_LOCATIONS[0]);
    const [timeString, setTimeString] = useState("19:30 - 21:00");
    const [temperature, setTemperature] = useState(26);
    const [condition, setCondition] = useState<WeatherCondition>('clear');
    const [isDay, setIsDay] = useState(false);
    const [isLoadingWeather, setIsLoadingWeather] = useState(false);

    // Initial Weather Fetch
    useEffect(() => {
        if (isOpen) {
            const fetchInitialWeather = async () => {
                setIsLoadingWeather(true);
                const today = new Date().toISOString().split('T')[0];
                // Approximate time for weather API (20:00)
                const weatherData = await fetchWeatherForDate(today, "20:00", "Da Nang");
                
                if (weatherData) {
                    setTemperature(Math.round(weatherData.temperature) + 2); // Custom adjustment as per user request (+2)
                    setIsDay(weatherData.isDay);
                    
                    const code = weatherData.weatherCode;
                    if (code >= 51) setCondition('rain');
                    else if (code > 2) setCondition('cloud');
                    else setCondition('clear');
                }
                setIsLoadingWeather(false);
            };
            
            fetchInitialWeather();
        }
    }, [isOpen]);

    const handleConfirm = () => {
        onConfirm({
            location,
            timeString,
            weather: {
                temperature,
                condition
            }
        });
    };

    const inputClass = "w-full bg-black/40 border border-white/10 rounded-lg p-2 text-white font-chakra font-bold text-xs focus:border-[#00F2FE] focus:outline-none transition-colors";
    const labelClass = "text-[8px] font-black text-white/40 uppercase tracking-[0.2em] mb-1.5 block";

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            size="xs"
            hideCloseButton
            containerClassName="!bg-[#0a0c10] border border-white/10 shadow-2xl overflow-hidden !p-5 max-w-[320px] w-full"
        >
            <div className="relative flex flex-col gap-4">
                <div className="absolute -top-5 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-[#00F2FE] to-transparent opacity-50"></div>
                <h2 className="text-center font-russo text-xl text-white uppercase tracking-wider mb-2 mt-2">
                    {t.summary_title}
                </h2>
                <div className="space-y-3">
                    <div>
                        <label className={labelClass}>{t.summary_location}</label>
                        <div className="flex flex-wrap gap-2 mb-2">
                            {PREDEFINED_LOCATIONS.map(loc => (
                                <button key={loc} onClick={() => setLocation(loc)} className={`px-2 py-1 rounded text-[9px] font-bold uppercase tracking-wider border transition-all truncate max-w-full ${location === loc ? 'bg-[#00F2FE]/20 border-[#00F2FE] text-[#00F2FE]' : 'bg-white/5 border-white/5 text-white/40 hover:bg-white/10'}`}>{loc}</button>
                            ))}
                        </div>
                        <input type="text" value={location} onChange={(e) => setLocation(e.target.value)} className={inputClass} />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className={labelClass}>{t.summary_time}</label>
                            <input type="text" value={timeString} onChange={(e) => setTimeString(e.target.value)} className={`${inputClass} text-center`}/>
                        </div>
                        <div>
                            <label className={labelClass}>{t.summary_temp}</label>
                            <div className="flex items-center bg-black/40 border border-white/10 rounded-lg p-1.5 h-[34px]">
                                <input type="number" value={temperature} onChange={(e) => setTemperature(parseInt(e.target.value) || 0)} className="w-full bg-transparent text-lg font-russo text-white text-center focus:outline-none"/>
                                <span className="text-xs font-russo text-white/50 pr-1">°C</span>
                            </div>
                        </div>
                    </div>
                    <div>
                        <label className={labelClass}>{t.summary_condition}</label>
                        <div className="flex gap-2">
                            <button onClick={() => { setCondition('clear'); setIsDay(true); }} className={`flex-1 h-9 rounded-lg flex items-center justify-center border transition-all ${condition === 'clear' && isDay ? 'bg-[#FFA500]/20 border-[#FFA500] text-[#FFA500]' : 'bg-white/5 border-white/5 text-white/20'}`}><SunIcon className="w-4 h-4" /></button>
                            <button onClick={() => { setCondition('clear'); setIsDay(false); }} className={`flex-1 h-9 rounded-lg flex items-center justify-center border transition-all ${condition === 'clear' && !isDay ? 'bg-[#FFD700]/20 border-[#FFD700] text-[#FFD700]' : 'bg-white/5 border-white/5 text-white/20'}`}><MoonIcon className="w-4 h-4" /></button>
                            <button onClick={() => setCondition('cloud')} className={`flex-1 h-9 rounded-lg flex items-center justify-center border transition-all ${condition === 'cloud' ? 'bg-slate-500/20 border-slate-400 text-slate-300' : 'bg-white/5 border-white/5 text-white/20'}`}><CloudIcon className="w-4 h-4" /></button>
                            <button onClick={() => setCondition('rain')} className={`flex-1 h-9 rounded-lg flex items-center justify-center border transition-all ${condition === 'rain' ? 'bg-[#00F2FE]/20 border-[#00F2FE] text-[#00F2FE]' : 'bg-white/5 border-white/5 text-white/20'}`}><RainIcon className="w-4 h-4" /></button>
                        </div>
                    </div>
                </div>
                <div className="mt-2 flex gap-3">
                    <Button variant="ghost" onClick={onClose} className="flex-1 bg-white/5 border border-white/10 hover:bg-white/10 text-xs font-bold text-white/50 hover:text-white h-10 rounded-xl">{t.cancel.toUpperCase()}</Button>
                    <Button variant="secondary" onClick={handleConfirm} className="flex-1 font-chakra font-bold text-sm tracking-wider h-10 shadow-[0_0_15px_rgba(0,242,254,0.15)] border border-[#00F2FE]/30 hover:bg-[#00F2FE]/10 rounded-xl">{t.confirm.toUpperCase()}</Button>
                </div>
            </div>
        </Modal>
    );
};