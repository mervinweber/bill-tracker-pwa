/**
 * Analytics View Module
 * Handles analytics rendering with Chart.js
 */
import Chart from 'chart.js/auto';
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
 * @param {Object} [options]
 * @param {Array} [options.bills]
 * @param {string} [options.viewMode]
 * @param {number|null} [options.selectedPaycheck]
 * @param {Date[]} [options.payCheckDates]
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
                <div class="mb-6">
                    <h2 class="text-xl font-bold tracking-tight text-primary">📊 ${viewTitle}</h2>
                </div>
                <div class="flex flex-col items-center justify-center py-24 text-center border border-dashed rounded-lg bg-card">
                    <div class="text-4xl mb-4 text-muted-foreground/40">📊</div>
                    <h3 class="text-lg font-semibold">No Data for this Period</h3>
                    <p class="text-sm text-muted-foreground">Add some bills in this date range to see analytics.</p>
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
            <div class="mb-8">
                <h2 class="text-2xl font-bold tracking-tight text-foreground">📊 ${viewTitle}</h2>
            </div>
            
            <!-- Spending Alerts Section -->
            ${alerts.length > 0 ? `
                <div class="mb-8 overflow-hidden rounded-lg border border-destructive/20 bg-destructive/5 shadow-sm">
                    <div class="flex items-center gap-2 border-b border-destructive/20 bg-destructive/10 px-4 py-2">
                        <span class="text-sm">⚠️</span>
                        <h3 class="text-sm font-bold text-destructive">Spending Alerts (${alerts.length})</h3>
                    </div>
                    <div class="divide-y divide-destructive/10">
                        ${alerts.map(alert => `
                            <div class="flex items-center justify-between p-4">
                                <div class="space-y-0.5">
                                    <div class="text-sm font-medium text-foreground">${alert.message}</div>
                                    <div class="text-[10px] text-muted-foreground uppercase font-mono">${new Date().toLocaleString()}</div>
                                </div>
                                <span class="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${alert.severity === 'critical' ? 'bg-destructive text-destructive-foreground' :
                alert.severity === 'warning' ? 'bg-amber-500 text-white' :
                    'bg-blue-500 text-white'
            }">${alert.severity}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
            ` : ''}
            
            <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 mb-8">
                <!-- Total Volume -->
                <div class="rounded-xl border bg-card text-card-foreground shadow-sm">
                    <div class="p-6 flex flex-row items-center justify-between space-y-0 pb-2">
                        <h3 class="tracking-tight text-sm font-medium">Total Volume</h3>
                        <span class="text-muted-foreground">💸</span>
                    </div>
                    <div class="p-6 pt-0">
                        <div class="text-2xl font-bold font-mono">$${totalDue.toFixed(2)}</div>
                        <p class="text-xs text-muted-foreground mt-1">Total across all categories</p>
                    </div>
                </div>

                <!-- Total Paid -->
                <div class="rounded-xl border bg-card text-card-foreground shadow-sm">
                    <div class="p-6 flex flex-row items-center justify-between space-y-0 pb-2">
                        <h3 class="tracking-tight text-sm font-medium">Total Paid</h3>
                        <span class="text-muted-foreground text-emerald-500">✅</span>
                    </div>
                    <div class="p-6 pt-0">
                        <div class="text-2xl font-bold font-mono text-emerald-600">$${totalPaid.toFixed(2)}</div>
                        <p class="text-xs text-muted-foreground mt-1">Already settled</p>
                    </div>
                </div>

                <!-- Remaining -->
                <div class="rounded-xl border bg-card text-card-foreground shadow-sm ${remaining > 0 ? 'ring-1 ring-destructive' : ''}">
                    <div class="p-6 flex flex-row items-center justify-between space-y-0 pb-2">
                        <h3 class="tracking-tight text-sm font-medium">Remaining</h3>
                        <span class="text-muted-foreground">⏳</span>
                    </div>
                    <div class="p-6 pt-0">
                        <div class="text-2xl font-bold font-mono ${remaining > 0 ? 'text-destructive' : ''}">$${remaining.toFixed(2)}</div>
                        <p class="text-xs text-muted-foreground mt-1">Still to be paid</p>
                    </div>
                </div>

                <!-- Monthly Avg -->
                <div class="rounded-xl border bg-card text-card-foreground shadow-sm">
                    <div class="p-6 flex flex-row items-center justify-between space-y-0 pb-2">
                        <h3 class="tracking-tight text-sm font-medium">Monthly Avg</h3>
                        <span class="text-muted-foreground">📈</span>
                    </div>
                    <div class="p-6 pt-0">
                        <div class="text-2xl font-bold font-mono">$${avgMonthly.toFixed(2)}</div>
                        <p class="text-xs text-muted-foreground mt-1">Last 3 months</p>
                    </div>
                </div>

                <!-- Trend -->
                <div class="rounded-xl border bg-card text-card-foreground shadow-sm">
                    <div class="p-6 flex flex-row items-center justify-between space-y-0 pb-2">
                        <h3 class="tracking-tight text-sm font-medium">3-Month Trend</h3>
                        <span class="text-muted-foreground">${trend.direction === 'up' ? '📊' : trend.direction === 'down' ? '📉' : '➡️'}</span>
                    </div>
                    <div class="p-6 pt-0">
                        <div class="text-2xl font-bold ${trend.direction === 'up' ? 'text-destructive' : trend.direction === 'down' ? 'text-emerald-600' : 'text-amber-500'}">
                            ${trend.direction === 'up' ? '↑' : trend.direction === 'down' ? '↓' : '→'} ${Math.abs(trend.percentChange)}%
                        </div>
                        <p class="text-xs text-muted-foreground mt-1">Compared to previous periods</p>
                    </div>
                </div>

                <!-- Forecast -->
                <div class="rounded-xl border bg-card text-card-foreground shadow-sm border-primary/20 bg-primary/5">
                    <div class="p-6 flex flex-row items-center justify-between space-y-0 pb-2">
                        <h3 class="tracking-tight text-sm font-medium">Next Month Forecast</h3>
                        <span class="text-muted-foreground text-primary">🔮</span>
                    </div>
                    <div class="p-6 pt-0">
                        <div class="text-2xl font-bold font-mono text-primary">$${forecast.total.toFixed(2)}</div>
                        <p class="text-xs text-secondary-foreground/70 mt-1">${forecast.recurringCount} recurring bills projected</p>
                    </div>
                </div>
            </div>

            <!-- Forecast Details -->
            ${forecast.total > 0 ? `
                <div class="mb-8 rounded-xl border bg-accent/5 p-6 ring-1 ring-inset ring-accent/10">
                    <div class="flex items-center gap-2 mb-4">
                        <span class="text-primary font-bold">📅</span>
                        <h3 class="text-lg font-bold tracking-tight">Projected Recurring Bills</h3>
                    </div>
                    <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        ${Object.entries(forecast.byCategory).map(([cat, amount]) => `
                            <div class="flex flex-col gap-1 p-3 rounded-lg border bg-background/50 border-primary/10">
                                <span class="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">${cat}</span>
                                <span class="text-lg font-mono font-bold text-primary">$${amount.toFixed(2)}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
            ` : ''}

            <div class="grid gap-6 md:grid-cols-2">
                <div class="rounded-xl border bg-card text-card-foreground shadow-sm p-6 overflow-hidden">
                    <h3 class="text-lg font-bold tracking-tight mb-6">Spending by Category</h3>
                    <div class="h-[250px] w-full">
                        <canvas id="categoryChart"></canvas>
                    </div>
                </div>
                <div class="rounded-xl border bg-card text-card-foreground shadow-sm p-6 overflow-hidden">
                    <h3 class="text-lg font-bold tracking-tight mb-6">Monthly Trend (Last 6 Months)</h3>
                    <div class="h-[250px] w-full">
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

        // Modern palette for consistency
        const backgroundColors = [
            'hsl(var(--primary))',
            '#3b82f6', // blue-500
            '#10b981', // emerald-500
            '#f59e0b', // amber-500
            '#ef4444', // red-500
            '#8b5cf6', // violet-500
            '#06b6d4', // cyan-500
            '#ec4899'  // pink-500
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

        const isDark = document.body.classList.contains('dark');
        const textColor = isDark ? '#e2e8f0' : '#475569';
        const gridColor = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)';

        // Draw Category Chart
        const ctxCat = /** @type {HTMLCanvasElement|null} */ (document.getElementById('categoryChart'));
        if (ctxCat) {
            categoryChart = new Chart(ctxCat.getContext('2d'), {
                type: 'doughnut',
                data: {
                    labels: catLabels,
                    datasets: [
                        {
                            data: catData,
                            backgroundColor: backgroundColors,
                            borderColor: isDark ? 'hsl(var(--card))' : '#ffffff',
                            borderWidth: 2,
                            hoverOffset: 15
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    cutout: '65%',
                    plugins: {
                        legend: {
                            position: 'bottom',
                            labels: {
                                color: textColor,
                                usePointStyle: true,
                                padding: 20,
                                font: { size: 11, weight: 500 }
                            }
                        },
                        tooltip: {
                            backgroundColor: isDark ? 'hsl(var(--popover))' : '#ffffff',
                            titleColor: isDark ? '#ffffff' : '#000000',
                            bodyColor: isDark ? '#cbd5e1' : '#475569',
                            borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
                            borderWidth: 1,
                            padding: 12,
                            displayColors: true,
                            boxPadding: 6,
                            callbacks: {
                                label: (context) => ` $${context.parsed.toLocaleString()}`
                            }
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
        const ctxTrend = /** @type {HTMLCanvasElement|null} */ (document.getElementById('trendChart'));
        if (ctxTrend) {
            trendChart = new Chart(ctxTrend.getContext('2d'), {
                type: 'bar',
                data: {
                    labels: trendLabels,
                    datasets: [
                        {
                            label: 'Total Amount Due',
                            data: trendValues,
                            backgroundColor: 'hsl(var(--primary))',
                            borderRadius: 6,
                            maxBarThickness: 45,
                            hoverBackgroundColor: 'hsl(var(--primary) / 0.8)'
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
                            border: { display: false },
                            ticks: {
                                color: textColor,
                                font: { size: 10 },
                                callback: (value) => '$' + value
                            }
                        },
                        x: {
                            grid: { display: false },
                            ticks: { color: textColor, font: { size: 10 } }
                        }
                    },
                    plugins: {
                        legend: { display: false },
                        tooltip: {
                            backgroundColor: isDark ? 'hsl(var(--popover))' : '#ffffff',
                            titleColor: isDark ? '#ffffff' : '#000000',
                            bodyColor: isDark ? '#cbd5e1' : '#475569',
                            borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
                            borderWidth: 1,
                            padding: 12,
                            callbacks: {
                                label: (context) => ` Total: $${context.parsed.y.toFixed(2)}`
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
            analyticsView.innerHTML = `
                <div class="flex flex-col items-center justify-center py-12 text-center rounded-lg border border-destructive/50 bg-destructive/10 text-destructive">
                    <p class="font-bold">Error rendering analytics</p>
                    <p class="text-sm opacity-80">${error.message}</p>
                </div>`;
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
            analyticsDiv.className = 'p-4 sm:p-6 transition-all duration-300';
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
