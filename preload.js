const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
    // Rooms
    getRooms: () => ipcRenderer.invoke('get-rooms'),
    addRoom: (room) => ipcRenderer.invoke('add-room', room),
    updateRoom: (id, updates) => ipcRenderer.invoke('update-room', id, updates),
    deleteRoom: (id) => ipcRenderer.invoke('delete-room', id),

    // Guests
    getGuests: () => ipcRenderer.invoke('get-guests'),
    addGuest: (guest) => ipcRenderer.invoke('add-guest', guest),
    updateGuest: (id, updates) => ipcRenderer.invoke('update-guest', id, updates),
    getGuestByEmail: (email) => ipcRenderer.invoke('get-guest-by-email', email),

    // Bookings
    getBookings: () => ipcRenderer.invoke('get-bookings'),
    addBooking: (booking) => ipcRenderer.invoke('add-booking', booking),
    updateBooking: (id, updates) => ipcRenderer.invoke('update-booking', id, updates),

    // Payments
    getPayments: () => ipcRenderer.invoke('get-payments'),
    addPayment: (payment) => ipcRenderer.invoke('add-payment', payment),

    // Dashboard
    getDashboardStats: () => ipcRenderer.invoke('get-dashboard-stats'),

    // Settings
    getSettings: () => ipcRenderer.invoke('get-settings'),
    updateSetting: (key, value) => ipcRenderer.invoke('update-setting', key, value),

    // Auto-updater
    installUpdate: () => ipcRenderer.invoke('install-update'),
    onUpdateAvailable: (cb) => ipcRenderer.on('update-available', (_e, version) => cb(version)),
    onUpdateDownloaded: (cb) => ipcRenderer.on('update-downloaded', () => cb())
});
