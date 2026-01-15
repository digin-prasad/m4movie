'use client';

import { useState } from 'react';
import { SearchBar } from '@/components/features/SearchBar';
import { WebGLPosterGrid } from '@/components/ui/WebGLPosterGrid';
import { Movie } from '@/types/movie';
import Link from 'next/link';
import Image from 'next/image';
import { TMDBMovie } from '@/lib/tmdb';
import { Anton } from 'next/font/google';

// Load "POPULAR" style font
const anton = Anton({ weight: '400', subsets: ['latin'] });

interface HeroSectionProps {
    backgroundMovies: Movie[];
}

export function HeroSection({ backgroundMovies }: HeroSectionProps) {
    const [isSearchActive, setIsSearchActive] = useState(false);
    const [searchResults, setSearchResults] = useState<TMDBMovie[]>([]);

    return (
        <div className="relative w-full h-screen overflow-hidden bg-black group/hero">

            {/* 1. Interactive Background (dimmed when search active) */}
            <div className={`absolute inset-0 z-0 transition-opacity duration-700 ${isSearchActive ? 'opacity-30' : 'opacity-100'}`}>
                <WebGLPosterGrid movies={backgroundMovies} />
                {/* Bottom Gradient for seamless transition */}
                <div className="absolute bottom-0 left-0 w-full h-32 bg-gradient-to-t from-background via-background/60 to-transparent pointer-events-none z-10" />
            </div>

            {/* 2. Top Header (Logo Only) */}
            <div className={`absolute top-0 left-0 w-full p-8 md:px-16 flex justify-between items-start z-50 pointer-events-none transition-all duration-500 ${isSearchActive ? 'opacity-50 blur-sm' : 'opacity-100'}`}>
                {/* Logo (Top-Left) */}
                <div className="relative w-48 h-28 -ml-6 -mt-4 pointer-events-auto">
                    <img
                        src="/logo.png"
                        alt="M4MOVIE Logo"
                        className="w-full h-full object-contain relative z-10 drop-shadow-[0_0_25px_rgba(255,255,255,0.2)]"
                    />
                </div>
            </div>

            {/* 3. Center Content (Title, Search, Categories, Results) */}
            <div className={`relative z-40 h-full flex flex-col items-center justify-center space-y-6 pointer-events-none transition-all duration-500 ${isSearchActive ? 'pt-12 justify-start' : 'pt-0'}`}>

                {/* TITLE - GOLD STYLE WITH VIGNETTE */}
                <div className={`relative text-center pointer-events-auto transition-all duration-700 ${isSearchActive ? 'scale-75 mb-0' : 'scale-100 mb-4'}`}>
                    {/* Vignette / Backdrop for visual separation */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[140%] h-[140%] bg-radial-gradient from-black/80 via-black/40 to-transparent blur-3xl -z-10 opacity-80" />

                    <h1 className={`
                        ${anton.className}
                        relative z-10
                        text-7xl md:text-[10rem] leading-none font-black tracking-tighter 
                        transform transition-all duration-700 ease-out select-none
                        scale-y-[1.3] opacity-100
                        bg-clip-text text-transparent bg-gradient-to-br from-[#FFF5C3] via-[#FFD700] to-[#B8860B]
                        drop-shadow-[0_10px_20px_rgba(0,0,0,0.8)]
                        ${isSearchActive ? 'blur-0' : 'blur-[0px]'}
                        group-hover/hero:scale-x-105 group-hover/hero:scale-y-[1.35]
                     `}>
                        M4 MOVIE
                    </h1>
                    {/* Inner Glow / Lighting Accent */}
                    <h1 className={`
                        ${anton.className}
                        absolute top-0 left-0 w-full z-20 pointer-events-none
                        text-7xl md:text-[10rem] leading-none font-black tracking-tighter 
                        scale-y-[1.3]
                        text-transparent bg-clip-text bg-gradient-to-tr from-transparent via-white/20 to-transparent
                        opacity-50 mix-blend-overlay
                     `}>
                        M4 MOVIE
                    </h1>
                    {/* Outer Bloom Layer (Darker Gold) */}
                    <h1 className={`
                        ${anton.className}
                        absolute top-0 left-0 w-full -z-10
                        text-7xl md:text-[10rem] leading-none font-black tracking-tighter 
                        scale-y-[1.3]
                        text-[#B8860B]/40 blur-2xl transition-all duration-700
                        ${isSearchActive ? 'opacity-90' : 'opacity-60'}
                     `}>
                        M4 MOVIE
                    </h1>
                </div>

                {/* Search Bar - Controlled by Hero */}
                <div className="w-full max-w-2xl px-4 pointer-events-auto transform transition-all duration-500 hover:scale-[1.02] z-50">
                    <SearchBar
                        renderResults={false} // We render results manually below
                        onSearchStateChange={setIsSearchActive}
                        onResultsChange={setSearchResults}
                        className={isSearchActive ? "scale-105 shadow-2xl" : ""}
                    />
                </div>

                {/* Categories removed as per request */}

                {/* "Scroll to explore" hint - Interactive */}
                {!isSearchActive && (
                    <div
                        onClick={() => window.scrollTo({ top: window.innerHeight, behavior: 'instant' })}
                        className="absolute bottom-10 animate-bounce duration-[3000ms] text-center opacity-60 cursor-pointer hover:opacity-100 transition-opacity z-50"
                    >
                        <p className="text-[10px] uppercase tracking-[0.2em] text-white/80 font-light">
                            Scroll to explore
                        </p>
                        <div className="w-[1px] h-8 bg-gradient-to-b from-white/50 to-transparent mx-auto mt-2" />
                    </div>
                )}

                {/* Search Results Panel - Pushes content or overlays */}
                {isSearchActive && searchResults.length > 0 && (
                    <div className="w-full max-w-4xl px-4 animate-in fade-in slide-in-from-bottom-8 duration-300 flex-1 overflow-hidden min-h-0 pointer-events-auto">
                        <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl p-4 overflow-y-auto max-h-[50vh] custom-scrollbar grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                            {searchResults.map((movie, index) => (
                                <Link
                                    key={`${movie.id}-${index}`}
                                    href={`/movie/${movie.id}`}
                                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/10 transition-colors group"
                                >
                                    <div className="relative w-12 h-16 flex-shrink-0 bg-muted rounded overflow-hidden shadow-md">
                                        <Image
                                            src={movie.poster_path ? `https://image.tmdb.org/t/p/w200${movie.poster_path}` : '/placeholder.jpg'}
                                            alt={movie.title}
                                            fill
                                            unoptimized
                                            className="object-cover"
                                        />
                                    </div>
                                    <div className="flex-1 min-w-0 text-left">
                                        <h4 className="text-sm font-medium text-white truncate group-hover:text-primary transition-colors">
                                            {movie.title || movie.name}
                                        </h4>
                                        <div className="flex items-center text-xs text-white/50 mt-1 space-x-2">
                                            <span>{(movie.release_date || movie.first_air_date)?.split('-')[0] || 'N/A'}</span>
                                            <span>•</span>
                                            <span className="flex items-center text-yellow-500">
                                                ★ {movie.vote_average?.toFixed(1) || '0.0'}
                                            </span>
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
}
