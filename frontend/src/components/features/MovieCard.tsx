import Image from 'next/image';
import Link from 'next/link';
import { Star } from 'lucide-react';
import { Movie } from '@/types/movie';
import { cn } from '@/lib/utils';

interface MovieCardProps {
    movie: Movie;
    className?: string;
}

export function MovieCard({ movie, className }: MovieCardProps) {
    const title = movie.title || movie.name || 'Untitled';
    const date = movie.release_date || movie.first_air_date;
    const year = date ? date.split('-')[0] : 'N/A';

    // Heuristic: If it has a 'name' but no 'title', or media_type is 'tv', it's a TV show.
    // This prevents "Home Alone" (TV Show) linking to "Home Alone" (Movie) which share IDs.
    const isTv = (movie as any).media_type === 'tv' || (!movie.title && !!movie.name);
    const href = isTv ? `/tv/${movie.id}` : `/movie/${movie.id}`;

    return (
        <Link
            href={href}
            className={cn(
                "group relative block overflow-hidden rounded-xl bg-card transition-all hover:scale-105 hover:shadow-xl hover:shadow-primary/20 isolate",
                className
            )}
        >
            <div className="aspect-[2/3] relative w-full overflow-hidden rounded-t-xl">
                <Image
                    src={movie.poster_path ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` : '/placeholder.jpg'}
                    alt={title}
                    fill
                    unoptimized // Prevents Render proxy timeouts
                    className="object-cover transition-transform duration-300 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-4">
                    <p className="text-white font-medium line-clamp-2">{movie.overview || 'No overview available.'}</p>
                </div>
            </div>
            <div className="p-3 space-y-1 text-center">
                <h3 className="font-semibold text-lg line-clamp-1 group-hover:text-primary transition-colors">
                    {title}
                </h3>
                <div className="flex items-center justify-center text-sm text-muted-foreground">
                    <Star className="w-4 h-4 text-yellow-500 fill-yellow-500 mr-1" />
                    <span>{movie.vote_average ? movie.vote_average.toFixed(1) : '0.0'}</span>
                    <span className="mx-2">•</span>
                    <span>{year}</span>
                </div>
            </div>
        </Link>
    );
}
