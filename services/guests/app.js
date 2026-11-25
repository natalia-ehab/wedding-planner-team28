
require('dotenv').config({ quiet: true });

const express = require('express');
const cors = require('cors');
const guestRoutes = require('./routes/guestRoutes');

const app = express();

app.use((req, res, next) => {
    console.log(
        `${new Date().toISOString()} ${req.method} ${req.originalUrl}`
    );
    next();
});

const allowedOrigins = (
    process.env.CORS_ORIGINS || 'http://localhost:8080'
).split(',').map(origin => origin.trim());

app.use(cors({
    origin: allowedOrigins
}));

app.use(express.json());

app.get('/', (req, res) => {
    res.status(200).json({
        name: 'Guest Management Service API',
        endpoints: ['/api/health', '/api/guests']
    });
});

app.get('/api/health', (req, res) => {
    res.status(200).json({
        status: 'ok',
        environment: process.env.NODE_ENV || 'development'
    });
});

app.use('/api/guests', guestRoutes);

app.use((req, res) => {
    res.status(404).json({
        error: {
            code: 'ROUTE_NOT_FOUND',
            message: 'Route not found.'
        }
    });
});

app.use((error, req, res, next) => {
    if (error.type === 'entity.parse.failed') {
        return res.status(400).json({
            error: {
                code: 'VALIDATION_ERROR',
                message: 'Request body is not valid JSON.'
            }
        });
    }

    console.error(error);

    res.status(500).json({
        error: {
            code: 'INTERNAL_ERROR',
            message: 'An unexpected server error occurred.'
        }
    });
});

module.exports = app;
