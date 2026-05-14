const { test, expect } = require('@playwright/test');
const { launchApp, closeApp } = require('./helpers/electron');

let app, window, userDataDir;

test.beforeAll(async () => {
    ({ app, window, userDataDir } = await launchApp());
    await window.click('.nav-item[data-tab="rooms"]');
    await expect(window.locator('#rooms')).toHaveClass(/active/);
});

test.afterAll(async () => {
    await closeApp(app, userDataDir);
});

test('rooms page shows empty state initially', async () => {
    const grid = window.locator('#roomsGrid');
    await expect(grid).toContainText('No rooms found');
});

test('Add Room modal opens and closes', async () => {
    await window.click('#openAddRoomBtn');
    await expect(window.locator('#addRoomModal')).toHaveClass(/open/);

    await window.click('.modal-close');
    await expect(window.locator('#addRoomModal')).not.toHaveClass(/open/);
});

test('can add a single room', async () => {
    await window.click('#openAddRoomBtn');
    await expect(window.locator('#addRoomModal')).toHaveClass(/open/);

    await window.fill('#roomNumber', '101');
    await window.selectOption('#roomType', 'Double');
    await window.fill('#roomPrice', '150');
    await window.fill('#roomFloor', '1');
    await window.click('#addRoomModal button[type="submit"]');

    // Modal closes on success
    await expect(window.locator('#addRoomModal')).not.toHaveClass(/open/);

    // Room card appears
    await expect(window.locator('.room-card')).toHaveCount(1);
    await expect(window.locator('.room-number')).toContainText('101');
});

test('room card shows correct type and price', async () => {
    const card = window.locator('.room-card').first();
    await expect(card.locator('.room-type-tag')).toHaveText('Double');
    await expect(card).toContainText('$150/night');
    await expect(card).toContainText('Floor');
    await expect(card.locator('.badge')).toContainText('Available');
});

test('can add multiple rooms', async () => {
    const rooms = [
        { number: '102', type: 'Suite', price: '300', floor: '1' },
        { number: '201', type: 'Single', price: '80', floor: '2' },
    ];

    for (const room of rooms) {
        await window.click('#openAddRoomBtn');
        await window.fill('#roomNumber', room.number);
        await window.selectOption('#roomType', room.type);
        await window.fill('#roomPrice', room.price);
        await window.fill('#roomFloor', room.floor);
        await window.click('#addRoomModal button[type="submit"]');
        await expect(window.locator('#addRoomModal')).not.toHaveClass(/open/);
    }

    await expect(window.locator('.room-card')).toHaveCount(3);
});

test('filter bar filters rooms by status', async () => {
    // All 3 rooms are available by default
    await window.click('.filter-btn[data-filter="occupied"]');
    await expect(window.locator('#roomsGrid')).toContainText('No rooms found');

    await window.click('.filter-btn[data-filter="all"]');
    await expect(window.locator('.room-card')).toHaveCount(3);
});

test('can change room status', async () => {
    const card = window.locator('.room-card').first();
    await card.locator('button:has-text("Change")').click();

    // Status should cycle to Occupied
    await expect(card.locator('.badge')).toContainText('Occupied');
});

test('can delete a room', async () => {
    // Override confirm() so deletion proceeds without a native dialog
    await window.evaluate(() => { window.confirm = () => true; });
    await window.locator('.room-card').first().locator('.btn-danger').click();

    await expect(window.locator('.room-card')).toHaveCount(2);
});

test('toast notification appears on room actions', async () => {
    // Add a room and verify toast
    await window.click('#openAddRoomBtn');
    await window.fill('#roomNumber', '301');
    await window.selectOption('#roomType', 'Deluxe');
    await window.fill('#roomPrice', '200');
    await window.fill('#roomFloor', '3');
    await window.click('#addRoomModal button[type="submit"]');

    await expect(window.locator('.toast')).toBeVisible();
    await expect(window.locator('.toast')).toContainText('Room 301 added');
});
