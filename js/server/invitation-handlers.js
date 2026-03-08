// Invitation Handlers
// Handles all /api/invitations endpoints.

import { getRecords, getRecordById, updateRecord } from '../db/db-api.js';
import { DB_INVITATIONS, DB_MEETINGS, DB_USERS }   from './db-constants.js';

/**
 * GET /api/invitations
 * Returns all invitations sent TO the current user, enriched with meeting
 * and sender details.
 * @param {number} userId
 * @returns {Object} response object
 */
export function handleGetInvitations(userId) {
    const invitations = getRecords(DB_INVITATIONS, inv => inv.toUserId === userId);

    const enriched = invitations.map(inv => {
        const meeting  = getRecordById(DB_MEETINGS, inv.meetingId);
        const fromUser = getRecords(DB_USERS, u => u.id === inv.fromUserId)[0];

        return {
            ...inv,
            meeting: meeting ? {
                id:       meeting.id,
                title:    meeting.title,
                date:     meeting.date,
                time:     meeting.time,
                location: meeting.location
            } : null,
            fromUser: fromUser ? {
                id:       fromUser.id,
                fullName: fromUser.fullName,
                username: fromUser.username
            } : null
        };
    });

    return {
        status:  200,
        message: 'Invitations retrieved successfully',
        data:    enriched
    };
}

/**
 * PUT /api/invitations/:id
 * Allows the invited user to accept or decline an invitation.
 * @param {number} inviteId
 * @param {Object} data - { status: 'accepted' | 'declined' }
 * @param {number} userId
 * @returns {Object} response object
 */
export function handleUpdateInvitation(inviteId, data, userId) {
    const invitation = getRecordById(DB_INVITATIONS, inviteId);
    if (!invitation) return { status: 404, message: 'Invitation not found' };
    if (invitation.toUserId !== userId) {
        return { status: 403, message: 'Forbidden: You cannot modify this invitation' };
    }

    const { status } = data;
    if (!['accepted', 'declined'].includes(status)) {
        return { status: 400, message: 'Status must be "accepted" or "declined"' };
    }

    const updated = updateRecord(DB_INVITATIONS, inviteId, { status });
    return { status: 200, message: `Invitation ${status}`, data: updated };
}
