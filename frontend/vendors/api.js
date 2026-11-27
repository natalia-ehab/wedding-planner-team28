const API_BASE_URL = 'http://localhost:4566/restapis/8d702ed4f6/dev/_user_request_/api';
const AUTH_BASE_URL = 'http://localhost:4566/restapis/8d702ed4f6/dev/_user_request_/auth';

// Authentication state
let authToken = null;
let currentUser = null;
let currentWeddingId = null;

// Login
async function login(email, password) {

    const response = await fetch(`${AUTH_BASE_URL}/login`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
    });

    const data = await response.json();

    if (!response.ok) {
        throw new Error(
            data.message || data.error || 'Login failed.'
        );
    }

    authToken = data.token;
    currentUser = data.user;

    return data.user;
}

// Logout
function logout() {
    authToken = null;
    currentUser = null;
    currentWeddingId = null;
}

// Set selected wedding
function setWeddingId(id) {
    currentWeddingId = Number(id);
}

// Authenticated API requests
async function apiRequest(
    endpoint,
    method = 'GET',
    data = null
) {

    if (!authToken) {
        throw new Error('Please log in first.');
    }

    const url = new URL(`${API_BASE_URL}${endpoint}`);

    if (
        currentUser?.role === 'couple' &&
        currentWeddingId
    ) {
        url.searchParams.set(
            'weddingId',
            currentWeddingId
        );
    }

    const options = {
        method,
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`
        }
    };

    if (data !== null) {
        options.body = JSON.stringify(data);
    }

    const response = await fetch(url, options);

    if (!response.ok) {

        const error = await response.json()
            .catch(() => ({}));

        throw new Error(
            error.message ||
            error.error ||
            `Request failed: ${response.status}`
        );
    }

    if (response.status === 204) {
        return null;
    }

    return response.json();
}

// Vendor Management API
const vendorAPI = {

    getAll: (serviceType = '') =>
        apiRequest(
            serviceType
                ? `/vendors?service_type=${encodeURIComponent(serviceType)}`
                : '/vendors'
        ),

    getById: (id) =>
        apiRequest(`/vendors/${id}`),

    create: (data) =>
        apiRequest('/vendors', 'POST', data),

    update: (id, data) =>
        apiRequest(`/vendors/${id}`, 'PUT', data),

    remove: (id) =>
        apiRequest(`/vendors/${id}`, 'DELETE')
};

// Budget Management API
const budgetAPI = {

    get: () =>
        apiRequest('/budget'),

    update: (amount) =>
        apiRequest('/budget', 'PUT', {
            total_amount: amount
        }),

    getSummary: () =>
        apiRequest('/budget/summary')
};

// Payment Management API
const paymentAPI = {

    getAll: () =>
        apiRequest('/payments'),

    getById: (id) =>
        apiRequest(`/payments/${id}`),

    create: (data) =>
        apiRequest('/payments', 'POST', data),

    updateStatus: (id, status) =>
        apiRequest(`/payments/${id}/status`, 'PATCH', {
            payment_status: status
        }),

    retryTask: (id) =>
        apiRequest(`/payments/${id}/retry-task`, 'POST')
};

// Guest Service Integration
const guestAPI = {

    getConfirmedCount: () =>
        apiRequest('/guests/confirmed-count')
};

// Vendor Portal API
const vendorPortalAPI = {

    getAssignedVendors: () =>
        apiRequest('/vendor-portal/vendors'),

    getPayments: () =>
        apiRequest('/vendor-portal/payments'),

    confirmPayment: (id) =>
        apiRequest(
            `/vendor-portal/payments/${id}/confirm`,
            'PATCH'
        ),

    getConfirmedGuestCount: (weddingId) =>
        apiRequest(
            `/vendor-portal/guests/confirmed-count?weddingId=${encodeURIComponent(weddingId)}`
        )
};
