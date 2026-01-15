const db = require('../lib/db');
const legacyMovies = require('../data/movies.json'); // Keep legacy support if needed



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
    if (payload) {
        console.log(`[BOT] Received Start payload: ${payload}`);
    } else if (ctx.message && ctx.message.text && ctx.message.text.startsWith('/start')) {
        console.log(`[BOT] Manual start by ${ctx.from.first_name} (${ctx.from.id})`);
    }

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

    // 4. Handle file delivery
    try {
        let movieFile = db.findBySlug(payload);
        if (!movieFile && legacyMovies[payload]) movieFile = legacyMovies[payload];

        if (!movieFile) {
            return ctx.reply('❌ This file is currently unavailable.\n\nType /request <MovieName> to request it!');
        }

        if (movieFile.file_id) {
            ctx.replyWithChatAction('upload_document').catch(() => { });

            const codec = movieFile.codec ? ` (${movieFile.codec})` : '';
            const language = movieFile.language && movieFile.language !== 'Unknown' ? ` ${movieFile.language}` : '';
            const extra = {
                caption: `🎬 <b>${escapeHTML(movieFile.title)}</b> (${movieFile.year})\n💿 Quality: ${movieFile.quality.toUpperCase()}\n\nDownloaded via M4MOVIE`,
                parse_mode: 'HTML'
            };

            await ctx.telegram.sendDocument(ctx.chat.id, movieFile.file_id, extra);
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
