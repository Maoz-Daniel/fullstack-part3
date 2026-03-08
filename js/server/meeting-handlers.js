// Meeting Handlers
// Handles all /api/meetings endpoints + the createInvitations helper.

import { insertRecord, getRecords, getRecordById, updateRecord, deleteRecord } from '../db/db-api.js';
import { DB_MEETINGS, DB_INVITATIONS } from './db-constants.js';

// ── Invitation helper ──────────────────────────────────────────────────────

/**
 * Auto-creates invitation records for a list of participant IDs.
 * Skips the meeting owner and any already-existing invitations (idempotent).
 * @param {number}   meetingId
 * @param {number}   fromUserId   - Meeting owner
 * @param {number[]} participantIds
 */
export function createInvitations(meetingId, fromUserId, participantIds) {
    participantIds.forEach(participantId => {
        if (participantId === fromUserId) return; // don't invite yourself

        const existing = getRecords(DB_INVITATIONS,
            inv => inv.meetingId === meetingId && inv.toUserId === participantId
        );

        if (existing.length === 0) {
            insertRecord(DB_INVITATIONS, {
                meetingId,
                fromUserId,
                toUserId:  participantId,
                status:    'pending',
                createdAt: new Date().toISOString()
            });
        }
    });
}

// ── Normalise participants field ───────────────────────────────────────────

function normaliseParticipants(participants) {
    if (!participants) return [];
    if (typeof participants === 'string') {
        return participants.split(',').map(id => parseInt(id.trim(), 10)).filter(id => !isNaN(id));
    }
    if (Array.isArray(participants)) {
        return participants.map(id => parseInt(id, 10)).filter(id => !isNaN(id));
    }
    return [];
}

// ── Handlers ───────────────────────────────────────────────────────────────

/**
 * GET /api/meetings
 * Returns all meetings owned by the user + accepted invited meetings.
 */
export function handleGetAllMeetings(userId) {
    const ownMeetings     = getRecords(DB_MEETINGS, m => m.userId === userId);
    const acceptedInvites = getRecords(DB_INVITATIONS,
        inv => inv.toUserId === userId && inv.status === 'accepted'
    );

    const ownIds = new Set(ownMeetings.map(m => m.id));

    const invitedMeetings = acceptedInvites
        .map(inv => {
            const meeting = getRecordById(DB_MEETINGS, inv.meetingId);
            return meeting ? { ...meeting, isInvited: true } : null;
        })
        .filter(m => m && !ownIds.has(m.id));

    return {
        status:  200,
        message: 'Meetings retrieved successfully',
        data:    [...ownMeetings, ...invitedMeetings]
    };
}

/**
 * GET /api/meetings/:id
 * Accessible by the owner or an accepted invitee.
 */
export function handleGetMeeting(meetingId, userId) {
    const meeting = getRecordById(DB_MEETINGS, meetingId);
    if (!meeting) return { status: 404, message: 'Meeting not found' };

    if (meeting.userId !== userId) {
        const accepted = getRecords(DB_INVITATIONS,
            inv => inv.meetingId === meetingId &&
                   inv.toUserId  === userId &&
                   inv.status    === 'accepted'
        );
        if (accepted.length === 0) {
            return { status: 403, message: 'Forbidden: You do not have access to this meeting' };
        }
    }

    return { status: 200, message: 'Meeting retrieved successfully', data: meeting };
}

/**
 * POST /api/meetings
 * Creates a new meeting and auto-sends invitations.
 */
export function handleCreateMeeting(data, userId) {
    const { title, date, time, location, description, participants } = data;

    if (!title || !date || !time || !location) {
        return { status: 400, message: 'Missing required fields: title, date, time, location' };
    }

    const participantIds = normaliseParticipants(participants);

    const newMeeting = insertRecord(DB_MEETINGS, {
        userId,
        title,
        date,
        time,
        location,
        description:  description || '',
        participants: participantIds,
        createdAt:    new Date().toISOString()
    });

    createInvitations(newMeeting.id, userId, participantIds);

    return { status: 201, message: 'Meeting created successfully', data: newMeeting };
}

/**
 * PUT /api/meetings/:id
 * Updates a meeting and auto-invites any newly added participants.
 */
export function handleUpdateMeeting(meetingId, data, userId) {
    const meeting = getRecordById(DB_MEETINGS, meetingId);
    if (!meeting) return { status: 404, message: 'Meeting not found' };
    if (meeting.userId !== userId) {
        return { status: 403, message: 'Forbidden: You do not have permission to update this meeting' };
    }

    const updateData = { ...data };
    if (data.participants !== undefined) {
        updateData.participants = normaliseParticipants(data.participants);
    }

    const updatedMeeting = updateRecord(DB_MEETINGS, meetingId, updateData);

    if (updateData.participants) {
        createInvitations(meetingId, userId, updateData.participants);
    }

    return { status: 200, message: 'Meeting updated successfully', data: updatedMeeting };
}

/**
 * DELETE /api/meetings/:id
 * Owner-only deletion.
 */
export function handleDeleteMeeting(meetingId, userId) {
    const meeting = getRecordById(DB_MEETINGS, meetingId);
    if (!meeting) return { status: 404, message: 'Meeting not found' };
    if (meeting.userId !== userId) {
        return { status: 403, message: 'Forbidden: You do not have permission to delete this meeting' };
    }

    const deleted = deleteRecord(DB_MEETINGS, meetingId);
    return deleted
        ? { status: 200, message: 'Meeting deleted successfully' }
        : { status: 500, message: 'Failed to delete meeting' };
}
