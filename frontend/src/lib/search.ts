import fs from 'fs';
import path from 'path';
import clientPromise from './mongodb';

export interface LocalMovie {
    slug: string;
    title: string;
    file_id: string;
    caption: string;
    indexed_at: string;
    // Optional metadata
    quality?: string;
    size?: string;
    codec?: string;
    language?: string;
    _id?: any; // MongoDB ID
}

// Helper to get Levenshtein distance
const levenshtein = (a: string, b: string): number => {
    const matrix = [];
    let i, j;
    for (i = 0; i <= b.length; i++) matrix[i] = [i];
    for (j = 0; j <= a.length; j++) matrix[0][j] = j;
    for (i = 1; i <= b.length; i++) {
        for (j = 1; j <= a.length; j++) {
            if (b.charAt(i - 1) === a.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(matrix[i - 1][j - 1] + 1, Math.min(matrix[i][j - 1] + 1, matrix[i - 1][j] + 1));
            }
        }
    }
    return matrix[b.length][a.length];
};

export function stringToHash(string: string): number {
    let hash = 0;
    if (string.length === 0) return hash;
    for (let i = 0; i < string.length; i++) {
        const char = string.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return Math.abs(hash) % 2147483647;
}

// CACHE Logic to prevent stale searches or slow reads
// We can cache the movie list in memory for a short time (e.g. 10 seconds)
let moviesCache: LocalMovie[] = [];
let lastCacheTime = 0;
const CACHE_DURATION = 1000 * 10; // 10 seconds

async function getMovies(): Promise<LocalMovie[]> {
    const now = Date.now();
    if (now - lastCacheTime < CACHE_DURATION && moviesCache.length > 0) {
        return moviesCache;
    }

    try {
        // 1. Try MongoDB
        const client = await clientPromise;
        const db = client.db("m4movie");
        const movies = await db.collection("movies").find({}).sort({ indexed_at: -1 }).toArray();

        if (movies.length > 0) {
            // Clean _id
            moviesCache = movies.map(m => {
                const { _id, ...rest } = m;
                return rest as unknown as LocalMovie;
            });
            lastCacheTime = now;
            return moviesCache;
        }
    } catch (e) {
        console.warn("Mongo Check Failed (Search):", e);
    }

    // 2. Fallback to Local JSON (for local dev or if Mongo fails)
    try {
        const filePath = path.join(process.cwd(), '../shared/movies.json');
        if (fs.existsSync(filePath)) {
            const data = fs.readFileSync(filePath, 'utf8');
            const json = JSON.parse(data);
            moviesCache = json.movies || [];
            lastCacheTime = now;
            return moviesCache;
        }
    } catch (e) {
        console.error("Local DB read failed:", e);
    }

    return [];
}

// NOTE: This must now be ASYNC because of DB access
export async function searchLocalMovies(query: string): Promise<LocalMovie[]> {
    const movies = await getMovies();

    if (!query) {
        return movies.slice(0, 50); // Return first 50 latest if no query
    }

    const cleanQuery = query.toLowerCase().trim();

    // Extract Year
    const yearMatch = cleanQuery.match(/\b(19|20)\d{2}\b/);
    let searchYear: string | null = null;
    let textQuery = cleanQuery;

    if (yearMatch) {
        searchYear = yearMatch[0];
        textQuery = cleanQuery.replace(searchYear, '').trim();
    }

    // Scoring
    const results = movies.map(movie => {
        if (searchYear && movie.year !== searchYear && movie.year !== 'unknown') {
            return { movie, score: 999 };
        }

        const title = movie.title.toLowerCase();

        // Exact
        if (title === textQuery) return { movie, score: 0 };
        // Prefix
        if (title.startsWith(textQuery)) return { movie, score: 1 };
        // Word Include
        if (title.includes(` ${textQuery}`) || title.includes(`${textQuery} `)) return { movie, score: 2 };
        // Fuzzy
        if (textQuery.length > 3) {
            const dist = levenshtein(textQuery, title);
            if (dist < 3) return { movie, score: 10 + dist };
        }

        return { movie, score: 999 };
    });

    return results
        .filter(r => r.score < 100)
        .sort((a, b) => a.score - b.score)
        .map(r => r.movie);
}
