const pool = require('../db');
const { sendEmail } = require('../services/emailService');

async function processOverduePayments() {

    // Step 1: Update overdue payments
    const result = await pool.query(`
        UPDATE payment
        SET payment_status = 'Overdue'
        WHERE payment_status = 'Pending'
        AND payment_due_date < CURRENT_DATE
        RETURNING
            payment_id,
            vendor_id,
            payment_amount,
            payment_due_date,
            payment_status;
    `);

    console.log(
        `Updated ${result.rowCount} overdue payments.`
    );

    // Step 2: Find payments requiring reminders
    const reminders = await pool.query(`
        SELECT
            p.payment_id,
            p.payment_amount,
            p.payment_due_date::text,
            v.vendor_name,
            v.vendor_email
        FROM payment p
        JOIN vendor v
            ON p.vendor_id = v.vendor_id
        WHERE p.payment_status = 'Overdue'
        AND p.reminder_sent_at IS NULL;
    `);

    let emailsSent = 0;
    let emailsFailed = 0;

    // Step 3: Send reminder emails
    for (const payment of reminders.rows) {

        const client = await pool.connect();

        try {
            await client.query('BEGIN');

            const check = await client.query(`
                SELECT payment_id
                FROM payment
                WHERE payment_id = $1
                AND payment_status = 'Overdue'
                AND reminder_sent_at IS NULL
                FOR UPDATE SKIP LOCKED;
            `, [payment.payment_id]);

            if (check.rowCount === 0) {
                await client.query('ROLLBACK');
                continue;
            }

            const recipient =
                process.env.EMAIL_TEST_TO ||
                payment.vendor_email;

            const subject =
                'Wedding Planner - Overdue Payment Reminder';

            const message = `
Dear ${payment.vendor_name},

This is a reminder regarding an overdue scheduled payment.

Payment ID: ${payment.payment_id}
Amount: ${payment.payment_amount} EGP
Due Date: ${payment.payment_due_date}
Status: Overdue

Please review the payment status through the
Wedding Planner system.

Best regards,
Wedding Planner Team
            `;

            await sendEmail(
                recipient,
                subject,
                message,
                `payment-overdue-${payment.payment_id}`
            );

            // Step 4: Record successful email request
            await client.query(`
                UPDATE payment
                SET reminder_sent_at = CURRENT_TIMESTAMP
                WHERE payment_id = $1;
            `, [payment.payment_id]);

            await client.query('COMMIT');

            emailsSent++;

            console.log(
                `Reminder sent for payment ${payment.payment_id}`
            );

        } catch (error) {

            await client.query('ROLLBACK');

            emailsFailed++;

            console.error(
                `Reminder failed for payment ${payment.payment_id}:`,
                error.message
            );

        } finally {
            client.release();
        }
    }

    return {
        updated_count: result.rowCount,
        emails_sent: emailsSent,
        emails_failed: emailsFailed,
        payments: result.rows
    };
}

exports.handler = async () => {
    try {
        return await processOverduePayments();
    } catch (error) {
        console.error(
            'Payment reminder job failed:',
            error
        );

        throw error;
    }
};

module.exports.processOverduePayments =
    processOverduePayments;