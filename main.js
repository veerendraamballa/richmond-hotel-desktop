const { app, BrowserWindow, ipcMain, dialog, Menu, session } = require('electron');
const { autoUpdater } = require('electron-updater');
const path = require('path');
const Database = require('better-sqlite3');
const fs = require('fs');

let mainWindow;
let db;

// ── Whitelists for update handlers (prevents SQL injection via column names) ──
const ALLOWED_ROOM_UPDATE_FIELDS    = new Set(['status', 'price', 'type', 'floor', 'number']);
const ALLOWED_BOOKING_UPDATE_FIELDS = new Set(['status', 'paid_amount', 'special_requests', 'check_out']);
const ALLOWED_GUEST_UPDATE_FIELDS   = new Set(['name', 'phone', 'address', 'total_bookings', 'total_spent']);

// ── Input validators ──────────────────────────────────────────────────────────
const ROOM_STATUSES    = new Set(['available', 'occupied', 'maintenance']);
const BOOKING_STATUSES = new Set(['confirmed', 'completed', 'cancelled']);
const VALID_METHODS    = new Set([
    'Cash', 'Credit Card', 'Debit Card', 'Check',
    'Apple Pay', 'Google Pay', 'Zelle',
    'ACH / Bank Transfer', 'Corporate Account',
]);

function assertString(val, max = 255) {
    if (typeof val !== 'string') throw new Error('Expected string');
    if (val.length > max) throw new Error(`Value exceeds max length ${max}`);
    return val.trim();
}

function assertPositiveNumber(val) {
    const n = Number(val);
    if (!Number.isFinite(n) || n <= 0) throw new Error('Expected positive number');
    return n;
}

function assertInt(val) {
    const n = parseInt(val, 10);
    if (!Number.isInteger(n)) throw new Error('Expected integer');
    return n;
}

function assertDate(val) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(val)) throw new Error('Expected YYYY-MM-DD date');
    return val;
}

function sanitizeUpdateFields(updates, allowedSet) {
    const keys = Object.keys(updates);
    for (const key of keys) {
        if (!allowedSet.has(key)) throw new Error(`Forbidden field: ${key}`);
    }
    if (keys.length === 0) throw new Error('No fields to update');
    return updates;
}

