# Deployment Guide - Bill Tracker PWA

**Last Updated**: February 3, 2026  
**Version**: 1.0  
**Status**: Production Ready

---

## Table of Contents

1. [Pre-Deployment Checklist](#pre-deployment-checklist)
2. [Deployment Platforms](#deployment-platforms)
3. [Environment Configuration](#environment-configuration)
4. [Vercel Deployment](#vercel-deployment)
5. [Netlify Deployment](#netlify-deployment)
6. [GitHub Pages Deployment](#github-pages-deployment)
7. [Traditional Server Deployment](#traditional-server-deployment)
8. [Docker Containerization](#docker-containerization)
9. [Database Setup (Supabase)](#database-setup-supabase)
10. [SSL/HTTPS Setup](#ssl--https-setup)
11. [Monitoring & Logging](#monitoring--logging)
12. [Rollback Procedures](#rollback-procedures)
13. [Post-Deployment Verification](#post-deployment-verification)
14. [Troubleshooting](#troubleshooting)

---

## Pre-Deployment Checklist

### Code Quality

- [x] Run all tests: `npm test`
- [x] Run Lighthouse audit: `npm run build && lighthouse http://localhost:3000`
- [x] Check for console errors: `npm run build && npm preview`
- [x] Verify no hardcoded secrets: `grep -r "SECRET\|API_KEY\|PASSWORD" src/`
- [x] Check bundle size: `npm run build` (should be < 150 KB)
- [x] Verify dark mode works
- [x] Test offline mode works
- [x] Confirm PWA installs

### Security Review

- [x] No sensitive data in localStorage
- [x] HTTPS enabled in production
- [x] Environment variables configured
- [x] Content Security Policy (CSP) headers set
- [x] CORS properly configured
- [x] Input validation active
- [x] XSS prevention enabled
- [x] Rate limiting configured (if applicable)

### Documentation Review

- [x] README.md complete
- [x] API documentation updated
- [x] Deployment guide current (this file)
- [x] Security guide reviewed
- [x] Troubleshooting guide complete

### Performance Review

- [x] Lighthouse score ≥ 90
- [x] Core Web Vitals pass
- [x] Load time < 3 seconds
- [x] Images optimized
- [x] CSS/JS minified

---

## Deployment Platforms

### Comparison Table

| Platform | Cost | Setup Time | Scaling | Uptime | Best For |
|----------|------|------------|---------|--------|----------|
| **Vercel** | Free/Paid | 5 min | Auto | 99.95% | ✅ Recommended |
| **Netlify** | Free/Paid | 5 min | Auto | 99.9% | ✅ Recommended |
| **GitHub Pages** | Free | 10 min | Limited | 99.9% | Small projects |
| **AWS S3** | Low cost | 15 min | Manual | 99.99% | Production |
| **DigitalOcean** | $5-24/mo | 20 min | Manual | 99.99% | Full control |
| **Docker** | Varies | 30 min | Manual | Varies | Self-hosted |

### Recommendation

**For 2026**: Use **Vercel** or **Netlify** for:
- ✅ Instant deployment
- ✅ Automatic SSL/HTTPS
- ✅ Global CDN
- ✅ Free tier available
- ✅ Zero configuration needed
- ✅ Automatic builds from Git

---

## Environment Configuration

### Environment Variables

Create `.env.local` in project root (never commit this file):

```env
# Supabase Configuration (Optional - for cloud sync)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-public-anon-key-here

# App Configuration
VITE_APP_NAME=Bill Tracker
VITE_APP_VERSION=1.0.0
VITE_API_TIMEOUT=30000

# Optional: Analytics
VITE_GOOGLE_ANALYTICS_ID=G-XXXXXXXXXX
VITE_SENTRY_DSN=https://your-sentry-dsn
```

### Build Configuration

File: `vite.config.js`
```javascript
import { defineConfig } from 'vite'

export default defineConfig({
  server: {
    port: 3000,
    strictPort: false,
    open: true
  },
  build: {
    outDir: 'dist',
    sourcemap: true,  // Set to false in production for smaller builds
    minify: 'terser',
    rollupOptions: {
      output: {
        manualChunks: {
          // Optional: code splitting
          // 'vendor': ['node_modules/...']
        }
      }
    }
  }
})
```

### Environment Files for Different Deployments

**Production (.env.production)**:
```env
VITE_APP_ENV=production
VITE_API_TIMEOUT=30000
VITE_SUPABASE_URL=https://prod-supabase.supabase.co
VITE_SUPABASE_ANON_KEY=prod-key-here
```

**Staging (.env.staging)**:
```env
VITE_APP_ENV=staging
VITE_API_TIMEOUT=40000
VITE_SUPABASE_URL=https://staging-supabase.supabase.co
VITE_SUPABASE_ANON_KEY=staging-key-here
```

**Development (.env.development)**:
```env
VITE_APP_ENV=development
VITE_API_TIMEOUT=60000
VITE_SUPABASE_URL=http://localhost:54321
VITE_SUPABASE_ANON_KEY=dev-key-here
```

---

## Vercel Deployment

**Recommended Platform** ⭐

### Step 1: Prepare Repository

```bash
# Ensure all changes are committed
git add .
git commit -m "Prepare for Vercel deployment"
git push origin main
```

### Step 2: Connect to Vercel

1. Go to https://vercel.com
2. Click "New Project"
3. Select "Import Git Repository"
4. Choose your GitHub repo: `bill-tracker-pwa`
5. Click "Import"

### Step 3: Configure Project

**In Vercel Dashboard**:

1. **Framework**: Select "Vite"
2. **Root Directory**: `./` (or auto-detected)
3. **Build Command**: `npm run build`
4. **Output Directory**: `dist`
5. **Install Command**: `npm install`

**Environment Variables**:
```
VITE_SUPABASE_URL = https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY = your-public-key
```

### Step 4: Deploy

1. Click "Deploy"
2. Vercel builds and deploys automatically
3. Get production URL (e.g., `bill-tracker.vercel.app`)

### Step 5: Configure Custom Domain (Optional)

1. In Vercel: Settings → Domains
2. Add custom domain (e.g., `billtrackerapp.com`)
3. Update DNS records with Vercel's nameservers
4. Verify domain
5. Auto-SSL/HTTPS configured

### Automatic Deployments

After initial setup:
- Push to `main` → Automatic production deployment
- Push to other branches → Preview deployments
- Pull requests → Automatic preview URLs

### Rollback on Vercel

1. Go to Vercel Dashboard → Deployments
2. Find previous good deployment
3. Click "..." → "Promote to Production"
4. Instant rollback to previous version

---

## Netlify Deployment

**Alternative Recommended Platform** ⭐

### Step 1: Prepare Repository

```bash
git add .
git commit -m "Prepare for Netlify deployment"
git push origin main
```

### Step 2: Connect to Netlify

1. Go to https://netlify.com
2. Click "New site from Git"
3. Select GitHub provider
4. Authorize and select `bill-tracker-pwa` repo
5. Click "Connect repository"

### Step 3: Configure Build

**Build Settings**:
- Build command: `npm run build`
- Publish directory: `dist`
- Node version: `18` or later

**Environment Variables**:
```
VITE_SUPABASE_URL = https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY = your-public-key
```

### Step 4: Deploy

1. Click "Deploy site"
2. Netlify builds and deploys
3. Get URL (e.g., `bill-tracker.netlify.app`)

### Step 5: Custom Domain

1. Go to Site Settings → Domain management
2. Add custom domain
3. Update DNS records
4. Auto-HTTPS configured

### Automatic Deployments

- Push to `main` → Production deployment
- Other branches → Preview deployments
- Pull requests → Automatic review URLs

### Rollback on Netlify

1. Go to Netlify → Deploys
2. Find previous successful deployment
3. Click "Publish deploy"
4. Instant rollback

---

## GitHub Pages Deployment

**Simple & Free** (but limited)

### Step 1: Create `.github/workflows/deploy.yml`

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      
      - name: Setup Node.js
        uses: actions/setup-node@v2
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm install
      
      - name: Build
        run: npm run build
      
      - name: Deploy to GitHub Pages
        uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./dist
```

### Step 2: Update `vite.config.js`

```javascript
export default defineConfig({
  base: '/bill-tracker-pwa/',  // Change to repo name
  // ... rest of config
})
```

### Step 3: Enable GitHub Pages

1. Go to Repository Settings
2. Scroll to "GitHub Pages"
3. Select "gh-pages" branch as source
4. Click "Save"

### Step 4: Deploy

```bash
git push origin main
```

GitHub Actions automatically builds and deploys.

**Result**: Available at `https://yourusername.github.io/bill-tracker-pwa/`

**Limitation**: No server-side features, CORS limitations

---

## Traditional Server Deployment

### Option A: DigitalOcean Droplet

**Step 1: Create Droplet**
```bash
# Create Ubuntu 22.04 droplet
# SSH into droplet
ssh root@your-ip
```

**Step 2: Setup Server**
```bash
# Update system
apt update && apt upgrade -y

# Install Node.js
curl -sL https://deb.nodesource.com/setup_18.x | sudo bash
apt install -y nodejs

# Install nginx
apt install -y nginx

# Install PM2 (process manager)
npm install -g pm2
```

**Step 3: Clone and Build**
```bash
cd /var/www
git clone https://github.com/yourusername/bill-tracker-pwa.git
cd bill-tracker-pwa
npm install
npm run build
```

**Step 4: Setup Nginx**

File: `/etc/nginx/sites-available/default`
```nginx
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    
    server_name your-domain.com www.your-domain.com;
    
    root /var/www/bill-tracker-pwa/dist;
    index index.html;
    
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

**Step 5: Enable HTTPS with Let's Encrypt**
```bash
apt install -y certbot python3-certbot-nginx
certbot --nginx -d your-domain.com
```

**Step 6: Restart Nginx**
```bash
systemctl restart nginx
```

### Option B: AWS Deployment

**Using S3 + CloudFront**:

1. Create S3 bucket for `your-domain.com`
2. Upload `dist` folder contents
3. Create CloudFront distribution pointing to S3
4. Add SSL/HTTPS certificate (ACM)
5. Configure DNS to CloudFront URL

---

## Docker Containerization

### Dockerfile

```dockerfile
# Build stage
FROM node:18-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Production stage
FROM nginx:alpine

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

### nginx.conf

```nginx
server {
    listen 80;
    server_name _;
    
    root /usr/share/nginx/html;
    index index.html;
    
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    location ~* \.(js|css|png|jpg)$ {
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
}
```

### docker-compose.yml

```yaml
version: '3.8'

services:
  bill-tracker:
    build: .
    ports:
      - "80:80"
    environment:
      - VITE_SUPABASE_URL=https://your-project.supabase.co
      - VITE_SUPABASE_ANON_KEY=your-key
    restart: always
```

### Deploy Docker

```bash
# Build image
docker build -t bill-tracker:latest .

# Run container
docker run -d -p 80:80 bill-tracker:latest

# Or with docker-compose
docker-compose up -d
```

---

## Database Setup (Supabase)

### Create Supabase Project

1. Go to https://supabase.com
2. Click "New Project"
3. Choose region (closest to users)
4. Set password
5. Wait for project to be created

### Create Tables

Run these SQL queries in Supabase SQL Editor:

```sql
-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT now()
);

-- Bills table
CREATE TABLE bills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  amount DECIMAL NOT NULL,
  due_date DATE NOT NULL,
  payment_status TEXT DEFAULT 'pending',
  category TEXT,
  recurring BOOLEAN DEFAULT false,
  frequency TEXT,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

-- Create RLS policies
ALTER TABLE bills ENABLE ROW LEVEL SECURITY;

CREATE POLICY select_own_bills ON bills
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY insert_own_bills ON bills
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY update_own_bills ON bills
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY delete_own_bills ON bills
  FOR DELETE USING (auth.uid() = user_id);
```

### Get API Keys

1. In Supabase: Settings → API
2. Copy:
   - Project URL (for `VITE_SUPABASE_URL`)
   - Anon Public Key (for `VITE_SUPABASE_ANON_KEY`)
3. Add to `.env.local`

---

## SSL/HTTPS Setup

### Automatic (Recommended)

**Vercel & Netlify**: Automatic HTTPS included ✅

**GitHub Pages**: Automatic HTTPS included ✅

### Manual Setup (Self-hosted)

**Option 1: Let's Encrypt (Free)**
```bash
# Install certbot
apt install certbot python3-certbot-nginx

# Get certificate
certbot --nginx -d yourdomain.com

# Auto-renews every 60 days
```

**Option 2: AWS Certificate Manager (Free)**
1. Request public certificate
2. Add to CloudFront/Load Balancer

### Verify HTTPS

```bash
# Check certificate
openssl s_client -connect yourdomain.com:443

# Or visit site and check padlock icon
```

---

## Monitoring & Logging

### Performance Monitoring

**Using Google Analytics 4**:
```javascript
// Add to index.js
import { getCLS, getFID, getFCP, getLCP, getTTFB } from 'web-vitals';

function sendMetric(metric) {
  gtag('event', metric.name, {
    value: Math.round(metric.value),
    event_category: 'web_vitals'
  });
}

getCLS(sendMetric);
getFID(sendMetric);
getFCP(sendMetric);
getLCP(sendMetric);
getTTFB(sendMetric);
```

### Error Logging

**Using Sentry**:
```bash
npm install @sentry/browser
```

```javascript
import * as Sentry from "@sentry/browser";

Sentry.init({
  dsn: process.env.VITE_SENTRY_DSN,
  environment: process.env.VITE_APP_ENV
});
```

### Server Monitoring

- **Vercel**: Built-in monitoring
- **Netlify**: Built-in monitoring
- **Self-hosted**: Use New Relic, Datadog, or Prometheus

---

## Rollback Procedures

### Immediate Rollback

**Vercel**:
1. Deployments page
2. Find last good deployment
3. Click "..." → "Promote to Production"
4. **Complete in < 1 minute**

**Netlify**:
1. Deploys page
2. Find last good deploy
3. Click "Publish deploy"
4. **Complete in < 1 minute**

**GitHub Pages**:
1. Revert commit: `git revert <commit-hash>`
2. Push to main
3. GitHub Actions rebuilds
4. **Complete in 2-5 minutes**

### Data Rollback

**If data corrupted**:
1. Export backup from settings
2. Or restore from Supabase backups
3. Contact support if needed

---

## Post-Deployment Verification

### Checklist

- [ ] URL loads (check for 404 errors)
- [ ] Lighthouse score ≥ 90
- [ ] Core Web Vitals pass
- [ ] Offline mode works (DevTools → Offline)
- [ ] Add bill works
- [ ] Edit bill works
- [ ] Delete bill works
- [ ] Calendar view renders
- [ ] Analytics charts display
- [ ] Dark mode toggle works
- [ ] PWA installs
- [ ] Service worker registered
- [ ] No console errors (F12)
- [ ] Supabase sync works (if configured)
- [ ] All links working
- [ ] Images load properly
- [ ] Responsive design on mobile

### Monitoring Commands

```bash
# Check deployment status (Vercel)
vercel status

# Check build logs
vercel logs

# Check performance
curl -I https://your-domain.com

# Monitor in real-time
watch -n 5 'curl -I https://your-domain.com'
```

---

## Troubleshooting

### Issue: Blank Page After Deployment

**Cause**: Build output directory not configured

**Solution**:
- Check build command: `npm run build`
- Verify output directory: `dist/`
- Ensure index.html in dist/

### Issue: Assets Return 404

**Cause**: Incorrect base path

**Solution** (in `vite.config.js`):
```javascript
export default defineConfig({
  base: '/',  // or '/bill-tracker-pwa/' for subpath
})
```

### Issue: Supabase Connection Fails

**Cause**: Invalid API keys or CORS issue

**Solution**:
1. Verify `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
2. Check Supabase CORS settings
3. Verify RLS policies

### Issue: Service Worker Not Caching

**Cause**: Service worker not registered or cache storage full

**Solution**:
- Clear cache in browser
- Check DevTools → Application → Service Workers
- Verify service worker file deployed

### Issue: High Memory Usage

**Cause**: Memory leak in app or too many listeners

**Solution**:
- Check for unremoved event listeners
- Analyze with DevTools Memory profiler
- Update dependencies

---

## Deployment Checklist (Final)

**Before Going Live**:

```
Pre-Deployment:
- [ ] All tests passing
- [ ] Lighthouse score 90+
- [ ] No console errors
- [ ] Secrets in .env (not in code)
- [ ] Bundle size checked
- [ ] Documentation updated

Deployment:
- [ ] Built artifacts generated
- [ ] Environment variables configured
- [ ] SSL/HTTPS enabled
- [ ] Domain configured
- [ ] DNS updated
- [ ] Deployment successful

Post-Deployment:
- [ ] Site loads without errors
- [ ] Performance acceptable
- [ ] PWA works offline
- [ ] All features tested
- [ ] Monitoring active
- [ ] Backup procedure tested
- [ ] Rollback tested
```

---

## References

- [Vite Deployment Guide](https://vitejs.dev/guide/static-deploy.html)
- [Vercel Documentation](https://vercel.com/docs)
- [Netlify Documentation](https://docs.netlify.com)
- [Supabase Documentation](https://supabase.com/docs)
- [Let's Encrypt](https://letsencrypt.org)
- [Docker Documentation](https://docs.docker.com)

---

## Support

For deployment issues:
1. Check this guide first
2. Review platform's documentation
3. Check build logs
4. Verify environment variables
5. Open GitHub issue if needed

