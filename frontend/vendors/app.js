
// In-memory data model

let totalBudget = 0;

const vendors = [];
const payments = [];

// DOM elements

const budgetForm = document.querySelector('#budget-form');
const budgetInput = document.querySelector('#total-budget');

const budgetTotal = document.querySelector('#budget-total');
const budgetCommitted = document.querySelector('#budget-committed');
const budgetPaid = document.querySelector('#budget-paid');
const budgetRemaining = document.querySelector('#budget-remaining');
const budgetProgress = document.querySelector('#budget-progress');
const budgetPercentage = document.querySelector('#budget-percentage');
const budgetWarning = document.querySelector('#budget-warning');

// Format money

function formatMoney(amount) {
    return amount.toFixed(2) + ' EGP';
}

// Render budget information

function renderBudget() {

    const committed = vendors.reduce((sum, vendor) => {
        return sum + vendor.contract_total;
    }, 0);

    const paid = payments
        .filter(payment =>
            payment.payment_status === 'Paid' ||
            payment.payment_status === 'Confirmed'
        )
        .reduce((sum, payment) => {
            return sum + payment.payment_amount;
        }, 0);

    const remaining = totalBudget - committed;

    const percentage = totalBudget > 0
        ? (committed / totalBudget) * 100
        : 0;

    budgetTotal.textContent = formatMoney(totalBudget);
    budgetCommitted.textContent = formatMoney(committed);
    budgetPaid.textContent = formatMoney(paid);
    budgetRemaining.textContent = formatMoney(remaining);

    budgetProgress.value = Math.min(percentage, 100);

    budgetPercentage.textContent =
        percentage.toFixed(2) + '% used';

    if (committed > totalBudget) {

        budgetWarning.textContent = 'Warning: Budget exceeded!';
        budgetWarning.className = 'error';

    } else if (percentage >= 80) {

        budgetWarning.textContent =
            'Warning: You have used 80% or more of your budget.';

        budgetWarning.className = 'warning';

    } else {

        budgetWarning.textContent = '';
        budgetWarning.className = '';
    }
}

// Set wedding budget

budgetForm.addEventListener('submit', (event) => {

    event.preventDefault();

    const amount = Number(budgetInput.value);

    if (!Number.isFinite(amount) || amount <= 0) {

        budgetWarning.textContent = 'Enter a valid budget.';
        budgetWarning.className = 'error';

        return;
    }

    const committed = vendors.reduce((sum, vendor) => {
        return sum + vendor.contract_total;
    }, 0);

    if (amount < committed) {

        budgetWarning.textContent =
            'Budget cannot be less than committed contracts.';

        budgetWarning.className = 'error';

        return;
    }

    totalBudget = amount;

    renderBudget();

    budgetForm.reset();
});

// Initial rendering

renderBudget();

// Initial rendering

renderBudget();

// Vendor DOM elements

const vendorForm = document.querySelector('#vendor-form');
const vendorName = document.querySelector('#vendor-name');
const serviceType = document.querySelector('#service-type');
const vendorEmail = document.querySelector('#vendor-email');
const vendorPhone = document.querySelector('#vendor-phone');
const contractTotal = document.querySelector('#contract-total');
const vendorSearch = document.querySelector('#vendor-search');
const vendorsList = document.querySelector('#vendor-list');
const vendorMessage = document.querySelector('#vendor-message');
const paymentVendor = document.querySelector('#payment-vendor');

let nextVendorId = 1;
let editingVendorId = null;


// Render vendors

