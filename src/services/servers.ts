import { StreamServer } from '../types/tmdb';

export interface StreamQualityOption {
  id: 'auto' | '1080p' | '4k' | '720p';
  label: string;
  badge: string;
  bitrateNote: string;
}

export const STREAM_QUALITIES: StreamQualityOption[] = [
  { id: '1080p', label: 'HD 1080p', badge: 'HD', bitrateNote: 'Direct High Definition' },
  { id: '4k', label: 'Ultra HD', badge: 'UHD', bitrateNote: 'Maximum Bitrate' },
  { id: '720p', label: 'Fast HD', badge: '720p', bitrateNote: 'Fast Loading' },
  { id: 'auto', label: 'Auto', badge: 'Auto', bitrateNote: 'Adaptive' },
];

export const STREAM_SERVERS: StreamServer[] = [
  {
    id: 'vidzee',
    name: 'VidZee',
    badge: '1080p',
    getMovieUrl: (id) => `https://player.vidzee.wtf/embed/movie/${id}?lang=en&sub=en`,
    getTvUrl: (id, s, e) => `https://player.vidzee.wtf/embed/tv/${id}/${s}/${e}?lang=en&sub=en`,
  },
  {
    id: 'vidfast',
    name: 'VidFast',
    badge: 'Fast',
    getMovieUrl: (id) => `https://vidfast.vc/movie/${id}`,
    getTvUrl: (id, s, e) => `https://vidfast.vc/tv/${id}/${s}/${e}`,
  },
  {
    id: 'vidlink',
    name: 'VidLink',
    badge: 'Backup',
    getMovieUrl: (id) => `https://vidlink.pro/movie/${id}`,
    getTvUrl: (id, s, e) => `https://vidlink.pro/tv/${id}/${s}/${e}`,
  },
];

// ---------------------------------------------------------------------------
// Provider health probing (auto-fallback)
//
// Cross-origin status codes are unreadable from the browser, but a plain
// <img> load of the provider's favicon distinguishes a healthy host (valid
// image bytes -> onload) from an outage (Cloudflare 5xx error pages return
// text/plain -> onerror). Results are cached per origin per session.
// ---------------------------------------------------------------------------

const providerAliveCache = new Map<string, Promise<boolean>>();

export function probeProviderAlive(origin: string): Promise<boolean> {
  const cached = providerAliveCache.get(origin);
  if (cached) return cached;

  const probe = new Promise<boolean>((resolve) => {
    if (typeof window === 'undefined' || typeof window.Image === 'undefined') {
      resolve(true);
      return;
    }
    const img = new window.Image();
    let settled = false;
    const finish = (ok: boolean) => {
      if (settled) return;
      settled = true;
      resolve(ok);
    };
    img.onload = () => finish(true);
    img.onerror = () => finish(false);
    img.referrerPolicy = 'no-referrer';
    window.setTimeout(() => finish(false), 7000);
    img.src = `${origin}/favicon.ico?elio=${Date.now()}`;
  });

  providerAliveCache.set(origin, probe);
  return probe;
}

function originOfServer(server: StreamServer, type: 'movie' | 'tv', id: number | string): string {
  try {
    const url = type === 'movie' ? server.getMovieUrl(id) : server.getTvUrl(id, 1, 1);
    return new URL(url).origin;
  } catch {
    return '';
  }
}

/**
 * Returns the first provider index that passes the health probe, starting
 * with the currently preferred one. Keeps the current provider when it is
 * alive or when everything is unreachable.
 */
export function pickFirstAliveProvider(
  startIndex: number,
  type: 'movie' | 'tv',
  id: number | string
): Promise<number> {
  return (async () => {
    if (startIndex < 0 || startIndex >= STREAM_SERVERS.length) return startIndex;

    const currentOrigin = originOfServer(STREAM_SERVERS[startIndex], type, id);
    if (!currentOrigin) return startIndex;

    const currentAlive = await probeProviderAlive(currentOrigin);
    if (currentAlive) return startIndex;

    for (let i = 1; i < STREAM_SERVERS.length; i++) {
      const idx = (startIndex + i) % STREAM_SERVERS.length;
      const origin = originOfServer(STREAM_SERVERS[idx], type, id);
      if (!origin) continue;
      const alive = await probeProviderAlive(origin);
      if (alive) return idx;
    }
    return startIndex;
  })();
}
