require('dotenv').config();

const express = require('express');
const cors = require('cors');
const pool = require('./db');

const {
    authenticate,
    authorize
} = require('./middleware/auth');

const {
    checkWeddingOwnership
} = require('./middleware/weddingOwnership');

const vendorRoutes = require('./routes/vendorRoutes');
const budgetRoutes = require('./routes/budgetRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const guestIntegrationRoutes = require('./routes/guestIntegrationRoutes');
const vendorPortalRoutes = require('./routes/vendorPortalRoutes');

const app = express();

app.use(cors());
app.use(express.json());

// Health check
app.get('/health', async (req, res) => {
    try {

        await pool.query('SELECT 1');

        res.json({
            service: 'Vendor and Budget Service',
            status: 'running',
            database: 'connected'
        });

    } catch (error) {

        res.status(503).json({
            service: 'Vendor and Budget Service',
            status: 'unavailable',
            database: 'disconnected'
        });
    }
});

// Vendor-only routes
app.use('/api/vendor-portal', vendorPortalRoutes);

// Couple-only routes
app.use(
    '/api',
    authenticate,
    authorize('couple'),
    checkWeddingOwnership
);

app.use('/api/vendors', vendorRoutes);
app.use('/api/budget', budgetRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/guests', guestIntegrationRoutes);

// Not found
app.use((req, res) => {
    res.status(404).json({
        error: 'Route not found.'
    });
});

// Error handling
app.use((error, req, res, next) => {

    const status = error.status || 500;

    if (status >= 500) {
        console.error(error);
    }

    res.status(status).json({
        error: status === 500
            ? 'Internal server error.'
            : error.message
    });
});

const PORT = process.env.PORT || 3003;

async function startServer() {
    try {

        if (!process.env.JWT_SECRET) {
            throw new Error('JWT_SECRET is missing.');
        }

        await pool.query('SELECT 1');

        console.log('Neon PostgreSQL connected successfully.');

        app.listen(PORT, () => {
            console.log(
                `Vendor and Budget Service running on port ${PORT}`
            );
        });

    } catch (error) {

        console.error('Server startup failed:', error.message);
        process.exit(1);
    }
}

if (require.main === module) {
    startServer();
}

module.exports = app;