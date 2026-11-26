// API-backed frontend state

let vendors = [];
let payments = [];
let editingVendorId = null;

const $ = selector => document.querySelector(selector);

// DOM elements

const budgetForm = $('#budget-form');
const vendorForm = $('#vendor-form');
const paymentForm = $('#payment-form');
const vendorSearch = $('#vendor-search');
const paymentVendor = $('#payment-vendor');
const vendorMessage = $('#vendor-message');
const paymentMessage = $('#payment-message');
const budgetWarning = $('#budget-warning');

// Format money

function formatMoney(amount) {
    return Number(amount).toFixed(2) + ' EGP';
}

// Display messages

function message(element, text, type = '') {
    element.textContent = text;
    element.className = type;
}

// Render budget information

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
            budgetWarning,
            'Warning: Budget exceeded!',
            'error'
        );

    } else if (
        summary.budget_warning || percentage >= 80
    ) {

        message(
            budgetWarning,
            'Warning: You have used 80% or more of your budget.',
            'warning'
        );

    } else {

        message(budgetWarning, '');
    }
}

// Create table cells

function appendCells(row, values) {

    values.forEach(value => {

        const cell = document.createElement('td');

        cell.textContent = value ?? '';

        row.appendChild(cell);
    });
}

// Create action buttons

function actionButton(label, handler) {

    const button = document.createElement('button');

    button.type = 'button';

    button.textContent = label;

    button.addEventListener('click', handler);

    return button;
}

// Render vendors

