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
    const [isLoadingWeather, setIsLoadingWeather] = useState(false);

    // Initial Weather Fetch
    useEffect(() => {
        if (isOpen) {
            const fetchInitialWeather = async () => {
                setIsLoadingWeather(true);
                const today = new Date().toISOString().split('T')[0];
                // Approximate time for weather API (20:00)
                const weatherData = await fetchWeatherForDate(today, "20:00");
                
                if (weatherData) {
                    setTemperature(Math.round(weatherData.temperature) + 2); // Custom adjustment as per user request (+2)
                    
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

    const inputClass = "w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white font-chakra font-bold text-sm focus:border-[#00F2FE] focus:outline-none transition-colors";
    const labelClass = "text-[10px] font-black text-white/40 uppercase tracking-[0.2em] mb-2 block";

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            size="sm"
            hideCloseButton
            containerClassName="!bg-[#0a0c10] border border-white/10 shadow-2xl overflow-hidden"
        >
            <div className="relative">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#00F2FE] to-transparent opacity-50"></div>
                
                <h2 className="text-center font-russo text-xl text-white uppercase tracking-wider mb-6 mt-2">
                    SESSION SUMMARY
                </h2>

                <div className="space-y-5">
                    <div>
                        <label className={labelClass}>LOCATION</label>
                        <div className="flex flex-wrap gap-2 mb-2">
                            {PREDEFINED_LOCATIONS.map(loc => (
                                <button
                                    key={loc}
                                    onClick={() => setLocation(loc)}
                                    className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider border transition-all ${
                                        location === loc 
                                        ? 'bg-[#00F2FE]/20 border-[#00F2FE] text-[#00F2FE]' 
                                        : 'bg-white/5 border-white/5 text-white/40 hover:bg-white/10'
                                    }`}
                                >
                                    {loc}
                                </button>
                            ))}
                        </div>
                        <input 
                            type="text" 
                            value={location} 
                            onChange={(e) => setLocation(e.target.value)} 
                            className={inputClass}
                        />
                    </div>
                    <div>
                        <label className={labelClass}>TIME</label>
                        <input 
                            type="text" 
                            value={timeString} 
                            onChange={(e) => setTimeString(e.target.value)} 
                            className={`${inputClass} text-center tracking-widest`}
                        />
                    </div>
                    <div>
                        <label className={labelClass}>WEATHER REPORT</label>
                        <div className="bg-white/5 rounded-2xl p-3 border border-white/5 flex items-center justify-between">
                            <div className="flex flex-col items-center border-r border-white/10 pr-4">
                                <div className="flex items-center">
                                    <input 
                                        type="number" 
                                        value={temperature}
                                        onChange={(e) => setTemperature(parseInt(e.target.value) || 0)}
                                        className="w-12 bg-transparent text-3xl font-russo text-white text-right focus:outline-none"
                                    />
                                    <span className="text-xl font-russo text-white/50">°C</span>
                                </div>
                                <span className="text-[8px] text-white/30 uppercase tracking-widest">TEMP</span>
                            </div>
                            <div className="flex gap-2 pl-2">
                                <button 
                                    onClick={() => setCondition('clear')}
                                    className={`w-10 h-10 rounded-xl flex items-center justify-center border transition-all ${condition === 'clear' ? 'bg-[#FFD700]/20 border-[#FFD700] text-[#FFD700]' : 'bg-black/40 border-white/10 text-white/20'}`}
                                >
                                    <MoonIcon className="w-5 h-5" />
                                </button>
                                <button 
                                    onClick={() => setCondition('rain')}
                                    className={`w-10 h-10 rounded-xl flex items-center justify-center border transition-all ${condition === 'rain' ? 'bg-[#00F2FE]/20 border-[#00F2FE] text-[#00F2FE]' : 'bg-black/40 border-white/10 text-white/20'}`}
                                >
                                    <RainIcon className="w-5 h-5" />
                                </button>
                                <button 
                                    onClick={() => setCondition('cloud')}
                                    className={`w-10 h-10 rounded-xl flex items-center justify-center border transition-all ${condition === 'cloud' ? 'bg-slate-500/20 border-slate-400 text-slate-300' : 'bg-black/40 border-white/10 text-white/20'}`}
                                >
                                    <CloudIcon className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="mt-8 flex flex-col gap-3">
                    <Button 
                        variant="secondary" 
                        onClick={handleConfirm} 
                        className="w-full font-chakra font-bold text-lg tracking-wider !py-3 shadow-[0_0_20px_rgba(0,242,254,0.2)] border border-[#00F2FE]/30 hover:bg-[#00F2FE]/10"
                    >
                        CONFIRM
                    </Button>
                    <Button 
                        variant="ghost" 
                        onClick={onClose} 
                        className="w-full text-xs font-bold text-white/30 hover:text-white"
                    >
                        CANCEL
                    </Button>
                </div>
            </div>
        </Modal>
    );
};