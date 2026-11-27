const pool = require('../db');

const paymentService = require('../services/paymentService');
const vendorService = require('../services/vendorService');

const {
    createPaymentTask
} = require('../services/taskIntegrationService');

// Create task for an existing payment
async function syncPaymentTask(req, payment) {

    const vendor = await vendorService.getVendorById(
        req.weddingId,
        payment.vendor_id
    );

    const token = req.headers.authorization.split(' ')[1];

    return createPaymentTask(
        payment,
        vendor,
        token
    );
}

// Get all payments
const getPayments = async (req, res, next) => {
    try {
        const payments = await paymentService.getPayments(
            req.weddingId
        );

        res.json(payments);

    } catch (error) {
        next(error);
    }
};

// Get specific payment
const getPaymentById = async (req, res, next) => {
    try {
        const payment = await paymentService.getPaymentById(
            req.weddingId,
            Number(req.params.id)
        );

        res.json(payment);

    } catch (error) {
        next(error);
    }
};

// Schedule payment and automatically create task
const schedulePayment = async (req, res, next) => {
    try {

        const weddingResult = await pool.query(
            `SELECT wedding_date::text AS wedding_date
             FROM wedding
             WHERE wedding_id = $1`,
            [req.weddingId]
        );

        const weddingDate =
            weddingResult.rows[0]?.wedding_date;

        if (!weddingDate) {
            return res.status(409).json({
                error: 'Wedding date must be configured first.'
            });
        }

        const dueDate = req.body?.payment_due_date;

        if (
            typeof dueDate !== 'string' ||
            !/^\d{4}-\d{2}-\d{2}$/.test(dueDate) ||
            !Number.isFinite(Date.parse(dueDate)) ||
            new Date(dueDate).toISOString().slice(0, 10) !== dueDate
        ) {
            return res.status(400).json({
                error: 'Enter a valid payment due date.'
            });
        }

        if (dueDate > weddingDate) {
            return res.status(400).json({
                error: 'Payment due date cannot exceed the wedding date.'
            });
        }

        // Save payment in Neon
        const payment = await paymentService.schedulePayment(
            req.weddingId,
            req.body
        );

        // Automatically create payment task
        try {

            const taskResult = await syncPaymentTask(
                req,
                payment
            );

            return res.status(201).json({
                ...payment,
                task_created: true,
                task: taskResult.task
            });

        } catch (taskError) {

            console.error(
                'Payment task integration failed:',
                taskError.message
            );

            // Payment is already saved
            return res.status(201).json({
                ...payment,
                task_created: false,
                task_sync_required: true,
                warning: 'Payment saved successfully, but task creation failed.'
            });
        }

    } catch (error) {
        next(error);
    }
};

// Retry task creation without creating another payment
const retryPaymentTask = async (req, res, next) => {

    try {

        const payment = await paymentService.getPaymentById(
            req.weddingId,
            Number(req.params.id)
        );

        try {

            const taskResult = await syncPaymentTask(
                req,
                payment
            );

            return res.status(200).json({
                payment_id: payment.payment_id,
                task_created: true,
                task: taskResult.task
            });

        } catch (taskError) {

            console.error(
                'Payment task retry failed:',
                taskError.message
            );

            return res.status(502).json({
                payment_id: payment.payment_id,
                task_created: false,
                error: 'Unable to synchronize payment task.'
            });
        }

    } catch (error) {
        next(error);
    }
};

// Update payment status
const updatePaymentStatus = async (req, res, next) => {
    try {
        const payment = await paymentService.updatePaymentStatus(
            req.weddingId,
            Number(req.params.id),
            req.body.payment_status
        );

        res.json(payment);

    } catch (error) {
        next(error);
    }
};

module.exports = {
    getPayments,
    getPaymentById,
    schedulePayment,
    retryPaymentTask,
    updatePaymentStatus
};