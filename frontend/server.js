require('dotenv').config();
const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const path = require('path');
const { Telegraf } = require('telegraf');

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = process.env.PORT || 3000;

// Initialize Next.js
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

// Initialize Bot
const botToken = process.env.BOT_TOKEN;
let bot = null;

if (botToken) {
    bot = new Telegraf(botToken);

    // Middleware
    bot.use(async (ctx, next) => {
        const start = Date.now();
        try {
            await next();
            const ms = Date.now() - start;
            if (ctx.updateType === 'message' || ctx.updateType === 'channel_post') {
                console.log(`[BOT] Handled ${ctx.updateType} in ${ms}ms`);
            }
        } catch (err) {
            console.error('[BOT] Middleware Error:', err);
        }
    });

    // Handlers
    try {
        const startHandler = require('./bot-lib/handlers/start');
        const indexerHandler = require('./bot-lib/handlers/indexer');
        const searchHandler = require('./bot-lib/handlers/search');
        const { syncChannel } = require('./bot-lib/lib/sync');

        bot.start(startHandler);
        bot.command('request', startHandler);
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

        bot.catch((err, ctx) => {
            console.error(`[Telegraf Error] ${ctx.updateType}`, err);
        });

        // Sync Logic (Preserved from original)
        if (process.env.ENABLE_CRAWLER && String(process.env.ENABLE_CRAWLER).trim() === 'true') {
            console.log('[SYNC] Crawler initialized');
            syncChannel(bot).catch(err => console.error('[SYNC] Startup sync failed:', err));
        }

    } catch (err) {
        console.error('Failed to load bot handlers:', err);
    }
} else {
    console.warn('⚠️ BOT_TOKEN missing. Bot will not start.');
}

app.prepare().then(() => {
    createServer(async (req, res) => {
        try {
            const parsedUrl = parse(req.url, true);
            await handle(req, res, parsedUrl);
        } catch (err) {
            console.error('Error occurred handling', req.url, err);
            res.statusCode = 500;
            res.end('internal server error');
        }
    }).listen(port, (err) => {
        if (err) throw err;
        console.log(`> Ready on http://${hostname}:${port}`);

        // Launch Bot
        if (bot) {
            // We use 'launch' which starts polling. 
            // The process is efficiently managed by Node's event loop.
            bot.launch().then(() => {
                console.log('> Bot launched successfully');
            }).catch(e => console.error('> Bot launch failed:', e));

            // Graceful Stop
            const stopBot = (signal) => {
                if (bot) bot.stop(signal);
            };
            process.once('SIGINT', () => stopBot('SIGINT'));
            process.once('SIGTERM', () => stopBot('SIGTERM'));
        }

        // Self-Ping for Render (Keep Alive)
        // Helps prevent idling if 24/7 uptime is desired within free limits
        const keepAliveUrl = process.env.RENDER_EXTERNAL_URL || process.env.EXTERNAL_URL;
        if (keepAliveUrl) {
            console.log(`[Keep-Alive] Self-ping enabled for ${keepAliveUrl}`);
            const https = keepAliveUrl.startsWith('https') ? require('https') : require('http');

            setInterval(() => {
                https.get(keepAliveUrl, (res) => {
                    // Silent success
                }).on('error', (e) => console.error('[Keep-Alive] Error:', e.message));
            }, 14 * 60 * 1000); // Every 14 mins
        }
    });
});
