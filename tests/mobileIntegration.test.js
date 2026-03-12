import { it, expect } from 'vitest';
import { isTouchDevice, isMobileViewport } from '../src/utils/mobileGestures.js';

// These tests verify the exported functions from mobileGestures.js
// using vitest's jsdom environment

it('isTouchDevice returns a boolean', () => {
    expect(typeof isTouchDevice()).toBe('boolean');
});

it('isMobileViewport returns a boolean', () => {
    expect(typeof isMobileViewport()).toBe('boolean');
});

it('isMobileViewport detects viewport width correctly', () => {
    // jsdom defaults to window.innerWidth = 1024
    const result = isMobileViewport();
    // At 1024px, should not be mobile viewport
    expect(result).toBe(false);
});

it('isTouchDevice is false when no touch points are defined', () => {
    // jsdom has no touch capability by default
    expect(isTouchDevice()).toBe(false);
});

it('mobile viewport breakpoint is at 768px', () => {
    // Verify the function reports correctly for typical mobile width
    Object.defineProperty(window, 'innerWidth', { value: 375, configurable: true, writable: true });
    expect(isMobileViewport()).toBe(true);
    Object.defineProperty(window, 'innerWidth', { value: 1024, configurable: true, writable: true });
});
