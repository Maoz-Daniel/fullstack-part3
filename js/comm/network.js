/**
 * Network Simulation Module
 * Simulates latency and packet loss for an E2E client-server architecture.
 *
 * Exports: sendRequest(requestObj, responseCallback)
 *
 * requestObj: { method, url, body, headers }
 */

import { authServer } from '../server/auth-server.js';
import { dataServer } from '../server/data-server.js';

export const DROP_PROBABILITY = 0.2; // 20% packet loss
const MIN_DELAY_MS = 1000;
const MAX_DELAY_MS = 3000;

function randomDelay() {
    return Math.floor(Math.random() * (MAX_DELAY_MS - MIN_DELAY_MS + 1)) + MIN_DELAY_MS;
}

function isDropped() {
    return Math.random() < DROP_PROBABILITY;
}

function extractSessionToken(headers = {}) {
    if (!headers) return null;
    if (typeof headers === 'object') {
        if (headers.sessionToken) return headers.sessionToken;
        if (headers.Authorization) {
            const val = headers.Authorization;
            if (val.startsWith('Bearer ')) return val.slice(7).trim();
            return val;
        }
    }
    return null;
}

/**
 * Main network send function (JSON-packed)
 * Expects a stringified JSON `requestJSON` and returns a stringified JSON response.
 * Introduces a single delay+drop for the entire round-trip.
 * Routes requests to either the auth server or data server based on URL.
 *
 * @param {string} requestJSON - JSON string of { method, url, body, headers }
 * @param {Function} responseCallback - function(responseJSONString)
 */

/**
 * Parses a JSON string into an object. Throws on invalid JSON.
 * @param {string} requestJSON
 * @returns {Object}
 */
function parseRequest(requestJSON) {
    return JSON.parse(requestJSON);
}

/**
 * Routes a parsed request object to the appropriate server and returns the server response.
 * Catches routing errors and returns a 500-style response object.
 * @param {Object} requestObj
 * @returns {Object} serverResponse
 */
function routeToServer(requestObj) {
    try {
        const url = (requestObj.url || '').toString();

        if (url.startsWith('/auth')) {
            const parts = url.split('/').filter(p => p);
            const action = (parts[1] || '').toUpperCase();
            return authServer.handleRequest(action, requestObj.body || {});
        }

        if (url.startsWith('/api')) {
            const method = (requestObj.method || 'GET').toUpperCase();
            const sessionToken = extractSessionToken(requestObj.headers || {});
            return dataServer.handleRequest(method, requestObj.url, requestObj.body || {}, sessionToken);
        }

        return { status: 404, message: 'Network: Unknown route' };
    } catch (err) {
        console.error('[Network] Routing error:', err);
        return { status: 500, message: 'Network: Internal routing error' };
    }
}

/**
 * Stringifies the server response and safely executes the callback.
 * @param {Object} serverResponse
 * @param {Function} callback
 */
function deliverResponse(serverResponse, callback) {
    try {
        const packed = JSON.stringify(serverResponse);
        callback && callback(packed);
    } catch (err) {
        console.error('[Network] Error delivering response:', err);
    }
}

/**
 * Orchestrator: handles delay, drop check, parsing, routing, and delivery.
 */
export const sendRequest = (requestJSON, responseCallback) => {
    const delay = randomDelay();

    setTimeout(() => {
        // Drop check
        if (isDropped()) {
            try {
                const preview = typeof requestJSON === 'string' ? requestJSON.slice(0, 120) : String(requestJSON);
                console.warn('[Network] Packet dropped (request lost):', preview);
            } catch (logErr) {
                console.warn('[Network] Packet dropped (request lost)');
            }
            return;
        }

        // Parse request
        let requestObj;
        try {
            requestObj = parseRequest(requestJSON);
        } catch (parseErr) {
            const badResp = { status: 400, message: 'Bad Request: invalid JSON' };
            deliverResponse(badResp, responseCallback);
            return;
        }

        // Route to server
        const serverResponse = routeToServer(requestObj);

        // Deliver packed response
        deliverResponse(serverResponse, responseCallback);
    }, delay);
};
