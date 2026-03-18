/**
 * Cloud sync helpers to reduce duplicated sync logic in app initialization and login flows.
 */

/**
 * @param {Object} params
 * @param {() => Promise<{data: import('../types/domainTypes.js').PaymentSettings|null}>} params.fetchCloudPaymentSettings
 * @param {{ set: (key: string, value: unknown) => boolean }} params.storageManager
 * @param {{ PAYMENT_SETTINGS: string }} params.storageKeys
 * @param {{ paymentSettings: import('../types/domainTypes.js').PaymentSettings|null, generatePaycheckDates: () => void }} params.paycheckManager
 * @param {{ info: (message: string) => void }} params.logger
 * @returns {Promise<{cloudPaymentSettings: import('../types/domainTypes.js').PaymentSettings|null, synced: boolean}>}
 * @throws {Error} Propagates errors thrown by fetchCloudPaymentSettings.
 */
export const syncPaymentSettingsFromCloud = async ({
    fetchCloudPaymentSettings,
    storageManager,
    storageKeys,
    paycheckManager,
    logger
}) => {
    const { data: cloudPaymentSettings } = await fetchCloudPaymentSettings();

    if (cloudPaymentSettings && typeof cloudPaymentSettings === 'object') {
        logger.info('Fetched payment settings from cloud');
        storageManager.set(storageKeys.PAYMENT_SETTINGS, cloudPaymentSettings);
        paycheckManager.paymentSettings = cloudPaymentSettings;
        paycheckManager.generatePaycheckDates();
        return { cloudPaymentSettings, synced: true };
    }

    logger.info('No payment settings found in cloud');
    return { cloudPaymentSettings: null, synced: false };
};

/**
 * @param {Object} params
 * @param {() => Promise<{data: import('../types/domainTypes.js').Bill[], error: {message?: string}|null}>} params.fetchCloudBills
 * @param {{ setBills: (bills: import('../types/domainTypes.js').Bill[]) => void }} params.billStore
 * @param {{ set: (key: string, value: unknown) => boolean }} params.storageManager
 * @param {{ BILLS: string }} params.storageKeys
 * @param {{ info: (message: string) => void, warn: (message: string, data?: unknown) => void }} params.logger
 * @param {(error: unknown) => void} [params.onFetchError]
 * @returns {Promise<{cloudBills: import('../types/domainTypes.js').Bill[], synced: boolean, error: unknown}>}
 * @throws {Error} Propagates errors thrown by fetchCloudBills.
 */
export const syncBillsFromCloud = async ({
    fetchCloudBills,
    billStore,
    storageManager,
    storageKeys,
    logger,
    onFetchError
}) => {
    const { data: cloudBills, error } = await fetchCloudBills();

    if (cloudBills && Array.isArray(cloudBills) && cloudBills.length > 0) {
        logger.info(`Fetched ${cloudBills.length} bills from cloud`);
        billStore.setBills(cloudBills);
        storageManager.set(storageKeys.BILLS, cloudBills);
        return { cloudBills, synced: true, error: null };
    }

    if (error) {
        logger.warn('Cloud fetch error', { error: error.message });
        if (typeof onFetchError === 'function') {
            onFetchError(error);
        }
        return { cloudBills: [], synced: false, error };
    }

    logger.info('No bills found in cloud');
    return { cloudBills: [], synced: false, error: null };
};

/**
 * @param {Object} params
 * @param {import('../types/domainTypes.js').Bill[]} params.cloudBills
 * @param {import('../types/domainTypes.js').PaymentSettings|null} params.cloudPaymentSettings
 * @param {{ getAll: () => import('../types/domainTypes.js').Bill[] }} params.billStore
 * @param {{ get: (key: string, fallback: unknown) => unknown }} params.storageManager
 * @param {{ PAYMENT_SETTINGS: string }} params.storageKeys
 * @param {(bills: import('../types/domainTypes.js').Bill[], settings: import('../types/domainTypes.js').PaymentSettings|null) => Promise<{error: unknown}>} params.syncUserData
 * @param {(settings: import('../types/domainTypes.js').PaymentSettings) => Promise<{error: unknown}>} params.syncPaymentSettings
 * @param {{ info: (message: string) => void, error: (message: string, error: unknown) => void }} params.logger
 * @param {(error: unknown) => void} [params.onSyncError]
 * @returns {Promise<{synced: boolean, error: unknown}>}
 * @throws {Error} Propagates unexpected errors from storage access or sync callbacks.
 */
export const syncLocalDataToCloudIfNeeded = async ({
    cloudBills,
    cloudPaymentSettings,
    billStore,
    storageManager,
    storageKeys,
    syncUserData,
    syncPaymentSettings,
    logger,
    onSyncError = null
}) => {
    const localBills = billStore.getAll();
    const localPaymentSettings = storageManager.get(storageKeys.PAYMENT_SETTINGS, null);

    if ((!cloudBills || cloudBills.length === 0) && localBills.length > 0) {
        logger.info(`Syncing ${localBills.length} local bills to cloud...`);
        const { error: syncError } = await syncUserData(localBills, localPaymentSettings);
        if (syncError) {
            logger.error('Failed to sync local data to cloud', syncError);
            if (typeof onSyncError === 'function') {
                onSyncError(syncError);
            }
            return { synced: false, error: syncError };
        }

        logger.info('Local data synced to cloud successfully');
        return { synced: true, error: null };
    }

    if (!cloudPaymentSettings && localPaymentSettings) {
        logger.info('Syncing local payment settings to cloud...');
        const { error: syncError } = await syncPaymentSettings(localPaymentSettings);
        if (syncError) {
            logger.error('Failed to sync payment settings', syncError);
            if (typeof onSyncError === 'function') {
                onSyncError(syncError);
            }
            return { synced: false, error: syncError };
        }

        logger.info('Payment settings synced to cloud');
        return { synced: true, error: null };
    }

    return { synced: false, error: null };
};
