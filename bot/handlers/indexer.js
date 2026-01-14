const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '../../shared/movies.json');

// Helper to read DB
const readDB = () => {
    try {
        const data = fs.readFileSync(DB_PATH, 'utf8');
        return JSON.parse(data);
    } catch (e) {
        return { movies: [] };
    }
};

// Helper to write DB
const writeDB = (data) => {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
};

module.exports = async (ctx) => {
    const message = ctx.channelPost || ctx.message;

    if (!message) return;

    // Support both Video (streamable) and Document (files)
    const media = message.video || message.document;
    if (!media) return;

    // Use caption OR filename as the source of truth
    const originalText = message.caption || media.file_name || '';
    const fileId = media.file_id;

    // Use the original text for parsing
    const caption = originalText;

    // Improved Parsing Logic for Scene Releases
    // Examples: 
    // "Movie Name (2024) 1080p"
    // "Movie.Name.2024.1080p.WEB-DL"

    // 1. Extract Quality
    const qualityMatch = caption.match(/(480p|720p|1080p|2160p|4k)/i);
    const quality = qualityMatch ? qualityMatch[0].toLowerCase() : 'unknown';

    // 2. Extract Year (Support (2024) and .2024.)
    // Look for 19xx or 20xx surrounded by non-digit chars
    const yearMatch = caption.match(/(?:^|[.\s\(])(19\d{2}|20\d{2})(?:$|[.\s\)])/);
    const year = yearMatch ? yearMatch[1] : 'unknown';

    // 3. Extract Title
    let title = caption;
    if (year !== 'unknown') {
        const yearIndex = caption.indexOf(year);
        title = caption.substring(0, yearIndex);
    } else if (quality !== 'unknown') {
        const qualityIndex = caption.indexOf(qualityMatch[0]);
        title = caption.substring(0, qualityIndex);
    }

    // 4. Extract Codec/Type (x264, x265, HEVC, 10bit, HDR)
    const codecMatch = caption.match(/(x264|x265|hevc|h\.?264|h\.?265|av1|vp9|10bit|hdr)/gi);
    const codec = codecMatch ? codecMatch.join(' ').toUpperCase() : '';

    // 5. Get File Size (Formatted)
    const sizeBytes = media.file_size || 0;
    const formatSize = (bytes) => {
        if (bytes === 0) return 'Unknown';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };
    const size = formatSize(sizeBytes);

    // Cleanup Title: Remove trailing dots, parens, brackets, and replace dots with spaces
    title = title.replace(/[.\(\)]/g, ' ').trim();
    // Remove extra spaces
    title = title.replace(/\s+/g, ' ');

    // Generate Slug
    const slug = `${title.toLowerCase().replace(/[^a-z0-9]+/g, '_')}_${year}_${quality}`;

    console.log(`Analyzing: "${title}" | ${year} | ${quality} -> ${slug}`);

    const db = readDB();

    // 1. DUPLICATE CHECK: If file exists, UPDATE it (fixes missing metadata like size)
    const existingFileIndex = db.movies.findIndex(m => m.file_id === fileId);

    if (existingFileIndex >= 0) {
        // Update existing entry
        const existingEntry = db.movies[existingFileIndex];
        db.movies[existingFileIndex] = {
            ...existingEntry,
            size,   // Update size
            codec,  // Update codec
            // Optionally update other fields if we want to refresh them
            caption: caption,
            indexed_at: new Date().toISOString()
        };
        console.log(`Updated Metadata for: ${existingEntry.slug} [${size}]`);
        writeDB(db);
        return;
    }

    // 2. SLUG COLLISION: If slug exists (but different file_id), append unique suffix
    // This allows multiple files of same quality (e.g. samples, repacks, parts)
    let finalSlug = slug;
    let counter = 1;
    while (db.movies.some(m => m.slug === finalSlug)) {
        counter++;
        finalSlug = `${slug}_v${counter}`;
    }

    const newEntry = {
        slug: finalSlug,
        title,
        year,
        quality,
        size,
        codec,
        file_id: fileId,
        caption: caption,
        indexed_at: new Date().toISOString()
    };

    db.movies.push(newEntry);
    console.log(`Indexed: ${finalSlug} [${size}] ${codec ? `(${codec})` : ''}`);

    writeDB(db);

    // Reply to channel (optional, might get annoying)
    // await ctx.reply(`Indexed: ${title} [${quality}]`);
};
