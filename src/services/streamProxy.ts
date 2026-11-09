// Detects whether the app is served by the shielded server (server.js) and
// remembers WHERE the shield lives: same-origin (`local`) or the deployed
// web service (`remote`, used by the Android shell / any static hosting).
// Falls back to raw embeds when neither answers.
export type StreamProxyMode = 'local' | 'remote' | null;

const REMOTE_PROXY_ORIGIN = 'https://elio-e5re.onrender.com';

let probePromise: Promise<StreamProxyMode> | null = null;
let mode: StreamProxyMode = null;

async function probeOrigin(base: string): Promise<boolean> {
  const res = await fetch(`${base}/player-proxy/health`, { cache: 'no-store' });
  if (!res.ok) return false;
  // Validate the JSON payload: some static hosts 200-fallback unknown routes
  // to index.html, this compels a true shield server response.
  const body = await res.json().catch(() => null);
  return Boolean(body && body.ok);
}

export function probeStreamProxy(): Promise<boolean> {
  return probeStreamProxyMode().then(Boolean);
}

export function probeStreamProxyMode(): Promise<StreamProxyMode> {
  if (probePromise) return probePromise;
  probePromise = (async () => {
    try {
      if (await probeOrigin('')) {
        mode = 'local';
        return mode;
      }
    } catch (_) {}
    try {
      if (await probeOrigin(REMOTE_PROXY_ORIGIN)) {
        mode = 'remote';
        return mode;
      }
    } catch (_) {}
    mode = null;
    return mode;
  })();
  return probePromise;
}

export function getStreamProxyMode(): StreamProxyMode {
  return mode;
}

/**
 * Builds the shielded embed URL for the app's single VidZee provider.
 *   upstream `/embed/movie/:id` -> `<base>/player-proxy/embed/movie/:id`
 * where base is '' (same-origin, web deployment) or the remote origin.
 */
export function proxiedEmbedUrl(serverId: string, upstreamPath: string): string {
  const suffix = serverId === 'vidzee'
    ? `/player-proxy${upstreamPath}`
    : `/player-proxy/${serverId}${upstreamPath}`;
  const base = mode === 'remote' ? REMOTE_PROXY_ORIGIN : '';
  return `${base}${suffix}`;
}
