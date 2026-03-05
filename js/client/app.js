// Main Client Controller for the SPA

import { initRouter, navigateTo } from './router.js';
import { FXMLHttpRequest } from '../comm/fajax.js';
import { initSeed } from '../db/seed.js';

// ── Seed demo data once on startup ───────────────────────────────────────────
initSeed();

// ===================== Global State =====================

let sessionToken   = null;
let currentUser    = null;
let allMeetings    = []; // Local cache for search / filter
let allUsers       = []; // Cache for participant picker

let currentActiveView = 'meetings';   // 'meetings' | 'invitations'
let activeFilter      = 'all';        // 'all' | 'today' | 'upcoming'

// ===================== Toast Notifications =====================

/**
 * Shows a temporary toast notification.
 * @param {string} message
 * @param {'success'|'error'|'info'} type
 */
function showToast(message, type = 'info') {
  const containerId = 'fajax-toast-container';
  const toastClass = 'fajax-toast';

  // ensure the toast container exists; create it dynamically if missing
  let container = document.getElementById(containerId);
  if (!container) {
    container = document.createElement('div');
    container.id = containerId;
    container.className = containerId;
    document.body.appendChild(container);
  }

  // create the toast element
  const toast = document.createElement('div');
  toast.className = `${toastClass} ${type}`;
  toast.textContent = message;

  // append to container
  container.appendChild(toast);

  // smooth fade-out and removal after 3.5 seconds
  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

// ===================== Route Handler =====================

/**
 * Called by the router on every route change.
 * @param {string} currentRoute - Current hash, e.g. '#/login'
 */
function handleRoute(currentRoute) {
  switch (currentRoute) {
    case '#/login':
      if (sessionToken) {  //
        navigateTo('#/meetings');
        return;
      }                     
      setupLoginView();
      break;
    case '#/register':
      setupRegisterView();
      break;
    case '#/meetings':
      if (!sessionToken) {
        navigateTo('#/login');
      } else {
        setupMeetingsView();
      }
      break;
    default:
      navigateTo('#/login');
  }
}

// ===================== Validation Helpers =====================

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

function showFieldError(groupId, errorId, show) {
  const group = document.getElementById(groupId);
  const error = document.getElementById(errorId);
  if (group) group.classList.toggle('input-error', show);
  if (error) error.classList.toggle('visible', show);
}

function setAuthError(id, message) {
  const el = document.getElementById(id);
  if (!el) return;
  if (message) {
    el.textContent = message;
    el.classList.add('visible');
  } else {
    el.textContent = '';
    el.classList.remove('visible');
  }
}

// ===================== Avatar Helper =====================

/**
 * Sets a DiceBear "avataaars" avatar on an <img> element.
 * Seed is the user's email — ensures the same avatar per user every time.
 *
 * Example usage from the plan:
 *   const seed = Math.random().toString(36).slice(2); // random seed
 *   const url = `https://api.dicebear.com/9.x/avataaars/svg?seed=${seed}`;
 *
 * Here we use the username (email) as the seed so it's consistent per user.
 *
 * @param {HTMLImageElement} imgEl
 * @param {string} username - Used as the DiceBear seed
 */
function setAvatar(imgEl, username) {
  if (!imgEl) return;
  const seed = username || Math.random().toString(36).slice(2); // random seed fallback
  const url  = `https://api.dicebear.com/9.x/avataaars/svg?seed=${seed}`;
  imgEl.src = url;
  imgEl.alt = 'avatar';
}

// ===================== Login View =====================

function setupLoginView() {
  const loginForm = document.getElementById('login-form');
  if (!loginForm) return;

  loginForm.addEventListener('submit', (e) => {
    e.preventDefault(); // prevent form from submitting normally

    const email    = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;

    let valid = true;

    // basic validation
    if (!isValidEmail(email)) {
      showFieldError('email-group', 'email-error', true);
      valid = false;
    } else {
      showFieldError('email-group', 'email-error', false);
    }

    if (!password) {
      showFieldError('password-group', 'password-error', true);
      valid = false;
    } else {
      showFieldError('password-group', 'password-error', false);
    }

    if (!valid) return;

    setAuthError('auth-error', '');
    const submitBtn = loginForm.querySelector('button[type="submit"]');
    submitBtn.disabled = true; // disable button to prevent multiple clicks and race conditions
    submitBtn.innerHTML = '<span class="spinner"></span> Signing in…';


    // ========== AJAX login request ==========
    const xhr = new FXMLHttpRequest();
    xhr.open('POST', '/auth/login');
    xhr.setRequestHeader('Content-Type', 'application/json');

    xhr.onreadystatechange = () => { // readyState 4 means the request is done (either success or failure)
      if (xhr.readyState !== 4) return;

      submitBtn.disabled = false; // re-enable the button
      submitBtn.textContent = 'Sign In';

      if (xhr.status === 0) { // status 0  means network error 
        setAuthError('auth-error', 'Network error — request timed out. Please try again.');
        return;
      }

      if (xhr.status === 200) { // status 200 means success — the server should return a session token and user info
        const data = JSON.parse(xhr.responseText).data;
        sessionToken = data.sessionToken;
        currentUser  = data.user;
        navigateTo('#/meetings');
      } else if (xhr.status === 401) {
        setAuthError('auth-error', 'Incorrect email or password.');
      } else {
        setAuthError('auth-error', `Server error (${xhr.status}). Please try again.`);
      }
    };

    xhr.send({ username: email, password });
  });
}

// ===================== Register View =====================

function setupRegisterView() {
  const registerForm = document.getElementById('register-form'); 
  if (!registerForm) return;

  registerForm.addEventListener('submit', (e) => {
    e.preventDefault();

    const name     = document.getElementById('name').value.trim();
    const email    = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;

    let valid = true;

    // basic validation
    if (!name) {
      showFieldError('name-group', 'name-error', true);
      valid = false;
    } else {
      showFieldError('name-group', 'name-error', false);
    }

    if (!isValidEmail(email)) {
      showFieldError('email-group', 'email-error', true);
      valid = false;
    } else {
      showFieldError('email-group', 'email-error', false);
    }

    if (password.length < 6) {
      showFieldError('password-group', 'password-error', true);
      valid = false;
    } else {
      showFieldError('password-group', 'password-error', false);
    }

    if (!valid) return;

    setAuthError('auth-error', '');
    const submitBtn = registerForm.querySelector('button[type="submit"]');
    submitBtn.disabled = true; // disable button to prevent multiple clicks and race conditions
    submitBtn.innerHTML = '<span class="spinner"></span> Creating account…';

    // ========== AJAX register request ==========
    const xhr = new FXMLHttpRequest();
    xhr.open('POST', '/auth/register');
    xhr.setRequestHeader('Content-Type', 'application/json');

    xhr.onreadystatechange = () => {
      if (xhr.readyState !== 4) return;

      if (xhr.status === 0) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Create Account';
        setAuthError('auth-error', 'Network error — request timed out. Please try again.');
        return;
      }

      if (xhr.status === 201) {
        // the server returns a session token directly — no second login request needed.
        // this is the auto-login fix: the register response now includes sessionToken
        // so the client can navigate straight to #/meetings without another round-trip.
        //201 and not 200 beacause a new resource (user) was created
        const data = JSON.parse(xhr.responseText).data;
        sessionToken = data.sessionToken;
        currentUser  = data.user;
        showToast('Welcome to MeetSync!', 'success');
        navigateTo('#/meetings');
      } else if (xhr.status === 409) { // 409 Conflict means the email is already registered
        submitBtn.disabled = false;
        submitBtn.textContent = 'Create Account';
        setAuthError('auth-error', 'An account with this email already exists.');
      } else {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Create Account';
        setAuthError('auth-error', `Server error (${xhr.status}). Please try again.`);
      }
    };

    xhr.send({ username: email, password, fullName: name });
  });
}

