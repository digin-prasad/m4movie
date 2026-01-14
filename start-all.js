const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 Starting M4MOVIE Unified Services...');

// 1. Start the Bot
const botProc = spawn('node', ['index.js'], {
    cwd: path.join(__dirname, 'bot'),
    stdio: 'inherit',
    shell: true,
    env: { ...process.env, UNIFIED_DEPLOY: 'true' }
});

botProc.on('error', (err) => {
    console.error('❌ Failed to start Bot:', err);
});

// 2. Start the Frontend (Next.js)
// Note: Next.js will use the PORT provided by Render
const frontendProc = spawn('npm', ['start'], {
    cwd: path.join(__dirname, 'frontend'),
    stdio: 'inherit',
    shell: true
});

frontendProc.on('error', (err) => {
    console.error('❌ Failed to start Frontend:', err);
});

// Handle termination
process.on('SIGINT', () => {
    botProc.kill();
    frontendProc.kill();
    process.exit();
});

process.on('SIGTERM', () => {
    botProc.kill();
    frontendProc.kill();
    process.exit();
});
