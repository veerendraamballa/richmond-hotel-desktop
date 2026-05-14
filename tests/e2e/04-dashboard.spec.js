const { test, expect } = require('@playwright/test');
const { launchApp, closeApp } = require('./helpers/electron');

let app, window, userDataDir;

test.beforeAll(async () => {
    ({ app, window, userDataDir } = await launchApp());

    // Seed: add a room and a booking
    await window.click('.nav-item[data-tab="rooms"]');
    await window.click('#openAddRoomBtn');
    await window.fill('#roomNumber', '101');
    await window.selectOption('#roomType', 'Suite');
    await window.fill('#roomPrice', '250');
    await window.fill('#roomFloor', '1');
    await window.click('#addRoomModal button[type="submit"]');
    await expect(window.locator('#addRoomModal')).not.toHaveClass(/open/);

    // Navigate to dashboard
    await window.click('.nav-item[data-tab="dashboard"]');
});

test.afterAll(async () => {
    await closeApp(app, userDataDir);
});

test('dashboard KPI cards are visible', async () => {
    await expect(window.locator('#dashboard .kpi-card')).toHaveCount(4);
});

test('total rooms KPI reflects seeded room', async () => {
    await expect(window.locator('#totalRooms')).toHaveText('1');
});

test('available rooms KPI is correct', async () => {
    await expect(window.locator('#availableRooms')).toHaveText('1');
});

test('occupied rooms KPI starts at zero', async () => {
    await expect(window.locator('#occupiedRooms')).toHaveText('0');
});

test('revenue starts at $0.00', async () => {
    await expect(window.locator('#totalRevenue')).toContainText('$0');
});

test('donut chart is rendered', async () => {
    await expect(window.locator('.donut')).toBeVisible();
    await expect(window.locator('.donut-fill')).toBeVisible();
});

test('occupancy percentage shown in donut', async () => {
    await expect(window.locator('#occupancyPct')).toHaveText('0%');
});

test('refresh button reloads dashboard data', async () => {
    await window.click('#refreshDashboardBtn');
    await expect(window.locator('.toast')).toBeVisible();
    await expect(window.locator('.toast')).toContainText('refreshed');
});

test('recent bookings shows empty state with no bookings', async () => {
    await expect(window.locator('#recentBookings')).toContainText('No bookings yet');
});
