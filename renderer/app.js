// Global state
let rooms = [];
let bookings = [];
let guests = [];
let payments = [];
let settings = {};

// Initialize app
document.addEventListener('DOMContentLoaded', async () => {
    await loadAllData();
    setupEventListeners();
    switchTab('dashboard');
});

// Load data from Electron backend
async function loadAllData() {
    try {
        rooms = await window.electronAPI.getRooms();
        bookings = await window.electronAPI.getBookings();
        guests = await window.electronAPI.getGuests();
        payments = await window.electronAPI.getPayments();
        settings = await window.electronAPI.getSettings();
        
        console.log('Data loaded:', { rooms, bookings, guests, payments, settings });
    } catch (error) {
        console.error('Error loading data:', error);
        showNotification('Error loading data from database', 'error');
    }
}

// Setup event listeners
function setupEventListeners() {
    // Navigation
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', (e) => {
            const tab = e.currentTarget.dataset.tab;
            switchTab(tab);
        });
    });

    // Forms
    document.getElementById('addRoomForm').addEventListener('submit', handleAddRoom);
    document.getElementById('addBookingForm').addEventListener('submit', handleAddBooking);
    document.getElementById('settingsForm').addEventListener('submit', handleSaveSettings);

    // Search
    document.getElementById('searchBooking').addEventListener('input', filterBookings);
    document.getElementById('searchGuest').addEventListener('input', filterGuests);

    // Billing
    document.getElementById('billingBooking').addEventListener('change', loadBillingDetails);
}

// Tab switching
function switchTab(tabName) {
    // Update nav items
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
        if (item.dataset.tab === tabName) {
            item.classList.add('active');
        }
    });

    // Update tab content
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    document.getElementById(tabName).classList.add('active');

    // Load tab-specific data
    switch(tabName) {
        case 'dashboard':
            loadDashboard();
            break;
        case 'rooms':
            displayRooms();
            break;
        case 'bookings':
            displayBookings();
            updateBookingRoomSelect();
            break;
        case 'guests':
            displayGuests();
            break;
        case 'billing':
            displayPayments();
            updateBillingBookingSelect();
            break;
        case 'reports':
            loadReports();
            break;
        case 'settings':
            loadSettings();
            break;
    }
}

// Dashboard
async function loadDashboard() {
    try {
        const stats = await window.electronAPI.getDashboardStats();
        
        document.getElementById('totalRooms').textContent = stats.totalRooms;
        document.getElementById('occupiedRooms').textContent = stats.occupiedRooms;
        document.getElementById('availableRooms').textContent = stats.availableRooms;
        document.getElementById('totalRevenue').textContent = `$${parseFloat(stats.totalRevenue).toFixed(2)}`;

        // Recent bookings
        const recent = bookings.slice(-5).reverse();
        const container = document.getElementById('recentBookings');
        
        if (recent.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: #6c757d; padding: 20px;">No bookings yet</p>';
            return;
        }

        container.innerHTML = `
            <table>
                <thead>
                    <tr>
                        <th>Booking Ref</th>
                        <th>Guest</th>
                        <th>Room</th>
                        <th>Check-in</th>
                        <th>Status</th>
                    </tr>
                </thead>
                <tbody>
                    ${recent.map(b => `
                        <tr>
                            <td><strong>${b.booking_ref}</strong></td>
                            <td>${b.guest_name}</td>
                            <td>${b.room_number}</td>
                            <td>${b.check_in}</td>
                            <td><span class="status-badge status-${b.status}">${b.status}</span></td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    } catch (error) {
        console.error('Error loading dashboard:', error);
        showNotification('Error loading dashboard', 'error');
    }
}

async function refreshDashboard() {
    await loadAllData();
    loadDashboard();
    showNotification('Dashboard refreshed', 'success');
}

