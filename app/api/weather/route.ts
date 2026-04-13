import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Fallback when IP geolocation fails (e.g. local dev). */
const FALLBACK = {
  city: 'Tel Aviv',
  latitude: 32.0853,
  longitude: 34.7818,
};

function getClientIp(request: NextRequest): string {
  const xff = request.headers.get('x-forwarded-for');
  if (xff) {
    const first = xff.split(',')[0]?.trim();
    if (first) return first;
  }
  return request.headers.get('x-real-ip') ?? request.headers.get('cf-connecting-ip') ?? '';
}

/** WMO Weather interpretation codes (Open-Meteo). */
function wmoDescription(code: number): string {
  const map: Record<number, string> = {
    0: 'Clear sky',
    1: 'Mainly clear',
    2: 'Partly cloudy',
    3: 'Overcast',
    45: 'Foggy',
    48: 'Depositing rime fog',
    51: 'Light drizzle',
    53: 'Moderate drizzle',
    55: 'Dense drizzle',
    56: 'Freezing drizzle',
    57: 'Freezing drizzle',
    61: 'Slight rain',
    63: 'Moderate rain',
    65: 'Heavy rain',
    66: 'Freezing rain',
    67: 'Freezing rain',
    71: 'Slight snow',
    73: 'Moderate snow',
    75: 'Heavy snow',
    77: 'Snow grains',
    80: 'Rain showers',
    81: 'Moderate showers',
    82: 'Violent showers',
    85: 'Snow showers',
    86: 'Snow showers',
    95: 'Thunderstorm',
    96: 'Thunderstorm with hail',
    99: 'Thunderstorm with hail',
  };
  return map[code] ?? 'Variable conditions';
}

function isLocalOrUnknownIp(ip: string): boolean {
  if (!ip) return true;
  if (ip === '::1') return true;
  if (ip.startsWith('127.')) return true;
  if (ip === 'unknown') return true;
  return false;
}

async function geolocateIp(ip: string): Promise<{ city: string; latitude: number; longitude: number }> {
  if (isLocalOrUnknownIp(ip)) {
    return { city: FALLBACK.city, latitude: FALLBACK.latitude, longitude: FALLBACK.longitude };
  }
  const url = `https://ipapi.co/${ip}/json/`;
  const res = await fetch(url, {
    headers: { Accept: 'application/json' },
    next: { revalidate: 0 },
  });
  if (!res.ok) throw new Error('geo failed');
  const data = (await res.json()) as {
    city?: string;
    latitude?: number | string;
    longitude?: number | string;
    error?: boolean;
  };
  if (data.error || data.latitude == null || data.longitude == null) {
    throw new Error('geo incomplete');
  }
  const city = (data.city && String(data.city).trim()) || FALLBACK.city;
  const latitude = typeof data.latitude === 'number' ? data.latitude : parseFloat(String(data.latitude));
  const longitude = typeof data.longitude === 'number' ? data.longitude : parseFloat(String(data.longitude));
  if (Number.isNaN(latitude) || Number.isNaN(longitude)) throw new Error('geo parse');
  return { city, latitude, longitude };
}

async function fetchOpenMeteo(lat: number, lon: number): Promise<{ temp: number; description: string }> {
  const params = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lon),
    current: 'temperature_2m,weather_code',
    timezone: 'auto',
  });
  const res = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`, {
    next: { revalidate: 0 },
  });
  if (!res.ok) throw new Error('weather failed');
  const data = (await res.json()) as {
    current?: { temperature_2m?: number; weather_code?: number };
  };
  const temp = data.current?.temperature_2m ?? 0;
  const code = data.current?.weather_code ?? 0;
  return { temp: Math.round(temp * 10) / 10, description: wmoDescription(code) };
}

export async function GET(request: NextRequest) {
  try {
    const ip = getClientIp(request);
    let city = FALLBACK.city;
    let lat = FALLBACK.latitude;
    let lon = FALLBACK.longitude;
    try {
      const geo = await geolocateIp(ip);
      city = geo.city;
      lat = geo.latitude;
      lon = geo.longitude;
    } catch {
      /* use FALLBACK */
    }
    const { temp, description } = await fetchOpenMeteo(lat, lon);
    return NextResponse.json({
      city,
      tempC: temp,
      description,
      line: `${city} | ${temp}°C | ${description}`,
    });
  } catch (e) {
    console.error('[weather]', e);
    return NextResponse.json(
      {
        city: FALLBACK.city,
        tempC: 22,
        description: 'Unavailable',
        line: `${FALLBACK.city} | —°C | Weather unavailable`,
      },
      { status: 200 }
    );
  }
}
