const { readDB, writeDB } = require('../data/store');

function getBudgetSummary(weddingId) {
    const db = readDB();

    const budget = db.budgets.find(
        b => b.wedding_id === weddingId
    );

    const vendors = db.vendors.filter(
        v => v.wedding_id === weddingId
    );

    const vendorIds = vendors.map(
        v => v.vendor_id
    );

    const payments = db.payments.filter(
        p => vendorIds.includes(p.vendor_id)
    );

    const totalAmount = budget ? budget.total_amount : 0;

    const committedAmount = vendors.reduce(
        (sum, vendor) => sum + vendor.contract_total,
        0
    );

    const paidAmount = payments
        .filter(payment =>
            payment.payment_status === 'Paid' ||
            payment.payment_status === 'Confirmed'
        )
        .reduce(
            (sum, payment) => sum + payment.payment_amount,
            0
        );

    const remainingAmount = totalAmount - committedAmount;

    const usagePercentage = totalAmount > 0
        ? (committedAmount / totalAmount) * 100
        : 0;

    return {
        total_amount: totalAmount,
        committed_amount: committedAmount,
        paid_amount: paidAmount,
        remaining_amount: remainingAmount,
        usage_percentage: usagePercentage,
        budget_warning: usagePercentage >= 80
    };
}

function getBudget(weddingId) {
    const db = readDB();

    return db.budgets.find(
        b => b.wedding_id === weddingId
    ) || null;
}

function setBudget(weddingId, totalAmount) {
    if (
        typeof totalAmount !== 'number' ||
        !Number.isFinite(totalAmount) ||
        totalAmount <= 0
    ) {
        throw Object.assign(
            new Error('Enter a valid budget amount.'),
            { status: 400 }
        );
    }

    const db = readDB();

    const committedAmount = db.vendors
        .filter(v => v.wedding_id === weddingId)
        .reduce(
            (sum, vendor) => sum + vendor.contract_total,
            0
        );

    if (
        Math.round(totalAmount * 100) <
        Math.round(committedAmount * 100)
    ) {
        throw Object.assign(
            new Error(
                'Budget cannot be less than committed contracts.'
            ),
            { status: 409 }
        );
    }

    let budget = db.budgets.find(
        b => b.wedding_id === weddingId
    );

    if (budget) {
        budget.total_amount = totalAmount;
    } else {
        budget = {
            budget_id: db.nextBudgetId++,
            wedding_id: weddingId,
            total_amount: totalAmount
        };

        db.budgets.push(budget);
    }

    writeDB(db);

    return budget;
}

module.exports = {
    getBudget,
    setBudget,
    getBudgetSummary
};