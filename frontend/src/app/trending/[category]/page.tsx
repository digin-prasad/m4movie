import { MovieCard } from '@/components/features/MovieCard';
import { MovieGrid } from '@/components/features/MovieGrid';
import { tmdb } from '@/lib/tmdb';
import { ChevronLeft } from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';

interface Props {
    params: Promise<{ category: string }>;
}

export default async function TrendingPage({ params }: Props) {
    const { category } = await params;

    let title = '';
    let movies: any[] = [];
    let fetchCategory = '';

    switch (category) {
        case 'movies':
            title = 'Trending Movies';
            fetchCategory = 'trending';
            movies = await tmdb.getTrending();
            break;
        case 'series':
            title = 'Popular Series';
            fetchCategory = 'series';
            movies = await tmdb.getTrendingSeries();
            break;
        case 'anime':
            title = 'Latest Anime';
            fetchCategory = 'anime';
            movies = await tmdb.getAnime();
            break;
        case 'asian-dramas':
            title = 'Asian Dramas';
            fetchCategory = 'asian-dramas';
            movies = await tmdb.getAsianDramas();
            break;
        default:
            notFound();
    }

    return (
        <main className="min-h-screen bg-background text-foreground pb-20 pt-24">
            <div className="container px-4 mx-auto space-y-8">
                <div className="flex items-center gap-4">
                    <Link
                        href="/"
                        className="p-2 rounded-full bg-white/5 hover:bg-white/10 transition-colors"
                        title="Back to Home"
                    >
                        <ChevronLeft className="w-6 h-6" />
                    </Link>
                    <h1 className="text-3xl md:text-5xl font-bold text-white tracking-tight">
                        {title}
                    </h1>
                </div>

                <MovieGrid initialMovies={movies} fetchCategory={fetchCategory} />

                {movies.length === 0 && (
                    <div className="text-center py-20 text-muted-foreground">
                        No items found in this category.
                    </div>
                )}
            </div>
        </main>
    );
}
