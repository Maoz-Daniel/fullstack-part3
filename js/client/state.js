//  Shared Application State 
// All mutable global state lives here. Other modules import the live
// bindings and call the setters to update them.

export let sessionToken = localStorage.getItem('sessionToken') || null;
export let currentUser  = JSON.parse(localStorage.getItem('currentUser') || 'null');
export let allMeetings  = [];
export let allUsers     = [];

export function setSessionToken(v) { sessionToken = v; }
export function setCurrentUser(v)  { currentUser  = v; }
export function setAllMeetings(v)  { allMeetings  = v; }
export function setAllUsers(v)     { allUsers     = v; }
