import express from 'express';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3000;

// ---------------------------------------------------------------------------
// Stream Shield Proxy (multi-provider)
// ---------------------------------------------------------------------------
// Embed providers inject their own ad overlays (inline ad units, obfuscated
// ad frameworks such as umommy.cyou) inside their iframes. Cross-origin parent
// pages cannot remove that DOM, so we re-serve the embeds from our own origin:
//   1. known ad scripts stripped from the HTML
//   2. assets transparently re-served via /player-proxy/<provider>/assets/*
//   3. a strict Content-Security-Policy that hash-allowlists only the embed's
//      own bootstrap inline scripts, so any ad script injected at runtime
//      (inline or remote) is blocked by the browser itself
//   4. CSS that hides the common ad slots
// ---------------------------------------------------------------------------

const PROXIED_PROVIDERS = {
  vidzee: 'https://player.vidzee.wtf',
  // VidZee resolves its streams through a separate API host whose CORS
  // allowlist only ever echoes *.vidzee.wtf origins, so the proxied embed
  // cannot call it cross-origin. We route it through our own origin and
  // rewrite the hardcoded base URL inside served JS chunks (see below).
  core: 'https://core.vidzee.wtf',
};

const PROXY_PREFIX = '/player-proxy';

const AD_HOST_PATTERN = new RegExp(
  [
    'umommy\\.cyou', 'llvpn\\.com', 'popads', 'popcash', 'adsterra',
    'propellerads', 'exoclick', 'adcash', 'monetag', 'hilltopads',
    'clickadu', 'ad-maven', 'popmyads', 'realsrv', 'clickaine',
    'trafficstars', 'trafficjunky', 'yllix', 'popunder', 'zeroredirect',
    'revenuehits', 'onclickpredict', 'adnexus?\\.', 'com\.adservice',
    'highrevenuegate', 'top\\.life', '\\.sbs', '\\.click', '\\.cyou',
  ].join('|'),
  'i'
);

const SHIELD_CSS =
  'html,body{background:#000 !important;color:#fff !important}' +
  'div.ads-inline-ad,.adsbygoogle{display:none !important}' +
  '.ad-slot,.ad-banner,.ad-container,.adsbygoogle,#ad-slot,[class*="-ad-slot"]{display:none !important}' +
  'html{overflow:auto}';

/**
 * JS chunks hardcode provider API origins (VidZee embeds reference
 * https://core.vidzee.wtf). Because those hosts do not send CORS headers for
 * our origin, the proxied page would never receive its stream metadata. Swap
 * each provider base URL for our per-provider proxy route so every call is
 * same-origin.
 */
function rewriteProviderOrigins(buffer, contentType, req) {
  if (!contentType.includes('javascript') && !contentType.includes('text/html')) {
    return buffer;
  }
  const origin = shieldOrigin(req);
  let text = buffer.toString('utf8');
  for (const [id, upstreamOrigin] of Object.entries(PROXIED_PROVIDERS)) {
    text = text.split(`${upstreamOrigin}`).join(`${origin}${PROXY_PREFIX}/${id}`);
  }
  return Buffer.from(text, 'utf8');
}

/**
 * Black in-frame fallback for upstream hiccups. Never sends the browser to
 * the provider directly — VidZee answers X-Frame-Options: SAMEORIGIN and
 * older WebViews render that block as a blank white page. The reload pins a
 * no-store retry against the proxied URL itself.
 */
