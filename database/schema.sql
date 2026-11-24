-- 1. USERS 
CREATE TABLE IF NOT EXISTS users (
    user_id SERIAL PRIMARY KEY,
    name VARCHAR(150),
    email VARCHAR(255),
    password_hash TEXT,
    role VARCHAR(30)
);

-- Add missing columns to an existing users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS name VARCHAR(150);
ALTER TABLE users ADD COLUMN IF NOT EXISTS email VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(30);

CREATE UNIQUE INDEX IF NOT EXISTS users_email_unique
ON users(email) WHERE email IS NOT NULL;


-- 2. WEDDING 
CREATE TABLE IF NOT EXISTS wedding (
    wedding_id SERIAL PRIMARY KEY,
    owner_id INTEGER NOT NULL REFERENCES users(user_id),
    wedding_name VARCHAR(150) NOT NULL,
    wedding_date DATE,
    venue_capacity INTEGER,
    rsvp_deadline DATE
);

ALTER TABLE wedding ADD COLUMN IF NOT EXISTS venue_capacity INTEGER;
ALTER TABLE wedding ADD COLUMN IF NOT EXISTS rsvp_deadline DATE;


-- 3. BUDGET (Vendor and Budget service)
CREATE TABLE IF NOT EXISTS budget (
    budget_id SERIAL PRIMARY KEY,
    wedding_id INTEGER NOT NULL UNIQUE REFERENCES wedding(wedding_id),
    total_amount DECIMAL(12, 2) NOT NULL
);


-- 4. VENDOR (Vendor and Budget service)
CREATE TABLE IF NOT EXISTS vendor (
    vendor_id SERIAL PRIMARY KEY,
    wedding_id INTEGER NOT NULL REFERENCES wedding(wedding_id),
    linked_user_id INTEGER REFERENCES users(user_id),
    vendor_name VARCHAR(150) NOT NULL,
    service_type VARCHAR(100),
    vendor_phone_number VARCHAR(20),
    vendor_email VARCHAR(255),
    contract_total DECIMAL(12, 2)
);

ALTER TABLE vendor ADD COLUMN IF NOT EXISTS linked_user_id INTEGER REFERENCES users(user_id);
ALTER TABLE vendor ADD COLUMN IF NOT EXISTS contract_total DECIMAL(12, 2);


-- 5. PAYMENT (Vendor and Budget service)
CREATE TABLE IF NOT EXISTS payment (
    payment_id SERIAL PRIMARY KEY,
    vendor_id INTEGER NOT NULL REFERENCES vendor(vendor_id),
    payment_amount DECIMAL(12, 2) NOT NULL,
    payment_due_date DATE,
    payment_status VARCHAR(20)
        CHECK (payment_status IN ('Paid', 'Pending', 'Overdue')),
    confirmed_by_vendor BOOLEAN DEFAULT FALSE
);

ALTER TABLE payment ADD COLUMN IF NOT EXISTS confirmed_by_vendor BOOLEAN DEFAULT FALSE;


-- 6. GUEST (Guest service)
CREATE TABLE IF NOT EXISTS guest (
    guest_id SERIAL PRIMARY KEY,
    wedding_id INTEGER NOT NULL REFERENCES wedding(wedding_id),
    guest_full_name VARCHAR(150) NOT NULL,
    guest_email VARCHAR(255),
    guest_phone_number VARCHAR(20),
    rsvp_status VARCHAR(20)
        CHECK (rsvp_status IN ('Confirmed', 'Declined', 'Pending')),
    plus_ones INTEGER DEFAULT 0,
    meal VARCHAR(100)
);

ALTER TABLE guest ADD COLUMN IF NOT EXISTS plus_ones INTEGER DEFAULT 0;
ALTER TABLE guest ADD COLUMN IF NOT EXISTS meal VARCHAR(100);


-- 7. RSVP TOKEN (Guest service)
CREATE TABLE IF NOT EXISTS rsvp_token (
    token TEXT PRIMARY KEY,
    guest_id INTEGER NOT NULL REFERENCES guest(guest_id) ON DELETE CASCADE,
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ
);


-- 8. TASK (Task and Timeline service)
CREATE TABLE IF NOT EXISTS task (
    task_id SERIAL PRIMARY KEY,
    wedding_id INTEGER NOT NULL REFERENCES wedding(wedding_id),
    task_title VARCHAR(150) NOT NULL,
    task_description TEXT,
    task_category VARCHAR(100),
    task_priority VARCHAR(50),
    task_due_date DATE,
    task_status VARCHAR(50) DEFAULT 'not started',
    task_assigned_to INTEGER REFERENCES users(user_id),
    source VARCHAR(100)
);

ALTER TABLE task ADD COLUMN IF NOT EXISTS source VARCHAR(100);

-- Ensure task status follows the agreed workflow
UPDATE task
SET task_status = 'not started'
WHERE task_status IS NULL;

ALTER TABLE task ALTER COLUMN task_status SET DEFAULT 'not started';
ALTER TABLE task ALTER COLUMN task_status SET NOT NULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'task_status_check'
    ) THEN
        ALTER TABLE task
        ADD CONSTRAINT task_status_check
        CHECK (task_status IN ('not started', 'in progress', 'completed'));
    END IF;
END $$;


-- 9. NOTIFICATION LOG 
CREATE TABLE IF NOT EXISTS notification_log (
    id BIGSERIAL PRIMARY KEY,
    type VARCHAR(100) NOT NULL,
    recipient VARCHAR(255) NOT NULL,
    ref_id VARCHAR(100),
    sent_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    result TEXT
);


-- 10. BUDGET REMAINING VIEW
-- Remaining budget = total budget - payments marked Paid

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
LEFT JOIN vendor v ON b.wedding_id = v.wedding_id
LEFT JOIN payment p ON v.vendor_id = p.vendor_id
GROUP BY b.wedding_id, b.total_amount;


-- Indexes
CREATE INDEX IF NOT EXISTS idx_task_wedding
ON task(wedding_id);

CREATE INDEX IF NOT EXISTS idx_task_due_date
ON task(task_due_date);

CREATE INDEX IF NOT EXISTS idx_vendor_wedding
ON vendor(wedding_id);

CREATE INDEX IF NOT EXISTS idx_guest_wedding
ON guest(wedding_id);

CREATE INDEX IF NOT EXISTS idx_payment_vendor
ON payment(vendor_id);