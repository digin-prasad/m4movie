require('dotenv').config();
const { MongoClient } = require('mongodb');

const uri = process.env.MONGODB_URI;
if (!uri) {
    console.error("No MONGODB_URI in .env");
    process.exit(1);
}

const client = new MongoClient(uri);

const parseCaption = (caption, mediaSize) => {
    // 1. Explicit Quality
    let qualityMatch = caption.match(/(480p|576p|720p|1080p|2160p|2k|4k)/i);
    let quality = qualityMatch ? qualityMatch[0].toLowerCase() : null;

    // 2. Source-based Heuristics
    if (!quality) {
        if (/(dvdrip|dvd|vcd)/i.test(caption)) quality = '480p';
        else if (/(web-dl|webdl|webrip|hdrip|hd-rip)/i.test(caption)) quality = '720p';
        else if (/(bluray|bdrip|brrip)/i.test(caption)) quality = '1080p';
    }

    const sizeBytes = mediaSize || 0;
    const formatSize = (bytes) => {
        if (bytes === 0) return 'Unknown Size';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };
    const size = formatSize(sizeBytes);

    // 3. Size-based Fallback
    if (!quality && sizeBytes > 0) {
        const gb = sizeBytes / (1024 * 1024 * 1024);
        if (gb > 2.5) quality = '1080p';
        else if (gb > 0.6) quality = '720p';
        else quality = '480p';
    }

    quality = quality || 'unknown';

    // Year
    const yearMatch = caption.match(/(?:^|[.\s\(_-])(19\d{2}|20\d{2})(?:$|[.\s\)_])/);
    const year = yearMatch ? yearMatch[1] : 'unknown';

    // Title
    let title = caption;
    if (year !== 'unknown') {
        const yearIndex = caption.indexOf(year);
        title = caption.substring(0, yearIndex);
    } else if (qualityMatch) {
        const qualityIndex = caption.indexOf(qualityMatch[0]);
        title = caption.substring(0, qualityIndex);
    }

    // Capture Codec for Codec Field Update (This was missing in reparse, adding it now)
    const codecMatch = caption.match(/(x264|x265|hevc|h\.?264|h\.?265|av1|vp9|10bit|hdr|psa|pahe|yify|rarbg)/gi);
    const codec = codecMatch ? codecMatch.join(' ').toUpperCase() : '';

    title = title.replace(/[.\(\)_-]/g, ' ').trim();
    title = title.replace(/\s+/g, ' ');

    // Slug
    const slug = `${title.toLowerCase().replace(/[^a-z0-9]+/g, '_')}_${year}_${quality}`;

    return { title, year, quality, size, slug, codec };
};

const run = async () => {
    try {
        await client.connect();
        const db = client.db('m4movie');
        const movies = await db.collection('movies').find({}).toArray();

        console.log(`Found ${movies.length} movies. Reparsing...`);

        for (const m of movies) {
            if (!m.caption && !m.original_caption) continue;

            const text = m.caption || m.title; // Fallback
            // Convert existing string size back to bytes if needed? 
            // Actually, we fail on size if we don't have bytes.
            // But we can guess bytes from string if format is "800 MB"

            let sizeBytes = 0;
            if (m.size && m.size !== 'Unknown Size' && m.size !== 'Unknown') {
                // rough parse "800 MB" -> bytes
                const parts = m.size.split(' ');
                if (parts.length === 2) {
                    const val = parseFloat(parts[0]);
                    const unit = parts[1].toUpperCase();
                    const mult = unit === 'GB' ? 1024 * 1024 * 1024 : (unit === 'MB' ? 1024 * 1024 : 1024);
                    sizeBytes = val * mult;
                }
            }

            const newData = parseCaption(text, sizeBytes);

            // Only update if changed (or force update fields)
            await db.collection('movies').updateOne(
                { _id: m._id },
                {
                    $set: {
                        quality: newData.quality,
                        size: newData.size, // Refresh size string formatting
                        codec: newData.codec, // Save Codec!
                        // title: newData.title, // Be careful updating title if user manually edited? No, user doesn't edit.
                        slug: newData.slug // Important for matching? Actually file_id is key.
                    }
                }
            );
            console.log(`Updated: ${m.title} -> ${newData.quality}`);
        }
        console.log("Done.");

    } catch (e) {
        console.error(e);
    } finally {
        await client.close();
    }
};

run();
