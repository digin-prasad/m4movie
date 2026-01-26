import { DownloadSection } from '@/components/features/DownloadSection';
import { tmdb } from '@/lib/tmdb';
import { ChevronLeft, Star, Calendar, Clock } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

import { getLocalMovieByHash } from '@/lib/search';

export default async function MoviePage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const numericId = parseInt(id);

    let movie: any = null;

    // Handle Local Files (Negative ID)
    if (numericId < 0) {
        const local = await getLocalMovieByHash(numericId);
        if (local) {
            movie = {
                id: numericId,
                title: local.title,
                original_title: local.title,
                overview: `[LOCAL FILE] ${local.caption}\nQuality: ${local.quality || 'N/A'} • Size: ${local.size || 'N/A'}`,
                poster_path: null,
                backdrop_path: null,
                release_date: local.year !== 'unknown' ? `${local.year}-01-01` : '2000-01-01',
                vote_average: 10,
                media_type: 'movie' // Treat as movie for display basic info
            };
        }
    } else {
        // TMDB Fetch
        movie = await tmdb.getMovie(numericId);
        // Fallback: If not a movie, try fetching as TV show
        if (!movie) {
            movie = await tmdb.getTvShow(numericId);
        }
    }

    if (!movie) return (
        <div className="min-h-screen flex items-center justify-center text-muted-foreground">
            Movie not found. ID: {id}
        </div>
    );

    const title = movie.title || movie.name || 'Untitled';
    const date = movie.release_date || movie.first_air_date;
    const year = date ? date.split('-')[0] : 'N/A';
    const isTv = !!movie.name; // Simple heuristic, or check media_type if available

    return (
        <main className="min-h-screen bg-background pb-10">
            {/* Backdrop */}
            <div className="relative h-[60vh] w-full">
                <Image
                    src={tmdb.getImage(movie.backdrop_path || movie.poster_path, 'original')}
                    alt={title}
                    fill
                    unoptimized
                    className="object-cover"
                    priority
                />
                <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />

                <Link
                    href="/"
                    className="absolute top-8 left-4 md:left-8 z-20 flex items-center gap-2 text-white/80 hover:text-white transition-colors bg-black/30 p-2 rounded-full backdrop-blur-sm"
                >
                    <ChevronLeft className="w-6 h-6" />
                    <span className="sr-only">Back</span>
                </Link>
            </div>

            <div className="container px-4 mx-auto -mt-32 relative z-10">
                <div className="grid md:grid-cols-[300px_1fr] gap-8">
                    {/* Poster */}
                    <div className="hidden md:block relative aspect-[2/3] rounded-xl overflow-hidden shadow-2xl border-4 border-background bg-muted">
                        <Image
                            src={tmdb.getImage(movie.poster_path)}
                            alt={title}
                            fill
                            unoptimized
                            className="object-cover"
                        />
                    </div>

                    {/* Info */}
                    <div className="space-y-6 pt-4 md:pt-0">
                        <div className="space-y-2">
                            <h1 className="text-4xl md:text-5xl font-bold text-white drop-shadow-lg">{title}</h1>
                            <div className="flex flex-wrap items-center gap-4 text-muted-foreground text-sm">
                                <div className="flex items-center gap-1">
                                    <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                                    <span className="text-white font-medium">{movie.vote_average ? movie.vote_average.toFixed(1) : 'N/A'}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                    <Calendar className="w-4 h-4" />
                                    <span>{year}</span>
                                </div>
                                <div className="px-2 py-0.5 rounded border border-white/20 text-xs text-white uppercase tracking-wider">
                                    {isTv ? 'TV Series' : 'Movie'}
                                </div>
                            </div>
                        </div>

                        <p className="text-lg leading-relaxed text-gray-300 max-w-3xl">
                            {movie.overview}
                        </p>

                        <div className="border-t border-white/10 my-8" />

                        {/* Download Section */}
                        <div className="max-w-2xl">
                            <DownloadSection movieId={movie.id} movieTitle={title} />
                        </div>
                    </div>
                </div>
            </div>
        </main>
    );
}
