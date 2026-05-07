/**
 * Forecasting and Prediction Helpers
 * Provides spending forecasts, trends, and alerts
 */

import logger from './logger.js';

/**
 * Calculate average monthly spending
 * @param {Array} bills - Array of bill objects
 * @param {number} months - Number of months to average (default 3)
 * @returns {number} Average monthly amount
 */
export function calculateAverageMonthlySpending(bills, months = 3) {
    if (!bills || bills.length === 0) return 0;

    const monthlyTotals = {};
    const now = new Date();
    let skippedCount = 0;

    bills.forEach(bill => {
        try {
            const dueDate = new Date(bill.dueDate);
            if (isNaN(dueDate.getTime())) {
                skippedCount++;
                return;
            }

            // Get year-month key
            const year = dueDate.getFullYear();
            const month = dueDate.getMonth();
            const key = `${year}-${month}`;

            const monthsDiff = (now.getFullYear() - year) * 12 + (now.getMonth() - month);
            if (monthsDiff < months) {
                monthlyTotals[key] = (monthlyTotals[key] || 0) + (bill.amountDue || 0);
            }
        } catch (error) {
            skippedCount++;
            logger.warn('Error processing bill in calculateAverageMonthlySpending', {
                billId: bill?.id,
                dueDate: bill?.dueDate,
                errorMessage: error.message
            });
        }
    });

    if (skippedCount > 0) {
        logger.info('Skipped invalid bills in spending calculation', { count: skippedCount });
    }

    const totals = Object.values(monthlyTotals);
    if (totals.length === 0) return 0;
    return totals.reduce((a, b) => a + b, 0) / totals.length;
}

/**
 * Forecast next month spending based on recurring bills
 * @param {Array} bills - Array of bill objects
 * @returns {Object} Forecast data with total, recurring count, and breakdown by category
 */
export function forecastNextMonth(bills) {
    if (!bills || bills.length === 0) return { total: 0, recurringCount: 0, byCategory: {} };

    const forecast = {
        total: 0,
        recurringCount: 0,
        byCategory: {},
        recurringBills: []
    };

    const recurringTypes = ['Weekly', 'Bi-weekly', 'Monthly', 'Quarterly', 'Yearly'];

    bills.forEach(bill => {
        if (recurringTypes.includes(bill.recurrence)) {
            const category = bill.category || 'Uncategorized';
            forecast.byCategory[category] = (forecast.byCategory[category] || 0) + (bill.amountDue || 0);
            forecast.total += bill.amountDue || 0;
            forecast.recurringCount++;
            forecast.recurringBills.push({
                name: bill.name,
                amount: bill.amountDue,
                category: category,
                recurrence: bill.recurrence
            });
        }
    });

    return forecast;
}

/**
 * Identify spending anomalies and alerts
 * @param {Array} bills - Array of bill objects
 * @param {number} threshold - Percentage threshold for alert (default 25%)
 * @returns {Array} Array of alert objects with type and message
 */
