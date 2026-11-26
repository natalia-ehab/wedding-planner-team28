const pool = require('../db');

// Convert PostgreSQL decimal values to numbers
function formatVendor(vendor) {
    return {
        ...vendor,
        contract_total: Number(vendor.contract_total)
    };
}

// Get all vendors or search by service type
async function getVendors(weddingId, serviceType = '') {
    const result = await pool.query(
        `SELECT *
         FROM vendor
         WHERE wedding_id = $1
         AND (
             $2 = ''
             OR POSITION(
                 LOWER($2) IN LOWER(service_type)
             ) > 0
         )
         ORDER BY vendor_id`,
        [weddingId, serviceType.trim()]
    );

    return result.rows.map(formatVendor);
}

// Get a specific vendor
async function getVendorById(weddingId, vendorId) {
    const result = await pool.query(
        `SELECT *
         FROM vendor
         WHERE wedding_id = $1
         AND vendor_id = $2`,
        [weddingId, vendorId]
    );

    if (result.rows.length === 0) {
        throw Object.assign(
            new Error('Vendor not found.'),
            { status: 404 }
        );
    }

    return formatVendor(result.rows[0]);
}

// Validate vendor information
function validateVendor(data) {
    const allowedTypes = [
        'Venue',
        'Catering',
        'Photography',
        'Decoration',
        'Music',
        'Other'
    ];

    if (
        !data ||
        typeof data.vendor_name !== 'string' ||
        !data.vendor_name.trim() ||
        data.vendor_name.trim().length > 150
    ) {
        throw Object.assign(
            new Error('Enter a valid vendor name.'),
            { status: 400 }
        );
    }

    if (!allowedTypes.includes(data.service_type)) {
        throw Object.assign(
            new Error('Invalid service type.'),
            { status: 400 }
        );
    }

    if (
        typeof data.vendor_email !== 'string' ||
        data.vendor_email.length > 255 ||
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
            data.vendor_email.trim()
        )
    ) {
        throw Object.assign(
            new Error('Enter a valid email address.'),
            { status: 400 }
        );
    }

    if (
        data.vendor_phone_number !== undefined &&
        (
            typeof data.vendor_phone_number !== 'string' ||
            data.vendor_phone_number.length > 20
        )
    ) {
        throw Object.assign(
            new Error('Invalid phone number.'),
            { status: 400 }
        );
    }

    if (
        typeof data.contract_total !== 'number' ||
        !Number.isFinite(data.contract_total) ||
        data.contract_total <= 0 ||
        data.contract_total > 9999999999.99 ||
        Math.abs(
            data.contract_total * 100 -
            Math.round(data.contract_total * 100)
        ) > 0.0001
    ) {
        throw Object.assign(
            new Error('Enter a valid contract amount.'),
            { status: 400 }
        );
    }
}

// Lock wedding to prevent concurrent budget conflicts
async function lockWedding(client, weddingId) {
    const result = await client.query(
        `SELECT wedding_id
         FROM wedding
         WHERE wedding_id = $1
         FOR UPDATE`,
        [weddingId]
    );

    if (result.rows.length === 0) {
        throw Object.assign(
            new Error('Wedding not found.'),
            { status: 404 }
        );
    }
}

// Validate available budget
async function checkBudget(
    client,
    weddingId,
    contractTotal,
    excludedVendorId = null
) {
    const budgetResult = await client.query(
        `SELECT total_amount
         FROM budget
         WHERE wedding_id = $1`,
        [weddingId]
    );

    if (budgetResult.rows.length === 0) {
        throw Object.assign(
            new Error('Please set the wedding budget first.'),
            { status: 409 }
        );
    }

    const committedResult = await client.query(
        `SELECT COALESCE(
            SUM(contract_total), 0
         ) AS committed_amount
         FROM vendor
         WHERE wedding_id = $1
         AND (
             $2::integer IS NULL
             OR vendor_id <> $2
         )`,
        [weddingId, excludedVendorId]
    );

    const budgetCents = Math.round(
        Number(budgetResult.rows[0].total_amount) * 100
    );

    const committedCents = Math.round(
        Number(
            committedResult.rows[0].committed_amount
        ) * 100
    );

    const contractCents = Math.round(
        contractTotal * 100
    );

    if (
        committedCents + contractCents > budgetCents
    ) {
        throw Object.assign(
            new Error(
                'Contract total exceeds the remaining budget.'
            ),
            { status: 409 }
        );
    }
}

