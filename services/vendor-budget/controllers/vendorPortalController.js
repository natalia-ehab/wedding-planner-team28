const pool = require('../db');

const {
    getConfirmedGuestCount
} = require('../services/guestIntegrationService');

// Get vendors assigned to the authenticated user
const getAssignedVendors = async (req, res, next) => {
    try {

        const result = await pool.query(
            `SELECT vendor_id, wedding_id, vendor_name,
                    service_type, contract_total
             FROM vendor
             WHERE user_id = $1`,
            [req.user.user_id]
        );

        res.json(result.rows);

    } catch (error) {
        next(error);
    }
};

// Get payments belonging to the authenticated vendor
const getVendorPayments = async (req, res, next) => {
    try {

        const result = await pool.query(
            `SELECT p.payment_id, p.vendor_id,
                    p.payment_amount,
                    p.payment_due_date::text,
                    p.payment_status,
                    v.vendor_name,
                    v.wedding_id
             FROM payment p
             JOIN vendor v ON p.vendor_id = v.vendor_id
             WHERE v.user_id = $1
             ORDER BY p.payment_due_date`,
            [req.user.user_id]
        );

        res.json(result.rows);

    } catch (error) {
        next(error);
    }
};

// Confirm a paid payment
const confirmPayment = async (req, res, next) => {
    try {

        const paymentId = Number(req.params.id);

        if (!Number.isSafeInteger(paymentId) || paymentId <= 0) {
            return res.status(400).json({
                message: 'Invalid payment ID.'
            });
        }

        const result = await pool.query(
            `UPDATE payment p
             SET payment_status = 'Confirmed'
             FROM vendor v
             WHERE p.vendor_id = v.vendor_id
             AND p.payment_id = $1
             AND v.user_id = $2
             AND p.payment_status = 'Paid'
             RETURNING p.payment_id,
                       p.vendor_id,
                       p.payment_amount,
                       p.payment_due_date::text,
                       p.payment_status`,
            [paymentId, req.user.user_id]
        );

        if (result.rowCount === 0) {

            const existing = await pool.query(
                `SELECT p.payment_status
                 FROM payment p
                 JOIN vendor v ON p.vendor_id = v.vendor_id
                 WHERE p.payment_id = $1
                 AND v.user_id = $2`,
                [paymentId, req.user.user_id]
            );

            if (existing.rowCount === 0) {
                return res.status(404).json({
                    message: 'Payment not found.'
                });
            }

            return res.status(409).json({
                message: 'Only paid payments can be confirmed.'
            });
        }

        res.json({
            message: 'Payment confirmed successfully.',
            payment: result.rows[0]
        });

    } catch (error) {
        next(error);
    }
};

// Get confirmed guest count for an assigned wedding
const getGuestCount = async (req, res, next) => {
    try {

        const weddingId = Number(req.query.weddingId);

        if (!Number.isSafeInteger(weddingId) || weddingId <= 0) {
            return res.status(400).json({
                message: 'Invalid wedding ID.'
            });
        }

        const result = await pool.query(
            `SELECT vendor_id
             FROM vendor
             WHERE wedding_id = $1
             AND user_id = $2
             LIMIT 1`,
            [weddingId, req.user.user_id]
        );

        if (result.rowCount === 0) {
            return res.status(403).json({
                message: 'Access denied.'
            });
        }

        try {

            const data = await getConfirmedGuestCount(weddingId);

            res.json(data);

        } catch (error) {

            res.status(502).json({
                message: 'Guest Service unavailable.'
            });
        }

    } catch (error) {
        next(error);
    }
};

module.exports = {
    getAssignedVendors,
    getVendorPayments,
    confirmPayment,
    getGuestCount
};