// Rooms Management
async function handleAddRoom(e) {
    e.preventDefault();

    const roomData = {
        number: document.getElementById('roomNumber').value,
        type: document.getElementById('roomType').value,
        price: parseFloat(document.getElementById('roomPrice').value),
        floor: parseInt(document.getElementById('roomFloor').value),
        status: 'available'
    };

    try {
        const result = await window.electronAPI.addRoom(roomData);
        if (result.success) {
            await loadAllData();
            displayRooms();
            e.target.reset();
            showNotification(`Room ${roomData.number} added successfully!`, 'success');
        }
    } catch (error) {
        console.error('Error adding room:', error);
        showNotification('Error adding room. Room number may already exist.', 'error');
    }
}

function displayRooms() {
    const grid = document.getElementById('roomsGrid');
    
    if (rooms.length === 0) {
        grid.innerHTML = '<p style="text-align: center; color: #6c757d; padding: 20px;">No rooms added yet</p>';
        return;
    }

    grid.innerHTML = rooms.map(room => `
        <div class="room-card ${room.status}">
            <h3>Room ${room.number}</h3>
            <p><strong>Type:</strong> ${room.type}</p>
            <p><strong>Price:</strong> $${room.price}/night</p>
            <p><strong>Floor:</strong> ${room.floor}</p>
            <span class="status-badge status-${room.status}">${room.status.toUpperCase()}</span>
            <div class="action-buttons">
                <button class="btn btn-warning" onclick="changeRoomStatus(${room.id}, '${room.status}')">
                    Change Status
                </button>
                <button class="btn btn-danger" onclick="deleteRoom(${room.id})">
                    Delete
                </button>
            </div>
        </div>
    `).join('');
}

async function changeRoomStatus(roomId, currentStatus) {
    const statuses = ['available', 'occupied', 'maintenance'];
    const currentIndex = statuses.indexOf(currentStatus);
    const newStatus = statuses[(currentIndex + 1) % statuses.length];

    try {
        await window.electronAPI.updateRoom(roomId, { status: newStatus });
        await loadAllData();
        displayRooms();
        showNotification(`Room status changed to ${newStatus}`, 'success');
    } catch (error) {
        console.error('Error updating room:', error);
        showNotification('Error updating room status', 'error');
    }
}

async function deleteRoom(roomId) {
    if (!confirm('Are you sure you want to delete this room?')) return;

    try {
        await window.electronAPI.deleteRoom(roomId);
        await loadAllData();
        displayRooms();
        showNotification('Room deleted successfully', 'success');
    } catch (error) {
        console.error('Error deleting room:', error);
        showNotification('Error deleting room', 'error');
    }
}

// Bookings Management
function updateBookingRoomSelect() {
    const select = document.getElementById('bookingRoom');
    const availableRooms = rooms.filter(r => r.status === 'available');
    
    select.innerHTML = '<option value="">Select a room</option>' + 
        availableRooms.map(room => 
            `<option value="${room.id}" data-price="${room.price}">Room ${room.number} - ${room.type} ($${room.price}/night)</option>`
        ).join('');
}

async function handleAddBooking(e) {
    e.preventDefault();

    const guestName = document.getElementById('bookingGuestName').value;
    const email = document.getElementById('bookingEmail').value;
    const phone = document.getElementById('bookingPhone').value;
    const roomId = parseInt(document.getElementById('bookingRoom').value);
    const checkIn = document.getElementById('checkInDate').value;
    const checkOut = document.getElementById('checkOutDate').value;
    const numGuests = parseInt(document.getElementById('numGuests').value) || 1;
    const specialRequests = document.getElementById('specialRequests').value;

    if (!roomId) {
        showNotification('Please select a room', 'error');
        return;
    }

    const room = rooms.find(r => r.id === roomId);
    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);
    const nights = Math.ceil((checkOutDate - checkInDate) / (1000 * 60 * 60 * 24));

    if (nights <= 0) {
        showNotification('Check-out date must be after check-in date', 'error');
        return;
    }

    const totalAmount = nights * room.price;

    try {
        // Check if guest exists
        let guest = await window.electronAPI.getGuestByEmail(email);
        
        if (!guest) {
            // Create new guest
            const guestResult = await window.electronAPI.addGuest({
                name: guestName,
                email: email,
                phone: phone,
                address: '',
                id_number: ''
            });
            guest = { id: guestResult.id };
        }

        // Create booking
        const bookingData = {
            booking_ref: 'BKG' + Date.now().toString().slice(-8),
            guest_id: guest.id,
            room_id: roomId,
            check_in: checkIn,
            check_out: checkOut,
            nights: nights,
            num_guests: numGuests,
            special_requests: specialRequests,
            total_amount: totalAmount,
            status: 'confirmed'
        };

        await window.electronAPI.addBooking(bookingData);
        
        // Update room status
        await window.electronAPI.updateRoom(roomId, { status: 'occupied' });

        await loadAllData();
        displayBookings();
        updateBookingRoomSelect();
        e.target.reset();
        
        showNotification(`Booking ${bookingData.booking_ref} created successfully!`, 'success');
    } catch (error) {
        console.error('Error creating booking:', error);
        showNotification('Error creating booking', 'error');
    }
}

