export const FINANCIAL_PLAN_SCHEMA_VERSION = 1;

const asArray = (value) => Array.isArray(value) ? value : [];
const asNumber = (value, fallback = 0) => {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : fallback;
};

export function createEmptyFinancialPlan() {
    return {
        schemaVersion: FINANCIAL_PLAN_SCHEMA_VERSION,
        debts: [],
        accounts: [],
        incomeSources: [],
        budgetCategories: [],
        cashFlowScenarios: [],
        settings: {
            strategy: 'snowball',
            extraPayment: 0,
            forecastMonths: 6,
            activeScenarioId: null,
            activeView: 'debt'
        },
        updatedAt: null
    };
}

export function normalizeDebt(debt = {}) {
    return {
        id: String(debt.id || crypto.randomUUID()),
        name: String(debt.name || 'Untitled debt').trim(),
        balance: Math.max(0, asNumber(debt.balance)),
        apr: Math.max(0, asNumber(debt.apr)),
        minimumPayment: Math.max(0, asNumber(debt.minimumPayment)),
        dueDay: Math.min(31, Math.max(1, Math.trunc(asNumber(debt.dueDay, 1)))),
        linkedBillId: debt.linkedBillId ? String(debt.linkedBillId) : null,
        source: debt.source === 'bill' ? 'bill' : 'manual',
        isActive: debt.isActive !== false,
        createdAt: debt.createdAt || new Date().toISOString(),
        updatedAt: debt.updatedAt || new Date().toISOString()
    };
}

export function normalizeIncomeSource(source = {}) {
    const frequencies = ['weekly', 'biweekly', 'semimonthly', 'monthly', 'annual'];
    return {
        id: String(source.id || crypto.randomUUID()),
        name: String(source.name || 'Income').trim(),
        amount: Math.max(0, asNumber(source.amount)),
        frequency: frequencies.includes(source.frequency) ? source.frequency : 'monthly',
        nextDate: typeof source.nextDate === 'string' ? source.nextDate : '',
        isActive: source.isActive !== false
    };
}

export function normalizeFinancialPlan(value) {
    const defaults = createEmptyFinancialPlan();
    if (!value || typeof value !== 'object') return defaults;

    const settings = value.settings && typeof value.settings === 'object' ? value.settings : {};
    return {
        schemaVersion: FINANCIAL_PLAN_SCHEMA_VERSION,
        debts: asArray(value.debts).map(normalizeDebt),
        accounts: asArray(value.accounts),
        incomeSources: asArray(value.incomeSources).map(normalizeIncomeSource),
        budgetCategories: asArray(value.budgetCategories),
        cashFlowScenarios: asArray(value.cashFlowScenarios),
        settings: {
            strategy: settings.strategy === 'avalanche' ? 'avalanche' : 'snowball',
            extraPayment: Math.max(0, asNumber(settings.extraPayment)),
            forecastMonths: Math.min(24, Math.max(1, Math.trunc(asNumber(settings.forecastMonths, 6)))),
            activeScenarioId: settings.activeScenarioId ? String(settings.activeScenarioId) : null,
            activeView: settings.activeView === 'cashflow' ? 'cashflow' : 'debt'
        },
        updatedAt: typeof value.updatedAt === 'string' ? value.updatedAt : null
    };
}
