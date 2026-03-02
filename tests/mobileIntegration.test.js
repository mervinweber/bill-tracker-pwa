/**
 * Mobile Integration Runtime Tests
 * Verifies mobile gesture/responsive behavior using runtime-style mocks.
 */

import {
    initializeResponsiveDetection,
    initializeSwipeDelete,
    initializeSwipeGesture,
    disablePinchZoom,
    isTouchDevice
} from '../src/utils/mobileGestures.js';

let testsPassed = 0;
let testsFailed = 0;

function assert(condition, message) {
    if (!condition) {
        throw new Error(`Assertion failed: ${message}`);
    }
}

function assertEqual(actual, expected, message) {
    if (actual !== expected) {
        throw new Error(`Expected ${expected}, got ${actual}. ${message}`);
    }
}

async function test(description, testFn) {
    try {
        await testFn();
        console.log(`✅ ${description}`);
        testsPassed++;
    } catch (error) {
        console.error(`❌ ${description}: ${error.message}`);
        testsFailed++;
    }
}

function createEventTarget() {
    const listeners = new Map();

    return {
        listeners,
        addEventListener(event, handler) {
            if (!listeners.has(event)) listeners.set(event, []);
            listeners.get(event).push(handler);
        },
        removeEventListener(event, handler) {
            if (!listeners.has(event)) return;
            listeners.set(event, listeners.get(event).filter(h => h !== handler));
        },
        dispatch(event, payload) {
            (listeners.get(event) || []).forEach(handler => handler(payload));
        }
    };
}

function createMockElement() {
    const target = createEventTarget();
    return {
        ...target,
        style: {},
        getBoundingClientRect: () => ({ bottom: 100, left: 10 })
    };
}

function createClassList() {
    const classes = new Set();
    return {
        add: (name) => classes.add(name),
        remove: (name) => classes.delete(name),
        contains: (name) => classes.has(name)
    };
}

console.log('📋 Running Mobile Integration Runtime Tests...\n');

const windowTarget = createEventTarget();
const documentTarget = createEventTarget();

Object.defineProperty(globalThis, 'window', {
    value: {
        innerWidth: 1024,
        ...windowTarget
    },
    configurable: true,
    writable: true
});

Object.defineProperty(globalThis, 'document', {
    value: {
        body: {
            classList: createClassList()
        },
        ...documentTarget
    },
    configurable: true,
    writable: true
});

Object.defineProperty(globalThis, 'navigator', {
    value: {
        maxTouchPoints: 0,
        msMaxTouchPoints: 0
    },
    configurable: true,
    writable: true
});

await test('initializeResponsiveDetection should toggle mobile class and cleanup listener', async () => {
    window.innerWidth = 500;
    const cleanup = initializeResponsiveDetection();

    assert(document.body.classList.contains('mobile-viewport'), 'mobile class should be added for small viewport');

    window.innerWidth = 1200;
    window.dispatch('resize', {});
    assert(!document.body.classList.contains('mobile-viewport'), 'mobile class should be removed after resize to desktop');

    const resizeListenerCountBeforeCleanup = (window.listeners.get('resize') || []).length;
    assert(resizeListenerCountBeforeCleanup > 0, 'resize listener should be attached');

    cleanup();

    const resizeListenerCountAfterCleanup = (window.listeners.get('resize') || []).length;
    assertEqual(resizeListenerCountAfterCleanup, 0, 'resize listener should be removed on cleanup');
});

await test('initializeSwipeDelete should trigger delete callback when threshold exceeded', async () => {
    const row = createMockElement();
    let deleted = false;

    const cleanup = initializeSwipeDelete(row, () => {
        deleted = true;
    }, 80);

    row.dispatch('touchstart', { touches: [{ clientX: 220 }] });
    row.dispatch('touchmove', { touches: [{ clientX: 100 }] }); // diff 120
    row.dispatch('touchend', {});

    await new Promise(resolve => setTimeout(resolve, 330));

    assert(deleted, 'delete callback should run after swipe beyond threshold');
    cleanup();
});

await test('initializeSwipeGesture should detect a quick left swipe', async () => {
    const element = createMockElement();
    let leftSwipeCount = 0;

    const cleanup = initializeSwipeGesture(element, {
        threshold: 50,
        onSwipeLeft: () => {
            leftSwipeCount += 1;
        }
    });

    element.dispatch('touchstart', {
        touches: [{ clientX: 200, clientY: 200 }]
    });

    element.dispatch('touchend', {
        changedTouches: [{ clientX: 120, clientY: 210 }]
    });

    assertEqual(leftSwipeCount, 1, 'left swipe callback should be invoked once');
    cleanup();
});

await test('disablePinchZoom should prevent default for multi-touch move and cleanup listener', async () => {
    const cleanup = disablePinchZoom();

    let prevented = false;
    const event = {
        touches: [{}, {}],
        preventDefault: () => {
            prevented = true;
        }
    };

    document.dispatch('touchmove', event);
    assert(prevented, 'pinch-zoom move should call preventDefault');

    const touchMoveListenersBeforeCleanup = (document.listeners.get('touchmove') || []).length;
    assert(touchMoveListenersBeforeCleanup > 0, 'touchmove listener should be attached');

    cleanup();

    const touchMoveListenersAfterCleanup = (document.listeners.get('touchmove') || []).length;
    assertEqual(touchMoveListenersAfterCleanup, 0, 'touchmove listener should be removed on cleanup');
});

await test('isTouchDevice should detect touch capability from maxTouchPoints', async () => {
    navigator.maxTouchPoints = 3;
    assert(isTouchDevice(), 'touch device should be detected when maxTouchPoints > 0');

    navigator.maxTouchPoints = 0;
    navigator.msMaxTouchPoints = 0;
    assertEqual(isTouchDevice(), false, 'touch device should be false when touch points are zero');
});

console.log(`\n📊 Mobile Integration Runtime Test Results: ${testsPassed} passed, ${testsFailed} failed\n`);

if (testsFailed > 0) {
    process.exit(1);
}
