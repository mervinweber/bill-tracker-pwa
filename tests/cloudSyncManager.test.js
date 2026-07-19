import { describe, expect, it, vi } from 'vitest';
import {
    syncBillsFromCloud,
    syncFinancialPlanFromCloud,
    syncLocalDataToCloudIfNeeded,
    syncPaymentSettingsFromCloud
} from '../src/utils/cloudSyncManager.js';

describe('cloudSyncManager', () => {
    it('applies a newer cloud financial plan', async () => {
        const cloudPlan = { schemaVersion: 1, updatedAt: '2026-08-02T00:00:00.000Z' };
        const financialPlanStore = {
            getPlan: vi.fn().mockReturnValue({ updatedAt: '2026-08-01T00:00:00.000Z' }),
            replace: vi.fn()
        };
        const result = await syncFinancialPlanFromCloud({
            fetchCloudFinancialPlan: vi.fn().mockResolvedValue({ data: cloudPlan, error: null }),
            financialPlanStore,
            logger: { info: vi.fn(), warn: vi.fn() }
        });
        expect(result.synced).toBe(true);
        expect(financialPlanStore.replace).toHaveBeenCalledWith(cloudPlan);
    });

    it('keeps a newer local financial plan', async () => {
        const financialPlanStore = {
            getPlan: vi.fn().mockReturnValue({ updatedAt: '2026-08-03T00:00:00.000Z' }),
            replace: vi.fn()
        };
        const result = await syncFinancialPlanFromCloud({
            fetchCloudFinancialPlan: vi.fn().mockResolvedValue({
                data: { schemaVersion: 1, updatedAt: '2026-08-02T00:00:00.000Z' }, error: null
            }),
            financialPlanStore,
            logger: { info: vi.fn(), warn: vi.fn() }
        });
        expect(result.synced).toBe(false);
        expect(financialPlanStore.replace).not.toHaveBeenCalled();
    });

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
            get: vi.fn().mockReturnValue({
                startDate: '2026-01-01',
                frequency: 'monthly',
                payPeriodsToShow: 4
            })
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
            { startDate: '2026-01-01', frequency: 'monthly', payPeriodsToShow: 4 }
        );
        expect(syncPaymentSettings).not.toHaveBeenCalled();
        expect(onSyncError).not.toHaveBeenCalled();
    });

    it('syncLocalDataToCloudIfNeeded syncs payment settings when bills already exist in cloud', async () => {
        const syncUserData = vi.fn().mockResolvedValue({ error: null });
        const syncPaymentSettings = vi.fn().mockResolvedValue({ error: null });
        const logger = { info: vi.fn(), error: vi.fn() };

        const result = await syncLocalDataToCloudIfNeeded({
            cloudBills: [{
                id: 'c1',
                name: 'Cloud Bill',
                category: 'Utilities',
                dueDate: '2026-03-01',
                amountDue: 100,
                balance: 100,
                isPaid: false,
                recurrence: 'Monthly'
            }],
            cloudPaymentSettings: null,
            billStore: { getAll: vi.fn().mockReturnValue([{ id: 'l1' }]) },
            storageManager: {
                get: vi.fn().mockReturnValue({
                    startDate: '2026-01-01',
                    frequency: 'weekly',
                    payPeriodsToShow: 6
                })
            },
            storageKeys: { PAYMENT_SETTINGS: 'paymentSettings' },
            syncUserData,
            syncPaymentSettings,
            logger,
            onSyncError: vi.fn()
        });

        expect(result.synced).toBe(true);
        expect(syncUserData).not.toHaveBeenCalled();
        expect(syncPaymentSettings).toHaveBeenCalledWith({
            startDate: '2026-01-01',
            frequency: 'weekly',
            payPeriodsToShow: 6
        });
    });

    it('syncLocalDataToCloudIfNeeded reports sync errors', async () => {
        const syncError = { message: 'Network down' };
        const onSyncError = vi.fn();

        const result = await syncLocalDataToCloudIfNeeded({
            cloudBills: [],
            cloudPaymentSettings: null,
            billStore: { getAll: vi.fn().mockReturnValue([{ id: 'l1' }]) },
            storageManager: {
                get: vi.fn().mockReturnValue({
                    startDate: '2026-01-01',
                    frequency: 'weekly',
                    payPeriodsToShow: 6
                })
            },
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
