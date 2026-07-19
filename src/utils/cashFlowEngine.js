import { isDebtSnowballCandidate } from './debtSnowball.js';
import { getBillSeriesKey } from './debtAdapter.js';

const money = (value) => Math.round((value + Number.EPSILON) * 100) / 100;
const number = (value) => {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : 0;
};

const monthlyFactors = {
    weekly: 52 / 12,
    biweekly: 26 / 12,
    'bi-weekly': 26 / 12,
    semimonthly: 2,
    monthly: 1,
    annual: 1 / 12
};

const billMonthlyFactors = {
    Weekly: 52 / 12,
    'Bi-weekly': 26 / 12,
    Monthly: 1,
    Quarterly: 1 / 3,
    Yearly: 1 / 12
};

const monthKey = (date) => `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
const monthDate = (startDate, offset) => {
    const date = new Date(startDate);
    return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + offset, 1));
};

export function toMonthlyIncome(source) {
    if (!source || source.isActive === false) return 0;
    return money(Math.max(0, number(source.amount)) * (monthlyFactors[source.frequency] || 1));
}

const getIncome = (incomeSources, paymentSettings) => {
    const sources = (incomeSources || []).filter((source) => source.isActive !== false && number(source.amount) > 0);
    if (sources.length > 0) return money(sources.reduce((sum, source) => sum + toMonthlyIncome(source), 0));
    return money(Math.max(0, number(paymentSettings?.amount)) * (monthlyFactors[paymentSettings?.frequency] || 1));
};

const getBillExpenses = (bills, projectionDate) => {
    const eligible = (bills || []).filter((bill) => !bill.archived && !isDebtSnowballCandidate(bill));
    const targetKey = monthKey(projectionDate);
    const actual = eligible.filter((bill) => {
        if (typeof bill.dueDate !== 'string') return false;
        const dueDate = new Date(`${bill.dueDate}T00:00:00Z`);
        return !Number.isNaN(dueDate.getTime()) && monthKey(dueDate) === targetKey;
    });

    const actualSeries = new Set(actual.map(getBillSeriesKey));
    const recurringTemplates = new Map();
    for (const bill of eligible) {
        if (!billMonthlyFactors[bill.recurrence]) continue;
        const key = getBillSeriesKey(bill);
        if (!recurringTemplates.has(key)) recurringTemplates.set(key, bill);
    }

    const actualTotal = actual.reduce((sum, bill) => sum + Math.max(0, number(bill.amountDue)), 0);
    const fallbackTotal = [...recurringTemplates.entries()].reduce((sum, [key, bill]) => {
        if (actualSeries.has(key)) return sum;
        return sum + Math.max(0, number(bill.amountDue)) * billMonthlyFactors[bill.recurrence];
    }, 0);
    return money(actualTotal + fallbackTotal);
};

export function buildCashFlowForecast({
    bills = [],
    debts = [],
    incomeSources = [],
    accounts = [],
    paymentSettings = null,
    scenario = null,
    extraDebtPayment = 0,
    months = 6,
    startDate = new Date()
} = {}) {
    const count = Math.min(24, Math.max(1, Math.trunc(number(months) || 6)));
    const baseIncome = getIncome(incomeSources, paymentSettings);
    const minimumDebtPayments = money((debts || [])
        .filter((debt) => debt.isActive !== false && number(debt.balance) > 0)
        .reduce((sum, debt) => sum + Math.max(0, number(debt.minimumPayment)), 0));
    const scenarioIncome = number(scenario?.monthlyIncomeChange);
    const scenarioExpense = number(scenario?.monthlyExpenseChange);
    const plannedExtraDebt = money(Math.max(0, number(extraDebtPayment)) + Math.max(0, number(scenario?.extraDebtPayment)));
    const startingCash = money((accounts || [])
        .filter((account) => account.isActive !== false)
        .reduce((sum, account) => sum + number(account.balance), 0));
    let runningCash = startingCash;
    const rows = [];

    for (let offset = 0; offset < count; offset += 1) {
        const date = monthDate(startDate, offset);
        const income = money(baseIncome + scenarioIncome);
        const billsTotal = getBillExpenses(bills, date);
        const debtPayments = money(minimumDebtPayments + plannedExtraDebt);
        const expenses = money(billsTotal + debtPayments + scenarioExpense);
        const net = money(income - expenses);
        runningCash = money(runningCash + net);
        rows.push({
            month: monthKey(date),
            date: date.toISOString().slice(0, 10),
            income,
            bills: billsTotal,
            debtPayments,
            otherScenarioExpenses: money(scenarioExpense),
            expenses,
            net,
            endingCash: runningCash
        });
    }

    return {
        months: rows,
        startingCash,
        baseMonthlyIncome: baseIncome,
        monthlyDebtMinimums: minimumDebtPayments,
        plannedExtraDebt,
        totalNet: money(rows.reduce((sum, row) => sum + row.net, 0)),
        lowestEndingCash: rows.length ? Math.min(...rows.map((row) => row.endingCash)) : startingCash,
        hasShortfall: rows.some((row) => row.endingCash < 0)
    };
}
