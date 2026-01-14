import { HeroSection } from '@/components/features/HeroSection';
import { ContentSection } from '@/components/features/ContentSection';
import { tmdb } from '@/lib/tmdb';

export default async function Home() {

  // Parallel fetching for performance
  // Parallel fetching for infinite variety (Pages 1-3)
  const [
    trendingMoviesP1, trendingMoviesP2, trendingMoviesP3,
    trendingSeriesP1, trendingSeriesP2, trendingSeriesP3,
    anime,
    asianDramas
  ] = await Promise.all([
    tmdb.getTrending(1), tmdb.getTrending(2), tmdb.getTrending(3),
    tmdb.getTrendingSeries(1), tmdb.getTrendingSeries(2), tmdb.getTrendingSeries(3),
    tmdb.getAnime(),
    tmdb.getAsianDramas()
  ]);

  // Combine deep pool for background (approx 160+ unique items)
  const allContent = [
    ...trendingMoviesP1, ...trendingMoviesP2, ...trendingMoviesP3,
    ...trendingSeriesP1, ...trendingSeriesP2, ...trendingSeriesP3,
    ...anime, ...asianDramas
  ].sort(() => Math.random() - 0.5); // Deep Shuffle

  // Content sections use Page 1 only for relevance
  const trendingMovies = trendingMoviesP1;
  const trendingSeries = trendingSeriesP1;

  return (
    <main className="min-h-screen bg-background text-foreground pb-20">
      {/* Hero Section */}
      {/* Hero Section */}
      {/* Hero Section - Full Screen */}
      {/* Hero Section - Full Screen */}
      <HeroSection backgroundMovies={allContent} />

      <div className="relative z-40 space-y-4">
        <ContentSection
          title="Trending Movies"
          movies={trendingMovies}
          bgGradient="from-purple-900 via-blue-900 to-background"
          viewMoreLink="/trending/movies"
          fetchCategory="trending"
        />

        <ContentSection
          title="Popular Series"
          movies={trendingSeries}
          bgGradient="from-emerald-900 via-teal-900 to-background"
          viewMoreLink="/trending/series"
          fetchCategory="series"
        />

        <ContentSection
          title="Latest Anime"
          movies={anime}
          bgGradient="from-pink-900 via-rose-900 to-background"
          viewMoreLink="/trending/anime"
          fetchCategory="anime"
        />

        <ContentSection
          title="Asian Dramas"
          movies={asianDramas}
          bgGradient="from-amber-900 via-orange-900 to-background"
          viewMoreLink="/trending/asian-dramas"
          fetchCategory="asian-dramas"
        />
      </div>

      {/* Footer */}
      <footer className="w-full py-10 mt-20 border-t border-white/5 bg-black/40 backdrop-blur-sm">
        <div className="container mx-auto px-4 flex flex-col items-center justify-center space-y-4 text-center">

          {/* Branding */}
          <div className="flex flex-col items-center space-y-2">
            <h3 className="text-2xl font-bold tracking-widest text-white uppercase">M4MOVIE</h3>
            <p className="text-sm text-muted-foreground max-w-md">
              Your ultimate destination for movies and TV shows. Stream thousands of titles directly with no subscriptions required.
            </p>
          </div>

          {/* Telegram Button */}
          <a
            href="https://t.me/M4_movies07"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-6 py-3 rounded-full bg-white text-black font-semibold hover:bg-gray-200 transition-colors mt-4 hover:scale-105 active:scale-95 duration-200"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></svg>
            Join our Telegram
          </a>

          {/* Credits */}
          <div className="flex flex-col md:flex-row items-center gap-2 md:gap-8 text-xs text-muted-foreground/60 mt-8">
            <span>Made with <span className="text-red-500 animate-pulse">❤️</span> by <strong className="text-white font-normal hover:text-primary transition-colors cursor-pointer">M4MOVIE Team</strong></span>
            <span>© 2026 M4MOVIE. All rights reserved.</span>
            <span className="flex items-center gap-1 text-emerald-500">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              All systems operational
            </span>
          </div>
        </div>
      </footer>
    </main>
  );
}
