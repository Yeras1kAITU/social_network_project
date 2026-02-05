require('dotenv').config();

const express = require('express');
const path = require('path');
const fs = require('fs');
const { mongoDBManager, ObjectId } = require('./database/mongo');
const sessionMiddleware = require('./database/session');
const authRouter = require('./routes/auth');
const { requireAuth, requireRole, injectUser } = require('./middleware/auth');
const User = require('./database/models/User');

const app = express();
const PORT = process.env.PORT || 3000;
const HOST = '0.0.0.0';
const isProduction = process.env.NODE_ENV === 'production';

let postsCollection;
let isDatabaseReady = false;

console.log(`---Starting StudyConnect Server`);
console.log(`Environment: ${isProduction ? 'PRODUCTION' : 'DEVELOPMENT'}`);
console.log(`Server: http://${HOST}:${PORT}`);

// Middleware to wait for database initialization
app.use((req, res, next) => {
    // Allow static files, home page, and health checks even when DB is not ready
    if (req.path.startsWith('/stylesheets') ||
        req.path === '/health' ||
        req.path === '/' ||
        req.path === '/favicon.ico') {
        return next();
    }

    // For auth routes, check if database is ready
    if (req.path.startsWith('/auth') && !isDatabaseReady) {
        const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Initializing - StudyConnect</title>
            <link rel="stylesheet" href="/stylesheets/style.css">
            <style>
                .loading-container {
                    text-align: center;
                    padding: 100px 20px;
                }
                .loading-spinner {
                    border: 4px solid rgba(255,255,255,0.1);
                    border-radius: 50%;
                    border-top: 4px solid var(--accent-color);
                    width: 40px;
                    height: 40px;
                    animation: spin 1s linear infinite;
                    margin: 30px auto;
                }
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="loading-container">
                    <h1>Initializing Database...</h1>
                    <p>Please wait while we establish the database connection.</p>
                    <div class="loading-spinner"></div>
                    <p><small>This should only take a few seconds</small></p>
                </div>
            </div>
        </body>
        </html>
        `;
        return res.status(503).send(html);
    }

    next();
});

function renderWithNav(templatePath, req) {
    let html = fs.readFileSync(templatePath, 'utf8');
    return renderWithNavFromString(html, req);
}

function renderWithNavFromString(html, req) {
    const isAuthenticated = !!req.session.user;

    // Define navigation templates
    const authenticatedNav = `
    <ul class="nav-links">
        <li><a href="/"><i class="fas fa-home"></i> Home</a></li>
        <li><a href="/about"><i class="fas fa-info-circle"></i> About</a></li>
        <li><a href="/contact"><i class="fas fa-envelope"></i> Contact</a></li>
        <li><a href="/search"><i class="fas fa-search"></i> Search</a></li>
        <li><a href="/crud"><i class="fas fa-database"></i> CRUD</a></li>
        <li><a href="/api-docs"><i class="fas fa-code"></i> API Docs</a></li>
        <li><a href="/auth/profile"><i class="fas fa-user"></i> Profile</a></li>
        <li><a href="/auth/logout" class="btn-exit"><i class="fas fa-sign-out-alt"></i> Logout</a></li>
    </ul>`;

    const unauthenticatedNav = `
    <ul class="nav-links">
        <li><a href="/"><i class="fas fa-home"></i> Home</a></li>
        <li><a href="/about"><i class="fas fa-info-circle"></i> About</a></li>
        <li><a href="/contact"><i class="fas fa-envelope"></i> Contact</a></li>
        <li><a href="/auth/login"><i class="fas fa-sign-in-alt"></i> Login</a></li>
        <li><a href="/auth/register"><i class="fas fa-user-plus"></i> Register</a></li>
    </ul>`;

    const navToUse = isAuthenticated ? authenticatedNav : unauthenticatedNav;

    // Replace ALL instances of navigation in the HTML
    // Multiple regex patterns to catch different HTML structures

    // Pattern 1: Direct <ul class="nav-links">...</ul>
    html = html.replace(/<ul class="nav-links">[\s\S]*?<\/ul>/g, navToUse);

    // Pattern 2: Inside <nav> tags
    html = html.replace(/<nav>[\s\S]*?<\/nav>/g, `<nav>${navToUse}</nav>`);

    // Pattern 3: Inside header with specific structure
    html = html.replace(/<header[^>]*>[\s\S]*?<nav>[\s\S]*?<\/nav>[\s\S]*?<\/header>/g, (match) => {
        return match.replace(/<nav>[\s\S]*?<\/nav>/, `<nav>${navToUse}</nav>`);
    });

    return html;
}


app.use((req, res, next) => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${req.method} ${req.url}`);
    next();
});

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(sessionMiddleware);
app.use(injectUser);

// Simple health check that works during initialization
app.get('/health', (req, res) => {
    res.json({
        status: isDatabaseReady ? 'ready' : 'initializing',
        database: mongoDBManager.db ? 'connected' : 'connecting',
        timestamp: new Date().toISOString()
    });
});

async function initializeDatabase() {
    try {
        console.log('Initializing database connection...');
        await mongoDBManager.connect();

        console.log('Initializing User model...');
        await User.initialize();

        console.log('Seeding admin user...');
        await User.seedAdminUser();

        postsCollection = mongoDBManager.getCollection('posts');
        isDatabaseReady = true;

        console.log('✅ Database initialization complete');

    } catch (error) {
        console.error('❌ Database initialization failed:', error);
        console.log('Running in limited mode');
        postsCollection = mongoDBManager.getCollection('posts');
        isDatabaseReady = true; // Still allow server to run
    }
}

