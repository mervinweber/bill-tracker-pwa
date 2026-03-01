/**
 * Test Suite: Mobile Gestures
 * Tests touch device detection, viewport detection, and swipe logic
 */

// Setup globals
global.window = {
    innerWidth: 1024,
    addEventListener: () => true,
    removeEventListener: () => true
};

global.navigator = {
    maxTouchPoints: 0,
    msMaxTouchPoints: 0
};

const assert = (condition, message) => {
    if (!condition) throw new Error(`❌ ${message}`);
    console.log(`✅ ${message}`);
};

const assertEquals = (actual, expected, message) => {
    if (actual !== expected) {
        throw new Error(`❌ ${message}\n   Expected: ${expected}\n   Got: ${actual}`);
    }
    console.log(`✅ ${message}`);
};

// Test Suite
console.log('\n=== Mobile Gestures Tests ===\n');

// Device detection tests
console.log('Testing Touch Device Detection:');
try {
    const isTouchDevice = () => {
        return (
            ('ontouchstart' in window) ||
            (navigator.maxTouchPoints > 0) ||
            (navigator.msMaxTouchPoints > 0)
        );
    };
    
    const result = isTouchDevice();
    assertEquals(typeof result, 'boolean', 'should return boolean');
    
    global.navigator.maxTouchPoints = 5;
    assertEquals(isTouchDevice(), true, 'should detect when maxTouchPoints > 0');
    
    global.navigator.maxTouchPoints = 0;
    global.navigator.msMaxTouchPoints = 10;
    assertEquals(isTouchDevice(), true, 'should detect when msMaxTouchPoints > 0');
    
} catch (error) {
    console.error(`\n❌ Touch Detection: ${error.message}\n`);
    process.exit(1);
}

// Viewport detection tests
console.log('\nTesting Viewport Detection:');
try {
    const isMobileViewport = () => {
        return window.innerWidth < 768;
    };
    
    global.window.innerWidth = 1024;
    assertEquals(isMobileViewport(), false, 'should not be mobile at 1024px');
    
    global.window.innerWidth = 767;
    assertEquals(isMobileViewport(), true, 'should be mobile at 767px');
    
    global.window.innerWidth = 768;
    assertEquals(isMobileViewport(), false, 'should not be mobile at 768px (breakpoint)');
    
    global.window.innerWidth = 375;
    assertEquals(isMobileViewport(), true, 'should be mobile at 375px (phone)');
    
    global.window.innerWidth = 320;
    assertEquals(isMobileViewport(), true, 'should be mobile at 320px (small phone)');
    
} catch (error) {
    console.error(`\n❌ Viewport Detection: ${error.message}\n`);
    process.exit(1);
}

// Swipe gesture detection tests
console.log('\nTesting Swipe Gesture Detection:');
try {
    const detectSwipe = function(startX, endX, startY, endY) {
        const threshold = 50;
        const diffX = startX - endX;
        const diffY = startY - endY;
        
        // Insufficient movement
        if (Math.abs(diffX) < threshold && Math.abs(diffY) < threshold) {
            return null;
        }
        
        // Horizontal swipes
        if (Math.abs(diffX) > Math.abs(diffY)) {
            return diffX > 0 ? 'left' : 'right';
        }
        
        // Vertical swipes
        return diffY > 0 ? 'up' : 'down';
    };
    
    let direction = detectSwipe(500, 440, 300, 310); // Swipe left 60px, right 10px
    assertEquals(direction, 'left', 'should detect leftward swipe');
    
    direction = detectSwipe(300, 400, 300, 310); // Swipe right 100px
    assertEquals(direction, 'right', 'should detect rightward swipe');
    
    direction = detectSwipe(300, 310, 400, 300); // Swipe up
    assertEquals(direction, 'up', 'should detect upward swipe');
    
    direction = detectSwipe(300, 310, 300, 450); // Swipe down
    assertEquals(direction, 'down', 'should detect downward swipe');
    
    direction = detectSwipe(300, 310, 300, 305); // Only 10px movement
    assertEquals(direction, null, 'should return null for insufficient movement');
    
} catch (error) {
    console.error(`\n❌ Swipe Detection: ${error.message}\n`);
    process.exit(1);
}

// Event listener management tests
console.log('\nTesting Event Listener Management:');
try {
    const listeners = [];
    
    const attachListener = (event, handler) => {
        listeners.push({ event, handler });
        return () => {
            const idx = listeners.findIndex(l => l.event === event && l.handler === handler);
            if (idx > -1) listeners.splice(idx, 1);
        };
    };
    
    const handler1 = () => {};
    const handler2 = () => {};
    
    assert(listeners.length === 0, 'should start with no listeners');
    
    const cleanup1 = attachListener('resize', handler1);
    assertEquals(listeners.length, 1, 'should attach first listener');
    
    const cleanup2 = attachListener('touchstart', handler2);
    assertEquals(listeners.length, 2, 'should attach second listener');
    
    cleanup1();
    assertEquals(listeners.length, 1, 'should clean up first listener');
    
    cleanup2();
    assertEquals(listeners.length, 0, 'should clean up all listeners');
    
} catch (error) {
    console.error(`\n❌ Event Management: ${error.message}\n`);
    process.exit(1);
}

// Class management tests
console.log('\nTesting Class Management:');
try {
    const classes = new Set();
    
    const addMobileClass = () => classes.add('mobile-view');
    const removeMobileClass = () => classes.delete('mobile-view');
    const hasMobileClass = () => classes.has('mobile-view');
    
    assert(!hasMobileClass(), 'should start without mobile-view class');
    
    addMobileClass();
    assert(hasMobileClass(), 'should add mobile-view class');
    
    removeMobileClass();
    assert(!hasMobileClass(), 'should remove mobile-view class');
    
} catch (error) {
    console.error(`\n❌ Class Management: ${error.message}\n`);
    process.exit(1);
}

// Boundary condition tests
console.log('\nTesting Boundary Conditions:');
try {
    const isMobileViewport = () => window.innerWidth < 768;
    
    // Test exact breakpoints
    const testPoints = [
        { width: 1, expected: true, label: '1px' },
        { width: 320, expected: true, label: '320px' },
        { width: 767, expected: true, label: '767px (1 below)' },
        { width: 768, expected: false, label: '768px (at breakpoint)' },
        { width: 769, expected: false, label: '769px (1 above)' },
        { width: 1024, expected: false, label: '1024px' },
        { width: 2560, expected: false, label: '2560px (4K)' }
    ];
    
    testPoints.forEach(test => {
        global.window.innerWidth = test.width;
        assertEquals(isMobileViewport(), test.expected, `breakpoint test at ${test.label}`);
    });
    
} catch (error) {
    console.error(`\n❌ Boundary Conditions: ${error.message}\n`);
    process.exit(1);
}

// Integration test
console.log('\nTesting Integration:');
try {
    const isTouchDevice = () => navigator.maxTouchPoints > 0 || navigator.msMaxTouchPoints > 0;
    const isMobileViewport = () => window.innerWidth < 768;
    
    global.window.innerWidth = 375;
    global.navigator.maxTouchPoints = 5;
    
    const isTouch = isTouchDevice();
    const isMobile = isMobileViewport();
    
    assert(isTouch && isMobile, 'both detection methods should work together');
    console.log('  Touch device and mobile viewport both detected correctly');
    
} catch (error) {
    console.error(`\n❌ Integration: ${error.message}\n`);
    process.exit(1);
}

console.log('\n🎉 All Mobile Gestures tests passed!\n');
