import { sendRequest } from './network.js';

/**
 * Fake XHR (FXMLHttpRequest)
 * Simulates a minimal subset of XMLHttpRequest for the SPA's Fake AJAX layer.
 */
export class FXMLHttpRequest {
    constructor() {
        this.readyState = 0;
        this.status = 0;
        this.responseText = '';
        this.onreadystatechange = null;

        this._method = null;
        this._url = null;
        this._headers = {};
        this._timeoutMs = 5000; // default timeout for dropped packets
        this._completed = false;
        this.timeout = this._timeoutMs; // public alias similar to XHR
    }

    open(method, url) {
        this._method = (method || 'GET').toUpperCase();
        this._url = url;
        this.readyState = 1;
        if (typeof this.onreadystatechange === 'function') {
            try { this.onreadystatechange(); } catch (e) { console.error(e); }
        }
    }

    setRequestHeader(header, value) {
        if (!header) return;
        this._headers[header] = String(value);
    }

    /**
     * send(body): builds request object, stringifies it and passes to network.sendRequest
     * Implements an internal timeout to simulate packet loss/timeouts.
     */
    send(body = null) {
        this._completed = false;
        const requestObj = {
            method: this._method || 'GET',
            url: this._url || '/',
            body: body,
            headers: this._headers
        };

        const requestJSON = JSON.stringify(requestObj);

        // Start timeout to detect dropped packet (network may never call callback)
        const timeoutMs = typeof this.timeout === 'number' ? this.timeout : this._timeoutMs;
        const timer = setTimeout(() => {
            if (this._completed) return;
            this._completed = true;
            this.status = 0; // indicate network failure/no response
            this.readyState = 4;
            this.responseText = '';
            if (typeof this.onreadystatechange === 'function') {
                try { this.onreadystatechange(); } catch (e) { console.error(e); }
            }
        }, timeoutMs);

        // Send via network module
        try {
            sendRequest(requestJSON, (responseJSONString) => {
                if (this._completed) return; // already timed out
                this._completed = true;
                clearTimeout(timer);

                // responseJSONString is expected to be a JSON string
                this.responseText = typeof responseJSONString === 'string' ? responseJSONString : String(responseJSONString);

                try {
                    const parsed = JSON.parse(responseJSONString);
                    this.status = typeof parsed.status === 'number' ? parsed.status : 0;
                } catch (e) {
                    // If response is not valid JSON, leave status as 0
                    this.status = 0;
                }

                this.readyState = 4;

                if (typeof this.onreadystatechange === 'function') {
                    try { this.onreadystatechange(); } catch (e) { console.error(e); }
                }
            });
        } catch (err) {
            clearTimeout(timer);
            this._completed = true;
            this.status = 0;
            this.readyState = 4;
            this.responseText = '';
            if (typeof this.onreadystatechange === 'function') {
                try { this.onreadystatechange(); } catch (e) { console.error(e); }
            }
        }
    }
}
