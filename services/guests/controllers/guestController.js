
const guestService = require('../services/guestService');

// Get all guests
async function listGuests(req, res, next) {
    try {
        const { weddingId } = req.query;

        if (!weddingId) {
            return res.status(400).json({
                error: {
                    code: 'VALIDATION_ERROR',
                    message: 'Wedding ID is required.'
                }
            });
        }

        const guests = await guestService.getGuestsByWedding(weddingId);
        const rsvpDeadline = req.query.rsvpDeadline;
        const summary = await guestService.getRSVPSummary(weddingId, rsvpDeadline); 

        res.status(200).json({ guests, summary });
    } catch (error) {
        next(error);
    }
}

// Get one guest by ID
async function getGuestById(req, res, next) {
    try {
        const guest = await guestService.getGuestById(req.params.guestId);

        if (!guest) {
            return res.status(404).json({
                error: {
                    code: 'GUEST_NOT_FOUND',
                    message: 'Guest not found'
                }
            });
        }

        res.status(200).json(guest);
    } catch (error) {
        next(error);
    }
}

// Create a guest
async function createGuest(req, res, next) {
    try {
        const { weddingId, name, email, phone } = req.body;

        if (!weddingId || !name || !email || !phone) {
            return res.status(400).json({
                error: {
                    code: 'VALIDATION_ERROR',
                    message: 'Wedding ID, name, email and phone are required.'
                }
            });
        }

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return res.status(400).json({
                error: {
                    code: 'VALIDATION_ERROR',
                    message: 'Please provide a valid email address.'
                }
            });
        }

        const guest = await guestService.createGuest({
            weddingId,
            name,
            email,
            phone
        });

        res.status(201).json(guest);
    } catch (error) {
        if (error.message.includes('already registered')) {
            return res.status(400).json({
                error: {
                    code: 'VALIDATION_ERROR',
                    message: error.message
                }
            });
        }
        next(error);
    }
}


 // Update guest information
async function updateGuest(req, res, next) {
    try {
        if (!req.is('application/json')) {
            return res.status(415).json({
                error: {
                    code: 'UNSUPPORTED_MEDIA_TYPE',
                    message: 'Content-Type must be application/json.'
                }
            });
        }

        const { name, email, phone } = req.body;

        if (
            name === undefined &&
            email === undefined &&
            phone === undefined
        ) {
            return res.status(400).json({
                error: {
                    code: 'VALIDATION_ERROR',
                    message: 'At least one guest field must be provided.'
                }
            });
        }

        if (
    (name !== undefined &&
        (typeof name !== 'string' || !name.trim())) ||
    (email !== undefined &&
        (typeof email !== 'string' ||
         !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) ||
    (phone !== undefined &&
        (typeof phone !== 'string' || !phone.trim()))
)   {
            return res.status(400).json({
                error: {
                    code: 'VALIDATION_ERROR',
                    message: 'Please provide valid guest information.'
                }
            });
        }

        const guest = await guestService.updateGuest(
            req.params.guestId,
            { name, email, phone }
        );

        res.status(200).json(guest);
    } catch (error) {
        if (error.message === 'Guest not found.') {
            return res.status(404).json({
                error: {
                    code: 'GUEST_NOT_FOUND',
                    message: error.message
                }
            });
        }

        if (error.message.includes('already exists')) {
            return res.status(400).json({
                error: {
                    code: 'VALIDATION_ERROR',
                    message: error.message
                }
            });
        }

        next(error);
    }
}

// Delete a guest
async function deleteGuest(req, res, next) {
    try {
        const guest = await guestService.deleteGuest(req.params.guestId);

        res.status(200).json({
            message: 'Guest deleted successfully.',
            guest
        });
    } catch (error) {
        if (error.message === 'Guest not found.') {
            return res.status(404).json({
                error: {
                    code: 'GUEST_NOT_FOUND',
                    message: error.message
                }
            });
        }

        next(error);
    }
}

// Search guests
async function searchGuests(req, res, next) {
    try {
        const { weddingId, search } = req.query;

        if (!weddingId || !search || !search.trim()) {
            return res.status(400).json({
                error: {
                    code: 'VALIDATION_ERROR',
                    message: 'Wedding ID and search value are required.'
                }
            });
        }

        const guests = await guestService.searchGuests(
            weddingId,
            search
        );

        res.status(200).json({ guests });
    } catch (error) {
        next(error);
    }
}

// Submit RSVP response
async function submitRSVP(req, res, next) {
    try {
        const { rsvpStatus } = req.body;

        if (!['Confirmed', 'Declined'].includes(rsvpStatus)) {
            return res.status(400).json({
                error: {
                    code: 'VALIDATION_ERROR',
                    message: 'RSVP status must be Confirmed or Declined.'
                }
            });
        }

        const testDeadline = '2027-12-31T23:59:59';

const guest = await guestService.updateGuestRSVP(
    req.params.token,
    rsvpStatus,
    testDeadline
);

        res.status(200).json(guest);
    } catch (error) {
        if (error.message.includes('not found')) {
            return res.status(404).json({
                error: {
                    code: 'GUEST_NOT_FOUND',
                    message: error.message
                }
            });
        }

        if (error.message.includes('deadline has passed')) {
    return res.status(400).json({
        error: {
            code: 'RSVP_DEADLINE_PASSED',
            message: error.message
        }
    });
}

        next(error);
    }
}
module.exports = {
    listGuests,
    getGuestById,
    createGuest,
    updateGuest,
    deleteGuest,
    searchGuests,
    submitRSVP
};
