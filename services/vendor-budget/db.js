require('dotenv').config({
    path: require('path').join(__dirname, '.env')
});

const { Pool } = require('pg');

if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is missing.');
}

const pool = new Pool({
    connectionString: process.env.DATABASE_URL
});

module.exports = pool;