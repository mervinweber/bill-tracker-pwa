# Security Guide - Bill Tracker PWA

This document outlines security best practices and implementation details for the Bill Tracker PWA.

## Overview

Security in the Bill Tracker PWA is implemented at multiple layers:
1. **Client-side validation** - Input sanitization and validation
2. **Data protection** - Secure storage and transmission
3. **User privacy** - No unnecessary data collection
4. **Dependency security** - Minimal dependencies with security focus

## Data Security

### Local Data Storage

#### localStorage (Default)
- **Location**: Client-side browser storage
- **Encryption**: None (recommended to use HTTPS to prevent interception)
- **Access**: Same-origin policy enforced by browser
- **Privacy**: Only accessible by this domain

**Data Stored Locally**:
```javascript
{
  bills: [array of bill objects],
  paymentSettings: {frequency, startDate, amount},
  customCategories: [array of category names],
  selectedCategory: [last selected],
  themePreference: 'light' | 'dark'
}
```

**Security Considerations**:
- ✅ Only runs on client's computer
- ✅ No server access to personal data
- ⚠️ Accessible if device is compromised
- ⚠️ Lost if browser data cleared

#### Protection Measures
```javascript
// Safe storage access with error handling
import { safeGetFromStorage, safeSetToStorage } from './utils/errorHandling.js';

// Always use safe accessors
const bills = safeGetFromStorage('bills', []); // Never crashes
safeSetToStorage('bills', bills);               // Graceful error handling
```

### Cloud Data Storage (Optional: Supabase)

#### When Supabase is Configured
- Data syncs to Supabase servers for cross-device access
- Optional - app works fully offline without it

#### Supabase Security Implementation

**1. Authentication**
```javascript
// Required: Use Supabase authentication
import { initializeSupabase, getUser } from './services/supabase.js';

// Only authenticated users can sync data
const user = getUser();
if (!user) {
  // User not logged in - use local storage only
}
```

**2. Row Level Security (RLS)**
- Enable RLS on all Supabase tables
- Each user can only access their own data

**Example RLS Policy**:
```sql
-- verified active policies
-- Only users can see their own bills
CREATE POLICY select_own_bills ON bills
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY insert_own_bills ON bills
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY update_own_bills ON bills
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY delete_own_bills ON bills
  FOR DELETE USING (auth.uid() = user_id);
```

**3. API Keys**
```env
# .env file - NEVER commit this!
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here  # Public key only
```

**Important**: 
- ✅ Use `anon` (public) key in client code
- ❌ Never expose `service_role` (secret) key in client
- ✅ RLS policies protect data even with public key

## Input Validation & Sanitization

### Bill Data Validation
**Centralized Validation Module**:
The application now uses a dedicated validation module (`src/utils/validation.js`) that enforces strict rules for all data entry points.

```javascript
import { validateBill, validateDate, validateAmount } from './utils/validation.js';

// Example: Validating a full bill object
const validation = validateBill(formData);
if (!validation.isValid) {
  showErrorNotification(validation.errors.join(', '));
  return;
}
```

### Validation Rules
**Bill Name**
- ✅ Required, non-empty, max 100 chars
- ✅ Sanitized against XSS payloads
- ❌ Rejects: HTML tags, scripts

**Date Handling**
- ✅ Strict YYYY-MM-DD format enforcement
- ✅ Timezone-aware validation (prevents off-by-one errors)
- ✅ Logic preventing unreasonable dates (e.g., > 10 years future)

**Safe JSON Parsing**
- ✅ Replaced all `JSON.parse()` with `safeJSONParse()`
- ✅ Enforces 5MB size limit on imported files
- ✅ Graceful error handling for malformed data

### XSS (Cross-Site Scripting) Prevention

**Systematic innerHTML Removal**:
We have auditted the codebase and replaced `innerHTML` with `document.createElement()` and `textContent` in all views handling user data:
- `billGrid.js`: Renders bill list safely
- `sidebar.js`: Renders category lists safely
- `settingsHandler.js`: Renders settings details safely
- `payment-history.js`: Renders transaction logs safely

**Protection measures**:
- ✅ `textContent` for all text interpolation
- ✅ `document.createElement` for structural updates
- ✅ Sanitized inputs at the entry point (double defense)

**Example Implementation**:
```javascript
// src/components/billGrid.js
const row = document.createElement('tr');
const nameCell = document.createElement('td');

// ✅ Secure text rendering
nameCell.textContent = bill.name; 

// ✅ Secure event binding (no onclick strings)
const btn = document.createElement('button');
btn.addEventListener('click', () => handleAction(bill.id));

row.appendChild(nameCell);
row.appendChild(btn);
```

### CSRF (Cross-Site Request Forgery) Protection

**App is single-page, no cross-site forms**:
- ✅ All operations are within same origin
- ✅ No cross-site form submissions
- ✅ No authentication tokens in URLs
- ✅ Using localStorage (not cookies) for state

## Authentication Security

### Supabase Authentication

**When configured**:
```javascript
// src/components/authModal.js
async function handleLogin(email, password) {
  try {
    // Supabase handles password hashing
    const { user, error } = await supabaseClient
      .auth
      .signInWithPassword({ email, password });
    
    if (error) {
      throw error;
    }
    
    // Session managed by Supabase
    return user;
  } catch (error) {
    showErrorNotification('Login failed: ' + error.message);
  }
}
```

**Security Features**:
- ✅ Passwords hashed with bcrypt on Supabase
- ✅ Sessions stored securely
- ✅ HTTPS only communication
- ✅ No passwords stored locally
- ✅ Automatic session timeout

### Without Supabase (Local-only mode)

