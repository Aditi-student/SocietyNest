// auth.js
// Middleware used to protect student and admin routes.

const jwt = require('jsonwebtoken');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

function authRequired(req, res, next) {
    const token = req.cookies?.token;

    if (!token) {
        return res.status(401).json({ message: 'Authentication required.' });
    }

    try {
        req.user = jwt.verify(token, process.env.JWT_SECRET);
        next();
    } catch (error) {
        return res.status(401).json({ message: 'Session expired. Please login again.' });
    }
}

function adminOnly(req, res, next) {
    if (req.user?.role !== 'admin') {
        return res.status(403).json({ message: 'Admin access required.' });
    }
    next();
}

function studentOnly(req, res, next) {
    if (req.user?.role !== 'student') {
        return res.status(403).json({ message: 'Student access required.' });
    }
    next();
}

module.exports = { authRequired, adminOnly, studentOnly };
