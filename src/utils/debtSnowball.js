const toNumber = (value) => {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : 0;
};

export function isDebtSnowballCandidate(bill) {
    const interestRate = toNumber(bill?.interestRate);
    const debtTotal = toNumber(bill?.debtTotal);
    return Boolean(bill?.includeInDebtSnowball) || interestRate > 0 || debtTotal > 0;
}

/**
 * Build a ranked debt repayment plan.
 *
 * @param {Array<Object>} bills - All bills in the store.
 * @param {number} [extraPayment=0] - Additional monthly amount applied to the priority target.
 * @param {'snowball'|'avalanche'} [strategy='snowball']
 *   - 'snowball': smallest balance first (with highest rate as tiebreaker)
 *   - 'avalanche': highest rate first (with smallest balance as tiebreaker)
 * @returns {{strategy:string, extraPayment:number, totalDebt:number, totalMinimumPayment:number, totalMonthlyInterest:number, itemCount:number, items:Array<Object>}}
 */
export function buildDebtSnowballPlan(bills, extraPayment = 0, strategy = 'snowball') {
    const candidates = (bills || [])
        .filter((bill) => !bill.archived)
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
                recommendedPayment: minimumPayment,
                payoffMonths: null
            };
        })
        .sort((a, b) => {
            if (strategy === 'avalanche') {
                if (a.interestRate !== b.interestRate) return b.interestRate - a.interestRate;
                return a.debtTotal - b.debtTotal;
            }
            // snowball: smallest balance first
            if (a.debtTotal !== b.debtTotal) return a.debtTotal - b.debtTotal;
            return b.interestRate - a.interestRate;
        });

    if (candidates.length > 0) {
        candidates[0].isPriorityTarget = true;
        candidates[0].recommendedPayment += Math.max(0, toNumber(extraPayment));
    }

    // Compute projected payoff months per item
    for (const item of candidates) {
        const netPayment = item.recommendedPayment - item.monthlyInterestEstimate;
        if (item.debtTotal > 0 && netPayment > 0) {
            item.payoffMonths = Math.ceil(item.debtTotal / netPayment);
        }
    }

    const totalDebt = candidates.reduce((sum, item) => sum + item.debtTotal, 0);
    const totalMinimumPayment = candidates.reduce((sum, item) => sum + item.minimumPayment, 0);
    const totalMonthlyInterest = candidates.reduce((sum, item) => sum + item.monthlyInterestEstimate, 0);

    return {
        strategy,
        extraPayment: Math.max(0, toNumber(extraPayment)),
        totalDebt,
        totalMinimumPayment,
        totalMonthlyInterest,
        itemCount: candidates.length,
        items: candidates
    };
}
