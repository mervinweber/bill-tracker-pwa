const MAX_PROJECTION_MONTHS = 1200;
const EPSILON = 0.005;

const money = (value) => Math.round((value + Number.EPSILON) * 100) / 100;
const number = (value) => {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : 0;
};

const addMonths = (date, months) => {
    const source = new Date(date);
    return new Date(Date.UTC(source.getUTCFullYear(), source.getUTCMonth() + months, 1));
};

const sortDebts = (debts, strategy) => [...debts].sort((a, b) => {
    if (strategy === 'avalanche') {
        if (a.apr !== b.apr) return b.apr - a.apr;
        if (a.balance !== b.balance) return a.balance - b.balance;
        return a.name.localeCompare(b.name);
    }
    if (a.balance !== b.balance) return a.balance - b.balance;
    if (a.apr !== b.apr) return b.apr - a.apr;
    return a.name.localeCompare(b.name);
});

export function buildDebtPayoffPlan(debts, extraPayment = 0, strategy = 'snowball', options = {}) {
    const normalizedStrategy = strategy === 'avalanche' ? 'avalanche' : 'snowball';
    const startDate = options.startDate ? new Date(options.startDate) : new Date();
    const maxMonths = Math.min(MAX_PROJECTION_MONTHS, Math.max(1, options.maxMonths || MAX_PROJECTION_MONTHS));
    const states = (debts || [])
        .filter((debt) => debt?.isActive !== false && number(debt?.balance) > 0)
        .map((debt) => ({
            ...debt,
            id: String(debt.id),
            name: String(debt.name || 'Untitled debt'),
            balance: money(Math.max(0, number(debt.balance))),
            startingBalance: money(Math.max(0, number(debt.balance))),
            apr: Math.max(0, number(debt.apr)),
            minimumPayment: money(Math.max(0, number(debt.minimumPayment))),
            totalInterest: 0,
            totalPaid: 0,
            payoffMonth: null,
            firstMonthPayment: 0
        }));

    const initialOrder = sortDebts(states, normalizedStrategy).map((debt) => debt.id);
    const monthlyBudget = money(
        states.reduce((sum, debt) => sum + debt.minimumPayment, 0) + Math.max(0, number(extraPayment))
    );
    const schedule = [];

    for (let month = 1; month <= maxMonths && states.some((debt) => debt.balance > EPSILON); month += 1) {
        const active = states.filter((debt) => debt.balance > EPSILON);
        let available = monthlyBudget;
        let monthInterest = 0;
        let monthPayment = 0;
        const payments = {};

        for (const debt of active) {
            const interest = money(debt.balance * (debt.apr / 100 / 12));
            debt.balance = money(debt.balance + interest);
            debt.totalInterest = money(debt.totalInterest + interest);
            monthInterest = money(monthInterest + interest);
        }

        for (const debt of active) {
            const payment = money(Math.min(debt.balance, debt.minimumPayment, available));
            debt.balance = money(debt.balance - payment);
            debt.totalPaid = money(debt.totalPaid + payment);
            available = money(available - payment);
            monthPayment = money(monthPayment + payment);
            payments[debt.id] = money((payments[debt.id] || 0) + payment);
        }

        for (const debt of sortDebts(states.filter((item) => item.balance > EPSILON), normalizedStrategy)) {
            if (available <= EPSILON) break;
            const payment = money(Math.min(debt.balance, available));
            debt.balance = money(debt.balance - payment);
            debt.totalPaid = money(debt.totalPaid + payment);
            available = money(available - payment);
            monthPayment = money(monthPayment + payment);
            payments[debt.id] = money((payments[debt.id] || 0) + payment);
        }

        for (const debt of states) {
            if (month === 1) debt.firstMonthPayment = payments[debt.id] || 0;
            if (debt.payoffMonth === null && debt.balance <= EPSILON) {
                debt.balance = 0;
                debt.payoffMonth = month;
            }
        }

        schedule.push({
            month,
            date: addMonths(startDate, month - 1).toISOString().slice(0, 10),
            payment: monthPayment,
            interest: monthInterest,
            remainingBalance: money(states.reduce((sum, debt) => sum + debt.balance, 0)),
            payments
        });

        if (monthPayment <= monthInterest && available <= EPSILON && states.every((debt) => debt.balance > EPSILON)) {
            const hasPrincipalProgress = states.some((debt) => (payments[debt.id] || 0) > debt.startingBalance * (debt.apr / 100 / 12));
            if (!hasPrincipalProgress) break;
        }
    }

    const allPaid = states.every((debt) => debt.balance <= EPSILON);
    const payoffMonths = states.length > 0 && allPaid
        ? Math.max(0, ...states.map((debt) => debt.payoffMonth || 0))
        : null;
    const orderedStates = initialOrder.map((id) => states.find((debt) => debt.id === id));

    return {
        strategy: normalizedStrategy,
        extraPayment: money(Math.max(0, number(extraPayment))),
        itemCount: states.length,
        totalDebt: money(states.reduce((sum, debt) => sum + debt.startingBalance, 0)),
        totalMinimumPayment: money(states.reduce((sum, debt) => sum + debt.minimumPayment, 0)),
        monthlyBudget,
        totalInterest: money(states.reduce((sum, debt) => sum + debt.totalInterest, 0)),
        totalPaid: money(states.reduce((sum, debt) => sum + debt.totalPaid, 0)),
        payoffMonths,
        debtFreeDate: payoffMonths === null ? null : addMonths(startDate, Math.max(0, payoffMonths - 1)).toISOString().slice(0, 10),
        items: orderedStates.map((debt, index) => ({
            ...debt,
            balance: debt.startingBalance,
            remainingBalance: debt.balance,
            isPriorityTarget: index === 0,
            recommendedPayment: debt.firstMonthPayment,
            payoffDate: debt.payoffMonth === null
                ? null
                : addMonths(startDate, debt.payoffMonth - 1).toISOString().slice(0, 10)
        })),
        schedule
    };
}

export function compareDebtStrategies(debts, extraPayment = 0, options = {}) {
    const snowball = buildDebtPayoffPlan(debts, extraPayment, 'snowball', options);
    const avalanche = buildDebtPayoffPlan(debts, extraPayment, 'avalanche', options);
    return {
        snowball,
        avalanche,
        interestSavingsWithAvalanche: money(Math.max(0, snowball.totalInterest - avalanche.totalInterest)),
        monthsSavedWithAvalanche: snowball.payoffMonths === null || avalanche.payoffMonths === null
            ? null
            : Math.max(0, snowball.payoffMonths - avalanche.payoffMonths)
    };
}
