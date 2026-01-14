'use client';

import { MovieCard } from "./MovieCard";
import { TMDBMovie } from "@/lib/tmdb";
import { ChevronRight, Loader2 } from "lucide-react"; // Added Loader2
import Link from "next/link";
import { useState, useRef, useEffect } from "react";

interface ContentSectionProps {
    title: string;
    movies: TMDBMovie[];
    bgGradient?: string;
    viewMoreLink?: string;
    fetchCategory?: string; // New prop to identify what to fetch
}

export function ContentSection({ title, movies: initialMovies, bgGradient, viewMoreLink = "#", fetchCategory }: ContentSectionProps) {
    const [movies, setMovies] = useState<TMDBMovie[]>(initialMovies);
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    // If initialMovies changes (e.g. strict mode re-renders), update state
    useEffect(() => {
        setMovies(initialMovies);
    }, [initialMovies]);

    const loadMoreMovies = async () => {
        if (loading || !hasMore || !fetchCategory) return;

        setLoading(true);
        try {
            const nextPage = page + 1;
            const res = await fetch(`/api/content?category=${fetchCategory}&page=${nextPage}`);
            const data = await res.json();

            if (data.results && data.results.length > 0) {
                setMovies(prev => [...prev, ...data.results]);
                setPage(nextPage);
            } else {
                setHasMore(false);
            }
        } catch (error) {
            console.error("Failed to load more movies", error);
        } finally {
            setLoading(false);
        }
    };

    const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
        const { scrollLeft, scrollWidth, clientWidth } = e.currentTarget;

        // Check if scrolled near the end (buffer of 300px)
        if (scrollWidth - (scrollLeft + clientWidth) < 300) {
            loadMoreMovies();
        }
    };

    if (!movies.length) return null;

    return (
        <section className="relative z-20 py-8">
            {bgGradient && (
                <div className={`absolute inset-0 bg-gradient-to-r ${bgGradient} opacity-5 mix-blend-screen pointer-events-none`} />
            )}

            <div className="container px-4 mx-auto space-y-4">
                <div className="flex items-end justify-between px-2">
                    <h2 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
                        {title}
                    </h2>
                    <Link href={viewMoreLink} className="text-sm font-medium text-muted-foreground hover:text-primary flex items-center gap-1 transition-colors group">
                        View More <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                    </Link>
                </div>

                <div
                    className="relative group/slider"
                >
                    <div
                        className="flex gap-4 overflow-x-auto pb-6 px-2 snap-x snap-mandatory custom-scrollbar scroll-smooth"
                        onScroll={handleScroll}
                    >
                        {movies.map((movie, index) => (
                            <div key={`${movie.id}-${index}`} className="min-w-[120px] md:min-w-[140px] lg:min-w-[160px] snap-start">
                                <MovieCard movie={movie} />
                            </div>
                        ))}

                        {/* Loading Spinner at the end */}
                        {loading && (
                            <div className="min-w-[140px] md:min-w-[160px] lg:min-w-[180px] flex items-center justify-center">
                                <Loader2 className="w-8 h-8 text-primary animate-spin" />
                            </div>
                        )}
                    </div>

                    {/* Fade Edges */}
                    <div className="absolute inset-y-0 left-0 w-12 bg-gradient-to-r from-background to-transparent pointer-events-none" />
                    <div className="absolute inset-y-0 right-0 w-12 bg-gradient-to-l from-background to-transparent pointer-events-none" />
                </div>
            </div>
        </section>
    );
}
