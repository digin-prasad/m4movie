require('dotenv').config();
const { Telegraf } = require('telegraf');
const startHandler = require('./handlers/start');

if (!process.env.BOT_TOKEN) {
    console.error('BOT_TOKEN is missing in .env');
    process.exit(1);
}

const bot = new Telegraf(process.env.BOT_TOKEN);

// Basic update logging middleware
bot.use(async (ctx, next) => {
    const start = Date.now();
    try {
        await next();
        const duration = Date.now() - start;
        if (ctx.updateType === 'message' || ctx.updateType === 'channel_post') {
            console.log(`[BOT] Handled ${ctx.updateType} in ${duration}ms`);
        }
    } catch (err) {
        console.error(`[CRITICAL] Error in middleware chain:`, err);
    }
});

// Global Error Handler
bot.catch((err, ctx) => {
    console.error(`[TElegraf ERROR] for update type: ${ctx.updateType}`, err.message);
    // ctx.reply('An unexpected error occurred. Please try again.').catch(() => {});
});
bot.start(startHandler);
bot.command('request', startHandler); // Manual request handler
const indexerHandler = require('./handlers/indexer');
const searchHandler = require('./handlers/search');

bot.on('channel_post', indexerHandler);
bot.on('message', (ctx, next) => {
    // If it's a forward or has video, it's an indexing attempt (admin/channel)
    if (ctx.message.forward_from_chat || ctx.message.video || (ctx.message.caption && ctx.message.video)) {
        return indexerHandler(ctx);
    }
    // Otherwise, treat as a search query if not a command
    if (ctx.message.text && !ctx.message.text.startsWith('/')) {
        return searchHandler(ctx);
    }
    return next();
});

const http = require('http');

bot.launch().then(() => {
    console.log('Bot is running...');
});

// Render Keep-Alive Server
const server = http.createServer((req, res) => {
    if (req.url === '/' || req.url === '/health') {
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end('M4MOVIE Bot is Alive!\n');
    } else {
        res.writeHead(404);
        res.end();
    }
});

// In a unified deploy, Next.js takes process.env.PORT. 
// We use a different port for the bot's internal health check.
const BOT_PORT = process.env.BOT_PORT || 10000;
server.listen(BOT_PORT, () => {
    console.log(`Bot internal keep-alive listening on port ${BOT_PORT}`);
});

// Enable graceful stop
process.once('SIGINT', () => {
    bot.stop('SIGINT');
    server.close();
});
process.once('SIGTERM', () => {
    bot.stop('SIGTERM');
    server.close();
});
