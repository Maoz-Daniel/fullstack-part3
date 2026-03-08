// ===================== Main Entry Point =====================
// Bootstraps the app: seeds DB, wires the router, and owns the top-level
// view orchestration (route handling, sidebar navigation, search/filter).

import { initRouter, navigateTo }                         from './router.js';
import { initSeed }                                       from '../db/seed.js';
import { sessionToken, currentUser, allMeetings,
         setSessionToken, setCurrentUser,
         setAllMeetings, setAllUsers }                    from './state.js';
import { getMeetingStatus, setAvatar }                    from './utils.js';
import { setupLoginView, setupRegisterView }              from './auth.js';
import { getGreeting, fetchMeetings,
         renderMeetingsList, prefetchUsers }              from './meetings.js';
import { setupPanel, openPanel }                          from './panel.js';
import { setupDetailModal }                               from './modal.js';
import { fetchInvitationBadge, loadInvitations }         from './invitations.js';

initSeed();

// ── Router ─────────────────────────────────────────────────────────────────

function handleRoute(currentRoute) {
  switch (currentRoute) {
    case '#/login':
      if (sessionToken) { navigateTo('#/meetings'); return; }
      setupLoginView();
      break;
    case '#/register':
      setupRegisterView();
      break;
    case '#/meetings':
      if (!sessionToken) { navigateTo('#/login'); }
      else               { setupMeetingsView(); }
      break;
    default:
      navigateTo('#/login');
  }
}

// ── View switching ─────────────────────────────────────────────────────────

function setActiveView(view) {
  const meetingsSection = document.getElementById('meetings-section');
  const invSection      = document.getElementById('invitations-section');
  const navMeetings     = document.getElementById('nav-meetings');
  const navInvitations  = document.getElementById('nav-invitations');
  const filterSection   = document.getElementById('sidebar-filter-section');

  if (view === 'meetings') {
    if (meetingsSection) meetingsSection.style.display = '';
    if (invSection)      invSection.style.display      = 'none';
    if (navMeetings)     navMeetings.classList.add('active');
    if (navInvitations)  navInvitations.classList.remove('active');
    if (filterSection)   filterSection.style.display   = '';
    fetchMeetings();
  } else {
    if (meetingsSection) meetingsSection.style.display = 'none';
    if (invSection)      invSection.style.display      = '';
    if (navMeetings)     navMeetings.classList.remove('active');
    if (navInvitations)  navInvitations.classList.add('active');
    if (filterSection)   filterSection.style.display   = 'none';
    loadInvitations();
  }
}

// Filter 

function applyFilter(filter) {
  ['filter-all', 'filter-today', 'filter-upcoming'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.classList.toggle('active', id === `filter-${filter}`);
  });

  if (filter === 'all') {
    renderMeetingsList(allMeetings, false);
  } else {
    renderMeetingsList(
      allMeetings.filter(m => getMeetingStatus(m.date) === filter),
      false
    );
  }
}

// Meetings view setup 

function setupMeetingsView() {
  // Greeting + date
  const greetingEl = document.getElementById('greeting-text');
  if (greetingEl) greetingEl.textContent = getGreeting();

  const pageDateEl = document.getElementById('page-date');
  if (pageDateEl) {
    pageDateEl.textContent = new Date().toLocaleDateString('en-US', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });
  }

  // Sidebar user info
  if (currentUser) {
    setAvatar(document.getElementById('sidebar-avatar-img'), currentUser.username);
    const sidebarUsername = document.getElementById('sidebar-username');
    const sidebarEmail    = document.getElementById('sidebar-email');
    if (sidebarUsername) sidebarUsername.textContent = currentUser.fullName || currentUser.username;
    if (sidebarEmail)    sidebarEmail.textContent    = currentUser.username;
  }

  // Logout
  const logoutBtn = document.getElementById('logout-button');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      setSessionToken(null);
      setCurrentUser(null);
      setAllMeetings([]);
      setAllUsers([]);
      localStorage.removeItem('sessionToken');
      localStorage.removeItem('currentUser');
      navigateTo('#/login');
    });
  }

  // Sidebar nav
  const navMeetings    = document.getElementById('nav-meetings');
  const navInvitations = document.getElementById('nav-invitations');
  if (navMeetings)    navMeetings.addEventListener('click',    () => setActiveView('meetings'));
  if (navInvitations) navInvitations.addEventListener('click', () => setActiveView('invitations'));

  // Sidebar filters
  const filterAll      = document.getElementById('filter-all');
  const filterToday    = document.getElementById('filter-today');
  const filterUpcoming = document.getElementById('filter-upcoming');
  if (filterAll)      filterAll.addEventListener('click',      () => applyFilter('all'));
  if (filterToday)    filterToday.addEventListener('click',    () => applyFilter('today'));
  if (filterUpcoming) filterUpcoming.addEventListener('click', () => applyFilter('upcoming'));

  // Search
  const searchInput = document.getElementById('search-input');
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      const query = searchInput.value.toLowerCase().trim();
      if (!query) { renderMeetingsList(allMeetings, false); return; }
      renderMeetingsList(
        allMeetings.filter(m =>
          (m.title       && m.title.toLowerCase().includes(query))       ||
          (m.location    && m.location.toLowerCase().includes(query))    ||
          (m.date        && m.date.includes(query))                      ||
          (m.description && m.description.toLowerCase().includes(query))
        ),
        false
      );
    });
  }

  // New meeting button
  const openAddBtn = document.getElementById('open-add-panel');
  if (openAddBtn) openAddBtn.addEventListener('click', () => openPanel());

  setupPanel();
  setupDetailModal();
  prefetchUsers();
  setActiveView('meetings');
  fetchInvitationBadge();
}

// Boot 

initRouter(handleRoute);