function renderVendors() {

    const search = vendorSearch.value.trim().toLowerCase();

    const filteredVendors = vendors.filter(vendor =>
        vendor.service_type.toLowerCase().includes(search)
    );

    vendorsList.innerHTML = '';

    filteredVendors.forEach(vendor => {

        const row = document.createElement('tr');

        const values = [
            vendor.vendor_name,
            vendor.service_type,
            vendor.vendor_email,
            vendor.vendor_phone_number,
            formatMoney(vendor.contract_total)
        ];

        values.forEach(value => {

            const cell = document.createElement('td');
            cell.textContent = value;
            row.appendChild(cell);

        });

        const actions = document.createElement('td');

        const editButton = document.createElement('button');

        editButton.textContent = 'Edit';
        editButton.type = 'button';

        editButton.addEventListener('click', () => {
            editVendor(vendor.vendor_id);
        });

        actions.appendChild(editButton);
        const deleteButton = document.createElement('button');

        deleteButton.textContent = 'Delete';
        deleteButton.type = 'button';

        deleteButton.addEventListener('click', () => {
            deleteVendor(vendor.vendor_id);
        });

        actions.appendChild(deleteButton);

        row.appendChild(actions);

        vendorsList.appendChild(row);
    });

    updateVendorOptions();
}


// Update payment vendor dropdown

function updateVendorOptions() {

    const selectedVendor = paymentVendor.value;

    paymentVendor.innerHTML =
        '<option value="">Select Vendor</option>';

    vendors.forEach(vendor => {

        const option = document.createElement('option');

        option.value = vendor.vendor_id;
        option.textContent = vendor.vendor_name;

        paymentVendor.appendChild(option);
    });

    paymentVendor.value = selectedVendor;

    if (paymentVendor.selectedIndex === -1) {
        paymentVendor.selectedIndex = 0;
    }
}


// Add vendor

vendorForm.addEventListener('submit', (event) => {

    event.preventDefault();

    const name = vendorName.value.trim();
    const type = serviceType.value;
    const email = vendorEmail.value.trim();
    const phone = vendorPhone.value.trim();
    const amount = Number(contractTotal.value);

    // Input validation

    if (!name || !type || !email ||
        !Number.isFinite(amount) || amount <= 0) {

        vendorMessage.textContent =
            'Please enter valid vendor details.';

        vendorMessage.className = 'error';

        return;
    }

    // Check if budget is set

    if (totalBudget <= 0) {

        vendorMessage.textContent =
            'Please set the wedding budget first.';

        vendorMessage.className = 'error';

        return;
    }

    // Calculate committed budget

    const committed = vendors
        .filter(vendor => vendor.vendor_id !== editingVendorId)
        .reduce((sum, vendor) => {
            return sum + vendor.contract_total;
        }, 0);

    // Budget validation

    if (Math.round((committed + amount) * 100) >
        Math.round(totalBudget * 100)) {

        vendorMessage.textContent =
            'Contract total exceeds the remaining budget.';

        vendorMessage.className = 'error';

        return;
    }


    // Add or update vendor

    if (editingVendorId !== null) {

        const vendor = vendors.find(
            vendor => vendor.vendor_id === editingVendorId
        );

        if (!vendor) {
            return;
        }

        const scheduledPayments = payments
            .filter(payment => payment.vendor_id === editingVendorId)
            .reduce((sum, payment) => {
                return sum + payment.payment_amount;
            }, 0);

        if (Math.round(amount * 100) <
            Math.round(scheduledPayments * 100)) {

            vendorMessage.textContent =
                'Contract total cannot be less than scheduled payments.';

            vendorMessage.className = 'error';

            return;
        }

        vendor.vendor_name = name;
        vendor.service_type = type;
        vendor.vendor_email = email;
        vendor.vendor_phone_number = phone;
        vendor.contract_total = amount;

        vendorMessage.textContent =
            'Vendor updated successfully.';

    } else {

        const vendor = {
            vendor_id: nextVendorId++,
            vendor_name: name,
            service_type: type,
            vendor_email: email,
            vendor_phone_number: phone,
            contract_total: amount
        };

        vendors.push(vendor);

        vendorMessage.textContent =
            'Vendor added successfully.';
    }

    vendorMessage.className = 'success';

    editingVendorId = null;

    vendorForm.querySelector('button[type="submit"]')
        .textContent = 'Add Vendor';

    vendorForm.reset();

    renderVendors();
    renderBudget();

});

