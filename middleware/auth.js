// middleware/auth.js
const User = require('../database/models/User');

// Check if user is authenticated
function requireAuth(req, res, next) {
    if (!req.session.user) {
        req.session.returnTo = req.originalUrl;
        return res.redirect('/auth/login');
    }
    next();
}

// Check if user has specific role
function requireRole(role) {
    return function(req, res, next) {
        if (!req.session.user) {
            req.session.returnTo = req.originalUrl;
            return res.redirect('/auth/login');
        }

        if (req.session.user.role !== role && req.session.user.role !== 'admin') {
            return res.status(403).send('Access denied');
        }

        next();
    };
}

// Redirect if already authenticated
function redirectIfAuthenticated(req, res, next) {
    if (req.session.user) {
        return res.redirect('/');
    }
    next();
}

// Inject user data into views
function injectUser(req, res, next) {
    res.locals.user = req.session.user;
    res.locals.isAuthenticated = !!req.session.user;
    next();
}

module.exports = {
    requireAuth,
    requireRole,
    redirectIfAuthenticated,
    injectUser
};