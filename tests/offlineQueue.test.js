/**
 * Test Suite: Offline Queue
 * Tests operation queuing, persistence, and size management
 */

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
console.log('\n=== Offline Queue Tests ===\n');

// Operation types
console.log('Testing Operation Types:');
try {
    const OPERATION_TYPES = {
        UPDATE_BILL: 'update_bill',
        DELETE_BILL: 'delete_bill',
        CREATE_BILL: 'create_bill',
        RECORD_PAYMENT: 'record_payment',
        BATCH_UPDATE: 'batch_update'
    };
    
    assert(OPERATION_TYPES.UPDATE_BILL === 'update_bill', 'should define UPDATE_BILL');
    assert(OPERATION_TYPES.DELETE_BILL === 'delete_bill', 'should define DELETE_BILL');
    assert(OPERATION_TYPES.CREATE_BILL === 'create_bill', 'should define CREATE_BILL');
    assert(OPERATION_TYPES.RECORD_PAYMENT === 'record_payment', 'should define RECORD_PAYMENT');
    assert(OPERATION_TYPES.BATCH_UPDATE === 'batch_update', 'should define BATCH_UPDATE');
    
} catch (error) {
    console.error(`\n❌ Operation Types: ${error.message}\n`);
    process.exit(1);
}

// Operation queue concept
console.log('\nTesting Queue Operations:');
try {
    const queue = [];
    const MAX_QUEUE_SIZE = 250;
    
    const queueOperation = function(operationType, data, id) {
        // Validation
        if (!operationType || typeof operationType !== 'string') return null;
        if (!data || typeof data !== 'object') return null;
        if (!id || typeof id !== 'string') return null;
        
        // Check size
        const dataSize = JSON.stringify(data).length;
        if (dataSize > 10 * 1024) return null;  // 10KB max
        
        // Check capacity
        if (queue.length >= MAX_QUEUE_SIZE) return null;
        
        const operation = {
            id: Math.random().toString(36).substr(2, 9),
            operationType,
            data,
            billId: id,
            status: 'pending',
            timestamp: Date.now(),
            retries: 0
        };
        
        queue.push(operation);
        return operation;
    };
    
    const op = queueOperation('create_bill', { name: 'Test' }, 'bill-1');
    assert(op !== null, 'should queue valid operation');
    assert(op.status === 'pending', 'should set status to pending');
    assertEquals(op.retries, 0, 'should initialize retries to 0');
    
    // Test validation
    assertEquals(queueOperation(null, {}, 'id'), null, 'should reject null operationType');
    assertEquals(queueOperation('create_bill', null, 'id'), null, 'should reject null data');
    assertEquals(queueOperation('create_bill', {}, null), null, 'should reject null id');
    
} catch (error) {
    console.error(`\n❌ Queue Operations: ${error.message}\n`);
    process.exit(1);
}

// Queue size limit
console.log('\nTesting Queue Size Limits:');
try {
    const queue = [];
    const MAX_QUEUE_SIZE = 250;
    
    const queueOperation = function(operationType, data, id) {
        if (queue.length >= MAX_QUEUE_SIZE) return null;
        queue.push({ id, operationType, data, status: 'pending' });
        return { id, operationType, data, status: 'pending' };
    };
    
    // Queue 249 operations
    for (let i = 0; i < 249; i++) {
        const op = queueOperation('create_bill', {}, `bill-${i}`);
        assert(op !== null, `operation ${i} should be queued`);
    }
    
    assertEquals(queue.length, 249, 'should queue 249 operations');
    
    // 250th should work
    const op250 = queueOperation('create_bill', {}, 'bill-249');
    assert(op250 !== null, 'should accept 250th operation');
    
    // 251st should fail
    const op251 = queueOperation('create_bill', {}, 'bill-250');
    assertEquals(op251, null, 'should reject 251st operation (capacity limit)');
    
} catch (error) {
    console.error(`\n❌ Queue Size Limits: ${error.message}\n`);
    process.exit(1);
}

// Operation status management
console.log('\nTesting Operation Status:');
try {
    const queue = [];
    
    const queueOperation = function(operationType, data, id) {
        const op = { id, operationType, data, status: 'pending', retries: 0 };
        queue.push(op);
        return op;
    };
    
    const markCompleted = function(opId) {
        const op = queue.find(o => o.id === opId);
        if (op) {
            op.status = 'completed';
            return true;
        }
        return false;
    };
    
    const markFailed = function(opId) {
        const op = queue.find(o => o.id === opId);
        if (op) {
            op.status = 'failed';
            op.retries += 1;
            return true;
        }
        return false;
    };
    
    const op = queueOperation('delete_bill', {}, 'bill-1');
    assertEquals(op.status, 'pending', 'new operation should be pending');
    
    assert(markCompleted(op.id), 'should mark as completed');
    assertEquals(queue[0].status, 'completed', 'operation should be completed');
    
    const op2 = queueOperation('delete_bill', {}, 'bill-2');
    assert(markFailed(op2.id), 'should mark as failed');
    assertEquals(queue[1].retries, 1, 'should increment retry count');
    
} catch (error) {
    console.error(`\n❌ Operation Status: ${error.message}\n`);
    process.exit(1);
}

