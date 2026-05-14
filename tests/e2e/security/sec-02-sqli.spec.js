/**
 * Security Test: SQL Injection
 *
 * Verifies that IPC handlers reject forbidden field names and
 * that SQL injection via update payload keys is blocked.
 */
const { test, expect } = require('@playwright/test');
const { launchApp, closeApp } = require('../helpers/electron');

let app, window, userDataDir;

test.beforeAll(async () => {
    ({ app, window, userDataDir } = await launchApp());

    // Seed a room via the UI
    await window.click('.nav-item[data-tab="rooms"]');
    await window.click('#openAddRoomBtn');
    await window.fill('#roomNumber', '101');
    await window.selectOption('#roomType', 'Single');
    await window.fill('#roomPrice', '80');
    await window.fill('#roomFloor', '1');
    await window.click('#addRoomModal button[type="submit"]');
    await window.waitForTimeout(300);
});

test.afterAll(async () => {
    await closeApp(app, userDataDir);
});

test('update-room rejects forbidden column names (SQL injection via key)', async () => {
    const result = await window.evaluate(async () => {
        try {
            // Attempt to inject via column name — should throw
            await window.electronAPI.updateRoom(1, {
                'status = 1; DROP TABLE rooms; --': 'x'
            });
            return 'no-error';
        } catch (e) {
            return e.message || 'caught';
        }
    });
    expect(result).not.toBe('no-error');
    expect(result).toMatch(/Forbidden|forbidden|invalid|Invalid/i);
});

test('update-room rejects unknown field names', async () => {
    const result = await window.evaluate(async () => {
        try {
            await window.electronAPI.updateRoom(1, { nonexistent_column: 'bad' });
            return 'no-error';
        } catch (e) { return 'caught'; }
    });
    expect(result).toBe('caught');
});

test('update-booking rejects forbidden fields', async () => {
    const result = await window.evaluate(async () => {
        try {
            await window.electronAPI.updateBooking(1, {
                'total_amount = 0; DELETE FROM bookings; --': '1'
            });
            return 'no-error';
        } catch (e) { return 'caught'; }
    });
    expect(result).toBe('caught');
});

test('update-room rejects invalid status enum value', async () => {
    const result = await window.evaluate(async () => {
        try {
            await window.electronAPI.updateRoom(1, { status: 'hacked' });
            return 'no-error';
        } catch (e) { return 'caught'; }
    });
    expect(result).toBe('caught');
});

test('add-room rejects oversized room number', async () => {
    const result = await window.evaluate(async () => {
        try {
            await window.electronAPI.addRoom({
                number: 'A'.repeat(300),
                type: 'Single',
                price: 100,
                floor: 1,
                status: 'available',
            });
            return 'no-error';
        } catch (e) { return 'caught'; }
    });
    expect(result).toBe('caught');
});

test('add-guest rejects invalid email format', async () => {
    const result = await window.evaluate(async () => {
        try {
            await window.electronAPI.addGuest({
                name: 'Test User',
                email: 'not-an-email',
                phone: '555-0000',
                address: '',
                id_number: '',
            });
            return 'no-error';
        } catch (e) { return 'caught'; }
    });
    expect(result).toBe('caught');
});

test('add-payment rejects negative amount', async () => {
    const result = await window.evaluate(async () => {
        try {
            await window.electronAPI.addPayment({
                booking_id: 1,
                amount: -500,
                payment_method: 'Cash',
                payment_date: '2026-01-01',
                notes: '',
            });
            return 'no-error';
        } catch (e) { return 'caught'; }
    });
    expect(result).toBe('caught');
});

test('add-payment rejects invalid date format', async () => {
    const result = await window.evaluate(async () => {
        try {
            await window.electronAPI.addPayment({
                booking_id: 1,
                amount: 100,
                payment_method: 'Cash',
                payment_date: '01/01/2026', // wrong format
                notes: '',
            });
            return 'no-error';
        } catch (e) { return 'caught'; }
    });
    expect(result).toBe('caught');
});

test('rooms table still intact after injection attempts', async () => {
    // If SQLi had worked, DROP TABLE would have destroyed rooms
    const rooms = await window.evaluate(() => window.electronAPI.getRooms());
    expect(Array.isArray(rooms)).toBe(true);
    expect(rooms.length).toBeGreaterThan(0);
});