// Initial rendering

renderVendors();

// Search vendors by service type

vendorSearch.addEventListener('input', renderVendors);

function editVendor(vendorId) {

    const vendor = vendors.find(
        vendor => vendor.vendor_id === vendorId
    );

    if (!vendor) {
        return;
    }

    editingVendorId = vendorId;

    vendorName.value = vendor.vendor_name;
    serviceType.value = vendor.service_type;
    vendorEmail.value = vendor.vendor_email;
    vendorPhone.value = vendor.vendor_phone_number;
    contractTotal.value = vendor.contract_total;

    vendorForm.querySelector('button[type="submit"]')
        .textContent = 'Update Vendor';

    vendorMessage.textContent = 'Editing vendor details.';
    vendorMessage.className = '';

    vendorForm.scrollIntoView({ behavior: 'smooth' });
}


// Delete vendor

function deleteVendor(vendorId) {

    const vendorIndex = vendors.findIndex(
        vendor => vendor.vendor_id === vendorId
    );

    if (vendorIndex === -1) {
        return;
    }

    // Check linked payments

    const hasPayments = payments.some(
        payment => payment.vendor_id === vendorId
    );

    if (hasPayments) {

        vendorMessage.textContent =
            'Cannot delete a vendor with linked payments.';

        vendorMessage.className = 'error';

        return;
    }

    // Confirm deletion

    const confirmed = confirm(
        'Are you sure you want to delete this vendor?'
    );

    if (!confirmed) {
        return;
    }

    // Remove vendor

    vendors.splice(vendorIndex, 1);

    if (editingVendorId === vendorId) {

        editingVendorId = null;

        vendorForm.reset();

        vendorForm.querySelector('button[type="submit"]')
            .textContent = 'Add Vendor';
    }

    renderVendors();
    renderBudget();

    vendorMessage.textContent =
        'Vendor deleted successfully.';

    vendorMessage.className = 'success';
}

// Payment DOM elements

const paymentForm = document.querySelector('#payment-form');
const paymentAmount = document.querySelector('#payment-amount');
const paymentDueDate = document.querySelector('#due-date');
const paymentMessage = document.querySelector('#payment-message');
const paymentsList = document.querySelector('#payment-list');

let nextPaymentId = 1;


// Render payments

function renderPayments() {
    checkOverduePayments();

    paymentsList.innerHTML = '';

    payments.forEach(payment => {

        const vendor = vendors.find(
            vendor => vendor.vendor_id === payment.vendor_id
        );

        const row = document.createElement('tr');

        const values = [
            vendor ? vendor.vendor_name : 'Unknown Vendor',
            formatMoney(payment.payment_amount),
            payment.payment_due_date,
            payment.payment_status
        ];

        values.forEach(value => {

            const cell = document.createElement('td');

            cell.textContent = value;

            row.appendChild(cell);
        });

        const actions = document.createElement('td');
        if (payment.payment_status === 'Pending' ||
            payment.payment_status === 'Overdue') {

            const paidButton = document.createElement('button');

            paidButton.textContent = 'Mark as Paid';
            paidButton.type = 'button';

            paidButton.addEventListener('click', () => {
                markPaymentAsPaid(payment.payment_id);
            });

            actions.appendChild(paidButton);
        }

        if (payment.payment_status === 'Paid') {

            const confirmButton = document.createElement('button');

            confirmButton.textContent = 'Confirm Payment';
            confirmButton.type = 'button';

            confirmButton.addEventListener('click', () => {
                confirmPayment(payment.payment_id);
            });

            actions.appendChild(confirmButton);
        }

        row.appendChild(actions);

        paymentsList.appendChild(row);
    });
}


// Schedule payment

