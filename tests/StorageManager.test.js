import { it, expect, beforeEach } from 'vitest';
import { StorageManager } from '../src/utils/StorageManager.js';

// Mock localStorage for tests
const mockStorage = {};
global.localStorage = {
    getItem: (key) => mockStorage[key] ?? null,
    setItem: (key, value) => { mockStorage[key] = String(value); },
    removeItem: (key) => { delete mockStorage[key]; },
    clear: () => { Object.keys(mockStorage).forEach(k => delete mockStorage[k]); },
    get length() { return Object.keys(mockStorage).length; },
    key: (i) => Object.keys(mockStorage)[i] ?? null,
};
// @ts-ignore - minimal navigator mock required for StorageManager test isolation
global.navigator = { storage: null };

beforeEach(() => {
    global.localStorage.clear();
});

it('retrieves and parses JSON value', () => {
    localStorage.setItem('test_key', JSON.stringify({ value: 123 }));
    expect(StorageManager.get('test_key')).toEqual({ value: 123 });
});

it('returns fallback for missing key', () => {
    expect(StorageManager.get('nonexistent', { default: 'fallback' })).toEqual({ default: 'fallback' });
});

it('sets and retrieves an object', () => {
    const data = { name: 'test', amount: 100 };
    expect(StorageManager.set('test_obj', data)).toBe(true);
    expect(StorageManager.get('test_obj')).toEqual(data);
});

it('sets and retrieves a string', () => {
    expect(StorageManager.set('test_str', 'plain string')).toBe(true);
    expect(StorageManager.get('test_str')).toBe('plain string');
});

it('removes an item', () => {
    localStorage.setItem('to_remove', 'value');
    expect(StorageManager.remove('to_remove')).toBe(true);
    expect(localStorage.getItem('to_remove')).toBe(null);
});

it('retrieves a plain non-JSON string', () => {
    localStorage.setItem('plain_text', 'not json');
    expect(StorageManager.get('plain_text')).toBe('not json');
});

it('checks storage availability', () => {
    expect(StorageManager.isAvailable()).toBe(true);
});

it('clears all storage items', () => {
    localStorage.setItem('key1', 'v1');
    localStorage.setItem('key2', 'v2');
    expect(StorageManager.clear()).toBe(true);
    expect(localStorage.length).toBe(0);
});

it('retrieves all keys', () => {
    localStorage.setItem('k1', 'v1');
    localStorage.setItem('k2', 'v2');
    const keys = StorageManager.getAllKeys();
    expect(keys).toContain('k1');
    expect(keys).toContain('k2');
});

it('stores arrays', () => {
    StorageManager.set('arr', [1, 2, 3]);
    expect(StorageManager.get('arr')).toEqual([1, 2, 3]);
});

it('stores booleans', () => {
    StorageManager.set('bool', true);
    expect(StorageManager.get('bool')).toBe(true);
});
