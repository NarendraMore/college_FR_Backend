// const express = require('express');
// const jwt = require('jsonwebtoken');
// const bcrypt = require('bcryptjs');
// const registration = require('../models/registration');
// const router = express.Router();

// // JWT Secret Key
// const JWT_SECRET = 'a7f7c09c6df836ef4a4a73b37e3fd2a0132f7e6e92a33debedb6395d56911ff8';

// // Login API
// router.post('/login', async (req, res) => {
//     try {
//         const { email, password } = req.body;

//         // Check if user exists
//         const user = await registration.findOne({ email });
//         if (!user) {
//             return res.status(401).json({ error: 'Invalid email or password' });
//         }
//         console.log("Login Request Received:", req.body);


//         // Compare hashed password
//         const isMatch = await bcrypt.compare(password, user.password);
//         if (!isMatch) {
//             return res.status(401).json({ error: 'Invalid email or password' });
//         }

//         // Define user role (admin or business user)
//         const role = email.includes('@admin.com') ? 'admin' : 'business_user';

//         // Generate JWT token
//         const token = jwt.sign(
//             { userId: user._id, email: user.email, role },
//             JWT_SECRET,
//             { expiresIn: '1h' }
//         );

//         res.json({ message: 'Login successful', token, role });
//     } catch (error) {
//         res.status(500).json({ error: 'Server error' });
//     }
// });


// module.exports = router;
const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const registration = require('../models/registration');
const router = express.Router();

// JWT Secret Key
const JWT_SECRET = 'a7f7c09c6df836ef4a4a73b37e3fd2a0132f7e6e92a33debedb6395d56911ff8';

// JWT verification function (middleware)
function verifyToken(req, res, next) {
    const token = req.headers['authorization'];

    if (!token) {
        return res.status(403).json({ error: 'Access denied. No token provided.' });
    }

    // Extract the token from the Authorization header
    jwt.verify(token.split(' ')[1], JWT_SECRET, (err, decoded) => {
        if (err) {
            return res.status(401).json({ error: 'Invalid or expired token.' });
        }
        req.user = decoded; // Attach the decoded user data to the request object
        next(); // Proceed to the next middleware or route handler
    });
}

// Login API
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // Check if user exists
        const user = await registration.findOne({ email });
        if (!user) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }
        console.log("Login Request Received:", req.body);

        // Compare hashed password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        // Define user role (admin or business user)
        const role = email.includes('@admin.com') ? 'admin' : 'business_user';

        // Generate JWT token
        const token = jwt.sign(
            { userId: user._id, email: user.email, role },
            JWT_SECRET,
            { expiresIn: '1h' }
        );

        res.json({ message: 'Login successful', token, role });
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Example of a protected route
router.get('/profile', verifyToken, async (req, res) => {
    try {
        const userId = req.user.userId; // Access userId from the decoded token
        const user = await registration.findById(userId);

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({ message: 'User profile', user });
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
