const pool = require('../db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Register a new couple
async function register(req, res) {
    try {
        const { full_name, email, password } = req.body;

        if (
            typeof full_name !== 'string' ||
            !full_name.trim() ||
            full_name.trim().length > 150 ||
            typeof email !== 'string' ||
            email.length > 255 ||
            !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) ||
            typeof password !== 'string' ||
            password.length < 8 ||
            Buffer.byteLength(password, 'utf8') > 72
        ) {
            return res.status(400).json({
                message: 'Please enter valid registration details.'
            });
        }

        const normalizedEmail = email.trim().toLowerCase();

        const existingUser = await pool.query(
            'SELECT user_id FROM users WHERE LOWER(email) = $1',
            [normalizedEmail]
        );

        if (existingUser.rows.length > 0) {
            return res.status(409).json({
                message: 'Email already registered.'
            });
        }

        const passwordHash = await bcrypt.hash(password, 12);

        const result = await pool.query(
            `INSERT INTO users
            (full_name, email, password_hash, role)
            VALUES ($1, $2, $3, $4)
            RETURNING user_id, full_name, email, role`,
            [
                full_name.trim(),
                normalizedEmail,
                passwordHash,
                'couple'
            ]
        );

        res.status(201).json({
            message: 'Registration successful.',
            user: result.rows[0]
        });

    } catch (error) {

        if (error.code === '23505') {
            return res.status(409).json({
                message: 'Email already registered.'
            });
        }

        console.error(error.message);

        res.status(500).json({
            message: 'Registration failed.'
        });
    }
}

// Login and generate JWT
async function login(req, res) {
    try {
        const { email, password } = req.body;

        if (
            typeof email !== 'string' ||
            !email.trim() ||
            typeof password !== 'string' ||
            !password ||
            Buffer.byteLength(password, 'utf8') > 72
        ) {
            return res.status(400).json({
                message: 'Email and password are required.'
            });
        }

        const result = await pool.query(
            `SELECT user_id, full_name, email,
                    password_hash, role
             FROM users
             WHERE LOWER(email) = $1`,
            [email.trim().toLowerCase()]
        );

        const user = result.rows[0];

        if (!user || !user.password_hash || !user.role) {
            return res.status(401).json({
                message: 'Invalid email or password.'
            });
        }

        const validPassword = await bcrypt.compare(
            password,
            user.password_hash
        );

        if (!validPassword) {
            return res.status(401).json({
                message: 'Invalid email or password.'
            });
        }

        const token = jwt.sign(
            {
                user_id: user.user_id,
                role: user.role
            },
            process.env.JWT_SECRET,
            {
                algorithm: 'HS256',
                expiresIn: '1h'
            }
        );

        res.status(200).json({
            message: 'Login successful.',
            token,
            user: {
                user_id: user.user_id,
                full_name: user.full_name,
                email: user.email,
                role: user.role
            }
        });

    } catch (error) {

        console.error(error.message);

        res.status(500).json({
            message: 'Login failed.'
        });
    }
}

module.exports = {
    register,
    login
};