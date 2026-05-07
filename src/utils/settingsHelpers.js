export function hasPaymentScheduleChanged(existingSettings = {}, newSettings = {}) {
    const existingStartDate = existingSettings.startDate || '';
    const existingFrequency = existingSettings.frequency || '';
    const existingPayPeriods = Number.parseInt(existingSettings.payPeriodsToShow, 10);

    const newStartDate = newSettings.startDate || '';
    const newFrequency = newSettings.frequency || '';
    const newPayPeriods = Number.parseInt(newSettings.payPeriodsToShow, 10);
    const existingUsesCustomDays = existingFrequency === 'custom';
    const newUsesCustomDays = newFrequency === 'custom';
    const existingCustomDays = existingUsesCustomDays ? Number.parseInt(existingSettings.customDays, 10) : null;
    const newCustomDays = newUsesCustomDays ? Number.parseInt(newSettings.customDays, 10) : null;

    return (
        existingStartDate !== newStartDate ||
        existingFrequency !== newFrequency ||
        existingPayPeriods !== newPayPeriods ||
        existingCustomDays !== newCustomDays
    );
}
