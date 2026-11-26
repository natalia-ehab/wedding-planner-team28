const API_BASE_URL = 'http://localhost:4566/restapis/8d702ed4f6/dev/_user_request_/api';

async function apiRequest(endpoint, method = 'GET', data = null) {
    const options = {
        method: method,
        headers: {
            'Content-Type': 'application/json'
        }
    };

    if (data !== null) {
        options.body = JSON.stringify(data);
    }

    const response = await fetch(
        `${API_BASE_URL}${endpoint}`,
        options
    );

    if (!response.ok) {
        const error = await response.json().catch(() => ({}));

        throw new Error(
            error.error || `Request failed: ${response.status}`
        );
    }

    if (response.status === 204) {
        return null;
    }

    return response.json();
}

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
        })
};