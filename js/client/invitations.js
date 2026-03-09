//Invitations 

import { FXMLHttpRequest } from '../comm/fajax.js';
import { sessionToken }    from './state.js';
import { showToast }       from './toast.js';
import { formatDate }      from './utils.js';
import { fetchMeetings }   from './meetings.js';

// Badge

export function fetchInvitationBadge() {
  const xhr = new FXMLHttpRequest();
  xhr.open('GET', '/api/invitations');
  xhr.setRequestHeader('sessionToken', sessionToken);

  xhr.onreadystatechange = () => {
    if (xhr.readyState !== 4) return;
    if (xhr.status !== 200) return;
    const pendingCount = JSON.parse(xhr.responseText).data
      .filter(inv => inv.status === 'pending').length;
    updateInvitationBadge(pendingCount);
  };

  xhr.send();
}

export function updateInvitationBadge(count) {
  const badge = document.getElementById('invite-badge');
  if (!badge) return;
  if (count > 0) {
    badge.textContent   = count;
    badge.style.display = 'inline-flex';
  } else {
    badge.style.display = 'none';
  }
}

// ── List ───────────────────────────────────────────────────────────────────

let isFetchingInvitations = false;

export function loadInvitations() {
  if (isFetchingInvitations) return;
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
    isFetchingInvitations = false;

    if (xhr.status === 200) {
      renderInvitations(JSON.parse(xhr.responseText).data);
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

export function renderInvitations(invitations) {
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
    label.className   = 'invite-section-label';
    label.textContent = `Awaiting Response (${pending.length})`;
    section.appendChild(label);
    pending.forEach(inv => section.appendChild(createInviteCard(inv)));
  }

  if (responded.length > 0) {
    const label = document.createElement('div');
    label.className   = 'invite-section-label';
    label.textContent = 'Past Invitations';
    section.appendChild(label);
    responded.forEach(inv => section.appendChild(createInviteCard(inv)));
  }
}

export function createInviteCard(inv) {
  const template = document.getElementById('invite-card-template');
  const content  = document.importNode(template.content, true);

  const card             = content.querySelector('.invite-card');
  const avatarImg        = card.querySelector('.invite-avatar');
  const senderNameEl     = card.querySelector('.invite-from-name');
  const statusBadge      = card.querySelector('.meeting-status-badge');
  const meetingTitleEl   = card.querySelector('.invite-meeting-title');
  const meetingMetaEl    = card.querySelector('.invite-meeting-meta');
  const actionsContainer = card.querySelector('.invite-actions');
  const acceptBtn        = card.querySelector('.btn-invite-accept');
  const declineBtn       = card.querySelector('.btn-invite-decline');

  card.classList.add(`status-${inv.status}`);

  const senderSeed = inv.fromUser?.username || 'user';
  avatarImg.src        = `https://api.dicebear.com/9.x/avataaars/svg?seed=${senderSeed}`;
  avatarImg.alt        = inv.fromUser?.fullName || 'Someone';
  senderNameEl.textContent = inv.fromUser?.fullName || 'Someone';

  const badgeMap = {
    pending:  ['badge-upcoming', 'Pending'],
    accepted: ['badge-today',    'Accepted'],
    declined: ['badge-past',     'Declined'],
  };
  const [badgeClass, badgeText] = badgeMap[inv.status] || badgeMap.pending;
  statusBadge.textContent = badgeText;
  statusBadge.classList.add(badgeClass);

  meetingTitleEl.textContent = inv.meeting?.title || 'Unknown meeting';
  const meetingDate = inv.meeting ? formatDate(inv.meeting.date) : '-';
  const meetingTime = inv.meeting?.time     ? ` · ${inv.meeting.time}`     : '';
  const meetingLoc  = inv.meeting?.location ? ` · ${inv.meeting.location}` : '';
  meetingMetaEl.textContent = `${meetingDate}${meetingTime}${meetingLoc}`;

  if (inv.status === 'pending') {
    actionsContainer.style.display = 'flex';
    acceptBtn.addEventListener('click',  () => respondToInvite(inv.id, 'accepted', card));
    declineBtn.addEventListener('click', () => respondToInvite(inv.id, 'declined', card));
  } else {
    actionsContainer.style.display = 'none';
  }

  return card;
}

export function respondToInvite(inviteId, status, cardEl) {
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
      loadInvitations();
      fetchInvitationBadge();
      if (status === 'accepted') fetchMeetings();
    } else if (xhr.status === 0) {
      showToast('Network error. Please try again.', 'error');
      if (acceptBtn)  { acceptBtn.disabled  = false; acceptBtn.textContent  = 'Accept';  }
      if (declineBtn) { declineBtn.disabled = false; declineBtn.textContent = 'Decline'; }
    } else {
      showToast(`Error updating invitation (${xhr.status})`, 'error');
    }
  };

  xhr.send({ status });
}
