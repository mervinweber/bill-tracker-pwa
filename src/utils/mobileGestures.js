/**
 * Mobile Touch Gestures and Interactions
 * Provides swipe, long-press, and other touch interactions for mobile optimization
 */

/**
 * Gesture event handlers configuration
 */
const gestureHandlers = new Map();

/**
 * Initialize swipe gesture on element
 * @param {HTMLElement} element - Element to attach swipe listeners
 * @param {Object} options - Swipe configuration
 * @param {number} options.threshold - Minimum pixels to move for swipe (default 50)
 * @param {Function} options.onSwipeLeft - Callback when swiped left
 * @param {Function} options.onSwipeRight - Callback when swiped right
 * @param {Function} options.onSwipeUp - Callback when swiped up (optional)
 * @param {Function} options.onSwipeDown - Callback when swiped down (optional)
 * @returns {Function} Cleanup function to remove listeners
 */
export function initializeSwipeGesture(element, options = {}) {
    const threshold = options.threshold || 50;
    let touchStartX = 0;
    let touchStartY = 0;
    let touchStartTime = 0;

    const handleTouchStart = (e) => {
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
        touchStartTime = Date.now();
    };

    const handleTouchEnd = (e) => {
        const touchEndX = e.changedTouches[0].clientX;
        const touchEndY = e.changedTouches[0].clientY;
        const touchDuration = Date.now() - touchStartTime;

        // Quick swipes only (less than 500ms)
        if (touchDuration > 500) return;

        const diffX = touchStartX - touchEndX;
        const diffY = touchStartY - touchEndY;

        // Only process if significant movement
        if (Math.abs(diffX) < threshold && Math.abs(diffY) < threshold) return;

        // Horizontal swipes (X movement larger than Y)
        if (Math.abs(diffX) > Math.abs(diffY)) {
            if (diffX > 0 && options.onSwipeLeft) {
                options.onSwipeLeft(e);
            } else if (diffX < 0 && options.onSwipeRight) {
                options.onSwipeRight(e);
            }
        }
        // Vertical swipes
        else {
            if (diffY > 0 && options.onSwipeUp) {
                options.onSwipeUp(e);
            } else if (diffY < 0 && options.onSwipeDown) {
                options.onSwipeDown(e);
            }
        }
    };

    element.addEventListener('touchstart', handleTouchStart, false);
    element.addEventListener('touchend', handleTouchEnd, false);

    // Store for cleanup
    const elementKey = Symbol('swipe-cleanup');
    gestureHandlers.set(elementKey, { element, handleTouchStart, handleTouchEnd });

    // Return cleanup function
    return () => {
        element.removeEventListener('touchstart', handleTouchStart, false);
        element.removeEventListener('touchend', handleTouchEnd, false);
        gestureHandlers.delete(elementKey);
    };
}

/**
 * Initialize long-press gesture on element
 * @param {HTMLElement} element - Element to attach long-press listener
 * @param {Object} options - Long-press configuration
 * @param {number} options.duration - Duration in ms to trigger long-press (default 500)
 * @param {Function} options.onLongPress - Callback when long-pressed
 * @returns {Function} Cleanup function to remove listeners
 */
export function initializeLongPress(element, options = {}) {
    const duration = options.duration || 500;
    let pressTimer = null;
    let isPressing = false;

    const handleTouchStart = (e) => {
        isPressing = true;
        pressTimer = setTimeout(() => {
            if (isPressing && options.onLongPress) {
                options.onLongPress(e);
            }
        }, duration);
    };

    const handleTouchEnd = () => {
        isPressing = false;
        if (pressTimer) {
            clearTimeout(pressTimer);
            pressTimer = null;
        }
    };

    const handleTouchMove = () => {
        // Cancel long-press if finger moves significantly
        if (pressTimer) {
            clearTimeout(pressTimer);
            pressTimer = null;
        }
    };

    element.addEventListener('touchstart', handleTouchStart, false);
    element.addEventListener('touchend', handleTouchEnd, false);
    element.addEventListener('touchmove', handleTouchMove, false);

    const elementKey = Symbol('longpress-cleanup');
    gestureHandlers.set(elementKey, { element, handleTouchStart, handleTouchEnd, handleTouchMove });

    return () => {
        element.removeEventListener('touchstart', handleTouchStart, false);
        element.removeEventListener('touchend', handleTouchEnd, false);
        element.removeEventListener('touchmove', handleTouchMove, false);
        if (pressTimer) clearTimeout(pressTimer);
        gestureHandlers.delete(elementKey);
    };
}

/**
 * Detect if device is mobile/touch-capable
 * @returns {boolean} True if device supports touch
 */
export function isTouchDevice() {
    return (
        ('ontouchstart' in window) ||
        (navigator.maxTouchPoints > 0)
    );
}

