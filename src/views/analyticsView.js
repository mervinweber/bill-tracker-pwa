/**
 * Analytics View Module
 * Handles analytics rendering with Chart.js
 */

import { billStore } from '../store/BillStore.js';
import { appState } from '../store/appState.js';

let categoryChart = null;
let trendChart = null;

/**
 * Render analytics view with charts
 */
export function renderAnalytics() {
    try {
        const billGrid = document.getElementById('billGrid');
        const calendarView = document.getElementById('calendarView');
        const analyticsView = document.getElementById('analyticsView');

        if (!analyticsView) {
            throw new Error('Analytics view container not found in DOM');
        }

        billGrid.style.display = 'none';
        calendarView.style.display = 'none';
        analyticsView.style.setProperty('display', 'block', 'important');

        const currentBills = billStore.getAll();

        if (!currentBills || currentBills.length === 0) {
            analyticsView.innerHTML = `
                <div class="header-top" style="margin-bottom: 20px;">
                    <h2>Spending Analytics</h2>
                </div>
                <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 300px; text-align: center; color: var(--text-secondary);">
                    <div style="font-size: 48px; margin-bottom: 20px;">📊</div>
                    <h3>No Data Available</h3>
                    <p>Add some bills to see spending analytics.</p>
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

        // Prepare category chart data
        const categoryTotals = {};
        currentBills.forEach(bill => {
            if (!categoryTotals[bill.category]) {
                categoryTotals[bill.category] = 0;
            }
            categoryTotals[bill.category] += bill.amountDue || 0;
        });

        const catLabels = Object.keys(categoryTotals);
        const catData = Object.values(categoryTotals);
        const backgroundColors = catLabels.map((_, i) => {
            const colors = ['#2c5aa0', '#5eb3d6', '#f5a623', '#27ae60', '#d97f7f', '#7b68ee'];
            return colors[i % colors.length];
        });

        // Prepare trend chart data (last 6 months)
        const trendData = {};
        const today = new Date();
        for (let i = 5; i >= 0; i--) {
            const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
            const monthKey = d.toLocaleString('default', { month: 'short' });
            trendData[monthKey] = 0;
        }

        currentBills.forEach(bill => {
            try {
                const d = new Date(bill.dueDate);
                if (isNaN(d.getTime())) {
                    console.warn(`Invalid date for bill: ${bill.dueDate}`);
                    return;
                }

                const diffMonths =
                    (today.getFullYear() - d.getFullYear()) * 12 + (today.getMonth() - d.getMonth());
                if (diffMonths >= 0 && diffMonths < 6) {
                    const monthKey = d.toLocaleString('default', { month: 'short' });
                    if (trendData[monthKey] !== undefined) {
                        trendData[monthKey] += bill.amountDue || 0;
                    }
                }
            } catch (error) {
                console.warn(`Error processing bill date: ${bill.dueDate}`, error);
            }
        });

        const trendLabels = Object.keys(trendData);
        const trendValues = Object.values(trendData);

        // Destroy existing charts if any
        if (categoryChart) {
            categoryChart.destroy();
            categoryChart = null;
        }
        if (trendChart) {
            trendChart.destroy();
            trendChart = null;
        }

        // Draw Category Chart
        const ctxCat = document.getElementById('categoryChart');
        if (ctxCat) {
            categoryChart = new Chart(ctxCat.getContext('2d'), {
                type: 'doughnut',
                data: {
                    labels: catLabels,
                    datasets: [
                        {
                            data: catData,
                            backgroundColor: backgroundColors,
                            borderWidth: 1
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { position: 'bottom' }
                    }
                }
            });
        }

        // Draw Trend Chart
        const ctxTrend = document.getElementById('trendChart');
        if (ctxTrend) {
            const isDark = document.body.classList.contains('dark-mode');
            const textColor = isDark ? '#e0e0e0' : '#333333';
            const gridColor = isDark ? '#333333' : '#d9e3ed';

            trendChart = new Chart(ctxTrend.getContext('2d'), {
                type: 'bar',
                data: {
                    labels: trendLabels,
                    datasets: [
                        {
                            label: 'Total Amount Due',
                            data: trendValues,
                            backgroundColor: '#5eb3d6',
                            borderRadius: 4
                        }
                    ]
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
    } catch (error) {
        console.error('Error rendering analytics:', error);
        const analyticsView = document.getElementById('analyticsView');
        if (analyticsView) {
            analyticsView.innerHTML = `<div style="padding: 20px; color: var(--danger-color);">Error rendering analytics: ${error.message}</div>`;
        }
    }
}

/**
 * Initialize analytics view DOM
 */
export function initializeAnalyticsView() {
    try {
        const main = document.getElementById('mainContent');
        if (!main) {
            throw new Error('Main content container not found');
        }

        if (!document.getElementById('analyticsView')) {
            const analyticsDiv = document.createElement('div');
            analyticsDiv.id = 'analyticsView';
            analyticsDiv.className = 'analytics-container';
            main.appendChild(analyticsDiv);
        }
    } catch (error) {
        console.error('Error initializing analytics view:', error);
    }
}

/**
 * Cleanup charts on view switch or unmount
 */
export function cleanupCharts() {
    if (categoryChart) {
        categoryChart.destroy();
        categoryChart = null;
    }
    if (trendChart) {
        trendChart.destroy();
        trendChart = null;
    }
}
