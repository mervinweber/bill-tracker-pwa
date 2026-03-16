/**
 * Cloud sync helpers to reduce duplicated sync logic in app initialization and login flows.
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
