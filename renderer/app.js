// Global state
let rooms = [];
let bookings = [];
let guests = [];
let payments = [];
let settings = {};
let currentTab = 'dashboard';

// ── Init ──────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
    startClock();
    await loadAllData();
    setupEventListeners();
    switchTab('dashboard');
});

function startClock() {
    const el = document.getElementById('topbarClock');
    const update = () => {
        const now = new Date();
        el.textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };
    update();
    setInterval(update, 1000);
}

// ── Data ──────────────────────────────────────────────────────────────────────
async function loadAllData() {
    try {
        [rooms, bookings, guests, payments, settings] = await Promise.all([
            window.electronAPI.getRooms(),
            window.electronAPI.getBookings(),
            window.electronAPI.getGuests(),
            window.electronAPI.getPayments(),
            window.electronAPI.getSettings(),
        ]);
    } catch (err) {
        console.error('Error loading data:', err);
        showToast('Error loading data from database', 'error');
    }
}

// ── Events ────────────────────────────────────────────────────────────────────
function setupEventListeners() {
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', () => switchTab(item.dataset.tab));
    });

    document.getElementById('addRoomForm').addEventListener('submit', handleAddRoom);
    document.getElementById('addBookingForm').addEventListener('submit', handleAddBooking);
    document.getElementById('settingsForm').addEventListener('submit', handleSaveSettings);

    document.getElementById('searchBooking').addEventListener('input', renderBookings);
    document.getElementById('searchGuest').addEventListener('input', renderGuests);
    document.getElementById('billingBooking').addEventListener('change', renderBillingDetails);

    // Booking summary preview on date/room change
    ['checkInDate', 'checkOutDate', 'bookingRoom'].forEach(id => {
        document.getElementById(id).addEventListener('change', updateBookingSummary);
    });

    // Close modals on overlay click
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
        overlay.addEventListener('click', e => {
            if (e.target === overlay) closeModal(overlay.id);
        });
    });

    // Close modals via data-close-modal attribute (replaces inline onclick)
    document.querySelectorAll('[data-close-modal]').forEach(btn => {
        btn.addEventListener('click', () => closeModal(btn.dataset.closeModal));
    });

    // Sidebar toggle
    document.getElementById('sidebarToggleBtn')?.addEventListener('click', toggleSidebar);

    // Topbar refresh
    document.getElementById('topbarRefreshBtn')?.addEventListener('click', refreshCurrent);

    // Dashboard refresh button
    document.getElementById('refreshDashboardBtn')?.addEventListener('click', refreshDashboard);

    // View all bookings link on dashboard
    document.getElementById('viewAllBookingsBtn')?.addEventListener('click', () => switchTab('bookings'));

    // Open Add Room modal
    document.getElementById('openAddRoomBtn')?.addEventListener('click', () => openModal('addRoomModal'));

    // Open Add Booking modal
    document.getElementById('openAddBookingBtn')?.addEventListener('click', () => openModal('addBookingModal'));

    // Filter bar (replaces inline onclick on filter-btn elements)
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', () => filterRoomCards(btn, btn.dataset.filter));
    });

    // Backup / Restore DB buttons
    document.getElementById('backupDbBtn')?.addEventListener('click', () => showToast('Use File > Backup Database from the menu', 'info'));
    document.getElementById('restoreDbBtn')?.addEventListener('click', () => showToast('Use File > Restore Database from the menu', 'info'));

    // Delegated handler for dynamically generated action buttons (CSP-safe, replaces inline onclick)
    document.addEventListener('click', e => {
        const btn = e.target.closest('[data-action]');
        if (!btn) return;
        const { action, id, status, room } = btn.dataset;
        if (action === 'cycle-status') cycleRoomStatus(parseInt(id), status);
        if (action === 'delete-room')  deleteRoom(parseInt(id));
        if (action === 'check-out')    checkOut(parseInt(id), parseInt(room));
        if (action === 'process-payment') processPayment(parseInt(id));
    });
}

