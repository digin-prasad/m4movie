const fs = require('fs');
const path = require('path');
const moviesPath = path.join(__dirname, '../../shared/movies.json');
const legacyMovies = require('../data/movies.json'); // Keep legacy support if needed

// Cache DB in memory
let moviesCache = null;
let lastCacheTime = 0;
const CACHE_TTL = 60000; // 1 minute cache (or rely on indexer to invalidate)

const readDB = () => {
    const now = Date.now();
    if (moviesCache && (now - lastCacheTime < CACHE_TTL)) {
        return moviesCache;
    }
    try {
        const data = JSON.parse(fs.readFileSync(moviesPath, 'utf8'));
        moviesCache = data;
        lastCacheTime = now;
        return data;
    } catch { return { movies: [] }; }
};

const escapeHTML = (str) => str.replace(/[&<>"']/g, m => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
})[m]);

module.exports = async (ctx) => {
    // 1. Check for manual /request command
    if (ctx.message && ctx.message.text && ctx.message.text.toLowerCase().startsWith('/request')) {
        const manualQuery = ctx.message.text.split(' ').slice(1).join(' ');
        if (!manualQuery) {
            return ctx.reply('⚠️ Please provide a movie name.\nExample: <code>/request Interstellar</code>', { parse_mode: 'HTML' });
        }
        // Force treat as a request
        return await handleRequest(ctx, manualQuery);
    }

    const payload = ctx.startPayload;
    console.log(`[BOT] Received Start payload: ${payload || 'NONE'}`);

    // 2. Handle deep-link requests
    if (payload && payload.startsWith('request_')) {
        const rawTitle = payload.replace('request_', '');
        const movieTitle = decodeURIComponent(rawTitle);
        return await handleRequest(ctx, movieTitle);
    }

    // 3. Welcome message for empty /start
    if (!payload && (!ctx.message || !ctx.message.text.startsWith('/request'))) {
        return ctx.reply('Welcome to M4MOVIE Bot! Visit our website to search and download movies in high quality.');
    }

    // 4. Handle file delivery (Existing logic)
    try {
        const db = readDB();
        let movieFile = db.movies.find(m => m.slug === payload);
        if (!movieFile && legacyMovies[payload]) movieFile = legacyMovies[payload];

        if (!movieFile) {
            return ctx.reply('❌ This file is currently unavailable.\n\nType /request <MovieName> to request it!');
        }

        if (movieFile.file_id) {
            ctx.replyWithChatAction('upload_video').catch(() => { });
            await ctx.telegram.sendVideo(ctx.chat.id, movieFile.file_id, {
                caption: `🎬 <b>${escapeHTML(movieFile.title)}</b> (${movieFile.year})\n💿 Quality: ${movieFile.quality.toUpperCase()}\n\nDownloaded via M4MOVIE`,
                parse_mode: 'HTML'
            });
        } else {
            ctx.reply('❌ Error: File ID not found in database.');
        }
    } catch (e) {
        console.error("Delivery Error:", e);
    }
};

// Reusable Request Logic
async function handleRequest(ctx, movieTitle) {
    const userId = ctx.from.id;
    const userName = ctx.from.first_name || 'User';
    const userUsername = ctx.from.username ? `@${ctx.from.username}` : 'No Username';

    console.log(`[REQUEST] Processing: "${movieTitle}" from ${userName} (${userId})`);

    // User confirmation
    try {
        await ctx.reply(`✅ <b>Request Received!</b>\n\nRequest for: <b>${escapeHTML(movieTitle)}</b>\n\nWe have notified the admins.`, { parse_mode: 'HTML' });
    } catch (e) {
        await ctx.reply(`✅ Request Received for: ${movieTitle}`);
    }

    const adminChannel = '-1003585987448';
    const backupAdminId = '1059586105';
    const supportGroup = '-1003638498961';

    const sendAlert = async (targetId, targetType) => {
        try {
            await ctx.telegram.sendMessage(targetId,
                `🔔 <b>New Movie Request</b>\n\n` +
                `🎬 Movie: <b>${escapeHTML(movieTitle)}</b>\n` +
                `👤 User: <a href="tg://user?id=${userId}">${escapeHTML(userName)}</a>\n\n` +
                `⚠️ <b>Action:</b> Please upload this file.`,
                { parse_mode: 'HTML' }
            );
            console.log(`[REQUEST] Sent to ${targetType}`);
        } catch (err) {
            console.error(`[REQUEST] Error ${targetType}:`, err.message);
            try {
                await ctx.telegram.sendMessage(targetId, `🔔 Request: ${movieTitle}\nUser: ${userName}`);
            } catch (e) { }
        }
    };

    await Promise.all([
        sendAlert(adminChannel, "Channel"),
        sendAlert(backupAdminId, "Admin DM"),
        sendAlert(supportGroup, "Support Group")
    ]);
}
