# Developer Setup Guide

This guide will help you set up the Bill Tracker PWA for local development.

## Prerequisites

- **Node.js** 14+ and npm 6+ (or Python 3 as alternative)
- **Git** for version control
- **VS Code** (or any code editor)
- **Supabase account** (free tier) for cloud sync feature

## Quick Start (5 minutes)

### Option A: Using Node.js (Recommended)

```bash
# 1. Clone the repository
git clone https://github.com/mervinweber/bill-tracker-pwa.git
cd bill-tracker-pwa

# 2. Install dependencies
npm install

# 3. Start development server
npm run dev

# 4. Open in browser
# The app will be available at http://localhost:5173 (or port shown in terminal)
```

### Option B: Using Python (No Node.js needed)

```bash
# 1. Clone the repository
git clone https://github.com/mervinweber/bill-tracker-pwa.git
cd bill-tracker-pwa

# 2. Start Python's built-in server
python3 -m http.server 8000

# 3. Open in browser
# Navigate to http://localhost:8000
```

## Detailed Setup Instructions

### 1. Clone Repository

```bash
git clone https://github.com/mervinweber/bill-tracker-pwa.git
cd bill-tracker-pwa
```

### 2. Install Node.js (if not already installed)

**macOS (using Homebrew)**:
```bash
brew install node
```

**Windows (using Chocolatey)**:
```bash
choco install nodejs
```

**Linux (Ubuntu/Debian)**:
```bash
sudo apt update
sudo apt install nodejs npm
```

**Verify installation**:
```bash
node --version  # Should show v14+
npm --version   # Should show 6+
```

### 3. Install Dependencies

```bash
npm install
```

This installs:
- **Vite** - Fast development server and build tool
- **Chart.js** - For analytics charts

### 4. Configure Development Environment

#### Create `.env` file (Optional - for Supabase)

Create a file named `.env` in the project root:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