// ── Navigation ────────────────────────────────────────────────────────────────
function switchTab(tab) {
    currentTab = tab;

    document.querySelectorAll('.nav-item').forEach(i => i.classList.toggle('active', i.dataset.tab === tab));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.toggle('active', c.id === tab));

    const labels = { dashboard: 'Dashboard', rooms: 'Room Management', bookings: 'Bookings', guests: 'Guests', billing: 'Billing & Payments', reports: 'Reports', settings: 'Settings' };
    document.getElementById('currentPageName').textContent = labels[tab] || tab;

    const actions = { dashboard: loadDashboard, rooms: renderRooms, bookings: () => { renderBookings(); updateBookingRoomSelect(); }, guests: renderGuests, billing: () => { renderPayments(); updateBillingBookingSelect(); }, reports: loadReports, settings: loadSettings };
    actions[tab]?.();
}

function toggleSidebar() {
    document.getElementById('sidebar').classList.toggle('collapsed');
}

function refreshCurrent() { switchTab(currentTab); }

// ── Modals ────────────────────────────────────────────────────────────────────
function openModal(id) { document.getElementById(id).classList.add('open'); }
function closeModal(id) { document.getElementById(id).classList.remove('open'); }

// ── Dashboard ─────────────────────────────────────────────────────────────────
async function loadDashboard() {
    try {
        const stats = await window.electronAPI.getDashboardStats();

        animateValue('totalRooms', stats.totalRooms);
        animateValue('occupiedRooms', stats.occupiedRooms);
        animateValue('availableRooms', stats.availableRooms);
        document.getElementById('totalRevenue').textContent = '$' + parseFloat(stats.totalRevenue).toFixed(2);

        // Donut chart
        const pct = stats.totalRooms > 0 ? Math.round((stats.occupiedRooms / stats.totalRooms) * 100) : 0;
        const circ = 2 * Math.PI * 46;
        document.getElementById('donutFill').setAttribute('stroke-dasharray', `${(pct / 100) * circ} ${circ}`);
        document.getElementById('occupancyPct').textContent = pct + '%';

        // Recent bookings
        const recent = [...bookings].reverse().slice(0, 5);
        const el = document.getElementById('recentBookings');

        if (!recent.length) {
            el.innerHTML = emptyState('No bookings yet');
            return;
        }

        el.innerHTML = `
            <table class="data-table">
                <thead><tr>
                    <th>Booking Ref</th><th>Guest</th><th>Room</th><th>Check-in</th><th>Check-out</th><th>Status</th>
                </tr></thead>
                <tbody>
                    ${recent.map(b => `
                        <tr>
                            <td class="table-primary">${esc(b.booking_ref)}</td>
                            <td>${esc(b.guest_name)}</td>
                            <td>${esc(b.room_number)}</td>
                            <td>${esc(formatDate(b.check_in))}</td>
                            <td>${esc(formatDate(b.check_out))}</td>
                            <td>${badge(b.status)}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>`;
    } catch (err) {
        console.error(err);
        showToast('Error loading dashboard', 'error');
    }
}

async function refreshDashboard() {
    await loadAllData();
    loadDashboard();
    showToast('Dashboard refreshed', 'success');
}

function animateValue(id, target) {
    const el = document.getElementById(id);
    const start = parseInt(el.textContent) || 0;
    const dur = 600;
    const t0 = performance.now();
    const step = (t) => {
        const p = Math.min((t - t0) / dur, 1);
        el.textContent = Math.round(start + (target - start) * easeOut(p));
        if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
}

function easeOut(t) { return 1 - Math.pow(1 - t, 3); }

// ── Rooms ─────────────────────────────────────────────────────────────────────
async function handleAddRoom(e) {
    e.preventDefault();
    const data = {
        number: document.getElementById('roomNumber').value,
        type: document.getElementById('roomType').value,
        price: parseFloat(document.getElementById('roomPrice').value),
        floor: parseInt(document.getElementById('roomFloor').value),
        status: 'available',
    };
    try {
        const res = await window.electronAPI.addRoom(data);
        if (res.success) {
            await loadAllData();
            renderRooms();
            e.target.reset();
            closeModal('addRoomModal');
            showToast(`Room ${data.number} added successfully`, 'success');
        }
    } catch {
        showToast('Error adding room — number may already exist', 'error');
    }
}

function renderRooms(filterStatus = null) {
    const active = filterStatus || document.querySelector('.filter-btn.active')?.dataset.filter || 'all';
    const filtered = active === 'all' ? rooms : rooms.filter(r => r.status === active);
    const grid = document.getElementById('roomsGrid');

    if (!filtered.length) {
        grid.innerHTML = `<div style="grid-column:1/-1">${emptyState('No rooms found')}</div>`;
        return;
    }

    grid.innerHTML = filtered.map(r => `
        <div class="room-card">
            <div class="room-card-header">
                <span class="room-number">Room ${esc(r.number)}</span>
                <span class="room-type-tag">${esc(r.type)}</span>
            </div>
            <div class="room-meta">
                <div class="room-meta-row"><span>Price</span><strong>$${esc(r.price)}/night</strong></div>
                <div class="room-meta-row"><span>Floor</span><strong>${esc(r.floor)}</strong></div>
            </div>
            <div class="room-card-footer">
                ${badge(r.status)}
                <div style="display:flex;gap:6px;">
                    <button class="btn btn-sm btn-secondary" data-action="cycle-status" data-id="${r.id}" data-status="${r.status}">Change</button>
                    <button class="btn btn-sm btn-danger btn-icon" data-action="delete-room" data-id="${r.id}" title="Delete">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>
                    </button>
                </div>
            </div>
        </div>
    `).join('');
}

function filterRoomCards(btn, filter) {
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    renderRooms(filter);
}

async function cycleRoomStatus(id, current) {
    const order = ['available', 'occupied', 'maintenance'];
    const next = order[(order.indexOf(current) + 1) % order.length];
    try {
        await window.electronAPI.updateRoom(id, { status: next });
        await loadAllData();
        renderRooms();
        showToast(`Room status changed to ${next}`, 'success');
    } catch { showToast('Error updating room status', 'error'); }
}

async function deleteRoom(id) {
    if (!confirm('Delete this room? This cannot be undone.')) return;
    try {
        await window.electronAPI.deleteRoom(id);
        await loadAllData();
        renderRooms();
        showToast('Room deleted', 'success');
    } catch { showToast('Error deleting room', 'error'); }
}

// ── Bookings ──────────────────────────────────────────────────────────────────
function updateBookingRoomSelect() {
    const sel = document.getElementById('bookingRoom');
    const available = rooms.filter(r => r.status === 'available');
    sel.innerHTML = '<option value="">Select a room</option>' +
        available.map(r => `<option value="${r.id}" data-price="${r.price}">Room ${r.number} — ${r.type} ($${r.price}/night)</option>`).join('');
}

function updateBookingSummary() {
    const roomSel = document.getElementById('bookingRoom');
    const checkIn = document.getElementById('checkInDate').value;
    const checkOut = document.getElementById('checkOutDate').value;
    const el = document.getElementById('bookingSummary');

    if (!roomSel.value || !checkIn || !checkOut) { el.style.display = 'none'; return; }

    const price = parseFloat(roomSel.selectedOptions[0]?.dataset.price || 0);
    const nights = Math.ceil((new Date(checkOut) - new Date(checkIn)) / 86400000);

    if (nights <= 0) { el.style.display = 'none'; return; }

    el.style.display = 'block';
    el.innerHTML = `<strong>${nights} night${nights > 1 ? 's' : ''}</strong> &times; $${price}/night = <strong>$${(nights * price).toFixed(2)}</strong>`;
}

async function handleAddBooking(e) {
    e.preventDefault();
    const roomId = parseInt(document.getElementById('bookingRoom').value);
    if (!roomId) { showToast('Please select a room', 'error'); return; }

    const checkIn  = document.getElementById('checkInDate').value;
    const checkOut = document.getElementById('checkOutDate').value;
    const nights   = Math.ceil((new Date(checkOut) - new Date(checkIn)) / 86400000);
    if (nights <= 0) { showToast('Check-out must be after check-in', 'error'); return; }

    const room = rooms.find(r => r.id === roomId);
    const name  = document.getElementById('bookingGuestName').value;
    const email = document.getElementById('bookingEmail').value;
    const phone = document.getElementById('bookingPhone').value;

    try {
        let guest = await window.electronAPI.getGuestByEmail(email);
        if (!guest) {
            const gr = await window.electronAPI.addGuest({ name, email, phone, address: '', id_number: '' });
            guest = { id: gr.id };
        }

        const ref = 'BKG' + Date.now().toString().slice(-8);
        await window.electronAPI.addBooking({
            booking_ref: ref,
            guest_id: guest.id,
            room_id: roomId,
            check_in: checkIn,
            check_out: checkOut,
            nights,
            num_guests: parseInt(document.getElementById('numGuests').value) || 1,
            special_requests: document.getElementById('specialRequests').value,
            total_amount: nights * room.price,
            status: 'confirmed',
        });

        await window.electronAPI.updateRoom(roomId, { status: 'occupied' });
        await loadAllData();
        renderBookings();
        updateBookingRoomSelect();
        e.target.reset();
        document.getElementById('bookingSummary').style.display = 'none';
        closeModal('addBookingModal');
        showToast(`Booking ${ref} confirmed!`, 'success');
    } catch (err) {
        console.error(err);
        showToast('Error creating booking', 'error');
    }
}

function renderBookings() {
    const search = document.getElementById('searchBooking').value.toLowerCase();
    const filtered = bookings.filter(b =>
        !search ||
        b.guest_name?.toLowerCase().includes(search) ||
        b.booking_ref?.toLowerCase().includes(search) ||
        b.room_number?.includes(search)
    );

    const el = document.getElementById('bookingsTable');
    if (!filtered.length) { el.innerHTML = emptyState('No bookings found'); return; }

    el.innerHTML = `
        <table class="data-table">
            <thead><tr>
                <th>Ref</th><th>Guest</th><th>Room</th><th>Check-in</th><th>Check-out</th><th>Nights</th><th>Total</th><th>Status</th><th>Action</th>
            </tr></thead>
            <tbody>
                ${filtered.map(b => `
                    <tr>
                        <td class="table-primary">${esc(b.booking_ref)}</td>
                        <td>${esc(b.guest_name)}</td>
                        <td>${esc(b.room_number)} <span class="table-muted">${esc(b.room_type)}</span></td>
                        <td>${esc(formatDate(b.check_in))}</td>
                        <td>${esc(formatDate(b.check_out))}</td>
                        <td>${esc(b.nights)}</td>
                        <td>$${parseFloat(b.total_amount).toFixed(2)}</td>
                        <td>${badge(b.status)}</td>
                        <td>${b.status === 'confirmed'
                            ? `<button class="btn btn-sm btn-danger" data-action="check-out" data-id="${b.id}" data-room="${b.room_id}">Check Out</button>`
                            : `<span class="table-muted">—</span>`}
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>`;
}

async function checkOut(bookingId, roomId) {
    if (!confirm('Process check-out for this booking?')) return;
    try {
        await window.electronAPI.updateBooking(bookingId, { status: 'completed' });
        await window.electronAPI.updateRoom(roomId, { status: 'available' });
        await loadAllData();
        renderBookings();
        updateBookingRoomSelect();
        showToast('Check-out processed successfully', 'success');
    } catch { showToast('Error processing check-out', 'error'); }
}

// ── Guests ────────────────────────────────────────────────────────────────────
function renderGuests() {
    const search = document.getElementById('searchGuest').value.toLowerCase();
    const filtered = guests.filter(g =>
        !search ||
        g.name?.toLowerCase().includes(search) ||
        g.email?.toLowerCase().includes(search) ||
        g.phone?.includes(search)
    );

    const el = document.getElementById('guestsTable');
    if (!filtered.length) { el.innerHTML = emptyState('No guests found'); return; }

    el.innerHTML = `
        <table class="data-table">
            <thead><tr>
                <th>Name</th><th>Email</th><th>Phone</th><th>Bookings</th><th>Total Spent</th>
            </tr></thead>
            <tbody>
                ${filtered.map(g => `
                    <tr>
                        <td class="table-primary">${esc(g.name)}</td>
                        <td>${esc(g.email)}</td>
                        <td>${esc(g.phone)}</td>
                        <td>${esc(g.total_bookings || 0)}</td>
                        <td>$${parseFloat(g.total_spent || 0).toFixed(2)}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>`;
}

// ── Billing ───────────────────────────────────────────────────────────────────
function updateBillingBookingSelect() {
    const sel = document.getElementById('billingBooking');
    const unpaid = bookings.filter(b => parseFloat(b.paid_amount) < parseFloat(b.total_amount) && b.status === 'confirmed');
    sel.innerHTML = '<option value="">Select a booking…</option>' +
        unpaid.map(b => {
            const due = (parseFloat(b.total_amount) - parseFloat(b.paid_amount)).toFixed(2);
            return `<option value="${b.id}">${b.booking_ref} — ${b.guest_name} ($${due} due)</option>`;
        }).join('');
}

function renderBillingDetails() {
    const id = parseInt(document.getElementById('billingBooking').value);
    const el = document.getElementById('billingDetails');
    if (!id) { el.innerHTML = ''; return; }

    const b = bookings.find(x => x.id === id);
    if (!b) return;

    const due = (parseFloat(b.total_amount) - parseFloat(b.paid_amount)).toFixed(2);
    el.innerHTML = `
        <div class="billing-breakdown">
            <div class="billing-row"><span>Guest</span><span>${esc(b.guest_name)}</span></div>
            <div class="billing-row"><span>Room</span><span>${esc(b.room_number)} (${esc(b.room_type)})</span></div>
            <div class="billing-row"><span>Nights</span><span>${esc(b.nights)}</span></div>
            <div class="billing-row"><span>Total Amount</span><span>$${parseFloat(b.total_amount).toFixed(2)}</span></div>
            <div class="billing-row"><span>Paid</span><span>$${parseFloat(b.paid_amount).toFixed(2)}</span></div>
            <div class="billing-row total"><span>Amount Due</span><span>$${due}</span></div>
        </div>
        <div class="form-group" style="margin-bottom:12px;">
            <label class="form-label">Payment Amount ($)</label>
            <input class="form-control" type="number" id="paymentAmount" value="${due}" max="${due}" step="0.01">
        </div>
        <button class="btn btn-success" data-action="process-payment" data-id="${b.id}">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
            Process Payment
        </button>`;
}

async function processPayment(bookingId) {
    const b = bookings.find(x => x.id === bookingId);
    if (!b) return;

    const amount = parseFloat(document.getElementById('paymentAmount').value);
    const due = parseFloat(b.total_amount) - parseFloat(b.paid_amount);
    if (!amount || amount <= 0 || amount > due) { showToast('Invalid payment amount', 'error'); return; }

    try {
        await window.electronAPI.addPayment({
            booking_id: bookingId,
            amount,
            payment_method: 'Cash',
            payment_date: new Date().toISOString().split('T')[0],
            notes: '',
        });
        await window.electronAPI.updateBooking(bookingId, { paid_amount: parseFloat(b.paid_amount) + amount });
        await loadAllData();
        renderPayments();
        updateBillingBookingSelect();
        renderBillingDetails();
        showToast(`Payment of $${amount.toFixed(2)} recorded`, 'success');
    } catch { showToast('Error processing payment', 'error'); }
}

function renderPayments() {
    const el = document.getElementById('paymentsTable');
    if (!payments.length) { el.innerHTML = emptyState('No payments recorded yet'); return; }

    el.innerHTML = `
        <table class="data-table">
            <thead><tr>
                <th>Date</th><th>Booking Ref</th><th>Guest</th><th>Amount</th><th>Method</th><th>Status</th>
            </tr></thead>
            <tbody>
                ${payments.map(p => `
                    <tr>
                        <td>${esc(formatDate(p.payment_date))}</td>
                        <td class="table-primary">${esc(p.booking_ref)}</td>
                        <td>${esc(p.guest_name)}</td>
                        <td>$${parseFloat(p.amount).toFixed(2)}</td>
                        <td>${esc(p.payment_method)}</td>
                        <td>${badge('paid')}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>`;
}

// ── Reports ───────────────────────────────────────────────────────────────────
async function loadReports() {
    try {
        const stats = await window.electronAPI.getDashboardStats();
        document.getElementById('totalBookings').textContent = stats.totalBookings;
        document.getElementById('occupancyRate').textContent = stats.occupancyRate + '%';
        document.getElementById('totalGuests').textContent = stats.totalGuests;
        const avg = rooms.length ? (rooms.reduce((s, r) => s + r.price, 0) / rooms.length).toFixed(2) : 0;
        document.getElementById('avgRoomRate').textContent = '$' + avg;
    } catch { showToast('Error loading reports', 'error'); }
}

// ── Settings ──────────────────────────────────────────────────────────────────
function loadSettings() {
    document.getElementById('hotelName').value    = settings.hotel_name    || '';
    document.getElementById('hotelAddress').value = settings.hotel_address || '';
    document.getElementById('hotelPhone').value   = settings.hotel_phone   || '';
    document.getElementById('hotelEmail').value   = settings.hotel_email   || '';
    document.getElementById('taxRate').value      = settings.tax_rate      || '0';
    document.getElementById('currency').value     = settings.currency      || 'USD';
}

async function handleSaveSettings(e) {
    e.preventDefault();
    try {
        const pairs = [
            ['hotel_name',    'hotelName'],
            ['hotel_address', 'hotelAddress'],
            ['hotel_phone',   'hotelPhone'],
            ['hotel_email',   'hotelEmail'],
            ['tax_rate',      'taxRate'],
            ['currency',      'currency'],
        ];
        await Promise.all(pairs.map(([key, id]) =>
            window.electronAPI.updateSetting(key, document.getElementById(id).value)
        ));
        settings = await window.electronAPI.getSettings();
        showToast('Settings saved successfully', 'success');
    } catch { showToast('Error saving settings', 'error'); }
}

// ── Security helpers ──────────────────────────────────────────────────────────

/** Escape HTML special chars to prevent XSS when rendering data via innerHTML */
function esc(str) {
    if (str === null || str === undefined) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;');
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function badge(status) {
    const map = { available: 'Available', occupied: 'Occupied', maintenance: 'Maintenance', confirmed: 'Confirmed', completed: 'Completed', paid: 'Paid' };
    return `<span class="badge badge-${status}">${map[status] || status}</span>`;
}

function formatDate(str) {
    if (!str) return '—';
    const d = new Date(str);
    return isNaN(d) ? str : d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function emptyState(msg) {
    return `<div class="empty-state">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><line x1="8" y1="12" x2="16" y2="12"/></svg>
        <p>${msg}</p>
    </div>`;
}

function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    // Remove any existing toasts immediately so there is never more than one
    container.querySelectorAll('.toast').forEach(t => t.remove());

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<span class="toast-dot"></span><span class="toast-msg">${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
        toast.classList.add('removing');
        toast.addEventListener('animationend', () => toast.remove());
    }, 3200);
}
