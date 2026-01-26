const fs = require('fs');
const path = require('path');

// Try to load env
try {
    const envPath = path.join(__dirname, 'frontend', '.env.local');
    const envFile = fs.readFileSync(envPath, 'utf8');
    envFile.split('\n').forEach((line: string) => {
        const [key, value] = line.split('=');
        if (key && value) {
            process.env[key.trim()] = value.trim();
        }
    });
} catch (e) {
    console.warn("Could not load .env.local", e.message);
}

// Mock TMDB logic to test searchMulti
const BASE_URL = 'https://api.themoviedb.org/3';
const API_KEY = process.env.NEXT_PUBLIC_TMDB_API_KEY;

console.log("API KEY:", API_KEY ? "Found" : "Missing");

async function searchMulti(query: string) {
    if (!API_KEY) return [];

    const url = `${BASE_URL}/search/multi?api_key=${API_KEY}&query=${encodeURIComponent(query)}`;
    try {
        const res = await fetch(url);
        const data = await res.json();
        return data.results || [];
    } catch (error) {
        console.error("Search Error:", error);
        return [];
    }
}

async function debug(query: string) {
    console.log(`\n--- Debugging Query: "${query}" ---`);
    const results = await searchMulti(query);

    console.log(`Found ${results.length} results.`);
    results.forEach((item: any, index: number) => {
        const title = item.title || item.name;
        const date = item.release_date || item.first_air_date;
        const type = item.media_type;

        console.log(`[${index}] ${title} (${date}) [${type}] ID:${item.id}`);
        console.log(`    Strict Match with "${query}"? ${title.toLowerCase() === query.toLowerCase()}`);
        console.log(`    Original: ${item.original_title || item.original_name}`);
    });
}

// Run
debug("Witcher");
debug("The Witcher");
