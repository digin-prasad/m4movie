require('dotenv').config();
const { Telegraf } = require('telegraf');

if (!process.env.BOT_TOKEN) {
    console.log('Error: BOT_TOKEN is missing');
    process.exit(1);
}

const bot = new Telegraf(process.env.BOT_TOKEN);

console.log('Verifying token...');
bot.telegram.getMe()
    .then((me) => {
        console.log('Success!');
        console.log(`Bot username: @${me.username}`);
        process.exit(0);
    })
    .catch((err) => {
        console.error('Failed to verify token:', err.message);
        process.exit(1);
    });
