const BASE_URL = 'https://api.themoviedb.org/3';

export interface TMDBMovie {
    id: number;
    title: string;
    name?: string; // For TV shows
    original_title: string;
    overview: string;
    poster_path: string | null;
    backdrop_path: string | null;
    release_date: string;
    first_air_date?: string; // For TV shows
    vote_average: number;
    vote_count?: number;
    popularity?: number; // Crucial for sorting relevance
    media_type?: string;
}

// Helper for resilience with Next.js caching support
const fetchWithRetry = async (url: string, options?: RequestInit, retries = 3): Promise<Response> => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

    const fetchOptions: RequestInit = {
        ...options,
        signal: controller.signal,
        next: { revalidate: 86400, ...(options as any)?.next }
    };

    try {
        for (let i = 0; i < retries; i++) {
            try {
                const res = await fetch(url, fetchOptions);
                clearTimeout(timeoutId);
                if (res.ok) return res;

                if (res.status === 429) {
                    const wait = (i + 1) * 2000;
                    console.warn(`TMDB Rate Limited. Waiting ${wait}ms...`);
                    await new Promise(r => setTimeout(r, wait));
                } else if (res.status >= 500) {
                    await new Promise(r => setTimeout(r, 500 * (i + 1)));
                } else {
                    return res;
                }
            } catch (err) {
                if (i === retries - 1) throw err;
                await new Promise(r => setTimeout(r, 1000 * (i + 1)));
            }
        }
        throw new Error('Max retries reached');
    } finally {
        clearTimeout(timeoutId);
    }
};

export const tmdb = {
    getImage: (path: string | null, size: 'w92' | 'w154' | 'w185' | 'w342' | 'w500' | 'w780' | 'original' = 'w500') => {
        if (!path) return '/placeholder.jpg';
        return `https://image.tmdb.org/t/p/${size}${path}`;
    },

    getTrending: async (page: number = 1): Promise<TMDBMovie[]> => {
        const apiKey = process.env.NEXT_PUBLIC_TMDB_API_KEY;
        if (!apiKey) return [];
        try {
            const url = new URL(`${BASE_URL}/trending/movie/day`);
            url.searchParams.append('api_key', apiKey);
            url.searchParams.append('page', page.toString());

            const res = await fetchWithRetry(url.toString(), {
                next: { revalidate: 86400 } // 24 hours for trending
            });

            if (!res.ok) throw new Error(`TMDB API Error: ${res.status}`);
            const data = await res.json();
            return data.results || [];
        } catch (error) {
            console.warn("TMDB Trending Error", error);
            return [];
        }
    },

    searchMovies: async (query: string): Promise<TMDBMovie[]> => {
        const apiKey = process.env.NEXT_PUBLIC_TMDB_API_KEY;
        if (!query || !apiKey) return [];
        try {
            const url = new URL(`${BASE_URL}/search/movie`);
            url.searchParams.append('api_key', apiKey);
            url.searchParams.append('query', query);

            const res = await fetchWithRetry(url.toString(), {
                next: { revalidate: 3600 } // 1 hour for search results
            });
            const data = await res.json();
            return data.results || [];
        } catch (error) {
            console.warn("TMDB Search Error", error);
            return [];
        }
    },

    getTrendingSeries: async (page: number = 1): Promise<TMDBMovie[]> => {
        const apiKey = process.env.NEXT_PUBLIC_TMDB_API_KEY;
        if (!apiKey) return [];
        try {
            const url = new URL(`${BASE_URL}/trending/tv/day`);
            url.searchParams.append('api_key', apiKey);
            url.searchParams.append('page', page.toString());

            const res = await fetchWithRetry(url.toString(), {
                next: { revalidate: 86400 }
            });
            const data = await res.json();
            return data.results || [];
        } catch (error) {
            return [];
        }
    },

    getAnime: async (page: number = 1): Promise<TMDBMovie[]> => {
        const apiKey = process.env.NEXT_PUBLIC_TMDB_API_KEY;
        if (!apiKey) return [];
        try {
            const url = new URL(`${BASE_URL}/discover/tv`);
            url.searchParams.append('api_key', apiKey);
            url.searchParams.append('with_genres', '16');
            url.searchParams.append('with_original_language', 'ja');
            url.searchParams.append('sort_by', 'popularity.desc');
            url.searchParams.append('page', page.toString());

            const res = await fetchWithRetry(url.toString(), {
                next: { revalidate: 86400 }
            });
            const data = await res.json();
            return data.results || [];
        } catch (error) {
            return [];
        }
    },

    getAsianDramas: async (page: number = 1): Promise<TMDBMovie[]> => {
        const apiKey = process.env.NEXT_PUBLIC_TMDB_API_KEY;
        if (!apiKey) return [];
        try {
            const url = new URL(`${BASE_URL}/discover/tv`);
            url.searchParams.append('api_key', apiKey);
            url.searchParams.append('with_original_language', 'ko');
            url.searchParams.append('sort_by', 'popularity.desc');
            url.searchParams.append('page', page.toString());

            const res = await fetchWithRetry(url.toString(), {
                next: { revalidate: 86400 }
            });
            const data = await res.json();
            return data.results || [];
        } catch (error) {
            return [];
        }
    },

    getMovie: async (id: number): Promise<TMDBMovie | null> => {
        const apiKey = process.env.NEXT_PUBLIC_TMDB_API_KEY;
        if (!apiKey) return null;
        try {
            const url = new URL(`${BASE_URL}/movie/${id}`);
            url.searchParams.append('api_key', apiKey);

            const res = await fetchWithRetry(url.toString(), {
                next: { revalidate: 86400 }
            });
            if (!res.ok) return null;
            return await res.json();
        } catch (error) {
            return null;
        }
    },

    getTvShow: async (id: number): Promise<TMDBMovie | null> => {
        const apiKey = process.env.NEXT_PUBLIC_TMDB_API_KEY;
        if (!apiKey) return null;
        try {
            const url = new URL(`${BASE_URL}/tv/${id}`);
            url.searchParams.append('api_key', apiKey);

            const res = await fetchWithRetry(url.toString(), {
                next: { revalidate: 86400 }
            });
            if (!res.ok) return null;
            return await res.json();
        } catch (error) {
            return null;
        }
    }
};
