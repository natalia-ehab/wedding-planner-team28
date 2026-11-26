require('dotenv').config();

async function sendEmail(to, subject, message, idempotencyKey) {
    if (!process.env.RESEND_API_KEY) {
        throw new Error('RESEND_API_KEY is missing.');
    }

    const response = await fetch(
        'https://api.resend.com/emails',
        {
            method: 'POST',
            headers: {
                'Authorization':
                    `Bearer ${process.env.RESEND_API_KEY}`,
                'Content-Type': 'application/json',
                ...(idempotencyKey
                    ? { 'Idempotency-Key': idempotencyKey }
                    : {})
            },
            body: JSON.stringify({
                from: process.env.EMAIL_FROM,
                to: [to],
                subject: subject,
                text: message
            })
        }
    );

    const result = await response.json();

    if (!response.ok) {
        throw new Error(
            result.message || 'Email sending failed.'
        );
    }

    return result;
}

module.exports = { sendEmail };