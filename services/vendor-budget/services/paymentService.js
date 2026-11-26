const { readDB, writeDB } = require('../data/store');
function getPayments(weddingId) {
    const db = readDB();

    const vendorIds = db.vendors
        .filter(v => v.wedding_id === weddingId)
        .map(v => v.vendor_id);

    return db.payments.filter(
        p => vendorIds.includes(p.vendor_id)
    );
}

function getPaymentById(weddingId, paymentId) {
    const payments = getPayments(weddingId);

    const payment = payments.find(
        p => p.payment_id === paymentId
    );

    if (!payment) {
        throw Object.assign(
            new Error('Payment not found.'),
            { status: 404 }
        );
    }

    return payment;
}

function schedulePayment(weddingId, data) {
    const db = readDB();

    if (!data || !Number.isInteger(data.vendor_id)) {
        throw Object.assign(
            new Error('Invalid vendor ID.'),
            { status: 400 }
        );
    }

    const vendor = db.vendors.find(
        v => v.vendor_id === data.vendor_id &&
             v.wedding_id === weddingId
    );

    if (!vendor) {
        throw Object.assign(
            new Error('Vendor not found.'),
            { status: 404 }
        );
    }

    const amount = data.payment_amount;

    if (
        typeof amount !== 'number' ||
        !Number.isFinite(amount) ||
        amount <= 0 ||
        Math.abs(
            amount * 100 - Math.round(amount * 100)
        ) > 0.000001
    ) {
        throw Object.assign(
            new Error('Enter a valid payment amount.'),
            { status: 400 }
        );
    }

    const dueDate = data.payment_due_date;

    if (
        typeof dueDate !== 'string' ||
        !/^\d{4}-\d{2}-\d{2}$/.test(dueDate) ||
        !Number.isFinite(Date.parse(dueDate)) ||
        new Date(dueDate).toISOString().slice(0, 10) !== dueDate
    ) {
        throw Object.assign(
            new Error('Enter a valid due date.'),
            { status: 400 }
        );
    }

    const scheduledAmount = db.payments
        .filter(p => p.vendor_id === vendor.vendor_id)
        .reduce(
            (sum, p) => sum + Math.round(p.payment_amount * 100),
            0
        );

    if (
        scheduledAmount + Math.round(amount * 100) >
        Math.round(vendor.contract_total * 100)
    ) {
        throw Object.assign(
            new Error(
                'Total payments cannot exceed the vendor contract amount.'
            ),
            { status: 409 }
        );
    }

    const today = new Date().toISOString().slice(0, 10);

    const payment = {
        payment_id: db.nextPaymentId++,
        vendor_id: vendor.vendor_id,
        payment_amount: amount,
        payment_due_date: dueDate,
        payment_status: dueDate < today ? 'Overdue' : 'Pending'
    };

    db.payments.push(payment);

    writeDB(db);

    return payment;
}

function updatePaymentStatus(weddingId, paymentId, newStatus) {
    const db = readDB();

    const vendorIds = db.vendors
        .filter(v => v.wedding_id === weddingId)
        .map(v => v.vendor_id);

    const payment = db.payments.find(
        p => p.payment_id === paymentId &&
             vendorIds.includes(p.vendor_id)
    );

    if (!payment) {
        throw Object.assign(
            new Error('Payment not found.'),
            { status: 404 }
        );
    }

    const allowedStatuses = [
        'Pending',
        'Paid',
        'Confirmed',
        'Overdue'
    ];

    if (!allowedStatuses.includes(newStatus)) {
        throw Object.assign(
            new Error('Invalid payment status.'),
            { status: 400 }
        );
    }

    const allowedTransitions = {
        Pending: ['Paid'],
        Overdue: ['Paid'],
        Paid: ['Confirmed'],
        Confirmed: []
    };

    if (
        !allowedTransitions[payment.payment_status]
            .includes(newStatus)
    ) {
        throw Object.assign(
            new Error('Invalid payment status transition.'),
            { status: 409 }
        );
    }

    payment.payment_status = newStatus;

    writeDB(db);

    return payment;
}

function detectOverduePayments() {
    const db = readDB();

    const today = new Date().toISOString().slice(0, 10);

    let updatedCount = 0;

    db.payments.forEach(payment => {
        if (
            payment.payment_status === 'Pending' &&
            payment.payment_due_date < today
        ) {
            payment.payment_status = 'Overdue';

            updatedCount++;
        }
    });

    if (updatedCount > 0) {
        writeDB(db);
    }

    return {
        updated_payments: updatedCount
    };
}

module.exports = {
    getPayments,
    getPaymentById,
    schedulePayment,
    updatePaymentStatus,
    detectOverduePayments
};