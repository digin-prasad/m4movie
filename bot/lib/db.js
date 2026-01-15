const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '../../shared/movies.json');
const DEBOUNCE_TIME = 2000; // 2 seconds

let cache = null;
let saveTimeout = null;

const load = () => {
    if (cache) return cache;
    try {
        const data = fs.readFileSync(DB_PATH, 'utf8');
        cache = JSON.parse(data);
        if (!cache.meta) cache.meta = {};
    } catch (e) {
        console.error(`[DB] Error loading database: ${e.message}`);
        cache = { movies: [], meta: {} };
    }
    return cache;
};

const save = () => {
    if (!cache) return;

    // Clear any existing timeout
    if (saveTimeout) {
        clearTimeout(saveTimeout);
    }

    // Set a new timeout to save after activity stops
    saveTimeout = setTimeout(() => {
        try {
            // Write to a temporary file first for safety (optional but recommended)
            const data = JSON.stringify(cache, null, 2);
            fs.writeFileSync(DB_PATH, data);
            fs.writeFileSync(DB_PATH, data);
            saveTimeout = null;
        } catch (e) {
            console.error(`[DB] Error saving database: ${e.message}`);
        }
    }, DEBOUNCE_TIME);
};

const getMovies = () => {
    return load().movies;
};

const addMovie = (movie) => {
    const db = load();

    // Duplicate check by file_id
    const existingIndex = db.movies.findIndex(m => m.file_id === movie.file_id);
    if (existingIndex >= 0) {
        db.movies[existingIndex] = { ...db.movies[existingIndex], ...movie, indexed_at: new Date().toISOString() };
    } else {
        db.movies.push({ ...movie, indexed_at: new Date().toISOString() });
    }

    save();
};

const findBySlug = (slug) => {
    return load().movies.find(m => m.slug === slug);
};

const exists = (slug) => {
    return load().movies.some(m => m.slug === slug);
};

const getMeta = (key) => {
    return load().meta[key];
};

const updateMeta = (key, value) => {
    const db = load();
    db.meta[key] = value;
    save();
};

const getSyncProgress = (channelId) => {
    const db = load();
    if (!db.meta.sync_progress) db.meta.sync_progress = {};
    return db.meta.sync_progress[channelId] || 0;
};

const updateSyncProgress = (channelId, lastId) => {
    const db = load();
    if (!db.meta.sync_progress) db.meta.sync_progress = {};
    db.meta.sync_progress[channelId] = lastId;
    save();
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
    load
};
