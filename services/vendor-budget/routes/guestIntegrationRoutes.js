const express = require('express');

const guestIntegrationController =
    require('../controllers/guestIntegrationController');

const router = express.Router();

router.get(
    '/confirmed-count',
    guestIntegrationController.getGuestCount
);

module.exports = router;