// v2/packages/core/src/index.ts
export * from './types';
export * from './defaults';
export { storage } from './storage';
export { noteToMarkdown, markdownToNote } from './note-format';
export { THEMES } from './themes';
export type { ThemeDef } from './themes';
export { SEARCH_URLS } from './search-engines';
export { WMO_ICONS, WMO_LABELS, WMO_CODES, geocodePostal, fetchWeatherData } from './weather';
export type { WeatherData, GeoResult } from './weather';
