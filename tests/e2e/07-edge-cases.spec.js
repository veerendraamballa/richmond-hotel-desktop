/**
 * Edge-Case E2E Tests
 *
 * Covers: double-booking prevention, partial payments, guest history,
 * input validation boundaries, and concurrent data integrity scenarios.
 */
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

    // Seed room 301 — used for the booking/double-booking tests
    await window.click('.nav-item[data-tab="rooms"]');
    await window.click('#openAddRoomBtn');
    await window.fill('#roomNumber', '301');
    await window.selectOption('#roomType', 'Suite');
    await window.fill('#roomPrice', '200');
    await window.fill('#roomFloor', '3');
    await window.click('#addRoomModal button[type="submit"]');
    await expect(window.locator('#addRoomModal')).not.toHaveClass(/open/);

    // Seed room 302 — stays available so the date-validation test always has
    // a room to select (HTML5 `required` on the room <select> would otherwise
    // block submission before JS validation runs, preventing the error toast).
    await window.click('#openAddRoomBtn');
    await window.fill('#roomNumber', '302');
    await window.selectOption('#roomType', 'Standard');
    await window.fill('#roomPrice', '100');
    await window.fill('#roomFloor', '3');
    await window.click('#addRoomModal button[type="submit"]');
    await expect(window.locator('#addRoomModal')).not.toHaveClass(/open/);
});

test.afterAll(async () => {
    await closeApp(app, userDataDir);
});

// ── Double-booking prevention ─────────────────────────────────────────────────

test('room disappears from booking selector once occupied', async () => {
    // Create first booking for room 301
    await window.click('.nav-item[data-tab="bookings"]');
    await window.click('#openAddBookingBtn');
    await window.fill('#bookingGuestName', 'Alice First');
    await window.fill('#bookingEmail', 'alice@test.com');
    await window.fill('#bookingPhone', '555-0001');
    // Select room 301 — first real option after the placeholder
    await window.selectOption('#bookingRoom', { index: 1 });
    await window.fill('#checkInDate', futureDate(1));
    await window.fill('#checkOutDate', futureDate(3));
    await window.click('#addBookingModal button[type="submit"]');
    await expect(window.locator('#addBookingModal')).not.toHaveClass(/open/);

    // Room 301 is now occupied — open New Booking modal and confirm 301 is gone
    await window.click('#openAddBookingBtn');
    const options = window.locator('#bookingRoom option');
    // Placeholder + room 302 only (301 is occupied)
    await expect(options).toHaveCount(2);
    await window.click('#addBookingModal [data-close-modal="addBookingModal"]');
});

test('occupied room badge shown correctly', async () => {
    await window.click('.nav-item[data-tab="rooms"]');
    await expect(window.locator('.badge-occupied')).toBeVisible();
    // Room 302 is still available
    await expect(window.locator('.badge-available')).toHaveCount(1);
});

// ── Partial payment ───────────────────────────────────────────────────────────

test('can process a partial payment and see remaining balance', async () => {
    await window.click('.nav-item[data-tab="billing"]');

    // Select the booking (2 nights × $200 = $400 total)
    await window.selectOption('#billingBooking', { index: 1 });
    await expect(window.locator('.billing-breakdown')).toBeVisible();

    // Pay half
    await window.fill('#paymentAmount', '200');
    await window.click('[data-action="process-payment"]');
    await expect(window.locator('.toast')).toBeVisible();
    await expect(window.locator('.toast')).toContainText('Payment of $200.00 recorded');
});

test('amount due decreases after partial payment', async () => {
    // Re-select the booking to refresh the breakdown
    await window.selectOption('#billingBooking', { index: 1 });
    const dueRow = window.locator('.billing-row.total span').last();
    await expect(dueRow).toHaveText('$200.00'); // $400 - $200 paid = $200 remaining
});

test('can pay remaining balance to fully settle', async () => {
    await window.fill('#paymentAmount', '200');
    await window.click('[data-action="process-payment"]');
    await expect(window.locator('.toast')).toContainText('Payment of $200.00 recorded');
});

test('payment history lists both partial payments', async () => {
    await expect(window.locator('#paymentsTable .data-table tbody tr')).toHaveCount(2);
});

// ── Guest history ─────────────────────────────────────────────────────────────

test('guest record is created when booking is made', async () => {
    await window.click('.nav-item[data-tab="guests"]');
    await expect(window.locator('#guestsTable')).toContainText('Alice First');
    await expect(window.locator('#guestsTable')).toContainText('alice@test.com');
});

test('guest search filters correctly', async () => {
    await window.fill('#searchGuest', 'alice');
    await expect(window.locator('#guestsTable tbody tr')).toHaveCount(1);

    await window.fill('#searchGuest', 'nobody@nowhere.com');
    await expect(window.locator('#guestsTable')).toContainText('No guests found');

    await window.fill('#searchGuest', '');
});

// ── Input validation boundaries ───────────────────────────────────────────────

test('cannot add room with empty room number', async () => {
    await window.click('.nav-item[data-tab="rooms"]');
    await window.click('#openAddRoomBtn');
    // Leave room number blank — submit should be prevented by HTML5 required
    await window.fill('#roomPrice', '100');
    await window.click('#addRoomModal button[type="submit"]');
    // Modal stays open (form validation blocked submission)
    await expect(window.locator('#addRoomModal')).toHaveClass(/open/);
    await window.click('#addRoomModal [data-close-modal="addRoomModal"]');
});

test('cannot create booking with check-out before check-in', async () => {
    await window.click('.nav-item[data-tab="bookings"]');
    await window.click('#openAddBookingBtn');
    await window.fill('#bookingGuestName', 'Bad Dates');
    await window.fill('#bookingEmail', 'bad@test.com');
    await window.fill('#bookingPhone', '555-0002');
    // Room 302 is the only available room after 301 was booked — select it so
    // HTML5 `required` validation doesn't block submission before JS date-check runs
    await window.selectOption('#bookingRoom', { index: 1 });
    // check-out BEFORE check-in
    await window.fill('#checkInDate', futureDate(5));
    await window.fill('#checkOutDate', futureDate(2));
    await window.click('#addBookingModal button[type="submit"]');
    // JS validation fires and shows an error toast
    await expect(window.locator('.toast.error')).toBeVisible({ timeout: 5000 });
    await window.click('#addBookingModal [data-close-modal="addBookingModal"]');
});

test('reports tab shows summary statistics', async () => {
    await window.click('.nav-item[data-tab="reports"]');
    await expect(window.locator('#reports')).toHaveClass(/active/);
    // Reports tab should show KPI cards
    await expect(window.locator('#reports .kpi-card')).toHaveCount(4);
});

test('dashboard reflects booked room in occupancy', async () => {
    await window.click('.nav-item[data-tab="dashboard"]');
    // Room 301 is occupied, room 302 is available
    await expect(window.locator('#occupiedRooms')).toHaveText('1');
    await expect(window.locator('#availableRooms')).toHaveText('1');
});
