import { db } from '../db/index.ts';

// Known capital / central coordinates for countries to guarantee instant fallback
const COUNTRY_FALLBACK_COORDS: Record<string, { lat: number; lon: number; name: string }> = {
  ES: { lat: 40.4168, lon: -3.7038, name: 'Madrid' },
  FR: { lat: 48.8566, lon: 2.3522, name: 'París' },
  IT: { lat: 41.9028, lon: 12.4964, name: 'Roma' },
  DE: { lat: 52.52, lon: 13.405, name: 'Berlín' },
  GB: { lat: 51.5074, lon: -0.1278, name: 'Londres' },
  UK: { lat: 51.5074, lon: -0.1278, name: 'Londres' },
  PL: { lat: 52.2297, lon: 21.0122, name: 'Varsovia' },
  EG: { lat: 30.0444, lon: 31.2357, name: 'El Cairo' },
  US: { lat: 38.9072, lon: -77.0369, name: 'Washington' },
  JP: { lat: 35.6762, lon: 139.6503, name: 'Tokio' },
  PT: { lat: 38.7223, lon: -9.1393, name: 'Lisboa' },
  MA: { lat: 34.0209, lon: -6.8416, name: 'Rabat' },
  CH: { lat: 46.948, lon: 7.4474, name: 'Berna' },
  AT: { lat: 48.2082, lon: 16.3738, name: 'Viena' },
  GR: { lat: 37.9838, lon: 23.7275, name: 'Atenas' },
  NL: { lat: 52.3676, lon: 4.9041, name: 'Ámsterdam' },
  BE: { lat: 50.8503, lon: 4.3517, name: 'Bruselas' },
  IE: { lat: 53.3498, lon: -6.2603, name: 'Dublín' },
  DK: { lat: 55.6761, lon: 12.5683, name: 'Copenhague' },
  SE: { lat: 59.3293, lon: 18.0686, name: 'Estocolmo' },
  NO: { lat: 59.9139, lon: 10.7522, name: 'Oslo' },
  CZ: { lat: 50.0755, lon: 14.4378, name: 'Praga' },
  HU: { lat: 47.4979, lon: 19.0402, name: 'Budapest' },
  TR: { lat: 39.9334, lon: 32.8597, name: 'Ankara' },
  MX: { lat: 19.4326, lon: -99.1332, name: 'Ciudad de México' },
};

export interface TripWeatherResult {
  tempMin: number | null;
  tempMax: number | null;
}

/**
 * Geocodes city or country using Open-Meteo Geocoding API.
 */
async function geocodeLocation(
  city: string | null | undefined,
  countryCode: string
): Promise<{ lat: number; lon: number } | null> {
  const code = (countryCode || '').toUpperCase();

  // 1. If city is provided, try searching by city
  if (city && city.trim().length > 0) {
    try {
      const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
        city.trim()
      )}&count=5&language=es&format=json`;
      const res = await fetch(url, { signal: AbortSignal.timeout(4000) });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.results) && data.results.length > 0) {
          // Prefer result matching country code
          const matched = data.results.find(
            (r: any) => r.country_code?.toUpperCase() === code
          );
          const picked = matched || data.results[0];
          return { lat: picked.latitude, lon: picked.longitude };
        }
      }
    } catch (err) {
      console.warn(`[Weather] Geocoding city "${city}" failed:`, err);
    }
  }

  // 2. Check capital fallback map
  if (COUNTRY_FALLBACK_COORDS[code]) {
    return {
      lat: COUNTRY_FALLBACK_COORDS[code].lat,
      lon: COUNTRY_FALLBACK_COORDS[code].lon,
    };
  }

  return null;
}

/**
 * Fetches min and max temperatures during the trip dates using Open-Meteo.
 * Automatically switches between Historical Archive (for past dates) and Forecast API (for current/future dates).
 */
export async function fetchTripWeather(
  city: string | null | undefined,
  countryCode: string,
  startDate: string,
  endDate: string
): Promise<TripWeatherResult | null> {
  if (!startDate || !endDate) return null;

  const coords = await geocodeLocation(city, countryCode);
  if (!coords) return null;

  const { lat, lon } = coords;

  // 1. Try Historical Archive first
  try {
    const archiveUrl = `https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lon}&start_date=${startDate}&end_date=${endDate}&daily=temperature_2m_max,temperature_2m_min&timezone=auto`;
    const res = await fetch(archiveUrl, { signal: AbortSignal.timeout(6000) });
    if (res.ok) {
      const data = await res.json();
      const mins = (data.daily?.temperature_2m_min || []).filter((v: any) => typeof v === 'number');
      const maxs = (data.daily?.temperature_2m_max || []).filter((v: any) => typeof v === 'number');

      if (mins.length > 0 && maxs.length > 0) {
        return {
          tempMin: Math.round(Math.min(...mins) * 10) / 10,
          tempMax: Math.round(Math.max(...maxs) * 10) / 10,
        };
      }
    }
  } catch {
    // Dates might be too recent or future, fallback to forecast
  }

  // 2. Try Forecast API (covers recent past, current, and upcoming dates)
  try {
    const forecastUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&start_date=${startDate}&end_date=${endDate}&daily=temperature_2m_max,temperature_2m_min&timezone=auto`;
    const res = await fetch(forecastUrl, { signal: AbortSignal.timeout(6000) });
    if (res.ok) {
      const data = await res.json();
      const mins = (data.daily?.temperature_2m_min || []).filter((v: any) => typeof v === 'number');
      const maxs = (data.daily?.temperature_2m_max || []).filter((v: any) => typeof v === 'number');

      if (mins.length > 0 && maxs.length > 0) {
        return {
          tempMin: Math.round(Math.min(...mins) * 10) / 10,
          tempMax: Math.round(Math.max(...maxs) * 10) / 10,
        };
      }
    }
  } catch (err) {
    console.warn('[Weather] Forecast API fetch failed:', err);
  }

  return null;
}

/**
 * Scans trips with missing weather data and backfills temperatures automatically.
 */
export async function backfillMissingTripWeather(): Promise<number> {
  const pendingTripsStmt = db.prepare(`
    SELECT id, title, city, country_code, start_date, end_date
    FROM trips
    WHERE (temp_min IS NULL OR temp_max IS NULL) AND deleted_at IS NULL
  `);

  const pending = pendingTripsStmt.all() as Array<{
    id: string;
    title: string;
    city?: string;
    country_code: string;
    start_date: string;
    end_date: string;
  }>;

  if (pending.length === 0) return 0;

  console.log(`[Weather] Backfilling weather for ${pending.length} trips...`);
  const updateStmt = db.prepare('UPDATE trips SET temp_min = ?, temp_max = ? WHERE id = ?');
  let updatedCount = 0;

  for (const t of pending) {
    try {
      const result = await fetchTripWeather(t.city, t.country_code, t.start_date, t.end_date);
      if (result && result.tempMin !== null && result.tempMax !== null) {
        updateStmt.run(result.tempMin, result.tempMax, t.id);
        updatedCount++;
        console.log(
          `[Weather] Auto-filled ${t.title} (${t.city || t.country_code}): Min ${result.tempMin}°C / Max ${result.tempMax}°C`
        );
      }
    } catch (err) {
      console.warn(`[Weather] Error fetching weather for trip ${t.id}:`, err);
    }
  }

  return updatedCount;
}
