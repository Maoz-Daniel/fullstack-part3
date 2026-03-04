/**
 * Data Server Module
 *
 * Simulates the application server responsible for managing meetings.
 * Implements REST API endpoints with session-based authentication and ownership validation.
 *
 * Endpoints:
 *   GET    /api/meetings          – all meetings for authenticated user (+ accepted invitations)
 *   GET    /api/meetings/:id      – single meeting (owner or accepted invitee)
 *   POST   /api/meetings          – create meeting (auto-creates invitations for participants)
 *   PUT    /api/meetings/:id      – update meeting (auto-creates invitations for new participants)
 *   DELETE /api/meetings/:id      – delete meeting (owner only)
 *   GET    /api/users             – list all other users (for participant picker)
 *   GET    /api/invitations       – list invitations received by current user
 *   PUT    /api/invitations/:id   – accept or decline an invitation
 */

import {
    insertRecord,
    getRecords,
    getRecordById,
    updateRecord,
    deleteRecord
} from '../db/db-api.js';

const DB_MEETINGS    = 'db_meetings';
const DB_USERS       = 'db_users';
const DB_SESSIONS    = 'db_sessions';
const DB_INVITATIONS = 'db_invitations';

// ===================== Authentication & Session Management =====================

/**
 * Stores a session token for an authenticated user
 * @param {string} sessionToken - The session token to store
 * @param {number} userId - The user ID associated with the token
 */
function storeSession(sessionToken, userId) {
    const sessions = JSON.parse(localStorage.getItem(DB_SESSIONS) || '{}');
    sessions[sessionToken] = { userId, createdAt: new Date().toISOString() };
    localStorage.setItem(DB_SESSIONS, JSON.stringify(sessions));
}

/**
 * Validates a session token and returns the associated user ID
 * @param {string} sessionToken - The token to validate
 * @returns {number|null} The user ID if valid, null if invalid
 */
function validateSession(sessionToken) {
    if (!sessionToken || typeof sessionToken !== 'string') {
        return null;
    }

    const sessions = JSON.parse(localStorage.getItem(DB_SESSIONS) || '{}');
    const session = sessions[sessionToken];

    return session ? session.userId : null;
}

/**
 * Middleware to validate session token and extract user ID
 * @param {string} sessionToken - The token to validate
 * @returns {Object|null} Error response if invalid, or null if valid
 */
function validateAuthorization(sessionToken) {
    const userId = validateSession(sessionToken);

    if (!userId) {
        return {
            status: 401,
            message: 'Unauthorized: Invalid or missing token'
        };
    }

    return null;
}

// ===================== URL Parsing =====================

/**
 * Parses a URL path and extracts resource and ID
 * Examples: "/api/meetings" -> {resource: "meetings", id: null}
 *           "/api/meetings/123" -> {resource: "meetings", id: 123}
 *           "/api/invitations/456" -> {resource: "invitations", id: 456}
 *
 * @param {string} url - The URL path to parse
 * @returns {Object} Object with resource and id properties
 */
function parseUrl(url) {
    const parts = url.split('/').filter(p => p && p !== 'api');
    return {
        resource: parts[0] || null,
        id: parts[1] ? parseInt(parts[1], 10) : null
    };
}

// ===================== Invitation Helpers =====================

/**
 * Auto-creates invitation records for a list of participant IDs.
 * Skips the meeting owner and existing invitations (idempotent).
 *
 * @param {number} meetingId
 * @param {number} fromUserId  - Meeting owner / person who set participants
 * @param {number[]} participantIds
 */
