import { describe, expect, it, vi } from 'vitest';
import {
    syncBillsFromCloud,
    syncLocalDataToCloudIfNeeded,
    syncPaymentSettingsFromCloud
} from '../src/utils/cloudSyncManager.js';

describe('cloudSyncManager', () => {
    it('syncPaymentSettingsFromCloud stores and applies settings', async () => {
        const fetchCloudPaymentSettings = vi.fn().mockResolvedValue({
            data: { frequency: 'bi-weekly', payPeriodsToShow: 6 }
        });
        const storageManager = { set: vi.fn() };
        const paycheckManager = { paymentSettings: null, generatePaycheckDates: vi.fn() };
        const logger = { info: vi.fn() };

        const result = await syncPaymentSettingsFromCloud({
            fetchCloudPaymentSettings,
            storageManager,
            storageKeys: { PAYMENT_SETTINGS: 'paymentSettings' },
            paycheckManager,
            logger
        });

        expect(result.synced).toBe(true);
        expect(storageManager.set).toHaveBeenCalledWith('paymentSettings', { frequency: 'bi-weekly', payPeriodsToShow: 6 });
        expect(paycheckManager.paymentSettings).toEqual({ frequency: 'bi-weekly', payPeriodsToShow: 6 });
        expect(paycheckManager.generatePaycheckDates).toHaveBeenCalled();
    });

    it('syncBillsFromCloud applies cloud bills and persists locally', async () => {
        const fetchCloudBills = vi.fn().mockResolvedValue({
            data: [{ id: 'b1', name: 'Rent', amountDue: 1000 }],
            error: null
        });
        const billStore = { setBills: vi.fn() };
        const storageManager = { set: vi.fn() };
        const logger = { info: vi.fn(), warn: vi.fn() };

        const result = await syncBillsFromCloud({
            fetchCloudBills,
            billStore,
            storageManager,
            storageKeys: { BILLS: 'bills' },
            logger,
            onFetchError: vi.fn()
        });

        expect(result.synced).toBe(true);
        expect(result.cloudBills).toHaveLength(1);
        expect(billStore.setBills).toHaveBeenCalledWith([{ id: 'b1', name: 'Rent', amountDue: 1000 }]);
        expect(storageManager.set).toHaveBeenCalledWith('bills', [{ id: 'b1', name: 'Rent', amountDue: 1000 }]);
    });

    it('syncLocalDataToCloudIfNeeded uploads local bills when cloud is empty', async () => {
        const syncUserData = vi.fn().mockResolvedValue({ error: null });
        const syncPaymentSettings = vi.fn().mockResolvedValue({ error: null });
        const onSyncError = vi.fn();
        const logger = { info: vi.fn(), error: vi.fn() };
        const billStore = {
            getAll: vi.fn().mockReturnValue([{ id: 'l1', name: 'Phone', amountDue: 120 }])
        };
        const storageManager = {
            get: vi.fn().mockReturnValue({ frequency: 'monthly', payPeriodsToShow: 4 })
        };

        const result = await syncLocalDataToCloudIfNeeded({
            cloudBills: [],
            cloudPaymentSettings: null,
            billStore,
            storageManager,
            storageKeys: { PAYMENT_SETTINGS: 'paymentSettings' },
            syncUserData,
            syncPaymentSettings,
            logger,
            onSyncError
        });

        expect(result.synced).toBe(true);
        expect(syncUserData).toHaveBeenCalledWith(
            [{ id: 'l1', name: 'Phone', amountDue: 120 }],
            { frequency: 'monthly', payPeriodsToShow: 4 }
        );
        expect(syncPaymentSettings).not.toHaveBeenCalled();
        expect(onSyncError).not.toHaveBeenCalled();
    });

    it('syncLocalDataToCloudIfNeeded syncs payment settings when bills already exist in cloud', async () => {
        const syncUserData = vi.fn().mockResolvedValue({ error: null });
        const syncPaymentSettings = vi.fn().mockResolvedValue({ error: null });
        const logger = { info: vi.fn(), error: vi.fn() };

        const result = await syncLocalDataToCloudIfNeeded({
            cloudBills: [{ id: 'c1' }],
            cloudPaymentSettings: null,
            billStore: { getAll: vi.fn().mockReturnValue([{ id: 'l1' }]) },
            storageManager: { get: vi.fn().mockReturnValue({ frequency: 'weekly' }) },
            storageKeys: { PAYMENT_SETTINGS: 'paymentSettings' },
            syncUserData,
            syncPaymentSettings,
            logger,
            onSyncError: vi.fn()
        });

        expect(result.synced).toBe(true);
        expect(syncUserData).not.toHaveBeenCalled();
        expect(syncPaymentSettings).toHaveBeenCalledWith({ frequency: 'weekly' });
    });

    it('syncLocalDataToCloudIfNeeded reports sync errors', async () => {
        const syncError = { message: 'Network down' };
        const onSyncError = vi.fn();

        const result = await syncLocalDataToCloudIfNeeded({
            cloudBills: [],
            cloudPaymentSettings: null,
            billStore: { getAll: vi.fn().mockReturnValue([{ id: 'l1' }]) },
            storageManager: { get: vi.fn().mockReturnValue({ frequency: 'weekly' }) },
            storageKeys: { PAYMENT_SETTINGS: 'paymentSettings' },
            syncUserData: vi.fn().mockResolvedValue({ error: syncError }),
            syncPaymentSettings: vi.fn(),
            logger: { info: vi.fn(), error: vi.fn() },
            onSyncError
        });

        expect(result.synced).toBe(false);
        expect(result.error).toEqual(syncError);
        expect(onSyncError).toHaveBeenCalledWith(syncError);
    });
});
