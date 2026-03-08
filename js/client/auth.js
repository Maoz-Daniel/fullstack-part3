// Auth Views (Login / Register)

import { navigateTo }                        from './router.js';
import { FXMLHttpRequest }                   from '../comm/fajax.js';
import { setSessionToken, setCurrentUser }   from './state.js';
import { showToast }                         from './toast.js';
import { isValidEmail, showFieldError, setAuthError } from './utils.js';

export function setupLoginView() {
  const loginForm = document.getElementById('login-form');
  if (!loginForm) return;

  loginForm.addEventListener('submit', (e) => {
    e.preventDefault();

    const email    = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    let valid = true;

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
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="spinner"></span> Signing in…';

    const xhr = new FXMLHttpRequest();
    xhr.open('POST', '/auth/login');
    xhr.setRequestHeader('Content-Type', 'application/json');

    xhr.onreadystatechange = () => {
      if (xhr.readyState !== 4) return;
      submitBtn.disabled = false;
      submitBtn.textContent = 'Sign In';

      if (xhr.status === 0) {
        setAuthError('auth-error', 'Network error — request timed out. Please try again.');
        return;
      }
      if (xhr.status === 200) {
        const data = JSON.parse(xhr.responseText).data;
        setSessionToken(data.sessionToken);
        setCurrentUser(data.user);
        localStorage.setItem('sessionToken', data.sessionToken);
        localStorage.setItem('currentUser', JSON.stringify(data.user));
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

export function setupRegisterView() {
  const registerForm = document.getElementById('register-form');
  if (!registerForm) return;

  registerForm.addEventListener('submit', (e) => {
    e.preventDefault();

    const name     = document.getElementById('name').value.trim();
    const email    = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    let valid = true;

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
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="spinner"></span> Creating account…';

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
        const data = JSON.parse(xhr.responseText).data;
        setSessionToken(data.sessionToken);
        setCurrentUser(data.user);
        localStorage.setItem('sessionToken', data.sessionToken);
        localStorage.setItem('currentUser', JSON.stringify(data.user));
        showToast('Welcome to MeetSync!', 'success');
        navigateTo('#/meetings');
      } else if (xhr.status === 409) {
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
