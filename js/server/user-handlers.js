// User Handlers
// Handles the GET /api/users endpoint (participant picker).

import { getRecords } from '../db/db-api.js';
import { DB_USERS }   from './db-constants.js';

/**
 * GET /api/users
 * Returns all registered users except the caller, with passwords stripped.
 * @param {number} userId - current authenticated user (excluded from results)
 * @returns {Object} response object
 */
export function handleGetUsers(userId) {
    const allUsers = getRecords(DB_USERS, () => true);

    const publicUsers = allUsers
        .filter(u => u.id !== userId)
        .map(({ id, username, fullName }) => ({ id, username, fullName }));

    return {
        status:  200,
        message: 'Users retrieved successfully',
        data:    publicUsers
    };
}
