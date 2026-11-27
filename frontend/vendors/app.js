const $ = selector => document.querySelector(selector);

let vendors = [];
let payments = [];
let assignedVendors = [];
let editingVendorId = null;
let selectedLoginRole = 'couple';
let busy = false;

// Helper Functions

function formatMoney(amount) {
    return Number(amount).toFixed(2) + ' EGP';
}

function message(element, text, type = '') {
    element.textContent = text;
    element.className = type;
}

function appendCells(row, values) {
    values.forEach(value => {
        const cell = document.createElement('td');
        cell.textContent = value ?? '';
        row.appendChild(cell);
    });
}

function actionButton(label, handler) {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = label;
    button.addEventListener('click', handler);
    return button;
}

// Login Role Selection

function selectLoginRole(role, button) {

    if (busy) return;

    selectedLoginRole = role;

    document.querySelectorAll('.role-tab')
        .forEach(tab => {
            tab.classList.remove('active');
            tab.setAttribute('aria-pressed', 'false');
        });

    button.classList.add('active');
    button.setAttribute('aria-pressed', 'true');

    $('#wedding-field').hidden = role === 'vendor';

    $('#wedding-id').required = role === 'couple';

    if (role === 'vendor') {
        $('#wedding-id').value = '';
    }

    message($('#login-message'), '');
}

// Show or Hide Password

function togglePassword(button) {

    const input = $('#login-password');

    const visible = input.type === 'password';

    input.type = visible ? 'text' : 'password';

    button.setAttribute(
        'aria-label',
        visible ? 'Hide password' : 'Show password'
    );

    button.setAttribute('aria-pressed', String(visible));
}

// Initialize Login Controls

$('#wedding-id').required = true;

document.querySelectorAll('.role-tab').forEach(tab => {
    tab.setAttribute(
        'aria-pressed',
        String(tab.classList.contains('active'))
    );
});

// Authentication

$('#login-form').addEventListener('submit', async event => {

    event.preventDefault();

    if (busy) return;

    busy = true;

    const loginButton = $('#login-form .signin-button');

    loginButton.disabled = true;
    loginButton.textContent = 'Signing in...';

    message($('#login-message'), '');

    try {

        const user = await login(
            $('#login-email').value.trim(),
            $('#login-password').value
        );

        if (user.role !== selectedLoginRole) {

            throw new Error(
                `This account belongs to the ${user.role} role. Please select the correct account type.`
            );
        }

        if (user.role === 'couple') {

            const weddingId = Number($('#wedding-id').value);

            if (
                !Number.isSafeInteger(weddingId) ||
                weddingId <= 0
            ) {
                throw new Error('Enter a valid wedding ID.');
            }

            setWeddingId(weddingId);

            await loadData();

        } else if (user.role === 'vendor') {

            await loadVendorPortal();

        } else {

            throw new Error(
                'This dashboard is not available for your role.'
            );
        }

        $('#user-name').textContent = user.full_name;
        $('#user-role').textContent = user.role;

        $('#login-section').hidden = true;
        $('#user-section').hidden = false;

        $('#couple-dashboard').hidden =
            user.role !== 'couple';

        $('#vendor-dashboard').hidden =
            user.role !== 'vendor';

        $('#login-form').reset();

        message($('#login-message'), '');

    } catch (error) {

        logout();

        message(
            $('#login-message'),
            error.message,
            'error'
        );

    } finally {

        $('#login-password').value = '';
        $('#login-password').type = 'password';

        $('.password-toggle').setAttribute(
            'aria-label', 'Show password'
        );

        $('.password-toggle').setAttribute(
            'aria-pressed', 'false'
        );

        loginButton.disabled = false;
        loginButton.textContent = 'Sign in';

        busy = false;
    }
});

// Logout

$('#logout-button').addEventListener('click', () => {

    if (busy) return;

    logout();

    window.location.reload();
});

// Budget Management

function renderBudget(summary) {

    $('#budget-total').textContent =
        formatMoney(summary.total_amount);

    $('#budget-committed').textContent =
        formatMoney(summary.committed_amount);

    $('#budget-paid').textContent =
        formatMoney(summary.paid_amount);

    $('#budget-remaining').textContent =
        formatMoney(summary.remaining_amount);

    const percentage = Number(summary.usage_percentage);

    $('#budget-progress').value =
        Math.min(percentage, 100);

    $('#budget-percentage').textContent =
        percentage.toFixed(2) + '% used';

    if (
        Number(summary.committed_amount) >
        Number(summary.total_amount)
    ) {

        message(
            $('#budget-warning'),
            'Warning: Budget exceeded!',
            'error'
        );

    } else if (
        summary.budget_warning || percentage >= 80
    ) {

        message(
            $('#budget-warning'),
            'Warning: You have used 80% or more of your budget.',
            'warning'
        );

    } else {

        message($('#budget-warning'), '');
    }
}

