
const fs = require('fs/promises');
const path = require('path');
const { randomUUID } = require('crypto');

const dataPath = path.join(__dirname, '../data/guests.json');

async function readGuests() {
    const data = await fs.readFile(dataPath, 'utf8');
    return JSON.parse(data);
}

async function writeGuests(guests) {
    await fs.writeFile(dataPath, JSON.stringify(guests, null, 2));
}

// Add a new guest
async function createGuest(guestData) {
    const guests = await readGuests();

    const existingGuest = guests.find(
        guest =>
            guest.weddingId === guestData.weddingId &&
            guest.email === guestData.email
    );

    if (existingGuest) {
        throw new Error('This email is already registered for this wedding.');
    }

    const newGuest = {
        guestId: randomUUID(),
        weddingId: guestData.weddingId,
        name: guestData.name,
        email: guestData.email,
        phone: guestData.phone,
        invitationToken: randomUUID(),
        rsvpStatus: 'Pending',
        responseDate: null
    };

    guests.push(newGuest);
    await writeGuests(guests);

    return newGuest;
}

// Get all guests for a wedding
async function getGuestsByWedding(weddingId) {
    const guests = await readGuests();

    return guests.filter(guest => guest.weddingId === weddingId);
}


// Get RSVP summary for a wedding
async function getRSVPSummary(weddingId, rsvpDeadline) {
    const guests = await getGuestsByWedding(weddingId);

    const isOverdue = rsvpDeadline &&
        new Date() > new Date(rsvpDeadline);

    const overdueGuests = isOverdue
        ? guests.filter(guest => guest.rsvpStatus === 'Pending')
        : [];

    return {
        totalGuests: guests.length,
        confirmed: guests.filter(
            guest => guest.rsvpStatus === 'Confirmed'
        ).length,
        declined: guests.filter(
            guest => guest.rsvpStatus === 'Declined'
        ).length,
        pending: guests.filter(
            guest => guest.rsvpStatus === 'Pending'
        ).length,
        overdue: overdueGuests.length,
        overdueGuests
    };
} 


async function updateGuestRSVP(token, rsvpStatus, rsvpDeadline) {
    const guests = await readGuests();

    const guest = guests.find(
        item => item.invitationToken === token
    );

    if (!guest) {
        throw new Error('Invitation token not found.');
    }

    if (!['Confirmed', 'Declined'].includes(rsvpStatus)) {
        throw new Error('RSVP status must be Confirmed or Declined.');
    }

    if (
    !rsvpDeadline ||
    Number.isNaN(new Date(rsvpDeadline).getTime())
) {
    throw new Error('A valid RSVP deadline is required.');
}

if (new Date() > new Date(rsvpDeadline)) {
    throw new Error('The RSVP deadline has passed.');
}

    guest.rsvpStatus = rsvpStatus;
    guest.responseDate = new Date().toISOString();

    await writeGuests(guests);

    return guest;
}


// Update guest information
async function updateGuest(guestId, updatedData) {
    const guests = await readGuests();

    const guest = guests.find(item => item.guestId === guestId);

    if (!guest) {
        throw new Error('Guest not found.');
    }

    if (updatedData.email) {
        const emailExists = guests.find(
            item =>
                item.weddingId === guest.weddingId &&
                item.email === updatedData.email &&
                item.guestId !== guestId
        );

        if (emailExists) {
            throw new Error('Email already exists in this wedding.');
        }
    }

    if (updatedData.name !== undefined) {
        guest.name = updatedData.name;
    }

    if (updatedData.email !== undefined) {
        guest.email = updatedData.email;
    }

    if (updatedData.phone !== undefined) {
        guest.phone = updatedData.phone;
    }

    await writeGuests(guests);

    return guest;
}

// Delete a guest
async function deleteGuest(guestId) {
    const guests = await readGuests();

    const guestIndex = guests.findIndex(
        item => item.guestId === guestId
    );

    if (guestIndex === -1) {
        throw new Error('Guest not found.');
    }

    const deletedGuest = guests.splice(guestIndex, 1)[0];

    await writeGuests(guests);

    return deletedGuest;
}

// Search guests by name or email
async function searchGuests(weddingId, searchValue) {
    const guests = await getGuestsByWedding(weddingId);

    const search = searchValue.toLowerCase();

    return guests.filter(guest =>
        guest.name.toLowerCase().includes(search) ||
        guest.email.toLowerCase().includes(search)
    );
}

module.exports = {
    createGuest,
    getGuestsByWedding,
    getRSVPSummary,
    updateGuestRSVP,
    updateGuest,
    deleteGuest,
    searchGuests

};
