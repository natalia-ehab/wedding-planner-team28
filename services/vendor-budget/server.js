const express = require('express');
const cors = require('cors');

const vendorRoutes = require('./routes/vendorRoutes');
const budgetRoutes = require('./routes/budgetRoutes');
const paymentRoutes = require('./routes/paymentRoutes');

const app = express();

app.use(cors());
app.use(express.json());

// Health Check
app.get('/health', (req, res) => {
    res.json({
        service: 'Vendor and Budget Service',
        status: 'running'
    });
});

// API Routes
app.use('/api/vendors', vendorRoutes);
app.use('/api/budget', budgetRoutes);
app.use('/api/payments', paymentRoutes);

// Route Not Found
app.use((req, res) => {
    res.status(404).json({
        error: 'Route not found.'
    });
});

// Error Handling
app.use((error, req, res, next) => {
    const status = error.status || 500;

    res.status(status).json({
        error: status === 500
            ? 'Internal server error.'
            : error.message
    });
});

// Start Server
const PORT = process.env.PORT || 3003;

app.listen(PORT, () => {
    console.log(
        `Vendor and Budget Service running on port ${PORT}`
    );
});