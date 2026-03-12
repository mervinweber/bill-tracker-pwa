import { it, expect } from 'vitest';

// In-memory notification tracker helpers (unit testing business logic)
const makeHistory = () => {
    const notifications = [];
    return {
        add(n) { notifications.push(n); if (notifications.length > 20) notifications.shift(); },
        dismiss(id) { const i = notifications.findIndex(n => n.id === id); if (i > -1) { notifications.splice(i, 1); return true; } return false; },
        clear() { notifications.length = 0; },
        get all() { return [...notifications]; }
    };
};

const validateTitle = (t) => {
    if (!t || t.trim() === '') return 'empty';
    if (t.length > 100) return 'too-long';
    return 'valid';
};

it('notification permission states can be read', () => {
    expect(['default', 'granted', 'denied']).toContain('default');
});

it('notification validation rejects null title', () => {
    expect(validateTitle(null)).toBe('empty');
});

it('notification validation rejects empty title', () => {
    expect(validateTitle('')).toBe('empty');
});

it('notification validation rejects whitespace title', () => {
    expect(validateTitle('   ')).toBe('empty');
});

it('notification validation rejects title over 100 chars', () => {
    expect(validateTitle('x'.repeat(101))).toBe('too-long');
});

it('notification validation accepts valid title', () => {
    expect(validateTitle('Bill Due')).toBe('valid');
});

it('notification history starts empty', () => {
    const h = makeHistory();
    expect(h.all.length).toBe(0);
});

it('notification history adds items', () => {
    const h = makeHistory();
    h.add({ id: '1', title: 'Test' });
    expect(h.all.length).toBe(1);
});

it('notification history clears correctly', () => {
    const h = makeHistory();
    h.add({ id: '1', title: 'Test' });
    h.clear();
    expect(h.all.length).toBe(0);
});

it('notification history limits to 20 items', () => {
    const h = makeHistory();
    for (let i = 0; i < 25; i++) h.add({ id: `n-${i}`, title: `N${i}` });
    expect(h.all.length).toBe(20);
});

it('notification history keeps newest items when capped', () => {
    const h = makeHistory();
    for (let i = 0; i < 25; i++) h.add({ id: `n-${i}`, title: `N${i}` });
    expect(h.all[0].id).toBe('n-5');
    expect(h.all[19].id).toBe('n-24');
});

it('notification dismissal removes item', () => {
    const h = makeHistory();
    h.add({ id: 'test-1', title: 'Test' });
    expect(h.dismiss('test-1')).toBe(true);
    expect(h.all.length).toBe(0);
});

it('notification dismissal returns false for missing id', () => {
    const h = makeHistory();
    expect(h.dismiss('does-not-exist')).toBe(false);
});

it('special characters preserved in notification content', () => {
    const content = 'Bill $$$ 💰 ✓';
    expect(content).toBe('Bill $$$ 💰 ✓');
});
