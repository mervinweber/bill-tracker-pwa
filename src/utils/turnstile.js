const TURNSTILE_SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY;
const TURNSTILE_SCRIPT_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';

let scriptPromise = null;

const getTurnstile = () => /** @type {any} */ (window).turnstile || null;

export const isTurnstileConfigured = () => Boolean(TURNSTILE_SITE_KEY);

export const getTurnstileSiteKey = () => TURNSTILE_SITE_KEY;

export const loadTurnstileScript = async () => {
    if (!isTurnstileConfigured()) {
        return null;
    }

    const existingTurnstile = getTurnstile();
    if (existingTurnstile) {
        return existingTurnstile;
    }

    if (scriptPromise) {
        return scriptPromise;
    }

    scriptPromise = new Promise((resolve, reject) => {
        const existingScript = document.querySelector(`script[src="${TURNSTILE_SCRIPT_SRC}"]`);
        if (existingScript) {
            existingScript.addEventListener('load', () => resolve(getTurnstile()));
            existingScript.addEventListener('error', () => reject(new Error('Failed to load Turnstile script')));
            return;
        }

        const script = document.createElement('script');
        script.src = TURNSTILE_SCRIPT_SRC;
        script.async = true;
        script.defer = true;
        script.onload = () => resolve(getTurnstile());
        script.onerror = () => reject(new Error('Failed to load Turnstile script'));
        document.head.appendChild(script);
    });

    return scriptPromise;
};

export const renderTurnstileWidget = async (container, options = {}) => {
    const turnstile = await loadTurnstileScript();
    if (!turnstile || !container || !TURNSTILE_SITE_KEY) {
        return null;
    }

    container.innerHTML = '';
    return turnstile.render(container, {
        sitekey: TURNSTILE_SITE_KEY,
        theme: options.theme || 'auto',
        callback: options.onSuccess,
        'expired-callback': options.onExpired,
        'error-callback': options.onError,
        'refresh-expired': 'auto'
    });
};

export const resetTurnstileWidget = (widgetId) => {
    const turnstile = getTurnstile();
    if (turnstile && widgetId !== null && widgetId !== undefined) {
        turnstile.reset(widgetId);
    }
};

export const removeTurnstileWidget = (widgetId) => {
    const turnstile = getTurnstile();
    if (turnstile && widgetId !== null && widgetId !== undefined) {
        turnstile.remove(widgetId);
    }
};
