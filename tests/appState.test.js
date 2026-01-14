/**
 * AppState Unit Tests
 * Tests the centralized state management with subscriber pattern
 */

import { appState } from '../src/store/appState.js';

// Test utilities
let testsPassed = 0;
let testsFailed = 0;

function assert(condition, message) {
    if (!condition) {
        throw new Error(`Assertion failed: ${message}`);
    }
}

function assertEqual(actual, expected, message) {
    if (actual !== expected) {
        throw new Error(`Expected ${expected}, but got ${actual}. ${message}`);
    }
}

function test(description, testFn) {
    try {
        testFn();
        console.log(`✅ ${description}`);
        testsPassed++;
    } catch (error) {
        console.error(`❌ ${description}: ${error.message}`);
        testsFailed++;
    }
}

// Tests
console.log('📋 Running AppState Tests...\n');

test('should initialize with default state', () => {
    const state = appState.getState();
    assert(state.selectedPaycheck !== undefined, 'selectedPaycheck should be defined');
    assert(state.selectedCategory !== undefined, 'selectedCategory should be defined');
    assert(state.viewMode !== undefined, 'viewMode should be defined');
});

test('should update state with setState', () => {
    appState.setState({ selectedPaycheck: 2 });
    const state = appState.getState();
    assertEqual(state.selectedPaycheck, 2, 'selectedPaycheck should update');
});

test('should notify subscribers when state changes', () => {
    let notificationCount = 0;
    const unsubscribe = appState.subscribe((newState) => {
        notificationCount++;
    });

    appState.setState({ selectedCategory: 'Housing' });
    assertEqual(notificationCount, 1, 'subscriber should be notified once');
    
    unsubscribe();
    appState.setState({ selectedCategory: 'Food' });
    assertEqual(notificationCount, 1, 'subscriber should not be notified after unsubscribe');
});

test('should set selected paycheck', () => {
    appState.setSelectedPaycheck(3);
    const state = appState.getState();
    assertEqual(state.selectedPaycheck, 3, 'selectedPaycheck should be set');
});

test('should set selected category', () => {
    appState.setSelectedCategory('Utilities');
    const state = appState.getState();
    assertEqual(state.selectedCategory, 'Utilities', 'selectedCategory should be set');
});

test('should set view mode', () => {
    appState.setViewMode('calendar');
    const state = appState.getState();
    assertEqual(state.viewMode, 'calendar', 'viewMode should be set');
});

test('should handle multiple subscribers independently', () => {
    let count1 = 0;
    let count2 = 0;

    const unsub1 = appState.subscribe(() => count1++);
    const unsub2 = appState.subscribe(() => count2++);

    appState.setState({ selectedPaycheck: 1 });
    
    assertEqual(count1, 1, 'subscriber 1 should be notified');
    assertEqual(count2, 1, 'subscriber 2 should be notified');

    unsub1();
    appState.setState({ selectedPaycheck: 2 });
    
    assertEqual(count1, 1, 'subscriber 1 should not be notified');
    assertEqual(count2, 2, 'subscriber 2 should still be notified');

    unsub2();
});

console.log(`\n📊 AppState Test Results: ${testsPassed} passed, ${testsFailed} failed\n`);
export { testsPassed, testsFailed };
