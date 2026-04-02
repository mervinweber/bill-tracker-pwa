const toNumber = (value) => {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : 0;
};

export function isDebtSnowballCandidate(bill) {
    const interestRate = toNumber(bill?.interestRate);
    const debtTotal = toNumber(bill?.debtTotal);
    return Boolean(bill?.includeInDebtSnowball) || interestRate > 0 || debtTotal > 0;
}

export function buildDebtSnowballPlan(bills, extraPayment = 0) {
    const candidates = (bills || [])
        .filter(isDebtSnowballCandidate)
        .map((bill) => {
            const debtTotal = Math.max(0, toNumber(bill.debtTotal));
            const interestRate = Math.max(0, toNumber(bill.interestRate));
            const minimumPayment = Math.max(0, toNumber(bill.amountDue));
            const monthlyInterestEstimate = debtTotal * (interestRate / 100) / 12;
            return {
                id: bill.id,
                name: bill.name,
                category: bill.category,
                debtTotal,
                interestRate,
                minimumPayment,
                monthlyInterestEstimate,
                includeInDebtSnowball: Boolean(bill.includeInDebtSnowball),
                isPriorityTarget: false,
                recommendedPayment: minimumPayment
            };
        })
        .sort((a, b) => {
            if (a.debtTotal !== b.debtTotal) {
                return a.debtTotal - b.debtTotal;
            }
            return b.interestRate - a.interestRate;
        });

    if (candidates.length > 0) {
        candidates[0].isPriorityTarget = true;
        candidates[0].recommendedPayment += Math.max(0, toNumber(extraPayment));
    }

    const totalDebt = candidates.reduce((sum, item) => sum + item.debtTotal, 0);
    const totalMinimumPayment = candidates.reduce((sum, item) => sum + item.minimumPayment, 0);
    const totalMonthlyInterest = candidates.reduce((sum, item) => sum + item.monthlyInterestEstimate, 0);

    return {
        extraPayment: Math.max(0, toNumber(extraPayment)),
        totalDebt,
        totalMinimumPayment,
        totalMonthlyInterest,
        itemCount: candidates.length,
        items: candidates
    };
}
