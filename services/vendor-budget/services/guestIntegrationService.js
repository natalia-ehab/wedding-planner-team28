require('dotenv').config();

async function getConfirmedGuestCount(weddingId) {

    const baseUrl = process.env.GUEST_SERVICE_URL;

    if (!baseUrl) {
        throw new Error('GUEST_SERVICE_URL is missing.');
    }

    const url = new URL(
        `${baseUrl.replace(/\/$/, '')}/api/guests`
    );

    url.searchParams.set('weddingId', weddingId);

    const response = await fetch(url, {
        method: 'GET',
        headers: {
            'Accept': 'application/json'
        },
        signal: AbortSignal.timeout(5000)
    });

    if (!response.ok) {
        throw new Error(
            `Guest Service returned HTTP ${response.status}`
        );
    }

    const data = await response.json();

    const confirmed = data.summary?.confirmed;

    if (!Number.isInteger(confirmed) || confirmed < 0) {
        throw new Error(
            'Invalid response from Guest Service.'
        );
    }

    return {
        wedding_id: weddingId,
        confirmed_guest_count: confirmed
    };
}

module.exports = {
    getConfirmedGuestCount
};