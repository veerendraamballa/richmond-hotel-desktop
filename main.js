const { app, BrowserWindow, ipcMain, dialog, Menu } = require('electron');
const path = require('path');
const Database = require('better-sqlite3');
const fs = require('fs');

let mainWindow;
let db;

// Database initialization
function initDatabase() {
    const dbPath = path.join(app.getPath('userData'), 'richmond-hotel.db');
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
            preload: path.join(__dirname, 'preload.js')
        },
        icon: path.join(__dirname, 'assets', 'icon.png'),
        title: 'Richmond Hotel Management System'
    });

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
                { role: 'toggleDevTools' },
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
            const dbPath = path.join(app.getPath('userData'), 'richmond-hotel.db');
            db.close();
            fs.copyFileSync(filePaths[0], dbPath);
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

// Rooms
ipcMain.handle('get-rooms', () => {
    return db.prepare('SELECT * FROM rooms ORDER BY number').all();
});

ipcMain.handle('add-room', (event, room) => {
    const stmt = db.prepare('INSERT INTO rooms (number, type, price, floor, status) VALUES (?, ?, ?, ?, ?)');
    const info = stmt.run(room.number, room.type, room.price, room.floor, room.status || 'available');
    return { success: true, id: info.lastInsertRowid };
});

ipcMain.handle('update-room', (event, id, updates) => {
    const fields = Object.keys(updates).map(key => `${key} = ?`).join(', ');
    const values = Object.values(updates);
    const stmt = db.prepare(`UPDATE rooms SET ${fields} WHERE id = ?`);
    stmt.run(...values, id);
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
    const stmt = db.prepare('INSERT INTO guests (name, email, phone, address, id_number) VALUES (?, ?, ?, ?, ?)');
    const info = stmt.run(guest.name, guest.email, guest.phone, guest.address || '', guest.id_number || '');
    return { success: true, id: info.lastInsertRowid };
});

ipcMain.handle('update-guest', (event, id, updates) => {
    const fields = Object.keys(updates).map(key => `${key} = ?`).join(', ');
    const values = Object.values(updates);
    const stmt = db.prepare(`UPDATE guests SET ${fields} WHERE id = ?`);
    stmt.run(...values, id);
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
    const fields = Object.keys(updates).map(key => `${key} = ?`).join(', ');
    const values = Object.values(updates);
    const stmt = db.prepare(`UPDATE bookings SET ${fields} WHERE id = ?`);
    stmt.run(...values, id);
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
    const stmt = db.prepare(`
        INSERT INTO payments (booking_id, amount, payment_method, payment_date, notes)
        VALUES (?, ?, ?, ?, ?)
    `);
    const info = stmt.run(
        payment.booking_id,
        payment.amount,
        payment.payment_method,
        payment.payment_date,
        payment.notes || ''
    );
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

// App lifecycle
app.whenReady().then(() => {
    initDatabase();
    createWindow();

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
