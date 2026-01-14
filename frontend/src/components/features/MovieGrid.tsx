'use client';

import { TMDBMovie } from "@/lib/tmdb";
import { MovieCard } from "./MovieCard";
import { Loader2 } from "lucide-react";
import { useState, useEffect } from "react";

interface MovieGridProps {
    initialMovies: TMDBMovie[];
    fetchCategory: string;
}

export function MovieGrid({ initialMovies, fetchCategory }: MovieGridProps) {
    const [movies, setMovies] = useState<TMDBMovie[]>(initialMovies);
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(false);
    const [hasMore, setHasMore] = useState(true);

    // If initialMovies changes, reset state
    useEffect(() => {
        setMovies(initialMovies);
        setPage(1);
        setHasMore(true);
    }, [initialMovies]);

    const loadMore = async () => {
        if (loading || !hasMore) return;

        setLoading(true);
        try {
            const nextPage = page + 1;
            const res = await fetch(`/api/content?category=${fetchCategory}&page=${nextPage}`);
            const data = await res.json();

            if (data.results && data.results.length > 0) {
                // Filter out duplicates just in case
                setMovies(prev => {
                    const existingIds = new Set(prev.map(m => m.id));
                    const newUnique = data.results.filter((m: TMDBMovie) => !existingIds.has(m.id));
                    return [...prev, ...newUnique];
                });
                setPage(nextPage);
            } else {
                setHasMore(false);
            }
        } catch (error) {
            console.error("Failed to fetch more movies:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const handleScroll = () => {
            if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 1000) {
                loadMore();
            }
        };

        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, [loading, hasMore, page, fetchCategory]); // Dependencies for closure freshness

    if (!movies.length) return null;

    return (
        <div className="space-y-10">
            <div className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-7 gap-4">
                {movies.map((movie, index) => (
                    <div key={`${movie.id}-${index}`}> {/* Use index fallback for key uniqueness in list */}
                        <MovieCard movie={movie} />
                    </div>
                ))}
            </div>

            {loading && (
                <div className="flex justify-center py-8">
                    <Loader2 className="w-8 h-8 text-primary animate-spin" />
                </div>
            )}

            {!hasMore && movies.length > 0 && (
                <div className="text-center py-8 text-muted-foreground">
                    You've reached the end of the list.
                </div>
            )}
        </div>
    );
}
