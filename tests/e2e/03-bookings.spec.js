const { test, expect } = require('@playwright/test');
const { launchApp, closeApp } = require('./helpers/electron');

let app, window, userDataDir;

test.beforeAll(async () => {
    ({ app, window, userDataDir } = await launchApp());

    // Seed: add a room first
    await window.click('.nav-item[data-tab="rooms"]');
    await window.click('#openAddRoomBtn');
    await window.fill('#roomNumber', '101');
    await window.selectOption('#roomType', 'Double');
    await window.fill('#roomPrice', '120');
    await window.fill('#roomFloor', '1');
    await window.click('#addRoomModal button[type="submit"]');
    await expect(window.locator('#addRoomModal')).not.toHaveClass(/open/);
});

test.afterAll(async () => {
    await closeApp(app, userDataDir);
});

async function openBookingModal(win) {
    await win.click('.nav-item[data-tab="bookings"]');
    await expect(win.locator('#bookings')).toHaveClass(/active/);
    await win.click('#openAddBookingBtn');
    await expect(win.locator('#addBookingModal')).toHaveClass(/open/);
}

function futureDate(offsetDays) {
    const d = new Date();
    d.setDate(d.getDate() + offsetDays);
    return d.toISOString().split('T')[0];
}

test('bookings page shows empty state initially', async () => {
    await window.click('.nav-item[data-tab="bookings"]');
    await expect(window.locator('#bookingsTable')).toContainText('No bookings found');
});

test('New Booking modal opens and closes', async () => {
    await window.click('#openAddBookingBtn');
    await expect(window.locator('#addBookingModal')).toHaveClass(/open/);

    await window.click('#addBookingModal .modal-close');
    await expect(window.locator('#addBookingModal')).not.toHaveClass(/open/);
});

test('booking form shows cost summary when room and dates are selected', async () => {
    await openBookingModal(window);

    await window.fill('#bookingGuestName', 'John Smith');
    await window.fill('#bookingEmail', 'john@example.com');
    await window.fill('#bookingPhone', '555-1234');
    await window.selectOption('#bookingRoom', { index: 1 }); // first available room
    await window.fill('#checkInDate', futureDate(1));
    await window.fill('#checkOutDate', futureDate(3));

    await expect(window.locator('#bookingSummary')).toBeVisible();
    await expect(window.locator('#bookingSummary')).toContainText('2 nights');
    await expect(window.locator('#bookingSummary')).toContainText('$240.00');

    await window.click('#addBookingModal .modal-close');
});

test('can create a booking end-to-end', async () => {
    await openBookingModal(window);

    await window.fill('#bookingGuestName', 'Alice Johnson');
    await window.fill('#bookingEmail', 'alice@example.com');
    await window.fill('#bookingPhone', '555-9876');
    await window.selectOption('#bookingRoom', { index: 1 });
    await window.fill('#checkInDate', futureDate(1));
    await window.fill('#checkOutDate', futureDate(4));
    await window.fill('#numGuests', '2');
    await window.fill('#specialRequests', 'Sea view please');

    await window.click('#addBookingModal button[type="submit"]');

    // Modal closes
    await expect(window.locator('#addBookingModal')).not.toHaveClass(/open/);

    // Booking row appears in table
    await expect(window.locator('#bookingsTable .data-table tbody tr')).toHaveCount(1);
    await expect(window.locator('#bookingsTable')).toContainText('Alice Johnson');
    await expect(window.locator('#bookingsTable')).toContainText('BKG');
});

test('booking row shows correct status badge', async () => {
    await expect(window.locator('#bookingsTable .badge-confirmed')).toBeVisible();
});

test('room becomes occupied after booking', async () => {
    await window.click('.nav-item[data-tab="rooms"]');
    await expect(window.locator('.badge-occupied')).toBeVisible();
});

test('search filters bookings', async () => {
    await window.click('.nav-item[data-tab="bookings"]');

    await window.fill('#searchBooking', 'alice');
    await expect(window.locator('#bookingsTable tbody tr')).toHaveCount(1);

    await window.fill('#searchBooking', 'zzznomatch');
    await expect(window.locator('#bookingsTable')).toContainText('No bookings found');

    await window.fill('#searchBooking', '');
});

test('can check out a booking', async () => {
    // Override confirm() so the check-out proceeds without a native dialog
    await window.evaluate(() => { window.confirm = () => true; });
    await window.click('#bookingsTable button:has-text("Check Out")');
    // Status changes to completed
    await expect(window.locator('#bookingsTable .badge-completed')).toBeVisible();
});

test('room becomes available after check-out', async () => {
    await window.click('.nav-item[data-tab="rooms"]');
    await expect(window.locator('.badge-available')).toBeVisible();
});