// Initialize database and then start the server
initializeDatabase().then(() => {
    console.log('Setting up routes...');

    // Auth routes
    app.use('/auth', authRouter);

    // API Health Check
    app.get('/api/health', async (req, res) => {
        try {
            const dbHealth = mongoDBManager.db ? await mongoDBManager.healthCheck() : {
                healthy: false,
                message: 'Database not initialized'
            };
            res.status(200).json({
                status: 'OK',
                timestamp: new Date().toISOString(),
                environment: process.env.NODE_ENV || 'development',
                database: dbHealth,
                uptime: process.uptime(),
                mode: mongoDBManager.db ? 'connected' : 'fallback'
            });
        } catch (error) {
            res.status(500).json({
                status: 'ERROR',
                error: error.message
            });
        }
    });

    app.get('/debug/db-status', async (req, res) => {
        try {
            const dbStatus = {
                isDatabaseReady: isDatabaseReady,
                dbConnected: !!mongoDBManager.db,
                mongoURI: process.env.MONGODB_URI ? 'Set (hidden for security)' : 'Not set',
                usersCollection: mongoDBManager.db ? !!mongoDBManager.db.collection('users') : false
            };

            if (mongoDBManager.db) {
                const usersCount = await mongoDBManager.db.collection('users').countDocuments();
                dbStatus.usersCount = usersCount;
            }

            res.json(dbStatus);
        } catch (error) {
            res.json({ error: error.message });
        }
    });

    // Add this test route to server.js temporarily
    app.get('/test-users', async (req, res) => {
        try {
            const users = await mongoDBManager.getCollection('users').find().toArray();
            res.json({
                count: users.length,
                users: users.map(u => ({
                    id: u._id,
                    email: u.email,
                    username: u.username,
                    role: u.role,
                    isActive: u.isActive,
                    hasPassword: !!u.password
                }))
            });
        } catch (error) {
            res.json({ error: error.message });
        }
    });

    // API Test
    app.get('/api/test', (req, res) => {
        res.status(200).json({
            message: 'API is working!',
            timestamp: new Date().toISOString()
        });
    });

    // Test database connection route
    app.get('/test-db', async (req, res) => {
        try {
            const collection = mongoDBManager.getCollection('users');
            const count = await collection.countDocuments();
            res.json({
                success: true,
                message: `Database connected. Users collection has ${count} documents.`
            });
        } catch (error) {
            res.json({
                success: false,
                error: error.message,
                stack: error.stack
            });
        }
    });

    // CRUD page - FIXED: Use renderWithNav instead of sendFile
    app.get('/crud', requireAuth, (req, res) => {
        const html = renderWithNav(path.join(__dirname, 'views', 'crud.html'), req);
        res.send(html);
    });

    // API Docs page - FIXED: Use renderWithNav instead of sendFile
    app.get('/api-docs', requireAuth, (req, res) => {
        const html = renderWithNav(path.join(__dirname, 'views', 'api-docs.html'), req);
        res.send(html);
    });

    // Home page
    app.get('/', (req, res) => {
        let html = renderWithNav(path.join(__dirname, 'views', 'index.html'), req);

        if (isProduction) {
            html = html.replace(
                '</footer>',
                `<div style="margin-top: 2rem; padding: 1rem; background: rgba(56, 178, 172, 0.1); border-radius: 8px; border: 1px solid rgba(56, 178, 172, 0.2);">
                <h4 style="color: var(--accent-color); margin-bottom: 0.5rem;">
                    <i class="fas fa-cloud"></i> Production Deployment
                </h4>
                <p style="color: var(--text-secondary); font-size: 0.9rem; margin: 0;">
                    This application is deployed in a production environment. All data is persisted in MongoDB Atlas.
                </p>
            </div>
            </footer>`
            );
        }

        res.send(html);
    });

    // About page
    app.get('/about', (req, res) => {
        const html = renderWithNav(path.join(__dirname, 'views', 'about.html'), req);
        res.send(html);
    });

    // Contact page
    app.get('/contact', (req, res) => {
        const html = renderWithNav(path.join(__dirname, 'views', 'contact.html'), req);
        res.send(html);
    });

    // Contact success page
    app.get('/contact-success', (req, res) => {
        const html = renderWithNav(path.join(__dirname, 'views', 'contact-success.html'), req);
        res.send(html);
    });

    // Status page - FIXED: Use renderWithNav
// Status page
    app.get('/status', (req, res) => {
        let html = fs.readFileSync(path.join(__dirname, 'views', 'status.html'), 'utf8');

        // Replace template variables
        html = html.replace(/<%= isProduction %>/g, isProduction);
        html = html.replace(/<%= dbConnected %>/g, !!mongoDBManager.db);
        html = html.replace(/<%= PORT %>/g, PORT);
        html = html.replace(/<%= NODE_ENV %>/g, process.env.NODE_ENV || 'development');

        // Apply navigation
        html = renderWithNavFromString(html, req);
        res.send(html);
    });

    // Ensure posts collection is available
    async function ensurePostsCollection() {
        if (!postsCollection) {
            throw new Error('Database collection not available');
        }
        return postsCollection;
    }

    // Posts API - FIXED: Removed duplicate response
    app.get('/api/posts', async (req, res) => {
        if (!mongoDBManager.db) {
            return res.status(503).json({
                success: false,
                error: 'Database not connected',
                message: 'Please try again later'
            });
        }

        try {
            const collection = await ensurePostsCollection();
            const {
                category,
                author,
                title,  // Add title parameter
                limit = 50,
                offset = 0,
                sortBy = 'created_at',
                sortOrder = 'desc',
                fields
            } = req.query;

            const filter = { is_published: true };

            if (category) filter.category = category;
            if (author) filter.author = author;
            if (title) filter.title = { $regex: title, $options: 'i' }; // Add title filter with regex for partial match

            const projection = {};
            if (fields) {
                const fieldList = fields.split(',');
                fieldList.forEach(field => {
                    projection[field.trim()] = 1;
                });
            }

            const sort = {};
            sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

            const cursor = collection
                .find(filter)
                .project(projection)
                .sort(sort)
                .skip(parseInt(String(offset)))
                .limit(parseInt(String(limit)));

            const posts = await cursor.toArray();
            const total = await collection.countDocuments(filter);

            res.status(200).json({
                success: true,
                count: posts.length,
                total,
                offset: parseInt(String(offset)),
                limit: parseInt(String(limit)),
                data: posts
            });
        } catch (error) {
            console.error('Error fetching posts:', error);
            // Ensure JSON response even on error
            res.status(500).json({
                success: false,
                error: 'Internal server error',
                message: error.message
            });
        }
    });

    app.post('/api/posts', requireAuth, async (req, res) => {
        const postData = {
            ...req.body,
            userId: req.session.user.id, // Add user reference
            userRole: req.session.user.role
        };
        try {
            const { title, content, author, category = 'general' } = req.body;

            if (!title || !content || !author) {
                return res.status(400).json({
                    success: false,
                    error: 'Missing required fields. Title, content, and author are required.'
                });
            }

            if (title.length < 3 || title.length > 200) {
                return res.status(400).json({
                    success: false,
                    error: 'Title must be between 3 and 200 characters'
                });
            }

            if (content.length < 10) {
                return res.status(400).json({
                    success: false,
                    error: 'Content must be at least 10 characters'
                });
            }

            const collection = await ensurePostsCollection();
            const lastPost = await postsCollection
                .find()
                .sort({ postId: -1 })
                .limit(1)
                .toArray();

            let nextPostId = 1;

            if (lastPost.length > 0 && lastPost[0].postId) {
                nextPostId = lastPost[0].postId + 1;
            } else {
                const allPosts = await postsCollection.find().toArray();
                if (allPosts.length > 0) {
                    nextPostId = allPosts.length + 1;
                }
            }

            const newPost = {
                postId: nextPostId,
                title,
                content,
                author,
                category,
                likes: 0,
                created_at: new Date(),
                updated_at: new Date(),
                is_published: true
            };


            const result = await collection.insertOne(newPost);

            const insertedPost = await collection.findOne({
                _id: result.insertedId
            });

            res.status(201).json({
                success: true,
                message: 'Post created successfully',
                data: insertedPost
            });
        } catch (error) {
            console.error('Error creating post:', error);
            res.status(500).json({
                success: false,
                error: 'Internal server error'
            });
        }
    });

    app.put('/api/posts/:id', requireAuth, async (req, res) => {
        try {
            const id = req.params.id;
            let query;
            let updateId;

            if (ObjectId.isValid(id)) {
                query = { _id: new ObjectId(id) };
                updateId = new ObjectId(id);
            }
            else if (!isNaN(parseInt(id, 10))) {
                const numericId = parseInt(id, 10);
                query = { postId: numericId };
                updateId = numericId;
            }
            else {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid post ID format'
                });
            }

            const collection = await ensurePostsCollection();
            const existingPost = await collection.findOne(query);

            if (!existingPost) {
                return res.status(404).json({
                    success: false,
                    error: `Post with ID ${id} not found`
                });
            }

            const { title, content, category, likes } = req.body;

            const updateData = { updated_at: new Date() };

            if (title !== undefined) {
                if (title.length < 3 || title.length > 200) {
                    return res.status(400).json({
                        success: false,
                        error: 'Title must be between 3 and 200 characters'
                    });
                }
                updateData.title = title;
            }

            if (content !== undefined) {
                if (content.length < 10) {
                    return res.status(400).json({
                        success: false,
                        error: 'Content must be at least 10 characters'
                    });
                }
                updateData.content = content;
            }

            if (category !== undefined) {
                updateData.category = category;
            }

            if (likes !== undefined) {
                if (isNaN(parseInt(likes))) {
                    return res.status(400).json({
                        success: false,
                        error: 'Likes must be a number'
                    });
                }
                updateData.likes = parseInt(likes);
            }

            if (Object.keys(updateData).length === 1) {
                return res.status(400).json({
                    success: false,
                    error: 'No fields provided for update'
                });
            }

            await collection.updateOne(
                query,
                { $set: updateData }
            );

            const updatedPost = await collection.findOne(query);

            res.status(200).json({
                success: true,
                message: 'Post updated successfully',
                data: updatedPost
            });
        } catch (error) {
            console.error('Error updating post:', error);
            res.status(500).json({
                success: false,
                error: 'Internal server error'
            });
        }
    });

    app.delete('/api/posts/:id', requireAuth, async (req, res) => {
        try {
            const id = req.params.id;
            let query;

            if (ObjectId.isValid(id)) {
                query = { _id: new ObjectId(id) };
            }
            else if (!isNaN(parseInt(id, 10))) {
                const numericId = parseInt(id, 10);
                query = { postId: numericId };
            }
            else {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid post ID format'
                });
            }

            const collection = await ensurePostsCollection();
            const existingPost = await collection.findOne(query);

            if (!existingPost) {
                return res.status(404).json({
                    success: false,
                    error: `Post with ID ${id} not found`
                });
            }

            await collection.updateOne(
                query,
                { $set: { is_published: false, updated_at: new Date() } }
            );

            res.status(200).json({
                success: true,
                message: `Post with ID ${id} deleted successfully`
            });
        } catch (error) {
            console.error('Error deleting post:', error);
            res.status(500).json({
                success: false,
                error: 'Internal server error'
            });
        }
    });

    app.get('/api/posts/categories', async (req, res) => {
        try {
            const collection = await ensurePostsCollection();
            const categories = await collection.aggregate([
                { $match: { is_published: true } },
                { $group: {
                        _id: "$category",
                        count: { $sum: 1 }
                    }},
                { $sort: { count: -1 } },
                { $project: {
                        category: "$_id",
                        count: 1,
                        _id: 0
                    }}
            ]).toArray();

            res.status(200).json({
                success: true,
                data: categories
            });
        } catch (error) {
            console.error('Error fetching categories:', error);
            res.status(500).json({
                success: false,
                error: 'Internal server error'
            });
        }
    });

    app.get('/api/posts/stats', async (req, res) => {
        try {
            const collection = await ensurePostsCollection();
            const totalPosts = await collection.countDocuments({ is_published: true });

            const totalLikesResult = await collection.aggregate([
                { $match: { is_published: true } },
                { $group: {
                        _id: null,
                        total: { $sum: "$likes" }
                    }}
            ]).toArray();

            const totalLikes = totalLikesResult[0]?.total || 0;

            const topAuthors = await collection.aggregate([
                { $match: { is_published: true } },
                { $group: {
                        _id: "$author",
                        post_count: { $sum: 1 },
                        total_likes: { $sum: "$likes" }
                    }},
                { $sort: { total_likes: -1 } },
                { $limit: 5 },
                { $project: {
                        author: "$_id",
                        post_count: 1,
                        total_likes: 1,
                        _id: 0
                    }}
            ]).toArray();

            res.status(200).json({
                success: true,
                data: {
                    totalPosts,
                    totalLikes,
                    topAuthors
                }
            });
        } catch (error) {
            console.error('Error fetching stats:', error);
            res.status(500).json({
                success: false,
                error: 'Internal server error'
            });
        }
    });

    app.get('/api/posts/:id', async (req, res) => {
        try {
            const id = req.params.id;
            let query;

            if (ObjectId.isValid(id)) {
                query = { _id: new ObjectId(id), is_published: true };
            }
            else if (!isNaN(parseInt(id, 10))) {
                const numericId = parseInt(id, 10);
                query = { postId: numericId, is_published: true };
            }
            else {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid post ID format'
                });
            }

            const collection = await ensurePostsCollection();
            const post = await collection.findOne(query);

            if (!post) {
                return res.status(404).json({
                    success: false,
                    error: `Post with ID ${id} not found`
                });
            }

            res.status(200).json({
                success: true,
                data: post
            });
        } catch (error) {
            console.error('Error fetching post:', error);
            res.status(500).json({
                success: false,
                error: 'Internal server error'
            });
        }
    });

    // Search page - FIXED: Use renderWithNav for search pages
    app.get('/search', requireAuth, async (req, res) => {
        const searchQuery = req.query.q;

        if (!searchQuery) {
            // Return search form HTML directly instead of reading from file
            const html = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Search - StudyConnect</title>
            <link rel="stylesheet" href="/stylesheets/style.css">
            <link rel="preconnect" href="https://fonts.googleapis.com">
            <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
            <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet">
            <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
        </head>
        <body>
        <div class="container">
            <header class="main-header">
                <div class="logo">StudyConnect</div>
                <nav>
                    ${req.session.user ? `
                    <ul class="nav-links">
                        <li><a href="/"><i class="fas fa-home"></i> Home</a></li>
                        <li><a href="/about"><i class="fas fa-info-circle"></i> About</a></li>
                        <li><a href="/contact"><i class="fas fa-envelope"></i> Contact</a></li>
                        <li><a href="/search" class="active"><i class="fas fa-search"></i> Search</a></li>
                        <li><a href="/crud"><i class="fas fa-database"></i> CRUD</a></li>
                        <li><a href="/api-docs"><i class="fas fa-code"></i> API Docs</a></li>
                        <li><a href="/auth/profile"><i class="fas fa-user"></i> Profile</a></li>
                        <li><a href="/auth/logout" class="btn-exit"><i class="fas fa-sign-out-alt"></i> Logout</a></li>
                    </ul>
                    ` : `
                    <ul class="nav-links">
                        <li><a href="/"><i class="fas fa-home"></i> Home</a></li>
                        <li><a href="/about"><i class="fas fa-info-circle"></i> About</a></li>
                        <li><a href="/contact"><i class="fas fa-envelope"></i> Contact</a></li>
                        <li><a href="/auth/login"><i class="fas fa-sign-in-alt"></i> Login</a></li>
                        <li><a href="/auth/register"><i class="fas fa-user-plus"></i> Register</a></li>
                    </ul>
                    `}
                </nav>
            </header>
            
            <main style="padding: 50px 2rem;">
                <div style="max-width: 800px; margin: 0 auto;">
                    <div style="background: var(--card-bg); padding: 3rem; border-radius: var(--border-radius); border: 1px solid var(--card-border); margin-bottom: 2rem; text-align: center;">
                        <h1 style="margin-bottom: 1rem;">Search StudyConnect</h1>
                        <p style="color: var(--text-secondary); margin-bottom: 2rem; font-size: 1.1rem;">
                            Find study materials, posts, and resources
                        </p>
                        
                        <form action="/search" method="GET" style="max-width: 600px; margin: 0 auto;">
                            <div style="display: flex; gap: 0.5rem; margin-bottom: 1.5rem;">
                                <input 
                                    type="text" 
                                    name="q" 
                                    placeholder="Search for posts, study materials, authors..." 
                                    style="flex: 1; padding: 1rem; background: var(--dark-bg); border: 1px solid var(--card-border); border-radius: 8px; color: var(--text-primary); font-size: 1rem;"
                                    required
                                >
                                <button type="submit" style="background: var(--accent-color); color: var(--dark-bg); border: none; padding: 1rem 2rem; border-radius: 8px; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 0.5rem;">
                                    <i class="fas fa-search"></i> Search
                                </button>
                            </div>
                        </form>
                        
                        <div style="margin-top: 2rem; display: flex; gap: 1rem; justify-content: center; flex-wrap: wrap;">
                            <a href="/search?q=programming" style="background: var(--dark-bg); color: var(--text-primary); padding: 0.5rem 1rem; border-radius: 20px; text-decoration: none; font-size: 0.9rem;">
                                #programming
                            </a>
                            <a href="/search?q=database" style="background: var(--dark-bg); color: var(--text-primary); padding: 0.5rem 1rem; border-radius: 20px; text-decoration: none; font-size: 0.9rem;">
                                #database
                            </a>
                            <a href="/search?q=javascript" style="background: var(--dark-bg); color: var(--text-primary); padding: 0.5rem 1rem; border-radius: 20px; text-decoration: none; font-size: 0.9rem;">
                                #javascript
                            </a>
                            <a href="/search?q=study+group" style="background: var(--dark-bg); color: var(--text-primary); padding: 0.5rem 1rem; border-radius: 20px; text-decoration: none; font-size: 0.9rem;">
                                #study-group
                            </a>
                        </div>
                    </div>
                    
                    <div style="background: var(--card-bg); padding: 2rem; border-radius: var(--border-radius); border: 1px solid var(--card-border);">
                        <h3 style="margin-bottom: 1rem;">Popular Searches</h3>
                        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 1.5rem;">
                            <div style="background: var(--dark-bg); padding: 1.5rem; border-radius: 8px;">
                                <h4 style="margin-bottom: 0.5rem; color: var(--accent-color);">
                                    <i class="fas fa-code"></i> Programming
                                </h4>
                                <p style="color: var(--text-secondary); font-size: 0.9rem;">
                                    JavaScript, Python, Java tutorials and code examples
                                </p>
                                <a href="/search?q=programming" style="color: var(--text-primary); text-decoration: none; font-size: 0.9rem; margin-top: 0.5rem; display: inline-block;">
                                    Search programming →
                                </a>
                            </div>
                            
                            <div style="background: var(--dark-bg); padding: 1.5rem; border-radius: 8px;">
                                <h4 style="margin-bottom: 0.5rem; color: var(--accent-color);">
                                    <i class="fas fa-database"></i> Database
                                </h4>
                                <p style="color: var(--text-secondary); font-size: 0.9rem;">
                                    SQL, MongoDB, database design and optimization
                                </p>
                                <a href="/search?q=database" style="color: var(--text-primary); text-decoration: none; font-size: 0.9rem; margin-top: 0.5rem; display: inline-block;">
                                    Search database →
                                </a>
                            </div>
                            
                            <div style="background: var(--dark-bg); padding: 1.5rem; border-radius: 8px;">
                                <h4 style="margin-bottom: 0.5rem; color: var(--accent-color);">
                                    <i class="fas fa-users"></i> Study Groups
                                </h4>
                                <p style="color: var(--text-secondary); font-size: 0.9rem;">
                                    Find and join study groups for your courses
                                </p>
                                <a href="/search?q=study+group" style="color: var(--text-primary); text-decoration: none; font-size: 0.9rem; margin-top: 0.5rem; display: inline-block;">
                                    Search groups →
                                </a>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
            
            <footer>
                <p>© 2025 StudyConnect - Social Network for Students</p>
            </footer>
        </div>
        
        <script>
            document.querySelectorAll('.nav-links a').forEach(link => {
                if (link.href === window.location.href) {
                    link.classList.add('active');
                }
            });
        </script>
        </body>
        </html>
        `;
            res.send(html);
            return;
        }

        console.log(`Searching for: "${searchQuery}"`);
        let searchResults = [];

        try {
            const collection = await ensurePostsCollection();
            searchResults = await collection.find({
                is_published: true,
                $or: [
                    { title: { $regex: searchQuery, $options: 'i' } },
                    { content: { $regex: searchQuery, $options: 'i' } },
                    { author: { $regex: searchQuery, $options: 'i' } },
                    { category: { $regex: searchQuery, $options: 'i' } }
                ]
            }).sort({ created_at: -1 }).toArray();
        } catch (error) {
            console.error('Search error:', error);
        }

        // Create search results HTML
        let html = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Search Results - StudyConnect</title>
            <link rel="stylesheet" href="/stylesheets/style.css">
            <link rel="preconnect" href="https://fonts.googleapis.com">
            <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
            <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet">
            <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
        </head>
        <body>
        <div class="container">
            <header class="main-header">
                <div class="logo">StudyConnect</div>
                <nav>
                    ${req.session.user ? `
                    <ul class="nav-links">
                        <li><a href="/"><i class="fas fa-home"></i> Home</a></li>
                        <li><a href="/about"><i class="fas fa-info-circle"></i> About</a></li>
                        <li><a href="/contact"><i class="fas fa-envelope"></i> Contact</a></li>
                        <li><a href="/search" class="active"><i class="fas fa-search"></i> Search</a></li>
                        <li><a href="/crud"><i class="fas fa-database"></i> CRUD</a></li>
                        <li><a href="/api-docs"><i class="fas fa-code"></i> API Docs</a></li>
                        <li><a href="/auth/profile"><i class="fas fa-user"></i> Profile</a></li>
                        <li><a href="/auth/logout" class="btn-exit"><i class="fas fa-sign-out-alt"></i> Logout</a></li>
                    </ul>
                    ` : `
                    <ul class="nav-links">
                        <li><a href="/"><i class="fas fa-home"></i> Home</a></li>
                        <li><a href="/about"><i class="fas fa-info-circle"></i> About</a></li>
                        <li><a href="/contact"><i class="fas fa-envelope"></i> Contact</a></li>
                        <li><a href="/auth/login"><i class="fas fa-sign-in-alt"></i> Login</a></li>
                        <li><a href="/auth/register"><i class="fas fa-user-plus"></i> Register</a></li>
                    </ul>
                    `}
                </nav>
            </header>
            
            <main style="padding: 50px 2rem;">
                <div style="max-width: 1000px; margin: 0 auto;">
                    <div style="background: var(--card-bg); padding: 2rem; border-radius: var(--border-radius); margin-bottom: 2rem;">
                        <h1 style="margin-bottom: 1rem;">Search Results</h1>
                        
                        <form action="/search" method="GET" style="display: flex; gap: 0.5rem; margin-bottom: 1.5rem;">
                            <input 
                                type="text" 
                                name="q" 
                                value="${searchQuery}"
                                placeholder="Search for posts, study materials, authors..." 
                                style="flex: 1; padding: 1rem; background: var(--dark-bg); border: 1px solid var(--card-border); border-radius: 8px; color: var(--text-primary); font-size: 1rem;"
                                required
                            >
                            <button type="submit" style="background: var(--accent-color); color: var(--dark-bg); border: none; padding: 1rem 2rem; border-radius: 8px; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 0.5rem;">
                                <i class="fas fa-search"></i> Search
                            </button>
                        </form>
                        
                        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 1rem;">
                            <p style="color: var(--text-secondary);">
                                Found <strong>${searchResults.length}</strong> results for "<strong>${searchQuery}</strong>"
                            </p>
                            <a href="/search" style="color: var(--accent-color); text-decoration: none;">
                                <i class="fas fa-undo"></i> New Search
                            </a>
                        </div>
                    </div>
                    
                    ${searchResults.length > 0 ? `
                        <div style="background: var(--card-bg); padding: 2rem; border-radius: var(--border-radius);">
                            <div style="display: grid; gap: 1.5rem;">
                                ${searchResults.map(post => `
                                    <div style="background: var(--dark-bg); padding: 1.5rem; border-radius: 8px; border-left: 4px solid var(--accent-color);">
                                        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1rem;">
                                            <h3 style="margin: 0;">${post.title}</h3>
                                            <span style="background: rgba(56, 178, 172, 0.2); color: var(--accent-color); padding: 0.25rem 0.75rem; border-radius: 20px; font-size: 0.9rem;">
                                                ${post.category}
                                            </span>
                                        </div>
                                        
                                        <p style="color: var(--text-secondary); margin-bottom: 1rem;">
                                            ${post.content.length > 200 ? post.content.substring(0, 200) + '...' : post.content}
                                        </p>
                                        
                                        <div style="display: flex; justify-content: space-between; align-items: center;">
                                            <div style="display: flex; gap: 1rem; color: var(--text-muted); font-size: 0.9rem;">
                                                <span><i class="fas fa-user"></i> ${post.author}</span>
                                                <span><i class="fas fa-calendar"></i> ${new Date(post.created_at).toLocaleDateString()}</span>
                                                <span><i class="fas fa-heart"></i> ${post.likes} likes</span>
                                            </div>
                                            <a href="/api/posts/${post.postId}" style="color: var(--accent-color); text-decoration: none; font-weight: 500;">
                                                View Post <i class="fas fa-arrow-right"></i>
                                            </a>
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    ` : `
                        <div style="background: var(--card-bg); padding: 3rem; border-radius: var(--border-radius); border: 1px solid var(--card-border); text-align: center;">
                            <div style="font-size: 4rem; color: var(--text-muted); margin-bottom: 1.5rem;">
                                <i class="fas fa-search"></i>
                            </div>
                            <h2 style="margin-bottom: 1rem;">No results found</h2>
                            <p style="color: var(--text-secondary); margin-bottom: 2rem;">
                                No posts found for "<strong>${searchQuery}</strong>". Try different keywords or browse popular categories.
                            </p>
                            <div style="display: flex; gap: 1rem; justify-content: center; flex-wrap: wrap;">
                                <a href="/search?q=programming" class="cta-button secondary">
                                    Search Programming
                                </a>
                                <a href="/search?q=database" class="cta-button secondary">
                                    Search Database
                                </a>
                                <a href="/search" class="cta-button primary">
                                    New Search
                                </a>
                            </div>
                        </div>
                    `}
                    
                    ${searchResults.length > 0 ? `
                        <div style="margin-top: 2rem; text-align: center;">
                            <p style="color: var(--text-muted);">
                                Showing ${searchResults.length} of ${searchResults.length} results
                            </p>
                            <a href="/api/posts" class="cta-button secondary" style="margin-top: 1rem;">
                                View All Posts via API
                            </a>
                        </div>
                    ` : ''}
                </div>
            </main>
            
            <footer>
                <p>© 2025 StudyConnect - Social Network for Students</p>
                <p>Search results for: "${searchQuery}"</p>
            </footer>
        </div>
        
        <script>
            document.querySelectorAll('.nav-links a').forEach(link => {
                if (link.href === window.location.href) {
                    link.classList.add('active');
                }
            });
        </script>
        </body>
        </html>
        `;

        res.send(html);
    });

    // Contact form submission
    app.post('/contact', (req, res) => {
        const { name, email, message } = req.body;

        if (!name || !email || !message) {
            console.log('Validation failed: missing required fields');
            return res.status(400).json({
                error: 'All fields are required',
                missingFields: {
                    name: !name,
                    email: !email,
                    message: !message
                }
            });
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            console.log('Validation failed: invalid email format');
            return res.status(400).json({
                error: 'Invalid email address format'
            });
        }

        console.log('Form data received:', { name, email, message });

        const formData = {
            name,
            email,
            message,
            timestamp: new Date().toISOString(),
            ip: req.ip || 'unknown'
        };

        fs.readFile('messages.json', 'utf8', (err, data) => {
            let messages = [];
            if (!err && data) {
                try {
                    messages = JSON.parse(data);
                } catch (parseError) {
                    console.error('Error parsing messages.json:', parseError);
                }
            }

            messages.push(formData);

            fs.writeFile('messages.json', JSON.stringify(messages, null, 2), (err) => {
                if (err) {
                    console.error('Error saving data:', err);
                    return res.status(500).json({ error: 'Server error while saving data' });
                }
                console.log('Data saved to messages.json');

                res.redirect('/contact-success');
            });
        });
    });

    app.get('/item/:id', (req, res) => {
        const itemId = req.params.id;

        if (!itemId) {
            return res.status(400).json({ error: 'Item ID not specified' });
        }

        console.log(`Requesting item with ID: "${itemId}"`);

        const demoData = {
            'SE-2425': {
                title: 'Group SE-2425',
                type: 'student-group',
                description: 'Student group at Astana IT University, Software Engineering major',
                members: ['Yerassyl Ibrayev', 'Dayan Kulmagambetova', 'Akbota Aitmukasheva'],
                courses: ['Backend Development', 'Frontend Development', 'Database Systems']
            },
            'groups': {
                title: 'Study Groups',
                type: 'study-groups',
                description: 'All available study groups on StudyConnect platform',
                count: 124,
                popular: ['SE-2425', 'SE-2426', 'SE-2427']
            },
            'materials': {
                title: 'Study Materials',
                type: 'resources',
                description: 'Library of study materials, lectures, and assignments',
                formats: ['PDF', 'Video', 'Code Examples'],
                totalItems: 567
            },
            'default': {
                title: `Item #${itemId}`,
                type: 'unknown',
                description: 'This is a demo item page',
                note: 'In a real application, data would come from a database'
            }
        };

        const item = demoData[itemId] || demoData.default;

        // Create HTML string
        const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${item.title} - StudyConnect</title>
        <link rel="stylesheet" href="/stylesheets/style.css">
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet">
    </head>
    <body>
        <div class="container">
            <header class="main-header">
                <div class="logo">StudyConnect</div>
                <nav>
                    <ul class="nav-links">
                        <li><a href="/">Home</a></li>
                        <li><a href="/item/SE-2425">Example: SE-2425</a></li>
                        <li><a href="/item/groups">Example: groups</a></li>
                    </ul>
                </nav>
            </header>
            
            <main style="padding: 50px 2rem;">
                <div style="max-width: 800px; margin: 0 auto;">
                    <div style="background: var(--card-bg); padding: 2.5rem; border-radius: var(--border-radius); border: 1px solid var(--card-border);">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem;">
                            <h1>${item.title}</h1>
                            <span style="background: var(--accent-color); color: white; padding: 0.5rem 1rem; border-radius: 20px; font-size: 0.9rem;">
                                ID: ${itemId}
                            </span>
                        </div>
                        
                        <p style="color: var(--text-secondary); font-size: 1.1rem; margin-bottom: 2rem;">
                            ${item.description}
                        </p>
                        
                        <div style="background: var(--dark-bg); padding: 1.5rem; border-radius: var(--border-radius); margin-bottom: 2rem;">
                            <h3 style="margin-bottom: 1rem;">Information</h3>
                            <pre style="color: var(--text-secondary); font-family: monospace; overflow: auto;">
${JSON.stringify(item, null, 2)}
                            </pre>
                        </div>
                        
                        <div style="display: flex; gap: 1rem; flex-wrap: wrap;">
                            <a href="/search?q=${itemId}" class="cta-button secondary">
                                Search similar
                            </a>
                            <a href="/api/info" class="cta-button secondary">
                                API Information
                            </a>
                            <a href="/" class="cta-button primary">
                                Back to Home
                            </a>
                        </div>
                    </div>
                    
                    <div style="margin-top: 2rem; text-align: center; color: var(--text-muted);">
                        <p>This is a demo item page. In a real application, data would be loaded from a database.</p>
                        <p>Try other IDs: 
                            <a href="/item/SE-2425">SE-2425</a>, 
                            <a href="/item/groups">groups</a>, 
                            <a href="/item/materials">materials</a>
                        </p>
                    </div>
                </div>
            </main>
            
            <footer>
                <p>© 2025 StudyConnect - Item page: ${itemId}</p>
            </footer>
        </div>
    </body>
    </html>
    `;

        // Use renderWithNav on the HTML string
        const html = renderWithNavFromString(htmlContent, req);
        res.send(html);
    });

    // API Info
    app.get('/api/info', (req, res) => {
        console.log('Project info requested via API');

        const projectInfo = {
            project: {
                name: "StudyConnect",
                version: "2.0.0",
                description: "Social network platform for connecting students with database integration",
                repository: "https://github.com/Yeras1kAITU/social_network",
                database: "MongoDB (studyconnect database)"
            },
            team: [
                {
                    name: "Yerassyl Ibrayev",
                    role: "Backend Lead",
                    group: "SE-2425",
                    university: "Astana IT University",
                    skills: ["Node.js", "Express", "Databases", "MongoDB"]
                },
                {
                    name: "Dayan Kulmagambetova",
                    role: "Frontend Developer",
                    group: "SE-2425",
                    university: "Astana IT University",
                    skills: ["React", "JavaScript", "UI/UX"]
                },
                {
                    name: "Akbota Aitmukasheva",
                    role: "Database Architect",
                    group: "SE-2425",
                    university: "Astana IT University",
                    skills: ["MongoDB", "PostgreSQL", "Redis", "SQLite"]
                }
            ],
            apiRoutes: [
                { method: "GET", path: "/api/posts", description: "Get all posts (with optional query params)" },
                { method: "GET", path: "/api/posts/:id", description: "Get single post by ID" },
                { method: "GET", path: "/api/posts/categories", description: "Get all post categories" },
                { method: "GET", path: "/api/posts/stats", description: "Get post statistics" }
            ],
            databaseSchema: {
                posts: {
                    _id: "ObjectId",
                    title: "String",
                    content: "String",
                    author: "String",
                    category: "String",
                    created_at: "Date",
                    updated_at: "Date",
                    likes: "Number",
                    is_published: "Boolean"
                }
            },
            stats: {
                totalRoutes: 16,
                apiVersion: "v2",
                timestamp: new Date().toISOString(),
                server: `Express.js on port ${process.env.PORT || 3000}`,
                database: "MongoDB (auto-initialized on startup)"
            }
        };

        res.setHeader('Content-Type', 'application/json');
        res.status(200).json(projectInfo);
    });

    // Logout redirect
    app.get('/logout', (req, res) => {
        res.redirect('/');
    });

    // 404 page - moved to end
    app.use((req, res) => {
        const html = renderWithNav(path.join(__dirname, 'views', '404.html'), req);
        res.status(404).send(html);
    });

    // API 404 handler
    app.use((req, res, next) => {
        if (req.path.startsWith('/api/')) {
            res.status(404).json({
                success: false,
                error: `Route ${req.method} ${req.path} not found`,
                timestamp: new Date().toISOString(),
                documentation: '/api-docs'
            });
        } else {
            next();
        }
    });

    // Error handler
    app.use((err, req, res, next) => {
        console.error('Server error:', err);

        if (req.path.startsWith('/api/')) {
            res.status(500).json({
                success: false,
                error: 'Internal server error',
                message: !isProduction ? err.message : undefined,
                timestamp: new Date().toISOString()
            });
        } else {
            res.status(500).send(`
                <!DOCTYPE html>
                <html lang="en">
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>Server Error - StudyConnect</title>
                    <link rel="stylesheet" href="/stylesheets/style.css">
                </head>
                <body>
                    <div class="container">
                        <header class="main-header">
                            <div class="logo">StudyConnect</div>
                        </header>
                        
                        <main style="padding: 100px 2rem; text-align: center;">
                            <h1 style="color: #f87171;">500 - Server Error</h1>
                            <p style="font-size: 1.25rem; color: var(--text-secondary); margin: 2rem 0;">
                                Something went wrong on our end. Please try again later.
                            </p>
                            ${!isProduction ? `<pre style="background: var(--dark-bg); padding: 1rem; border-radius: 8px; text-align: left; margin: 2rem 0; color: var(--text-secondary);">${err.stack}</pre>` : ''}
                            <a href="/" class="cta-button primary">Return to Home</a>
                            <a href="/status" class="cta-button secondary" style="margin-left: 1rem;">Check Status</a>
                        </main>
                    </div>
                </body>
                </html>
            `);
        }
    });

    // Helper function for search page
    function renderWithNavFromString(html, req) {
        const isAuthenticated = !!req.session.user;

        if (isAuthenticated) {
            const authenticatedNav = `
            <ul class="nav-links">
                <li><a href="/"><i class="fas fa-home"></i> Home</a></li>
                <li><a href="/about"><i class="fas fa-info-circle"></i> About</a></li>
                <li><a href="/contact"><i class="fas fa-envelope"></i> Contact</a></li>
                <li><a href="/search" class="active"><i class="fas fa-search"></i> Search</a></li>
                <li><a href="/crud"><i class="fas fa-database"></i> CRUD</a></li>
                <li><a href="/api-docs"><i class="fas fa-code"></i> API Docs</a></li>
                <li><a href="/auth/profile"><i class="fas fa-user"></i> Profile</a></li>
                <li><a href="/auth/logout" class="btn-exit"><i class="fas fa-sign-out-alt"></i> Logout</a></li>
            </ul>`;

            html = html.replace(/<ul class="nav-links">[\s\S]*?<\/ul>/, authenticatedNav);
        }

        return html;
    }

    // Start the server
    const server = app.listen(PORT, HOST, () => {
        console.log(`
StudyConnect Server Ready
Environment: ${isProduction ? 'PRODUCTION' : 'DEVELOPMENT'}
Server: http://${HOST}:${PORT}
Health Check: http://${HOST}:${PORT}/api/health
        `);
    });

    server.on('error', (error) => {
        console.error('Server error:', error);
        if (error.code === 'EADDRINUSE') {
            console.error(`Port ${PORT} is already in use`);
            process.exit(1);
        }
    });

    process.on('SIGINT', async () => {
        console.log('\nShutting down server gracefully...');
        await mongoDBManager.close();
        console.log('Server stopped');
        process.exit(0);
    });

    process.on('SIGTERM', async () => {
        console.log('\nReceived termination signal...');
        await mongoDBManager.close();
        console.log('Server stopped');
        process.exit(0);
    });

}).catch(error => {
    console.error('Failed to initialize server:', error);
    process.exit(1);
});