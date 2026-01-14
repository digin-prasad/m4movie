const fs = require('fs');
const path = require('path');
const moviesPath = path.join(__dirname, '../../shared/movies.json');

const readDB = () => {
    try {
        return JSON.parse(fs.readFileSync(moviesPath, 'utf8'));
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
    const query = ctx.message.text;
    if (!query || query.startsWith('/')) return; // Ignore commands

    const db = readDB();
    const results = db.movies.filter(m => m.title.toLowerCase().includes(query.toLowerCase()));

    if (results.length === 0) {
        return ctx.reply(`No movies found for "${query}". Try visiting our website for a better search experience.`);
    }

    const MAX_RESULTS = 5;
    const subset = results.slice(0, MAX_RESULTS);

    let response = `🎬 <b>Found ${results.length} results for "${escapeHTML(query)}":</b>\n\n`;

    subset.forEach(m => {
        // Use HTML safe formatting
        response += `▫️ <b>${escapeHTML(m.title)}</b> (${m.year}) - ${m.quality.toUpperCase()}\n   <code>/start ${m.slug}</code>\n\n`;
    });

    if (results.length > MAX_RESULTS) {
        response += `<i>...and ${results.length - MAX_RESULTS} more.</i>`;
    }

    await ctx.reply(response, { parse_mode: 'HTML' });
};