// ===================== Meetings View =====================

function getGreeting() {
  const hour = new Date().getHours();
  const firstName = currentUser
    ? (currentUser.fullName || currentUser.username).split(' ')[0]
    : '';
  let base;
  if (hour < 12)      base = 'Good morning';
  else if (hour < 17) base = 'Good afternoon';
  else                base = 'Good evening';
  return firstName ? `${base}, ${firstName}` : base;
}

function getMeetingStatus(dateStr) {
  if (!dateStr) return 'upcoming';
  const [y, m, d] = dateStr.split('-').map(Number);
  const meetingDate   = new Date(y, m - 1, d);
  const now           = new Date();
  const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diff = meetingDate - todayMidnight;
  if (diff === 0) return 'today';
  if (diff > 0)  return 'upcoming';
  return 'past';
}

/**
 * animates a number counting up to a target value.
 * @param {string} id - The ID of the element whose textContent will be updated.
 * @param {number} target - The final number to count up to.
 */
function animateCounter(id, target) {
  const el = document.getElementById(id);
  if (!el) return;
  const start    = parseInt(el.textContent) || 0;
  if (start === target) return;
  const duration  = 550;
  const startTime = performance.now();
  function step(now) {
    const progress = Math.min((now - startTime) / duration, 1);
    const eased    = 1 - Math.pow(1 - progress, 3);
    el.textContent = Math.round(start + (target - start) * eased);
    if (progress < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

function updateStats(meetings) {
  const todayCount    = meetings.filter(m => getMeetingStatus(m.date) === 'today').length;
  const upcomingCount = meetings.filter(m => getMeetingStatus(m.date) === 'upcoming').length;
  animateCounter('stat-total',    meetings.length);
  animateCounter('stat-today',    todayCount);
  animateCounter('stat-upcoming', upcomingCount);
}

// ===================== View / Filter Switching =====================

/**
 * switches the visible content section and updates sidebar active states.
 * @param {'meetings'|'invitations'} view
 */
function setActiveView(view) {
  console.log(`--- setActiveView called with: ${view} ---`);
  currentActiveView = view;

  const meetingsSection  = document.getElementById('meetings-section');
  const invSection       = document.getElementById('invitations-section');
  const navMeetings      = document.getElementById('nav-meetings');
  const navInvitations   = document.getElementById('nav-invitations');
  const filterSection    = document.getElementById('sidebar-filter-section');

  if (view === 'meetings') {
    if (meetingsSection) meetingsSection.style.display = '';
    if (invSection)      invSection.style.display = 'none';
    if (navMeetings)     navMeetings.classList.add('active');
    if (navInvitations)  navInvitations.classList.remove('active');
    if (filterSection)   filterSection.style.display = '';

    fetchMeetings(); // refresh meetings list in case there were changes while the user was viewing invitations
  } else {
    if (meetingsSection) meetingsSection.style.display = 'none';
    if (invSection)      invSection.style.display = '';
    if (navMeetings)     navMeetings.classList.remove('active');
    if (navInvitations)  navInvitations.classList.add('active');
    if (filterSection)   filterSection.style.display = 'none';
    // load invitations every time the user opens the section
    loadInvitations();
  }
}

/**
 * applies a client-side filter to the meetings grid.
 * @param {'all'|'today'|'upcoming'} filter
 */
function applyFilter(filter) {
  activeFilter = filter;

  ['filter-all', 'filter-today', 'filter-upcoming'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.classList.toggle('active', id === `filter-${filter}`);
  });

  if (filter === 'all') {
    renderMeetingsList(allMeetings, false);
  } else {
    const filtered = allMeetings.filter(m => getMeetingStatus(m.date) === filter);
    renderMeetingsList(filtered, false);
  }
}

function setupMeetingsView() {
  console.log('--- setupMeetingsView STARTED ---');
  // reset view state
  currentActiveView = 'meetings';
  activeFilter      = 'all';

  // greeting + date
  const greetingEl = document.getElementById('greeting-text');
  if (greetingEl) greetingEl.textContent = getGreeting();

  const pageDateEl = document.getElementById('page-date');
  if (pageDateEl) {
    pageDateEl.textContent = new Date().toLocaleDateString('en-US', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });
  }

  // sidebar user info + DiceBear avatar
  if (currentUser) {
    setAvatar(document.getElementById('sidebar-avatar-img'), currentUser.username);

    const sidebarUsername = document.getElementById('sidebar-username');
    const sidebarEmail    = document.getElementById('sidebar-email');
    if (sidebarUsername) sidebarUsername.textContent = currentUser.fullName || currentUser.username;
    if (sidebarEmail)    sidebarEmail.textContent = currentUser.username;
  }

  // logout
  const logoutBtn = document.getElementById('logout-button');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      sessionToken  = null;
      currentUser   = null;
      allMeetings   = [];
      allUsers      = [];
      navigateTo('#/login');
    });
  }

  // sidebar navigation
  const navMeetings    = document.getElementById('nav-meetings');
  const navInvitations = document.getElementById('nav-invitations');
  if (navMeetings)    navMeetings.addEventListener('click',    () => setActiveView('meetings'));
  if (navInvitations) navInvitations.addEventListener('click', () => setActiveView('invitations'));

  // sidebar filter items
  const filterAll      = document.getElementById('filter-all');
  const filterToday    = document.getElementById('filter-today');
  const filterUpcoming = document.getElementById('filter-upcoming');
  if (filterAll)      filterAll.addEventListener('click',      () => applyFilter('all'));
  if (filterToday)    filterToday.addEventListener('click',    () => applyFilter('today'));
  if (filterUpcoming) filterUpcoming.addEventListener('click', () => applyFilter('upcoming'));

  // search
  const searchInput = document.getElementById('search-input');
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      const query = searchInput.value.toLowerCase().trim();
      if (!query) {
        renderMeetingsList(allMeetings, false); // if search is cleared, show the full list again
        return;
      }
      const filtered = allMeetings.filter(m =>
        (m.title       && m.title.toLowerCase().includes(query))       ||
        (m.location    && m.location.toLowerCase().includes(query))    ||
        (m.date        && m.date.includes(query))                      ||
        (m.description && m.description.toLowerCase().includes(query))
      );
      renderMeetingsList(filtered, false); // render the filtered list without re-applying the date filter (the search should override the date filter)
    });
  }

  // new meeting button
  const openAddBtn = document.getElementById('open-add-panel');
  if (openAddBtn) openAddBtn.addEventListener('click', () => openPanel());

  setupPanel(); // sets up the add/edit meeting slide panel (event listeners, form handling)
  setupDetailModal(); // sets up the meeting details modal (event listeners, dynamic content population)
  prefetchUsers(); // pre-load user list so participant names resolve on cards
  //fetchMeetings(); // load the relevant meetings for the user and render them
  setActiveView('meetings');
  fetchInvitationBadge(); // load pending invite count for sidebar badge
}

