export function hasPaymentScheduleChanged(existingSettings = {}, newSettings = {}) {
    const existingStartDate = existingSettings.startDate || '';
    const existingFrequency = existingSettings.frequency || '';
    const existingPayPeriods = Number.parseInt(existingSettings.payPeriodsToShow, 10);
    const existingAmountRaw = Number.parseFloat(existingSettings.amount);
    const existingAmount = Number.isFinite(existingAmountRaw) ? existingAmountRaw : null;

    const newStartDate = newSettings.startDate || '';
    const newFrequency = newSettings.frequency || '';
    const newPayPeriods = Number.parseInt(newSettings.payPeriodsToShow, 10);
    const newAmountRaw = Number.parseFloat(newSettings.amount);
    const newAmount = Number.isFinite(newAmountRaw) ? newAmountRaw : null;

    return (
        existingStartDate !== newStartDate ||
        existingFrequency !== newFrequency ||
        existingPayPeriods !== newPayPeriods ||
        existingAmount !== newAmount
    );
}
