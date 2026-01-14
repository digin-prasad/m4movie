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
    media_type?: string;
}

// Helper for resilience
const fetchWithRetry = async (url: string, options?: RequestInit, retries = 3): Promise<Response> => {
    for (let i = 0; i < retries; i++) {
        try {
            const res = await fetch(url, { ...options, cache: 'no-store' }); // Disable cache to prevent stale errors
            if (res.ok) return res;
            // If 429 (Too Many Requests), wait longer
            if (res.status === 429) {
                await new Promise(r => setTimeout(r, 1000 * (i + 1)));
            }
        } catch (err) {
            if (i === retries - 1) throw err;
        }
        // Backoff
        await new Promise(r => setTimeout(r, 500 * (i + 1)));
    }
    throw new Error('Max retries reached');
};

export const tmdb = {
    getImage: (path: string | null, size: 'w92' | 'w154' | 'w185' | 'w342' | 'w500' | 'w780' | 'original' = 'w500') => {
        if (!path) return '/placeholder.jpg';
        return `https://image.tmdb.org/t/p/${size}${path}`;
    },

    getTrending: async (page: number = 1): Promise<TMDBMovie[]> => {
        const apiKey = process.env.NEXT_PUBLIC_TMDB_API_KEY;
        console.log("Fetching trending movies...");

        try {
            if (!apiKey) {
                console.warn("TMDB_API_KEY is missing via process.env.NEXT_PUBLIC_TMDB_API_KEY");
                return [];
            }

            // Switch to daily trending
            const url = new URL(`${BASE_URL}/trending/movie/day`);
            url.searchParams.append('api_key', apiKey);
            url.searchParams.append('page', page.toString());

            const res = await fetchWithRetry(url.toString());

            if (!res.ok) {
                throw new Error(`TMDB API Error: ${res.status} ${res.statusText}`);
            }

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

            const res = await fetchWithRetry(url.toString());
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
            // Switch to daily trending
            const url = new URL(`${BASE_URL}/trending/tv/day`);
            url.searchParams.append('api_key', apiKey);
            url.searchParams.append('page', page.toString());

            const res = await fetchWithRetry(url.toString());
            const data = await res.json();
            return data.results || [];
        } catch (error) {
            console.warn("TMDB TV Trending Error", error);
            return [];
        }
    },

    getAnime: async (page: number = 1): Promise<TMDBMovie[]> => {
        const apiKey = process.env.NEXT_PUBLIC_TMDB_API_KEY;
        if (!apiKey) return [];
        try {
            const url = new URL(`${BASE_URL}/discover/tv`);
            url.searchParams.append('api_key', apiKey);
            url.searchParams.append('with_genres', '16'); // Animation
            url.searchParams.append('with_original_language', 'ja'); // Japanese
            url.searchParams.append('sort_by', 'popularity.desc');
            url.searchParams.append('page', page.toString());

            const res = await fetchWithRetry(url.toString());
            const data = await res.json();
            return data.results || [];
        } catch (error) {
            console.warn("TMDB Anime Error", error);
            return [];
        }
    },

    getAsianDramas: async (page: number = 1): Promise<TMDBMovie[]> => {
        const apiKey = process.env.NEXT_PUBLIC_TMDB_API_KEY;
        if (!apiKey) return [];
        try {
            const url = new URL(`${BASE_URL}/discover/tv`);
            url.searchParams.append('api_key', apiKey);
            url.searchParams.append('with_original_language', 'ko'); // Korean
            url.searchParams.append('sort_by', 'popularity.desc');
            url.searchParams.append('page', page.toString());

            const res = await fetchWithRetry(url.toString());
            const data = await res.json();
            return data.results || [];
        } catch (error) {
            console.warn("TMDB Asian Drama Error", error);
            return [];
        }
    },
    getMovie: async (id: number): Promise<TMDBMovie | null> => {
        const apiKey = process.env.NEXT_PUBLIC_TMDB_API_KEY;
        if (!apiKey) return null;
        try {
            const url = new URL(`${BASE_URL}/movie/${id}`);
            url.searchParams.append('api_key', apiKey);

            const res = await fetchWithRetry(url.toString());
            if (!res.ok) return null;
            return await res.json();
        } catch (error) {
            console.warn("TMDB Get Error", error);
            return null;
        }
    },

    getTvShow: async (id: number): Promise<TMDBMovie | null> => {
        const apiKey = process.env.NEXT_PUBLIC_TMDB_API_KEY;
        if (!apiKey) return null;
        try {
            const url = new URL(`${BASE_URL}/tv/${id}`);
            url.searchParams.append('api_key', apiKey);

            const res = await fetchWithRetry(url.toString());
            if (!res.ok) return null;
            return await res.json();
        } catch (error) {
            console.warn("TMDB Get TV Error", error);
            return null;
        }
    }
};
