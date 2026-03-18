#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';

const projectRoot = process.cwd();
const envFiles = ['.env.local', '.env'];
const PLACEHOLDER = 'your-cloudflare-turnstile-site-key';

function parseEnvFile(content) {
  const result = {};
  const lines = content.split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx <= 0) continue;
    const key = trimmed.slice(0, idx).trim();
    const value = trimmed.slice(idx + 1).trim();
    result[key] = value;
  }

  return result;
}

let foundFile = null;
let turnstileKey = process.env.VITE_TURNSTILE_SITE_KEY || null;

for (const file of envFiles) {
  const fullPath = path.join(projectRoot, file);
  if (!fs.existsSync(fullPath)) continue;

  foundFile = file;
  const parsed = parseEnvFile(fs.readFileSync(fullPath, 'utf8'));
  if (!turnstileKey && parsed.VITE_TURNSTILE_SITE_KEY) {
    turnstileKey = parsed.VITE_TURNSTILE_SITE_KEY;
  }
  break;
}

const hasValue = Boolean(turnstileKey && turnstileKey.length > 0 && turnstileKey !== PLACEHOLDER);

console.log('Security environment verification');
console.log(`- Env source: ${foundFile || 'process env only'}`);
console.log(`- VITE_TURNSTILE_SITE_KEY configured: ${hasValue ? 'YES' : 'NO'}`);

if (!hasValue) {
  console.error('\nMissing or placeholder Turnstile site key.');
  console.error('Set VITE_TURNSTILE_SITE_KEY in .env.local and hosting env vars before production verification.');
  process.exit(1);
}

console.log('\nLocal env looks ready. Manual Supabase step still required:');
console.log('- Supabase Dashboard > Authentication > Settings > CAPTCHA > Cloudflare Turnstile enabled with matching keys.');
