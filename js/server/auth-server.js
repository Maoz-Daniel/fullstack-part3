/**
 * Authentication Server Module
 * 
 * Simulates a server responsible for user authentication.
 * Handles registration and login requests using the DB-API layer.
 */

import {
    insertRecord,
    getRecords
} from '../db/db-api.js';

import { dataServer } from './data-server.js';


const DB_USERS = 'db_users';

// ===================== Private Helper Functions =====================

/**
 * Generates a simple session token for simulation purposes
 * In a real scenario, this would be a JWT or similar token
 * @returns {string} A random session token
 */
function generateSessionToken() {
    return 'token_' + Math.random().toString(36).substring(2, 15) + 
           Math.random().toString(36).substring(2, 15);
}

// ===================== Action Handlers =====================

/**
 * Handles REGISTER action
 * Validates user input, checks for duplicate username, and creates new user
 * 
 * @param {Object} data - Request data {username, password, fullName}
 * @returns {Object} Response object with status, message, and optional data
 */
function handleRegister(data) {
    const { username, password, fullName } = data;

    // Validate required fields
    if (!username || !password || !fullName) {
        return {
            status: 400,
            message: 'Missing required fields: username, password, fullName'
        };
    }

    // Check if username already exists
    const existingUsers = getRecords(DB_USERS, user => user.username === username);

    if (existingUsers.length > 0) {
        return {
            status: 409,
            message: 'Username already exists'
        };
    }

    // Create new user record
    const newUser = insertRecord(DB_USERS, {
        username,
        password,  // In production, this would be hashed
        fullName,
        createdAt: new Date().toISOString()
    });

    return {
        status: 201,
        message: 'User registered successfully',
        data: {
            id: newUser.id,
            username: newUser.username,
            fullName: newUser.fullName
        }
    };
}

/**
 * Handles LOGIN action
 * Finds user by username and password, returns session token on success
 * 
 * @param {Object} data - Request data {username, password}
 * @returns {Object} Response object with status, message, and optional data
 */
function handleLogin(data) {
    const { username, password } = data;

    if (!username || !password) {
        return { status: 400, message: 'Missing required fields' };
    }

    const matchingUsers = getRecords(DB_USERS, user =>
        user.username === username && user.password === password
    );

    if (matchingUsers.length === 0) {
        return { status: 401, message: 'Invalid username or password' };
    }

    const user = matchingUsers[0];
    const sessionToken = generateSessionToken();

    dataServer.storeSession(sessionToken, user.id);

    return {
        status: 200,
        message: 'Login successful',
        data: {
            user: {
                id: user.id,
                username: user.username,
                fullName: user.fullName
            },
            sessionToken
        }
    };
}

// ===================== Main Server Entry Point =====================

/**
 * Main authentication server object
 * Provides a central entry point for handling authentication requests
 */
export const authServer = {
    /**
     * Handles incoming authentication requests
     * Routes actions to appropriate handlers
     * 
     * @param {string} action - The action to perform ('REGISTER' or 'LOGIN')
     * @param {Object} data - The request data object
     * @returns {Object} Response object with status, message, and optional data
     */
    handleRequest(action, data) {
        switch (action.toUpperCase()) {
            case 'REGISTER':
                return handleRegister(data);

            case 'LOGIN':
                return handleLogin(data);

            default:
                return {
                    status: 400,
                    message: `Unknown action: ${action}`
                };
        }
    }
};
