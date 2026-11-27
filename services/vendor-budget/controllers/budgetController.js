const budgetService = require('../services/budgetService');

const getBudget = async (req, res, next) => {
    try {
        const budget = await budgetService.getBudget(
            req.weddingId
        );

        res.json(budget);

    } catch (error) {
        next(error);
    }
};

const setBudget = async (req, res, next) => {
    try {
        const budget = await budgetService.setBudget(
            req.weddingId,
            req.body.total_amount
        );

        res.json(budget);

    } catch (error) {
        next(error);
    }
};

const getBudgetSummary = async (req, res, next) => {
    try {
        const summary = await budgetService.getBudgetSummary(
            req.weddingId
        );

        res.json(summary);

    } catch (error) {
        next(error);
    }
};

module.exports = {
    getBudget,
    setBudget,
    getBudgetSummary
};