// Common Couple API Operations

async function performAction(
    element,
    operation,
    successText,
    afterSuccess
) {

    if (busy) return;

    busy = true;

    let saved = false;
    let result;

    try {

        result = await operation();

        saved = true;

        if (afterSuccess) {
            afterSuccess();
        }

        await loadData();

        if (result?.task_sync_required) {

            message(
                element,
                'Payment saved, but task creation failed. Use Retry Task.',
                'warning'
            );

        } else if (
            element !== $('#budget-warning') ||
            !element.textContent
        ) {

            message(element, successText, 'success');
        }

    } catch (error) {

        let text = saved
            ? 'Saved, but refresh failed: ' + error.message
            : error.message;

        if (result?.task_sync_required) {
            text += ' Task synchronization is still required.';
        }

        message(element, text, 'error');

    } finally {

        busy = false;
    }
}

// Set Budget

$('#budget-form').addEventListener('submit', event => {

    event.preventDefault();

    const amount = Number($('#total-budget').value);

    if (!Number.isFinite(amount) || amount <= 0) {

        return message(
            $('#budget-warning'),
            'Enter a valid budget.',
            'error'
        );
    }

    performAction(
        $('#budget-warning'),
        () => budgetAPI.update(amount),
        'Budget updated successfully.',
        () => $('#budget-form').reset()
    );
});

// Render Vendors

function renderVendors(data = vendors) {

    const list = $('#vendor-list');

    list.replaceChildren();

    data.forEach(vendor => {

        const row = document.createElement('tr');

        appendCells(row, [
            vendor.vendor_name,
            vendor.service_type,
            vendor.vendor_email,
            vendor.vendor_phone_number,
            formatMoney(vendor.contract_total)
        ]);

        const actions = document.createElement('td');

        actions.append(

            actionButton('Edit', () =>
                editVendor(vendor.vendor_id)
            ),

            actionButton('Delete', () =>
                deleteVendor(vendor.vendor_id)
            )
        );

        row.appendChild(actions);
        list.appendChild(row);
    });
}

// Payment Vendor Dropdown

function updateVendorOptions() {

    const select = $('#payment-vendor');

    const selected = select.value;

    select.replaceChildren(
        new Option('Select Vendor', '')
    );

    vendors.forEach(vendor => {

        select.add(
            new Option(
                vendor.vendor_name,
                vendor.vendor_id
            )
        );
    });

    select.value = selected;

    if (select.selectedIndex === -1) {
        select.selectedIndex = 0;
    }
}

// Reset Vendor Form

function resetVendorForm() {

    editingVendorId = null;

    $('#vendor-form').reset();

    $('#vendor-form button[type="submit"]').textContent =
        'Add Vendor';
}

// Add or Update Vendor

$('#vendor-form').addEventListener('submit', event => {

    event.preventDefault();

    const data = {

        vendor_name: $('#vendor-name').value.trim(),

        service_type: $('#service-type').value,

        vendor_email: $('#vendor-email').value.trim(),

        vendor_phone_number: $('#vendor-phone').value.trim(),

        contract_total: Number($('#contract-total').value)
    };

    if (
        !data.vendor_name ||
        !data.service_type ||
        !data.vendor_email ||
        !Number.isFinite(data.contract_total) ||
        data.contract_total <= 0
    ) {

        return message(
            $('#vendor-message'),
            'Enter valid vendor details.',
            'error'
        );
    }

    const id = editingVendorId;

    performAction(

        $('#vendor-message'),

        () => id === null
            ? vendorAPI.create(data)
            : vendorAPI.update(id, data),

        id === null
            ? 'Vendor added successfully.'
            : 'Vendor updated successfully.',

        resetVendorForm
    );
});

// Edit Vendor

function editVendor(id) {

    if (busy) return;

    const vendor = vendors.find(
        v => Number(v.vendor_id) === Number(id)
    );

    if (!vendor) return;

    editingVendorId = id;

    $('#vendor-name').value = vendor.vendor_name;

    $('#service-type').value = vendor.service_type;

    $('#vendor-email').value = vendor.vendor_email;

    $('#vendor-phone').value =
        vendor.vendor_phone_number || '';

    $('#contract-total').value = vendor.contract_total;

    $('#vendor-form button[type="submit"]').textContent =
        'Update Vendor';

    message(
        $('#vendor-message'),
        'Editing vendor details.'
    );

    $('#vendor-form').scrollIntoView({
        behavior: 'smooth'
    });
}

// Delete Vendor

