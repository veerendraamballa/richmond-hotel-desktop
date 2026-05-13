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
            // Override Electron userData so each run gets a fresh DB
            ELECTRON_USER_DATA: userDataDir,
        },
        // Point Electron's app.getPath('userData') to our temp dir
        // by passing --user-data-dir (Chromium flag picked up by Electron)
        executablePath: undefined,
        // Pass extra args to override userData
        args: [
            path.join(__dirname, '..', '..', '..', 'main.js'),
            `--user-data-dir=${userDataDir}`,
        ],
    });

    const window = await app.firstWindow();
    // Wait for the app to fully load
    await window.waitForSelector('.nav-item.active', { timeout: 15000 });

    return { app, window, userDataDir };
}

async function closeApp(app, userDataDir) {
    await app.close();
    // Clean up temp DB
    try { fs.rmSync(userDataDir, { recursive: true, force: true }); } catch {}
}

module.exports = { launchApp, closeApp };
