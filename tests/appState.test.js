import { it, expect } from 'vitest';
import { appState } from '../src/store/appState.js';

it('should initialize with default state', () => {
    const state = appState.getState();
    expect(state.selectedPaycheck).toBeDefined();
    expect(state.selectedCategory).toBeDefined();
    expect(state.viewMode).toBeDefined();
    expect(state.allBillsScope).toBe('open-through-next-pay-date');
    expect(state.searchQuery).toBe('');
});

it('should update state with setState', () => {
    appState.setState({ selectedPaycheck: 2 });
    const state = appState.getState();
    expect(state.selectedPaycheck).toBe(2);
});

it('should notify subscribers when state changes', () => {
    let notificationCount = 0;
    const unsubscribe = appState.subscribe(() => { notificationCount++; });
    appState.setState({ selectedCategory: 'Housing' });
    expect(notificationCount).toBe(1);
    unsubscribe();
    appState.setState({ selectedCategory: 'Food' });
    expect(notificationCount).toBe(1);
});

it('should set selected paycheck', () => {
    appState.setSelectedPaycheck(3);
    expect(appState.getState().selectedPaycheck).toBe(3);
});

it('should set selected category', () => {
    appState.setSelectedCategory('Utilities');
    expect(appState.getState().selectedCategory).toBe('Utilities');
});

it('should set view mode', () => {
    appState.setViewMode('calendar');
    expect(appState.getState().viewMode).toBe('calendar');
});

it('should set search query', () => {
    appState.setSearchQuery('internet');
    expect(appState.getState().searchQuery).toBe('internet');
});

it('should support debt snowball view mode', () => {
    appState.setViewMode('debt-snowball');
    expect(appState.getState().viewMode).toBe('debt-snowball');
});

it('should handle multiple subscribers independently', () => {
    let count1 = 0, count2 = 0;
    const unsub1 = appState.subscribe(() => count1++);
    const unsub2 = appState.subscribe(() => count2++);
    appState.setState({ selectedPaycheck: 1 });
    expect(count1).toBe(1);
    expect(count2).toBe(1);
    unsub1();
    appState.setState({ selectedPaycheck: 2 });
    expect(count1).toBe(1);
    expect(count2).toBe(2);
    unsub2();
});
