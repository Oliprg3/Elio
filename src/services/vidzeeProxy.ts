// Detects whether the app is served by the shielded server (server.js) which
// provides the ad-stripped player proxy. Falls back to the raw embed when the
// proxy is unavailable (PWA-only hosting or the Android APK).

let probePromise: Promise<boolean> | null = null;

export function probeVidzeeProxy(): Promise<boolean> {
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
