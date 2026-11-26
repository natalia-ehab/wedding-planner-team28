const express = require('express');
const router = express.Router();
const controller = require('../controllers/budgetController');

router.get('/', controller.getBudget);
router.get('/summary', controller.getBudgetSummary);
router.put('/', controller.setBudget);

module.exports = router;