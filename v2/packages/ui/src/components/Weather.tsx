import React, { useEffect, useState } from 'react';
import { WMO_ICONS, WMO_LABELS, geocodePostal, fetchWeatherData } from '@lumina/core';
import type { WeatherData } from '@lumina/core';

const CACHE_KEY = 'lumina_weather';
const CACHE_TTL_MS = 30 * 60 * 1000;

interface WeatherProps {
  postalCode?: string;
  weatherUnit?: 'f' | 'c';
  useGeoLocation?: boolean;
}

async function loadWeather(
  postalCode: string | undefined,
  weatherUnit: 'f' | 'c',
  useGeoLocation: boolean,
  signal: AbortSignal,
): Promise<WeatherData | null> {
  const postal = postalCode?.trim();
  const cacheKey = postal || 'geo';

  const cached = JSON.parse(sessionStorage.getItem(CACHE_KEY) ?? 'null') as WeatherData | null;
  if (
    cached &&
    cached.key === cacheKey &&
    cached.unit === weatherUnit &&
    Date.now() - cached.ts < CACHE_TTL_MS
  ) {
    return cached;
  }

  let latitude: number;
  let longitude: number;
  let location = '';

  if (postal) {
    const geo = await geocodePostal(postal);
    if (!geo) return null;
    ({ latitude, longitude } = geo);
    location = geo.name ?? '';
  } else if (useGeoLocation) {
    const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
      navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 10000 }),
    );
    if (signal.aborted) return null;
    latitude = pos.coords.latitude;
    longitude = pos.coords.longitude;
  } else {
    return null;
  }

  const wxData = await fetchWeatherData(latitude, longitude, weatherUnit);
  if (signal.aborted) return null;

  if (!location && wxData.timezone) {
    location = wxData.timezone.split('/').pop()?.replace(/_/g, ' ') ?? '';
  }

  const displayLocation = postal ? postal : location;
  const wx: WeatherData = {
    key: cacheKey,
    unit: weatherUnit,
    ts: Date.now(),
    location: displayLocation,
    temp: wxData.temp,
    code: wxData.code,
  };

  sessionStorage.setItem(CACHE_KEY, JSON.stringify(wx));
  return wx;
}

export function Weather({
  postalCode,
  weatherUnit = 'f',
  useGeoLocation = true,
}: WeatherProps) {
  const [wx, setWx] = useState<WeatherData | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    loadWeather(postalCode, weatherUnit, useGeoLocation, controller.signal)
      .then(data => {
        if (!controller.signal.aborted) setWx(data);
      })
      .catch(() => {
        // silently fail if offline or geolocation denied
      });

    return () => controller.abort();
  }, [postalCode, weatherUnit, useGeoLocation]);

  if (!wx) return null;

  const unit = wx.unit === 'f' ? '°F' : '°C';
  const icon = WMO_ICONS[wx.code] ?? '🌡️';
  const cond = WMO_LABELS[wx.code] ?? '';
  const forecastQuery = wx.location
    ? encodeURIComponent(`weather ${wx.location}`)
    : 'weather forecast';

  function handleClick() {
    window.open(`https://www.google.com/search?q=${forecastQuery}`, '_blank');
  }

  return (
    <div id="weather" style={{ display: 'flex', cursor: 'pointer' }} onClick={handleClick}>
      <span id="weather-icon">{icon}</span>
      <span id="weather-temp">{wx.temp}{unit}</span>
      <span id="weather-cond">{cond}</span>
      {wx.location && <span id="weather-loc">· {wx.location}</span>}
    </div>
  );
}
