const {
    getConfirmedGuestCount
} = require('../services/guestIntegrationService');

async function getGuestCount(req, res) {

    try {
        // Temporary wedding ID until authentication
        const weddingId = 1;

        const result = await getConfirmedGuestCount(
            weddingId
        );

        res.status(200).json(result);

    } catch (error) {

        console.error(error.message);

        res.status(502).json({
            error: {
                code: 'GUEST_SERVICE_ERROR',
                message: 'Unable to retrieve confirmed guest count.'
            }
        });
    }
}

module.exports = {
    getGuestCount
};