
const { randomUUID } = require('crypto');

const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');

const {
    DynamoDBDocumentClient,
    ScanCommand,
    PutCommand,
    UpdateCommand,
    DeleteCommand
} = require('@aws-sdk/lib-dynamodb');

const TABLE = process.env.DYNAMODB_TABLE;

// Same DynamoDB connection approach used in Lab 7
const db = DynamoDBDocumentClient.from(
    new DynamoDBClient({})
);

// Read all guests
async function readGuests() {
    const result = await db.send(
        new ScanCommand({
            TableName: TABLE
        })
    );

    return result.Items || [];
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
        throw new Error(
            'This email is already registered for this wedding.'
        );
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

    await db.send(
        new PutCommand({
            TableName: TABLE,
            Item: newGuest
        })
    );

    return newGuest;
}

// Get all guests for a wedding
async function getGuestsByWedding(weddingId) {
    const guests = await readGuests();

    return guests.filter(
        guest => guest.weddingId === weddingId
    );
}

// Get one guest by ID
async function getGuestById(guestId) {
    const guests = await readGuests();

    return guests.find(
        guest => guest.guestId === guestId
    );
}

// Get RSVP summary for a wedding
async function getRSVPSummary(weddingId, rsvpDeadline) {
    const guests = await getGuestsByWedding(weddingId);

    const isOverdue =
        rsvpDeadline &&
        new Date() > new Date(rsvpDeadline);

    const overdueGuests = isOverdue
        ? guests.filter(
            guest => guest.rsvpStatus === 'Pending'
        )
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

// Submit RSVP using invitation token
async function updateGuestRSVP(token, rsvpStatus, rsvpDeadline) {
    const guests = await readGuests();

    const guest = guests.find(
        item => item.invitationToken === token
    );

    if (!guest) {
        throw new Error('Invitation token not found.');
    }

    if (!['Confirmed', 'Declined'].includes(rsvpStatus)) {
        throw new Error(
            'RSVP status must be Confirmed or Declined.'
        );
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

    const result = await db.send(
        new UpdateCommand({
            TableName: TABLE,
            Key: {
                guestId: guest.guestId
            },
            UpdateExpression:
                'SET #status = :status, responseDate = :responseDate',
            ExpressionAttributeNames: {
                '#status': 'rsvpStatus'
            },
            ExpressionAttributeValues: {
                ':status': rsvpStatus,
                ':responseDate': new Date().toISOString()
            },
            ReturnValues: 'ALL_NEW'
        })
    );

    return result.Attributes;
}

// Update guest information
async function updateGuest(guestId, updatedData) {
    const guests = await readGuests();

    const guest = guests.find(
        item => item.guestId === guestId
    );

    if (!guest) {
        throw new Error('Guest not found.');
    }

    if (updatedData.email !== undefined) {
        const emailExists = guests.find(
            item =>
                item.weddingId === guest.weddingId &&
                item.email === updatedData.email &&
                item.guestId !== guestId
        );

        if (emailExists) {
            throw new Error(
                'Email already exists in this wedding.'
            );
        }
    }

    const allowedFields = ['name', 'email', 'phone'];

    const fields = allowedFields.filter(
        field => updatedData[field] !== undefined
    );

    if (fields.length === 0) {
        throw new Error('No valid fields to update.');
    }

    const expressionNames = {};
    const expressionValues = {};
    const updates = [];

    fields.forEach((field, index) => {
        const nameKey = `#field${index}`;
        const valueKey = `:value${index}`;

        expressionNames[nameKey] = field;
        expressionValues[valueKey] = updatedData[field];

        updates.push(`${nameKey} = ${valueKey}`);
    });

    try {
        const result = await db.send(
            new UpdateCommand({
                TableName: TABLE,
                Key: { guestId },
                UpdateExpression: `SET ${updates.join(', ')}`,
                ConditionExpression:
                    'attribute_exists(guestId)',
                ExpressionAttributeNames: expressionNames,
                ExpressionAttributeValues: expressionValues,
                ReturnValues: 'ALL_NEW'
            })
        );

        return result.Attributes;

    } catch (error) {
        if (error.name === 'ConditionalCheckFailedException') {
            throw new Error('Guest not found.');
        }

        throw error;
    }
}

// Delete a guest
async function deleteGuest(guestId) {
    try {
        const result = await db.send(
            new DeleteCommand({
                TableName: TABLE,
                Key: { guestId },
                ConditionExpression:
                    'attribute_exists(guestId)',
                ReturnValues: 'ALL_OLD'
            })
        );

        return result.Attributes;

    } catch (error) {
        if (error.name === 'ConditionalCheckFailedException') {
            throw new Error('Guest not found.');
        }

        throw error;
    }
}

// Search guests by name or email
async function searchGuests(weddingId, searchValue) {
    const guests = await getGuestsByWedding(weddingId);

    const search = searchValue.toLowerCase();

    return guests.filter(
        guest =>
            guest.name.toLowerCase().includes(search) ||
            guest.email.toLowerCase().includes(search)
    );
}

module.exports = {
    createGuest,
    getGuestsByWedding,
    getGuestById,
    getRSVPSummary,
    updateGuestRSVP,
    updateGuest,
    deleteGuest,
    searchGuests
};
