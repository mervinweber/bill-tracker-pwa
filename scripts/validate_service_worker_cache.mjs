import fs from 'node:fs';
import path from 'node:path';

const distRoot = path.resolve(process.cwd(), 'dist');
const swPath = path.join(distRoot, 'service-worker.js');

if (!fs.existsSync(swPath)) {
  console.error('❌ dist/service-worker.js not found. Run build before validation.');
  process.exit(1);
}

const swContent = fs.readFileSync(swPath, 'utf8');
const match = swContent.match(/ASSETS_TO_CACHE\s*=\s*\[(.*?)\]/s);

if (!match) {
  console.error('❌ ASSETS_TO_CACHE array not found in built service worker.');
  process.exit(1);
}

const assets = [...match[1].matchAll(/'([^']+)'/g)].map((m) => m[1]);
if (assets.length === 0) {
  console.error('❌ ASSETS_TO_CACHE is empty.');
  process.exit(1);
}

const missing = [];
for (const asset of assets) {
  const rel = asset.startsWith('/') ? asset.slice(1) : asset;
  const fullPath = path.join(distRoot, rel);
  if (!fs.existsSync(fullPath)) {
    missing.push(asset);
  }
}

if (missing.length > 0) {
  console.error('❌ Service worker cache manifest contains missing assets:');
  missing.forEach((asset) => console.error(`   - ${asset}`));
  process.exit(1);
}

console.log(`✅ Service worker cache manifest valid (${assets.length} assets).`);
