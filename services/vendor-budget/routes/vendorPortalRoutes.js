const express = require('express');
const router = express.Router();

const controller = require('../controllers/vendorPortalController');

const {
    authenticate,
    authorize
} = require('../middleware/auth');

router.use(authenticate, authorize('vendor'));

router.get('/vendors', controller.getAssignedVendors);

router.get('/payments', controller.getVendorPayments);

router.patch('/payments/:id/confirm', controller.confirmPayment);

router.get('/guests/confirmed-count', controller.getGuestCount);

module.exports = router;