function createInvitations(meetingId, fromUserId, participantIds) {
    participantIds.forEach(participantId => {
        if (participantId === fromUserId) return; // Don't invite yourself

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

// ===================== Meeting Handlers =====================

/**
 * Handles GET /api/meetings
 * Returns all meetings owned by the user PLUS meetings where the user has
 * an accepted invitation (marked with isInvited: true).
 *
 * @param {number} userId
 * @returns {Object} Response object
 */
function handleGetAllMeetings(userId) {
    // Own meetings
    const ownMeetings = getRecords(DB_MEETINGS, m => m.userId === userId);

    // Meetings the user was invited to and accepted
    const acceptedInvites = getRecords(DB_INVITATIONS,
        inv => inv.toUserId === userId && inv.status === 'accepted'
    );

    const ownIds = new Set(ownMeetings.map(m => m.id));

    const invitedMeetings = acceptedInvites
        .map(inv => {
            const meeting = getRecordById(DB_MEETINGS, inv.meetingId);
            return meeting ? { ...meeting, isInvited: true } : null;
        })
        .filter(m => m && !ownIds.has(m.id)); // exclude if user also owns it

    return {
        status: 200,
        message: 'Meetings retrieved successfully',
        data: [...ownMeetings, ...invitedMeetings]
    };
}

/**
 * Handles GET /api/meetings/:id
 * Returns a specific meeting. Accessible by the owner or an accepted invitee.
 *
 * @param {number} meetingId
 * @param {number} userId
 * @returns {Object} Response object
 */
function handleGetMeeting(meetingId, userId) {
    const meeting = getRecordById(DB_MEETINGS, meetingId);

    if (!meeting) {
        return {
            status: 404,
            message: 'Meeting not found'
        };
    }

    // Access allowed for owner OR accepted invitee
    if (meeting.userId !== userId) {
        const acceptedInvite = getRecords(DB_INVITATIONS,
            inv => inv.meetingId === meetingId &&
                   inv.toUserId === userId &&
                   inv.status === 'accepted'
        );
        if (acceptedInvite.length === 0) {
            return {
                status: 403,
                message: 'Forbidden: You do not have access to this meeting'
            };
        }
    }

    return {
        status: 200,
        message: 'Meeting retrieved successfully',
        data: meeting
    };
}

/**
 * Handles POST /api/meetings
 * Creates a new meeting and auto-creates invitations for all participants.
 *
 * @param {Object} data - {title, date, time, location, description, participants}
 * @param {number} userId
 * @returns {Object} Response object
 */
function handleCreateMeeting(data, userId) {
    const { title, date, time, location, description, participants } = data;

    if (!title || !date || !time || !location) {
        return {
            status: 400,
            message: 'Missing required fields: title, date, time, location'
        };
    }

    // Normalise participants to an array of integers
    let participantIds = [];
    if (participants) {
        if (typeof participants === 'string') {
            participantIds = participants.split(',')
                .map(id => parseInt(id.trim(), 10))
                .filter(id => !isNaN(id));
        } else if (Array.isArray(participants)) {
            participantIds = participants.map(id => parseInt(id, 10)).filter(id => !isNaN(id));
        }
    }

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

    // Auto-create invitations for all participants
    createInvitations(newMeeting.id, userId, participantIds);

    return {
        status: 201,
        message: 'Meeting created successfully',
        data: newMeeting
    };
}

/**
 * Handles PUT /api/meetings/:id
 * Updates an existing meeting. Auto-creates invitations for any newly added participants.
 *
 * @param {number} meetingId
 * @param {Object} data - Updated fields
 * @param {number} userId
 * @returns {Object} Response object
 */
function handleUpdateMeeting(meetingId, data, userId) {
    const meeting = getRecordById(DB_MEETINGS, meetingId);

    if (!meeting) {
        return {
            status: 404,
            message: 'Meeting not found'
        };
    }

    if (meeting.userId !== userId) {
        return {
            status: 403,
            message: 'Forbidden: You do not have permission to update this meeting'
        };
    }

    // Normalise participants field
    let updateData = { ...data };
    if (data.participants !== undefined) {
        if (typeof data.participants === 'string') {
            updateData.participants = data.participants.split(',')
                .map(id => parseInt(id.trim(), 10))
                .filter(id => !isNaN(id));
        } else if (Array.isArray(data.participants)) {
            updateData.participants = data.participants.map(id => parseInt(id, 10)).filter(id => !isNaN(id));
        }
    }

    const updatedMeeting = updateRecord(DB_MEETINGS, meetingId, updateData);

    // Auto-create invitations for newly added participants
    if (updateData.participants) {
        createInvitations(meetingId, userId, updateData.participants);
    }

    return {
        status: 200,
        message: 'Meeting updated successfully',
        data: updatedMeeting
    };
}

/**
 * Handles DELETE /api/meetings/:id
 *
 * @param {number} meetingId
 * @param {number} userId
 * @returns {Object} Response object
 */
function handleDeleteMeeting(meetingId, userId) {
    const meeting = getRecordById(DB_MEETINGS, meetingId);

    if (!meeting) {
        return {
            status: 404,
            message: 'Meeting not found'
        };
    }

    if (meeting.userId !== userId) {
        return {
            status: 403,
            message: 'Forbidden: You do not have permission to delete this meeting'
        };
    }

    const deleted = deleteRecord(DB_MEETINGS, meetingId);

    if (deleted) {
        return {
            status: 200,
            message: 'Meeting deleted successfully'
        };
    } else {
        return {
            status: 500,
            message: 'Failed to delete meeting'
        };
    }
}

// ===================== User Handlers =====================

/**
 * Handles GET /api/users
 * Returns all registered users (excluding the current user and passwords).
 * Used by the participant picker on the client.
 *
 * @param {number} userId - Current authenticated user (excluded from results)
 * @returns {Object} Response object
 */
function handleGetUsers(userId) {
    const allUsers = getRecords(DB_USERS, () => true);

    const publicUsers = allUsers
        .filter(u => u.id !== userId)
        .map(({ id, username, fullName }) => ({ id, username, fullName }));

    return {
        status: 200,
        message: 'Users retrieved successfully',
        data: publicUsers
    };
}

// ===================== Invitation Handlers =====================

/**
 * Handles GET /api/invitations
 * Returns all invitations sent TO the current user, enriched with meeting and
 * sender details.
 *
 * @param {number} userId
 * @returns {Object} Response object
 */
function handleGetInvitations(userId) {
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
        status: 200,
        message: 'Invitations retrieved successfully',
        data: enriched
    };
}

/**
 * Handles PUT /api/invitations/:id
 * Allows the invited user to accept or decline an invitation.
 *
 * @param {number} inviteId
 * @param {Object} data - { status: 'accepted' | 'declined' }
 * @param {number} userId
 * @returns {Object} Response object
 */
function handleUpdateInvitation(inviteId, data, userId) {
    const invitation = getRecordById(DB_INVITATIONS, inviteId);

    if (!invitation) {
        return { status: 404, message: 'Invitation not found' };
    }

    if (invitation.toUserId !== userId) {
        return { status: 403, message: 'Forbidden: You cannot modify this invitation' };
    }

    const { status } = data;
    if (!['accepted', 'declined'].includes(status)) {
        return { status: 400, message: 'Status must be "accepted" or "declined"' };
    }

    const updated = updateRecord(DB_INVITATIONS, inviteId, { status });

    return {
        status: 200,
        message: `Invitation ${status}`,
        data: updated
    };
}

// ===================== Main Server Entry Point =====================

/**
 * Main data server object.
 * Routes HTTP method + URL to the appropriate handler after session validation.
 */
export const dataServer = {
    /**
     * @param {string} method        - HTTP verb ('GET', 'POST', 'PUT', 'DELETE')
     * @param {string} url           - e.g. '/api/meetings', '/api/meetings/123'
     * @param {Object} data          - Request body (for POST/PUT)
     * @param {string} sessionToken  - Auth token
     * @returns {Object}             Response { status, message, data? }
     */
    handleRequest(method, url, data, sessionToken) {
        // Validate session token first
        const authError = validateAuthorization(sessionToken);
        if (authError) return authError;

        const userId = validateSession(sessionToken);
        const { resource, id } = parseUrl(url);
        const verb = method.toUpperCase();

        // ── /api/meetings ──────────────────────────────────────────────────
        if (resource === 'meetings') {
            switch (verb) {
                case 'GET':
                    return id
                        ? handleGetMeeting(id, userId)
                        : handleGetAllMeetings(userId);

                case 'POST':
                    return handleCreateMeeting(data, userId);

                case 'PUT':
                    return id
                        ? handleUpdateMeeting(id, data, userId)
                        : { status: 400, message: 'PUT request requires a meeting ID' };

                case 'DELETE':
                    return id
                        ? handleDeleteMeeting(id, userId)
                        : { status: 400, message: 'DELETE request requires a meeting ID' };

                default:
                    return { status: 405, message: `Method ${verb} not allowed` };
            }
        }

        // ── /api/users ─────────────────────────────────────────────────────
        if (resource === 'users') {
            if (verb === 'GET') return handleGetUsers(userId);
            return { status: 405, message: `Method ${verb} not allowed` };
        }

        // ── /api/invitations ───────────────────────────────────────────────
        if (resource === 'invitations') {
            switch (verb) {
                case 'GET':
                    return handleGetInvitations(userId);

                case 'PUT':
                    return id
                        ? handleUpdateInvitation(id, data, userId)
                        : { status: 400, message: 'PUT request requires an invitation ID' };

                default:
                    return { status: 405, message: `Method ${verb} not allowed` };
            }
        }

        return {
            status: 404,
            message: 'Resource not found'
        };
    },

    /** Called by auth-server after successful login / register */
    storeSession
};
