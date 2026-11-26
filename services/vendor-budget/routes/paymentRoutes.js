const express = require('express');
const router = express.Router();
const controller = require('../controllers/paymentController');

router.get('/', controller.getPayments);
router.get('/:id', controller.getPaymentById);
router.post('/', controller.schedulePayment);
router.patch('/:id/status', controller.updatePaymentStatus);

module.exports = router;