// ===================== slide panel (add / edit) =====================

function openPanel(meeting = null) {
  const panel       = document.getElementById('meeting-panel');
  const overlay     = document.getElementById('panel-overlay');
  const panelHeading = document.getElementById('panel-heading');
  const submitBtn   = document.getElementById('submit-meeting');

  document.getElementById('meeting-form').reset();
  document.getElementById('edit-meeting-id').value = '';
  clearPanelErrors();

  if (meeting) {
    panelHeading.textContent = 'Edit Meeting';
    submitBtn.textContent    = 'Save Changes';
    document.getElementById('edit-meeting-id').value        = meeting.id;
    document.getElementById('panel-title-input').value      = meeting.title || '';
    document.getElementById('panel-date').value             = meeting.date || '';
    document.getElementById('panel-time').value             = meeting.time || '';
    document.getElementById('panel-location').value         = meeting.location || '';
    document.getElementById('panel-description').value      = meeting.description || '';
  } else {
    panelHeading.textContent = 'New Meeting';
    submitBtn.textContent    = 'Save Meeting';
  }

  panel.classList.add('open');
  overlay.classList.add('visible');

  // load participant picker (async — populates while panel is sliding in)
  const preSelected = meeting?.participants || [];
  loadParticipantPicker(preSelected);
}

function closePanel() {
  const panel   = document.getElementById('meeting-panel');
  const overlay = document.getElementById('panel-overlay');
  if (panel)   panel.classList.remove('open');
  if (overlay) overlay.classList.remove('visible');
}

function clearPanelErrors() {
  ['panel-title-input', 'panel-date', 'panel-time', 'panel-location'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.borderColor = '';
  });
  ['panel-title-error', 'panel-date-error', 'panel-time-error', 'panel-location-error'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.classList.remove('visible');
  });
}

function setupPanel() {
  const closeBtn  = document.getElementById('close-panel');
  const cancelBtn = document.getElementById('cancel-panel');
  const overlay   = document.getElementById('panel-overlay');
  const submitBtn = document.getElementById('submit-meeting');

  if (closeBtn)  closeBtn.addEventListener('click',  closePanel);
  if (cancelBtn) cancelBtn.addEventListener('click', closePanel);
  if (overlay)   overlay.addEventListener('click',   closePanel);
  if (submitBtn) submitBtn.addEventListener('click', handlePanelSubmit);
}

