const paymentService = require('../services/paymentService');

const getPayments = async (req, res, next) => {
    try {
        const payments = await paymentService.getPayments(1);

        res.json(payments);

    } catch (error) {
        next(error);
    }
};

const getPaymentById = async (req, res, next) => {
    try {
        const payment = await paymentService.getPaymentById(
            1,
            Number(req.params.id)
        );

        res.json(payment);

    } catch (error) {
        next(error);
    }
};

const schedulePayment = async (req, res, next) => {
    try {
        const payment = await paymentService.schedulePayment(
            1,
            req.body
        );

        res.status(201).json(payment);

    } catch (error) {
        next(error);
    }
};

const updatePaymentStatus = async (req, res, next) => {
    try {
        const payment = await paymentService.updatePaymentStatus(
            1,
            Number(req.params.id),
            req.body.payment_status
        );

        res.json(payment);

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