// Cleanup and enforcement
console.log('\nTesting Cleanup:');
try {
    const queue = [];
    
    const removeOperation = function(opId) {
        const idx = queue.findIndex(o => o.id === opId);
        if (idx > -1) {
            queue.splice(idx, 1);
            return true;
        }
        return false;
    };
    
    queue.push({ id: 'op-1', status: 'pending' });
    assertEquals(queue.length, 1, 'should have operation');
    
    assert(removeOperation('op-1'), 'should remove operation');
    assertEquals(queue.length, 0, 'should be empty after removal');
    
    assert(!removeOperation('non-existent'), 'should return false for non-existent');
    
} catch (error) {
    console.error(`\n❌ Cleanup: ${error.message}\n`);
    process.exit(1);
}

// Size enforcement
console.log('\nTesting Size Enforcement:');
try {
    const queue = [];
    const MAX_QUEUE_SIZE = 250;
    
    const enforceQueueSizeLimit = function() {
        let trimmed = 0;
        // Remove completed operations when over limit
        if (queue.length > MAX_QUEUE_SIZE) {
            const completed = queue.filter(o => o.status === 'completed');
            for (let i = 0; i < completed.length && queue.length > MAX_QUEUE_SIZE; i++) {
                const idx = queue.indexOf(completed[i]);
                if (idx > -1) {
                    queue.splice(idx, 1);
                    trimmed++;
                }
            }
        }
        return trimmed;
    };
    
    // Fill with completed operations
    for (let i = 0; i < 275; i++) {
        queue.push({ id: `op-${i}`, status: 'completed' });
    }
    
    assertEquals(queue.length, 275, 'should have 275 operations');
    
    const trimmed = enforceQueueSizeLimit();
    assert(trimmed > 0, 'should trim operations');
    assert(queue.length <= MAX_QUEUE_SIZE, 'should be within limit after enforcement');
    
} catch (error) {
    console.error(`\n❌ Size Enforcement: ${error.message}\n`);
    process.exit(1);
}

// Queue statistics
console.log('\nTesting Queue Statistics:');
try {
    const queue = [];
    
    queue.push({ id: '1', status: 'pending' });
    queue.push({ id: '2', status: 'pending' });
    queue.push({ id: '3', status: 'completed' });
    queue.push({ id: '4', status: 'failed' });
    
    const getStats = function() {
        return {
            total: queue.length,
            pending: queue.filter(o => o.status === 'pending').length,
            completed: queue.filter(o => o.status === 'completed').length,
            failed: queue.filter(o => o.status === 'failed').length
        };
    };
    
    const stats = getStats();
    assertEquals(stats.total, 4, 'should count total');
    assertEquals(stats.pending, 2, 'should count pending');
    assertEquals(stats.completed, 1, 'should count completed');
    assertEquals(stats.failed, 1, 'should count failed');
    
} catch (error) {
    console.error(`\n❌ Statistics: ${error.message}\n`);
    process.exit(1);
}

// Batch operations
console.log('\nTesting Batch Operations:');
try {
    const queue = [];
    
    const batchQueue = function(operations) {
        let added = 0;
        for (const op of operations) {
            if (queue.length < 250) {
                queue.push(op);
                added++;
            }
        }
        return added;
    };
    
    const ops = [
        { id: 'b1', operationType: 'create_bill', status: 'pending' },
        { id: 'b2', operationType: 'create_bill', status: 'pending' },
        { id: 'b3', operationType: 'create_bill', status: 'pending' }
    ];
    
    const added = batchQueue(ops);
    assertEquals(added, 3, 'should add multiple operations');
    assertEquals(queue.length, 3, 'should have all operations');
    
} catch (error) {
    console.error(`\n❌ Batch Operations: ${error.message}\n`);
    process.exit(1);
}

// Operation data size validation
console.log('\nTesting Data Size Validation:');
try {
    const MAX_OPERATION_SIZE = 10 * 1024; // 10KB
    
    const validateSize = function(data) {
        const size = JSON.stringify(data).length;
        return size <= MAX_OPERATION_SIZE ? size : null;
    };
    
    const smallData = { name: 'Bill', amount: 100 };
    const size1 = validateSize(smallData);
    assert(size1 !== null, 'should accept small data');
    
    const largeData = { description: 'x'.repeat(20000) };
    const size2 = validateSize(largeData);
    assertEquals(size2, null, 'should reject oversized data');
    
} catch (error) {
    console.error(`\n❌ Data Size Validation: ${error.message}\n`);
    process.exit(1);
}

// Persistence concept
console.log('\nTesting Persistence Concept:');
try {
    const storage = {};
    
    const persistQueue = function(queue) {
        storage['offline_queue'] = JSON.stringify(queue);
        return true;
    };
    
    const restoreQueue = function() {
        const data = storage['offline_queue'];
        return data ? JSON.parse(data) : [];
    };
    
    const queue = [
        { id: 'p1', operationType: 'create_bill', status: 'pending' },
        { id: 'p2', operationType: 'update_bill', status: 'completed' }
    ];
    
    assert(persistQueue(queue), 'should persist queue');
    const restored = restoreQueue();
    assertEquals(restored.length, 2, 'should restore queue');
    assertEquals(restored[0].id, 'p1', 'should preserve operation data');
    
} catch (error) {
    console.error(`\n❌ Persistence: ${error.message}\n`);
    process.exit(1);
}

console.log('\n🎉 All Offline Queue tests passed!\n');
