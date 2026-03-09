// Meetings - Fetch / Render / Stats 


import { FXMLHttpRequest }                               from '../comm/fajax.js';
import { sessionToken, allMeetings, allUsers, currentUser,
         setAllMeetings, setAllUsers }                   from './state.js';
import { showToast }                                     from './toast.js';
import { getMeetingStatus, formatDate, animateCounter }  from './utils.js';
import { openPanel }                                     from './panel.js';
import { viewMeeting }                                   from './modal.js';

// Greeting 

export function getGreeting() {
  const hour      = new Date().getHours();
  const firstName = currentUser
    ? (currentUser.fullName || currentUser.username).split(' ')[0]
    : '';
  let base;
  if (hour < 12)      base = 'Good morning';
  else if (hour < 17) base = 'Good afternoon';
  else                base = 'Good evening';
  return firstName ? `${base}, ${firstName}` : base;
}

// Stats

export function updateStats(meetings) {
  const todayCount    = meetings.filter(m => getMeetingStatus(m.date) === 'today').length;
  const upcomingCount = meetings.filter(m => getMeetingStatus(m.date) === 'upcoming').length;
  animateCounter('stat-total',    meetings.length);
  animateCounter('stat-today',    todayCount);
  animateCounter('stat-upcoming', upcomingCount);
}

export function updateMeetingsCount(count) {
  const chip  = document.getElementById('meetings-count');
  if (chip)  chip.textContent = `${count} meeting${count !== 1 ? 's' : ''}`;
  const badge = document.getElementById('sidebar-meetings-count');
  if (badge) badge.textContent = count;
}

//  Render 

export function renderMeetingsList(meetings, updateCache = true) {
  const grid       = document.getElementById('meetings-list');
  const emptyState = document.getElementById('empty-state-container');
  if (!grid) return;

  if (updateCache) {
    setAllMeetings(meetings);
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

export function addMeetingCard(meeting) {
  const grid     = document.getElementById('meetings-list');
  const template = document.getElementById('meeting-card-template');
  if (!grid || !template) return;

  const clone = template.content.cloneNode(true);
  const card  = clone.querySelector('.meeting-card');

  const status = getMeetingStatus(meeting.date);
  card.dataset.status = status;

  const accentMap = { today: 'var(--today)', upcoming: 'var(--primary)', past: 'rgba(75,85,99,0.5)' };
  card.style.setProperty('--card-accent', accentMap[status] || accentMap.upcoming);

  clone.querySelector('.meeting-title').textContent = meeting.title;

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

  const dateChip = clone.querySelector('.meeting-date-chip');
  dateChip.textContent = formatDate(meeting.date);
  if (status === 'today') dateChip.classList.add('chip-today');
  else if (status === 'past') dateChip.classList.add('chip-past');

  clone.querySelector('.meeting-time-display').textContent     = meeting.time     || '-';
  clone.querySelector('.meeting-location-display').textContent = meeting.location || '-';

  // Participants row
  const participantsEl = clone.querySelector('.meeting-participants');
  participantsEl.textContent = '';
  if (meeting.participants && meeting.participants.length > 0) {
    meeting.participants.forEach(pid => {
      const user = allUsers.find(u => String(u.id) === String(pid))
                || (currentUser && String(currentUser.id) === String(pid) ? currentUser : null);
      const seed = user ? user.username : String(pid);
      const name = user ? user.fullName  : `User #${pid}`;

      const participantSpan = document.createElement('span');
      participantSpan.className = 'meeting-participant';

      const avatarImg = document.createElement('img');
      avatarImg.src       = `https://api.dicebear.com/9.x/avataaars/svg?seed=${seed}`;
      avatarImg.alt       = name;
      avatarImg.title     = name;
      avatarImg.className = 'meeting-participant-avatar';

      const nameSpan = document.createElement('span');
      nameSpan.textContent = name;
      nameSpan.className   = 'meeting-participant-name';

      participantSpan.appendChild(avatarImg);
      participantSpan.appendChild(nameSpan);
      participantsEl.appendChild(participantSpan);
    });
  } else {
    participantsEl.style.display = 'none';
  }

  // Clicks
  clone.querySelector('.meeting-title').addEventListener('click', () => viewMeeting(meeting.id));
  clone.querySelector('.btn-card-view').addEventListener('click', () => viewMeeting(meeting.id));

  // Edit
  const editBtn = clone.querySelector('.btn-card-edit');
  if (meeting.isInvited) {
    editBtn.disabled      = true;
    editBtn.title         = 'You can only edit your own meetings';
    editBtn.style.opacity = '0.35';
  } else {
    editBtn.addEventListener('click', () => openPanel(meeting));
  }

  // Delete (two-step confirmation)
  const deleteBtn = clone.querySelector('.btn-card-delete');
  if (meeting.isInvited) {
    deleteBtn.disabled      = true;
    deleteBtn.title         = 'You can only delete your own meetings';
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
          setAllMeetings(allMeetings.filter(m => String(m.id) !== String(meeting.id)));
          card.style.opacity    = '0';
          card.style.transform  = 'scale(0.95)';
          card.style.transition = 'all 0.2s ease';
          setTimeout(() => {
            card.remove();
            updateMeetingsCount(allMeetings.length);
            updateStats(allMeetings);
            const g          = document.getElementById('meetings-list');
            const emptyState = document.getElementById('empty-state-container');
            if (g && allMeetings.length === 0 && emptyState) {
              g.textContent = '';
              emptyState.style.display = 'flex';
            }
          }, 200);
          showToast('Meeting deleted.', 'info');
        } else if (xhr.status === 0) {
          showToast('Network error - could not delete. Please try again.', 'error');
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

//  Fetch 

let isFetchingMeetings = false;

export function fetchMeetings() {
  if (isFetchingMeetings) return;
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
    isFetchingMeetings = false;

    if (xhr.status === 200) {
      renderMeetingsList(JSON.parse(xhr.responseText).data);
    } else if (xhr.status === 0) {
      if (grid) {
        grid.replaceChildren();
        const errorDiv = document.createElement('div');
        errorDiv.className   = 'meetings-empty';
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

export function prefetchUsers() {
  const xhr = new FXMLHttpRequest();
  xhr.open('GET', '/api/users');
  xhr.setRequestHeader('sessionToken', sessionToken);

  xhr.onreadystatechange = () => {
    if (xhr.readyState !== 4) return;
    if (xhr.status === 200) {
      setAllUsers(JSON.parse(xhr.responseText).data);
      if (allMeetings.length > 0) renderMeetingsList(allMeetings, false);
    }
  };

  xhr.send();
}
