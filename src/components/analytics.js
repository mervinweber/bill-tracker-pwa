let categoryChart = null;
let trendChart = null;

export function initializeAnalytics() {
    // Optional: Add any initial setup for the analytics view if needed
}

export function renderAnalytics(data) {
    const { bills, isDark } = data;
    const analyticsView = document.getElementById('analyticsView');

    if (!analyticsView) return;

    if (!bills || bills.length === 0) {
        analyticsView.innerHTML = `
            <div class="header-top" style="margin-bottom: 20px;">
                <h2>Spending Analytics</h2>
            </div>
            <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 300px; text-align: center; color: var(--text-secondary);">
                <div style="font-size: 48px; margin-bottom: 20px;">📊</div>
                <h3>No Data Available</h3>
                <p>Add some bills to seeing spending analytics.</p>
            </div>
        `;
        return;
    }

    analyticsView.innerHTML = `
        <div class="header-top" style="margin-bottom: 20px;">
            <h2>Spending Analytics</h2>
        </div>
        <div class="charts-grid">
            <div class="chart-card">
                <h3>Spending by Category</h3>
                <div class="chart-wrapper">
                    <canvas id="categoryChart"></canvas>
                </div>
            </div>
            <div class="chart-card">
                <h3>Monthly Trend</h3>
                <div class="chart-wrapper">
                    <canvas id="trendChart"></canvas>
                </div>
            </div>
        </div>
    `;

    // Prepare Data for Category Chart
    const categoryTotals = {};
    bills.forEach(bill => {
        if (!categoryTotals[bill.category]) categoryTotals[bill.category] = 0;
        categoryTotals[bill.category] += (bill.amountDue || 0);
    });

    const catLabels = Object.keys(categoryTotals);
    const catData = Object.values(categoryTotals);
    const backgroundColors = catLabels.map((_, i) => {
        const colors = ['#2c5aa0', '#5eb3d6', '#f5a623', '#27ae60', '#d97f7f', '#7b68ee'];
        return colors[i % colors.length];
    });

    // Prepare Data for Trend Chart (Last 6 Months)
    const trendData = {};
    const today = new Date();
    for (let i = 5; i >= 0; i--) {
        const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
        const monthKey = d.toLocaleString('default', { month: 'short' });
        trendData[monthKey] = 0;
    }

    bills.forEach(bill => {
        const d = new Date(bill.dueDate);
        const diffMonths = (today.getFullYear() - d.getFullYear()) * 12 + (today.getMonth() - d.getMonth());
        if (diffMonths >= 0 && diffMonths < 6) {
            const monthKey = d.toLocaleString('default', { month: 'short' });
            if (trendData[monthKey] !== undefined) trendData[monthKey] += (bill.amountDue || 0);
        }
    });

    const trendLabels = Object.keys(trendData);
    const trendValues = Object.values(trendData);

    // Destroy existing charts if any
    if (categoryChart) categoryChart.destroy();
    if (trendChart) trendChart.destroy();

    // Draw Category Chart
    const ctxCat = document.getElementById('categoryChart').getContext('2d');
    categoryChart = new Chart(ctxCat, {
        type: 'doughnut',
        data: {
            labels: catLabels,
            datasets: [{
                data: catData,
                backgroundColor: backgroundColors,
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'bottom' }
            }
        }
    });

    // Draw Trend Chart
    const ctxTrend = document.getElementById('trendChart').getContext('2d');
    const textColor = isDark ? '#e0e0e0' : '#333333';
    const gridColor = isDark ? '#333333' : '#d9e3ed';

    trendChart = new Chart(ctxTrend, {
        type: 'bar',
        data: {
            labels: trendLabels,
            datasets: [{
                label: 'Total Amount Due',
                data: trendValues,
                backgroundColor: '#5eb3d6',
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    grid: { color: gridColor },
                    ticks: { color: textColor }
                },
                x: {
                    grid: { display: false },
                    ticks: { color: textColor }
                }
            },
            plugins: {
                legend: { display: false }
            }
        }
    });
}
