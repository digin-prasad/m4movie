import { MovieCard } from '@/components/features/MovieCard';
import { SearchBar } from '@/components/features/SearchBar';
import { tmdb } from '@/lib/tmdb';

type Props = {
    searchParams: Promise<{ q?: string }>;
};

export default async function SearchPage({ searchParams }: Props) {
    const { q } = await searchParams;
    const query = q || '';
    const movies = query ? await tmdb.searchMovies(query) : [];

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
                            Found {movies.length} results
                        </p>
                    )}
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
                    {movies.map((movie) => (
                        <MovieCard key={movie.id} movie={movie} />
                    ))}
                    {movies.length === 0 && query && (
                        <div className="col-span-full text-center py-20 text-muted-foreground">
                            <p>No movies found matching "{query}".</p>
                        </div>
                    )}
                </div>
            </div>
        </main>
    );
}