// Database initialization
function initDatabase() {
    const userDataOverride = process.env.RICHMOND_USER_DATA;
    const dbPath = userDataOverride
        ? path.join(userDataOverride, 'richmond-hotel.db')
        : path.join(app.getPath('userData'), 'richmond-hotel.db');
    console.log('Database path:', dbPath);
    
    db = new Database(dbPath);
    
    // Create tables
    db.exec(`
        CREATE TABLE IF NOT EXISTS rooms (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            number TEXT UNIQUE NOT NULL,
            type TEXT NOT NULL,
            price REAL NOT NULL,
            floor INTEGER NOT NULL,
            status TEXT DEFAULT 'available',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS guests (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            phone TEXT NOT NULL,
            address TEXT,
            id_number TEXT,
            total_bookings INTEGER DEFAULT 0,
            total_spent REAL DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS bookings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            booking_ref TEXT UNIQUE NOT NULL,
            guest_id INTEGER NOT NULL,
            room_id INTEGER NOT NULL,
            check_in DATE NOT NULL,
            check_out DATE NOT NULL,
            nights INTEGER NOT NULL,
            num_guests INTEGER DEFAULT 1,
            special_requests TEXT,
            total_amount REAL NOT NULL,
            paid_amount REAL DEFAULT 0,
            status TEXT DEFAULT 'confirmed',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (guest_id) REFERENCES guests(id),
            FOREIGN KEY (room_id) REFERENCES rooms(id)
        );

        CREATE TABLE IF NOT EXISTS payments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            booking_id INTEGER NOT NULL,
            amount REAL NOT NULL,
            payment_method TEXT DEFAULT 'Cash',
            payment_date DATE NOT NULL,
            status TEXT DEFAULT 'completed',
            notes TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (booking_id) REFERENCES bookings(id)
        );

        CREATE TABLE IF NOT EXISTS settings (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL
        );
    `);

    // Insert default settings
    const settingsStmt = db.prepare('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)');
    settingsStmt.run('hotel_name', 'Richmond Hotel');
    settingsStmt.run('hotel_address', 'Richmond, Virginia, USA');
    settingsStmt.run('hotel_phone', '+1-XXX-XXX-XXXX');
    settingsStmt.run('hotel_email', 'info@richmondhotel.com');
    settingsStmt.run('tax_rate', '10');
    settingsStmt.run('currency', 'USD');

    console.log('Database initialized successfully');
}

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1400,
        height: 900,
        minWidth: 1024,
        minHeight: 768,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            sandbox: false,
            webSecurity: true,
            preload: path.join(__dirname, 'preload.js'),
        },
        title: 'Richmond Hotel Management System',
    });

    // Content Security Policy — no inline scripts allowed from remote origins
    session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
        callback({
            responseHeaders: {
                ...details.responseHeaders,
                'Content-Security-Policy': [
                    "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'none';"
                ],
            },
        });
    });

    // Block navigation to any external URL
    mainWindow.webContents.on('will-navigate', (event, url) => {
        if (!url.startsWith('file://')) event.preventDefault();
    });

    // Block new windows / popups
    mainWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));

    mainWindow.loadFile('renderer/index.html');

    // Create application menu
    const template = [
        {
            label: 'File',
            submenu: [
                {
                    label: 'Backup Database',
                    click: () => backupDatabase()
                },
                {
                    label: 'Restore Database',
                    click: () => restoreDatabase()
                },
                { type: 'separator' },
                {
                    label: 'Exit',
                    role: 'quit'
                }
            ]
        },
        {
            label: 'View',
            submenu: [
                { role: 'reload' },
                { type: 'separator' },
                { role: 'resetZoom' },
                { role: 'zoomIn' },
                { role: 'zoomOut' },
                { type: 'separator' },
                { role: 'togglefullscreen' }
            ]
        },
        {
            label: 'Help',
            submenu: [
                {
                    label: 'About',
                    click: () => {
                        dialog.showMessageBox({
                            type: 'info',
                            title: 'About Richmond Hotel Manager',
                            message: 'Richmond Hotel Management System',
                            detail: 'Version 1.0.0\n\nA comprehensive desktop application for hotel management.\n\n© 2024 Richmond Hotel'
                        });
                    }
                }
            ]
        }
    ];

    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
}

// Backup database
async function backupDatabase() {
    const { filePath } = await dialog.showSaveDialog({
        title: 'Backup Database',
        defaultPath: `richmond-hotel-backup-${new Date().toISOString().split('T')[0]}.db`,
        filters: [
            { name: 'Database Files', extensions: ['db'] },
            { name: 'All Files', extensions: ['*'] }
        ]
    });

    if (filePath) {
        const dbPath = path.join(app.getPath('userData'), 'richmond-hotel.db');
        fs.copyFileSync(dbPath, filePath);
        dialog.showMessageBox({
            type: 'info',
            title: 'Backup Successful',
            message: 'Database backed up successfully!',
            detail: `Backup saved to: ${filePath}`
        });
    }
}

// Restore database
async function restoreDatabase() {
    const { filePaths } = await dialog.showOpenDialog({
        title: 'Restore Database',
        filters: [
            { name: 'Database Files', extensions: ['db'] },
            { name: 'All Files', extensions: ['*'] }
        ],
        properties: ['openFile']
    });

    if (filePaths && filePaths.length > 0) {
        const result = await dialog.showMessageBox({
            type: 'warning',
            title: 'Confirm Restore',
            message: 'This will replace your current database!',
            detail: 'All current data will be lost. Are you sure?',
            buttons: ['Cancel', 'Restore'],
            defaultId: 0,
            cancelId: 0
        });

        if (result.response === 1) {
            const srcPath = path.resolve(filePaths[0]);
            if (!srcPath.endsWith('.db')) throw new Error('Invalid file type for restore');
            const dbPath = path.join(app.getPath('userData'), 'richmond-hotel.db');
            db.close();
            fs.copyFileSync(srcPath, dbPath);
            db = new Database(dbPath);
            mainWindow.reload();
            dialog.showMessageBox({
                type: 'info',
                title: 'Restore Successful',
                message: 'Database restored successfully!'
            });
        }
    }
}

