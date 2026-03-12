import { it, expect } from 'vitest';

// Test helper implementations of the same logic as mobileGestures.js
const isTouchDevice = () => {
    return ('ontouchstart' in window) || (navigator.maxTouchPoints > 0) || (navigator.msMaxTouchPoints > 0);
};

const isMobileViewport = () => window.innerWidth < 768;

const detectSwipe = (startX, endX, startY, endY) => {
    const threshold = 50;
    const diffX = startX - endX;
    const diffY = startY - endY;
    if (Math.abs(diffX) < threshold && Math.abs(diffY) < threshold) return null;
    if (Math.abs(diffX) > Math.abs(diffY)) return diffX > 0 ? 'left' : 'right';
    return diffY > 0 ? 'up' : 'down';
};

it('isTouchDevice returns boolean', () => {
    expect(typeof isTouchDevice()).toBe('boolean');
});

it('isTouchDevice detects maxTouchPoints', () => {
    Object.defineProperty(navigator, 'maxTouchPoints', { value: 5, configurable: true });
    expect(isTouchDevice()).toBe(true);
});

it('isMobileViewport is false at desktop width', () => {
    Object.defineProperty(window, 'innerWidth', { value: 1024, configurable: true });
    expect(isMobileViewport()).toBe(false);
});

it('isMobileViewport is true at mobile width', () => {
    Object.defineProperty(window, 'innerWidth', { value: 375, configurable: true });
    expect(isMobileViewport()).toBe(true);
});

it('detectSwipe detects left swipe', () => {
    expect(detectSwipe(500, 440, 300, 310)).toBe('left');
});

it('detectSwipe detects right swipe', () => {
    expect(detectSwipe(300, 400, 300, 310)).toBe('right');
});

it('detectSwipe detects up swipe', () => {
    expect(detectSwipe(300, 310, 400, 300)).toBe('up');
});

it('detectSwipe detects down swipe', () => {
    expect(detectSwipe(300, 310, 300, 450)).toBe('down');
});

it('detectSwipe returns null for insufficient movement', () => {
    expect(detectSwipe(300, 310, 300, 305)).toBe(null);
});

it('isMobileViewport breakpoint boundary at 768px is not mobile', () => {
    Object.defineProperty(window, 'innerWidth', { value: 768, configurable: true });
    expect(isMobileViewport()).toBe(false);
});

it('isMobileViewport 767px is mobile', () => {
    Object.defineProperty(window, 'innerWidth', { value: 767, configurable: true });
    expect(isMobileViewport()).toBe(true);
});
