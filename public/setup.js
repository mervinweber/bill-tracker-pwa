/**
 * Setup page script — must be an external file so it passes
 * the Content-Security-Policy (script-src 'self') applied by Vercel.
 * Inline <script> blocks are blocked by that policy.
 */

// Set today's date as the default using a local-timezone-safe string,
// not `valueAsDate = new Date()` which uses UTC and shows yesterday's date
// for users in timezones west of UTC.
(function setDefaultDate() {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const dateInput = document.getElementById('setupStartDate');
    if (dateInput) {
        dateInput.value = `${yyyy}-${mm}-${dd}`;
    }
})();

document.getElementById('setupForm').addEventListener('submit', function (e) {
    e.preventDefault();

    const startDate = document.getElementById('setupStartDate').value;
    const frequency = document.getElementById('setupFrequency').value;
    const weeks = document.getElementById('setupWeeks').value;

    if (!startDate) {
        alert('Please select a paycheck date before continuing.');
        return;
    }

    const amountEl = document.getElementById('setupAmount');
    const amountInput = amountEl ? amountEl.value : '';
    const parsedAmount = amountInput !== '' ? parseFloat(amountInput) : null;

    if (amountInput !== '' && (!Number.isFinite(parsedAmount) || parsedAmount < 0)) {
        alert('Please enter a valid paycheck amount (0 or greater).');
        return;
    }

    var settings = {
        startDate: startDate,
        frequency: frequency,
        payPeriodsToShow: parseInt(weeks, 10)
    };

    if (parsedAmount !== null) {
        settings.amount = parsedAmount;
    }

    try {
        localStorage.setItem('paymentSettings', JSON.stringify(settings));
    } catch (err) {
        alert('Unable to save settings. Your browser may be blocking storage in private mode. Try allowing storage for this site or use a regular (non-private) window.');
        return;
    }

    window.location.href = 'index.html';
});
