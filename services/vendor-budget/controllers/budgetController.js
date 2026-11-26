const budgetService = require('../services/budgetService');

const getBudget = (req, res, next) => {
    try {
        res.json(budgetService.getBudget(1));
    } catch (error) {
        next(error);
    }
};

const setBudget = (req, res, next) => {
    try {
        res.json(
            budgetService.setBudget(1, req.body.total_amount)
        );
    } catch (error) {
        next(error);
    }
};

const getBudgetSummary = (req, res, next) => {
    try {
        res.json(budgetService.getBudgetSummary(1));
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getBudget,
    setBudget,
    getBudgetSummary
};