function deleteVendor(id) {

    if (
        busy ||
        !confirm('Are you sure you want to delete this vendor?')
    ) {
        return;
    }

    performAction(

        $('#vendor-message'),

        () => vendorAPI.remove(id),

        'Vendor deleted successfully.',

        () => {

            if (editingVendorId === id) {
                resetVendorForm();
            }
        }
    );
}

// Search Vendors Using Backend API

let searchTimer;
let searchVersion = 0;

$('#vendor-search').addEventListener('input', () => {

    clearTimeout(searchTimer);

    const version = ++searchVersion;

    searchTimer = setTimeout(async () => {

        if (
            !authToken ||
            currentUser?.role !== 'couple'
        ) {
            return;
        }

        try {

            const search = $('#vendor-search').value.trim();

            const results = await vendorAPI.getAll(search);

            if (version === searchVersion) {
                renderVendors(results);
            }

        } catch (error) {

            if (version === searchVersion) {

                message(
                    $('#vendor-message'),
                    error.message,
                    'error'
                );
            }
        }

    }, 300);
});

// Render Couple Payments

function renderPayments() {

    const list = $('#payment-list');

    list.replaceChildren();

    payments.forEach(payment => {

        const vendor = vendors.find(
            v => Number(v.vendor_id) ===
                Number(payment.vendor_id)
        );

        const row = document.createElement('tr');

        appendCells(row, [

            vendor?.vendor_name || 'Unknown Vendor',

            formatMoney(payment.payment_amount),

            String(payment.payment_due_date).slice(0, 10),

            payment.payment_status
        ]);

        row.children[3].className =
            payment.payment_status.toLowerCase();

        const actions = document.createElement('td');

        if (
            ['Pending', 'Overdue'].includes(
                payment.payment_status
            )
        ) {

            actions.appendChild(

                actionButton('Mark as Paid', () =>
                    markPaymentPaid(payment.payment_id)
                )
            );
        }

        actions.appendChild(

            actionButton('Retry Task', () =>

                performAction(
                    $('#payment-message'),

                    () => paymentAPI.retryTask(
                        payment.payment_id
                    ),

                    'Payment task synchronized successfully.'
                )
            )
        );

        row.appendChild(actions);
        list.appendChild(row);
    });
}

// Schedule Payment

$('#payment-form').addEventListener('submit', event => {

    event.preventDefault();

    const data = {

        vendor_id: Number($('#payment-vendor').value),

        payment_amount: Number($('#payment-amount').value),

        payment_due_date: $('#due-date').value
    };

    if (
        !data.vendor_id ||
        !Number.isFinite(data.payment_amount) ||
        data.payment_amount <= 0 ||
        !data.payment_due_date
    ) {

        return message(
            $('#payment-message'),
            'Enter valid payment details.',
            'error'
        );
    }

    performAction(

        $('#payment-message'),

        () => paymentAPI.create(data),

        'Payment scheduled and task created successfully.',

        () => $('#payment-form').reset()
    );
});

// Mark Payment as Paid

function markPaymentPaid(id) {

    if (
        busy ||
        !confirm('Mark this payment as paid?')
    ) {
        return;
    }

    performAction(

        $('#payment-message'),

        () => paymentAPI.updateStatus(id, 'Paid'),

        'Payment marked as paid successfully.'
    );
}

// Load Couple Dashboard

async function loadData() {

    const version = ++searchVersion;

    const [
        vendorData,
        paymentData,
        summary
    ] = await Promise.all([

        vendorAPI.getAll(),

        paymentAPI.getAll(),

        budgetAPI.getSummary()
    ]);

    vendors = vendorData;

    payments = paymentData;

    if (version === searchVersion) {

        const search = $('#vendor-search').value
            .trim()
            .toLowerCase();

        renderVendors(

            vendors.filter(vendor =>

                vendor.service_type
                    .toLowerCase()
                    .includes(search)
            )
        );
    }

    updateVendorOptions();

    renderPayments();

    renderBudget(summary);
}

// Couple Guest Count

async function loadGuestCount() {

    const button = $('#refresh-guests');

    if (busy) return;

    busy = true;

    button.disabled = true;

    $('#guest-count').textContent = '--';

    message($('#guest-message'), 'Loading guest count...');

    try {

        const data = await guestAPI.getConfirmedCount();

        $('#guest-count').textContent =
            data.confirmed_guest_count;

        message(
            $('#guest-message'),
            'Guest count retrieved successfully.',
            'success'
        );

    } catch (error) {

        message(
            $('#guest-message'),
            error.message,
            'error'
        );

    } finally {

        button.disabled = false;

        busy = false;
    }
}

$('#refresh-guests').addEventListener(
    'click',
    loadGuestCount
);

