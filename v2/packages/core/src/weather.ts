// WMO weather interpretation code mappings
// https://open-meteo.com/en/docs#weathervariables

export const WMO_ICONS: Record<number, string> = {
  0: '☀️', 1: '🌤️', 2: '⛅', 3: '☁️',
  45: '🌫️', 48: '🌫️',
  51: '🌦️', 53: '🌦️', 55: '🌧️',
  61: '🌧️', 63: '🌧️', 65: '🌧️',
  71: '❄️', 73: '❄️', 75: '❄️', 77: '❄️',
  80: '🌦️', 81: '🌦️', 82: '🌧️',
  85: '❄️', 86: '❄️',
  95: '⛈️', 96: '⛈️', 99: '⛈️',
};

export const WMO_LABELS: Record<number, string> = {
  0: 'Clear', 1: 'Mostly clear', 2: 'Partly cloudy', 3: 'Overcast',
  45: 'Foggy', 48: 'Foggy',
  51: 'Light drizzle', 53: 'Drizzle', 55: 'Heavy drizzle',
  61: 'Light rain', 63: 'Rain', 65: 'Heavy rain',
  71: 'Light snow', 73: 'Snow', 75: 'Heavy snow', 77: 'Snow grains',
  80: 'Showers', 81: 'Showers', 82: 'Heavy showers',
  85: 'Snow showers', 86: 'Snow showers',
  95: 'Thunderstorm', 96: 'Thunderstorm', 99: 'Thunderstorm',
};

export const WMO_CODES = { icons: WMO_ICONS, labels: WMO_LABELS };

export interface WeatherData {
  key: string;
  unit: 'f' | 'c';
  ts: number;
  location: string;
  temp: number;
  code: number;
}

export interface GeoResult {
  latitude: number;
  longitude: number;
  name?: string;
}

export async function geocodePostal(postal: string): Promise<GeoResult | null> {
  const res = await fetch(
    `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(postal)}&count=1&format=json`,
  );
  const data = await res.json() as { results?: Array<{ latitude: number; longitude: number; name?: string }> };
  if (!data.results?.length) return null;
  const { latitude, longitude, name } = data.results[0];
  return { latitude, longitude, name };
}

export async function fetchWeatherData(
  latitude: number,
  longitude: number,
  unit: 'f' | 'c',
): Promise<{ temp: number; code: number; timezone: string }> {
  const unitParam = unit === 'f' ? 'fahrenheit' : 'celsius';
  const res = await fetch(
    `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weather_code&temperature_unit=${unitParam}&timezone=auto`,
  );
  const data = await res.json() as {
    current: { temperature_2m: number; weather_code: number };
    timezone: string;
  };
  return {
    temp: Math.round(data.current.temperature_2m),
    code: data.current.weather_code,
    timezone: data.timezone,
  };
}
