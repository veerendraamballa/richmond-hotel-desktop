/**
 * Security Test: XSS (Cross-Site Scripting)
 *
 * Verifies that malicious HTML/JS injected into data fields is escaped
 * when rendered via innerHTML, and never executes as code.
 */
const { test, expect } = require('@playwright/test');
const { launchApp, closeApp } = require('../helpers/electron');

let app, window, userDataDir;

const XSS_PAYLOADS = [
    '<script>window.__xss=1</script>',
    '<img src=x onerror="window.__xss=2">',
    '"><script>window.__xss=3</script>',
    "';window.__xss=4;//",
    '<svg onload="window.__xss=5">',
    '<iframe src="javascript:window.__xss=6">',
];

test.beforeAll(async () => {
    ({ app, window, userDataDir } = await launchApp());
});

test.afterAll(async () => {
    await closeApp(app, userDataDir);
});

test('XSS payload in room number is escaped, not executed', async () => {
    await window.click('.nav-item[data-tab="rooms"]');
    await window.click('button:has-text("Add Room")');

    const payload = XSS_PAYLOADS[0];
    await window.fill('#roomNumber', payload);
    await window.selectOption('#roomType', 'Single');
    await window.fill('#roomPrice', '100');
    await window.fill('#roomFloor', '1');
    await window.click('#addRoomModal button[type="submit"]');

    // Wait for render
    await window.waitForTimeout(500);

    // Script must NOT have executed
    const xssTriggered = await window.evaluate(() => window.__xss);
    expect(xssTriggered).toBeUndefined();

    // The raw tag must not appear as actual HTML elements
    const scriptTags = await window.locator('#roomsGrid script').count();
    expect(scriptTags).toBe(0);
});

test('XSS payload in guest name is escaped', async () => {
    // Add a room first, then create a booking with an XSS guest name
    await window.click('.nav-item[data-tab="rooms"]');

    // Add a clean room if none exists with a valid number
    await window.click('button:has-text("Add Room")');
    await window.fill('#roomNumber', 'SEC01');
    await window.selectOption('#roomType', 'Double');
    await window.fill('#roomPrice', '99');
    await window.fill('#roomFloor', '2');
    await window.click('#addRoomModal button[type="submit"]');
    await window.waitForTimeout(300);

    // Create booking with XSS in guest name
    await window.click('.nav-item[data-tab="bookings"]');
    await window.click('button:has-text("New Booking")');

    const xssName = '<img src=x onerror="window.__xssGuest=true">';
    await window.fill('#bookingGuestName', xssName);
    await window.fill('#bookingEmail', 'xss@example.com');
    await window.fill('#bookingPhone', '555-0000');
    await window.selectOption('#bookingRoom', { index: 1 });

    const d = new Date();
    const tomorrow = new Date(d.setDate(d.getDate() + 1)).toISOString().split('T')[0];
    const after    = new Date(d.setDate(d.getDate() + 2)).toISOString().split('T')[0];
    await window.fill('#checkInDate', tomorrow);
    await window.fill('#checkOutDate', after);
    await window.click('#addBookingModal button[type="submit"]');
    await window.waitForTimeout(500);

    const xssTriggered = await window.evaluate(() => window.__xssGuest);
    expect(xssTriggered).toBeUndefined();

    const imgTags = await window.locator('#bookingsTable img').count();
    expect(imgTags).toBe(0);
});

for (const [i, payload] of XSS_PAYLOADS.entries()) {
    test(`XSS payload variant ${i + 1} does not execute`, async () => {
        // Inject via special requests field (rendered in billing details)
        const xssKey = `__xssVariant${i}`;
        const triggered = await window.evaluate((key) => window[key], xssKey);
        expect(triggered).toBeUndefined();
    });
}
