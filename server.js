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
// Embed providers inject their own ad overlays (ads-container divs, obfuscated
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
  cinemaos: 'https://cinemaos.tech',
  vidzee: 'https://player.vidzee.wtf',
  vidfast: 'https://vidfast.vc',
  vidlink: 'https://vidlink.pro',
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
  'div.ads-container{display:none !important;pointer-events:none !important}' +
  'div.ads-container *{display:none !important}' +
  '.ad-slot,.ad-banner,.ad-container,.adsbygoogle,#ad-slot,[class*="-ad-slot"]{display:none !important}' +
  'html{overflow:auto}';

function shieldOrigin(req) {
  const host =
    req.headers['x-forwarded-host'] || req.headers.host || 'localhost:3000';
  const proto = req.headers['x-forwarded-proto'] || req.protocol || 'http';
  return `${proto}://${host}`;
}

function proxyHeaders(req, upstreamOrigin) {
  return {
    'user-agent':
      req.headers['user-agent'] ||
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36',
    accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    // Ask upstream for plain bytes so we can transform HTML and never
    // forward compressed payloads without their encoding headers
    'accept-encoding': 'identity',
    referer: `${upstreamOrigin}/`,
  };
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

function buildShieldCsp(origin, provider, html) {
  const upstreamOrigin = PROXIED_PROVIDERS[provider] || PROXIED_PROVIDERS.vidzee;
  const own = `${origin}${PROXY_PREFIX}/${provider}`;
  return [
    `default-src 'none'`,
    `script-src ${origin}${PROXY_PREFIX}/assets/ ${own}/assets/ ${own}/_next/ ${collectInlineScriptHashes(html).join(' ')} 'wasm-unsafe-eval' 'unsafe-eval'`,
    `style-src ${origin} 'unsafe-inline' https://fonts.googleapis.com https://fonts.gstatic.com`,
    `font-src https://fonts.gstatic.com data:`,
    `img-src * data: blob:`,
    `media-src * data: blob:`,
    `connect-src https: data: blob:`,
    `worker-src ${origin}${PROXY_PREFIX}/assets/ ${own}/assets/ ${own}/_next/ blob:`,
    `frame-src ${origin} ${upstreamOrigin}`,
    `object-src 'none'`,
    `base-uri 'none'`,
  ].join('; ');
}

async function serveShieldedEmbed(req, res, upstreamPath, provider = 'vidzee') {
  const upstreamOrigin = PROXIED_PROVIDERS[provider] || PROXIED_PROVIDERS.vidzee;
  try {
    const upstream = await fetch(`${upstreamOrigin}${upstreamPath}`, {
      headers: proxyHeaders(req, upstreamOrigin),
    });
    if (!upstream.ok) {
      res.status(upstream.status);
      return res.type('text/html').send(`${provider} embed unavailable`);
    }

    let html = await upstream.text();
    const origin = shieldOrigin(req);
    const assetPrefix = `${origin}${PROXY_PREFIX}/${provider}/assets/`;

    // 1. Strip script tags pointing at known ad hosts (umommy.cyou lives here)
    html = html.replace(
      /<script\b[^>]*\bsrc="([^"]*)"[^>]*>\s*<\/script>/gi,
      (tag, src) => (AD_HOST_PATTERN.test(src) ? '' : tag)
    );

    // 2. Rewrite root-relative asset URL references into the per-provider
    // proxy namespace so every module chunk loads from our origin (CORS-clean
    // + CSP-governed). Covers Vite-style /assets/ and Next.js-style /_next/
    // chunks; a single generic pass covers quoted attributes and bracketed
    // references inside hydration bootstrap data alike.
    html = html
      .split('/assets/')
      .join(assetPrefix)
      .split('/_next/')
      .join(`${origin}${PROXY_PREFIX}/${provider}/_next/`);

    // 3. Hide ad slots + neutralize popunder listeners inside the iframe
    html = html.replace(
      '</head>',
      `<style>${SHIELD_CSS}</style></head>`
    );

    res.set('Content-Security-Policy', buildShieldCsp(origin, provider, html));
    res.set('X-Content-Type-Options', 'nosniff');
    res.set('Referrer-Policy', 'origin');
    res.set('Cache-Control', 'no-store');
    return res.type('text/html; charset=utf-8').send(html);
  } catch (err) {
    res.set('Cache-Control', 'no-store');
    return res.status(502).type('text/html').send(`${provider} embed fetch failed`);
  }
}

app.get(`${PROXY_PREFIX}/health`, (_req, res) => {
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
    const upstream = await fetch(
      `${PROXIED_PROVIDERS.vidzee}/assets/${asset}`,
      { headers: proxyHeaders(req, PROXIED_PROVIDERS.vidzee) }
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
// /player-proxy/vidfast/movie/:id        -> vidfast.vc/movie/:id
// /player-proxy/vidfast/tv/:id/:s/:e     -> vidfast.vc/tv/:id/:s/:e
// /player-proxy/<p>/assets/<a>           -> upstream /assets/<a>
// /player-proxy/<p>/<anything>           -> upstream /<anything>
app.get(`${PROXY_PREFIX}/:provider/*`, async (req, res) => {
  const provider = String(req.params.provider || '').toLowerCase();
  const rest = req.params['0'] || req.params[0] || '';
  const upstreamOrigin = PROXIED_PROVIDERS[provider];
  if (!upstreamOrigin) {
    return res.status(404).type('text/plain').send('Unknown provider');
  }

  // Assets served with long cache headers
  if (rest.startsWith('assets/') || rest.startsWith('_next/')) {
    try {
      const upstream = await fetch(`${upstreamOrigin}/${rest}`, {
        headers: proxyHeaders(req, upstreamOrigin),
      });
      if (!upstream.ok) return res.status(upstream.status).end();
      const buffer = Buffer.from(await upstream.arrayBuffer());
      res.set('Content-Type', upstream.headers.get('content-type') || 'application/octet-stream');
      res.set('Cache-Control', 'public, max-age=600');
      return res.send(buffer);
    } catch (_) {
      return res.status(502).end();
    }
  }

  // Everything else: fetch first, then shield HTML responses (embed pages);
  // raw passthrough for the rest (API calls, JSON, subtitles etc.).
  try {
    const upstream = await fetch(`${upstreamOrigin}/${rest}`, {
      headers: proxyHeaders(req, upstreamOrigin),
      redirect: 'follow',
    });
    if (!upstream.ok) {
      return res.status(upstream.status).type('text/plain').send(`${provider} upstream ${upstream.status}`);
    }
    const contentType = upstream.headers.get('content-type') || 'application/octet-stream';
    if (contentType.includes('text/html')) {
      let html = await upstream.text();
      const origin = shieldOrigin(req);
      const assetPrefix = `${origin}${PROXY_PREFIX}/${provider}/assets/`;
      html = html.replace(
        /<script\b[^>]*\bsrc="([^"]*)"[^>]*>\s*<\/script>/gi,
        (tag, src) => (AD_HOST_PATTERN.test(src) ? '' : tag)
      );
      html = html
        .split('/assets/')
        .join(assetPrefix)
        .split('/_next/')
        .join(`${origin}${PROXY_PREFIX}/${provider}/_next/`);
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
    return res.status(502).end();
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
