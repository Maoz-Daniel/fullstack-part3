//  Add / Edit Meeting Slide Panel 

import { FXMLHttpRequest }                              from '../comm/fajax.js';
import { sessionToken, allMeetings }                    from './state.js';
import { showToast }                                    from './toast.js';
import { loadParticipantPicker, getSelectedParticipants } from './participants.js';
import { fetchInvitationBadge }                         from './invitations.js';
import { renderMeetingsList }                           from './meetings.js';

//  Open / Close 

export function openPanel(meeting = null) {
  const panel        = document.getElementById('meeting-panel');
  const overlay      = document.getElementById('panel-overlay');
  const panelHeading = document.getElementById('panel-heading');
  const submitBtn    = document.getElementById('submit-meeting');

  document.getElementById('meeting-form').reset();
  document.getElementById('edit-meeting-id').value = '';
  clearPanelErrors();

  if (meeting) {
    panelHeading.textContent = 'Edit Meeting';
    submitBtn.textContent    = 'Save Changes';
    document.getElementById('edit-meeting-id').value        = meeting.id;
    document.getElementById('panel-title-input').value      = meeting.title       || '';
    document.getElementById('panel-date').value             = meeting.date        || '';
    document.getElementById('panel-time').value             = meeting.time        || '';
    document.getElementById('panel-location').value         = meeting.location    || '';
    document.getElementById('panel-description').value      = meeting.description || '';
  } else {
    panelHeading.textContent = 'New Meeting';
    submitBtn.textContent    = 'Save Meeting';
  }

  panel.classList.add('open');
  overlay.classList.add('visible');
  loadParticipantPicker(meeting?.participants || []);
}

export function closePanel() {
  const panel   = document.getElementById('meeting-panel');
  const overlay = document.getElementById('panel-overlay');
  if (panel)   panel.classList.remove('open');
  if (overlay) overlay.classList.remove('visible');
}

export function clearPanelErrors() {
  ['panel-title-input', 'panel-date', 'panel-time', 'panel-location'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.borderColor = '';
  });
  ['panel-title-error', 'panel-date-error', 'panel-time-error', 'panel-location-error'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.classList.remove('visible');
  });
}

//  Setup 

export function setupPanel() {
  const closeBtn  = document.getElementById('close-panel');
  const cancelBtn = document.getElementById('cancel-panel');
  const overlay   = document.getElementById('panel-overlay');
  const submitBtn = document.getElementById('submit-meeting');

  if (closeBtn)  closeBtn.addEventListener('click',  closePanel);
  if (cancelBtn) cancelBtn.addEventListener('click', closePanel);
  if (overlay)   overlay.addEventListener('click',   closePanel);
  if (submitBtn) submitBtn.addEventListener('click', handlePanelSubmit);
}

//  Submit 

export function handlePanelSubmit() {
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
      valid = false;
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
      submitBtn.disabled    = false;
      submitBtn.textContent = 'Save Changes';

      if (xhr.status === 0 || xhr.status === '0') {
        showToast('Network error - request timed out. Please try again.', 'error');
        return;
      }
      if (xhr.status === 200) {
        const updated = JSON.parse(xhr.responseText).data;
        const idx = allMeetings.findIndex(m => String(m.id) === String(updated.id));
        if (idx !== -1) allMeetings[idx] = updated;
        renderMeetingsList(allMeetings);
        closePanel();
        showToast('Meeting updated!', 'success');
        fetchInvitationBadge();
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
      submitBtn.disabled    = false;
      submitBtn.textContent = 'Save Meeting';

      if (xhr.status == 0) {
        showToast('Network error - request timed out. Please try again.', 'error');
        return;
      }
      if (xhr.status === 201) {
        const newMeeting = JSON.parse(xhr.responseText).data;
        allMeetings.unshift(newMeeting);
        renderMeetingsList(allMeetings);
        closePanel();
        showToast('Meeting added!', 'success');
        if (participantIds.length > 0) {
          showToast(
            `Invitations sent to ${participantIds.length} participant${participantIds.length > 1 ? 's' : ''}.`,
            'info'
          );
        }
      } else {
        showToast(`Error creating meeting (${xhr.status})`, 'error');
      }
    };

    xhr.send(payload);
  }
}
