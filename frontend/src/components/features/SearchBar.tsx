'use client';

import { Search, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
import { tmdb, TMDBMovie } from '@/lib/tmdb';
import Image from 'next/image';
import Link from 'next/link';
import { cn } from '@/lib/utils';

interface SearchBarProps {
    onSearchStateChange?: (isActive: boolean) => void;
    onResultsChange?: (results: TMDBMovie[]) => void;
    renderResults?: boolean;
    className?: string;
}

export function SearchBar({
    onSearchStateChange,
    onResultsChange,
    renderResults = true,
    className
}: SearchBarProps) {
    const router = useRouter();
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<TMDBMovie[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);

    // Notify parent of state changes
    useEffect(() => {
        onSearchStateChange?.(isOpen || query.length > 0);
    }, [isOpen, query, onSearchStateChange]);

    useEffect(() => {
        onResultsChange?.(results);
    }, [results, onResultsChange]);

    // Debounce Search
    useEffect(() => {
        const timer = setTimeout(async () => {
            if (query.trim()) {
                setLoading(true);
                // Call LOCAL API for fuzzy search on inventory
                try {
                    const res = await fetch(`/api/movies?q=${encodeURIComponent(query)}`);
                    const movies = await res.json();
                    setResults(Array.isArray(movies) ? movies.slice(0, 10) : []);
                } catch (e) {
                    console.error("Search failed", e);
                    setResults([]);
                }
                setLoading(false);
                setIsOpen(true);
            } else {
                setIsOpen(false);
                setResults([]);
            }
        }, 500);

        return () => clearTimeout(timer);
    }, [query]);

    // Outside click handler
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                // Only close if we are rendering results internally
                if (renderResults) {
                    setIsOpen(false);
                }
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [wrapperRef, renderResults]);

    const handleFocus = () => {
        if (query.trim()) setIsOpen(true);
        onSearchStateChange?.(true);
    };

    const handleBlur = () => {
        // Delay to allow clicks
        setTimeout(() => {
            if (!query.trim()) onSearchStateChange?.(false);
        }, 200);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (query.trim()) {
            setIsOpen(false);
            router.push(`/search?q=${encodeURIComponent(query)}`);
        }
    };

    return (
        <div ref={wrapperRef} className={cn("w-full max-w-3xl mx-auto relative z-50", className)}>
            <form onSubmit={handleSubmit} className="relative group w-full flex items-center gap-2">
                <div className="relative flex-1">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground w-5 h-5 pointer-events-none" />
                    <input
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onFocus={handleFocus}
                        onBlur={handleBlur}
                        placeholder="Search for movies, TV shows..."
                        className="w-full bg-slate-900/80 backdrop-blur-md border border-white/10 rounded-xl py-4 pl-12 pr-4 text-base text-white shadow-lg focus:outline-none focus:ring-1 focus:ring-primary/50 transition-all placeholder:text-muted-foreground/50"
                    />
                    {loading && (
                        <div className="absolute right-4 top-1/2 -translate-y-1/2">
                            <Loader2 className="w-5 h-5 animate-spin text-primary" />
                        </div>
                    )}
                </div>

                <button
                    type="submit"
                    className="p-4 bg-slate-800/80 hover:bg-slate-700 border border-white/10 rounded-xl text-white transition-colors flex-shrink-0"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><path d="M5 12h14" /><path d="m12 5 7 7-7 7" /></svg>
                </button>
            </form>

            {/* Poster Popup Results - Only if renderResults is true */}
            {renderResults && isOpen && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-background/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl overflow-hidden z-20">
                    <div className="max-h-[60vh] overflow-y-auto custom-scrollbar">
                        {results.length > 0 && (
                            <div className="p-2 space-y-1">
                                <h3 className="text-xs font-semibold text-muted-foreground mb-2 px-2 uppercase tracking-wider">
                                    {query ? 'Search Results' : 'Trending'}
                                </h3>
                                {results.map((movie) => (
                                    <Link
                                        key={movie.id}
                                        href={`/movie/${movie.id}`}
                                        onClick={() => setIsOpen(false)}
                                        className="flex items-center gap-4 p-2 rounded-lg hover:bg-white/5 transition-colors group"
                                    >
                                        <div className="relative w-12 h-16 flex-shrink-0 bg-muted rounded overflow-hidden">
                                            <Image
                                                src={tmdb.getImage(movie.poster_path, 'w92')}
                                                alt={movie.title}
                                                fill
                                                unoptimized
                                                className="object-cover"
                                            />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h4 className="text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors">
                                                {movie.title}
                                            </h4>
                                            <div className="flex items-center text-xs text-muted-foreground mt-0.5 space-x-2">
                                                <span>{movie.release_date?.split('-')[0] || 'N/A'}</span>
                                                <span>•</span>
                                                <span className="flex items-center text-yellow-500">
                                                    ★ {movie.vote_average.toFixed(1)}
                                                </span>
                                            </div>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        )}

                        {results.length === 0 && !loading && query && (
                            <div className="p-8 text-center text-muted-foreground">
                                <p>No movies found.</p>
                            </div>
                        )}

                        {/* View All Matches Button if there are results */}
                        {results.length > 0 && query && (
                            <div className="p-2 border-t border-white/5">
                                <button
                                    onClick={handleSubmit as any}
                                    className="w-full py-2 text-xs font-medium text-center text-primary hover:text-primary/80 transition-colors"
                                >
                                    View all results for "{query}"
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
