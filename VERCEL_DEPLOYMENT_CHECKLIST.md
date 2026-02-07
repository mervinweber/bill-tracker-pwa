# Vercel Deployment Checklist - Bill Tracker PWA

**Date**: February 6, 2026  
**Status**: Ready for Deployment

## ✅ Pre-Deployment Tasks

### Code & Configuration
- [x] `vite.config.js` created and configured
- [x] `vercel.json` created with proper build settings
- [x] `.gitignore` includes `dist/`, `node_modules/`, `.env`
- [x] `package.json` has correct build scripts
- [x] Environment variables documented in `.env.example`
- [x] No hardcoded secrets in source code

### Git Setup
- [ ] All changes committed to `main` branch
- [ ] Repository pushed to GitHub
- [ ] GitHub repository is public (or give Vercel access)

### Supabase Setup (If Using)
- [ ] Supabase project created (optional - for cloud sync features)
- [ ] Environment variables noted:
  - `VITE_SUPABASE_URL`: Your Supabase project URL
  - `VITE_SUPABASE_KEY`: Your Supabase anon key

## 📋 Vercel Deployment Steps

### Step 1: Commit & Push Changes
```bash
cd /Users/mervinweber/BillTracker

# Verify all changes are staged
git status

# Commit vite.config.js and vercel.json
git add vite.config.js vercel.json
git commit -m "Add Vite and Vercel configuration for deployment"

# Push to main branch
git push origin main
```

### Step 2: Connect to Vercel
1. Go to https://vercel.com/new
2. Click "Continue with GitHub"
3. Authorize Vercel access to your GitHub account
4. Select the `BillTracker` repository
5. Click "Import"

### Step 3: Configure Project in Vercel Dashboard
The following should be auto-detected:
- **Project Name**: `bill-tracker` (or your choice)
- **Framework**: `Vite`
- **Root Directory**: `./` (or leave default)
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Install Command**: `npm install`

### Step 4: Add Environment Variables (if needed)
In Vercel Dashboard → Settings → Environment Variables:

**If using Supabase:**
- Key: `VITE_SUPABASE_URL` → Value: Your Supabase URL
- Key: `VITE_SUPABASE_KEY` → Value: Your Supabase anon key

*Note: The app works offline with localStorage, so Supabase is optional*

### Step 5: Deploy
Click the "Deploy" button and wait for build to complete.

## 🎉 Post-Deployment

### Verify Deployment
1. Check Vercel dashboard for deployment status
2. Visit your live URL (usually `https://bill-tracker.vercel.app`)
3. Test core functionality:
   - [ ] Page loads quickly
   - [ ] Dark mode toggle works
   - [ ] Add a bill entry
   - [ ] Entries persist in localStorage
   - [ ] PWA can be installed
   - [ ] Works offline

### Custom Domain (Optional)
1. In Vercel Dashboard → Settings → Domains
2. Add your custom domain
3. Update your domain's DNS records with Vercel's values
4. SSL/HTTPS auto-configured

### Enable Analytics (Optional)
- Vercel provides free analytics
- Check Vercel Dashboard → Analytics tab

## 🔧 Troubleshooting

### Build Fails
- Check that `npm run build` works locally: `npm run build`
- Verify all dependencies are in `package.json`
- Check Vercel build logs for specific errors

### App Won't Load
- Check browser console for errors
- Verify manifest.json path is correct
- Check service-worker.js is being loaded

### Environment Variables Not Working
- Variables must start with `VITE_` to be accessible in frontend code
- Verify they're set in Vercel dashboard
- Redeploy after adding variables: Settings → Redeploy

### Slow Performance
- Check Vercel Analytics for bottlenecks
- Verify service worker is caching assets
- Use Lighthouse audit (DevTools → Lighthouse)

## 📞 Support

- **Vercel Docs**: https://vercel.com/docs
- **Vite Docs**: https://vitejs.dev
- **GitHub Issues**: Create an issue in your repo

---

## Next Steps After Deployment

1. **Monitor**: Check Vercel dashboard for errors/performance
2. **Test**: Thoroughly test the live application
3. **Users**: Share the live URL with users
4. **Updates**: Any code changes push to `main` = auto-redeploy
5. **Rollback**: Revert commit if issues found, Vercel auto-redeploys
