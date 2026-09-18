// server.js
// Main Express server for SocietyNest.
// It serves the frontend and exposes the REST APIs used by the JavaScript files.

const path = require('path');
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const db = require('./db');
const { authRequired, adminOnly, studentOnly } = require('./middleware/auth');

const app = express();
const PORT = Number(process.env.PORT || 5000);
const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET || JWT_SECRET === 'change_this_to_a_long_random_secret') {
    console.warn('Warning: set a strong JWT_SECRET in .env before using this outside local development.');
}

app.use(express.json({ limit: '20kb' }));
app.use(cookieParser());

// Serve everything inside frontend/ from the same origin.
app.use(express.static(path.join(__dirname, '../frontend')));

function cleanText(value, maxLength = 5000) {
    return String(value ?? '').trim().slice(0, maxLength);
}

function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isStrongEnoughPassword(password) {
    return typeof password === 'string' && password.length >= 6;
}

function signToken(user) {
    return jwt.sign(
        {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role
        },
        JWT_SECRET,
        { expiresIn: '7d' }
    );
}

function sendAuthCookie(res, user) {
    const token = signToken(user);

    res.cookie('token', token, {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        maxAge: 7 * 24 * 60 * 60 * 1000
    });
}

function validateSocietyInput(body) {
    const name = cleanText(body.name, 100);
    const category = cleanText(body.category, 100);
    const tagline = cleanText(body.tagline, 255);
    const description = cleanText(body.description, 5000);
    const criteria = cleanText(body.criteria, 3000);
    const roles = cleanText(body.roles, 1000);
    const deadline = cleanText(body.deadline, 30);

    const categories = [
        'Technical',
        'Cultural',
        'Sports',
        'Literary',
        'Entrepreneurship',
        'Creative'
    ];

    if (!name || !category || !description || !deadline) {
        return { error: 'Name, category, description and deadline are required.' };
    }

    if (!categories.includes(category)) {
        return { error: 'Please choose a valid society category.' };
    }

    const deadlineDate = new Date(deadline);
    if (Number.isNaN(deadlineDate.getTime())) {
        return { error: 'Invalid deadline.' };
    }

    return {
        value: { name, category, tagline, description, criteria, roles, deadline },
        deadlineDate
    };
}

// ---------------- HEALTH ----------------

app.get('/api/health', (req, res) => {
    res.json({ message: 'SocietyNest API is running.' });
});

// ---------------- AUTH ----------------

app.post('/api/auth/register', async (req, res) => {
    try {
        const name = cleanText(req.body.name, 100);
        const email = cleanText(req.body.email, 255).toLowerCase();
        const password = req.body.password;
        const year = Number(req.body.year);
        const branch = cleanText(req.body.branch, 100);

        if (!name || !email || !password || !Number.isInteger(year) || !branch) {
            return res.status(400).json({ message: 'All registration fields are required.' });
        }

        if (!isValidEmail(email)) {
            return res.status(400).json({ message: 'Please enter a valid email address.' });
        }

        if (!isStrongEnoughPassword(password)) {
            return res.status(400).json({ message: 'Password must be at least 6 characters.' });
        }

        if (year < 1 || year > 5) {
            return res.status(400).json({ message: 'Year must be between 1 and 5.' });
        }

        const [existing] = await db.query(
            'SELECT id FROM users WHERE email = ?',
            [email]
        );

        if (existing.length > 0) {
            return res.status(409).json({ message: 'An account with this email already exists.' });
        }

        const passwordHash = await bcrypt.hash(password, 10);

        const [result] = await db.query(
            `INSERT INTO users (name, email, password_hash, year, branch)
             VALUES (?, ?, ?, ?, ?)`,
            [name, email, passwordHash, year, branch]
        );

        const user = {
            id: result.insertId,
            name,
            email,
            role: 'student'
        };

        sendAuthCookie(res, user);

        res.status(201).json({
            message: 'Registration successful.',
            user
        });
    } catch (error) {
        console.error('REGISTER ERROR:', error);
        res.status(500).json({ message: 'Unable to register right now.' });
    }
});

