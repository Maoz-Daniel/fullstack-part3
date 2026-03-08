// Session Management
// Handles storing, validating, and authorizing session tokens.

import { DB_SESSIONS } from './db-constants.js';

/**
 * Stores a session token mapped to a user ID in localStorage.
 * Called by auth-server after a successful login or register.
 * @param {string} sessionToken
 * @param {number} userId
 */
export function storeSession(sessionToken, userId) {
    const sessions = JSON.parse(localStorage.getItem(DB_SESSIONS) || '{}');
    sessions[sessionToken] = { userId, createdAt: new Date().toISOString() };
    localStorage.setItem(DB_SESSIONS, JSON.stringify(sessions));
}

/**
 * Looks up a session token and returns the associated user ID, or null if invalid.
 * @param {string} sessionToken
 * @returns {number|null}
 */
export function validateSession(sessionToken) {
    if (!sessionToken || typeof sessionToken !== 'string') return null;
    const sessions = JSON.parse(localStorage.getItem(DB_SESSIONS) || '{}');
    const session  = sessions[sessionToken];
    return session ? session.userId : null;
}

/**
 * Middleware-style check: returns a 401 error object if the token is invalid,
 * or null if the request is authorised.
 * @param {string} sessionToken
 * @returns {{ status: 401, message: string } | null}
 */
export function validateAuthorization(sessionToken) {
    const userId = validateSession(sessionToken);
    if (!userId) {
        return { status: 401, message: 'Unauthorized: Invalid or missing token' };
    }
    return null;
}
