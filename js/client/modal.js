//  Meeting Detail Modal 

import { FXMLHttpRequest }          from '../comm/fajax.js';
import { sessionToken, allUsers }   from './state.js';
import { showToast }                from './toast.js';
import { getMeetingStatus, formatDate } from './utils.js';

export function openDetailModal(meeting) {
  const modal      = document.getElementById('detail-modal');
  const modalTitle = document.getElementById('modal-meeting-title');
  const modalBody  = document.getElementById('modal-body');

  modalTitle.textContent = meeting.title;
  modalBody.innerHTML = '';

  const template = document.getElementById('detail-modal-template');
  const content  = document.importNode(template.content, true);

  const statusBadge           = content.getElementById('status-badge');
  const invitedBadge          = content.getElementById('invited-badge');
  const dateTime              = content.getElementById('date-time');
  const location              = content.getElementById('location');
  const descriptionSection    = content.getElementById('description-section');
  const description           = content.getElementById('description');
  const participantsSection   = content.getElementById('participants-section');
  const participantsContainer = content.getElementById('participants-container');
  const createdAt             = content.getElementById('created-at');

  const status = getMeetingStatus(meeting.date);
  const badgeMap = {
    today:    ['badge-today',    'Today'],
    upcoming: ['badge-upcoming', 'Upcoming'],
    past:     ['badge-past',     'Past'],
  };
  const [badgeClass, badgeText] = badgeMap[status] || badgeMap.upcoming;
  statusBadge.textContent = badgeText;
  statusBadge.classList.add(badgeClass);

  if (meeting.isInvited) invitedBadge.style.display = 'inline-flex';

  dateTime.textContent = `${formatDate(meeting.date)} at ${meeting.time || '-'}`;
  location.textContent = meeting.location || '-';

  if (meeting.description) {
    description.textContent = meeting.description;
  } else {
    descriptionSection.style.display = 'none';
  }

  if (meeting.participants && meeting.participants.length > 0) {
    meeting.participants.forEach(pid => {
      const user = allUsers.find(u => String(u.id) === String(pid));
      const seed = user ? user.username : String(pid);
      const name = user ? user.fullName  : `User #${pid}`;
      const img  = document.createElement('img');
      img.src   = `https://api.dicebear.com/9.x/avataaars/svg?seed=${seed}`;
      img.alt   = name;
      img.title = name;
      img.style.cssText = 'width:24px;height:24px;border-radius:50%;margin-right:4px;';
      participantsContainer.appendChild(img);
    });
  } else {
    participantsSection.style.display = 'none';
  }

  createdAt.textContent = meeting.createdAt
    ? new Date(meeting.createdAt).toLocaleString()
    : '-';

  modalBody.appendChild(content);
  modal.classList.add('visible');
}

export function closeDetailModal() {
  const modal = document.getElementById('detail-modal');
  if (modal) modal.classList.remove('visible');
}

export function setupDetailModal() {
  const closeBtn = document.getElementById('close-modal');
  const modal    = document.getElementById('detail-modal');
  if (closeBtn) closeBtn.addEventListener('click', closeDetailModal);
  if (modal)    modal.addEventListener('click', e => { if (e.target === modal) closeDetailModal(); });
}

export function viewMeeting(meetingId) {
  const xhr = new FXMLHttpRequest();
  xhr.open('GET', `/api/meetings/${meetingId}`);
  xhr.setRequestHeader('sessionToken', sessionToken);

  xhr.onreadystatechange = () => {
    if (xhr.readyState !== 4) return;
    if (xhr.status === 200) {
      openDetailModal(JSON.parse(xhr.responseText).data);
    } else if (xhr.status === 0) {
      showToast('Network error - could not load meeting details. Please try again.', 'error');
    } else {
      showToast(`Error loading meeting (${xhr.status})`, 'error');
    }
  };

  xhr.send();
}