// IPC Handlers

ipcMain.handle('get-app-version', () => app.getVersion());

// Rooms
ipcMain.handle('get-rooms', () => {
    return db.prepare('SELECT * FROM rooms ORDER BY number').all();
});

ipcMain.handle('add-room', (event, room) => {
    const number = assertString(room.number, 10);
    const type   = assertString(room.type, 50);
    const price  = assertPositiveNumber(room.price);
    const floor  = assertInt(room.floor);
    const status = ROOM_STATUSES.has(room.status) ? room.status : 'available';
    const stmt = db.prepare('INSERT INTO rooms (number, type, price, floor, status) VALUES (?, ?, ?, ?, ?)');
    const info = stmt.run(number, type, price, floor, status);
    return { success: true, id: info.lastInsertRowid };
});

ipcMain.handle('update-room', (event, id, updates) => {
    sanitizeUpdateFields(updates, ALLOWED_ROOM_UPDATE_FIELDS);
    if (updates.status && !ROOM_STATUSES.has(updates.status)) throw new Error('Invalid status');
    const fields = Object.keys(updates).map(key => `${key} = ?`).join(', ');
    const stmt = db.prepare(`UPDATE rooms SET ${fields} WHERE id = ?`);
    stmt.run(...Object.values(updates), assertInt(id));
    return { success: true };
});

ipcMain.handle('delete-room', (event, id) => {
    const stmt = db.prepare('DELETE FROM rooms WHERE id = ?');
    stmt.run(id);
    return { success: true };
});

// Guests
ipcMain.handle('get-guests', () => {
    return db.prepare('SELECT * FROM guests ORDER BY name').all();
});

ipcMain.handle('add-guest', (event, guest) => {
    const name  = assertString(guest.name, 150);
    const email = assertString(guest.email, 255);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Invalid email');
    const phone = assertString(guest.phone, 30);
    const stmt = db.prepare('INSERT INTO guests (name, email, phone, address, id_number) VALUES (?, ?, ?, ?, ?)');
    const info = stmt.run(name, email, phone, (guest.address || '').slice(0, 255), (guest.id_number || '').slice(0, 50));
    return { success: true, id: info.lastInsertRowid };
});

ipcMain.handle('update-guest', (event, id, updates) => {
    sanitizeUpdateFields(updates, ALLOWED_GUEST_UPDATE_FIELDS);
    const fields = Object.keys(updates).map(key => `${key} = ?`).join(', ');
    const stmt = db.prepare(`UPDATE guests SET ${fields} WHERE id = ?`);
    stmt.run(...Object.values(updates), assertInt(id));
    return { success: true };
});

ipcMain.handle('get-guest-by-email', (event, email) => {
    return db.prepare('SELECT * FROM guests WHERE email = ?').get(email);
});

// Bookings
ipcMain.handle('get-bookings', () => {
    const query = `
        SELECT 
            b.*,
            g.name as guest_name,
            g.email as guest_email,
            g.phone as guest_phone,
            r.number as room_number,
            r.type as room_type,
            r.price as room_price
        FROM bookings b
        JOIN guests g ON b.guest_id = g.id
        JOIN rooms r ON b.room_id = r.id
        ORDER BY b.created_at DESC
    `;
    return db.prepare(query).all();
});