paymentForm.addEventListener('submit', (event) => {

    event.preventDefault();

    const vendorId = Number(paymentVendor.value);
    const amount = Number(paymentAmount.value);
    const dueDate = paymentDueDate.value;

    // Input validation

    if (!vendorId || !Number.isFinite(amount) ||
        amount <= 0 || !dueDate) {

        paymentMessage.textContent =
            'Please enter valid payment details.';

        paymentMessage.className = 'error';

        return;
    }

    // Find selected vendor

    const vendor = vendors.find(
        vendor => vendor.vendor_id === vendorId
    );

    if (!vendor) {

        paymentMessage.textContent =
            'Please select a valid vendor.';

        paymentMessage.className = 'error';

        return;
    }

    // Calculate existing scheduled payments

    const scheduledPayments = payments
        .filter(payment => payment.vendor_id === vendorId)
        .reduce((sum, payment) => {
            return sum + payment.payment_amount;
        }, 0);

    // Contract validation

    if (Math.round((scheduledPayments + amount) * 100) >
        Math.round(vendor.contract_total * 100)) {

        paymentMessage.textContent =
            'Total payments cannot exceed the vendor contract amount.';

        paymentMessage.className = 'error';

        return;
    }

    // Create payment object

    const payment = {
        payment_id: nextPaymentId++,
        vendor_id: vendorId,
        payment_amount: amount,
        payment_due_date: dueDate,
        payment_status: 'Pending'
    };

    payments.push(payment);

    renderPayments();
    renderBudget();

    paymentMessage.textContent =
        'Payment scheduled successfully.';

    paymentMessage.className = 'success';

    paymentForm.reset();
});

renderPayments();


// Mark payment as paid

function markPaymentAsPaid(paymentId) {

    const payment = payments.find(
        payment => payment.payment_id === paymentId
    );

    if (!payment) {
        return;
    }

    if (payment.payment_status !== 'Pending' &&
        payment.payment_status !== 'Overdue') {
        return;
    }

    const confirmed = confirm(
        'Are you sure you want to mark this payment as paid?'
    );

    if (!confirmed) {
        return;
    }

    payment.payment_status = 'Paid';

    renderPayments();
    renderBudget();

    paymentMessage.textContent =
        'Payment marked as paid successfully.';

    paymentMessage.className = 'success';
}


// Confirm payment

function confirmPayment(paymentId) {

    const payment = payments.find(
        payment => payment.payment_id === paymentId
    );

    if (!payment) {
        return;
    }

    // Validate payment status

    if (payment.payment_status !== 'Paid') {
        return;
    }

    const confirmed = confirm(
        'Do you confirm receiving this payment?'
    );

    if (!confirmed) {
        return;
    }

    payment.payment_status = 'Confirmed';

    renderPayments();
    renderBudget();

    paymentMessage.textContent =
        'Payment confirmed successfully.';

    paymentMessage.className = 'success';
}


// Detect overdue payments

function checkOverduePayments() {

    const today = new Date();

    today.setHours(0, 0, 0, 0);

    payments.forEach(payment => {

        const dueDate = new Date(
            payment.payment_due_date + 'T00:00:00'
        );

        if (payment.payment_status === 'Pending' &&
            dueDate < today) {

            payment.payment_status = 'Overdue';
        }
    });
}

// Automatically check payments every minute

setInterval(renderPayments, 60000);

// Guest service DOM elements

const guestCount = document.querySelector('#guest-count');

const refreshGuests = document.querySelector('#refresh-guests');

const guestMessage = document.querySelector('#guest-message');


// Prepare guest service integration

function loadGuestCount() {

    guestCount.textContent = '--';

    guestMessage.textContent =
        'Guest Service API is not connected yet.';

    guestMessage.className = '';
}

// Refresh guest count

refreshGuests.addEventListener('click', loadGuestCount);

// Initial guest count

guestCount.textContent = '--';
