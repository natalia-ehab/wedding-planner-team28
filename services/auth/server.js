require('dotenv').config();

const express = require('express');
const cors = require('cors');
const pool = require('./db');
const authRoutes = require('./routes/authRoutes');

if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET is missing.');
}

const app = express();

app.use(cors());
app.use(express.json());

// Health check
app.get('/health', async (req, res) => {
    try {
        await pool.query('SELECT 1');

        res.json({
            status: 'OK',
            service: 'Authentication Service',
            database: 'Connected'
        });

    } catch (error) {

        res.status(500).json({
            status: 'Error',
            message: 'Database connection failed'
        });
    }
});

// Authentication routes
app.use('/api/auth', authRoutes);
app.use('/auth', authRoutes);

// Unknown routes
app.use((req, res) => {
    res.status(404).json({
        message: 'Route not found.'
    });
});

const PORT = process.env.PORT || 3000;

if (require.main === module) {
    app.listen(PORT, () => {
        console.log(
            `Authentication Service running on port ${PORT}`
        );
    });
}

module.exports = app;
