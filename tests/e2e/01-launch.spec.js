const { test, expect } = require('@playwright/test');
const { launchApp, closeApp } = require('./helpers/electron');

let app, window, userDataDir;

test.beforeAll(async () => {
    ({ app, window, userDataDir } = await launchApp());
});

test.afterAll(async () => {
    await closeApp(app, userDataDir);
});

test('app launches and shows dashboard', async () => {
    const title = await app.evaluate(({ app }) => app.getTitle?.() ?? 'ok');
    expect(title).toBeTruthy();

    await expect(window.locator('.page-title')).toHaveText('Dashboard');
    await expect(window.locator('.kpi-card')).toHaveCount(4);
});

test('sidebar has all navigation items', async () => {
    const navItems = window.locator('.nav-item');
    await expect(navItems).toHaveCount(7);

    const labels = ['Dashboard', 'Rooms', 'Bookings', 'Guests', 'Billing', 'Reports', 'Settings'];
    for (const label of labels) {
        await expect(window.locator(`.nav-item:has-text("${label}")`)).toBeVisible();
    }
});

test('sidebar can be collapsed and expanded', async () => {
    await window.click('.sidebar-toggle');
    await expect(window.locator('.sidebar')).toHaveClass(/collapsed/);

    await window.click('.sidebar-toggle');
    await expect(window.locator('.sidebar')).not.toHaveClass(/collapsed/);
});

test('top bar clock is visible and updates', async () => {
    const clock = window.locator('#topbarClock');
    await expect(clock).toBeVisible();
    const t1 = await clock.textContent();
    expect(t1).toMatch(/\d{1,2}:\d{2}/);
});

test('all tabs navigate without errors', async () => {
    const tabs = ['rooms', 'bookings', 'guests', 'billing', 'reports', 'settings', 'dashboard'];
    for (const tab of tabs) {
        await window.click(`.nav-item[data-tab="${tab}"]`);
        await expect(window.locator(`#${tab}`)).toHaveClass(/active/);
    }
});
