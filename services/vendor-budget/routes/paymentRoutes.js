const express = require('express');
const router = express.Router();

const controller = require('../controllers/paymentController');

// Get all payments
router.get('/', controller.getPayments);

// Get specific payment
router.get('/:id', controller.getPaymentById);

// Schedule payment and automatically create task
router.post('/', controller.schedulePayment);

// Retry payment task creation
router.post('/:id/retry-task', controller.retryPaymentTask);

// Update payment status
router.patch('/:id/status', (req, res, next) => {

    if (req.body?.payment_status === 'Confirmed') {
        return res.status(403).json({
            message: 'Only the assigned vendor can confirm a payment.'
        });
    }

    next();

}, controller.updatePaymentStatus);

module.exports = router;