const { test, expect } = require('@playwright/test');
const { launchApp, closeApp } = require('./helpers/electron');

let app, window, userDataDir;

function futureDate(offset) {
    const d = new Date();
    d.setDate(d.getDate() + offset);
    return d.toISOString().split('T')[0];
}

test.beforeAll(async () => {
    ({ app, window, userDataDir } = await launchApp());

    // Seed: room + booking
    await window.click('.nav-item[data-tab="rooms"]');
    await window.click('button:has-text("Add Room")');
    await window.fill('#roomNumber', '101');
    await window.selectOption('#roomType', 'Double');
    await window.fill('#roomPrice', '100');
    await window.fill('#roomFloor', '1');
    await window.click('#addRoomModal button[type="submit"]');
    await expect(window.locator('#addRoomModal')).not.toHaveClass(/open/);

    await window.click('.nav-item[data-tab="bookings"]');
    await window.click('button:has-text("New Booking")');
    await window.fill('#bookingGuestName', 'Bob Brown');
    await window.fill('#bookingEmail', 'bob@example.com');
    await window.fill('#bookingPhone', '555-0001');
    await window.selectOption('#bookingRoom', { index: 1 });
    await window.fill('#checkInDate', futureDate(1));
    await window.fill('#checkOutDate', futureDate(3)); // 2 nights = $200
    await window.click('#addBookingModal button[type="submit"]');
    await expect(window.locator('#addBookingModal')).not.toHaveClass(/open/);

    await window.click('.nav-item[data-tab="billing"]');
});

test.afterAll(async () => {
    await closeApp(app, userDataDir);
});

test('billing page is visible', async () => {
    await expect(window.locator('#billing')).toHaveClass(/active/);
});

test('booking selector is populated', async () => {
    const options = window.locator('#billingBooking option');
    await expect(options).toHaveCount(2); // placeholder + 1 booking
});

test('selecting a booking shows billing breakdown', async () => {
    await window.selectOption('#billingBooking', { index: 1 });
    await expect(window.locator('.billing-breakdown')).toBeVisible();
    await expect(window.locator('.billing-breakdown')).toContainText('Bob Brown');
    await expect(window.locator('.billing-breakdown')).toContainText('$200.00');
});

test('amount due is shown correctly', async () => {
    const dueRow = window.locator('.billing-row.total span').last();
    await expect(dueRow).toHaveText('$200.00');
});

test('can process a payment', async () => {
    await window.fill('#paymentAmount', '200');
    await window.click('button:has-text("Process Payment")');
    await expect(window.locator('.toast')).toBeVisible();
    await expect(window.locator('.toast')).toContainText('Payment of $200.00 recorded');
});

test('payment history shows the processed payment', async () => {
    await expect(window.locator('#paymentsTable .data-table')).toBeVisible();
    await expect(window.locator('#paymentsTable')).toContainText('Bob Brown');
    await expect(window.locator('#paymentsTable')).toContainText('$200.00');
    await expect(window.locator('#paymentsTable .badge-paid')).toBeVisible();
});
