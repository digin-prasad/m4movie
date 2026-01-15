import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// Types from movies.json
interface LocalMovie {
    slug: string;
    title: string;
    year: string;
    quality: string;
    file_id: string;
    caption: string;
    indexed_at: string;
    size?: string;
    codec?: string;
}

// Levenshtein Distance for Fuzzy Matching
const levenshtein = (a: string, b: string): number => {
    const matrix = [];

    // Increment along the first column of each row
    let i;
    for (i = 0; i <= b.length; i++) {
        matrix[i] = [i];
    }

    // Increment each column in the first row
    let j;
    for (j = 0; j <= a.length; j++) {
        matrix[0][j] = j;
    }

    // Fill in the rest of the matrix
    for (i = 1; i <= b.length; i++) {
        for (j = 1; j <= a.length; j++) {
            if (b.charAt(i - 1) === a.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(
                    matrix[i - 1][j - 1] + 1, // substitution
                    Math.min(
                        matrix[i][j - 1] + 1, // insertion
                        matrix[i - 1][j] + 1  // deletion
                    )
                );
            }
        }
    }

    return matrix[b.length][a.length];
};

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const query = searchParams.get('q')?.toLowerCase().trim();

        const sharedPath = path.join(process.cwd(), '../shared/movies.json');

        if (!fs.existsSync(sharedPath)) {
            return NextResponse.json({ movies: [] });
        }

        const data = fs.readFileSync(sharedPath, 'utf8');
        const db = JSON.parse(data);
        let movies: LocalMovie[] = db.movies || [];

        // If no query, return all (or top 20 latest)
        if (!query) {
            // Sort by indexed_at desc
            movies.sort((a, b) => new Date(b.indexed_at).getTime() - new Date(a.indexed_at).getTime());
            return NextResponse.json(mapToTMDB(movies.slice(0, 20)));
        }

        // 1. Extract Year if present (e.g., "Movie Name 2024")
        const yearMatch = query.match(/\b(19|20)\d{2}\b/);
        let searchYear: string | null = null;
        let cleanQuery = query;

        if (yearMatch) {
            searchYear = yearMatch[0];
            cleanQuery = query.replace(searchYear, '').trim();
        }

        // 2. Filter and Score
        const results = movies
            .map(movie => {
                // Filter by Year if specified
                if (searchYear && movie.year !== searchYear && movie.year !== 'unknown') {
                    return { movie, score: 999 }; // Exclude
                }

                // Fuzzy Match Title
                // We normalize both strings
                const movieTitle = movie.title.toLowerCase();

                // Exact substring match (highest priority)
                if (movieTitle.includes(cleanQuery)) {
                    return { movie, score: 0 };
                }

                // Fuzzy match
                const dist = levenshtein(cleanQuery, movieTitle);
                // Simple normalization: dist / length. 
                // E.g. "Matrix" (6) vs "Matrx" (distance 1) -> 1/6 = 0.16 error
                // Allow up to 40% error?
                const errorRatio = dist / Math.max(cleanQuery.length, movieTitle.length);

                return { movie, score: errorRatio };
            })
            .filter(item => item.score < 0.4) // Filter out bad matches (40% threshold)
            .sort((a, b) => a.score - b.score); // Best matches first

        const matchedMovies = results.map(r => r.movie);

        return NextResponse.json(mapToTMDB(matchedMovies));

    } catch (error) {
        console.error('Error reading shared DB:', error);
        return NextResponse.json({ error: 'Failed to fetch movies' }, { status: 500 });
    }
}

// Helper to map Local DB format to TMDB format for frontend compatibility
function mapToTMDB(localMovies: LocalMovie[]) {
    return localMovies.map((m, index) => ({
        id: stringToHash(m.file_id), // Generate a stable numeric ID from file_id
        title: m.title,
        original_title: m.title,
        overview: `${m.quality} • ${m.size || 'Unknown Size'} • ${m.codec || 'No Codec'}\n${m.caption}`,
        poster_path: null, // Local files don't have posters yet, UI handles placeholder
        backdrop_path: null,
        release_date: m.year !== 'unknown' ? `${m.year}-01-01` : '2000-01-01',
        vote_average: 10, // It's downloaded, so it's a 10/10!
        media_type: 'movie'
    }));
}

function stringToHash(string: string): number {
    let hash = 0;
    if (string.length === 0) return hash;
    for (let i = 0; i < string.length; i++) {
        const char = string.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return Math.abs(hash); // Ensure positive ID
}