export function getSpendingAlerts(bills, threshold = 25) {
    const alerts = [];

    if (!bills || bills.length === 0) return alerts;

    // Calculate average bill amount
    const amounts = bills.map(b => b.amountDue || 0).filter(a => a > 0);
    if (amounts.length === 0) {
        logger.info('No valid bills with amounts for alert calculation');
        return alerts;
    }

    const avgAmount = amounts.reduce((a, b) => a + b, 0) / amounts.length;

    // Find unusually high bills
    bills.forEach(bill => {
        try {
            const amountDue = bill.amountDue || 0;
            const percentAboveAvg = ((amountDue - avgAmount) / avgAmount) * 100;

            if (percentAboveAvg > threshold && amountDue > avgAmount) {
                alerts.push({
                    type: 'high_amount',
                    severity: percentAboveAvg > threshold * 2 ? 'critical' : 'warning',
                    billId: bill.id,
                    message: `"${bill.name}" is ${percentAboveAvg.toFixed(0)}% above average ($${amountDue.toFixed(2)})`,
                    amount: amountDue,
                    average: avgAmount
                });
            }
        } catch (error) {
            logger.warn('Error processing bill in high amount alert', {
                billId: bill?.id,
                errorMessage: error.message
            });
        }
    });

    // Check for overdue bills
    const now = new Date();
    bills.forEach(bill => {
        try {
            const dueDate = new Date(bill.dueDate);
            if (dueDate < now && !bill.isPaid) {
                const dayOverdue = Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
                alerts.push({
                    type: 'overdue',
                    severity: dayOverdue > 7 ? 'critical' : 'warning',
                    billId: bill.id,
                    message: `"${bill.name}" is overdue by ${dayOverdue} days`,
                    daysOverdue: dayOverdue
                });
            }
        } catch (error) {
            logger.warn('Error processing bill in overdue alert', {
                billId: bill?.id,
                dueDate: bill?.dueDate,
                errorMessage: error.message
            });
        }
    });

    // Check for bills due soon
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    bills.forEach(bill => {
        try {
            const dueDate = new Date(bill.dueDate);
            if (dueDate >= now && dueDate <= sevenDaysFromNow && !bill.isPaid) {
                const daysToDue = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                alerts.push({
                    type: 'due_soon',
                    severity: daysToDue <= 3 ? 'warning' : 'info',
                    billId: bill.id,
                    message: `"${bill.name}" is due in ${daysToDue} days (${dueDate.toLocaleDateString()})`,
                    daysToDue: daysToDue,
                    dueDate: dueDate
                });
            }
        } catch (error) {
            logger.warn('Error processing bill in due soon alert', {
                billId: bill?.id,
                dueDate: bill?.dueDate,
                errorMessage: error.message
            });
        }
    });

    // Sort by severity: critical > warning > info, then by date
    const severityMap = { critical: 0, warning: 1, info: 2 };
    return alerts.sort((a, b) => {
        const severityDiff = severityMap[a.severity] - severityMap[b.severity];
        if (severityDiff !== 0) return severityDiff;
        
        // For same severity, sort overdue by days descending, due_soon by days ascending
        if ((a.type === 'overdue' && b.type === 'overdue') || (a.type === 'due_soon' && b.type === 'due_soon')) {
            return a.daysOverdue ? b.daysOverdue - a.daysOverdue : a.daysToDue - b.daysToDue;
        }
        return 0;
    });
}

/**
 * Calculate spending trend direction
 * @param {Array} bills - Array of bill objects
 * @param {number} months - Number of months to calculate (default 3)
 * @returns {Object} Trend analysis with direction, percentage change, and data points
 */
export function calculateTrend(bills, months = 3) {
    if (!bills || bills.length === 0) return { direction: 'flat', percentChange: 0, dataPoints: [] };

    const monthlyTotals = {};
    const now = new Date();
    let skippedCount = 0;

    bills.forEach(bill => {
        try {
            const dueDate = new Date(bill.dueDate);
            if (isNaN(dueDate.getTime())) {
                skippedCount++;
                return;
            }

            const year = dueDate.getFullYear();
            const month = dueDate.getMonth();
            const key = `${year}-${month}`;

            const monthsDiff = (now.getFullYear() - year) * 12 + (now.getMonth() - month);
            if (monthsDiff < months) {
                monthlyTotals[key] = (monthlyTotals[key] || 0) + (bill.amountDue || 0);
            }
        } catch (error) {
            skippedCount++;
            logger.warn('Error processing bill in calculateTrend', {
                billId: bill?.id,
                dueDate: bill?.dueDate,
                errorMessage: error.message
            });
        }
    });

    if (skippedCount > 0) {
        logger.info('Skipped invalid bills in trend calculation', { count: skippedCount });
    }

    const dataPoints = Object.values(monthlyTotals).sort((a, b) => a - b);
    if (dataPoints.length < 2) return { direction: 'flat', percentChange: 0, dataPoints };

    const firstHalf = dataPoints.slice(0, Math.floor(dataPoints.length / 2));
    const secondHalf = dataPoints.slice(Math.floor(dataPoints.length / 2));

    const avgFirst = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
    const avgSecond = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;

    const percentChange = ((avgSecond - avgFirst) / avgFirst) * 100;
    const direction = percentChange > 5 ? 'up' : percentChange < -5 ? 'down' : 'flat';

    return {
        direction,
        percentChange: Math.round(percentChange * 10) / 10,
        dataPoints
    };
}

/**
 * Calculate budget metrics
 * @param {Array} bills - Array of bill objects
 * @param {number} monthlyBudget - Target monthly budget (optional)
 * @returns {Object} Budget metrics including utilization and recommendations
 */
