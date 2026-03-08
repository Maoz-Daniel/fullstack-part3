//  Pure Helper Utilities 

export function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export function showFieldError(groupId, errorId, show) {
  const group = document.getElementById(groupId);
  const error = document.getElementById(errorId);
  if (group) group.classList.toggle('input-error', show);
  if (error) error.classList.toggle('visible', show);
}

export function setAuthError(id, message) {
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

export function setAvatar(imgEl, username) {
  if (!imgEl) return;
  const seed = username || Math.random().toString(36).slice(2);
  imgEl.src = `https://api.dicebear.com/9.x/avataaars/svg?seed=${seed}`;
  imgEl.alt = 'avatar';
}

export function getMeetingStatus(dateStr) {
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

export function formatDate(dateStr) {
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

export function animateCounter(id, target) {
  const el = document.getElementById(id);
  if (!el) return;
  const start     = parseInt(el.textContent) || 0;
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
