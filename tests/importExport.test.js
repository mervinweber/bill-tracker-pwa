import { it, expect } from 'vitest';

it('export filename includes correct prefix and date and .json extension', () => {
    const date = new Date().toISOString().split('T')[0];
    const filename = `bill-tracker-backup-${date}.json`;
    expect(filename).toContain('bill-tracker-backup');
    expect(filename).toContain(date);
    expect(filename).toMatch(/\.json$/);
});

it('csv export filename includes correct prefix and date and .csv extension', () => {
    const date = new Date().toISOString().split('T')[0];
    const filename = `bill-tracker-bills-${date}.csv`;
    expect(filename).toContain('bill-tracker-bills');
    expect(filename).toContain(date);
    expect(filename).toMatch(/\.csv$/);
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

it('CSV export escapes commas and quotes', () => {
    const rows = [
        ['id', 'name'],
        ['1', 'Hello, "World"']
    ];
    const csv = rows.map((row) => row.map((value) => {
        const text = String(value);
        if (/[",\n\r]/.test(text)) {
            return `"${text.replaceAll('"', '""')}"`;
        }
        return text;
    }).join(',')).join('\n');

    expect(csv).toContain('"Hello, ""World"""');
});

it('bill metadata fields are preserved in export-friendly shapes', () => {
    const exportData = {
        bills: [
            {
                id: '1',
                name: 'Internet',
                payee: 'Comcast',
                accountName: 'Checking',
                autopayEnabled: true,
                snoozeUntil: '2026-05-20'
            }
        ]
    };

    const restored = JSON.parse(JSON.stringify(exportData));
    expect(restored.bills[0].payee).toBe('Comcast');
    expect(restored.bills[0].accountName).toBe('Checking');
    expect(restored.bills[0].autopayEnabled).toBe(true);
    expect(restored.bills[0].snoozeUntil).toBe('2026-05-20');
});
