const pool = require('../db');

// Get budget summary
async function getBudgetSummary(weddingId) {
    const result = await pool.query(
        `SELECT *
         FROM budget_remaining
         WHERE wedding_id = $1`,
        [weddingId]
    );

    if (result.rows.length === 0) {
        return {
            total_amount: 0,
            committed_amount: 0,
            paid_amount: 0,
            remaining_amount: 0,
            usage_percentage: 0,
            budget_warning: false
        };
    }

    const summary = result.rows[0];

    return {
        total_amount: Number(summary.total_amount),
        committed_amount: Number(summary.committed_amount),
        paid_amount: Number(summary.paid_amount),
        remaining_amount: Number(summary.remaining_amount),
        usage_percentage: Number(summary.usage_percentage),
        budget_warning: summary.budget_warning
    };
}

// Get wedding budget
async function getBudget(weddingId) {
    const result = await pool.query(
        `SELECT *
         FROM budget
         WHERE wedding_id = $1`,
        [weddingId]
    );

    if (result.rows.length === 0) {
        return null;
    }

    const budget = result.rows[0];

    return {
        ...budget,
        total_amount: Number(budget.total_amount)
    };
}

// Create or update wedding budget
async function setBudget(weddingId, totalAmount) {
    if (
        typeof totalAmount !== 'number' ||
        !Number.isFinite(totalAmount) ||
        totalAmount <= 0 ||
        totalAmount > 9999999999.99 ||
        Math.abs(
            totalAmount * 100 -
            Math.round(totalAmount * 100)
        ) > 0.0001
    ) {
        throw Object.assign(
            new Error('Enter a valid budget amount.'),
            { status: 400 }
        );
    }

    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // Lock wedding during budget update
        const weddingResult = await client.query(
            `SELECT wedding_id
             FROM wedding
             WHERE wedding_id = $1
             FOR UPDATE`,
            [weddingId]
        );

        if (weddingResult.rows.length === 0) {
            throw Object.assign(
                new Error('Wedding not found.'),
                { status: 404 }
            );
        }

        // Calculate committed contracts
        const committedResult = await client.query(
            `SELECT COALESCE(
                SUM(contract_total), 0
             ) AS committed_amount
             FROM vendor
             WHERE wedding_id = $1`,
            [weddingId]
        );

        const committedAmount = Number(
            committedResult.rows[0].committed_amount
        );

        // Business validation
        if (
            Math.round(totalAmount * 100) <
            Math.round(committedAmount * 100)
        ) {
            throw Object.assign(
                new Error(
                    'Budget cannot be less than committed contracts.'
                ),
                { status: 409 }
            );
        }

        // Insert or update budget
        const result = await client.query(
            `INSERT INTO budget (
                wedding_id,
                total_amount
             )
             VALUES ($1, $2)
             ON CONFLICT (wedding_id)
             DO UPDATE SET
                total_amount = EXCLUDED.total_amount
             RETURNING *`,
            [weddingId, totalAmount]
        );

        await client.query('COMMIT');

        return {
            ...result.rows[0],
            total_amount: Number(
                result.rows[0].total_amount
            )
        };

    } catch (error) {
        await client.query('ROLLBACK');
        throw error;

    } finally {
        client.release();
    }
}

module.exports = {
    getBudget,
    setBudget,
    getBudgetSummary
};