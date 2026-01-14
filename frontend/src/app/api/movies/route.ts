import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
    try {
        // Path to shared/movies.json relative to the execution context
        // In dev, this is usually strictly relative to project root
        // We try to locate it based on typical structure
        const sharedPath = path.join(process.cwd(), '../shared/movies.json');

        if (!fs.existsSync(sharedPath)) {
            return NextResponse.json({ movies: [] });
        }

        const data = fs.readFileSync(sharedPath, 'utf8');
        const movies = JSON.parse(data);

        return NextResponse.json(movies);
    } catch (error) {
        console.error('Error reading shared DB:', error);
        return NextResponse.json({ error: 'Failed to fetch movies' }, { status: 500 });
    }
}
