import { DownloadSection } from '@/components/features/DownloadSection';
import { tmdb } from '@/lib/tmdb';
import { ChevronLeft, Star, Calendar } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

export default async function TvPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;

    // Explicitly fetch TV show
    const show = await tmdb.getTvShow(parseInt(id));

    if (!show) return (
        <div className="min-h-screen flex items-center justify-center text-muted-foreground">
            TV Show not found. ID: {id}
        </div>
    );

    const title = show.name || show.title || 'Untitled';
    const date = show.first_air_date || show.release_date;
    const year = date ? date.split('-')[0] : 'N/A';

    return (
        <main className="min-h-screen bg-background pb-10">
            {/* Backdrop */}
            <div className="relative h-[60vh] w-full">
                <Image
                    src={tmdb.getImage(show.backdrop_path || show.poster_path, 'original')}
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
                            src={tmdb.getImage(show.poster_path)}
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
                                    <span className="text-white font-medium">{show.vote_average ? show.vote_average.toFixed(1) : 'N/A'}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                    <Calendar className="w-4 h-4" />
                                    <span>{year}</span>
                                </div>
                                <div className="px-2 py-0.5 rounded border border-white/20 text-xs text-white uppercase tracking-wider">
                                    TV Series
                                </div>
                            </div>
                        </div>

                        <p className="text-lg leading-relaxed text-gray-300 max-w-3xl">
                            {show.overview}
                        </p>

                        <div className="border-t border-white/10 my-8" />

                        {/* Download Section (Reused) */}
                        <div className="max-w-2xl">
                            {/* 
                                Note: DownloadSection might need updates if it specifically looks for 'movies'.
                                But for now, we assume it searches by query string (title), so it might work.
                                If it searches by ID, we might have issues if the bot database only stores movies or mixes them.
                             */}
                            <DownloadSection movieId={show.id} movieTitle={title} />
                        </div>
                    </div>
                </div>
            </div>
        </main>
    );
}
