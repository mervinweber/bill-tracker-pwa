#!/usr/bin/env node
import http from 'node:http';
import https from 'node:https';


/**
 * Verifies core post-deploy PWA signals on a live URL:
 * - entry HTML is reachable
 * - manifest can be discovered and fetched
 * - service worker endpoint responds
 * - basic smoke endpoints respond
 */

const urlArg = process.argv[2];

if (!urlArg) {
  console.error('Usage: node scripts/verify_production_pwa.mjs <base-url>');
  process.exit(1);
}

let baseUrl;
try {
  baseUrl = new URL(urlArg);
} catch {
  console.error(`Invalid URL: ${urlArg}`);
  process.exit(1);
}

if (!['http:', 'https:'].includes(baseUrl.protocol)) {
  console.error('URL must start with http:// or https://');
  process.exit(1);
}

const trimTrailingSlash = (value) => value.replace(/\/+$/, '');
const root = trimTrailingSlash(baseUrl.toString());

const checks = [];
let hasFailure = false;

function pushResult(name, pass, detail) {
  checks.push({ name, pass, detail });
  if (!pass) {
    hasFailure = true;
  }
}

function requestUrl(url, redirects = 0) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const client = parsed.protocol === 'https:' ? https : http;

    const req = client.request(parsed, { method: 'GET' }, (res) => {
      const statusCode = res.statusCode || 0;
      const location = res.headers.location;

      if (statusCode >= 300 && statusCode < 400 && location) {
        if (redirects >= 5) {
          reject(new Error('Too many redirects'));
          return;
        }

        const nextUrl = new URL(location, url).toString();
        resolve(requestUrl(nextUrl, redirects + 1));
        return;
      }

      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => {
        resolve({
          status: statusCode,
          ok: statusCode >= 200 && statusCode < 300,
          headers: res.headers,
          text: Buffer.concat(chunks).toString('utf8')
        });
      });
    });

    req.on('error', reject);
    req.end();
  });
}

function absoluteUrl(pathOrUrl) {
  try {
    return new URL(pathOrUrl, `${root}/`).toString();
  } catch {
    return null;
  }
}

function findManifestHref(html) {
  const manifestRegex = /<link[^>]+rel=["'][^"']*manifest[^"']*["'][^>]*href=["']([^"']+)["'][^>]*>/i;
  const reverseManifestRegex = /<link[^>]+href=["']([^"']+)["'][^>]*rel=["'][^"']*manifest[^"']*["'][^>]*>/i;
  const first = html.match(manifestRegex)?.[1];
  if (first) return first;
  return html.match(reverseManifestRegex)?.[1] || null;
}

function checkSecurityHeaders(headers = {}, prefix = 'Security headers') {
  const normalized = Object.fromEntries(
    Object.entries(headers).map(([k, v]) => [String(k).toLowerCase(), String(v || '')])
  );

  const expected = [
    {
      key: 'strict-transport-security',
      validate: (v) => v.includes('max-age=') && v.includes('includesubdomains'),
      detail: 'must include max-age and includeSubDomains'
    },
    {
      key: 'x-content-type-options',
      validate: (v) => v.trim().toLowerCase() === 'nosniff',
      detail: 'must be nosniff'
    },
    {
      key: 'x-frame-options',
      validate: (v) => v.trim().toUpperCase() === 'DENY',
      detail: 'must be DENY'
    },
    {
      key: 'referrer-policy',
      validate: (v) => v.trim().toLowerCase() === 'strict-origin-when-cross-origin',
      detail: 'must be strict-origin-when-cross-origin'
    },
    {
      key: 'permissions-policy',
      validate: (v) => v.includes('camera=()') && v.includes('microphone=()') && v.includes('geolocation=()'),
      detail: 'must disable camera/microphone/geolocation'
    },
    {
      key: 'content-security-policy',
      validate: (v) => v.includes("default-src 'self'") && v.includes("script-src 'self'") && v.includes('connect-src'),
      detail: 'must include baseline CSP directives'
    }
  ];

  for (const item of expected) {
    const value = String(normalized[item.key] || '');
    const pass = Boolean(value) && item.validate(value.toLowerCase());
    pushResult(`${prefix}: ${item.key}`, pass, pass ? value : `${item.detail}; actual=${value || 'missing'}`);
  }
}

async function checkEndpoint(path) {
  const url = absoluteUrl(path);
  if (!url) {
    pushResult(`Smoke ${path}`, false, 'Unable to construct URL');
    return;
  }
  try {
    const res = await requestUrl(url);
    pushResult(`Smoke ${path}`, res.ok, `HTTP ${res.status}`);
  } catch (error) {
    pushResult(`Smoke ${path}`, false, error?.message || 'Request failed');
  }
}

async function run() {
  let html = '';

  try {
    const res = await requestUrl(`${root}/`);
    html = res.text;
    pushResult('Home page reachable', res.ok, `HTTP ${res.status}`);
    if (res.ok) {
      checkSecurityHeaders(res.headers, 'Root response security headers');
    }
  } catch (error) {
    pushResult('Home page reachable', false, error?.message || 'Request failed');
  }

  let manifestUrl = absoluteUrl('/manifest.json');
  if (html) {
    const discoveredHref = findManifestHref(html);
    if (discoveredHref) {
      const discoveredUrl = absoluteUrl(discoveredHref);
      if (discoveredUrl) {
        manifestUrl = discoveredUrl;
      }
    }
  }

  if (!manifestUrl) {
    pushResult('Manifest URL resolution', false, 'Unable to resolve manifest URL');
  } else {
    try {
      const res = await requestUrl(manifestUrl);
      const contentType = String(res.headers['content-type'] || '').toLowerCase();
      const json = JSON.parse(res.text);
      const hasName = typeof json.name === 'string' || typeof json.short_name === 'string';
      const hasStartUrl = typeof json.start_url === 'string';
      const hasIcons = Array.isArray(json.icons) && json.icons.length > 0;
      pushResult('Manifest reachable', res.ok, `HTTP ${res.status}`);
      pushResult('Manifest is JSON', contentType.includes('json'), contentType || 'unknown content-type');
      pushResult('Manifest has app metadata', hasName && hasStartUrl && hasIcons, `name=${hasName} start_url=${hasStartUrl} icons=${hasIcons}`);
    } catch (error) {
      pushResult('Manifest validation', false, error?.message || 'Manifest request/parse failed');
    }
  }

  const swUrl = absoluteUrl('/service-worker.js');
  if (!swUrl) {
    pushResult('Service worker URL resolution', false, 'Unable to resolve service worker URL');
  } else {
    try {
      const res = await requestUrl(swUrl);
      const text = res.text;
      pushResult('Service worker reachable', res.ok, `HTTP ${res.status}`);
      const looksLikeSw = /self\.addEventListener\(/.test(text) || /ASSETS_TO_CACHE/.test(text);
      pushResult('Service worker content sanity', looksLikeSw, 'Expected listener/cache markers present');
    } catch (error) {
      pushResult('Service worker validation', false, error?.message || 'Service worker request failed');
    }
  }

  await checkEndpoint('/setup.html');

  console.log(`\\nProduction PWA verification for ${root}`);
  for (const check of checks) {
    const icon = check.pass ? 'PASS' : 'FAIL';
    console.log(`[${icon}] ${check.name} - ${check.detail}`);
  }

  if (hasFailure) {
    process.exit(1);
  }

  console.log('\\nAll production PWA checks passed.');
}

run();
