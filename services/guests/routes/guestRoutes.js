
const express = require('express');

const guestController = require('../controllers/guestController');

const router = express.Router();

// Get all guests for a wedding
router.get('/', guestController.listGuests);

// Search guests by name or email
router.get('/search', guestController.searchGuests);

// Get one guest by ID
router.get('/:guestId', guestController.getGuestById);

// Create a new guest
router.post('/', guestController.createGuest);

// Update guest information
router.patch('/:guestId', guestController.updateGuest);

// Delete a guest
router.delete('/:guestId', guestController.deleteGuest);

// Submit RSVP using invitation token
router.patch('/invitations/:token', guestController.submitRSVP);

module.exports = router;
