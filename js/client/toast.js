//  Toast Notifications 

export function showToast(message, type = 'info') {
  const containerId = 'fajax-toast-container';
  const toastClass  = 'fajax-toast';

  let container = document.getElementById(containerId);
  if (!container) {
    container = document.createElement('div');
    container.id = containerId;
    container.className = containerId;
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `${toastClass} ${type}`;
  toast.textContent = message;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}
