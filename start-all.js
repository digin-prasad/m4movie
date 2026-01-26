const { spawn, execSync } = require('child_process');
const path = require('path');

console.log('🚀 Starting M4MOVIE Unified Services...');

// Pre-start cleanup for Windows
try {
    if (process.platform === 'win32') {
        console.log('🧹 Clearing ports 3000 and 10001...');
        [3000, 10001].forEach(port => {
            try {
                const stdout = execSync(`powershell -Command "(Get-NetTCPConnection -LocalPort ${port} -ErrorAction SilentlyContinue).OwningProcess"`).toString();
                const pids = [...new Set(stdout.split(/[\r\n]+/).map(p => p.trim()).filter(p => p && parseInt(p) > 0))];
                pids.forEach(pid => {
                    if (pid != process.pid) {
                        console.log(`- Killing ghost process PID ${pid} on port ${port}`);
                        try { execSync(`taskkill /F /PID ${pid} /T`, { stdio: 'ignore' }); } catch (e) { }
                    }
                });
            } catch (e) { }
        });
        // Clear Next.js cache/lock
        try { execSync('powershell -Command "Remove-Item -Path frontend\\.next -Recurse -Force -ErrorAction SilentlyContinue"', { stdio: 'ignore' }); } catch (e) { }
    }
} catch (e) { }

// 1. Start the Bot
const botProc = spawn('node', ['index.js'], {
    cwd: path.join(__dirname, 'bot'),
    stdio: 'inherit',
    shell: false,
    env: { ...process.env, UNIFIED_DEPLOY: 'true' }
});

botProc.on('error', (err) => {
    console.error('❌ Failed to start Bot:', err);
});

// 2. Start the Frontend (Next.js)
// 2. Start the Frontend (Next.js)
const isDev = process.argv.includes('--dev');
const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const frontendDir = path.join(__dirname, 'frontend');

// Robustness: Build if missing (Fix for Render "No production build" error)
// This ensures that if the Build Command didn't run, we build at runtime.
if (!isDev) {
    const fs = require('fs');
    const nextDir = path.join(frontendDir, '.next');
    if (!fs.existsSync(nextDir)) {
        console.log('⚠️  Frontend build missing (.next folder not found). Building now... this might take a minute.');
        try {
            execSync(`${npmCmd} run build`, { cwd: frontendDir, stdio: 'inherit' });
            console.log('✅ Build completed successfully.');
        } catch (err) {
            console.error('❌ Build failed during startup:', err);
            // We continue anyway, letting next start fail naturally if it must, so logs show the real error
        }
    }
}

const frontendProc = spawn(npmCmd, isDev ? ['run', 'dev'] : ['start'], {
    cwd: frontendDir,
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

// 3. Render Keep-Alive (Self-Ping)
// Prevents Free Tier from sleeping by pinging the external URL every 14 minutes.
if (process.env.RENDER || process.env.UNIFIED_DEPLOY) {
    const keepAliveUrl = process.env.RENDER_EXTERNAL_URL || 'https://m4movie.onrender.com';
    console.log(`[Keep-Alive] Initialized for ${keepAliveUrl}`);

    const https = require('https');
    setInterval(() => {
        https.get(keepAliveUrl, (res) => {
            console.log(`[Keep-Alive] Pinged ${keepAliveUrl} - Status: ${res.statusCode}`);
        }).on('error', (err) => {
            console.error(`[Keep-Alive] Ping failed:`, err.message);
        });
    }, 14 * 60 * 1000); // 14 minutes
}
