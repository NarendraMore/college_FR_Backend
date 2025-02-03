const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/users.js'); // Import User model

const router = new express.Router();
const SECRET_KEY = "s3cUr3@JWT!K3y#9876543210$%^&*()"; // Strong Secret Key

// Admin & Business User Login
router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        // Check if user exists
        const user = await User.findOne({ email });
        if (!user) return res.status(404).json({ message: 'User not found' });

        // Validate password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ message: 'Invalid credentials' });

        // Generate JWT Token
        const token = jwt.sign({ id: user._id, role: user.role }, SECRET_KEY, { expiresIn: '1h' });

        res.json({ token, role: user.role });
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});

// Middleware to verify JWT token
const authenticateJWT = (req, res, next) => {
    const token = req.header('Authorization');
    if (!token) return res.status(401).json({ message: 'Access denied' });

    try {
        const decoded = jwt.verify(token, SECRET_KEY);
        req.user = decoded;
        next();
    } catch (err) {
        res.status(401).json({ message: 'Invalid token' });
    }
};

// Protected Route for Admin
router.get('/admin/dashboard', authenticateJWT, (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ message: 'Access denied' });
    res.json({ message: 'Welcome Admin!' });
});

// Protected Route for Business Users
router.get('/business/dashboard', authenticateJWT, (req, res) => {
    if (req.user.role !== 'business') return res.status(403).json({ message: 'Access denied' });
    res.json({ message: 'Welcome Business User!' });
});

module.exports = router;