function renderVendors() {

    const search =
        vendorSearch.value.trim().toLowerCase();

    const list = $('#vendor-list');

    list.replaceChildren();

    const filteredVendors = vendors.filter(vendor =>
        vendor.service_type.toLowerCase().includes(search)
    );

    filteredVendors.forEach(vendor => {

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

// Update payment vendor dropdown

function updateVendorOptions() {

    const selected = paymentVendor.value;

    paymentVendor.replaceChildren(
        new Option('Select Vendor', '')
    );

    vendors.forEach(vendor => {

        paymentVendor.add(
            new Option(
                vendor.vendor_name,
                vendor.vendor_id
            )
        );
    });

    paymentVendor.value = selected;

    if (paymentVendor.selectedIndex === -1) {
        paymentVendor.selectedIndex = 0;
    }
}

// Render payments

function renderPayments() {

    const list = $('#payment-list');

    list.replaceChildren();

    payments.forEach(payment => {

        const vendor = vendors.find(v =>
            Number(v.vendor_id) ===
            Number(payment.vendor_id)
        );

        const row = document.createElement('tr');

        appendCells(row, [
            vendor?.vendor_name || 'Unknown Vendor',
            formatMoney(payment.payment_amount),
            String(payment.payment_due_date).slice(0, 10),
            payment.payment_status
        ]);

        const actions = document.createElement('td');

        if (
            ['Pending', 'Overdue'].includes(
                payment.payment_status
            )
        ) {

            actions.appendChild(
                actionButton('Mark as Paid', () =>
                    changePaymentStatus(
                        payment.payment_id,
                        'Paid'
                    )
                )
            );

        } else if (
            payment.payment_status === 'Paid'
        ) {

            actions.appendChild(
                actionButton('Confirm Payment', () =>
                    changePaymentStatus(
                        payment.payment_id,
                        'Confirmed'
                    )
                )
            );
        }

        row.appendChild(actions);

        list.appendChild(row);
    });
}

// Load data from backend

async function loadData() {

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

    renderVendors();

    updateVendorOptions();

    renderPayments();

    renderBudget(summary);
}

// Handle API operations

let busy = false;

async function performAction(
    element,
    operation,
    successText,
    afterSuccess
) {

    if (busy) return;

    busy = true;

    let saved = false;

    try {

        await operation();

        saved = true;

        if (afterSuccess) {
            afterSuccess();
        }

        await loadData();

        if (
            element !== budgetWarning ||
            !budgetWarning.textContent
        ) {

            message(
                element,
                successText,
                'success'
            );
        }

    } catch (error) {

        message(
            element,
            saved
                ? 'Saved, but refresh failed. Reload the page: '
                    + error.message
                : error.message,
            'error'
        );

    } finally {

        busy = false;
    }
}

// Set wedding budget

budgetForm.addEventListener('submit', event => {

    event.preventDefault();

    const amount = Number(
        $('#total-budget').value
    );

    if (
        !Number.isFinite(amount) ||
        amount <= 0
    ) {

        return message(
            budgetWarning,
            'Enter a valid budget.',
            'error'
        );
    }

    performAction(

        budgetWarning,

        () => budgetAPI.update(amount),

        'Budget updated successfully.',

        () => budgetForm.reset()
    );
});

// Reset vendor form

function resetVendorForm() {

    editingVendorId = null;

    vendorForm.reset();

    vendorForm.querySelector(
        'button[type="submit"]'
    ).textContent = 'Add Vendor';
}

// Create or update vendor

vendorForm.addEventListener('submit', event => {

    event.preventDefault();

    const data = {

        vendor_name:
            $('#vendor-name').value.trim(),

        service_type:
            $('#service-type').value,

        vendor_email:
            $('#vendor-email').value.trim(),

        vendor_phone_number:
            $('#vendor-phone').value.trim(),

        contract_total:
            Number($('#contract-total').value)
    };

    if (
        !data.vendor_name ||
        !data.service_type ||
        !data.vendor_email ||
        !Number.isFinite(data.contract_total) ||
        data.contract_total <= 0
    ) {

        return message(
            vendorMessage,
            'Please enter valid vendor details.',
            'error'
        );
    }

    const id = editingVendorId;

    performAction(

        vendorMessage,

        () => id === null
            ? vendorAPI.create(data)
            : vendorAPI.update(id, data),

        id === null
            ? 'Vendor added successfully.'
            : 'Vendor updated successfully.',

        resetVendorForm
    );
});

// Edit vendor

function editVendor(id) {

    if (busy) return;

    const vendor = vendors.find(
        v => v.vendor_id === id
    );

    if (!vendor) return;

    editingVendorId = id;

    $('#vendor-name').value =
        vendor.vendor_name;

    $('#service-type').value =
        vendor.service_type;

    $('#vendor-email').value =
        vendor.vendor_email;

    $('#vendor-phone').value =
        vendor.vendor_phone_number || '';

    $('#contract-total').value =
        vendor.contract_total;

    vendorForm.querySelector(
        'button[type="submit"]'
    ).textContent = 'Update Vendor';

    message(
        vendorMessage,
        'Editing vendor details.'
    );

    vendorForm.scrollIntoView({
        behavior: 'smooth'
    });
}

// Delete vendor

function deleteVendor(id) {

    if (
        busy ||
        !confirm(
            'Are you sure you want to delete this vendor?'
        )
    ) {
        return;
    }

    performAction(

        vendorMessage,

        () => vendorAPI.remove(id),

        'Vendor deleted successfully.',

        () => {

            if (editingVendorId === id) {
                resetVendorForm();
            }
        }
    );
}

// Search vendors

vendorSearch.addEventListener(
    'input',
    renderVendors
);

// Schedule payment

paymentForm.addEventListener('submit', event => {

    event.preventDefault();

    const data = {

        vendor_id:
            Number(paymentVendor.value),

        payment_amount:
            Number($('#payment-amount').value),

        payment_due_date:
            $('#due-date').value
    };

    if (
        !data.vendor_id ||
        !Number.isFinite(data.payment_amount) ||
        data.payment_amount <= 0 ||
        !data.payment_due_date
    ) {

        return message(
            paymentMessage,
            'Please enter valid payment details.',
            'error'
        );
    }

    performAction(

        paymentMessage,

        () => paymentAPI.create(data),

        'Payment scheduled successfully.',

        () => paymentForm.reset()
    );
});

// Update payment status

function changePaymentStatus(id, status) {

    const question = status === 'Paid'

        ? 'Are you sure you want to mark this payment as paid?'

        : 'Do you confirm receiving this payment?';

    if (busy || !confirm(question)) {
        return;
    }

    performAction(

        paymentMessage,

        () => paymentAPI.updateStatus(id, status),

        status === 'Paid'

            ? 'Payment marked as paid successfully.'

            : 'Payment confirmed successfully.'
    );
}

// Guest service integration

function loadGuestCount() {

    $('#guest-count').textContent = '--';

    message(
        $('#guest-message'),
        'Guest Service API is not connected yet.'
    );
}

$('#refresh-guests').addEventListener(
    'click',
    loadGuestCount
);

// Initial loading

loadGuestCount();

loadData().catch(error => {

    message(
        budgetWarning,
        'Could not load data: ' + error.message,
        'error'
    );
});