function serveShieldFallback(req, res, provider, status) {
  const target = req.originalUrl.startsWith('/')
    ? req.originalUrl
    : `/${req.originalUrl}`;
  const safeTarget = target
    .replace(/&/g, '&amp;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;');
  res.status(status).type('text/html; charset=utf-8');
  res.set('Cache-Control', 'no-store');
  res.set('X-Content-Type-Options', 'nosniff');
  return res.send(
    `<!DOCTYPE html><html><head><meta charset="utf-8">` +
    `<meta name="viewport" content="width=device-width,initial-scale=1">` +
    `<style>html,body{margin:0;background:#000;color:#9aa0a6;` +
    `font:600 14px system-ui,sans-serif}</style></head><body>` +
    `<div style="display:flex;flex-direction:column;gap:16px;align-items:center;` +
    `justify-content:center;height:100vh;text-align:center;padding:0 24px">` +
    `<div>Stream source busy &#8212; retrying in 4s&#8230;</div>` +
    `<button id="retry" onclick="location.reload()" style="background:#e50914;` +
    `color:#fff;border:0;border-radius:999px;padding:10px 22px;font-weight:800;` +
    `font-size:13px;cursor:pointer">Start ${provider} again</button>` +
    `</div><script>setTimeout(function(){location.replace('${safeTarget}')},4000)` +
    `</script></body></html>`
  );
}

function shieldOrigin(req) {
  const host =
    req.headers['x-forwarded-host'] || req.headers.host || 'localhost:3000';
  const proto = req.headers['x-forwarded-proto'] || req.protocol || 'http';
  return `${proto}://${host}`;
}

function proxyHeaders(req, upstreamOrigin) {
  const refererOrigin = upstreamOrigin === PROXIED_PROVIDERS.core
    ? PROXIED_PROVIDERS.vidzee
    : upstreamOrigin;
  return {
    'user-agent':
      req.headers['user-agent'] ||
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36',
    accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    // Ask upstream for plain bytes so we can transform HTML and never
    // forward compressed payloads without their encoding headers
    'accept-encoding': 'identity',
    referer: `${refererOrigin}/`,
  };
}

// Full desktop-Chrome impersonation for retrying upstreams that score their
// bot protection on header consistency (sec-ch-ua / sec-fetch-*) — deploy
// hosts behind datacenter IPs often get the forwarded client UA flagged.
const DESKTOP_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

function browserImpersonationHeaders(upstreamOrigin) {
  const refererOrigin = upstreamOrigin === PROXIED_PROVIDERS.core
    ? PROXIED_PROVIDERS.vidzee
    : upstreamOrigin;
  return {
    'user-agent': DESKTOP_UA,
    accept:
      'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    'accept-encoding': 'identity',
    'accept-language': 'en-US,en;q=0.9',
    'sec-ch-ua': '"Google Chrome";v="126", "Not:A-Brand";v="8", "Chromium";v="126"',
    'sec-ch-ua-mobile': '?0',
    'sec-ch-ua-platform': '"Windows"',
    'sec-fetch-dest': 'document',
    'sec-fetch-mode': 'navigate',
    'sec-fetch-site': 'none',
    'sec-fetch-user': '?1',
    'upgrade-insecure-requests': '1',
    referer: `${refererOrigin}/`,
  };
}

/**
 * Upstream fetch with geo/bot-style retry: first try to faithfully forward
 * the client's own headers; when the provider's WAF rejects that (401/403/
 * 429) retry once with a full desktop-Chrome impersonation. Undici's global
 * dispatcher connection reuse per (origin, header set) keeps the two attempts
 * independent.
 */
async function fetchUpstreamResilient(url, req, provider) {
  const upstreamOrigin = PROXIED_PROVIDERS[provider] || PROXIED_PROVIDERS.vidzee;
  let res = await fetch(url, { headers: proxyHeaders(req, upstreamOrigin) });
  if (!res.ok && [400, 401, 403, 429, 503].includes(res.status)) {
    try {
      console.warn(
        `[shield] ${provider} upstream ${res.status} for ${url} — retrying with browser impersonation`
      );
      res = await fetch(url, {
        headers: browserImpersonationHeaders(upstreamOrigin),
      });
    } catch (_) {
      // keep original response as the error signal
    }
  }
  return res;
}