export function calculateBudgetMetrics(bills, monthlyBudget = null) {
    if (!bills || bills.length === 0) {
        return {
            currentMonthSpending: 0,
            percentOfBudget: 0,
            recommendation: 'Start tracking bills to see budget insights'
        };
    }

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    const currentMonthSpending = bills
        .filter(bill => {
            const dueDate = new Date(bill.dueDate);
            return dueDate.getFullYear() === currentYear && dueDate.getMonth() === currentMonth;
        })
        .reduce((sum, bill) => sum + (bill.amountDue || 0), 0);

    const avgMonthly = calculateAverageMonthlySpending(bills, 3);
    
    const metrics = {
        currentMonthSpending,
        averageMonthlySpending: avgMonthly,
        trend: calculateTrend(bills, 3),
        percentOfBudget: monthlyBudget ? Math.round((currentMonthSpending / monthlyBudget) * 100) : 0,
        recommendation: 'Bills on track'
    };

    // Generate recommendations
    if (monthlyBudget && metrics.percentOfBudget > 90) {
        metrics.recommendation = '⚠️ Approaching budget limit';
    } else if (monthlyBudget && metrics.percentOfBudget > 100) {
        metrics.recommendation = '🚨 Over budget';
    } else if (metrics.trend.direction === 'up') {
        metrics.recommendation = '📈 Spending trending upward';
    }

    return metrics;
}

/**
 * Calculate category-level spend trends across recent months.
 * @param {Array} bills - Array of bill objects
 * @param {number} months - Number of months to analyze (default 6)
 * @returns {Object} Category trend summary
 */
export function calculateCategoryTrends(bills, months = 6) {
    if (!bills || bills.length === 0) {
        return {
            categoryTotals: {},
            topCategories: [],
            trendingUp: [],
            trendingDown: []
        };
    }

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    const monthWindow = Math.max(2, months);
    const monthKeys = [];
    for (let i = monthWindow - 1; i >= 0; i--) {
        const d = new Date(currentYear, currentMonth - i, 1);
        monthKeys.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    }

    const categoryBuckets = {};

    bills.forEach((bill) => {
        try {
            const dueDate = new Date(bill.dueDate);
            if (Number.isNaN(dueDate.getTime())) return;

            const monthKey = `${dueDate.getFullYear()}-${String(dueDate.getMonth() + 1).padStart(2, '0')}`;
            if (!monthKeys.includes(monthKey)) return;

            const category = bill.category || 'Uncategorized';
            if (!categoryBuckets[category]) {
                categoryBuckets[category] = {};
                monthKeys.forEach((key) => { categoryBuckets[category][key] = 0; });
            }

            categoryBuckets[category][monthKey] += bill.amountDue || 0;
        } catch {
            // ignore invalid entries
        }
    });

    const categoryTotals = Object.entries(categoryBuckets).reduce((acc, [category, monthsMap]) => {
        acc[category] = Object.values(monthsMap).reduce((sum, value) => sum + value, 0);
        return acc;
    }, {});

    const topCategories = Object.entries(categoryTotals)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([category, total]) => ({
            category,
            total,
            share: Object.keys(categoryTotals).length ? Math.round((total / Object.values(categoryTotals).reduce((a, b) => a + b, 0)) * 100) : 0
        }));

    const splitIndex = Math.floor(monthKeys.length / 2);
    const recentKeys = monthKeys.slice(splitIndex);
    const previousKeys = monthKeys.slice(0, splitIndex);

    const categoryMovement = Object.entries(categoryBuckets).map(([category, monthMap]) => {
        const previousTotal = previousKeys.reduce((sum, key) => sum + (monthMap[key] || 0), 0);
        const recentTotal = recentKeys.reduce((sum, key) => sum + (monthMap[key] || 0), 0);
        const delta = recentTotal - previousTotal;
        const percent = previousTotal > 0 ? (delta / previousTotal) * 100 : (recentTotal > 0 ? 100 : 0);
        return { category, previousTotal, recentTotal, delta, percent };
    }).sort((a, b) => b.delta - a.delta);

    return {
        categoryTotals,
        topCategories,
        trendingUp: categoryMovement.filter((item) => item.delta > 0).slice(0, 3),
        trendingDown: categoryMovement.filter((item) => item.delta < 0).sort((a, b) => a.delta - b.delta).slice(0, 3)
    };
}
