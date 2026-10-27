// Detects whether the app is served by the shielded server (server.js), which
// provides multi-provider, ad-stripped player proxies under /player-proxy/.
// Falls back to raw embeds when the proxy is unavailable (static hosting,
// GitHub Pages or the Android APK).

let probePromise: Promise<boolean> | null = null;

export function probeStreamProxy(): Promise<boolean> {
  if (!probePromise) {
    probePromise = fetch('/player-proxy/health', { cache: 'no-store' })
      .then((res) => {
        if (!res.ok) return false;
        // Vite dev serves index.html fallbacks for unknown routes and still
        // returns 200, so validate the JSON payload specifically.
        return res
          .json()
          .then((body) => Boolean(body && body.ok))
          .catch(() => false);
      })
      .catch(() => false);
  }
  return probePromise;
}

/**
 * Maps a provider id + upstream path (without origin) to the shielded proxy
 * route served by server.js.
 *   vidzee:  /embed/movie/:id          -> /player-proxy/embed/movie/:id
 *   vidfast: /movie/:id                -> /player-proxy/vidfast/movie/:id
 */
export function proxiedEmbedUrl(serverId: string, upstreamPath: string): string {
  if (serverId === 'vidzee') {
    return `/player-proxy${upstreamPath}`;
  }
  return `/player-proxy/${serverId}${upstreamPath}`;
}
