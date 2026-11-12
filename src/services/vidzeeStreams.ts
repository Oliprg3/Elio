// Resolves VidZee streams directly through our own server (server.js):
// server-side calls core.vidzee.wtf for the m3u8 link and proxies the
// playlist + segments back through our origin, so playback skips VidZee's
// vaplayer iframe, its ad chain and its Turnstile wall entirely.
import { getStreamApiBase } from './streamProxy';

export interface VidzeeResolve {
  playlist: string;
  language: string;
  server: string;
}

export async function resolveVidzeeStream(opts: {
  type: 'movie' | 'tv';
  id: string;
  season?: number;
  episode?: number;
  server?: string;
}): Promise<VidzeeResolve | null> {
  const base = getStreamApiBase();
  const q = new URLSearchParams({ type: opts.type, id: opts.id });
  if (opts.type === 'tv') {
    q.set('season', String(opts.season ?? 1));
    q.set('episode', String(opts.episode ?? 1));
  }
  if (opts.server) q.set('server', opts.server);
  const res = await fetch(`${base}/api/vidzee/streams?${q.toString()}`, {
    cache: 'no-store',
  });
  if (!res.ok) return null;
  const body = await res.json().catch(() => null);
  if (!body?.ok || !body.playlist) return null;
  return {
    playlist: `${base}${body.playlist}`,
    language: body.language || 'Auto',
    server: body.server || 'dcloud',
  };
}
