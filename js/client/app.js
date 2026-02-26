// Main Client Controller for the SPA

import { initRouter, navigateTo } from './router.js';
import { FXMLHttpRequest } from '../comm/fajax.js';

// Global state for authenticated user
let sessionToken = null;
let currentUser = null;

/**
 * Handles route changes and attaches relevant event listeners.
 * @param {string} currentRoute - The current hash route.
 */
function handleRoute(currentRoute) {
  switch (currentRoute) {
    case '#/login':
      setupLoginView();
      break;
    case '#/register':
      setupRegisterView();
      break;
    case '#/meetings':
      if (!sessionToken) {
        alert('You must be logged in to access this page.');
        navigateTo('#/login');
      } else {
        setupMeetingsView();
      }
      break;
    default:
      navigateTo('#/login');
      break;
  }
}

/**
 * Sets up the Login view and its event listeners.
 */
function setupLoginView() {
  const loginForm = document.getElementById('login-form');
  if (!loginForm) return;

  loginForm.addEventListener('submit', (event) => {
    event.preventDefault();

    const submitButton = loginForm.querySelector('button[type="submit"]');
    submitButton.disabled = true;
    submitButton.textContent = 'Logging in...';

    const email = loginForm.querySelector('#email').value;
    const password = loginForm.querySelector('#password').value;

    const xhr = new FXMLHttpRequest();
    xhr.open('POST', '/auth/login');
    xhr.setRequestHeader('Content-Type', 'application/json');

    xhr.onreadystatechange = () => {
      if (xhr.readyState === 4) {
        submitButton.disabled = false;
        submitButton.textContent = 'Login';

        if (xhr.status === 200) {
          const responseObj = JSON.parse(xhr.responseText);
          // עדכון: השרת מחזיר את המשתמש תחת שדה user
          sessionToken = responseObj.data.sessionToken;
          currentUser = responseObj.data.user; 
          navigateTo('#/meetings');
        } else if (xhr.status === 401) {
          alert('Invalid credentials. Please try again.');
        } else {
          alert('Error Status: ' + xhr.status);
        }
      }
    };

    xhr.send({ username: email, password: password });
  });
}

/**
 * Sets up the Register view and its event listeners.
 */
function setupRegisterView() {
  const registerForm = document.getElementById('register-form');
  if (!registerForm) return;

  registerForm.addEventListener('submit', (event) => {
    event.preventDefault();

    const submitButton = registerForm.querySelector('button[type="submit"]');
    submitButton.disabled = true;
    submitButton.textContent = 'Registering...';

    const email = registerForm.querySelector('#email').value;
    const password = registerForm.querySelector('#password').value;
    const name = registerForm.querySelector('#name').value;

    const xhr = new FXMLHttpRequest();
    xhr.open('POST', '/auth/register');
    xhr.setRequestHeader('Content-Type', 'application/json');

    xhr.onreadystatechange = () => {
      if (xhr.readyState === 4) {
        submitButton.disabled = false;
        submitButton.textContent = 'Register';

        if (xhr.status === 201) {
          alert('Registration successful! Please log in.');
          navigateTo('#/login');
        } else if (xhr.status === 409) {
          alert('Email already exists.');
        } else {
          alert('Error Status: ' + xhr.status);
        }
      }
    };

    xhr.send({ username: email, password: password, fullName: name });
  });
}

/**
 * Sets up the Meetings view and its event listeners.
 */
function setupMeetingsView() {
  const addMeetingForm = document.getElementById('add-meeting-form');
  const logoutButton = document.getElementById('logout-button');

  if (!addMeetingForm) return;

  addMeetingForm.addEventListener('submit', (event) => {
    event.preventDefault();

    const submitButton = addMeetingForm.querySelector('button[type="submit"]');
    submitButton.disabled = true;
    submitButton.textContent = 'Saving...';

    const title = document.getElementById('meeting-title').value;
    const date = document.getElementById('meeting-date').value;
    const time = document.getElementById('meeting-time').value;
    const location = document.getElementById('meeting-location').value; // שדה חובה

    const xhr = new FXMLHttpRequest();
    xhr.open('POST', '/api/meetings');
    xhr.setRequestHeader('sessionToken', sessionToken);

    xhr.onreadystatechange = () => {
      if (xhr.readyState === 4) {
        submitButton.disabled = false;
        submitButton.textContent = 'Save Meeting';

        if (xhr.status === 201) {
          const response = JSON.parse(xhr.responseText);
          const newMeeting = response.data;

          alert('Meeting added successfully!');
          addMeetingForm.reset();

         
          addSingleMeetingToList(newMeeting); 
        } else {
          alert('Add Error Status: ' + xhr.status);
        }
      }
    };

    xhr.send({ title, date, time, location });
  });

  if (logoutButton) {
    logoutButton.addEventListener('click', () => {
      sessionToken = null;
      currentUser = null;
      navigateTo('#/login');
    });
  }

  fetchMeetings();
}

/**
 * Fetches the list of meetings from the server.
 */
function fetchMeetings() {
  const xhr = new FXMLHttpRequest();
  xhr.open('GET', '/api/meetings');
  xhr.setRequestHeader('sessionToken', sessionToken);

  xhr.onreadystatechange = () => {
    if (xhr.readyState === 4) {
      if (xhr.status === 200) {
        const response = JSON.parse(xhr.responseText);
        renderMeetingsList(response.data);
      } else if (xhr.status !== 0) {
        alert('Fetch Error Status: ' + xhr.status);
      }
    }
  };

  xhr.send();
}

/**
 * Adds a single meeting element to the DOM using a template.
 * @param {Object} meeting - The meeting data.
 */
function addSingleMeetingToList(meeting) {
  const meetingsList = document.getElementById('meetings-list');
  const itemTemplate = document.getElementById('meeting-item-template');
  
  if (!meetingsList || !itemTemplate) return;

  const clone = itemTemplate.content.cloneNode(true);
  const itemContainer = clone.querySelector('.meeting-item'); 

  clone.querySelector('.meeting-title-display').textContent = meeting.title;
  clone.querySelector('.meeting-details-display').textContent = 
    `${meeting.date} at ${meeting.time} | Location: ${meeting.location}`;

  const deleteButton = clone.querySelector('.delete-meeting-button');
  
  deleteButton.addEventListener('click', () => {
    deleteButton.disabled = true;
    deleteButton.textContent = 'Deleting...';

    const xhr = new FXMLHttpRequest();

    xhr.open('DELETE', `/api/meetings/${meeting.id}`); 
    xhr.setRequestHeader('sessionToken', sessionToken);

    xhr.onreadystatechange = () => {
      if (xhr.readyState === 4) {
        if (xhr.status === 200) {
         
          itemContainer.remove(); 
        } else {
          alert('Failed to delete meeting.');
          deleteButton.disabled = false;
          deleteButton.textContent = 'Delete';
        }
      }
    };

    xhr.send();
  });

  meetingsList.appendChild(clone);
}

/**
 * Renders the full list of meetings.
 * @param {Array} meetings - List of meeting objects.
 */
function renderMeetingsList(meetings) {
  const meetingsList = document.getElementById('meetings-list');
  if (!meetingsList) return;

  meetingsList.innerHTML = '';
  meetings.forEach((meeting) => addSingleMeetingToList(meeting));
}

// Initialize the app
initRouter(handleRoute);