const { MongoClient, ObjectId } = require('mongodb');

class MongoDBManager {
    constructor() {
        const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/studyconnect';

        console.log(`- Connecting to MongoDB: ${uri.replace(/\/\/[^@]+@/, '//***:***@')}`);

        this.client = new MongoClient(uri, {
            serverSelectionTimeoutMS: 10000,
            socketTimeoutMS: 45000,
            connectTimeoutMS: 10000,
            maxPoolSize: 10,
            minPoolSize: 1,
            retryWrites: true,
            w: 'majority'
        });

        this.db = null;
        this.postsCollection = null;
        this.isProduction = process.env.NODE_ENV === 'production';
    }

    async connect() {
        try {
            const uri = process.env.MONGODB_URI;

            if (!uri) {
                console.log('⚠ MONGODB_URI not set. Running without database.');
                this.db = null;
                this.postsCollection = null;
                return;
            }

            console.log(`Connecting to MongoDB...`);

            await this.client.connect();
            this.db = this.client.db('studyconnect');
            this.postsCollection = this.db.collection('posts');

            await this.db.command({ ping: 1 });
            console.log('--- MongoDB connected successfully');

            await this.seedSampleData();

        } catch (error) {
            console.error('MongoDB connection failed:', error.message);
            console.log('Running in fallback mode without database');
            this.db = null;
            this.postsCollection = null;
        }
    }

    async seedSampleData() {
        if (!this.postsCollection) {
            console.log('Skipping sample data seeding - no database connection');
            return;
        }

        try {
            const count = await this.postsCollection.countDocuments();

            if (count === 0) {
                console.log('- Seeding sample data...');

                const samplePosts = [
                    {
                        postId: 0,
                        title: 'Welcome to StudyConnect!',
                        content: 'This is our first post. Share your study materials, ask questions, and connect with fellow students!',
                        author: 'Admin',
                        category: 'announcement',
                        likes: 15,
                        created_at: new Date(),
                        updated_at: new Date(),
                        is_published: true
                    },
                    {
                        postId: 1,
                        title: 'JavaScript Async/Await Guide',
                        content: 'Complete guide to async/await in JavaScript with examples and best practices.',
                        author: 'Yerassyl Ibrayev',
                        category: 'programming',
                        likes: 42,
                        created_at: new Date(),
                        updated_at: new Date(),
                        is_published: true
                    },
                    {
                        postId: 2,
                        title: 'Database Design Principles',
                        content: 'Learn about normalization, relationships, and optimization techniques for databases.',
                        author: 'Akbota Aitmukasheva',
                        category: 'database',
                        likes: 28,
                        created_at: new Date(),
                        updated_at: new Date(),
                        is_published: true
                    },
                    {
                        postId: 3,
                        title: 'React Hooks Tutorial',
                        content: 'Understanding useState, useEffect, and custom hooks with practical examples.',
                        author: 'Dayan Kulmagambetova',
                        category: 'frontend',
                        likes: 37,
                        created_at: new Date(),
                        updated_at: new Date(),
                        is_published: true
                    },
                    {
                        postId: 4,
                        title: 'Study Group Meeting - Friday',
                        content: 'Weekly study group meeting for Backend Development course. Bring your questions!',
                        author: 'SE-2425 Group',
                        category: 'study-group',
                        likes: 21,
                        created_at: new Date(),
                        updated_at: new Date(),
                        is_published: true
                    }
                ];

                await this.postsCollection.insertMany(samplePosts);
                console.log(`- ${samplePosts.length} sample posts added`);
            } else {
                console.log(`- Database already contains ${count} posts, skipping seed`);
            }
        } catch (error) {
            console.error('Error seeding sample data:', error.message);
        }
    }

    getCollection(name) {
        if (!this.db) {
            console.log(`Database not connected. Returning mock collection: ${name}`);

            return {
                find: (query = {}) => ({
                    toArray: async () => {
                        console.log(`Mock: find.toArray() called for ${name}`);
                        return [];
                    },
                    sort: function(sortBy) {
                        console.log(`Mock: sort() called`);
                        return this;
                    },
                    skip: function(offset) {
                        console.log(`Mock: skip(${offset}) called`);
                        return this;
                    },
                    limit: function(limit) {
                        console.log(`Mock: limit(${limit}) called`);
                        return this;
                    },
                    project: function(projection) {
                        console.log(`Mock: project() called`);
                        return this;
                    }
                }),
                findOne: async (query = {}) => {
                    console.log(`Mock: findOne() called for ${name}`);
                    return null;
                },
                insertOne: async (document) => {
                    console.log(`Mock: insertOne() called for ${name}`);
                    return {
                        insertedId: 'mock-id-' + Date.now(),
                        acknowledged: true
                    };
                },
                insertMany: async (documents) => {
                    console.log(`Mock: insertMany() called for ${name}`);
                    return {
                        insertedIds: documents.map((_, i) => `mock-id-${Date.now()}-${i}`),
                        acknowledged: true
                    };
                },
                updateOne: async (filter, update) => {
                    console.log(`Mock: updateOne() called for ${name}`);
                    return {
                        modifiedCount: 0,
                        acknowledged: true
                    };
                },
                deleteOne: async (filter) => {
                    console.log(`Mock: deleteOne() called for ${name}`);
                    return {
                        deletedCount: 0,
                        acknowledged: true
                    };
                },
                countDocuments: async (query = {}) => {
                    console.log(`Mock: countDocuments() called for ${name}`);
                    return 0;
                },
                aggregate: (pipeline = []) => ({
                    toArray: async () => {
                        console.log(`Mock: aggregate.toArray() called for ${name}`);
                        return [];
                    }
                })
            };
        }
        return this.db.collection(name);
    }

    async close() {
        if (this.client) {
            await this.client.close();
            console.log('- MongoDB connection closed');
        }
    }

    getObjectId(id) {
        try {
            return new ObjectId(id);
        } catch (error) {
            return null;
        }
    }

    async healthCheck() {
        try {
            if (!this.db) {
                return { healthy: false, message: 'Database not connected' };
            }

            await this.db.command({ ping: 1 });
            return { healthy: true, message: 'MongoDB connection is healthy' };
        } catch (error) {
            return { healthy: false, message: error.message };
        }
    }
}

const mongoDBManager = new MongoDBManager();
module.exports = { mongoDBManager, ObjectId };