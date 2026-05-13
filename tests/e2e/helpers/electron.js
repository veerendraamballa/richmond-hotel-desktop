const { _electron: electron } = require('playwright');
const path = require('path');
const os = require('os');
const fs = require('fs');

/**
 * Launch the Electron app with an isolated temp userData directory
 * so every test suite starts with a clean database.
 */
async function launchApp() {
    const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'richmond-test-'));

    const app = await electron.launch({
        args: [path.join(__dirname, '..', '..', '..', 'main.js')],
        env: {
            ...process.env,
            NODE_ENV: 'test',
            // Override DB path via env var (read in main.js initDatabase)
            RICHMOND_USER_DATA: userDataDir,
            // Ensure Electron doesn't open in headless-hostile mode
            ELECTRON_DISABLE_SECURITY_WARNINGS: '1',
        },
        timeout: 45000,
    });

    const window = await app.firstWindow();
    // Wait for the app to fully load — nav-item.active appears after JS init
    await window.waitForSelector('.nav-item.active', { timeout: 30000 });

    return { app, window, userDataDir };
}

async function closeApp(app, userDataDir) {
    try { await app.close(); } catch {}
    try { fs.rmSync(userDataDir, { recursive: true, force: true }); } catch {}
}

module.exports = { launchApp, closeApp };
