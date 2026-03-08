// Data Server — Router
// Routes incoming requests to the appropriate handler module after auth check.
//
// Endpoints:
//   GET    /api/meetings          – all meetings (owned + accepted invitations)
//   GET    /api/meetings/:id      – single meeting (owner or accepted invitee)
//   POST   /api/meetings          – create meeting
//   PUT    /api/meetings/:id      – update meeting
//   DELETE /api/meetings/:id      – delete meeting
//   GET    /api/users             – all other users (participant picker)
//   GET    /api/invitations       – invitations received by current user
//   PUT    /api/invitations/:id   – accept or decline an invitation

import { storeSession, validateSession, validateAuthorization } from './session.js';
import { handleGetAllMeetings, handleGetMeeting,
         handleCreateMeeting, handleUpdateMeeting,
         handleDeleteMeeting }                                   from './meeting-handlers.js';
import { handleGetUsers }                                        from './user-handlers.js';
import { handleGetInvitations, handleUpdateInvitation }          from './invitation-handlers.js';

// ── URL parser ─────────────────────────────────────────────────────────────

/**
 * Parses "/api/meetings/123" → { resource: "meetings", id: 123 }
 * @param {string} url
 * @returns {{ resource: string|null, id: number|null }}
 */
function parseUrl(url) {
    const parts = url.split('/').filter(p => p && p !== 'api');
    return {
        resource: parts[0] || null,
        id:       parts[1] ? parseInt(parts[1], 10) : null
    };
}

// ── Main entry point ───────────────────────────────────────────────────────

export const dataServer = {
    /**
     * Routes an HTTP request to the appropriate handler.
     * @param {string} method       - 'GET' | 'POST' | 'PUT' | 'DELETE'
     * @param {string} url          - e.g. '/api/meetings/123'
     * @param {Object} data         - Request body (POST / PUT)
     * @param {string} sessionToken - Auth token from request header
     * @returns {{ status: number, message: string, data?: any }}
     */
    handleRequest(method, url, data, sessionToken) {
        const authError = validateAuthorization(sessionToken);
        if (authError) return authError;

        const userId             = validateSession(sessionToken);
        const { resource, id }   = parseUrl(url);
        const verb               = method.toUpperCase();

        // /api/meetings
        if (resource === 'meetings') {
            switch (verb) {
                case 'GET':    return id ? handleGetMeeting(id, userId) : handleGetAllMeetings(userId);
                case 'POST':   return handleCreateMeeting(data, userId);
                case 'PUT':    return id ? handleUpdateMeeting(id, data, userId) : { status: 400, message: 'PUT requires a meeting ID' };
                case 'DELETE': return id ? handleDeleteMeeting(id, userId)       : { status: 400, message: 'DELETE requires a meeting ID' };
                default:       return { status: 405, message: `Method ${verb} not allowed` };
            }
        }

        // /api/users
        if (resource === 'users') {
            if (verb === 'GET') return handleGetUsers(userId);
            return { status: 405, message: `Method ${verb} not allowed` };
        }

        // /api/invitations
        if (resource === 'invitations') {
            switch (verb) {
                case 'GET': return handleGetInvitations(userId);
                case 'PUT': return id ? handleUpdateInvitation(id, data, userId) : { status: 400, message: 'PUT requires an invitation ID' };
                default:    return { status: 405, message: `Method ${verb} not allowed` };
            }
        }

        return { status: 404, message: 'Resource not found' };
    },

    /** Called by auth-server after a successful login / register. */
    storeSession
};
