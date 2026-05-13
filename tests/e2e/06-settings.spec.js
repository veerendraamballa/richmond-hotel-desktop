const { test, expect } = require('@playwright/test');
const { launchApp, closeApp } = require('./helpers/electron');

let app, window, userDataDir;

test.beforeAll(async () => {
    ({ app, window, userDataDir } = await launchApp());
    await window.click('.nav-item[data-tab="settings"]');
    await expect(window.locator('#settings')).toHaveClass(/active/);
});

test.afterAll(async () => {
    await closeApp(app, userDataDir);
});

test('settings form is visible with default values', async () => {
    await expect(window.locator('#settingsForm')).toBeVisible();
    await expect(window.locator('#hotelName')).toHaveValue('Richmond Hotel');
    await expect(window.locator('#currency')).toHaveValue('USD');
});

test('can update hotel name', async () => {
    await window.fill('#hotelName', 'Grand Richmond Hotel');
    await window.click('#settingsForm button[type="submit"]');
    await expect(window.locator('.toast')).toBeVisible();
    await expect(window.locator('.toast')).toContainText('Settings saved');
});

test('hotel name persists after tab switch', async () => {
    await window.click('.nav-item[data-tab="dashboard"]');
    await window.click('.nav-item[data-tab="settings"]');
    await expect(window.locator('#hotelName')).toHaveValue('Grand Richmond Hotel');
});

test('can change currency', async () => {
    await window.selectOption('#currency', 'GBP');
    await window.click('#settingsForm button[type="submit"]');
    await expect(window.locator('.toast.success')).toBeVisible();
});

test('can update tax rate', async () => {
    await window.fill('#taxRate', '12.5');
    await window.click('#settingsForm button[type="submit"]');
    await expect(window.locator('.toast.success')).toBeVisible();
});

test('can update contact info', async () => {
    await window.fill('#hotelAddress', '123 Main St, Richmond VA');
    await window.fill('#hotelPhone', '+1-804-555-0100');
    await window.fill('#hotelEmail', 'contact@grandrichmond.com');
    await window.click('#settingsForm button[type="submit"]');
    await expect(window.locator('.toast.success')).toBeVisible();
});
