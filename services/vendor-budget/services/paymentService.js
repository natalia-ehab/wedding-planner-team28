const pool = require('../db');

// Format PostgreSQL payment values
function formatPayment(payment) {
    return {
        ...payment,
        payment_amount: Number(payment.payment_amount)
    };
}

// Get all payments for a wedding
async function getPayments(weddingId) {
    const result = await pool.query(
        `SELECT
            p.payment_id,
            p.vendor_id,
            p.payment_amount,
            p.payment_due_date::text AS payment_due_date,
            p.payment_status
         FROM payment p
         JOIN vendor v
            ON p.vendor_id = v.vendor_id
         WHERE v.wedding_id = $1
         ORDER BY p.payment_id`,
        [weddingId]
    );

    return result.rows.map(formatPayment);
}

// Get a specific payment
async function getPaymentById(weddingId, paymentId) {
    const result = await pool.query(
        `SELECT
            p.payment_id,
            p.vendor_id,
            p.payment_amount,
            p.payment_due_date::text AS payment_due_date,
            p.payment_status
         FROM payment p
         JOIN vendor v
            ON p.vendor_id = v.vendor_id
         WHERE v.wedding_id = $1
         AND p.payment_id = $2`,
        [weddingId, paymentId]
    );

    if (result.rows.length === 0) {
        throw Object.assign(
            new Error('Payment not found.'),
            { status: 404 }
        );
    }

    return formatPayment(result.rows[0]);
}

// Lock wedding during payment operations
async function lockWedding(client, weddingId) {
    const result = await client.query(
        `SELECT wedding_id
         FROM wedding
         WHERE wedding_id = $1
         FOR UPDATE`,
        [weddingId]
    );

    if (result.rows.length === 0) {
        throw Object.assign(
            new Error('Wedding not found.'),
            { status: 404 }
        );
    }
}

// Schedule a new payment
async function schedulePayment(weddingId, data) {
    if (
        !data ||
        !Number.isInteger(data.vendor_id) ||
        data.vendor_id <= 0
    ) {
        throw Object.assign(
            new Error('Invalid vendor ID.'),
            { status: 400 }
        );
    }

    const amount = data.payment_amount;

    if (
        typeof amount !== 'number' ||
        !Number.isFinite(amount) ||
        amount <= 0 ||
        amount > 9999999999.99 ||
        Math.abs(
            amount * 100 -
            Math.round(amount * 100)
        ) > 0.0001
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
        dueDate.startsWith('0000') ||
        !Number.isFinite(Date.parse(dueDate)) ||
        new Date(dueDate).toISOString().slice(0, 10) !== dueDate
    ) {
        throw Object.assign(
            new Error('Enter a valid due date.'),
            { status: 400 }
        );
    }

    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        await lockWedding(client, weddingId);

        // Find and lock the vendor
        const vendorResult = await client.query(
            `SELECT *
             FROM vendor
             WHERE vendor_id = $1
             AND wedding_id = $2
             FOR UPDATE`,
            [data.vendor_id, weddingId]
        );

        if (vendorResult.rows.length === 0) {
            throw Object.assign(
                new Error('Vendor not found.'),
                { status: 404 }
            );
        }

        const vendor = vendorResult.rows[0];

        // Calculate existing scheduled payments
        const paymentResult = await client.query(
            `SELECT COALESCE(
                SUM(payment_amount), 0
             ) AS scheduled_amount
             FROM payment
             WHERE vendor_id = $1`,
            [vendor.vendor_id]
        );

        const scheduledCents = Math.round(
            Number(
                paymentResult.rows[0].scheduled_amount
            ) * 100
        );

        const amountCents = Math.round(amount * 100);

        const contractCents = Math.round(
            Number(vendor.contract_total) * 100
        );

        // Prevent exceeding the vendor contract
        if (
            scheduledCents + amountCents >
            contractCents
        ) {
            throw Object.assign(
                new Error(
                    'Total payments cannot exceed the vendor contract amount.'
                ),
                { status: 409 }
            );
        }

        // Automatically determine initial status
        const today = new Date()
            .toISOString()
            .slice(0, 10);

        const status =
            dueDate < today ? 'Overdue' : 'Pending';

        // Insert payment
        const result = await client.query(
            `INSERT INTO payment (
                vendor_id,
                payment_amount,
                payment_due_date,
                payment_status
             )
             VALUES ($1, $2, $3, $4)
             RETURNING
                payment_id,
                vendor_id,
                payment_amount,
                payment_due_date::text AS payment_due_date,
                payment_status`,
            [
                vendor.vendor_id,
                amount,
                dueDate,
                status
            ]
        );

        await client.query('COMMIT');

        return formatPayment(result.rows[0]);

    } catch (error) {
        await client.query('ROLLBACK');
        throw error;

    } finally {
        client.release();
    }
}

// Update payment status
async function updatePaymentStatus(
    weddingId,
    paymentId,
    newStatus
) {
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

    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        await lockWedding(client, weddingId);

        // Find and lock payment
        const paymentResult = await client.query(
            `SELECT p.*
             FROM payment p
             JOIN vendor v
                ON p.vendor_id = v.vendor_id
             WHERE p.payment_id = $1
             AND v.wedding_id = $2
             FOR UPDATE OF p`,
            [paymentId, weddingId]
        );

        if (paymentResult.rows.length === 0) {
            throw Object.assign(
                new Error('Payment not found.'),
                { status: 404 }
            );
        }

        const payment = paymentResult.rows[0];

        // Validate payment lifecycle
        if (
            !allowedTransitions[payment.payment_status]
                .includes(newStatus)
        ) {
            throw Object.assign(
                new Error(
                    'Invalid payment status transition.'
                ),
                { status: 409 }
            );
        }

        const result = await client.query(
            `UPDATE payment
             SET payment_status = $1
             WHERE payment_id = $2
             RETURNING
                payment_id,
                vendor_id,
                payment_amount,
                payment_due_date::text AS payment_due_date,
                payment_status`,
            [newStatus, paymentId]
        );

        await client.query('COMMIT');

        return formatPayment(result.rows[0]);

    } catch (error) {
        await client.query('ROLLBACK');
        throw error;

    } finally {
        client.release();
    }
}

// Automatically detect overdue payments
async function detectOverduePayments() {
    const today = new Date()
        .toISOString()
        .slice(0, 10);

    const result = await pool.query(
        `UPDATE payment
         SET payment_status = 'Overdue'
         WHERE payment_status = 'Pending'
         AND payment_due_date < $1::date`,
        [today]
    );

    return {
        updated_payments: result.rowCount
    };
}

module.exports = {
    getPayments,
    getPaymentById,
    schedulePayment,
    updatePaymentStatus,
    detectOverduePayments
};