app.post('/api/auth/login', async (req, res) => {
    try {
        const email = cleanText(req.body.email, 255).toLowerCase();
        const password = req.body.password;

        if (!email || !password) {
            return res.status(400).json({ message: 'Email and password are required.' });
        }

        const [rows] = await db.query(
            `SELECT id, name, email, password_hash, year, branch, role
             FROM users WHERE email = ?`,
            [email]
        );

        if (rows.length === 0) {
            return res.status(401).json({ message: 'Invalid email or password.' });
        }

        const user = rows[0];
        const passwordMatches = await bcrypt.compare(password, user.password_hash);

        if (!passwordMatches) {
            return res.status(401).json({ message: 'Invalid email or password.' });
        }

        sendAuthCookie(res, user);

        res.json({
            message: 'Login successful.',
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                year: user.year,
                branch: user.branch,
                role: user.role
            }
        });
    } catch (error) {
        console.error('LOGIN ERROR:', error);
        res.status(500).json({ message: 'Unable to login right now.' });
    }
});

app.get('/api/auth/me', authRequired, (req, res) => {
    res.json({ user: req.user });
});

app.post('/api/auth/logout', (req, res) => {
    res.clearCookie('token');
    res.json({ message: 'Logged out successfully.' });
});

// ---------------- SOCIETIES ----------------

app.get('/api/societies', async (req, res) => {
    try {
        const search = cleanText(req.query.search, 100);
        const category = cleanText(req.query.category, 100);

        let sql = `
            SELECT id, name, category, tagline, description, criteria, roles, deadline, created_at
            FROM societies
            WHERE 1 = 1
        `;
        const params = [];

        if (search) {
            sql += ' AND (name LIKE ? OR tagline LIKE ? OR description LIKE ?)';
            const pattern = `%${search}%`;
            params.push(pattern, pattern, pattern);
        }

        if (category && category !== 'All') {
            sql += ' AND category = ?';
            params.push(category);
        }

        sql += ' ORDER BY deadline ASC, name ASC';

        const [rows] = await db.query(sql, params);
        res.json({ societies: rows });
    } catch (error) {
        console.error('SOCIETY LIST ERROR:', error);
        res.status(500).json({ message: 'Unable to load societies.' });
    }
});

app.get('/api/societies/:id', async (req, res) => {
    try {
        const [rows] = await db.query(
            `SELECT id, name, category, tagline, description, criteria, roles, deadline, created_at
             FROM societies WHERE id = ?`,
            [req.params.id]
        );

        if (rows.length === 0) {
            return res.status(404).json({ message: 'Society not found.' });
        }

        res.json({ society: rows[0] });
    } catch (error) {
        console.error('SOCIETY DETAILS ERROR:', error);
        res.status(500).json({ message: 'Unable to load society details.' });
    }
});

