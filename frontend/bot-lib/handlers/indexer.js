const db = require('../lib/db');

const processMessage = async (message) => {
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
    // 1. Explicit Quality (e.g. 1080p)
    let qualityMatch = caption.match(/(480p|576p|720p|1080p|2160p|2k|4k)/i);
    let quality = qualityMatch ? qualityMatch[0].toLowerCase() : null;

    // 2. Source-based Heuristics (if explicit quality missing)
    if (!quality) {
        if (/(dvdrip|dvd|vcd)/i.test(caption)) quality = '480p';
        else if (/(web-dl|webdl|webrip|hdrip|hd-rip)/i.test(caption)) quality = '720p'; // Assume HD for WEB-DL
        else if (/(bluray|bdrip|brrip)/i.test(caption)) quality = '1080p'; // Assume Full HD for Bluray
    }

    const sizeBytes = media.file_size || 0;
    const formatSize = (bytes) => {
        if (bytes === 0) return 'Unknown Size';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };
    const size = formatSize(sizeBytes);

    // 3. Size-based Fallback (Last Resort)
    if (!quality && sizeBytes > 0) {
        const gb = sizeBytes / (1024 * 1024 * 1024);
        if (gb > 2.5) quality = '1080p';
        else if (gb > 0.6) quality = '720p';
        else quality = '480p';
    }

    quality = quality || 'unknown';

    const yearMatch = caption.match(/(?:^|[.\s\(_-])(19\d{2}|20\d{2})(?:$|[.\s\)_])/);
    const year = yearMatch ? yearMatch[1] : 'unknown';

    let title = caption;
    if (year !== 'unknown') {
        const yearIndex = caption.indexOf(year);
        title = caption.substring(0, yearIndex);
    }
    // If we matched quality from regex, use it to cut title
    else if (qualityMatch) {
        const qualityIndex = caption.indexOf(qualityMatch[0]);
        title = caption.substring(0, qualityIndex);
    }

    // Capture Codecs and Encoders (PSA, Pahe, HEVC, etc.)
    const codecMatch = caption.match(/(x264|x265|hevc|h\.?264|h\.?265|av1|vp9|10bit|hdr|psa|pahe|yify|rarbg)/gi);
    const codec = codecMatch ? codecMatch.join(' ').toUpperCase() : '';

    // Placeholder for language detection
    const language = 'English'; // Default to English for now

    title = title.replace(/[.\(\)_-]/g, ' ').trim();
    title = title.replace(/\s+/g, ' ');

    // Generate Slug
    const slug = `${title.toLowerCase().replace(/[^a-z0-9]+/g, '_')}_${year}_${quality}`;

    // 1. DUPLICATE CHECK: If file exists, UPDATE it via db utility
    // 2. SLUG COLLISION: If slug exists, append unique suffix
    let finalSlug = slug;
    let counter = 1;
    while (db.exists(finalSlug)) {
        // If it's the SAME file (file_id matches), we can stop and just update
        const existing = db.findBySlug(finalSlug);
        if (existing && existing.file_id === fileId) {
            console.log(`[INDEXER] Matched existing file_id for ${finalSlug}. Updating metadata.`);
            break;
        }

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
        language,
        file_id: fileId,
        caption: caption
    };

    const isNew = !db.exists(finalSlug);
    db.addMovie(newEntry);
    console.log(`[INDEXER] Indexed: ${finalSlug} [${size}] [${language}] ${codec ? `(${codec})` : ''}`);
    return { slug: finalSlug, isNew };
};

// Handler for Telegraf
module.exports = async (ctx) => {
    const message = ctx.channelPost || ctx.message;
    return await processMessage(message);
};

// Also export raw processor for sync task
module.exports.processMessage = processMessage;