function handlePanelSubmit() {
  const titleVal       = document.getElementById('panel-title-input').value.trim();
  const dateVal        = document.getElementById('panel-date').value;
  const timeVal        = document.getElementById('panel-time').value;
  const locationVal    = document.getElementById('panel-location').value.trim();
  const descriptionVal = document.getElementById('panel-description').value.trim();
  const editId         = document.getElementById('edit-meeting-id').value;
  const participantIds = getSelectedParticipants();

  let valid = true;
  const fields = [
    ['panel-title-input', 'panel-title-error',    titleVal],
    ['panel-date',        'panel-date-error',     dateVal],
    ['panel-time',        'panel-time-error',     timeVal],
    ['panel-location',    'panel-location-error', locationVal],
  ];

  fields.forEach(([inputId, errorId, val]) => {
    const input = document.getElementById(inputId);
    const error = document.getElementById(errorId);
    if (!val) {
      if (input) input.style.borderColor = 'var(--danger)';
      if (error) error.classList.add('visible');
      valid = false; // if any field is invalid, the whole form is invalid. avoid race conditions 
    } else {
      if (input) input.style.borderColor = '';
      if (error) error.classList.remove('visible');
    }
  });

  if (!valid) return;

  const submitBtn = document.getElementById('submit-meeting');
  submitBtn.disabled = true;
  submitBtn.innerHTML = '<span class="spinner"></span> Saving…';

  const payload = { 
    title: titleVal, date: dateVal, time: timeVal,
    location: locationVal, description: descriptionVal,
    participants: participantIds
  };

  if (editId) {
    // ── PUT ──
    const xhr = new FXMLHttpRequest();
    xhr.open('PUT', `/api/meetings/${editId}`);
    xhr.setRequestHeader('sessionToken', sessionToken);

    xhr.onreadystatechange = () => {
      if (xhr.readyState !== 4) return;

      submitBtn.disabled = false; // re-enable the button regardless of success or failure to allow retrying
      submitBtn.textContent = 'Save Changes';

      if (xhr.status === 0 || xhr.status === "0") {
        showToast('Network error — request timed out. Please try again.', 'error');
        return;
      }

      if (xhr.status === 200) {
        const updated = JSON.parse(xhr.responseText).data;
        const idx = allMeetings.findIndex(m => String(m.id) === String(updated.id));
        if (idx !== -1) allMeetings[idx] = updated;
        renderMeetingsList(allMeetings);
        closePanel();
        showToast('Meeting updated!', 'success');
        fetchInvitationBadge(); // new invites may have been created
      } else {
        showToast(`Error updating meeting (${xhr.status})`, 'error');
      }
    };
    xhr.send(payload);

  } else {
    // ── POST ──
    const xhr = new FXMLHttpRequest();
    xhr.open('POST', '/api/meetings');
    xhr.setRequestHeader('sessionToken', sessionToken);

    xhr.onreadystatechange = () => {
      if (xhr.readyState !== 4) return;
      submitBtn.disabled = false; // re-enable the button regardless of success or failure to allow retrying
      submitBtn.textContent = 'Save Meeting';

      if (xhr.status == 0) {
        showToast('Network error — request timed out. Please try again.', 'error');
        return;
      }
      if (xhr.status === 201) { // adding the new meeting to the top of the list without refetching from the server to avoid an extra round-trip
        const newMeeting = JSON.parse(xhr.responseText).data;
        allMeetings.unshift(newMeeting);
        renderMeetingsList(allMeetings);
        closePanel();
        showToast('Meeting added!', 'success');
        if (participantIds.length > 0) {
          showToast(`Invitations sent to ${participantIds.length} participant${participantIds.length > 1 ? 's' : ''}.`, 'info');
        }
      } else {
        showToast(`Error creating meeting (${xhr.status})`, 'error');
      }
    };
    xhr.send(payload);
  }
}

// ===================== Participant Picker =====================

/**
 * loads all users from the server and renders the participant picker.
 * @param {number[]} selectedIds - Pre-selected participant IDs (for edit mode)
 */
function loadParticipantPicker(selectedIds = []) {
  const listEl = document.getElementById('participant-list');
  if (!listEl) return;
  listEl.innerHTML = '<div class="participant-list-empty">Loading users…</div>';

  const xhr = new FXMLHttpRequest();
  xhr.open('GET', '/api/users');
  xhr.setRequestHeader('sessionToken', sessionToken);

  xhr.onreadystatechange = () => {
    if (xhr.readyState !== 4) return;

    if (xhr.status === 200) {
      const users = JSON.parse(xhr.responseText).data;
      allUsers = users;
      renderParticipantPicker(users, selectedIds);
    } else if (xhr.status === 0) {
      listEl.innerHTML = '<div class="participant-list-empty">Network error loading users.</div>';
    } else {
      listEl.innerHTML = '<div class="participant-list-empty">Could not load users.</div>';
    }
  };

  xhr.send();
}

/**
 * renders the participant picker list and updates the selected-chips section.
 * @param {Object[]} users
 * @param {number[]} selectedIds
 */
function renderParticipantPicker(users, selectedIds = []) {
  const listEl     = document.getElementById('participant-list');
  const chipsEl    = document.getElementById('selected-participants');
  if (!listEl || !chipsEl) return;

  if (users.length === 0) {
    listEl.innerHTML = '<div class="participant-list-empty">No other users registered yet.</div>';
    chipsEl.innerHTML = '';
    return;
  }

  const selectedSet = new Set(selectedIds.map(id => String(id)));

  // render list rows
  listEl.innerHTML = '';
  users.forEach(user => {
    const seed = user.username; // random seed comment — seed = user's email for consistency
    const url  = `https://api.dicebear.com/9.x/avataaars/svg?seed=${seed}`;

    const row = document.createElement('label');
    row.className = 'participant-row';
    row.innerHTML = `
      <input type="checkbox" class="participant-checkbox" value="${user.id}"
             ${selectedSet.has(String(user.id)) ? 'checked' : ''}>
      <img src="${url}" class="participant-avatar" alt="${user.fullName}">
      <span class="participant-name">${user.fullName}</span>
      <span class="participant-email">${user.username}</span>
    `;
    row.querySelector('input').addEventListener('change', () => updateSelectedChips());
    listEl.appendChild(row);
  });

  updateSelectedChips();
}

