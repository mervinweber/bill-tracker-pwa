export const calculateNextDueDate = (currentDate, recurrence) => {
    const nextDate = new Date(currentDate);

    switch (recurrence) {
        case 'Weekly':
            nextDate.setDate(nextDate.getDate() + 7);
            break;
        case 'Bi-weekly':
            nextDate.setDate(nextDate.getDate() + 14);
            break;
        case 'Monthly':
            nextDate.setMonth(nextDate.getMonth() + 1);
            break;
        case 'Yearly':
            nextDate.setFullYear(nextDate.getFullYear() + 1);
            break;
        default: // 'One-time'
            return null;
    }

    return nextDate;
};

export const generateRecurringBillInstances = (baseBill, bills, payCheckDates) => {
    // Only generate for recurring bills
    if (baseBill.recurrence === 'One-time') {
        return [];
    }

    const generatedBills = [];
    let currentDueDate = new Date(baseBill.dueDate);

    // Generate bills for each pay period
    for (let i = 0; i < payCheckDates.length; i++) {
        const payPeriodStart = payCheckDates[i];
        const payPeriodEnd = i < payCheckDates.length - 1 ?
            payCheckDates[i + 1] :
            new Date(payCheckDates[i].getTime() + (14 * 24 * 60 * 60 * 1000)); // 14 days after last

        // Check if we need to generate bills for this period
        while (currentDueDate < payPeriodEnd) {
            // Only add if it hasn't been added yet and falls within pay period
            if (currentDueDate >= payPeriodStart && currentDueDate < payPeriodEnd) {
                const dueDateStr = currentDueDate.toISOString().split('T')[0];
                const existingBill = bills.find(b =>
                    b.name === baseBill.name &&
                    b.category === baseBill.category &&
                    b.dueDate === dueDateStr &&
                    b.recurrence === baseBill.recurrence
                );

                if (!existingBill) {
                    // Check for unpaid previous instance to accumulate balance
                    const previousBill = bills.find(b =>
                        b.name === baseBill.name &&
                        b.category === baseBill.category &&
                        !b.isPaid &&
                        new Date(b.dueDate) < currentDueDate
                    );

                    const accumulatedBalance = previousBill ?
                        (previousBill.balance || previousBill.amountDue || 0) :
                        (baseBill.balance || baseBill.amountDue || 0);

                    const newBill = {
                        ...baseBill,
                        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
                        dueDate: dueDateStr,
                        isPaid: false,
                        lastPaymentDate: null,
                        balance: accumulatedBalance,
                        paymentHistory: [] // Initialize empty history
                    };
                    generatedBills.push(newBill);
                }
            }

            // Calculate next occurrence
            const nextDate = calculateNextDueDate(currentDueDate, baseBill.recurrence);
            if (!nextDate || nextDate.getFullYear() > 2027) break; // Safety limit
            currentDueDate = nextDate;
        }
    }

    return generatedBills;
};

export const getTotalPaid = (bill) => {
    if (!bill.paymentHistory) return 0;
    return bill.paymentHistory.reduce((sum, p) => sum + (p.amount || 0), 0);
};

export const getRemainingBalance = (bill) => {
    const totalDue = bill.balance || bill.amountDue || 0;
    const totalPaid = getTotalPaid(bill);
    return Math.max(0, totalDue - totalPaid);
};