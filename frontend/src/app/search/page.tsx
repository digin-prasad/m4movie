import { MovieCard } from '@/components/features/MovieCard';
import { SearchBar } from '@/components/features/SearchBar';
import { tmdb, TMDBMovie } from '@/lib/tmdb';
import { searchLocalMovies, LocalMovie, stringToHash } from '@/lib/search';

type Props = {
    searchParams: Promise<{ q?: string }>;
};

// Replicate hydration logic for Server Component
async function hydrateLocalMovies(localMovies: LocalMovie[]): Promise<TMDBMovie[]> {
    // We can't use the API route URL efficiently here, so we use direct logic
    // This effectively "promotes" local files to have TMDB metadata if possible
    const hydrated = await Promise.all(localMovies.map(async (m) => {
        // Try to match with TMDB to get real ID/Images
        const globalMatches = await tmdb.searchMovies(m.title);
        // Find rough match with year if possible
        const bestMatch = globalMatches.find(g =>
            g.title.toLowerCase() === m.title.toLowerCase() &&
            (m.year === 'unknown' || g.release_date?.startsWith(m.year))
        ) || globalMatches[0];

        if (bestMatch) {
            return {
                ...bestMatch,
                // Override overview to show it's OUR file
                overview: `[LOCAL AVAILABLE] ${m.quality} • ${m.size} • ${m.codec}\n${bestMatch.overview}`,
                local_data: {
                    quality: m.quality,
                    size: m.size,
                    codec: m.codec
                }
            } as TMDBMovie;
        }

        // Search-only fallback
        return {
            id: stringToHash(m.file_id),
            title: m.title,
            original_title: m.title,
            overview: `${m.quality} • ${m.size} • ${m.codec}\n${m.caption}`,
            poster_path: null,
            backdrop_path: null,
            release_date: m.year !== 'unknown' ? `${m.year}-01-01` : '2000-01-01',
            vote_average: 10,
            media_type: 'movie'
        } as TMDBMovie;
    }));

    return hydrated;
}

export default async function SearchPage({ searchParams }: Props) {
    const { q } = await searchParams;
    const query = q || '';

    // 1. Local Search (Top Priority)
    // 1. Local Search (Top Priority)
    const rawLocal = await searchLocalMovies(query);
    const localMoviesAll = await hydrateLocalMovies(rawLocal);

    // Deduplicate Local Movies (One Banner Policy)
    // We prefer the one that matched best (first in list usually) or high quality
    // Since searchLocalMovies sorts by score, the first one is usually best match.
    const localMoviesMap = new Map<number, TMDBMovie>();
    for (const m of localMoviesAll) {
        if (!localMoviesMap.has(m.id)) {
            localMoviesMap.set(m.id, m);
        }
    }
    const localMovies = Array.from(localMoviesMap.values());
    const localIds = new Set(localMovies.map(m => m.id));

    // 2. Global Search (Franchise/Related)
    let globalMovies: TMDBMovie[] = [];
    if (query) {
        // Use Multi-Search to include TV Shows (Anime, Dramas, Series)
        const rawGlobal = await tmdb.searchMulti(query);

        // Filter out items we already have in local
        // And Sort by Popularity to highlight the Franchise
        globalMovies = rawGlobal
            .filter(m => !localIds.has(m.id))
            .sort((a, b) => (b.popularity || 0) - (a.popularity || 0));
    }

    // 3. Merge
    const allMovies = [...localMovies, ...globalMovies];

    return (
        <main className="min-h-screen bg-background text-foreground pb-20 pt-24">
            <div className="container px-4 mx-auto space-y-8">
                <div className="max-w-2xl mx-auto">
                    <SearchBar />
                </div>

                <div className="space-y-4">
                    <h1 className="text-3xl font-bold">
                        {query ? `Search Results for "${query}"` : 'Search for Movies'}
                    </h1>
                    {query && (
                        <p className="text-muted-foreground">
                            Found {allMovies.length} results ({localMovies.length} Ready to Watch)
                        </p>
                    )}
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
                    {allMovies.map((movie) => (
                        <div key={movie.id} className="relative group">
                            {/* Badge for Local Files */}
                            {localIds.has(movie.id) && (
                                <div className="absolute top-2 left-2 z-20 bg-emerald-500 text-black text-[10px] font-bold px-2 py-0.5 rounded shadow-lg">
                                    AVAILABLE
                                </div>
                            )}
                            <MovieCard movie={movie} />
                        </div>
                    ))}
                    {allMovies.length === 0 && query && (
                        <div className="col-span-full text-center py-20 text-muted-foreground">
                            <p>No movies found matching "{query}".</p>
                        </div>
                    )}
                </div>
            </div>
        </main>
    );
}
