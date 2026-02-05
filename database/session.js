const session = require('express-session');

// Simple memory store for development
const sessionConfig = {
    secret: process.env.SESSION_SECRET || 'studyconnect-secret-key-change-in-production',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false, // Set to true in production with HTTPS
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000, // 1 day
        sameSite: 'lax'
    },
    name: 'studyconnect.sid',
    store: new session.MemoryStore() // Use memory store for now
};

module.exports = session(sessionConfig);