/**
 * re-renders the selected-participant chips above the picker list.
 */
function updateSelectedChips() {
  const chipsEl = document.getElementById('selected-participants');
  if (!chipsEl) return;

  const checked = Array.from(
    document.querySelectorAll('.participant-checkbox:checked')
  );

  chipsEl.innerHTML = '';
  checked.forEach(input => {
    const user = allUsers.find(u => String(u.id) === String(input.value));
    if (!user) return;

    const seed = user.username; // random seed comment
    const url  = `https://api.dicebear.com/9.x/avataaars/svg?seed=${seed}`;

    const chip = document.createElement('span');
    chip.className = 'selected-chip';
    chip.innerHTML = `<img src="${url}" alt="${user.fullName}"> ${user.fullName}`;
    chipsEl.appendChild(chip);
  });
}

/**
 * returns the list of selected participant IDs from the picker checkboxes.
 * @returns {number[]}
 */
function getSelectedParticipants() {
  return Array.from(
    document.querySelectorAll('.participant-checkbox:checked')
  ).map(input => parseInt(input.value, 10));
}

// ===================== Detail Modal =====================

function openDetailModal(meeting) {
  const modal = document.getElementById('detail-modal');
  const modalTitle = document.getElementById('modal-meeting-title');
  const modalBody = document.getElementById('modal-body');

  // set the modal title
  modalTitle.textContent = meeting.title;

  // clear the modal body
  modalBody.innerHTML = '';

  // clone the template
  const template = document.getElementById('detail-modal-template');
  const content = document.importNode(template.content, true);

  // populate the template
  const statusBadge = content.getElementById('status-badge');
  const invitedBadge = content.getElementById('invited-badge');
  const dateTime = content.getElementById('date-time');
  const location = content.getElementById('location');
  const descriptionSection = content.getElementById('description-section');
  const description = content.getElementById('description');
  const participantsSection = content.getElementById('participants-section');
  const participantsContainer = content.getElementById('participants-container');
  const createdAt = content.getElementById('created-at');

  // set the status badge
  const status = getMeetingStatus(meeting.date);
  const badgeMap = {
    today: ['badge-today', 'Today'],
    upcoming: ['badge-upcoming', 'Upcoming'],
    past: ['badge-past', 'Past'],
  };
  const [badgeClass, badgeText] = badgeMap[status] || badgeMap.upcoming;
  statusBadge.textContent = badgeText;
  statusBadge.classList.add(badgeClass);

  // show the invited badge if applicable
  if (meeting.isInvited) {
    invitedBadge.style.display = 'inline-flex';
  }

  // set the date and time
  dateTime.textContent = `${formatDate(meeting.date)} at ${meeting.time || '—'}`;

  // set the location
  location.textContent = meeting.location || '—';

  // set the description (hide if empty)
  if (meeting.description) {
    description.textContent = meeting.description;
  } else {
    descriptionSection.style.display = 'none';
  }

  // populate participants (hide section if no participants)
  if (meeting.participants && meeting.participants.length > 0) {
    meeting.participants.forEach(pid => {
      const user = allUsers.find(u => String(u.id) === String(pid));
      const seed = user ? user.username : String(pid);
      const name = user ? user.fullName : `User #${pid}`;
      const url = `https://api.dicebear.com/9.x/avataaars/svg?seed=${seed}`;

      const img = document.createElement('img');
      img.src = url;
      img.alt = name;
      img.title = name;
      img.style.width = '24px';
      img.style.height = '24px';
      img.style.borderRadius = '50%';
      img.style.marginRight = '4px';

      participantsContainer.appendChild(img);
    });
  } else {
    participantsSection.style.display = 'none';
  }

  // set the created at timestamp
  createdAt.textContent = meeting.createdAt
    ? new Date(meeting.createdAt).toLocaleString()
    : '—';

  // append the populated content to the modal body
  modalBody.appendChild(content);

  // show the modal
  modal.classList.add('visible');
}

function closeDetailModal() {
  const modal = document.getElementById('detail-modal');
  if (modal) modal.classList.remove('visible');
}

function setupDetailModal() {
  const closeBtn = document.getElementById('close-modal');
  const modal    = document.getElementById('detail-modal');
  if (closeBtn) closeBtn.addEventListener('click', closeDetailModal);
  if (modal)    modal.addEventListener('click', e => { if (e.target === modal) closeDetailModal(); });
}

// ===================== View Single Meeting (GET /:id) =====================

function viewMeeting(meetingId) {
  const xhr = new FXMLHttpRequest();
  xhr.open('GET', `/api/meetings/${meetingId}`);
  xhr.setRequestHeader('sessionToken', sessionToken);

  xhr.onreadystatechange = () => {
    if (xhr.readyState !== 4) return;

    if (xhr.status === 200) {
      const meeting = JSON.parse(xhr.responseText).data;
      openDetailModal(meeting);
    } else if (xhr.status === 0) {
      showToast('Network error — could not load meeting details. Please try again.', 'error');
    } else {
      showToast(`Error loading meeting (${xhr.status})`, 'error');
    }
  };

  xhr.send();
}

// ===================== Pre-fetch Users (for participant name resolution) =====================

/**
 * Silently fetches all users into the allUsers cache.
 * Once loaded, re-renders the meetings list so participant names appear on cards.
 */
