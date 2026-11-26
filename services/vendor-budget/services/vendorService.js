const { readDB, writeDB } = require('../data/store');

// Get all vendors or search by service type
function getVendors(weddingId, serviceType = '') {
    const db = readDB();

    let vendors = db.vendors.filter(
        vendor => vendor.wedding_id === weddingId
    );

    if (serviceType.trim()) {
        const search = serviceType.trim().toLowerCase();

        vendors = vendors.filter(
            vendor => vendor.service_type
                .toLowerCase()
                .includes(search)
        );
    }

    return vendors;
}

// Get a specific vendor
function getVendorById(weddingId, vendorId) {
    const db = readDB();

    const vendor = db.vendors.find(
        v => v.wedding_id === weddingId &&
            v.vendor_id === vendorId
    );

    if (!vendor) {
        throw Object.assign(
            new Error('Vendor not found.'),
            { status: 404 }
        );
    }

    return vendor;
}

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
        Math.abs(
            data.contract_total * 100 -
            Math.round(data.contract_total * 100)
        ) > 0.000001
    ) {
        throw Object.assign(
            new Error('Enter a valid contract amount.'),
            { status: 400 }
        );
    }
}

function createVendor(weddingId, data) {
    validateVendor(data);

    const db = readDB();

    const budget = db.budgets.find(
        b => b.wedding_id === weddingId
    );

    if (!budget) {
        throw Object.assign(
            new Error('Please set the wedding budget first.'),
            { status: 409 }
        );
    }

    const committedAmount = db.vendors
        .filter(v => v.wedding_id === weddingId)
        .reduce(
            (sum, vendor) => sum + vendor.contract_total,
            0
        );

    if (
        Math.round(
            (committedAmount + data.contract_total) * 100
        ) > Math.round(budget.total_amount * 100)
    ) {
        throw Object.assign(
            new Error(
                'Contract total exceeds the remaining budget.'
            ),
            { status: 409 }
        );
    }

    const vendor = {
        vendor_id: db.nextVendorId++,
        wedding_id: weddingId,
        vendor_name: data.vendor_name.trim(),
        service_type: data.service_type,
        vendor_email: data.vendor_email.trim(),
        vendor_phone_number:
            (data.vendor_phone_number || '').trim(),
        contract_total: data.contract_total
    };

    db.vendors.push(vendor);

    writeDB(db);

    return vendor;
}

function updateVendor(weddingId, vendorId, data) {
    const db = readDB();

    const vendor = db.vendors.find(
        v => v.vendor_id === vendorId &&
            v.wedding_id === weddingId
    );

    if (!vendor) {
        throw Object.assign(
            new Error('Vendor not found.'),
            { status: 404 }
        );
    }

    validateVendor(data);

    const validatedData = {
        vendor_name: data.vendor_name.trim(),
        service_type: data.service_type,
        vendor_email: data.vendor_email.trim(),
        vendor_phone_number: (data.vendor_phone_number || '').trim(),
        contract_total: data.contract_total
    };

    const budget = db.budgets.find(
        b => b.wedding_id === weddingId
    );

    if (!budget) {
        throw Object.assign(
            new Error('Please set the wedding budget first.'),
            { status: 409 }
        );
    }

    const committedAmount = db.vendors
        .filter(v =>
            v.wedding_id === weddingId &&
            v.vendor_id !== vendorId
        )
        .reduce(
            (sum, v) => sum + v.contract_total,
            0
        );

    if (
        Math.round(
            (committedAmount + validatedData.contract_total) * 100
        ) > Math.round(budget.total_amount * 100)
    ) {
        throw Object.assign(
            new Error('Contract total exceeds the remaining budget.'),
            { status: 409 }
        );
    }

    const scheduledPayments = db.payments
        .filter(p => p.vendor_id === vendorId)
        .reduce(
            (sum, p) => sum + p.payment_amount,
            0
        );

    if (
        Math.round(validatedData.contract_total * 100) <
        Math.round(scheduledPayments * 100)
    ) {
        throw Object.assign(
            new Error('Contract total cannot be less than scheduled payments.'),
            { status: 409 }
        );
    }

    Object.assign(vendor, validatedData);

    writeDB(db);

    return vendor;
}

function deleteVendor(weddingId, vendorId) {
    const db = readDB();

    const vendorIndex = db.vendors.findIndex(
        v => v.vendor_id === vendorId &&
             v.wedding_id === weddingId
    );

    if (vendorIndex === -1) {
        throw Object.assign(
            new Error('Vendor not found.'),
            { status: 404 }
        );
    }

    const hasPayments = db.payments.some(
        p => p.vendor_id === vendorId
    );

    if (hasPayments) {
        throw Object.assign(
            new Error('Cannot delete a vendor with linked payments.'),
            { status: 409 }
        );
    }

    db.vendors.splice(vendorIndex, 1);

    writeDB(db);
}
module.exports = {
    getVendors,
    getVendorById,
    createVendor,
    updateVendor,
    deleteVendor
};