
const { Pool } = require("pg");
require("dotenv").config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

// Test database connection
pool.connect()
    .then(client => {
        console.log("Tasks service connected to Neon!");
        client.release();
    })
    .catch(error => {
        console.error("Database connection error:", error.message);
    });

module.exports = pool;
