import { tmdb } from '@/lib/tmdb';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const page = parseInt(searchParams.get('page') || '1');

    if (!category) {
        return NextResponse.json({ error: 'Category required' }, { status: 400 });
    }

    let movies: any[] = [];

    try {
        switch (category) {
            case 'trending':
                movies = await tmdb.getTrending(page);
                break;
            case 'series':
                movies = await tmdb.getTrendingSeries(page);
                break;
            case 'anime':
                movies = await tmdb.getAnime(page);
                break;
            case 'asian-dramas':
                movies = await tmdb.getAsianDramas(page);
                break;
            default:
                return NextResponse.json({ error: 'Invalid category' }, { status: 400 });
        }

        return NextResponse.json({ results: movies });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 });
    }
}
