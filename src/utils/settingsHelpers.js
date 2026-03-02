export function hasPaymentScheduleChanged(existingSettings = {}, newSettings = {}) {
    const existingStartDate = existingSettings.startDate || '';
    const existingFrequency = existingSettings.frequency || '';
    const existingPayPeriods = Number.parseInt(existingSettings.payPeriodsToShow, 10);

    const newStartDate = newSettings.startDate || '';
    const newFrequency = newSettings.frequency || '';
    const newPayPeriods = Number.parseInt(newSettings.payPeriodsToShow, 10);

    return (
        existingStartDate !== newStartDate ||
        existingFrequency !== newFrequency ||
        existingPayPeriods !== newPayPeriods
    );
}
