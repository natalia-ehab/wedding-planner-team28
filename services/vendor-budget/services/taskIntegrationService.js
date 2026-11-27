require('dotenv').config();

async function createPaymentTask(payment, vendor, token) {

    const baseUrl = process.env.TASK_SERVICE_URL;

    if (!baseUrl) {
        throw new Error('TASK_SERVICE_URL is missing.');
    }

    if (!token) {
        throw new Error('Authentication token is required.');
    }

    const url =
        `${baseUrl.replace(/\/$/, '')}/tasks/from-payment`;

    const taskData = {
        payment_id: payment.payment_id,
        wedding_id: vendor.wedding_id,
        payment_due_date: String(
            payment.payment_due_date
        ).slice(0, 10),
        vendor_name: vendor.vendor_name
    };

    const response = await fetch(url, {
        method: 'POST',

        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },

        body: JSON.stringify(taskData),

        signal: AbortSignal.timeout(5000)
    });

    const data = await response.json();

    if (!response.ok) {
        throw new Error(
            data.message ||
            `Task Service returned HTTP ${response.status}`
        );
    }

    return data;
}

module.exports = {
    createPaymentTask
};