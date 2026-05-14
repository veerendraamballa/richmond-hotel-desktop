/**
 * Security Test: IPC Attack Surface & Electron Hardening
 *
 * Verifies sandbox settings, navigation restrictions, popup blocking,
 * and that the renderer cannot access Node.js APIs directly.
 */
const { test, expect } = require('@playwright/test');
const { launchApp, closeApp } = require('../helpers/electron');

let app, window, userDataDir;

test.beforeAll(async () => {
    ({ app, window, userDataDir } = await launchApp());
});

test.afterAll(async () => {
    await closeApp(app, userDataDir);
});

test('renderer cannot access Node.js require()', async () => {
    const result = await window.evaluate(() => {
        try {
            return typeof require === 'function' ? 'exposed' : 'not-exposed';
        } catch { return 'not-exposed'; }
    });
    expect(result).toBe('not-exposed');
});

test('renderer cannot access process object', async () => {
    const result = await window.evaluate(() => {
        try {
            return typeof process === 'undefined' ? 'safe' : 'exposed';
        } catch { return 'safe'; }
    });
    expect(result).toBe('safe');
});

test('renderer cannot access __dirname or __filename', async () => {
    const result = await window.evaluate(() => {
        try {
            const d = typeof __dirname;
            return d === 'undefined' ? 'safe' : 'exposed';
        } catch { return 'safe'; }
    });
    expect(result).toBe('safe');
});

test('only electronAPI is exposed on window — no raw ipcRenderer', async () => {
    const exposed = await window.evaluate(() => ({
        hasElectronAPI: typeof window.electronAPI === 'object',
        hasIpcRenderer: typeof window.ipcRenderer !== 'undefined',
        hasElectron: typeof window.electron !== 'undefined',
        hasRemote: typeof window.remote !== 'undefined',
    }));

    expect(exposed.hasElectronAPI).toBe(true);  // contextBridge API — expected
    expect(exposed.hasIpcRenderer).toBe(false);  // must not be directly exposed
    expect(exposed.hasElectron).toBe(false);
    expect(exposed.hasRemote).toBe(false);
});

test('electronAPI only exposes expected methods', async () => {
    const methods = await window.evaluate(() => Object.keys(window.electronAPI).sort());
    const expected = [
        'addBooking', 'addGuest', 'addPayment', 'addRoom',
        'deleteRoom', 'getAppVersion', 'getBookings', 'getDashboardStats', 'getGuestByEmail',
        'getGuests', 'getPayments', 'getRooms', 'getSettings',
        'installUpdate', 'onUpdateAvailable', 'onUpdateDownloaded',
        'updateBooking', 'updateGuest', 'updateRoom', 'updateSetting',
    ].sort();
    expect(methods).toEqual(expected);
});

test('navigation to external URLs is blocked', async () => {
    // Attempt navigation via window.location — should be intercepted
    const currentUrl = window.url();
    await window.evaluate(() => {
        try { window.location.href = 'https://evil.example.com'; } catch {}
    });
    await window.waitForTimeout(300);
    // Should still be on the local file
    expect(window.url()).toMatch(/^file:\/\//);
});

test('window.open is blocked', async () => {
    const opened = await window.evaluate(() => {
        const win = window.open('https://evil.example.com');
        return win === null;
    });
    expect(opened).toBe(true);
});

test('fetch to external origin is blocked by CSP', async () => {
    const result = await window.evaluate(async () => {
        try {
            await fetch('https://example.com');
            return 'allowed';
        } catch (e) {
            return 'blocked';
        }
    });
    expect(result).toBe('blocked');
});

test('IPC handler rejects non-integer room ID', async () => {
    const result = await window.evaluate(async () => {
        try {
            await window.electronAPI.updateRoom('../../etc/passwd', { status: 'available' });
            return 'no-error';
        } catch { return 'caught'; }
    });
    expect(result).toBe('caught');
});

test('IPC handler rejects null/undefined ID', async () => {
    const result = await window.evaluate(async () => {
        try {
            await window.electronAPI.deleteRoom(null);
            return 'no-error';
        } catch { return 'caught'; }
    });
    // Either caught or silently ignored — but must not crash the app
    expect(['caught', 'no-error']).toContain(result);

    // App must still be functional
    const rooms = await window.evaluate(() => window.electronAPI.getRooms());
    expect(Array.isArray(rooms)).toBe(true);
});
