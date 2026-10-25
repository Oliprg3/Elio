import express from 'express';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3000;

// ---------------------------------------------------------------------------
// VidZee Shield Proxy
// ---------------------------------------------------------------------------
// The VidZee embed injects its own ad overlay (ads-container div + obfuscated
// ad scripts such as umommy.cyou) inside the iframe. Cross-origin parent pages
// cannot remove that DOM, so we re-serve the embed from our own origin with:
//   1. known ad scripts stripped from the HTML
//   2. assets transparently re-served via /player-proxy/assets/*
//   3. a strict Content-Security-Policy that hash-allowlists only the embed's
//      own bootstrap inline scripts, so any ad script injected at runtime
//      (inline or remote) is blocked by the browser itself
//   4. CSS that hides the .ads-container ad slot
// ---------------------------------------------------------------------------

const UPSTREAM_ORIGIN = 'https://player.vidzee.wtf';
const PROXY_PREFIX = '/player-proxy';

const AD_HOST_PATTERN = new RegExp(
  [
    'umommy\\.cyou', 'llvpn\\.com', 'popads', 'popcash', 'adsterra',
    'propellerads', 'exoclick', 'adcash', 'monetag', 'hilltopads',
    'clickadu', 'ad-maven', 'popmyads', 'realsrv', 'clickaine',
    'trafficstars', 'trafficjunky', 'yllix', 'popunder', 'zeroredirect',
    'revenuehits', 'onclickpredict', 'adnexus?\\.', 'com\.adservice',
  ].join('|'),
  'i'
);

const SHIELD_CSS =
  'div.ads-container{display:none !important;pointer-events:none !important}' +
  'div.ads-container *{display:none !important}html{overflow:auto}';

function shieldOrigin(req) {
  const host =
    req.headers['x-forwarded-host'] || req.headers.host || 'localhost:3000';
  const proto = req.headers['x-forwarded-proto'] || req.protocol || 'http';
  return `${proto}://${host}`;
}

function proxyHeaders(req) {
  return {
    'user-agent':
      req.headers['user-agent'] ||
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36',
    accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    // Ask upstream for plain bytes so we can transform HTML and never
    // forward compressed payloads without their encoding headers
    'accept-encoding': 'identity',
    referer: `${UPSTREAM_ORIGIN}/`,
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

function buildShieldCsp(origin, html) {
  return [
    `default-src 'none'`,
    `script-src ${origin}${PROXY_PREFIX}/assets/ ${collectInlineScriptHashes(html).join(' ')} 'wasm-unsafe-eval' 'unsafe-eval'`,
    `style-src ${origin} 'unsafe-inline' https://fonts.googleapis.com https://fonts.gstatic.com`,
    `font-src https://fonts.gstatic.com data:`,
    `img-src * data: blob:`,
    `media-src * data: blob:`,
    `connect-src https: data: blob:`,
    `worker-src ${origin}${PROXY_PREFIX}/assets/ blob:`,
    `frame-src ${origin} https://player.vidzee.wtf`,
    `object-src 'none'`,
    `base-uri 'none'`,
  ].join('; ');
}

async function serveShieldedEmbed(req, res, upstreamPath) {
  try {
    const upstream = await fetch(`${UPSTREAM_ORIGIN}${upstreamPath}`, {
      headers: proxyHeaders(req),
    });
    if (!upstream.ok) {
      res.status(upstream.status);
      return res.type('text/html').send('VidZee embed unavailable');
    }

    let html = await upstream.text();
    const origin = shieldOrigin(req);

    // 1. Strip script tags pointing at known ad hosts (umommy.cyou lives here)
    html = html.replace(
      /<script\b[^>]*\bsrc="([^"]*)"[^>]*>\s*<\/script>/gi,
      (tag, src) => (AD_HOST_PATTERN.test(src) ? '' : tag)
    );

    // 2. Rewrite root-relative asset URLs into the proxy namespace so every
    // module chunk loads from our origin (CORS-clean + CSP-governed). A single
    // generic pass covers quoted attributes as well as bracketed references
    // inside the hydration bootstrap data.
    html = html.split('/assets/').join(`${origin}${PROXY_PREFIX}/assets/`);

    // 3. Hide the ad slot + neutralize popunder listeners inside the iframe
    html = html.replace(
      '</head>',
      `<style>${SHIELD_CSS}</style></head>`
    );

    res.set('Content-Security-Policy', buildShieldCsp(origin, html));
    res.set('X-Content-Type-Options', 'nosniff');
    res.set('Referrer-Policy', 'origin');
    res.set('Cache-Control', 'no-store');
    return res.type('text/html; charset=utf-8').send(html);
  } catch (err) {
    return res.status(502).type('text/html').send('VidZee embed fetch failed');
  }
}

app.get(`${PROXY_PREFIX}/health`, (_req, res) => {
  res.json({ ok: true });
});

app.get('/player-proxy/embed/movie/:id', async (req, res) => {
  const id = String(req.params.id || '').replace(/[^0-9]/g, '');
  const query = new URLSearchParams({ lang: 'en', sub: 'en', ...req.query });
  return serveShieldedEmbed(req, res, `/embed/movie/${id}?${query.toString()}`);
});

app.get('/player-proxy/embed/tv/:id/:s/:e', async (req, res) => {
  const id = String(req.params.id || '').replace(/[^0-9]/g, '');
  const s = String(req.params.s || '').replace(/[^0-9]/g, '');
  const e = String(req.params.e || '').replace(/[^0-9]/g, '');
  const query = new URLSearchParams({ lang: 'en', sub: 'en', ...req.query });
  return serveShieldedEmbed(
    req,
    res,
    `/embed/tv/${id}/${s}/${e}?${query.toString()}`
  );
});

app.get('/player-proxy/assets/:asset', async (req, res) => {
  const asset = String(req.params.asset || '');
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(asset)) {
    return res.status(400).end();
  }
  try {
    const upstream = await fetch(`${UPSTREAM_ORIGIN}/assets/${asset}`, {
      headers: proxyHeaders(req),
    });
    if (!upstream.ok) return res.status(upstream.status).end();
    const buffer = Buffer.from(await upstream.arrayBuffer());
    res.set('Content-Type', upstream.headers.get('content-type') || 'application/octet-stream');
    res.set('Cache-Control', 'public, max-age=600');
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
