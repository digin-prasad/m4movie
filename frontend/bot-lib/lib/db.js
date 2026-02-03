const mongo = require('./mongo');
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '../../../shared/movies.json');
let cache = { movies: [], meta: {} };
let isMongoConnected = false;

// Initialize DB (Connect to Mongo, Load Local as Backup)
const init = async () => {
    // 1. Load Local first (fast startup)
    try {
        if (fs.existsSync(DB_PATH)) {
            const data = fs.readFileSync(DB_PATH, 'utf8');
            cache = JSON.parse(data);
            if (!cache.meta) cache.meta = {};
            console.log(`[DB] Loaded ${cache.movies.length} movies from local cache.`);
        }
    } catch (e) {
        console.error('[DB] Local load failed:', e.message);
    }

    // 2. Connect to Mongo
    await mongo.connectToServer();
    const db = mongo.getDb();

    if (db) {
        isMongoConnected = true;
        console.log('[DB] Switching to MongoDB storage.');

        // 3. Sync Logic: If Mongo is empty but we have local, UPLOAD it. (Migration)
        try {
            const count = await db.collection('movies').countDocuments();
            if (count === 0 && cache.movies.length > 0) {
                console.log('[DB] Migrating local movies to MongoDB...');
                await db.collection('movies').insertMany(cache.movies);
                console.log('[DB] Migration complete.');
            } else if (count > 0) {
                // If Mongo has data, use IT as the source of truth
                const validMovies = await db.collection('movies').find({}).toArray();
                // Map _id to clean objects if needed, or just replace cache
                cache.movies = validMovies.map(m => {
                    const { _id, ...rest } = m;
                    return rest;
                });
                console.log(`[DB] Synced ${cache.movies.length} movies from MongoDB.`);
            }
        } catch (e) {
            console.error('[DB] Mongo sync error:', e);
        }
    }
};

// Start initialization immediately
init();

const save = async () => {
    // If Mongo is active, we don't need to manually "save" to disk often, 
    // but we can keep local file updated as a backup/cache for the frontend if it's still reading file
    // But ideally Frontend should read Mongo too.

    // Write to local file for backup
    try {
        fs.writeFileSync(DB_PATH, JSON.stringify(cache, null, 2));
    } catch (e) { /* ignore */ }
};

const getMovies = () => {
    return cache.movies;
};

const addMovie = async (movie) => {
    // 1. Update in-memory cache
    const existingIndex = cache.movies.findIndex(m => m.file_id === movie.file_id);
    const now = new Date().toISOString();

    let movieToSave = { ...movie, indexed_at: now };

    if (existingIndex >= 0) {
        cache.movies[existingIndex] = { ...cache.movies[existingIndex], ...movieToSave };
        movieToSave = cache.movies[existingIndex];
    } else {
        cache.movies.push(movieToSave);
    }

    // 2. Save to Mongo
    if (isMongoConnected) {
        const db = mongo.getDb();
        try {
            await db.collection('movies').updateOne(
                { file_id: movie.file_id },
                { $set: movieToSave },
                { upsert: true }
            );
            console.log(`[DB] Saved to MongoDB: ${movie.title}`);
        } catch (e) {
            console.error('[DB] Mongo save failed:', e);
        }
    }

    // 3. Save Local
    save();
};

const findBySlug = (slug) => {
    return cache.movies.find(m => m.slug === slug);
};

const exists = (slug) => {
    return cache.movies.some(m => m.slug === slug);
};

const getMeta = (key) => {
    return cache.meta[key];
};

const updateMeta = async (key, value) => {
    cache.meta[key] = value;
    save();

    // We can also store meta in a 'meta' collection in Mongo if we want perfect sync
    // For now, local file meta (like last_id) is okay provided the bot container relies on persistent disk or internal state.
    // Ideally, sync progress should go to Mongo too.
    if (isMongoConnected) {
        const db = mongo.getDb();
        try {
            await db.collection('meta').updateOne(
                { key: key },
                { $set: { value: value } },
                { upsert: true }
            );
        } catch (e) { }
    }
};

const getSyncProgress = async (channelId) => {
    // Try memory/local first
    if (cache.meta.sync_progress && cache.meta.sync_progress[channelId]) {
        return cache.meta.sync_progress[channelId];
    }

    // Try Mongo
    if (isMongoConnected) {
        const db = mongo.getDb();
        const doc = await db.collection('meta').findOne({ key: 'sync_progress' });
        if (doc && doc.value && doc.value[channelId]) {
            return doc.value[channelId];
        }
    }

    return 0;
};

const updateSyncProgress = async (channelId, lastId) => {
    if (!cache.meta.sync_progress) cache.meta.sync_progress = {};
    cache.meta.sync_progress[channelId] = lastId;
    save();

    if (isMongoConnected) {
        const db = mongo.getDb();
        // We need to fetch current full object to update one key safely or use dot notation
        // Simplest: just save the whole sync_progress object
        await db.collection('meta').updateOne(
            { key: 'sync_progress' },
            { $set: { value: cache.meta.sync_progress } },
            { upsert: true }
        );
    }
};

module.exports = {
    getMovies,
    addMovie,
    findBySlug,
    exists,
    getMeta,
    updateMeta,
    getSyncProgress,
    updateSyncProgress,
    load: init
};
