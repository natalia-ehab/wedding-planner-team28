-- 1. Users
CREATE TABLE IF NOT EXISTS users (
    user_id SERIAL PRIMARY KEY
);

-- 2. Wedding
CREATE TABLE IF NOT EXISTS wedding (
    wedding_id SERIAL PRIMARY KEY,
    wedding_name VARCHAR(150) NOT NULL,
    wedding_date DATE,
    owner_id INTEGER NOT NULL REFERENCES users(user_id)
);

-- 3. Vendor
CREATE TABLE IF NOT EXISTS vendor (
    vendor_id SERIAL PRIMARY KEY,
    wedding_id INTEGER NOT NULL REFERENCES wedding(wedding_id),
    vendor_name VARCHAR(150) NOT NULL,
    service_type VARCHAR(100) NOT NULL,
    vendor_phone_number VARCHAR(20),
    vendor_email VARCHAR(255) NOT NULL,
    contract_total DECIMAL(12, 2) NOT NULL
        CHECK (contract_total > 0)
);

-- 4. Payment
CREATE TABLE IF NOT EXISTS payment (
    payment_id SERIAL PRIMARY KEY,
    vendor_id INTEGER NOT NULL REFERENCES vendor(vendor_id),
    payment_amount DECIMAL(12, 2) NOT NULL
        CHECK (payment_amount > 0),
    payment_due_date DATE NOT NULL,
    payment_status VARCHAR(20) NOT NULL DEFAULT 'Pending'
        CHECK (
            payment_status IN (
                'Paid',
                'Pending',
                'Overdue',
                'Confirmed'
            )
        )
);

-- 5. Budget
CREATE TABLE IF NOT EXISTS budget (
    budget_id SERIAL PRIMARY KEY,
    wedding_id INTEGER NOT NULL UNIQUE REFERENCES wedding(wedding_id),
    total_amount DECIMAL(12, 2) NOT NULL
        CHECK (total_amount > 0)
);

-- 6. Guest
CREATE TABLE IF NOT EXISTS guest (
    guest_id SERIAL PRIMARY KEY,
    wedding_id INTEGER NOT NULL REFERENCES wedding(wedding_id),
    guest_full_name VARCHAR(150) NOT NULL,
    guest_email VARCHAR(255),
    guest_phone_number VARCHAR(20),
    rsvp_status VARCHAR(20)
        CHECK (
            rsvp_status IN (
                'Confirmed',
                'Declined',
                'Pending'
            )
        )
);

-- 7. Task
CREATE TABLE IF NOT EXISTS task (
    task_id SERIAL PRIMARY KEY,
    wedding_id INTEGER NOT NULL REFERENCES wedding(wedding_id),
    task_title VARCHAR(150) NOT NULL,
    task_description TEXT,
    task_category VARCHAR(100),
    task_priority VARCHAR(50),
    task_due_date DATE,
    task_status VARCHAR(50),
    task_assigned_to INTEGER REFERENCES users(user_id)
);

-- Indexes for Vendor and Payment queries
CREATE INDEX IF NOT EXISTS idx_vendor_wedding
ON vendor(wedding_id);

CREATE INDEX IF NOT EXISTS idx_vendor_service_type
ON vendor(service_type);

CREATE INDEX IF NOT EXISTS idx_payment_vendor
ON payment(vendor_id);

CREATE INDEX IF NOT EXISTS idx_payment_status_due_date
ON payment(payment_status, payment_due_date);

-- Budget Summary View
CREATE OR REPLACE VIEW budget_remaining AS
WITH vendor_totals AS (
    SELECT
        wedding_id,
        SUM(contract_total) AS committed_amount
    FROM vendor
    GROUP BY wedding_id
),
payment_totals AS (
    SELECT
        v.wedding_id,
        SUM(p.payment_amount) FILTER (
            WHERE p.payment_status IN ('Paid', 'Confirmed')
        ) AS paid_amount
    FROM vendor v
    JOIN payment p ON v.vendor_id = p.vendor_id
    GROUP BY v.wedding_id
)
SELECT
    b.wedding_id,
    b.total_amount,

    b.total_amount -
        COALESCE(vt.committed_amount, 0)
        AS remaining_amount,

    COALESCE(vt.committed_amount, 0)
        AS committed_amount,

    COALESCE(pt.paid_amount, 0)
        AS paid_amount,

    ROUND(
        COALESCE(vt.committed_amount, 0)
        / NULLIF(b.total_amount, 0) * 100,
        2
    ) AS usage_percentage,

    (
        COALESCE(vt.committed_amount, 0)
        >= b.total_amount * 0.80
    ) AS budget_warning

FROM budget b

LEFT JOIN vendor_totals vt
    ON b.wedding_id = vt.wedding_id

LEFT JOIN payment_totals pt
    ON b.wedding_id = pt.wedding_id;