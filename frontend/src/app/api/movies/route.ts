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

        // 3. Merge & Deduplicate
        // If 'ungroup=true' is set (for DownloadSection), we return ALL local matches
        const ungroup = searchParams.get('ungroup') === 'true';

        let finalLocalHelper = localMovies;
        if (!ungroup) {
            // Deduplicate Local (One Banner Rule)
            const uniqueLocalMap = new Map<number, any>();
            for (const m of localMovies) {
                if (!uniqueLocalMap.has(m.id)) uniqueLocalMap.set(m.id, m);
            }
            finalLocalHelper = Array.from(uniqueLocalMap.values());
        }

        const localIds = new Set(finalLocalHelper.map(m => m.id));

        // 2. Get Global Results (if query exists AND not ungrouping)
        // We usually don't need global results for DownloadSection, only for Search
        let globalMovies: TMDBMovie[] = [];
        if (query.trim().length > 0 && !ungroup) {
            try {
                // Use Multi-Search (Movies + TV) instead of just Movies
                const rawGlobal = await tmdb.searchMulti(query);
                globalMovies = rawGlobal
                    .filter(m => !localIds.has(m.id)) // Deduplicate against local
                    .sort((a, b) => (b.popularity || 0) - (a.popularity || 0)); // Sort by Fame
            } catch (err) {
                console.warn("Global search failed in API:", err);
            }
        }

        // 3. Merge (Local First, then Global)
        const finalResults = [...finalLocalHelper, ...globalMovies].slice(0, 20); // Limit to top 20

        return NextResponse.json(finalResults);

    } catch (error) {
        console.error('API Error:', error);
        return NextResponse.json({ error: 'Failed to fetch movies' }, { status: 500 });
    }
}

// Helper to clean filenames for TMDB search
function parseFilename(raw: string): { title: string; year: string | undefined } {
    // 1. Remove brackets/parentheses and their content often containing irrelevants like [Malayalam] or (2019)
    // Actually, we WANT specific years from brackets if possible, but usually cleaning is safer.

    // Regex to find 4-digit year (19xx or 20xx)
    // We remove \b boundary check to handle Lucifer_2019 (underscore is word char)
    const yearMatch = raw.match(/(?:^|[_\W])((?:19|20)\d{2})(?:$|[_\W])/);
    const year = yearMatch ? yearMatch[1] : undefined;

    // Get text BEFORE the year (usually the title)
    let title = raw;
    if (year) {
        title = raw.split(year)[0];
    }

    // Clean separators and common junk
    title = title
        .replace(/[._()[\]-]/g, ' ') // Replace dots, underscores, brackets with space
        .replace(/\b(1080p|720p|480p|WEB-DL|BluRay|HDRip|DVDRip|X264|HEVC)\b/gi, '') // Remove quality tags
        .trim();

    return { title, year };
}

async function hydrateMovies(localMovies: LocalMovie[]) {
    return Promise.all(localMovies.map(async (m) => {
        // CLEAN the title before searching TMDB
        const { title: cleanTitle, year: cleanYear } = parseFilename(m.title);

        // Use clean info for hydration search
        const tmdbMeta = await fetchTMDBMetadata(cleanTitle, cleanYear || m.year);

        if (tmdbMeta) {
            return {
                id: tmdbMeta.id, // Use REAL TMDB ID (Merging key)
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

                // Top Level Metadata for DownloadSection
                quality: m.quality,
                size: m.size,
                codec: m.codec,
                slug: m.slug,
                file_id: m.file_id,
                year: m.year,
                _id: m._id?.toString(), // Pass ID for React Keys

                // Keep local data for badges (legacy/backup)
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
            media_type: 'movie',

            // Top Level Metadata
            quality: m.quality,
            size: m.size,
            codec: m.codec,
            slug: m.slug,
            file_id: m.file_id,
            year: m.year,
            _id: m._id?.toString(), // Pass ID for React Keys

            local_data: true // Marker for frontend filtering
        };
    }));
}