function prefetchUsers() {
  const xhr = new FXMLHttpRequest();
  xhr.open('GET', '/api/users');
  xhr.setRequestHeader('sessionToken', sessionToken);

  xhr.onreadystatechange = () => {
    if (xhr.readyState !== 4) return;
    if (xhr.status === 200) { 
      allUsers = JSON.parse(xhr.responseText).data;
      // Re-render cards now that we have names
      //if (allMeetings.length > 0) renderMeetingsList(allMeetings, false);
    }
  };

  xhr.send();
}

// ===================== Fetch All Meetings =====================

let isFetchingMeetings = false; // flag to prevent multiple simultaneous fetches if the user clicks around rapidly

function fetchMeetings() {
  console.trace('--- fetchMeetings FIRED! ---');

  if (isFetchingMeetings) return; // prevent multiple simultaneous fetches
  isFetchingMeetings = true;

  const grid = document.getElementById('meetings-list');
  if (grid) {
    grid.innerHTML = `
      <div class="loading-text">
        <span class="spinner"></span> Loading meetings…
      </div>`;
  }

  const xhr = new FXMLHttpRequest();
  xhr.open('GET', '/api/meetings');
  xhr.setRequestHeader('sessionToken', sessionToken);

  xhr.onreadystatechange = () => {
    if (xhr.readyState !== 4) return;
    isFetchingMeetings = false; // allow future fetches

    if (xhr.status === 200) {
      const meetings = JSON.parse(xhr.responseText).data;
      renderMeetingsList(meetings);
    } else if (xhr.status === 0) {
      if (grid) {
        grid.replaceChildren();
        const errorDiv = document.createElement('div');
        errorDiv.className = 'meetings-empty';
        errorDiv.textContent = 'Network error: Could not load meetings. Please try again.';
        grid.appendChild(errorDiv);
      }
      showToast('Network error loading meetings. Please refresh.', 'error');
    } else {
      if (grid) grid.innerHTML = '';
      showToast(`Error loading meetings (${xhr.status})`, 'error');
    }
  };

  xhr.send();
}

// ===================== Invitations =====================

/**
 * Loads the pending invitation count and updates the sidebar badge.
 * Called on meetings view setup and after accepting/declining.
 */

function fetchInvitationBadge() {
  const xhr = new FXMLHttpRequest();
  xhr.open('GET', '/api/invitations');
  xhr.setRequestHeader('sessionToken', sessionToken);

  xhr.onreadystatechange = () => {
    if (xhr.readyState !== 4) return;
    if (xhr.status !== 200) return;

    const invitations  = JSON.parse(xhr.responseText).data;
    const pendingCount = invitations.filter(inv => inv.status === 'pending').length;
    updateInvitationBadge(pendingCount);
  };

  xhr.send();
}

function updateInvitationBadge(count) {
  const badge = document.getElementById('invite-badge');
  if (!badge) return;
  if (count > 0) {
    badge.textContent  = count;
    badge.style.display = 'inline-flex';
  } else {
    badge.style.display = 'none';
  }
}

/**
 * Fetches invitations from the server and renders them in #invitations-section.
 */
let isFetchingInvitations = false; // flag to prevent multiple simultaneous fetches if the user clicks around rapidly

function loadInvitations() {
  if (isFetchingInvitations) return; // prevent multiple simultaneous fetches if the user clicks around
  isFetchingInvitations = true;

  const section = document.getElementById('invitations-section');
  if (!section) return;
  section.innerHTML = `
    <div class="loading-text">
      <span class="spinner"></span> Loading invitations…
    </div>`;

  const xhr = new FXMLHttpRequest();
  xhr.open('GET', '/api/invitations');
  xhr.setRequestHeader('sessionToken', sessionToken);

  xhr.onreadystatechange = () => {
    if (xhr.readyState !== 4) return;
    isFetchingInvitations = false; // allow future fetches when user re-opens the section

    if (xhr.status === 200) {
      const invitations = JSON.parse(xhr.responseText).data;
      renderInvitations(invitations);
    } else if (xhr.status === 0) {
      section.innerHTML = `
        <div class="meetings-empty">
          <div class="meetings-empty-text">Network error</div>
          <div class="meetings-empty-sub">Could not load invitations. Please try again.</div>
        </div>`;
    } else {
      section.innerHTML = '';
      showToast(`Error loading invitations (${xhr.status})`, 'error');
    }
  };

  xhr.send();
}

/**
 * Renders all invitations into #invitations-section.
 * @param {Object[]} invitations - Enriched invitation objects from the server
 */
function renderInvitations(invitations) {
  const section = document.getElementById('invitations-section');
  if (!section) return;
  section.innerHTML = '';

  if (invitations.length === 0) {
    section.innerHTML = `
      <div class="meetings-empty">
        <div class="meetings-empty-text">No invitations yet</div>
        <div class="meetings-empty-sub">When someone invites you to a meeting, it'll appear here</div>
      </div>`;
    return;
  }

  const pending   = invitations.filter(inv => inv.status === 'pending');
  const responded = invitations.filter(inv => inv.status !== 'pending');

  if (pending.length > 0) {
    const label = document.createElement('div');
    label.className = 'invite-section-label';
    label.textContent = `Awaiting Response (${pending.length})`;
    section.appendChild(label);
    pending.forEach(inv => section.appendChild(createInviteCard(inv)));
  }

  if (responded.length > 0) {
    const label = document.createElement('div');
    label.className = 'invite-section-label';
    label.textContent = 'Past Invitations';
    section.appendChild(label);
    responded.forEach(inv => section.appendChild(createInviteCard(inv)));
  }
}

/**
 * Creates a single invitation card DOM element.
 * @param {Object} inv - Enriched invitation object
 * @returns {HTMLElement}
 */
