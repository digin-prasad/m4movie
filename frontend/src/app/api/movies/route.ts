import { NextRequest, NextResponse } from 'next/server';
import { searchLocalMovies, LocalMovie, stringToHash } from '@/lib/search';
import { tmdb, TMDBMovie } from '@/lib/tmdb';

// Minimal TMDB Helper (for local hydration only)
const TMDB_API_KEY = process.env.NEXT_PUBLIC_TMDB_API_KEY;
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

async function fetchTMDBMetadata(title: string, year: string) {
    if (!TMDB_API_KEY) return null;
    try {
        const url = new URL(`${TMDB_BASE_URL}/search/movie`);
        url.searchParams.append('api_key', TMDB_API_KEY);
        url.searchParams.append('query', title);
        if (year && year !== 'unknown') {
            url.searchParams.append('year', year);
        }

        const res = await fetch(url.toString(), { next: { revalidate: 3600 } });
        const data = await res.json();

        // Return first match
        if (data.results && data.results.length > 0) {
            return data.results[0]; // { id, title, poster_path, backdrop_path, ... }
        }
        return null;
    } catch (e) {
        return null;
    }
}

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const query = searchParams.get('q') || '';

        // 1. Get Local Results (Top Priority)
        const localRaw = await searchLocalMovies(query);
        const localMovies = await hydrateMovies(localRaw);

        // Deduplicate Local (One Banner Rule)
        const uniqueLocalMap = new Map<number, any>();
        for (const m of localMovies) {
            if (!uniqueLocalMap.has(m.id)) uniqueLocalMap.set(m.id, m);
        }
        const uniqueLocal = Array.from(uniqueLocalMap.values());
        const localIds = new Set(uniqueLocal.map(m => m.id));

        // 2. Get Global Results (if query exists)
        let globalMovies: TMDBMovie[] = [];
        if (query.trim().length > 0) {
            try {
                const rawGlobal = await tmdb.searchMovies(query);
                globalMovies = rawGlobal
                    .filter(m => !localIds.has(m.id)) // Deduplicate against local
                    .sort((a, b) => (b.popularity || 0) - (a.popularity || 0)); // Sort by Fame
            } catch (err) {
                console.warn("Global search failed in API:", err);
            }
        }

        // 3. Merge (Local First, then Global)
        const finalResults = [...uniqueLocal, ...globalMovies].slice(0, 20); // Limit to top 20

        return NextResponse.json(finalResults);

    } catch (error) {
        console.error('API Error:', error);
        return NextResponse.json({ error: 'Failed to fetch movies' }, { status: 500 });
    }
}

async function hydrateMovies(localMovies: LocalMovie[]) {
    return Promise.all(localMovies.map(async (m) => {
        // Try to fetch real TMDB ID
        const tmdbMeta = await fetchTMDBMetadata(m.title, m.year);

        if (tmdbMeta) {
            return {
                id: tmdbMeta.id, // Use REAL TMDB ID
                title: tmdbMeta.title,
                original_title: m.title, // Keep local title as original
                overview: `[LOCAL AVAILABLE] ${m.quality} • ${m.size} • ${m.codec}\n${tmdbMeta.overview || ''}`,
                poster_path: tmdbMeta.poster_path, // Use Real Poster
                backdrop_path: tmdbMeta.backdrop_path,
                release_date: tmdbMeta.release_date || (m.year !== 'unknown' ? `${m.year}-01-01` : '2000-01-01'),
                vote_average: tmdbMeta.vote_average || 10,
                vote_count: tmdbMeta.vote_count,
                popularity: tmdbMeta.popularity,
                media_type: 'movie',
                // Keep local data for badges
                local_data: {
                    quality: m.quality,
                    size: m.size,
                    codec: m.codec
                }
            };
        }

        // Fallback if not found on TMDB
        return {
            id: stringToHash(m.file_id),
            title: m.title,
            original_title: m.title,
            overview: `${m.quality} • ${m.size || 'Unknown Size'} • ${m.codec || 'No Codec'}\n${m.caption}`,
            poster_path: null,
            backdrop_path: null,
            release_date: m.year !== 'unknown' ? `${m.year}-01-01` : '2000-01-01',
            vote_average: 10,
            media_type: 'movie'
        };
    }));
}
