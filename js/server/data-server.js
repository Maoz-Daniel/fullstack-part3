/**
 * Data Server Module
 * 
 * Simulates the application server responsible for managing meetings.
 * Implements REST API endpoints with session-based authentication and ownership validation.
 */

import {
    insertRecord,
    getRecords,
    getRecordById,
    updateRecord,
    deleteRecord
} from '../db/db-api.js';

const DB_MEETINGS = 'db_meetings';
const DB_USERS = 'db_users';
const DB_SESSIONS = 'db_sessions';

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
 * @returns {Object} Response if invalid, or null if valid (use return value to early exit)
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
 *           "/api/meetings/123" -> {resource: "meetings", id: "123"}
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

// ===================== Handler Functions =====================

/**
 * Handles GET /api/meetings - Returns all meetings for the authenticated user
 * @param {number} userId - The authenticated user's ID
 * @returns {Object} Response object
 */
function handleGetAllMeetings(userId) {
    const userMeetings = getRecords(DB_MEETINGS, meeting => meeting.userId === userId);
    
    return {
        status: 200,
        message: 'Meetings retrieved successfully',
        data: userMeetings
    };
}

/**
 * Handles GET /api/meetings/:id - Returns a specific meeting
 * @param {number} meetingId - The meeting ID to retrieve
 * @param {number} userId - The authenticated user's ID
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
    
    if (meeting.userId !== userId) {
        return {
            status: 403,
            message: 'Forbidden: You do not have access to this meeting'
        };
    }
    
    return {
        status: 200,
        message: 'Meeting retrieved successfully',
        data: meeting
    };
}

/**
 * Handles POST /api/meetings - Creates a new meeting
 * Injects the authenticated user's ID as userId
 * 
 * @param {Object} data - Request data {title, date, time, location, description, participants}
 * @param {number} userId - The authenticated user's ID
 * @returns {Object} Response object
 */
function handleCreateMeeting(data, userId) {
    const { title, date, time, location, description, participants } = data;
    
    // Validate required fields
    if (!title || !date || !time || !location) {
        return {
            status: 400,
            message: 'Missing required fields: title, date, time, location'
        };
    }
    
    // Parse participants (comma-separated or array)
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
    
    // Create meeting with injected userId
    const newMeeting = insertRecord(DB_MEETINGS, {
        userId,  // Injected from authenticated session
        title,
        date,
        time,
        location,
        description: description || '',
        participants: participantIds,
        createdAt: new Date().toISOString()
    });
    
    return {
        status: 201,
        message: 'Meeting created successfully',
        data: newMeeting
    };
}

/**
 * Handles PUT /api/meetings/:id - Updates an existing meeting
 * @param {number} meetingId - The meeting ID to update
 * @param {Object} data - Updated fields
 * @param {number} userId - The authenticated user's ID
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
    
    // Parse participants if provided
    let updateData = { ...data };
    if (data.participants) {
        if (typeof data.participants === 'string') {
            updateData.participants = data.participants.split(',')
                .map(id => parseInt(id.trim(), 10))
                .filter(id => !isNaN(id));
        }
    }
    
    const updatedMeeting = updateRecord(DB_MEETINGS, meetingId, updateData);
    
    return {
        status: 200,
        message: 'Meeting updated successfully',
        data: updatedMeeting
    };
}

/**
 * Handles DELETE /api/meetings/:id - Deletes a meeting
 * @param {number} meetingId - The meeting ID to delete
 * @param {number} userId - The authenticated user's ID
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

// ===================== Main Server Entry Point =====================

/**
 * Main data server object
 * Provides REST API endpoint handling with authentication and authorization
 */
export const dataServer = {
    /**
     * Handles incoming data server requests
     * Routes HTTP methods and URLs to appropriate handlers
     * 
     * @param {string} method - HTTP method ('GET', 'POST', 'PUT', 'DELETE')
     * @param {string} url - Request URL path (e.g., '/api/meetings' or '/api/meetings/123')
     * @param {Object} data - Request body data (for POST/PUT)
     * @param {string} sessionToken - Session token for authentication
     * @returns {Object} Response object with {status, message, data}
     */
    handleRequest(method, url, data, sessionToken) {
        // Validate session token first
        const authError = validateAuthorization(sessionToken);
        if (authError) {
            return authError;
        }
        
        const userId = validateSession(sessionToken);
        const { resource, id } = parseUrl(url);
        
        // Route requests based on method and URL
        if (resource === 'meetings') {
            switch (method.toUpperCase()) {
                case 'GET':
                    return id
                        ? handleGetMeeting(id, userId)
                        : handleGetAllMeetings(userId);
                
                case 'POST':
                    return handleCreateMeeting(data, userId);
                
                case 'PUT':
                    return id
                        ? handleUpdateMeeting(id, data, userId)
                        : {
                            status: 400,
                            message: 'PUT request requires a meeting ID'
                        };
                
                case 'DELETE':
                    return id
                        ? handleDeleteMeeting(id, userId)
                        : {
                            status: 400,
                            message: 'DELETE request requires a meeting ID'
                        };
                
                default:
                    return {
                        status: 405,
                        message: `Method ${method} not allowed`
                    };
            }
        }
        
        return {
            status: 404,
            message: 'Resource not found'
        };
    },
    
    /**
     * Helper method to store a session token (used by auth-server after login)
     * @param {string} sessionToken - The token to store
     * @param {number} userId - The user ID associated with the token
     */
    storeSession
};