**To get these values**:
1. Go to [supabase.com](https://supabase.com)
2. Create a free project (or sign in)
3. Go to **Project Settings** → **API**
4. Copy the **Project URL** and **anon/public Key**

#### Note on Supabase
- Supabase is **optional** - the app works fully offline
- Local data is stored in localStorage automatically
- Supabase enables cloud sync across devices

### 5. Start Development Server

```bash
npm run dev
```

**Output** (example):
```
  VITE v4.5.14  ready in 234 ms

  ➜  Local:   http://localhost:5173/
  ➜  press h + enter to show help
```

Open http://localhost:5173/ in your browser.

### 6. Initial Setup

On first run, you'll see the **Setup Page** (`setup.html`):

1. **Enter Payment Frequency**:
   - Select: Weekly, Bi-weekly, Semi-monthly, Monthly, or Annual
   - Example: "Bi-weekly" for paycheck every 2 weeks

2. **Enter Start Date**:
   - First paycheck date (YYYY-MM-DD format)
   - Example: "2026-01-15"

3. **Enter Amount** (Optional):
   - Your paycheck amount
   - Used for dashboard display

4. **Click "Save Settings"**

You're now ready to add bills!

## Common Development Tasks

### Run Development Server

```bash
npm run dev
```

Auto-reloads on file changes.

### Build for Production

```bash
npm run build
```

Creates optimized build in `dist/` folder.

### Preview Production Build

```bash
npm run preview
```

Test your production build locally.

### Run Tests

```bash
# Run individual test suites
node tests/appState.test.js
node tests/paycheckManager.test.js
node tests/billActionHandlers.test.js

# Or run all tests
npm test  # (if test script is configured in package.json)
```

### Check for Errors

**Using VS Code**:
- Extensions like **Pylance** or **ESLint** show errors inline

**Using Terminal**:
```bash
npm run lint  # (if configured)
```

## Project File Structure

```
bill-tracker-pwa/
├── src/
│   ├── index.js              # Entry point (16 lines)
│   ├── index.css             # Global styles
│   ├── app.js                # App orchestrator
│   ├── components/           # UI components
│   │   ├── header.js
│   │   ├── sidebar.js
│   │   ├── billGrid.js
│   │   ├── billForm.js
│   │   ├── dashboard.js
│   │   └── authModal.js
│   ├── handlers/             # Business logic
│   │   ├── billActionHandlers.js
│   │   └── settingsHandler.js
│   ├── store/                # State & data
│   │   ├── appState.js
│   │   └── BillStore.js
│   ├── utils/                # Utilities
│   │   ├── paycheckManager.js
│   │   ├── dateHelpers.js
│   │   ├── billHelpers.js
│   │   ├── errorHandling.js
│   │   └── storage.js
│   ├── views/                # Complex views
│   │   ├── calendarView.js
│   │   └── analyticsView.js
│   ├── services/             # External services
│   │   └── supabase.js
│   └── data/
│       └── categories.json   # Default bill categories
├── public/
│   ├── manifest.json         # PWA manifest
│   ├── service-worker.js     # Offline support
│   └── icons/                # App icons
├── tests/                    # Unit tests
│   ├── appState.test.js
│   ├── paycheckManager.test.js
│   ├── billActionHandlers.test.js
│   └── ... more tests
├── index.html                # Main HTML file
├── setup.html                # Setup page
├── package.json              # Dependencies & scripts
└── vite.config.js           # Vite configuration (if exists)
```

## Key Files to Understand

### Start Here:
1. **`src/index.js`** - Entry point, very short
2. **`src/app.js`** - Main app orchestrator
3. **`src/store/appState.js`** - State management
4. **`src/store/BillStore.js`** - Data storage

### Then Explore:
5. **`src/handlers/billActionHandlers.js`** - Bill operations
6. **`src/utils/paycheckManager.js`** - Paycheck logic
7. **`src/components/`** - UI components

## Development Workflow

### 1. Making Changes

**Edit a component**:
```javascript
// src/components/billGrid.js
// Make your changes
// Save the file
// Browser auto-refreshes (Vite hot reload)
```

### 2. Testing Changes

**Manually test**:
1. Open app in browser at http://localhost:5173/
2. Use DevTools (F12) to debug
3. Check console for errors

**Run unit tests**:
```bash
node tests/appState.test.js
```

### 3. Debugging Tips

**Check console for errors**:
- Press F12 in browser → Console tab
- Look for red error messages

**Use debugger**:
```javascript
// Add to your code
debugger;  // Pauses execution when DevTools open
```

**Log values**:
```javascript
console.log('Current bills:', billStore.getAll());
console.log('App state:', appState.getState());
```

**Check localStorage**:
```javascript
// In browser console
localStorage.getItem('bills')
localStorage.getItem('paymentSettings')
localStorage.getItem('selectedCategory')
```

## Architecture Overview

See [ARCHITECTURE.md](./ARCHITECTURE.md) for detailed architecture documentation.

**Quick Summary**:
- **appState.js** - UI state (what's selected, displayed, etc.)
- **BillStore.js** - Bill data (single source of truth)
- **billActionHandlers.js** - Bill operations (add, update, delete, etc.)
- **paycheckManager.js** - Paycheck date generation
- **Components** - React to state changes

## Git Workflow

### Create a Feature Branch

```bash
git checkout -b feature/your-feature-name
```

### Make Changes and Commit

```bash
git add .
git commit -m "Clear description of changes"
```

### Push to GitHub

```bash
git push origin feature/your-feature-name
```

### Create Pull Request

On GitHub, create a PR to merge your feature into `main`.

## Troubleshooting

### Problem: "npm: command not found"
**Solution**: Node.js not installed. See "Install Node.js" section above.

### Problem: Port 5173 already in use
**Solution**: Run on different port
```bash
npm run dev -- --port 3000
```

### Problem: Vite gives "module not found" error
**Solution**: Install dependencies
```bash
npm install
```

### Problem: localStorage not working
**Solution**: Clear browser cache
```bash
# Press F12 → Application tab → localStorage → Clear
# Or use browser's "Clear all" option
```

### Problem: Changes not reflecting in browser
**Solution**: 
```bash
# Restart dev server
# Press Ctrl+C to stop
npm run dev
```

### Problem: Supabase connection failing
**Solution**:
1. Verify `.env` file has correct credentials
2. Check that project is active on supabase.com
3. Try app without Supabase (it works offline)

## Useful VS Code Extensions

Install these for better development experience:

1. **ES7+ React/Redux/React-Native snippets**
   - Adds code snippets for faster coding

2. **Prettier - Code formatter**
   - Formats code automatically
   - Configure to format on save

3. **Error Lens**
   - Shows errors inline
   - Saves time debugging

4. **Thunder Client** or **REST Client**
   - Test APIs without Postman
   - Useful when testing Supabase

## Next Steps

1. ✅ Complete setup above
2. 📖 Read [ARCHITECTURE.md](./ARCHITECTURE.md) to understand code structure
3. 💡 Review [src/app.js](./src/app.js) to see how components work together
4. 🧪 Run tests in `tests/` to understand expected behavior
5. ✨ Make a small change and test it

## Getting Help

- Check existing [issues](https://github.com/mervinweber/bill-tracker-pwa/issues)
- Review [REFACTORING_COMPLETE.md](./REFACTORING_COMPLETE.md) for architectural decisions
- Check [UX_ACCESSIBILITY_IMPROVEMENTS.md](./UX_ACCESSIBILITY_IMPROVEMENTS.md) for UI/UX details
- Look at test files in `tests/` for usage examples

## Resources

- [Vite Documentation](https://vitejs.dev/)
- [MDN Web Docs](https://developer.mozilla.org/)
- [Supabase Documentation](https://supabase.com/docs)
- [Chart.js Documentation](https://www.chartjs.org/)
- [Progressive Web Apps](https://web.dev/progressive-web-apps/)

Happy coding! 🚀
