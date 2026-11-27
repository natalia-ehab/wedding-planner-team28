const pool = require('../db');

async function checkWeddingOwnership(req, res, next) {
    const weddingId = Number(
        req.params.weddingId ||
        req.query.weddingId ||
        req.body?.wedding_id
    );

    if (!Number.isSafeInteger(weddingId) || weddingId <= 0) {
        return res.status(400).json({
            message: 'A valid wedding ID is required.'
        });
    }

    if (!req.user) {
        return res.status(401).json({
            message: 'Authentication required.'
        });
    }

    try {
        const result = await pool.query(
            `SELECT wedding_id, owner_id
             FROM wedding
             WHERE wedding_id = $1`,
            [weddingId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                message: 'Wedding not found.'
            });
        }

        const wedding = result.rows[0];

        if (Number(wedding.owner_id) !== Number(req.user.user_id)) {
            return res.status(403).json({
                message: 'You do not have access to this wedding.'
            });
        }

        req.weddingId = weddingId;

        next();

    } catch (error) {
        console.error('Wedding ownership check failed:', error.message);

        return res.status(500).json({
            message: 'Internal server error.'
        });
    }
}

module.exports = {
    checkWeddingOwnership
};