**No authentication needed**:
- ✅ App works fully offline
- ✅ Each device has separate data
- ✅ No data transmission
- ⚠️ Anyone with device access sees data

**If sensitive**: Use device-level security
- OS-level passwords
- Device encryption
- Screen lock

## Network Security

### HTTPS Requirement

**For production deployment**:
```
✅ HTTPS://yoursite.com  (Secure)
❌ HTTP://yoursite.com   (Insecure)
```

**Why HTTPS is required**:
- Encrypts data in transit
- Prevents man-in-the-middle attacks
- Required for PWA features
- Required for Supabase connections

### Service Worker Security

**Service Worker caching is safe**:
```javascript
// src/service-worker.js
// Only caches static assets (CSS, JS, HTML)
// Never caches sensitive data
// Works with HTTPS only (PWA requirement)
```

**Caching Strategy**:
- ✅ Static assets: cached for offline use
- ✅ API responses: not cached (always fresh)
- ✅ User data: localStorage only, not service worker

## Code Security

### Dependency Management

**Minimal dependencies for security**:
```json
{
  "dependencies": {},
  "devDependencies": {
    "vite": "^4.5.14"  // Build tool only, not bundled
  }
}
```

**Benefits**:
- ✅ No external code in production
- ✅ No supply chain attacks possible
- ✅ Full control over code
- ✅ Easier security audits

### Optional Dependencies

**Chart.js** (for analytics):
- Loaded dynamically when analytics view shown
- From CDN or bundled
- Well-maintained, security-focused

**Supabase JS Client** (for cloud sync):
- Optional
- Only loaded if configured
- Security maintained by Supabase team

### Error Handling Security

**No sensitive data in error messages**:

```javascript
// ❌ UNSAFE - Leaks information
catch (error) {
  showErrorNotification('Supabase error: ' + error.message);
}

// ✅ SAFE - Generic message to user
catch (error) {
  console.error('Error details:', error);  // Developer console only
  showErrorNotification('Unable to sync data. Check your connection.');
}
```

## User Privacy

### Data Collection Policy

**Bill Tracker collects minimal data**:

**Collected**:
- ✅ Bill information (name, date, amount)
- ✅ Payment history
- ✅ User preferences (theme, categories)

**NOT Collected**:
- ❌ Usage analytics
- ❌ Behavior tracking
- ❌ Browser fingerprinting
- ❌ Location data
- ❌ Device identifiers

### Data Deletion

**Users can delete all data**:

```javascript
// Clear all local data
localStorage.clear();

// Or selectively
localStorage.removeItem('bills');
localStorage.removeItem('paymentSettings');

// Delete Supabase account in settings
// Automatically deletes all associated data
```

**GDPR/Privacy Compliance**:
- ✅ Users can export data (JSON format)
- ✅ Users can delete all data
- ✅ No tracking cookies
- ✅ No third-party data sharing
- ✅ Transparent about Supabase (if used)

## Security Checklist

### Before Deploying to Production

- [ ] ✅ Enable HTTPS/SSL
- [ ] ✅ Configure Supabase RLS policies (if using cloud sync)
- [ ] ✅ Review environment variables (`.env` file)
- [ ] ✅ Test input validation with edge cases
- [ ] ✅ Test error handling (no sensitive data leaks)
- [ ] ✅ Enable CSP (Content Security Policy) headers
- [ ] ✅ Test with developer tools (F12)
- [ ] ✅ Verify service worker caching (PWA)

### Content Security Policy (CSP)

**Recommended headers** (set on server):

```
Content-Security-Policy: 
  default-src 'self'; 
  script-src 'self' 'nonce-{random}'; 
  style-src 'self' 'unsafe-inline'; 
  img-src 'self' data:; 
  font-src 'self';
```

This prevents:
- ✅ Inline script injection
- ✅ External script loading
- ✅ Style hijacking
- ✅ Data exfiltration

## Incident Response

### If Data Breach Suspected

1. **Stop the app** - Remove from production
2. **Investigate** - Check logs, git history
3. **Patch** - Fix vulnerability
4. **Update users** - Notify about incident
5. **Recovery** - Restore from backups

### If Supabase Compromised

- Switch to local-only mode immediately
- Users still have local data in localStorage
- Export data and remove Supabase connection

## Security Best Practices for Developers

### When Contributing Code

1. **Validate all inputs**
   ```javascript
   // Check type, length, format
   if (typeof input !== 'string' || input.length > 100) {
     throw new Error('Invalid input');
   }
   ```

2. **Use textContent, not innerHTML**
   ```javascript
   // ✅ Safe
   element.textContent = userInput;
   
   // ❌ Unsafe
   element.innerHTML = userInput;
   ```

3. **Catch and handle errors safely**
   ```javascript
   try {
     // operation
   } catch (error) {
     console.error(error);  // Log for debugging
     showUserMessage('Operation failed');  // Generic message
   }
   ```

4. **Don't hardcode secrets**
   ```javascript
   // ❌ Bad
   const apiKey = 'sk_live_123456789';
   
   // ✅ Good - Use environment variables
   const apiKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
   ```

5. **Keep dependencies updated**
   ```bash
   npm audit           # Check for vulnerabilities
   npm update          # Update dependencies
   ```

## References

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [MDN Security Best Practices](https://developer.mozilla.org/en-US/docs/Learn/Server-side/First_steps/Website_security)
- [Supabase Security Docs](https://supabase.com/docs/guides/auth/overview)
- [PWA Security](https://web.dev/secure-contexts/)

## Questions?

For security concerns:
1. Check this document first
2. Review existing code for examples
3. Open an issue for security discussions
4. For critical issues, email security report to maintainer

Remember: Security is everyone's responsibility! 🔒
