// Get HTML elements
const guestForm = document.getElementById('guest-form');
const guestsContainer = document.getElementById('guests-container');
const searchInput = document.getElementById('search-input');
const formMessage = document.getElementById('form-message');

// Store guests returned from the API
let guests = [];

// Reusable API request function
async function apiRequest(url, options = {}) {
    const response = await fetch(url, options);

    const contentType = response.headers.get('content-type') || '';
    let body = null;

    if (contentType.includes('application/json')) {
        body = await response.json();
    }

    if (!response.ok) {
        const message =
            body?.error?.message || `Request failed (${response.status})`;

        throw new Error(message);
    }

    return body;
}

// Display guests

function renderGuests(guestList) {
    guestsContainer.innerHTML = '';

    if (guestList.length === 0) {
        guestsContainer.textContent = 'No guests found.';
        return;
    }

    guestList.forEach(guest => {
        const card = document.createElement('div');
        card.className = 'guest-card';

        const name = document.createElement('h3');
        name.textContent = guest.name;

        const email = document.createElement('p');
        email.textContent = `Email: ${guest.email}`;

        const phone = document.createElement('p');
        phone.textContent = `Phone: ${guest.phone}`;

        const status = document.createElement('p');

const deadlinePassed = new Date('2026-11-24') < new Date();

if (guest.rsvpStatus === 'Pending' && deadlinePassed) {
    status.textContent = 'RSVP: Pending (Overdue)';
} else {
    status.textContent = `RSVP: ${guest.rsvpStatus}`;
}

        // Edit Guest button
        const editButton = document.createElement('button');
        editButton.textContent = 'Edit';

        editButton.addEventListener('click', async function () {
            const newName = prompt('Enter new name:', guest.name);

            if (newName === null || !newName.trim()) {
                return;
            }

            const newEmail = prompt('Enter new email:', guest.email);

            if (newEmail === null || !newEmail.trim()) {
                return;
            }

            const newPhone = prompt('Enter new phone:', guest.phone);

            if (newPhone === null || !newPhone.trim()) {
                return;
            }

            try {
                await apiRequest(
                    `${API_BASE_URL}/${guest.guestId}`,
                    {
                        method: 'PATCH',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            name: newName.trim(),
                            email: newEmail.trim(),
                            phone: newPhone.trim()
                        })
                    }
                );

                formMessage.textContent = 'Guest updated successfully!';
                await loadGuests();

            } catch (error) {
                formMessage.textContent = error.message;
            }
        });

        // Delete Guest button
        const deleteButton = document.createElement('button');
        deleteButton.textContent = 'Delete';

        deleteButton.addEventListener('click', async function () {
            const confirmed = confirm(
                `Are you sure you want to delete ${guest.name}?`
            );

            if (!confirmed) {
                return;
            }

            try {
                await apiRequest(
                    `${API_BASE_URL}/${guest.guestId}`,
                    { method: 'DELETE' }
                );

                formMessage.textContent = 'Guest deleted successfully!';
                await loadGuests();

            } catch (error) {
                formMessage.textContent = error.message;
            }
        });

                // Confirm RSVP button
        const confirmButton = document.createElement('button');
        confirmButton.textContent = 'Confirm';

        confirmButton.addEventListener('click', async function () {
            try {
                await apiRequest(
                    `${API_BASE_URL}/invitations/${guest.invitationToken}`,
                    {
                        method: 'PATCH',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            rsvpStatus: 'Confirmed'
                        })
                    }
                );

                formMessage.textContent = 'RSVP confirmed successfully!';
                await loadGuests();

            } catch (error) {
                formMessage.textContent = error.message;
            }
        });

        // Decline RSVP button
        const declineButton = document.createElement('button');
        declineButton.textContent = 'Decline';

        declineButton.addEventListener('click', async function () {
            try {
                await apiRequest(
                    `${API_BASE_URL}/invitations/${guest.invitationToken}`,
                    {
                        method: 'PATCH',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            rsvpStatus: 'Declined'
                        })
                    }
                );

                formMessage.textContent = 'RSVP declined successfully!';
                await loadGuests();

            } catch (error) {
                formMessage.textContent = error.message;
            }
        });


                card.append(
            name, email, phone, status,
            editButton, deleteButton,
            confirmButton, declineButton
        );
        guestsContainer.appendChild(card);
    });
}

// Update dashboard statistics
function updateStatistics(summary) {
    document.getElementById('total-guests').textContent =
        summary.totalGuests;

    document.getElementById('confirmed-guests').textContent =
        summary.confirmed;

    document.getElementById('declined-guests').textContent =
        summary.declined;

    document.getElementById('pending-guests').textContent =
        summary.pending;
}


// Load guests from the API
async function loadGuests() {
    try {
        const weddingId = document.getElementById('weddingId').value.trim() || '1';

        if (!weddingId) {
            guestsContainer.textContent = 'Enter a Wedding ID to view guests.';
            return;
        }

        const data = await apiRequest(
            `${API_BASE_URL}?weddingId=${encodeURIComponent(weddingId)}&rsvpDeadline=2026-11-24`
        );

        guests = data.guests;

        renderGuests(guests);
        updateStatistics(data.summary);

    } catch (error) {
        guestsContainer.textContent = error.message;
    }
}

// Add a new guest
guestForm.addEventListener('submit', async function (event) {
    event.preventDefault();

    const guestData = {
        weddingId: document.getElementById('weddingId').value.trim(),
        name: document.getElementById('name').value.trim(),
        email: document.getElementById('email').value.trim(),
        phone: document.getElementById('phone').value.trim()
    };

    try {
        await apiRequest(API_BASE_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(guestData)
        });

        formMessage.textContent = 'Guest added successfully!';
        guestForm.reset();

        document.getElementById('weddingId').value =
            guestData.weddingId;

        await loadGuests();

    } catch (error) {
        formMessage.textContent = error.message;
    }
});

// Search guests by name or email
searchInput.addEventListener('input', function () {
    const searchValue = searchInput.value.toLowerCase();

    const filteredGuests = guests.filter(guest =>
        guest.name.toLowerCase().includes(searchValue) ||
        guest.email.toLowerCase().includes(searchValue)
    );

    renderGuests(filteredGuests);
});

// Load guests automatically when the page opens
loadGuests();