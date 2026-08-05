import { beforeEach, describe, expect, it } from 'vitest';
import { initializeHeader, updateHeaderUI } from '../src/components/header.js';

describe('all bills scope interaction', () => {
    beforeEach(() => {
        globalThis.ResizeObserver = /** @type {typeof ResizeObserver} */ (class {
            constructor(_callback) {}
            observe() {}
            unobserve() {}
            disconnect() {}
        });
        document.body.innerHTML = '<header id="header"></header>';
    });

    it.each(['everything', 'open-only'])('preserves the %s selection through synchronous view updates', (requestedScope) => {
        let savedScope = 'open-through-next-pay-date';
        const rerenderHeaderState = () => {
            updateHeaderUI('all', null, 'list', true, savedScope, 'all', '');
        };

        initializeHeader([], {
            onPaycheckSelect: () => {},
            onFilterChange: () => {},
            onAllBillsScopeChange: (scope) => {
                savedScope = scope;
                rerenderHeaderState();
            },
            onAllBillsSelect: rerenderHeaderState
        });
        rerenderHeaderState();

        const select = /** @type {HTMLSelectElement} */ (document.getElementById('allBillsScopeFilter'));
        select.value = requestedScope;
        select.dispatchEvent(new Event('change', { bubbles: true }));

        expect(savedScope).toBe(requestedScope);
        expect(select.value).toBe(requestedScope);
    });
});
