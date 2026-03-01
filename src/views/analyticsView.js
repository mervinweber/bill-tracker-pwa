/**
 * Analytics View Module
 * Handles analytics rendering with Chart.js
 */

import { billStore } from '../store/BillStore.js';
import { appState } from '../store/appState.js';
import logger from '../utils/logger.js';
import {
    calculateAverageMonthlySpending,
    forecastNextMonth,
    getSpendingAlerts,
    calculateTrend,
    calculateBudgetMetrics
} from '../utils/forecastingHelpers.js';

let categoryChart = null;
let trendChart = null;

/**
 * Render analytics view with charts
 */
export function renderAnalytics({ bills: providedBills, viewMode, selectedPaycheck, payCheckDates } = {}) {
    try {
        const analyticsView = document.getElementById('analyticsView');

        if (!analyticsView) {
            throw new Error('Analytics view container not found in DOM');
        }

        let currentBills = providedBills || billStore.getAll();
        let viewTitle = 'Spending Analytics (All Time)';

        // Apply pay period filtering if in filtered mode
        if (viewMode === 'filtered' && selectedPaycheck !== null && payCheckDates) {
            const startDate = payCheckDates[selectedPaycheck];
            const endDate = selectedPaycheck < payCheckDates.length - 1
                ? payCheckDates[selectedPaycheck + 1]
                : new Date(startDate.getTime() + 14 * 24 * 60 * 60 * 1000);

            currentBills = currentBills.filter(bill => {
                const billDate = new Date(bill.dueDate);
                return billDate >= startDate && billDate < endDate;
            });

            const dateLabel = startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            viewTitle = `Spending Analytics (Period: ${dateLabel})`;
        }

        if (!currentBills || currentBills.length === 0) {
            analyticsView.innerHTML = `
                <div class="header-top" style="margin-bottom: 20px;">
                    <h2 style="color: var(--primary-color);">📊 ${viewTitle}</h2>
                </div>
                <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 300px; text-align: center; color: var(--text-secondary);">
                    <div style="font-size: 48px; margin-bottom: 20px;">📊</div>
                    <h3>No Data for this Period</h3>
                    <p>Add some bills in this date range to see analytics.</p>
                </div>
            `;
            return;
        }

        // Calculate Summary
        const totalDue = currentBills.reduce((acc, bill) => acc + (bill.amountDue || 0), 0);
        const totalPaid = currentBills.reduce((acc, bill) => {
            const billPaid = (bill.paymentHistory || []).reduce((pAcc, p) => pAcc + (p.amount || 0), 0);
            return acc + billPaid;
        }, 0);
        const remaining = totalDue - totalPaid;

        // Calculate advanced metrics
        const forecast = forecastNextMonth(currentBills);
        const trend = calculateTrend(currentBills, 3);
        const avgMonthly = calculateAverageMonthlySpending(currentBills, 3);
        const alerts = getSpendingAlerts(currentBills, 25);

        analyticsView.innerHTML = `
            <div class="header-top" style="margin-bottom: 20px;">
                <h2 style="color: var(--primary-color);">📊 ${viewTitle}</h2>
            </div>
            
            <!-- Spending Alerts Section -->
            ${alerts.length > 0 ? `
                <div class="alerts-section" style="margin-bottom: 20px; padding: 15px; border-radius: 8px; background: rgba(255,107,107,0.1); border-left: 4px solid var(--danger-color);">
                    <h3 style="margin-top: 0; color: var(--danger-color);">⚠️ Spending Alerts (${alerts.length})</h3>
                    ${alerts.map(alert => `
                        <div style="padding: 8px 0; border-bottom: 1px solid rgba(0,0,0,0.1); display: flex; justify-content: space-between; align-items: center;">
                            <div>
                                <div style="font-weight: 500; color: var(--text-primary);">${alert.message}</div>
                                <small style="color: var(--text-secondary);">${new Date().toLocaleString()}</small>
                            </div>
                            <span style="padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: bold; ${
                                alert.severity === 'critical' ? 'background: var(--danger-color); color: white' :
                                alert.severity === 'warning' ? 'background: #f5a623; color: white' :
                                'background: #5eb3d6; color: white'
                            };">${alert.severity.toUpperCase()}</span>
                        </div>
                    `).join('')}
                </div>
            ` : ''}
            
            <div class="dashboard" style="margin-bottom: 30px; display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px;">
                <div class="dashboard-card">
                    <div class="card-icon">💸</div>
                    <div class="card-content">
                        <div class="card-label">Total Volume</div>
                        <div class="card-value">$${totalDue.toFixed(2)}</div>
                    </div>
                </div>
                <div class="dashboard-card">
                    <div class="card-icon">✅</div>
                    <div class="card-content">
                        <div class="card-label">Total Paid</div>
                        <div class="card-value" style="color: var(--success-color)">$${totalPaid.toFixed(2)}</div>
                    </div>
                </div>
                <div class="dashboard-card ${remaining > 0 ? 'overdue' : ''}">
                    <div class="card-icon">⏳</div>
                    <div class="card-content">
                        <div class="card-label">Remaining</div>
                        <div class="card-value">$${remaining.toFixed(2)}</div>
                    </div>
                </div>
                <div class="dashboard-card">
                    <div class="card-icon">📈</div>
                    <div class="card-content">
                        <div class="card-label">Monthly Avg</div>
                        <div class="card-value">$${avgMonthly.toFixed(2)}</div>
                    </div>
                </div>
                <div class="dashboard-card">
                    <div class="card-icon">${trend.direction === 'up' ? '📊' : trend.direction === 'down' ? '📉' : '➡️'}</div>
                    <div class="card-content">
                        <div class="card-label">3-Month Trend</div>
                        <div class="card-value" style="color: ${trend.direction === 'up' ? '#d97f7f' : trend.direction === 'down' ? '#27ae60' : '#f5a623'};">${trend.direction === 'up' ? '↑' : trend.direction === 'down' ? '↓' : '→'} ${Math.abs(trend.percentChange)}%</div>
                    </div>
                </div>
                <div class="dashboard-card">
                    <div class="card-icon">🔮</div>
                    <div class="card-content">
                        <div class="card-label">Next Month Forecast</div>
                        <div class="card-value">$${forecast.total.toFixed(2)}</div>
                        <small style="color: var(--text-secondary);">${forecast.recurringCount} recurring</small>
                    </div>
                </div>
            </div>

            <!-- Forecast Details -->
            ${forecast.total > 0 ? `
                <div style="margin-bottom: 30px; padding: 15px; background: rgba(94,179,214,0.1); border-radius: 8px;">
                    <h3 style="margin-top: 0; color: var(--primary-color);">📅 Next Month Forecast</h3>
                    <p style="color: var(--text-secondary); margin: 10px 0;">Projected recurring bills: <strong style="color: var(--primary-color);">$${forecast.total.toFixed(2)}</strong></p>
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 10px;">
                        ${Object.entries(forecast.byCategory).map(([cat, amount]) => `
                            <div style="padding: 10px; background: white; border-radius: 4px; border-left: 3px solid var(--primary-color);">
                                <div style="font-size: 12px; color: var(--text-secondary);">${cat}</div>
                                <div style="font-weight: bold; color: var(--primary-color);">$${amount.toFixed(2)}</div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            ` : ''}

            <div class="charts-grid">
                <div class="chart-card">
                    <h3>Spending by Category</h3>
                    <div class="chart-wrapper">
                        <canvas id="categoryChart"></canvas>
                    </div>
                </div>
                <div class="chart-card">
                    <h3>Monthly Trend (Last 6 Months)</h3>
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

        // Use app colors for consistency
        const backgroundColors = [
            '#2c5aa0', // Primary
            '#5eb3d6', // Accent
            '#27ae60', // Success
            '#f5a623', // Warning
            '#d97f7f', // Danger
            '#7b68ee', // Purple (Regen)
            '#4a8dd9',
            '#82c4e0'
        ];

        // Destroy existing charts if any
        if (categoryChart) {
            categoryChart.destroy();
            categoryChart = null;
        }
        if (trendChart) {
            trendChart.destroy();
            trendChart = null;
        }

        const isDark = document.body.classList.contains('dark-mode');
        const textColor = isDark ? '#e0e0e0' : '#333333';
        const gridColor = isDark ? '#333333' : '#d9e3ed';

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
                            borderColor: isDark ? '#1e1e1e' : '#ffffff',
                            borderWidth: 2
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'bottom',
                            labels: { color: textColor }
                        }
                    }
                }
            });
        }

        // Prepare trend chart data (6 months window around selected period/today)
        const trendData = {};
        const referenceDate = (viewMode === 'filtered' && selectedPaycheck !== null && payCheckDates)
            ? new Date(payCheckDates[selectedPaycheck])
            : new Date();

        // Ensure referenceDate is start of month for consistent lookup
        const refMonth = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), 1);

        for (let i = 4; i >= -1; i--) { // 4 months back, 1 month forward (total 6) from reference
            const d = new Date(refMonth.getFullYear(), refMonth.getMonth() - i, 1);
            const monthKey = d.toLocaleString('default', { month: 'short' });
            trendData[monthKey] = 0;
        }

        // Use ALL bills for trend to show context
        const allBills = providedBills || billStore.getAll();
        allBills.forEach(bill => {
            try {
                const d = new Date(bill.dueDate);
                if (isNaN(d.getTime())) return;

                const billMonth = new Date(d.getFullYear(), d.getMonth(), 1);
                const monthKey = d.toLocaleString('default', { month: 'short' });

                if (trendData[monthKey] !== undefined) {
                    // Check if this specific month/year combination is in our keys
                    // To be safe, let's verify if the diff is within our window
                    const diffMonths = (refMonth.getFullYear() - d.getFullYear()) * 12 + (refMonth.getMonth() - d.getMonth());
                    if (diffMonths >= -1 && diffMonths <= 4) {
                        trendData[monthKey] += bill.amountDue || 0;
                    }
                }
            } catch (error) {
                logger.warn('Error processing bill date', { dueDate: bill.dueDate, error: error.message });
            }
        });

        const trendLabels = Object.keys(trendData);
        const trendValues = Object.values(trendData);

        // Draw Trend Chart
        const ctxTrend = document.getElementById('trendChart');
        if (ctxTrend) {
            trendChart = new Chart(ctxTrend.getContext('2d'), {
                type: 'bar',
                data: {
                    labels: trendLabels,
                    datasets: [
                        {
                            label: 'Total Amount Due',
                            data: trendValues,
                            backgroundColor: '#5eb3d6', // Accent
                            borderRadius: 6,
                            maxBarThickness: 40
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
                            ticks: {
                                color: textColor,
                                callback: (value) => '$' + value
                            }
                        },
                        x: {
                            grid: { display: false },
                            ticks: { color: textColor }
                        }
                    },
                    plugins: {
                        legend: { display: false },
                        tooltip: {
                            callbacks: {
                                label: (context) => `Total: $${context.parsed.y.toFixed(2)}`
                            }
                        }
                    }
                }
            });
        }
    } catch (error) {
        logger.error('Error rendering analytics', error);
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
        logger.error('Error initializing analytics view', error);
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