/**
 * Handle mobile-optimized context menu alternative
 * @param {HTMLElement} element - Element to attach to
 * @param {Array} actions - Array of action objects: { label, callback, icon }
 * @returns {Function} Cleanup function
 */
export function initializeMobileContextMenu(element, actions = []) {
    const menuElement = document.createElement('div');
    menuElement.className = 'mobile-context-menu';
    menuElement.style.display = 'none';
    menuElement.setAttribute('role', 'menu');

    actions.forEach(action => {
        const button = document.createElement('button');
        button.className = 'context-menu-item';
        button.setAttribute('role', 'menuitem');
        button.innerHTML = `${action.icon ? action.icon + ' ' : ''}${action.label}`;
        button.addEventListener('click', (e) => {
            e.stopPropagation();
            action.callback();
            menuElement.style.display = 'none';
        });
        menuElement.appendChild(button);
    });

    document.body.appendChild(menuElement);

    const handleLongPress = (e) => {
        e.preventDefault();
        const rect = element.getBoundingClientRect();
        menuElement.style.position = 'fixed';
        menuElement.style.top = `${Math.min(rect.bottom, window.innerHeight - 200)}px`;
        menuElement.style.left = `${Math.max(10, rect.left)}px`;
        menuElement.style.display = 'flex';
    };

    const handleOutsideClick = () => {
        menuElement.style.display = 'none';
    };

    element.addEventListener('longpress', handleLongPress);
    document.addEventListener('click', handleOutsideClick);

    return () => {
        element.removeEventListener('longpress', handleLongPress);
        document.removeEventListener('click', handleOutsideClick);
        menuElement.remove();
    };
}

/**
 * Detect if viewport is mobile
 * @returns {boolean} True if viewport width is less than 768px
 */
export function isMobileViewport() {
    return window.innerWidth < 768;
}

/**
 * Setup viewport-based responsive class
 * Applies 'mobile' class to body when viewport < 768px
 * @returns {Function} Cleanup function to remove listener
 */
export function initializeResponsiveDetection() {
    const updateResponsiveClass = () => {
        if (isMobileViewport()) {
            document.body.classList.add('mobile-viewport');
        } else {
            document.body.classList.remove('mobile-viewport');
        }
    };

    // Initial check
    updateResponsiveClass();

    // Listen for resize
    window.addEventListener('resize', updateResponsiveClass, { passive: true });

    return () => {
        window.removeEventListener('resize', updateResponsiveClass);
    };
}

/**
 * Disable pinch-zoom on mobile (for focused interactions)
 * @returns {Function} Cleanup function to restore default behavior
 */
export function disablePinchZoom() {
    const handleTouchMove = (e) => {
        if (e.touches.length > 1) {
            e.preventDefault();
        }
    };

    document.addEventListener('touchmove', handleTouchMove, { passive: false });

    return () => {
        document.removeEventListener('touchmove', handleTouchMove);
    };
}

/**
 * Create a swipe-to-delete gesture for list items
 * @param {HTMLElement} itemElement - The item to enable swipe-delete on
 * @param {Function} onDelete - Callback when swiped to delete
 * @param {number} threshold - Swipe distance required (default 80)
 * @returns {Function} Cleanup function
 */
export function initializeSwipeDelete(itemElement, onDelete, threshold = 80) {
    let startX = 0;
    let currentX = 0;
    const originalTransform = itemElement.style.transform;

    const handleTouchStart = (e) => {
        startX = e.touches[0].clientX;
        currentX = startX;
    };

    const handleTouchMove = (e) => {
        currentX = e.touches[0].clientX;
        const diff = startX - currentX;

        if (diff > 0) {
            // Swipe left - show delete area
            itemElement.style.transform = `translateX(-${Math.min(diff, threshold)}px)`;
            itemElement.style.opacity = Math.max(0.7, 1 - diff / threshold / 2);
        }
    };

    const handleTouchEnd = () => {
        const diff = startX - currentX;

        if (diff > threshold) {
            // Trigger delete with animation
            itemElement.style.transition = 'all 0.3s ease-out';
            itemElement.style.transform = 'translateX(-100%)';
            itemElement.style.opacity = '0';

            setTimeout(() => {
                onDelete();
            }, 300);
        } else {
            // Reset
            itemElement.style.transform = originalTransform || '';
            itemElement.style.opacity = '1';
        }
    };

    itemElement.addEventListener('touchstart', handleTouchStart, { passive: true });
    itemElement.addEventListener('touchmove', handleTouchMove, { passive: true });
    itemElement.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
        itemElement.removeEventListener('touchstart', handleTouchStart);
        itemElement.removeEventListener('touchmove', handleTouchMove);
        itemElement.removeEventListener('touchend', handleTouchEnd);
        itemElement.style.transform = originalTransform || '';
    };
}
