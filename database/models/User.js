const { mongoDBManager } = require('../mongo');
const bcrypt = require('bcryptjs');

class User {
    constructor() {
        this.collection = null;
        this.saltRounds = 10;
        // Don't initialize here - wait for MongoDB connection
    }

    async initialize() {
        this.collection = mongoDBManager.getCollection('users');

        // Only create indexes if we have a real MongoDB connection
        if (this.collection && this.collection.createIndex) {
            try {
                await this.collection.createIndex({ email: 1 }, { unique: true });
                await this.collection.createIndex({ username: 1 }, { unique: true });
                console.log('User collection indexes created');
            } catch (error) {
                console.log('User indexes already exist or cannot be created');
            }
        }
    }

    async hashPassword(password) {
        return await bcrypt.hash(password, this.saltRounds);
    }

    async comparePassword(password, hashedPassword) {
        return await bcrypt.compare(password, hashedPassword);
    }

    async createUser(userData) {
        console.log('=== User.createUser() called ===');
        console.log('User data:', userData);

        try {
            const { name, email, password, username, role = 'student' } = userData;

            if (!name || !email || !password || !username) {
                console.log('Validation failed: Missing fields');
                throw new Error('All fields are required');
            }

            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                console.log('Validation failed: Invalid email');
                throw new Error('Invalid email format');
            }

            if (password.length < 6) {
                console.log('Validation failed: Password too short');
                throw new Error('Password must be at least 6 characters');
            }

            console.log('Hashing password...');
            const hashedPassword = await this.hashPassword(password);
            console.log('Password hashed');

            const user = {
                name,
                email: email.toLowerCase(),
                username: username.toLowerCase(),
                password: hashedPassword,
                role,
                createdAt: new Date(),
                updatedAt: new Date(),
                isActive: true,
                profile: {
                    bio: '',
                    university: '',
                    major: '',
                    year: '',
                    avatar: '',
                    socialLinks: {}
                },
                preferences: {
                    emailNotifications: true,
                    theme: 'dark'
                },
                lastLogin: null,
                loginAttempts: 0,
                lockUntil: null
            };

            console.log('Attempting to insert user into collection...');
            console.log('Collection:', this.collection ? 'Exists' : 'NULL!');

            if (!this.collection) {
                throw new Error('Database collection not available');
            }

            const result = await this.collection.insertOne(user);
            console.log('Insert result:', result);

            return {
                success: true,
                userId: result.insertedId,
                user: {
                    id: result.insertedId,
                    name: user.name,
                    email: user.email,
                    username: user.username,
                    role: user.role
                }
            };
        } catch (error) {
            console.error('=== User.createUser() ERROR ===');
            console.error('Error code:', error.code);
            console.error('Error message:', error.message);
            console.error('Error stack:', error.stack);

            if (error.code === 11000) {
                const field = error.message.includes('email') ? 'Email' : 'Username';
                throw new Error(`${field} already exists`);
            }
            throw error;
        }
    }

    async authenticate(emailOrUsername, password) {
        try {
            const query = {
                $or: [
                    { email: emailOrUsername.toLowerCase() },
                    { username: emailOrUsername.toLowerCase() }
                ],
                isActive: true
            };

            console.log('Authentication query:', JSON.stringify(query));

            const user = await this.collection.findOne(query);
            console.log('Found user:', user ? 'Yes' : 'No');

            if (!user) {
                throw new Error('Invalid credentials');
            }

            // Check if account is locked
            if (user.lockUntil && user.lockUntil > Date.now()) {
                const lockTime = Math.ceil((user.lockUntil - Date.now()) / 1000 / 60);
                throw new Error(`Account is locked. Try again in ${lockTime} minutes`);
            }

            console.log('Comparing password...');
            const isValidPassword = await this.comparePassword(password, user.password);
            console.log('Password valid?', isValidPassword);

            if (!isValidPassword) {
                // Increment login attempts
                const update = {
                    $inc: { loginAttempts: 1 },
                    $set: { updatedAt: new Date() }
                };

                // Lock account after 5 failed attempts for 15 minutes
                if (user.loginAttempts + 1 >= 5) {
                    update.$set.lockUntil = Date.now() + 15 * 60 * 1000; // 15 minutes
                    update.$set.loginAttempts = 0;
                }

                await this.collection.updateOne({ _id: user._id }, update);
                throw new Error('Invalid credentials');
            }

            // Reset login attempts on successful login
            await this.collection.updateOne(
                { _id: user._id },
                {
                    $set: {
                        loginAttempts: 0,
                        lockUntil: null,
                        lastLogin: new Date(),
                        updatedAt: new Date()
                    }
                }
            );

            // Remove password from returned user object
            const { password: _, ...userWithoutPassword } = user;

            return {
                success: true,
                user: {
                    id: user._id,
                    name: user.name,
                    email: user.email,
                    username: user.username,
                    role: user.role,
                    profile: user.profile,
                    createdAt: user.createdAt
                }
            };
        } catch (error) {
            console.error('Authentication error details:', error);
            throw error;
        }
    }

    async getUserById(userId) {
        try {
            const { ObjectId } = require('../mongo');
            const user = await this.collection.findOne({ _id: new ObjectId(userId) });

            if (!user) {
                return null;
            }

            const { password, ...userWithoutPassword } = user;
            return userWithoutPassword;
        } catch (error) {
            throw error;
        }
    }

    async getUserByEmail(email) {
        try {
            const user = await this.collection.findOne({ email: email.toLowerCase() });
            return user;
        } catch (error) {
            throw error;
        }
    }

    async updateUser(userId, updateData) {
        try {
            const { ObjectId } = require('../mongo');

            // Add updatedAt to updateData
            const updateWithTimestamp = {
                ...updateData,
                updatedAt: new Date()
            };

            const result = await this.collection.updateOne(
                { _id: new ObjectId(userId) },
                { $set: updateWithTimestamp }
            );

            return result.modifiedCount > 0;
        } catch (error) {
            throw error;
        }
    }

    async changePassword(userId, oldPassword, newPassword) {
        try {
            const { ObjectId } = require('../mongo');
            const user = await this.collection.findOne({ _id: new ObjectId(userId) });

            if (!user) {
                throw new Error('User not found');
            }

            const isValid = await this.comparePassword(oldPassword, user.password);
            if (!isValid) {
                throw new Error('Current password is incorrect');
            }

            const hashedPassword = await this.hashPassword(newPassword);

            await this.collection.updateOne(
                { _id: new ObjectId(userId) },
                {
                    $set: {
                        password: hashedPassword,
                        updatedAt: new Date()
                    }
                }
            );

            return true;
        } catch (error) {
            throw error;
        }
    }

    async deleteUser(userId) {
        try {
            const { ObjectId } = require('../mongo');

            // First get the user to get their current email/username
            const user = await this.collection.findOne({ _id: new ObjectId(userId) });

            if (!user) {
                throw new Error('User not found');
            }

            // Soft delete - mark as inactive
            const result = await this.collection.updateOne(
                { _id: new ObjectId(userId) },
                {
                    $set: {
                        isActive: false,
                        updatedAt: new Date(),
                        email: `deleted_${Date.now()}_${user.email}`, // Change email to prevent reuse
                        username: `deleted_${Date.now()}_${user.username}`
                    }
                }
            );

            return result.modifiedCount > 0;
        } catch (error) {
            throw error;
        }
    }

    async seedAdminUser() {
        try {
            // Ensure collection is initialized
            if (!this.collection) {
                await this.initialize();
            }

            const adminExists = await this.collection.findOne({ role: 'admin' });

            if (!adminExists) {
                const adminData = {
                    name: 'System Administrator',
                    email: 'admin@studyconnect.edu',
                    username: 'admin',
                    password: await this.hashPassword('Admin123!'),
                    role: 'admin',
                    createdAt: new Date(),
                    updatedAt: new Date(),
                    isActive: true,
                    profile: {
                        bio: 'System Administrator',
                        university: 'Astana IT University',
                        major: 'Information Systems',
                        year: '2025',
                        avatar: '',
                        socialLinks: {}
                    },
                    preferences: {
                        emailNotifications: true,
                        theme: 'dark'
                    },
                    lastLogin: null,
                    loginAttempts: 0,
                    lockUntil: null
                };

                // Insert directly instead of using createUser to avoid duplicate checks
                await this.collection.insertOne(adminData);
                console.log('Default admin user created');
                console.log('Email: admin@studyconnect.edu');
                console.log('Password: Admin123!');
                console.log('⚠️  CHANGE THIS PASSWORD IMMEDIATELY AFTER FIRST LOGIN!');
            }
        } catch (error) {
            console.error('Error seeding admin user:', error.message);
        }
    }
}

module.exports = new User();