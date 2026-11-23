
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
    service_type VARCHAR(100),
    vendor_phone_number VARCHAR(20),
    vendor_email VARCHAR(255)
);

-- 4. Payment
CREATE TABLE IF NOT EXISTS payment (
    payment_id SERIAL PRIMARY KEY,
    vendor_id INTEGER NOT NULL REFERENCES vendor(vendor_id),
    payment_amount DECIMAL(12, 2) NOT NULL,
    payment_due_date DATE,
    payment_status VARCHAR(20)
        CHECK (payment_status IN ('Paid', 'Pending', 'Overdue'))
);

-- 5. Budget
CREATE TABLE IF NOT EXISTS budget (
    budget_id SERIAL PRIMARY KEY,
    wedding_id INTEGER NOT NULL UNIQUE REFERENCES wedding(wedding_id),
    total_amount DECIMAL(12, 2) NOT NULL
);

-- 6. Guest
CREATE TABLE IF NOT EXISTS guest (
    guest_id SERIAL PRIMARY KEY,
    wedding_id INTEGER NOT NULL REFERENCES wedding(wedding_id),
    guest_full_name VARCHAR(150) NOT NULL,
    guest_email VARCHAR(255),
    guest_phone_number VARCHAR(20),
    rsvp_status VARCHAR(20)
        CHECK (rsvp_status IN ('Confirmed', 'Declined', 'Pending'))
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

-- Calculate remaining budget using paid payments
CREATE OR REPLACE VIEW budget_remaining AS
SELECT
    b.wedding_id,
    b.total_amount,
    b.total_amount - COALESCE(
        SUM(p.payment_amount) FILTER (
            WHERE p.payment_status = 'Paid'
        ), 0
    ) AS remaining_amount
FROM budget b
LEFT JOIN wedding w ON b.wedding_id = w.wedding_id
LEFT JOIN vendor v ON w.wedding_id = v.wedding_id
LEFT JOIN payment p ON v.vendor_id = p.vendor_id
GROUP BY b.wedding_id, b.total_amount;