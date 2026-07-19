import StorageManager from '../utils/StorageManager.js';
import { STORAGE_KEYS } from '../utils/constants.js';
import {
    createEmptyFinancialPlan,
    normalizeDebt,
    normalizeFinancialPlan,
    normalizeIncomeSource
} from '../utils/financialPlan.js';

export class FinancialPlanStore {
    constructor(storageManager = StorageManager) {
        this.storageManager = storageManager;
        this.listeners = [];
        this.plan = this.load();
    }

    load() {
        return normalizeFinancialPlan(
            this.storageManager.get(STORAGE_KEYS.FINANCIAL_PLAN, createEmptyFinancialPlan())
        );
    }

    getPlan() {
        return this.plan;
    }

    replace(plan, { notify = true } = {}) {
        this.plan = normalizeFinancialPlan(plan);
        this.persist(notify);
        return this.plan;
    }

    updateSettings(changes) {
        return this.replace({
            ...this.plan,
            settings: { ...this.plan.settings, ...changes }
        });
    }

    upsertDebt(debt) {
        const normalized = normalizeDebt(debt);
        const debts = [...this.plan.debts];
        const index = debts.findIndex((item) => item.id === normalized.id);
        if (index >= 0) debts[index] = normalized;
        else debts.push(normalized);
        return this.replace({ ...this.plan, debts });
    }

    removeDebt(id) {
        return this.replace({ ...this.plan, debts: this.plan.debts.filter((debt) => debt.id !== id) });
    }

    upsertIncomeSource(source) {
        const normalized = normalizeIncomeSource(source);
        const incomeSources = [...this.plan.incomeSources];
        const index = incomeSources.findIndex((item) => item.id === normalized.id);
        if (index >= 0) incomeSources[index] = normalized;
        else incomeSources.push(normalized);
        return this.replace({ ...this.plan, incomeSources });
    }

    removeIncomeSource(id) {
        return this.replace({
            ...this.plan,
            incomeSources: this.plan.incomeSources.filter((source) => source.id !== id)
        });
    }

    upsertScenario(scenario) {
        const normalized = {
            id: String(scenario.id || crypto.randomUUID()),
            name: String(scenario.name || 'Scenario').trim(),
            monthlyIncomeChange: Number.parseFloat(scenario.monthlyIncomeChange) || 0,
            monthlyExpenseChange: Number.parseFloat(scenario.monthlyExpenseChange) || 0,
            extraDebtPayment: Math.max(0, Number.parseFloat(scenario.extraDebtPayment) || 0)
        };
        const cashFlowScenarios = [...this.plan.cashFlowScenarios];
        const index = cashFlowScenarios.findIndex((item) => item.id === normalized.id);
        if (index >= 0) cashFlowScenarios[index] = normalized;
        else cashFlowScenarios.push(normalized);
        return this.replace({ ...this.plan, cashFlowScenarios });
    }

    removeScenario(id) {
        const activeScenarioId = this.plan.settings.activeScenarioId === id
            ? null
            : this.plan.settings.activeScenarioId;
        return this.replace({
            ...this.plan,
            cashFlowScenarios: this.plan.cashFlowScenarios.filter((scenario) => scenario.id !== id),
            settings: { ...this.plan.settings, activeScenarioId }
        });
    }

    persist(notify = true) {
        this.plan.updatedAt = new Date().toISOString();
        this.storageManager.set(STORAGE_KEYS.FINANCIAL_PLAN, this.plan);
        if (notify) this.listeners.forEach((listener) => listener(this.plan));
    }

    subscribe(listener) {
        this.listeners.push(listener);
        return () => {
            this.listeners = this.listeners.filter((candidate) => candidate !== listener);
        };
    }
}

export const financialPlanStore = new FinancialPlanStore();
