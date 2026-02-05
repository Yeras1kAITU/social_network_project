const express = require('express');
const router = express.Router();
const User = require('../database/models/User');
const { redirectIfAuthenticated } = require('../middleware/auth');
const path = require('path');
const fs = require('fs');

async function ensureUserModelInitialized() {
    console.log('Checking if User model is initialized...');
    if (!User.collection) {
        console.log('User model not initialized, attempting to initialize...');
        try {
            await User.initialize();
            console.log('User.initialize() completed');
            console.log('User.collection after initialize:', !!User.collection);

            if (!User.collection) {
                console.error('User model failed to initialize - collection is still null');
                throw new Error('User model failed to initialize');
            }
        } catch (error) {
            console.error('Failed to initialize User model:', error);
            console.error('Error details:', error.message, error.stack);
            throw new Error('Authentication service unavailable. Please try again.');
        }
    } else {
        console.log('User model already initialized');
    }
}

// Helper function to render HTML with data
function renderHTML(filePath, data = {}) {
    let html = fs.readFileSync(filePath, 'utf8');

    // Simple template replacement
    Object.keys(data).forEach(key => {
        const regex = new RegExp(`<%= ${key} %>`, 'g');
        html = html.replace(regex, data[key] || '');
    });

    // Remove any remaining template tags
    html = html.replace(/<%= .*? %>/g, '');

    return html;
}

// Render login page
router.get('/login', redirectIfAuthenticated, (req, res) => {
    const html = renderHTML(path.join(__dirname, '../views/auth/login.html'), {
        error: req.session.error || '',
        success: req.session.success || ''
    });

    res.send(html);
    delete req.session.error;
    delete req.session.success;
});

router.post('/login', async (req, res) => {
    try {
        await ensureUserModelInitialized();

        const { emailOrUsername, password } = req.body;

        console.log('Login attempt with:', { emailOrUsername, passwordLength: password?.length });

        if (!emailOrUsername || !password) {
            req.session.error = 'Email/Username and password are required';
            return res.redirect('/auth/login');
        }

        const result = await User.authenticate(emailOrUsername, password);

        if (result.success) {
            req.session.user = result.user;
            req.session.success = 'Successfully logged in!';
            const returnTo = req.session.returnTo || '/';
            delete req.session.returnTo;
            return res.redirect(returnTo);
        }
    } catch (error) {
        console.error('Login error details:', {
            message: error.message,
            stack: error.stack
        });
        req.session.error = error.message || 'Authentication failed';
        res.redirect('/auth/login');
    }
});

// Render registration page
router.get('/register', redirectIfAuthenticated, (req, res) => {
    const formData = req.session.formData || {};
    const html = renderHTML(path.join(__dirname, '../views/auth/register.html'), {
        error: req.session.error || '',
        formData: formData
    });

    res.send(html);
    delete req.session.error;
    delete req.session.formData;
});

// Handle registration form submission
router.post('/register', async (req, res) => {
    console.log('=== REGISTRATION ATTEMPT ===');
    console.log('Form data:', req.body);

    try {
        await ensureUserModelInitialized();
        console.log('User model initialized, collection exists:', !!User.collection);

        const { name, email, username, password, confirmPassword } = req.body;

        // Store form data in session for re-population
        req.session.formData = { name, email, username };

        // Validation
        if (!name || !email || !username || !password || !confirmPassword) {
            console.log('Validation failed: Missing fields');
            req.session.error = 'All fields are required';
            return res.redirect('/auth/register');
        }

        if (password !== confirmPassword) {
            console.log('Validation failed: Passwords do not match');
            req.session.error = 'Passwords do not match';
            return res.redirect('/auth/register');
        }

        if (password.length < 6) {
            console.log('Validation failed: Password too short');
            req.session.error = 'Password must be at least 6 characters';
            return res.redirect('/auth/register');
        }

        // Create user
        console.log('Attempting to create user...');
        const result = await User.createUser({
            name,
            email,
            username,
            password,
            role: 'student'
        });

        console.log('User creation result:', result);

        if (result.success) {
            console.log('User created successfully, attempting auto-login...');
            // Auto-login after registration
            const authResult = await User.authenticate(email, password);

            if (authResult.success) {
                req.session.user = authResult.user;
                req.session.success = 'Account created successfully! Welcome to StudyConnect!';
                delete req.session.formData;
                console.log('Auto-login successful, redirecting to home');
                return res.redirect('/');
            } else {
                console.log('Auto-login failed:', authResult);
                req.session.success = 'Account created! Please log in.';
                return res.redirect('/auth/login');
            }
        } else {
            console.log('User creation failed:', result);
            req.session.error = 'Failed to create account';
            return res.redirect('/auth/register');
        }
    } catch (error) {
        console.error('=== REGISTRATION ERROR ===');
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
        req.session.error = error.message || 'Registration failed';
        res.redirect('/auth/register');
    }
});

router.get('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error('Error destroying session:', err);
        }
        res.redirect('/');
    });
});

// routes/auth.js - update profile route
router.get('/profile', async (req, res) => {
    if (!req.session.user) {
        req.session.returnTo = '/auth/profile';
        return res.redirect('/auth/login');
    }

    try {
        await ensureUserModelInitialized();
        const user = await User.getUserById(req.session.user.id);

        if (!user) {
            req.session.error = 'User not found';
            return res.redirect('/');
        }

        const html = renderHTML(path.join(__dirname, '../views/auth/profile.html'), {
            user: JSON.stringify(user).replace(/"/g, '&quot;'),
            success: req.session.success || '',
            error: req.session.error || ''
        });

        res.send(html);
        delete req.session.success;
        delete req.session.error;
    } catch (error) {
        console.error('Error fetching profile:', error);
        req.session.error = 'Error loading profile';
        res.redirect('/');
    }
});

// Update profile
router.post('/profile/update', async (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ success: false, error: 'Not authenticated' });
    }

    try {
        const { name, bio, university, major, year } = req.body;
        const updateData = {
            name,
            profile: { bio, university, major, year }
        };

        const updated = await User.updateUser(req.session.user.id, updateData);

        if (updated) {
            // Update session user data
            req.session.user.name = name;
            req.session.success = 'Profile updated successfully';
            res.json({ success: true, message: 'Profile updated' });
        } else {
            res.status(400).json({ success: false, error: 'Failed to update profile' });
        }
    } catch (error) {
        console.error('Error updating profile:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Change password
router.post('/profile/change-password', async (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ success: false, error: 'Not authenticated' });
    }

    try {
        const { currentPassword, newPassword, confirmPassword } = req.body;

        if (newPassword !== confirmPassword) {
            return res.status(400).json({
                success: false,
                error: 'New passwords do not match'
            });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({
                success: false,
                error: 'New password must be at least 6 characters'
            });
        }

        const changed = await User.changePassword(
            req.session.user.id,
            currentPassword,
            newPassword
        );

        if (changed) {
            req.session.success = 'Password changed successfully';
            res.json({ success: true, message: 'Password changed' });
        }
    } catch (error) {
        console.error('Error changing password:', error);
        res.status(400).json({ success: false, error: error.message });
    }
});

module.exports = router;