// Create vendor
async function createVendor(weddingId, data) {
    validateVendor(data);

    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        await lockWedding(client, weddingId);

        await checkBudget(
            client,
            weddingId,
            data.contract_total
        );

        const result = await client.query(
            `INSERT INTO vendor (
                wedding_id,
                vendor_name,
                service_type,
                vendor_email,
                vendor_phone_number,
                contract_total
             )
             VALUES ($1, $2, $3, $4, $5, $6)
             RETURNING *`,
            [
                weddingId,
                data.vendor_name.trim(),
                data.service_type,
                data.vendor_email.trim(),
                (data.vendor_phone_number || '').trim(),
                data.contract_total
            ]
        );

        await client.query('COMMIT');

        return formatVendor(result.rows[0]);

    } catch (error) {
        await client.query('ROLLBACK');
        throw error;

    } finally {
        client.release();
    }
}

// Update vendor
async function updateVendor(
    weddingId,
    vendorId,
    data
) {
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        await lockWedding(client, weddingId);

        const vendorResult = await client.query(
            `SELECT *
             FROM vendor
             WHERE wedding_id = $1
             AND vendor_id = $2
             FOR UPDATE`,
            [weddingId, vendorId]
        );

        if (vendorResult.rows.length === 0) {
            throw Object.assign(
                new Error('Vendor not found.'),
                { status: 404 }
            );
        }

        validateVendor(data);

        await checkBudget(
            client,
            weddingId,
            data.contract_total,
            vendorId
        );

        const paymentResult = await client.query(
            `SELECT COALESCE(
                SUM(payment_amount), 0
             ) AS scheduled_payments
             FROM payment
             WHERE vendor_id = $1`,
            [vendorId]
        );

        const scheduledPayments = Number(
            paymentResult.rows[0].scheduled_payments
        );

        if (
            Math.round(data.contract_total * 100) <
            Math.round(scheduledPayments * 100)
        ) {
            throw Object.assign(
                new Error(
                    'Contract total cannot be less than scheduled payments.'
                ),
                { status: 409 }
            );
        }

        const result = await client.query(
            `UPDATE vendor
             SET
                 vendor_name = $1,
                 service_type = $2,
                 vendor_email = $3,
                 vendor_phone_number = $4,
                 contract_total = $5
             WHERE wedding_id = $6
             AND vendor_id = $7
             RETURNING *`,
            [
                data.vendor_name.trim(),
                data.service_type,
                data.vendor_email.trim(),
                (data.vendor_phone_number || '').trim(),
                data.contract_total,
                weddingId,
                vendorId
            ]
        );

        await client.query('COMMIT');

        return formatVendor(result.rows[0]);

    } catch (error) {
        await client.query('ROLLBACK');
        throw error;

    } finally {
        client.release();
    }
}

// Delete vendor
async function deleteVendor(weddingId, vendorId) {
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        await lockWedding(client, weddingId);

        const vendorResult = await client.query(
            `SELECT vendor_id
             FROM vendor
             WHERE wedding_id = $1
             AND vendor_id = $2
             FOR UPDATE`,
            [weddingId, vendorId]
        );

        if (vendorResult.rows.length === 0) {
            throw Object.assign(
                new Error('Vendor not found.'),
                { status: 404 }
            );
        }

        const paymentResult = await client.query(
            `SELECT payment_id
             FROM payment
             WHERE vendor_id = $1
             LIMIT 1`,
            [vendorId]
        );

        if (paymentResult.rows.length > 0) {
            throw Object.assign(
                new Error(
                    'Cannot delete a vendor with linked payments.'
                ),
                { status: 409 }
            );
        }

        await client.query(
            `DELETE FROM vendor
             WHERE wedding_id = $1
             AND vendor_id = $2`,
            [weddingId, vendorId]
        );

        await client.query('COMMIT');

    } catch (error) {
        await client.query('ROLLBACK');

        if (error.code === '23503') {
            throw Object.assign(
                new Error(
                    'Cannot delete a vendor with linked records.'
                ),
                { status: 409 }
            );
        }

        throw error;

    } finally {
        client.release();
    }
}

module.exports = {
    getVendors,
    getVendorById,
    createVendor,
    updateVendor,
    deleteVendor
};