app.post('/api/societies', authRequired, adminOnly, async (req, res) => {
    try {
        const validated = validateSocietyInput(req.body);
        if (validated.error) {
            return res.status(400).json({ message: validated.error });
        }

        const { name, category, tagline, description, criteria, roles, deadline } = validated.value;

        const [existing] = await db.query(
            'SELECT id FROM societies WHERE name = ?',
            [name]
        );

        if (existing.length > 0) {
            return res.status(409).json({ message: 'A society with this name already exists.' });
        }

        const [result] = await db.query(
            `INSERT INTO societies (name, category, tagline, description, criteria, roles, deadline)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [name, category, tagline, description, criteria, roles, deadline]
        );

        res.status(201).json({
            message: 'Society created successfully.',
            id: result.insertId
        });
    } catch (error) {
        console.error('SOCIETY CREATE ERROR:', error);
        res.status(500).json({ message: 'Unable to create society.' });
    }
});

app.put('/api/societies/:id', authRequired, adminOnly, async (req, res) => {
    try {
        const validated = validateSocietyInput(req.body);
        if (validated.error) {
            return res.status(400).json({ message: validated.error });
        }

        const { name, category, tagline, description, criteria, roles, deadline } = validated.value;

        const [result] = await db.query(
            `UPDATE societies
             SET name = ?, category = ?, tagline = ?, description = ?, criteria = ?, roles = ?, deadline = ?
             WHERE id = ?`,
            [name, category, tagline, description, criteria, roles, deadline, req.params.id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Society not found.' });
        }

        res.json({ message: 'Society updated successfully.' });
    } catch (error) {
        console.error('SOCIETY UPDATE ERROR:', error);
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ message: 'Another society already uses this name.' });
        }
        res.status(500).json({ message: 'Unable to update society.' });
    }
});

app.delete('/api/societies/:id', authRequired, adminOnly, async (req, res) => {
    try {
        const [result] = await db.query(
            'DELETE FROM societies WHERE id = ?',
            [req.params.id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Society not found.' });
        }

        res.json({ message: 'Society deleted successfully.' });
    } catch (error) {
        console.error('SOCIETY DELETE ERROR:', error);
        res.status(500).json({ message: 'Unable to delete society.' });
    }
});

// ---------------- APPLICATIONS ----------------

app.post('/api/applications', authRequired, studentOnly, async (req, res) => {
    try {
        const societyId = Number(req.body.societyId);
        const role = cleanText(req.body.role, 100);
        const whyYou = cleanText(req.body.whyYou, 3000);

        if (!Number.isInteger(societyId) || !role || !whyYou) {
            return res.status(400).json({ message: 'Society, role and motivation are required.' });
        }

        const [societyRows] = await db.query(
            'SELECT id, name, deadline FROM societies WHERE id = ?',
            [societyId]
        );

        if (societyRows.length === 0) {
            return res.status(404).json({ message: 'Society not found.' });
        }

        const deadline = new Date(societyRows[0].deadline);

        if (Number.isNaN(deadline.getTime()) || deadline.getTime() <= Date.now()) {
            return res.status(400).json({ message: 'Applications for this society are closed.' });
        }

        const [existing] = await db.query(
            `SELECT id FROM applications
             WHERE user_id = ? AND society_id = ?`,
            [req.user.id, societyId]
        );

        if (existing.length > 0) {
            return res.status(409).json({ message: 'You have already applied to this society.' });
        }

        await db.query(
            `INSERT INTO applications (user_id, society_id, role, why_you)
             VALUES (?, ?, ?, ?)`,
            [req.user.id, societyId, role, whyYou]
        );

        res.status(201).json({ message: `Application submitted to ${societyRows[0].name}.` });
    } catch (error) {
        console.error('APPLICATION CREATE ERROR:', error);
        res.status(500).json({ message: 'Unable to submit application.' });
    }
});

app.get('/api/applications/my', authRequired, studentOnly, async (req, res) => {
    try {
        const [rows] = await db.query(
            `SELECT
                a.id,
                a.role,
                a.why_you,
                a.status,
                a.applied_at,
                s.id AS society_id,
                s.name AS society_name,
                s.category,
                s.deadline
             FROM applications a
             INNER JOIN societies s ON s.id = a.society_id
             WHERE a.user_id = ?
             ORDER BY a.applied_at DESC`,
            [req.user.id]
        );

        res.json({ applications: rows });
    } catch (error) {
        console.error('MY APPLICATIONS ERROR:', error);
        res.status(500).json({ message: 'Unable to load your applications.' });
    }
});

app.get('/api/societies/:id/applicants', authRequired, adminOnly, async (req, res) => {
    try {
        const [rows] = await db.query(
            `SELECT
                a.id,
                a.role,
                a.why_you,
                a.status,
                a.applied_at,
                u.id AS user_id,
                u.name,
                u.email,
                u.year,
                u.branch,
                s.name AS society_name
             FROM applications a
             INNER JOIN users u ON u.id = a.user_id
             INNER JOIN societies s ON s.id = a.society_id
             WHERE a.society_id = ?
             ORDER BY a.applied_at DESC`,
            [req.params.id]
        );

        res.json({ applicants: rows });
    } catch (error) {
        console.error('APPLICANT LIST ERROR:', error);
        res.status(500).json({ message: 'Unable to load applicants.' });
    }
});

app.patch('/api/applications/:id/status', authRequired, adminOnly, async (req, res) => {
    try {
        const status = cleanText(req.body.status, 20);
        const allowedStatuses = ['Pending', 'Accepted', 'Rejected'];

        if (!allowedStatuses.includes(status)) {
            return res.status(400).json({ message: 'Invalid application status.' });
        }

        const [result] = await db.query(
            'UPDATE applications SET status = ? WHERE id = ?',
            [status, req.params.id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Application not found.' });
        }

        res.json({ message: `Application marked as ${status}.` });
    } catch (error) {
        console.error('STATUS UPDATE ERROR:', error);
        res.status(500).json({ message: 'Unable to update application status.' });
    }
});

// Friendly fallback so / opens the homepage.
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

app.listen(PORT, async () => {
    console.log(`SocietyNest server running at http://localhost:${PORT}`);
    try {
        const connection = await db.getConnection();
        connection.release();
        console.log('MySQL connection successful.');
    } catch (error) {
        console.error('MySQL connection failed:', error.message);
        console.error('Check DB_HOST, DB_USER, DB_PASSWORD, DB_NAME and DB_PORT in .env.');
    }
});
