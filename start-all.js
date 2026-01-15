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
const isDev = process.argv.includes('--dev');
const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const frontendProc = spawn(npmCmd, isDev ? ['run', 'dev'] : ['start'], {
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
