
import React from 'react';
import { generateAndSharePoster } from '../services/posterGenerator';
import { fetchWeatherForDate, WeatherData } from '../services/weather';

const getInitialDate = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
};

export const useAnnouncementGenerator = () => {
    const [date, setDate] = React.useState(getInitialDate());
    const [time, setTime] = React.useState('19:30');
    const [endTime, setEndTime] = React.useState('21:00');
    const [backgroundImage, setBackgroundImage] = React.useState<string | null>(null);
    const [isGenerating, setIsGenerating] = React.useState(false);
    
    // Weather State
    const [weather, setWeather] = React.useState<WeatherData | null>(null);
    const [isLoadingWeather, setIsLoadingWeather] = React.useState(false);
    const [showWeather, setShowWeather] = React.useState(false);
    // Default to Da Nang as requested for testing
    const [citySearch, setCitySearch] = React.useState('Da Nang');

    const handleGenerate = async () => {
        if (!backgroundImage) {
            alert("Please upload a background image first.");
            return;
        }
        setIsGenerating(true);
        try {
            await generateAndSharePoster({
                date,
                time,
                endTime,
                backgroundImage,
                weather: showWeather ? weather : null,
            });
        } catch (error) {
            console.error("Failed to generate poster:", error);
            alert('Could not generate poster. Please try again.');
        } finally {
            setIsGenerating(false);
        }
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const result = event.target?.result as string;
            if (result) {
                setBackgroundImage(result);
            }
        };
        reader.readAsDataURL(file);
    };

    const fetchWeather = async () => {
        setIsLoadingWeather(true);
        const data = await fetchWeatherForDate(date, time, citySearch);
        if (data) {
            setWeather(data);
            setShowWeather(true);
        } else {
            alert("Could not load weather data. Try entering a valid city name.");
            setShowWeather(false);
        }
        setIsLoadingWeather(false);
    };

    return {
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
    };
};