// Load Vendor Dashboard

async function loadVendorPortal() {

    const [vendorData, paymentData] = await Promise.all([

        vendorPortalAPI.getAssignedVendors(),

        vendorPortalAPI.getPayments()
    ]);

    assignedVendors = vendorData;

    renderAssignedVendors();

    renderVendorPayments(paymentData);

    updateVendorWeddingOptions();
}

// Render Assigned Services

function renderAssignedVendors() {

    const list = $('#assigned-vendor-list');

    list.replaceChildren();

    assignedVendors.forEach(vendor => {

        const row = document.createElement('tr');

        appendCells(row, [

            vendor.vendor_name,

            vendor.wedding_id,

            vendor.service_type,

            formatMoney(vendor.contract_total)
        ]);

        list.appendChild(row);
    });
}

// Render Vendor Payments

function renderVendorPayments(data) {

    const list = $('#vendor-payment-list');

    list.replaceChildren();

    data.forEach(payment => {

        const row = document.createElement('tr');

        appendCells(row, [

            payment.vendor_name,

            payment.wedding_id,

            formatMoney(payment.payment_amount),

            String(payment.payment_due_date).slice(0, 10),

            payment.payment_status
        ]);

        row.children[4].className =
            payment.payment_status.toLowerCase();

        const actions = document.createElement('td');

        if (payment.payment_status === 'Paid') {

            actions.appendChild(

                actionButton('Confirm Payment', () =>

                    confirmVendorPayment(payment.payment_id)
                )
            );
        }

        row.appendChild(actions);

        list.appendChild(row);
    });
}

// Confirm Vendor Payment

async function confirmVendorPayment(id) {

    if (
        busy ||
        !confirm('Do you confirm receiving this payment?')
    ) {
        return;
    }

    busy = true;

    let saved = false;

    try {

        await vendorPortalAPI.confirmPayment(id);

        saved = true;

        const data = await vendorPortalAPI.getPayments();

        renderVendorPayments(data);

        message(
            $('#vendor-payment-message'),
            'Payment confirmed successfully.',
            'success'
        );

    } catch (error) {

        message(
            $('#vendor-payment-message'),

            saved
                ? 'Payment confirmed, but refresh failed.'
                : error.message,

            'error'
        );

    } finally {

        busy = false;
    }
}

// Refresh Vendor Payments

$('#refresh-vendor-payments').addEventListener(
    'click',
    async () => {

        if (busy) return;

        busy = true;

        try {

            const data =
                await vendorPortalAPI.getPayments();

            renderVendorPayments(data);

            message(
                $('#vendor-payment-message'),
                'Payments refreshed.',
                'success'
            );

        } catch (error) {

            message(
                $('#vendor-payment-message'),
                error.message,
                'error'
            );

        } finally {

            busy = false;
        }
    }
);

// Vendor Wedding Dropdown

function updateVendorWeddingOptions() {

    const select = $('#vendor-wedding-select');

    select.replaceChildren(
        new Option('Select Wedding', '')
    );

    const weddingIds = [

        ...new Set(
            assignedVendors.map(vendor => vendor.wedding_id)
        )
    ];

    weddingIds.forEach(id => {

        select.add(
            new Option(`Wedding ${id}`, id)
        );
    });

    if (weddingIds.length === 1) {

        select.value = weddingIds[0];
    }
}

$('#vendor-wedding-select').addEventListener(
    'change',
    () => {

        $('#vendor-guest-count').textContent = '--';

        message($('#vendor-guest-message'), '');
    }
);

// Vendor Guest Count

$('#vendor-refresh-guests').addEventListener(
    'click',
    async () => {

        if (busy) return;

        const weddingId = Number(
            $('#vendor-wedding-select').value
        );

        if (!weddingId) {

            return message(
                $('#vendor-guest-message'),
                'Select a wedding first.',
                'error'
            );
        }

        busy = true;

        const button = $('#vendor-refresh-guests');

        const select = $('#vendor-wedding-select');

        button.disabled = true;

        select.disabled = true;

        $('#vendor-guest-count').textContent = '--';

        message(
            $('#vendor-guest-message'),
            'Loading guest count...'
        );

        try {

            const data =
                await vendorPortalAPI.getConfirmedGuestCount(
                    weddingId
                );

            $('#vendor-guest-count').textContent =
                data.confirmed_guest_count;

            message(
                $('#vendor-guest-message'),
                'Guest count retrieved successfully.',
                'success'
            );

        } catch (error) {

            message(
                $('#vendor-guest-message'),
                error.message,
                'error'
            );

        } finally {

            button.disabled = false;

            select.disabled = false;

            busy = false;
        }
    }
);