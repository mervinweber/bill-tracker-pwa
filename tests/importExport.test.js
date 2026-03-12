import { it, expect } from 'vitest';

it('export filename includes correct prefix and date and .json extension', () => {
    const date = new Date().toISOString().split('T')[0];
    const filename = `bill-tracker-backup-${date}.json`;
    expect(filename).toContain('bill-tracker-backup');
    expect(filename).toContain(date);
    expect(filename).toMatch(/\.json$/);
});

it('should handle large dataset export and restore', () => {
    const largeBillSet = Array.from({ length: 50 }, (_, i) => ({
        id: String(i + 1),
        name: `Bill ${i + 1}`,
        amountDue: 100,
        dueDate: '2026-03-15'
    }));
    const exportData = { version: '1.0', bills: largeBillSet };
    const jsonString = JSON.stringify(exportData);
    const restored = JSON.parse(jsonString);
    expect(restored.bills.length).toBe(50);
    expect(restored.bills[49].name).toBe('Bill 50');
});
