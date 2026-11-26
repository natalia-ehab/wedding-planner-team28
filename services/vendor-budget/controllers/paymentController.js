const paymentService = require('../services/paymentService');

const getPayments = (req, res, next) => {
    try {
        res.json(paymentService.getPayments(1));
    } catch (error) {
        next(error);
    }
};

const getPaymentById = (req, res, next) => {
    try {
        res.json(
            paymentService.getPaymentById(
                1, Number(req.params.id)
            )
        );
    } catch (error) {
        next(error);
    }
};

const schedulePayment = (req, res, next) => {
    try {
        res.status(201).json(
            paymentService.schedulePayment(1, req.body)
        );
    } catch (error) {
        next(error);
    }
};

const updatePaymentStatus = (req, res, next) => {
    try {
        res.json(
            paymentService.updatePaymentStatus(
                1,
                Number(req.params.id),
                req.body.payment_status
            )
        );
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getPayments,
    getPaymentById,
    schedulePayment,
    updatePaymentStatus
};