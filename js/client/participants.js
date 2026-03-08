//  Participant Picker 

import { FXMLHttpRequest }          from '../comm/fajax.js';
import { sessionToken, allUsers, setAllUsers } from './state.js';

export function loadParticipantPicker(selectedIds = []) {
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
      setAllUsers(users);
      renderParticipantPicker(users, selectedIds);
    } else if (xhr.status === 0) {
      listEl.innerHTML = '<div class="participant-list-empty">Network error loading users.</div>';
    } else {
      listEl.innerHTML = '<div class="participant-list-empty">Could not load users.</div>';
    }
  };

  xhr.send();
}

export function renderParticipantPicker(users, selectedIds = []) {
  const listEl  = document.getElementById('participant-list');
  const chipsEl = document.getElementById('selected-participants');
  if (!listEl || !chipsEl) return;

  if (users.length === 0) {
    listEl.innerHTML = '<div class="participant-list-empty">No other users registered yet.</div>';
    chipsEl.innerHTML = '';
    return;
  }

  const selectedSet = new Set(selectedIds.map(id => String(id)));
  listEl.innerHTML = '';

  users.forEach(user => {
    const url = `https://api.dicebear.com/9.x/avataaars/svg?seed=${user.username}`;
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

export function updateSelectedChips() {
  const chipsEl = document.getElementById('selected-participants');
  if (!chipsEl) return;

  const checked = Array.from(document.querySelectorAll('.participant-checkbox:checked'));
  chipsEl.innerHTML = '';

  checked.forEach(input => {
    const user = allUsers.find(u => String(u.id) === String(input.value));
    if (!user) return;
    const url  = `https://api.dicebear.com/9.x/avataaars/svg?seed=${user.username}`;
    const chip = document.createElement('span');
    chip.className = 'selected-chip';
    chip.innerHTML = `<img src="${url}" alt="${user.fullName}"> ${user.fullName}`;
    chipsEl.appendChild(chip);
  });
}

export function getSelectedParticipants() {
  return Array.from(
    document.querySelectorAll('.participant-checkbox:checked')
  ).map(input => parseInt(input.value, 10));
}
