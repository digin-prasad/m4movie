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

// Helper to clean filenames for TMDB search (Synced with page.tsx)
function cleanTitle(t: string) {
    return t.toLowerCase()
        .replace(/\b(19|20)\d{2}\b/g, '') // Remove Year
        .replace(/s\d+\s*e\d+/g, '')      // Remove S01E01 or S01 E01
        .replace(/s\d+/g, '')             // Remove S01
        .replace(/\d+x\d+/g, '')          // Remove 1x01
        .replace(/season\s*\d+/g, '')     // Remove Season 1
        .replace(/episode\s*\d+/g, '')    // Remove Episode 1
        .replace(/\b(4k|2160p|1080p|720p|480p|bluray|web-dl|webrip|x264|x265|hevc|aac|ac3|dts)\b/g, '') // Remove Quality
        .replace(/\b(internal|proper|repack|remux|hulu|amzn|nf|netflix|dsnp|hbo|max)\b/gi, '') // Remove Scene Tags
        .replace(/\.(mkv|mp4|avi|mov|flv|wmv)\b/g, '') // Remove Extensions
        .replace(/[.\-_]/g, ' ')          // Replace separators with space
        .replace(/\s+/g, ' ')             // Collapse spaces
        .trim();
}

async function hydrateMovies(localMovies: LocalMovie[]) {
    // CACHE: To prevent Rate Limiting when hydrating 50 episodes of the same show
    const titleCache = new Map<string, Promise<any[]>>();

    return Promise.all(localMovies.map(async (m) => {
        // Clean the title matches logic in search/page.tsx
        const searchTitle = cleanTitle(m.title);

        // CACHE LOGIC
        if (!titleCache.has(searchTitle)) {
            // Use searchMulti to find both Movies and TV
            titleCache.set(searchTitle, tmdb.searchMulti(searchTitle));
        }

        let globalMatches: TMDBMovie[] = [];
        try {
            globalMatches = (await titleCache.get(searchTitle)) || [];
        } catch (e) {
            console.warn("Search failed for", searchTitle);
        }

        // Check for TV signatures in original title
        const isTvSignature = /s\d+/i.test(m.title) || /\d+x\d+/i.test(m.title) || /season/i.test(m.title) || /\b(complete|episode|ep)\b/i.test(m.title);

        // Best Match Logic
        const bestMatch = globalMatches.find(g => {
            // If local file matches TV pattern, STRICTLY ignore movies
            if (isTvSignature && g.media_type === 'movie') return false;

            const tmdbTitle = (g.title || g.name || '').toLowerCase();
            const localTitle = m.title.toLowerCase();
            const searchTitleClean = searchTitle;

            const cleanTmdb = tmdbTitle.replace(/^the\s+/, '');
            const cleanLocal = searchTitleClean.replace(/^the\s+/, '');

            const titleMatch = cleanTmdb === cleanLocal || cleanTmdb.includes(cleanLocal) || cleanLocal.includes(cleanTmdb);

            if (!titleMatch) return false;

            if (isTvSignature) return true; // Ignore year check for TV

            if (m.year === 'unknown' || m.year === '2000') return true;

            const releaseDate = g.release_date || g.first_air_date || '';
            if (releaseDate.startsWith(m.year)) return true;

            const movieYear = parseInt(m.year);
            const tmdbYear = parseInt(releaseDate.split('-')[0]);
            if (!isNaN(movieYear) && !isNaN(tmdbYear) && Math.abs(tmdbYear - movieYear) <= 1) {
                return true;
            }

            return false;
        }) || (isTvSignature ? globalMatches.find(g => g.media_type === 'tv') : globalMatches[0]);

        if (bestMatch) {
            return {
                ...bestMatch,
                id: bestMatch.id,
                title: bestMatch.title || bestMatch.name,
                original_title: m.title,
                overview: `[LOCAL AVAILABLE] ${m.quality} • ${m.size} • ${m.codec}\n${bestMatch.overview || ''}`,
                poster_path: bestMatch.poster_path,
                backdrop_path: bestMatch.backdrop_path,
                release_date: bestMatch.release_date || bestMatch.first_air_date || (m.year !== 'unknown' ? `${m.year}-01-01` : '2000-01-01'),
                vote_average: bestMatch.vote_average || 10,
                vote_count: bestMatch.vote_count,
                popularity: bestMatch.popularity,
                media_type: bestMatch.media_type || (bestMatch.first_air_date ? 'tv' : 'movie'),

                // Top Level Metadata for DownloadSection
                quality: m.quality,
                size: m.size,
                codec: m.codec,
                slug: m.slug,
                file_id: m.file_id,
                year: m.year,
                _id: m._id?.toString(),

                local_data: {
                    quality: m.quality,
                    size: m.size,
                    codec: m.codec
                }
            };
        }

        // Fallback (Negative ID)
        return {
            id: -stringToHash(m.file_id), // NEGATIVE ID to avoid collisions
            title: m.title,
            original_title: m.title,
            overview: `${m.quality} • ${m.size || 'Unknown Size'} • ${m.codec || 'No Codec'}\n${m.caption}`,
            poster_path: null,
            backdrop_path: null,
            release_date: m.year !== 'unknown' ? `${m.year}-01-01` : '2000-01-01',
            vote_average: 10,
            media_type: 'movie',

            quality: m.quality,
            size: m.size,
            codec: m.codec,
            slug: m.slug,
            file_id: m.file_id,
            year: m.year,
            _id: m._id?.toString(),

            local_data: true
        };
    }));
}
