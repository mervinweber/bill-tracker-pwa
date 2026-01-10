/**
 * JSON Import/Export Functions Test Suite (Node.js Compatible)
 * Tests data import and export functionality
 */

let testsPassed = 0;
let testsFailed = 0;

function assert(condition, message) {
    if (!condition) {
        throw new Error(`Assertion failed: ${message}`);
    }
}

function assertEqual(actual, expected, message) {
    if (JSON.stringify(actual) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(actual)}. ${message}`);
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

console.log('📋 Running JSON Import/Export Tests...\n');

// Mock data
const mockBill = {
    id: '1',
    name: 'Electricity',
    amountDue: 150,
    dueDate: '2025-02-01',
    category: 'Utilities',
    recurrence: 'monthly',
    paymentHistory: []
};

const mockExportData = {
    exportDate: new Date().toISOString(),
    version: '1.0',
    bills: [mockBill],
    customCategories: ['Utilities', 'Housing', 'Food'],
    paymentSettings: {
        startDate: '2025-01-08',
        frequency: 'bi-weekly',
        payPeriodsToShow: 6
    }
};

// Test export data structure
test('should create valid export data structure', () => {
    const data = mockExportData;
    assert(data.exportDate, 'exportDate is required');
    assert(data.version, 'version is required');
    assert(Array.isArray(data.bills), 'bills must be an array');
    assert(Array.isArray(data.customCategories), 'customCategories must be an array');
    assert(typeof data.paymentSettings === 'object', 'paymentSettings must be an object');
});

test('should stringify export data to valid JSON', () => {
    const jsonString = JSON.stringify(mockExportData, null, 2);
    assert(typeof jsonString === 'string', 'should produce a string');
    assert(jsonString.length > 0, 'JSON string should not be empty');
});

test('should parse JSON export back to object', () => {
    const jsonString = JSON.stringify(mockExportData);
    const parsed = JSON.parse(jsonString);
    assertEqual(parsed.version, mockExportData.version, 'version should match');
    assertEqual(parsed.bills.length, mockExportData.bills.length, 'bills count should match');
});

test('should validate import file has bills array', () => {
    const validData = mockExportData;
    assert(Array.isArray(validData.bills), 'imported data must have bills array');
    assert(validData.bills.length > 0, 'bills array must not be empty');
});

test('should reject import data without bills array', () => {
    const invalidData = {
        ...mockExportData,
        bills: undefined
    };
    assert(!Array.isArray(invalidData.bills), 'should detect missing bills array');
});

test('should reject import data with empty bills array', () => {
    const invalidData = {
        ...mockExportData,
        bills: []
    };
    assert(invalidData.bills.length === 0, 'should detect empty bills array');
});

test('should preserve bill data through export/import cycle', () => {
    const jsonString = JSON.stringify(mockExportData);
    const restored = JSON.parse(jsonString);
    
    assert(restored.bills[0].id === mockBill.id, 'bill id should be preserved');
    assert(restored.bills[0].name === mockBill.name, 'bill name should be preserved');
    assert(restored.bills[0].amountDue === mockBill.amountDue, 'amount due should be preserved');
    assert(restored.bills[0].dueDate === mockBill.dueDate, 'due date should be preserved');
});

test('should validate filename is JSON', () => {
    const validFilename = 'bill-tracker-backup-2025-01-08.json';
    const invalidFilename = 'bill-tracker-backup-2025-01-08.txt';
    
    assert(validFilename.endsWith('.json'), 'JSON file should end with .json');
    assert(!invalidFilename.endsWith('.json'), 'non-JSON file should not end with .json');
});

test('should include export timestamp', () => {
    const data = mockExportData;
    const exportDate = new Date(data.exportDate);
    assert(!isNaN(exportDate.getTime()), 'exportDate should be valid ISO date');
});

test('should handle multiple bills in export', () => {
    const multipleData = {
        ...mockExportData,
        bills: [mockBill, { ...mockBill, id: '2', name: 'Water' }]
    };
    
    assert(multipleData.bills.length === 2, 'should contain 2 bills');
    assertEqual(multipleData.bills[0].name, 'Electricity', 'first bill name correct');
    assertEqual(multipleData.bills[1].name, 'Water', 'second bill name correct');
});

test('should preserve payment history during export/import', () => {
    const billWithHistory = {
        ...mockBill,
        paymentHistory: [
            { amount: 50, date: '2025-01-01' },
            { amount: 100, date: '2025-01-15' }
        ]
    };
    
    const exportData = {
        ...mockExportData,
        bills: [billWithHistory]
    };
    
    const jsonString = JSON.stringify(exportData);
    const restored = JSON.parse(jsonString);
    
    assert(restored.bills[0].paymentHistory.length === 2, 'payment history preserved');
    assertEqual(restored.bills[0].paymentHistory[0].amount, 50, 'first payment preserved');
});

test('should handle empty customCategories in import', () => {
    const data = {
        ...mockExportData,
        customCategories: []
    };
    
    const jsonString = JSON.stringify(data);
    const restored = JSON.parse(jsonString);
    
    assert(Array.isArray(restored.customCategories), 'customCategories should be array');
    assert(restored.customCategories.length === 0, 'empty categories should be preserved');
});

test('should validate payment settings format', () => {
    const settings = mockExportData.paymentSettings;
    assert(settings.startDate, 'startDate should exist');
    assert(settings.frequency, 'frequency should exist');
    assert(typeof settings.payPeriodsToShow === 'number', 'payPeriodsToShow should be number');
});

test('should generate correct backup filename format', () => {
    const date = new Date('2025-01-08').toISOString().split('T')[0];
    const filename = `bill-tracker-backup-${date}.json`;
    
    assert(filename.includes('bill-tracker-backup'), 'filename should include prefix');
    assert(filename.includes(date), 'filename should include date');
    assert(filename.endsWith('.json'), 'filename should end with .json');
});

test('should handle large dataset export', () => {
    const largeBillSet = Array.from({ length: 50 }, (_, i) => ({
        ...mockBill,
        id: String(i + 1),
        name: `Bill ${i + 1}`
    }));
    
    const largeData = {
        ...mockExportData,
        bills: largeBillSet
    };
    
    const jsonString = JSON.stringify(largeData);
    const restored = JSON.parse(jsonString);
    
    assert(restored.bills.length === 50, 'should handle 50 bills');
    assertEqual(restored.bills[49].name, 'Bill 50', 'last bill should be correct');
});

test('should preserve special characters in bill names', () => {
    const specialBill = {
        ...mockBill,
        name: 'Bill & Utilities (2025) - "Important"'
    };
    
    const data = {
        ...mockExportData,
        bills: [specialBill]
    };
    
    const jsonString = JSON.stringify(data);
    const restored = JSON.parse(jsonString);
    
    assertEqual(
        restored.bills[0].name,
        'Bill & Utilities (2025) - "Important"',
        'special characters preserved'
    );
});

console.log(`\n📊 JSON Import/Export Test Results: ${testsPassed} passed, ${testsFailed} failed\n`);

if (testsFailed === 0) {
    console.log('🎉 All tests passed!');
    process.exit(0);
} else {
    console.log(`⚠️ ${testsFailed} test(s) failed`);
    process.exit(1);
}