function createInviteCard(inv) {
  const template = document.getElementById('invite-card-template');
  const content = document.importNode(template.content, true);

  const card = content.querySelector('.invite-card');
  const avatarImg = card.querySelector('.invite-avatar');
  const senderNameEl = card.querySelector('.invite-from-name');
  const statusBadge = card.querySelector('.meeting-status-badge');
  const meetingTitleEl = card.querySelector('.invite-meeting-title');
  const meetingMetaEl = card.querySelector('.invite-meeting-meta');
  const actionsContainer = card.querySelector('.invite-actions');
  const acceptBtn = card.querySelector('.btn-invite-accept');
  const declineBtn = card.querySelector('.btn-invite-decline');

  // Set the card's status class
  card.classList.add(`status-${inv.status}`);

  // Set the sender's avatar and name
  const senderSeed = inv.fromUser?.username || 'user';
  avatarImg.src = `https://api.dicebear.com/9.x/avataaars/svg?seed=${senderSeed}`;
  avatarImg.alt = inv.fromUser?.fullName || 'Someone';
  senderNameEl.textContent = inv.fromUser?.fullName || 'Someone';

  // Set the status badge
  const badgeMap = {
    pending: ['badge-upcoming', 'Pending'],
    accepted: ['badge-today', 'Accepted'],
    declined: ['badge-past', 'Declined'],
  };
  const [badgeClass, badgeText] = badgeMap[inv.status] || badgeMap.pending;
  statusBadge.textContent = badgeText;
  statusBadge.classList.add(badgeClass);

  // Set the meeting title and metadata
  meetingTitleEl.textContent = inv.meeting?.title || 'Unknown meeting';
  const meetingDate = inv.meeting ? formatDate(inv.meeting.date) : '—';
  const meetingTime = inv.meeting?.time ? ` · ${inv.meeting.time}` : '';
  const meetingLoc = inv.meeting?.location ? ` · ${inv.meeting.location}` : '';
  meetingMetaEl.textContent = `${meetingDate}${meetingTime}${meetingLoc}`;

  // Show or hide the actions container based on status
  if (inv.status === 'pending') {
    actionsContainer.style.display = 'flex';
    acceptBtn.addEventListener('click', () => respondToInvite(inv.id, 'accepted', card));
    declineBtn.addEventListener('click', () => respondToInvite(inv.id, 'declined', card));
  } else {
    actionsContainer.style.display = 'none';
  }

  return card;
}

/**
 * Sends a PUT /api/invitations/:id to accept or decline.
 * @param {number} inviteId
 * @param {'accepted'|'declined'} status
 * @param {HTMLElement} cardEl
 */
function respondToInvite(inviteId, status, cardEl) {
  const acceptBtn  = cardEl.querySelector('.btn-invite-accept');
  const declineBtn = cardEl.querySelector('.btn-invite-decline');
  if (acceptBtn)  acceptBtn.disabled  = true;
  if (declineBtn) declineBtn.disabled = true;
  const activeBtn = status === 'accepted' ? acceptBtn : declineBtn;
  if (activeBtn) activeBtn.innerHTML = '<span class="spinner"></span>';

  const xhr = new FXMLHttpRequest();
  xhr.open('PUT', `/api/invitations/${inviteId}`);
  xhr.setRequestHeader('sessionToken', sessionToken);

  xhr.onreadystatechange = () => {
    if (xhr.readyState !== 4) return;

    if (xhr.status === 200) {
      const msg = status === 'accepted'
        ? 'Invitation accepted! The meeting is now in your list.'
        : 'Invitation declined.';
      showToast(msg, status === 'accepted' ? 'success' : 'info');

      // Refresh invitations view + sidebar badge
      loadInvitations();
      fetchInvitationBadge();

      // If accepted, re-fetch meetings so the accepted one appears
      if (status === 'accepted') fetchMeetings();
    } else if (xhr.status === 0) {
      showToast('Network error. Please try again.', 'error');
      if (acceptBtn)  acceptBtn.disabled  = false;
      if (declineBtn) declineBtn.disabled = false;
      if (acceptBtn)  acceptBtn.textContent  = 'Accept';
      if (declineBtn) declineBtn.textContent = 'Decline';
    } else {
      showToast(`Error updating invitation (${xhr.status})`, 'error');
    }
  };

  xhr.send({ status });
}

// ===================== Render Meetings =====================

function formatDate(dateStr) {
  if (!dateStr) return '—';
  try {
    const [y, m, d] = dateStr.split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric'
    });
  } catch {
    return dateStr;
  }
}

function updateMeetingsCount(count) {
  const chip  = document.getElementById('meetings-count');
  if (chip)  chip.textContent = `${count} meeting${count !== 1 ? 's' : ''}`;
  const badge = document.getElementById('sidebar-meetings-count');
  if (badge) badge.textContent = count;
}

function renderMeetingsList(meetings, updateCache = true) {
  console.log('--- renderMeetingsList DRAWING TO SCREEN ---');

  const grid = document.getElementById('meetings-list');
  const emptyState = document.getElementById('empty-state-container');
  if (!grid) return;

  if (updateCache) {
    allMeetings = meetings;
    updateStats(meetings);
  }
  updateMeetingsCount(meetings.length);

  grid.textContent = ''; 

  if (meetings.length === 0) {

    if (emptyState) emptyState.style.display = 'flex'; 
    return;
  }

  if (emptyState) emptyState.style.display = 'none'; 
  meetings.forEach(meeting => addMeetingCard(meeting));
}

/**
 * Creates a single meeting card and appends it to the grid.
 * @param {Object} meeting
 */
