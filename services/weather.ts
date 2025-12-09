
// Free Open-Meteo API for client-side use (works on Vercel without backend)
// Doc: https://open-meteo.com/en/docs

export interface WeatherData {
    temperature: number;
    weatherCode: number;
    isDay: boolean;
}

// WMO Weather interpretation codes (https://open-meteo.com/en/docs)
// 0: Clear sky
// 1, 2, 3: Mainly clear, partly cloudy, and overcast
// 45, 48: Fog and depositing rime fog
// 51, 53, 55: Drizzle: Light, moderate, and dense intensity
// 56, 57: Freezing Drizzle: Light and dense intensity
// 61, 63, 65: Rain: Light, moderate and heavy intensity
// 66, 67: Freezing Rain: Light and heavy intensity
// 71, 73, 75: Snow fall: Slight, moderate, and heavy intensity
// 77: Snow grains
// 80, 81, 82: Rain showers: Slight, moderate, and violent
// 85, 86: Snow showers slight and heavy
// 95 *: Thunderstorm: Slight or moderate
// 96, 99 *: Thunderstorm with slight and heavy hail

export const getWeatherIconType = (code: number): 'sun' | 'cloud' | 'rain' | 'snow' | 'zap' | 'fog' => {
    if (code === 0 || code === 1) return 'sun';
    if (code === 2 || code === 3) return 'cloud';
    if ([45, 48].includes(code)) return 'fog';
    if ([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return 'rain';
    if ([71, 73, 75, 77, 85, 86].includes(code)) return 'snow';
    if ([95, 96, 99].includes(code)) return 'zap';
    return 'cloud';
};

const getCoordinatesForCity = async (city: string): Promise<{ lat: number; lon: number } | null> => {
    try {
        const response = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=en&format=json`);
        const data = await response.json();
        
        if (data.results && data.results.length > 0) {
            return {
                lat: data.results[0].latitude,
                lon: data.results[0].longitude
            };
        }
        return null;
    } catch (error) {
        console.error("Geocoding failed:", error);
        return null;
    }
};

const getLocation = (): Promise<{ lat: number; lon: number }> => {
    return new Promise((resolve) => {
        // Default Fallback: Da Nang (16.0471, 108.2068) - ensures weather works even if geo is blocked
        const fallbackLocation = { lat: 16.0471, lon: 108.2068 };

        if (!navigator.geolocation) {
            console.warn("Geolocation is not supported by your browser. Using fallback location.");
            resolve(fallbackLocation);
            return;
        }
        
        navigator.geolocation.getCurrentPosition(
            (position) => {
                resolve({
                    lat: position.coords.latitude,
                    lon: position.coords.longitude
                });
            },
            (error) => {
                console.warn(`Unable to retrieve location (Error ${error.code}: ${error.message}). Using fallback location.`);
                resolve(fallbackLocation);
            },
            { timeout: 7000, maximumAge: 600000 } // 7s timeout, cache for 10 min
        );
    });
};

export const fetchWeatherForDate = async (dateStr: string, timeStr: string, city?: string): Promise<WeatherData | null> => {
    try {
        let coords: { lat: number, lon: number };

        if (city && city.trim().length > 0) {
            const cityCoords = await getCoordinatesForCity(city);
            if (!cityCoords) {
                console.warn(`City '${city}' not found.`);
                coords = await getLocation(); 
            } else {
                coords = cityCoords;
            }
        } else {
            coords = await getLocation();
        }
        
        const { lat, lon } = coords;
        
        // Open-Meteo works with ISO8601 YYYY-MM-DD
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=temperature_2m,weathercode,is_day&start_date=${dateStr}&end_date=${dateStr}`;
        
        const response = await fetch(url);
        if (!response.ok) throw new Error('Weather API fetch failed');
        
        const data = await response.json();
        
        // Find the index for the specific hour
        // timeStr is "HH:MM", we just need HH
        const hour = parseInt(timeStr.split(':')[0], 10);
        
        if (!data.hourly || !data.hourly.time) return null;

        // The hourly array usually starts at 00:00 of the requested day
        // So index corresponds roughly to the hour if start_date == end_date
        const index = hour; 
        
        if (index >= 0 && index < data.hourly.temperature_2m.length) {
            return {
                temperature: data.hourly.temperature_2m[index],
                weatherCode: data.hourly.weathercode[index],
                isDay: data.hourly.is_day[index] === 1
            };
        }
        
        return null;

    } catch (error) {
        console.error("Failed to fetch weather:", error);
        return null;
    }
};