ipcMain.handle('add-booking', (event, booking) => {
    const stmt = db.prepare(`
        INSERT INTO bookings 
        (booking_ref, guest_id, room_id, check_in, check_out, nights, num_guests, special_requests, total_amount, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const info = stmt.run(
        booking.booking_ref,
        booking.guest_id,
        booking.room_id,
        booking.check_in,
        booking.check_out,
        booking.nights,
        booking.num_guests,
        booking.special_requests || '',
        booking.total_amount,
        booking.status || 'confirmed'
    );
    return { success: true, id: info.lastInsertRowid };
});

ipcMain.handle('update-booking', (event, id, updates) => {
    sanitizeUpdateFields(updates, ALLOWED_BOOKING_UPDATE_FIELDS);
    if (updates.status && !BOOKING_STATUSES.has(updates.status)) throw new Error('Invalid status');
    const fields = Object.keys(updates).map(key => `${key} = ?`).join(', ');
    const stmt = db.prepare(`UPDATE bookings SET ${fields} WHERE id = ?`);
    stmt.run(...Object.values(updates), assertInt(id));
    return { success: true };
});

// Payments
ipcMain.handle('get-payments', () => {
    const query = `
        SELECT 
            p.*,
            b.booking_ref,
            g.name as guest_name
        FROM payments p
        JOIN bookings b ON p.booking_id = b.id
        JOIN guests g ON b.guest_id = g.id
        ORDER BY p.created_at DESC
    `;
    return db.prepare(query).all();
});

ipcMain.handle('add-payment', (event, payment) => {
    const bookingId = assertInt(payment.booking_id);
    const amount    = assertPositiveNumber(payment.amount);
    const method    = VALID_METHODS.has(payment.payment_method) ? payment.payment_method : 'Cash';
    const date      = assertDate(payment.payment_date);
    const notes     = (payment.notes || '').slice(0, 500);
    const stmt = db.prepare('INSERT INTO payments (booking_id, amount, payment_method, payment_date, notes) VALUES (?, ?, ?, ?, ?)');
    const info = stmt.run(bookingId, amount, method, date, notes);
    return { success: true, id: info.lastInsertRowid };
});

// Dashboard stats
ipcMain.handle('get-dashboard-stats', () => {
    const totalRooms = db.prepare('SELECT COUNT(*) as count FROM rooms').get().count;
    const occupiedRooms = db.prepare("SELECT COUNT(*) as count FROM rooms WHERE status = 'occupied'").get().count;
    const availableRooms = db.prepare("SELECT COUNT(*) as count FROM rooms WHERE status = 'available'").get().count;
    const totalRevenue = db.prepare('SELECT SUM(amount) as total FROM payments').get().total || 0;
    const totalBookings = db.prepare('SELECT COUNT(*) as count FROM bookings').get().count;
    const totalGuests = db.prepare('SELECT COUNT(*) as count FROM guests').get().count;
    
    return {
        totalRooms,
        occupiedRooms,
        availableRooms,
        totalRevenue,
        totalBookings,
        totalGuests,
        occupancyRate: totalRooms > 0 ? ((occupiedRooms / totalRooms) * 100).toFixed(1) : 0
    };
});

// Settings
ipcMain.handle('get-settings', () => {
    const rows = db.prepare('SELECT * FROM settings').all();
    const settings = {};
    rows.forEach(row => {
        settings[row.key] = row.value;
    });
    return settings;
});

ipcMain.handle('update-setting', (event, key, value) => {
    const stmt = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');
    stmt.run(key, value);
    return { success: true };
});

// ── Auto-updater ──────────────────────────────────────────────────────────────
function setupAutoUpdater() {
    autoUpdater.autoDownload = true;
    autoUpdater.autoInstallOnAppQuit = true;

    autoUpdater.on('update-available', (info) => {
        if (mainWindow) {
            mainWindow.webContents.send('update-available', info.version);
        }
    });

    autoUpdater.on('update-downloaded', () => {
        if (mainWindow) {
            mainWindow.webContents.send('update-downloaded');
        }
    });

    autoUpdater.on('error', (err) => {
        console.error('Auto-updater error:', err.message);
    });

    // Check for updates 5 seconds after launch (not in dev)
    if (app.isPackaged) {
        setTimeout(() => autoUpdater.checkForUpdates(), 5000);
    }
}

ipcMain.handle('install-update', () => {
    autoUpdater.quitAndInstall();
});

// App lifecycle
app.whenReady().then(() => {
    initDatabase();
    createWindow();
    setupAutoUpdater();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        if (db) db.close();
        app.quit();
    }
});

app.on('before-quit', () => {
    if (db) db.close();
});
