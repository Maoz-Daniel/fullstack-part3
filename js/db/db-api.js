/**
 * Database API Module
 * 
 * A synchronous wrapper around browser's localStorage that provides
 * CRUD operations for the application's data collections.
 * 
 * Collections:
 * - db_users: Stores user account information
 * - db_meetings: Stores meeting records
 */

// ===================== Private Helper Functions =====================

/**
 * Reads a collection from localStorage and returns it as an array
 * @param {string} collectionKey - The key in localStorage (e.g., 'db_users' or 'db_meetings')
 * @returns {Array} The collection array, or empty array if not found
 */
function readCollection(collectionKey) {
    try {
        const data = localStorage.getItem(collectionKey);
        return data ? JSON.parse(data) : [];
    } catch (error) {
        console.error(`Error reading collection '${collectionKey}':`, error);
        return [];
    }
}

/**
 * Writes a collection to localStorage
 * @param {string} collectionKey - The key in localStorage
 * @param {Array} collectionData - The array of records to save
 */
function writeCollection(collectionKey, collectionData) {
    try {
        localStorage.setItem(collectionKey, JSON.stringify(collectionData));
    } catch (error) {
        console.error(`Error writing collection '${collectionKey}':`, error);
    }
}

/**
 * Generates a unique ID for a new record
 * Uses timestamp-based ID to ensure uniqueness
 * @returns {number} A unique ID
 */
function generateId() {
    return Date.now() + Math.floor(Math.random() * 1000);
}

// ===================== Public CRUD Operations =====================

/**
 * Inserts a new record into the specified collection
 * Automatically generates and appends a unique id field
 * 
 * @param {string} collectionKey - The collection key ('db_users' or 'db_meetings')
 * @param {Object} recordObj - The object to insert (without id)
 * @returns {Object} The newly created object with id field
 */
export const insertRecord = (collectionKey, recordObj) => {
    const collection = readCollection(collectionKey);
    
    const newRecord = {
        id: generateId(),
        ...recordObj
    };
    
    collection.push(newRecord);
    writeCollection(collectionKey, collection);
    
    return newRecord;
};

/**
 * Retrieves records from the specified collection
 * Optionally filters results using a callback function
 * 
 * @param {string} collectionKey - The collection key ('db_users' or 'db_meetings')
 * @param {Function} [filterCallback] - Optional filter function that receives each record
 * @returns {Array} Array of matching records
 */
export const getRecords = (collectionKey, filterCallback) => {
    const collection = readCollection(collectionKey);
    
    if (filterCallback && typeof filterCallback === 'function') {
        return collection.filter(filterCallback);
    }
    
    return collection;
};

/**
 * Retrieves a single record by its id
 * 
 * @param {string} collectionKey - The collection key ('db_users' or 'db_meetings')
 * @param {number} id - The id of the record to retrieve
 * @returns {Object|null} The matching record, or null if not found
 */
export const getRecordById = (collectionKey, id) => {
    const collection = readCollection(collectionKey);
    return collection.find(record => record.id === id) || null;
};

/**
 * Updates an existing record in the collection
 * Merges the updated fields into the existing record, preserving the id
 * 
 * @param {string} collectionKey - The collection key ('db_users' or 'db_meetings')
 * @param {number} id - The id of the record to update
 * @param {Object} updatedFieldsObj - Object containing fields to update
 * @returns {Object|null} The updated record, or null if not found
 */
export const updateRecord = (collectionKey, id, updatedFieldsObj) => {
    const collection = readCollection(collectionKey);
    const recordIndex = collection.findIndex(record => record.id === id);
    
    if (recordIndex === -1) {
        return null;
    }
    
    const updatedRecord = {
        ...collection[recordIndex],
        ...updatedFieldsObj,
        id: collection[recordIndex].id // Preserve the original id
    };
    
    collection[recordIndex] = updatedRecord;
    writeCollection(collectionKey, collection);
    
    return updatedRecord;
};

/**
 * Deletes a record from the collection by its id
 * 
 * @param {string} collectionKey - The collection key ('db_users' or 'db_meetings')
 * @param {number} id - The id of the record to delete
 * @returns {boolean} True if deletion was successful, false if record not found
 */
export const deleteRecord = (collectionKey, id) => {
    const collection = readCollection(collectionKey);
    const initialLength = collection.length;
    
    const filteredCollection = collection.filter(record => record.id !== id);
    
    if (filteredCollection.length === initialLength) {
        return false; // Record not found
    }
    
    writeCollection(collectionKey, filteredCollection);
    return true;
};