function displayBookings() {
    const container = document.getElementById('bookingsTable');
    
    if (bookings.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: #6c757d; padding: 20px;">No bookings yet</p>';
        return;
    }

    container.innerHTML = `
        <table>
            <thead>
                <tr>
                    <th>Booking Ref</th>
                    <th>Guest</th>
                    <th>Room</th>
                    <th>Check-in</th>
                    <th>Check-out</th>
                    <th>Nights</th>
                    <th>Total</th>
                    <th>Status</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                ${bookings.map(b => `
                    <tr>
                        <td><strong>${b.booking_ref}</strong></td>
                        <td>${b.guest_name}</td>
                        <td>${b.room_number} (${b.room_type})</td>
                        <td>${b.check_in}</td>
                        <td>${b.check_out}</td>
                        <td>${b.nights}</td>
                        <td>$${b.total_amount}</td>
                        <td><span class="status-badge status-${b.status}">${b.status}</span></td>
                        <td>
                            ${b.status === 'confirmed' ? 
                                `<button class="btn btn-danger" style="padding: 8px 15px; font-size: 0.9em;" onclick="checkOut(${b.id}, ${b.room_id})">Check Out</button>` 
                                : 'Completed'}
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

function filterBookings() {
    const search = document.getElementById('searchBooking').value.toLowerCase();
    const filtered = bookings.filter(b => 
        b.guest_name.toLowerCase().includes(search) ||
        b.booking_ref.toLowerCase().includes(search) ||
        b.room_number.includes(search)
    );

    const container = document.getElementById('bookingsTable');
    
    if (filtered.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: #6c757d; padding: 20px;">No bookings found</p>';
        return;
    }

    container.innerHTML = `
        <table>
            <thead>
                <tr>
                    <th>Booking Ref</th>
                    <th>Guest</th>
                    <th>Room</th>
                    <th>Check-in</th>
                    <th>Check-out</th>
                    <th>Nights</th>
                    <th>Total</th>
                    <th>Status</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                ${filtered.map(b => `
                    <tr>
                        <td><strong>${b.booking_ref}</strong></td>
                        <td>${b.guest_name}</td>
                        <td>${b.room_number} (${b.room_type})</td>
                        <td>${b.check_in}</td>
                        <td>${b.check_out}</td>
                        <td>${b.nights}</td>
                        <td>$${b.total_amount}</td>
                        <td><span class="status-badge status-${b.status}">${b.status}</span></td>
                        <td>
                            ${b.status === 'confirmed' ? 
                                `<button class="btn btn-danger" style="padding: 8px 15px; font-size: 0.9em;" onclick="checkOut(${b.id}, ${b.room_id})">Check Out</button>` 
                                : 'Completed'}
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

async function checkOut(bookingId, roomId) {
    if (!confirm('Process check-out for this booking?')) return;

    try {
        await window.electronAPI.updateBooking(bookingId, { status: 'completed' });
        await window.electronAPI.updateRoom(roomId, { status: 'available' });
        await loadAllData();
        displayBookings();
        updateBookingRoomSelect();
        showNotification('Check-out processed successfully', 'success');
    } catch (error) {
        console.error('Error processing check-out:', error);
        showNotification('Error processing check-out', 'error');
    }
}

// Guests Management
function displayGuests() {
    const container = document.getElementById('guestsTable');
    
    if (guests.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: #6c757d; padding: 20px;">No guests registered yet</p>';
        return;
    }

    container.innerHTML = `
        <table>
            <thead>
                <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Phone</th>
                    <th>Total Bookings</th>
                    <th>Total Spent</th>
                </tr>
            </thead>
            <tbody>
                ${guests.map(g => `
                    <tr>
                        <td><strong>${g.name}</strong></td>
                        <td>${g.email}</td>
                        <td>${g.phone}</td>
                        <td>${g.total_bookings || 0}</td>
                        <td>$${(g.total_spent || 0).toFixed(2)}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

function filterGuests() {
    const search = document.getElementById('searchGuest').value.toLowerCase();
    const filtered = guests.filter(g => 
        g.name.toLowerCase().includes(search) ||
        g.email.toLowerCase().includes(search) ||
        g.phone.includes(search)
    );

    const container = document.getElementById('guestsTable');
    
    if (filtered.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: #6c757d; padding: 20px;">No guests found</p>';
        return;
    }

    container.innerHTML = `
        <table>
            <thead>
                <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Phone</th>
                    <th>Total Bookings</th>
                    <th>Total Spent</th>
                </tr>
            </thead>
            <tbody>
                ${filtered.map(g => `
                    <tr>
                        <td><strong>${g.name}</strong></td>
                        <td>${g.email}</td>
                        <td>${g.phone}</td>
                        <td>${g.total_bookings || 0}</td>
                        <td>$${(g.total_spent || 0).toFixed(2)}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

// Billing Management
function updateBillingBookingSelect() {
    const select = document.getElementById('billingBooking');
    const unpaidBookings = bookings.filter(b => 
        parseFloat(b.paid_amount) < parseFloat(b.total_amount) && b.status === 'confirmed'
    );
    
    select.innerHTML = '<option value="">Select a booking</option>' + 
        unpaidBookings.map(b => {
            const due = (parseFloat(b.total_amount) - parseFloat(b.paid_amount)).toFixed(2);
            return `<option value="${b.id}" data-amount="${b.total_amount}" data-paid="${b.paid_amount}">
                ${b.booking_ref} - ${b.guest_name} - Room ${b.room_number} ($${due} due)
            </option>`;
        }).join('');
}

function loadBillingDetails() {
    const select = document.getElementById('billingBooking');
    const bookingId = select.value;
    const container = document.getElementById('billingDetails');

    if (!bookingId) {
        container.innerHTML = '';
        return;
    }

    const booking = bookings.find(b => b.id === parseInt(bookingId));
    if (!booking) return;

    const amountDue = (parseFloat(booking.total_amount) - parseFloat(booking.paid_amount)).toFixed(2);

    container.innerHTML = `
        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-top: 20px;">
            <h4 style="margin-bottom: 15px;">Billing Details</h4>
            <p><strong>Booking Ref:</strong> ${booking.booking_ref}</p>
            <p><strong>Guest:</strong> ${booking.guest_name}</p>
            <p><strong>Room:</strong> ${booking.room_number} (${booking.room_type})</p>
            <p><strong>Nights:</strong> ${booking.nights}</p>
            <p><strong>Total Amount:</strong> $${booking.total_amount}</p>
            <p><strong>Paid Amount:</strong> $${booking.paid_amount}</p>
            <p style="color: #dc3545; font-size: 1.2em; margin-top: 10px;"><strong>Amount Due:</strong> $${amountDue}</p>
            
            <div style="margin-top: 20px;">
                <label style="font-weight: 600; margin-bottom: 8px; display: block;">Payment Amount ($)</label>
                <input type="number" id="paymentAmount" value="${amountDue}" max="${amountDue}" step="0.01" 
                    style="width: 100%; padding: 12px; border: 2px solid #dee2e6; border-radius: 8px; margin-bottom: 15px;">
                <button class="btn btn-success" onclick="processPayment(${booking.id})">Process Payment</button>
            </div>
        </div>
    `;
}

async function processPayment(bookingId) {
    const booking = bookings.find(b => b.id === bookingId);
    if (!booking) return;

    const paymentAmount = parseFloat(document.getElementById('paymentAmount').value);
    const amountDue = parseFloat(booking.total_amount) - parseFloat(booking.paid_amount);

    if (!paymentAmount || paymentAmount <= 0 || paymentAmount > amountDue) {
        showNotification('Invalid payment amount', 'error');
        return;
    }

    try {
        // Add payment
        await window.electronAPI.addPayment({
            booking_id: bookingId,
            amount: paymentAmount,
            payment_method: 'Cash',
            payment_date: new Date().toISOString().split('T')[0],
            notes: ''
        });

        // Update booking paid amount
        const newPaidAmount = parseFloat(booking.paid_amount) + paymentAmount;
        await window.electronAPI.updateBooking(bookingId, { paid_amount: newPaidAmount });

        await loadAllData();
        displayPayments();
        updateBillingBookingSelect();
        loadBillingDetails();
        
        showNotification(`Payment of $${paymentAmount} processed successfully!`, 'success');
    } catch (error) {
        console.error('Error processing payment:', error);
        showNotification('Error processing payment', 'error');
    }
}

function displayPayments() {
    const container = document.getElementById('paymentsTable');
    
    if (payments.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: #6c757d; padding: 20px;">No payments recorded yet</p>';
        return;
    }

    container.innerHTML = `
        <table>
            <thead>
                <tr>
                    <th>Date</th>
                    <th>Booking Ref</th>
                    <th>Guest</th>
                    <th>Amount</th>
                    <th>Method</th>
                    <th>Status</th>
                </tr>
            </thead>
            <tbody>
                ${payments.map(p => `
                    <tr>
                        <td>${p.payment_date}</td>
                        <td><strong>${p.booking_ref}</strong></td>
                        <td>${p.guest_name}</td>
                        <td>$${p.amount}</td>
                        <td>${p.payment_method}</td>
                        <td><span class="status-badge status-available">${p.status}</span></td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

// Reports
async function loadReports() {
    try {
        const stats = await window.electronAPI.getDashboardStats();
        
        document.getElementById('totalBookings').textContent = stats.totalBookings;
        document.getElementById('occupancyRate').textContent = stats.occupancyRate + '%';
        document.getElementById('totalGuests').textContent = stats.totalGuests;
        
        const avgRate = rooms.length > 0 
            ? (rooms.reduce((sum, r) => sum + r.price, 0) / rooms.length).toFixed(2) 
            : 0;
        document.getElementById('avgRoomRate').textContent = '$' + avgRate;
    } catch (error) {
        console.error('Error loading reports:', error);
        showNotification('Error loading reports', 'error');
    }
}

// Settings
function loadSettings() {
    document.getElementById('hotelName').value = settings.hotel_name || '';
    document.getElementById('hotelAddress').value = settings.hotel_address || '';
    document.getElementById('hotelPhone').value = settings.hotel_phone || '';
    document.getElementById('hotelEmail').value = settings.hotel_email || '';
    document.getElementById('taxRate').value = settings.tax_rate || '0';
    document.getElementById('currency').value = settings.currency || 'USD';
}

async function handleSaveSettings(e) {
    e.preventDefault();

    try {
        await window.electronAPI.updateSetting('hotel_name', document.getElementById('hotelName').value);
        await window.electronAPI.updateSetting('hotel_address', document.getElementById('hotelAddress').value);
        await window.electronAPI.updateSetting('hotel_phone', document.getElementById('hotelPhone').value);
        await window.electronAPI.updateSetting('hotel_email', document.getElementById('hotelEmail').value);
        await window.electronAPI.updateSetting('tax_rate', document.getElementById('taxRate').value);
        await window.electronAPI.updateSetting('currency', document.getElementById('currency').value);

        settings = await window.electronAPI.getSettings();
        showNotification('Settings saved successfully!', 'success');
    } catch (error) {
        console.error('Error saving settings:', error);
        showNotification('Error saving settings', 'error');
    }
}

// Notification system
function showNotification(message, type = 'info') {
    const notification = document.getElementById('notification');
    notification.textContent = message;
    notification.className = `notification ${type} show`;

    setTimeout(() => {
        notification.classList.remove('show');
    }, 3000);
}
