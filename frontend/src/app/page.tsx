import { HeroSection } from '@/components/features/HeroSection';
import { ContentSection } from '@/components/features/ContentSection';
import { tmdb } from '@/lib/tmdb';

export default async function Home() {
  const [
    trendingMovies,
    trendingSeries,
    anime,
    asianDramas
  ] = await Promise.all([
    tmdb.getTrending(1),
    tmdb.getTrendingSeries(1),
    tmdb.getAnime(1),
    tmdb.getAsianDramas(1)
  ]);

  // Deduplicate content for HeroSection (prevent duplicate key errors)
  const allContentRaw = [...trendingMovies, ...trendingSeries, ...anime, ...asianDramas];
  const allContent = Array.from(new Map(allContentRaw.map(item => [item.id, item])).values());

  return (
    <main className="min-h-screen bg-background text-foreground pb-20">
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

      <footer className="w-full py-10 mt-20 border-t border-white/5 bg-black/40 backdrop-blur-sm">
        <div className="container mx-auto px-4 flex flex-col items-center justify-center space-y-4 text-center">
          <div className="flex flex-col items-center space-y-2">
            <h3 className="text-2xl font-bold tracking-widest text-white uppercase">M4MOVIE</h3>
            <p className="text-sm text-muted-foreground max-w-md">
              Your ultimate destination for movies and TV shows. Stream thousands of titles directly with no subscriptions required.
            </p>
          </div>
          <div className="flex flex-col md:flex-row items-center gap-2 md:gap-8 text-xs text-muted-foreground/60 mt-8">
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