// Hash-allowlist every inline bootstrap script already present in the embed
// HTML so the strict CSP cannot break the player's own loader.
function collectInlineScriptHashes(html) {
  const hashes = [];
  const scriptRe = /<script\b(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi;
  let match;
  while ((match = scriptRe.exec(html)) !== null) {
    const body = match[1];
    if (body && body.replace(/\s/g, '').length > 0) {
      const digest = crypto.createHash('sha256').update(body).digest('base64');
      hashes.push(`'sha256-${digest}'`);
    }
  }
  return hashes;
}

// Provider shells frequently nest the actual player from a second origin
// (e.g. VidZee loads vaplayer.ru inside its embed). Extract those origins from
// the page so the per-page CSP frame-src allowlist includes them; otherwise
// the strict default-src 'none' policy silently kills the inner player.
function collectNestedIframeOrigins(html) {
  const origins = new Set();
  const re = /<iframe\b[^>]*\bsrc=["']([^"']+)["']/gi;
  let match;
  while ((match = re.exec(html)) !== null) {
    try {
      const url = new URL(match[1], 'https://invalid.internal/');
      if ((url.protocol === 'https:' || url.protocol === 'http:') && !AD_HOST_PATTERN.test(url.hostname)) {
        origins.add(url.origin);
      }
    } catch (_) {}
  }
  return [...origins];
}

function buildShieldCsp(origin, provider, html) {
  const upstreamOrigin = PROXIED_PROVIDERS[provider] || PROXIED_PROVIDERS.vidzee;
  const own = `${origin}${PROXY_PREFIX}/${provider}`;
  const nested = collectNestedIframeOrigins(html).join(' ');
  return [
    `default-src 'none'`,
    `script-src ${origin}${PROXY_PREFIX}/assets/ ${own}/assets/ ${own}/_next/ ${collectInlineScriptHashes(html).join(' ')} 'wasm-unsafe-eval' 'unsafe-eval'`,
    `style-src ${origin} 'unsafe-inline' https://fonts.googleapis.com https://fonts.gstatic.com`,
    `font-src https://fonts.gstatic.com data:`,
    `img-src * data: blob:`,
    `media-src * data: blob:`,
    `connect-src ${origin} https: http: ws: wss: data: blob:`,
    `worker-src ${origin}${PROXY_PREFIX}/assets/ ${own}/assets/ ${own}/_next/ blob:`,
    `frame-src ${origin} ${upstreamOrigin} ${nested} https:`,

    `object-src 'none'`,
    `base-uri 'none'`,
  ].join('; ');
}

function serveShieldedEmbed(req, res, upstreamPath, provider = 'vidzee') {
  // Single provider: VidZee. Serve our own minimal black page framing
  // vidzee's own player loader (vaplayer), which carries the full VidZee
  // chain end to end. No alternates.
  const match = String(upstreamPath || '').match(/\/?embed\/(movie|tv)\/(\d+)(?:\/(\d+)(?:\/(\d+))?)?/);
  if (provider !== 'vidzee' || !match) {
    return serveShieldFallback(req, res, provider, 404);
  }
  const [, type, idStr, sStr, eStr] = match;
  let src = `https://vaplayer.ru/embed/${type}/${encodeURIComponent(idStr)}`;
  if (type === 'tv' && sStr) {
    src += `/${encodeURIComponent(sStr)}/${encodeURIComponent(eStr || '1')}`;
  }
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>elio+ player</title>
<style>html,body{margin:0;height:100%;background:#000;overflow:hidden}
iframe{position:absolute;inset:0;width:100%;height:100%;border:0}</style></head>
<body>
<iframe referrerpolicy="origin" allowfullscreen sandbox="allow-scripts allow-same-origin allow-presentation allow-pointer-lock" allow="autoplay; encrypted-media; fullscreen; picture-in-picture" src="${src}"></iframe>
</body></html>`;
  console.log(`[shield] vidzee player: ${src}`);
  res.set('Content-Security-Policy',
    "default-src 'none'; frame-src https:; style-src 'unsafe-inline'; img-src data: https:; form-action 'none'; base-uri 'none'");
  res.set('X-Content-Type-Options', 'nosniff');
  res.set('Referrer-Policy', 'origin');
  res.set('Cache-Control', 'no-store');
  return res.type('text/html; charset=utf-8').send(html);
}

app.options(`${PROXY_PREFIX}/health`, (req, res) => {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
  return res.status(204).end();
});

app.get(`${PROXY_PREFIX}/health`, (_req, res) => {
  res.set('Access-Control-Allow-Origin', '*');
  res.json({ ok: true, providers: Object.keys(PROXIED_PROVIDERS) });
});

// Legacy VidZee routes (older clients keep using them)
app.get('/player-proxy/embed/movie/:id', async (req, res) => {
  const id = String(req.params.id || '').replace(/[^0-9]/g, '');
  const query = new URLSearchParams({ lang: 'en', sub: 'en', ...req.query });
  return serveShieldedEmbed(req, res, `/embed/movie/${id}?${query.toString()}`, 'vidzee');
});

app.get('/player-proxy/embed/tv/:id/:s/:e', async (req, res) => {
  const id = String(req.params.id || '').replace(/[^0-9]/g, '');
  const s = String(req.params.s || '').replace(/[^0-9]/g, '');
  const e = String(req.params.e || '').replace(/[^0-9]/g, '');
  const query = new URLSearchParams({ lang: 'en', sub: 'en', ...req.query });
  return serveShieldedEmbed(
    req,
    res,
    `/embed/tv/${id}/${s}/${e}?${query.toString()}`,
    'vidzee'
  );
});

// VidZee proxy assets (legacy flat namespace)
app.get('/player-proxy/assets/:asset', async (req, res) => {
  const asset = String(req.params.asset || '');
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(asset)) {
    return res.status(400).end();
  }
  try {
    const upstream = await fetchUpstreamResilient(
      `${PROXIED_PROVIDERS.vidzee}/assets/${asset}`,
      req,
      'vidzee'
    );
    if (!upstream.ok) return res.status(upstream.status).end();
    const buffer = Buffer.from(await upstream.arrayBuffer());
    res.set('Content-Type', upstream.headers.get('content-type') || 'application/octet-stream');
    res.set('Cache-Control', 'public, max-age=600');
    return res.send(buffer);
  } catch (_) {
    return res.status(502).end();
  }
});

// Generic per-provider passthrough: HTML embeds, assets and their API calls.
// /player-proxy/vidzee/embed/movie/:id   -> player.vidzee.wtf/embed/movie/:id
// /player-proxy/vidzee/embed/tv/:id/:s/:e-> player.vidzee.wtf/embed/tv/:id/:s/:e
// /player-proxy/<p>/assets/<a>           -> upstream /assets/<a>
// /player-proxy/<p>/<anything>           -> upstream /<anything>
app.get(`${PROXY_PREFIX}/:provider/*`, async (req, res) => {
  const provider = String(req.params.provider || '').toLowerCase();
  const rest = req.params['0'] || req.params[0] || '';
  const upstreamOrigin = PROXIED_PROVIDERS[provider];
  if (!upstreamOrigin) {
    return res.status(404).type('text/plain').send('Unknown provider');
  }

  // Preserve the caller's query string — provider APIs (core.vidzee.wtf
  // /streams/...) refuse requests without their parameters.
  const qs = new URLSearchParams(req.query).toString();
  const suffix = qs ? `?${qs}` : '';

  // Assets served with long cache headers
  if (rest.startsWith('assets/') || rest.startsWith('_next/')) {
    try {
      const upstream = await fetchUpstreamResilient(
        `${upstreamOrigin}/${rest}${suffix}`,
        req,
        provider
      );
      if (!upstream.ok) return res.status(upstream.status).end();
      const contentType = upstream.headers.get('content-type') || 'application/octet-stream';
      let buffer = Buffer.from(await upstream.arrayBuffer());
      buffer = rewriteProviderOrigins(buffer, contentType, req);
      res.set('Content-Type', contentType);
      res.set('Cache-Control', 'public, max-age=600');
      return res.send(buffer);
    } catch (_) {
      return res.status(502).end();
    }
  }

  // Everything else: fetch first, then shield HTML responses (embed pages);
  // raw passthrough for the rest (API calls, JSON, subtitles etc.).
  // VidZee embed pages get our own minimal player (see serveShieldedEmbed).
  if (provider === 'vidzee' && /^\/?embed\/(movie|tv)\//.test(rest)) {
    return serveShieldedEmbed(req, res, `/${rest}`, provider);
  }
  try {
    const upstream = await fetchUpstreamResilient(
      `${upstreamOrigin}/${rest}${suffix}`,
      req,
      provider
    );
    if (!upstream.ok) {
      // For API/JSON calls a redirect makes little sense, but HTML-pages may
      // be directly embedded as a graceful fallback.
      const contentType = upstream.headers.get('content-type') || '';
      if (contentType.includes('text/html')) {
        console.warn(
          `[shield] ${provider} page ${upstream.status} — redirecting frame to provider`
        );
        res.set('Cache-Control', 'no-store');
        const qs = new URLSearchParams(req.query);
        return serveShieldFallback(req, res, provider, 503);
      }
      return res.status(upstream.status).type('text/plain').send(`${provider} upstream ${upstream.status}`);
    }
    const contentType = upstream.headers.get('content-type') || 'application/octet-stream';
    if (contentType.includes('javascript')) {
      let body = Buffer.from(await upstream.arrayBuffer());
      body = rewriteProviderOrigins(body, contentType, req);
      res.set('Content-Type', contentType);
      res.set('Cache-Control', 'public, max-age=600');
      return res.send(body);
    }
    if (contentType.includes('text/html')) {
      let html = await upstream.text();
      const origin = shieldOrigin(req);
      const assetPrefix = `${origin}${PROXY_PREFIX}/${provider}/assets/`;
      html = html.replace(
        /<script\b[^>]*\bsrc="([^"]*)"[^>]*>\s*<\/script>/gi,
        (tag, src) => (AD_HOST_PATTERN.test(src) ? '' : tag)
      );
      html = html.replace(
        /<iframe\b[^>]*\bsrc="([^"]*)"[^>]*>(?:\s*<\/iframe>)?/gi,
        (tag, src) => (AD_HOST_PATTERN.test(src) ? '' : tag)
      );
      html = html
        .split('/assets/')
        .join(assetPrefix)
        .split('/_next/')
        .join(`${origin}${PROXY_PREFIX}/${provider}/_next/`);
      html = rewriteProviderOrigins(Buffer.from(html), contentType, req).toString('utf8');
      html = html.replace('</head>', `<style>${SHIELD_CSS}</style></head>`);
      res.set('Content-Security-Policy', buildShieldCsp(origin, provider, html));
      res.set('X-Content-Type-Options', 'nosniff');
      res.set('Referrer-Policy', 'origin');
      res.set('Cache-Control', 'no-store');
      return res.type('text/html; charset=utf-8').send(html);
    }
    const buffer = Buffer.from(await upstream.arrayBuffer());
    res.set('Content-Type', contentType);
    res.set('Cache-Control', 'no-store');
    return res.send(buffer);
  } catch (_) {
    return serveShieldFallback(req, res, provider, 502);
  }
});

// Serve static production assets
app.use(express.static(path.join(__dirname, 'dist')));

// Fallback all SPA routes to index.html
app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(port, '0.0.0.0', () => {
  console.log(`Production server running on http://0.0.0.0:${port}`);
});