function addMeetingCard(meeting) {
  const grid     = document.getElementById('meetings-list');
  const template = document.getElementById('meeting-card-template');
  if (!grid || !template) return;

  const clone = template.content.cloneNode(true);
  const card  = clone.querySelector('.meeting-card');

  const status = getMeetingStatus(meeting.date);
  card.dataset.status = status;

  const accentMap = { today: 'var(--today)', upcoming: 'var(--primary)', past: 'rgba(75,85,99,0.5)' };
  card.style.setProperty('--card-accent', accentMap[status] || accentMap.upcoming);

  // Title
  clone.querySelector('.meeting-title').textContent = meeting.title;

  // Status badge — show "Invited" if meeting came via accepted invitation
  const badge = clone.querySelector('.meeting-status-badge');
  if (meeting.isInvited) {
    badge.className   = 'meeting-status-badge badge-invited';
    badge.textContent = 'Invited';
  } else {
    const badgeMap = {
      today:    ['badge-today',    'Today'],
      upcoming: ['badge-upcoming', 'Upcoming'],
      past:     ['badge-past',     'Past'],
    };
    const [badgeClass, badgeText] = badgeMap[status] || badgeMap.upcoming;
    badge.className   = `meeting-status-badge ${badgeClass}`;
    badge.textContent = badgeText;
  }

  // Date chip
  const dateChip = clone.querySelector('.meeting-date-chip');
  dateChip.textContent = formatDate(meeting.date);
  if (status === 'today') dateChip.classList.add('chip-today');
  else if (status === 'past') dateChip.classList.add('chip-past');

  clone.querySelector('.meeting-time-display').textContent     = meeting.time || '—';
  clone.querySelector('.meeting-location-display').textContent = meeting.location || '—';

  // Participants row
  const participantsEl = clone.querySelector('.meeting-participants');
  participantsEl.textContent = '';
  if (meeting.participants && meeting.participants.length > 0) {
    meeting.participants.forEach(pid => {
      const user = allUsers.find(u => String(u.id) === String(pid))
                || (currentUser && String(currentUser.id) === String(pid) ? currentUser : null);
      const seed = user ? user.username : String(pid);
      const name = user ? user.fullName  : `User #${pid}`;
      const url  = `https://api.dicebear.com/9.x/avataaars/svg?seed=${seed}`;

      const participantSpan = document.createElement('span');
      participantSpan.className = 'meeting-participant';

      const avatarImg = document.createElement('img');
      avatarImg.src = url;
      avatarImg.alt = name;
      avatarImg.title = name;
      avatarImg.className = 'meeting-participant-avatar';

      const nameSpan = document.createElement('span');
      nameSpan.textContent = name;
      nameSpan.className = 'meeting-participant-name';

      participantSpan.appendChild(avatarImg);
      participantSpan.appendChild(nameSpan);
      participantsEl.appendChild(participantSpan);
    });
  } else {
    participantsEl.style.display = 'none';
  }

  // View + title click → detail modal
  clone.querySelector('.meeting-title').addEventListener('click', () => viewMeeting(meeting.id));
  clone.querySelector('.btn-card-view').addEventListener('click', () => viewMeeting(meeting.id));

  // Edit button  pre-populated panel (only for meetings the user owns)
  const editBtn = clone.querySelector('.btn-card-edit');
  if (meeting.isInvited) {
    editBtn.disabled = true;
    editBtn.title    = "You can only edit your own meetings";
    editBtn.style.opacity = '0.35';
  } else {
    editBtn.addEventListener('click', () => openPanel(meeting));
  }

  // Delete — two-step confirmation (only for owned meetings)
  const deleteBtn = clone.querySelector('.btn-card-delete');
  if (meeting.isInvited) {
    deleteBtn.disabled = true;
    deleteBtn.title    = "You can only delete your own meetings";
    deleteBtn.style.opacity = '0.35';
  } else {
    let confirmTimer = null;

    deleteBtn.addEventListener('click', () => {
      if (!deleteBtn.classList.contains('confirming')) {
        deleteBtn.classList.add('confirming');
        deleteBtn.textContent = 'Confirm?';
        confirmTimer = setTimeout(() => {
          if (deleteBtn.classList.contains('confirming')) {
            deleteBtn.classList.remove('confirming');
            deleteBtn.textContent = 'Delete';
          }
        }, 3000);
        return;
      }

      clearTimeout(confirmTimer);
      deleteBtn.classList.remove('confirming');
      deleteBtn.disabled    = true;
      deleteBtn.textContent = '…';

      const xhr = new FXMLHttpRequest();
      xhr.open('DELETE', `/api/meetings/${meeting.id}`);
      xhr.setRequestHeader('sessionToken', sessionToken);

      xhr.onreadystatechange = () => {
        if (xhr.readyState !== 4) return;

        if (xhr.status === 200) {
          allMeetings = allMeetings.filter(m => String(m.id) !== String(meeting.id));
          card.style.opacity    = '0';
          card.style.transform  = 'scale(0.95)';
          card.style.transition = 'all 0.2s ease';
          setTimeout(() => {
            card.remove();
            updateMeetingsCount(allMeetings.length);
            updateStats(allMeetings);
            const g = document.getElementById('meetings-list');
            const emptyState = document.getElementById('empty-state-container');
            if (g && allMeetings.length === 0 && emptyState) {
              g.textContent = '';
              emptyState.style.display = 'flex';
            }
          }, 200);
          showToast('Meeting deleted.', 'info');
        } else if (xhr.status === 0) {
          showToast('Network error — could not delete. Please try again.', 'error');
          deleteBtn.disabled    = false;
          deleteBtn.textContent = 'Delete';
        } else {
          showToast(`Delete failed (${xhr.status})`, 'error');
          deleteBtn.disabled    = false;
          deleteBtn.textContent = 'Delete';
        }
      };

      xhr.send();
    });
  }

  grid.appendChild(clone);
}


// ===================== Initialize Router =====================


setTimeout(() => {
  console.log('🚨 [DEBUG BOOT] Testing showToast on page load...');
  showToast('Test Toast Works!', 'info');
}, 2000);

initRouter(handleRoute);
