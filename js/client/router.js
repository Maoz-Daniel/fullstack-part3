// Vanilla Client-Side Router for SPA

// Route mapping between URL hashes and template IDs
const routes = {
  '#/login': 'login-template',
  '#/register': 'register-template',
  '#/meetings': 'meetings-template',
};

// Default route
const defaultRoute = '#/login';

/**
 * Renders the page based on the current hash.
 * @param {Function} onPageLoadCallback - Callback to execute after rendering the page.
 */
function renderPage(onPageLoadCallback) {
  const hash = window.location.hash || defaultRoute; // get the current hash or default to the login page 
  const templateId = routes[hash] || routes[defaultRoute]; 

  const appContainer = document.getElementById('app-container'); //the main container where we will render our pages
  if (!appContainer) {
    console.error('App container not found');
    return;
  }

  const template = document.getElementById(templateId); //get the template element based on the route
  if (!template) {
    console.error(`Template with ID '${templateId}' not found`);
    return;
  }

  // clear the app container and append the new content
  appContainer.innerHTML = '';
  const content = document.importNode(template.content, true); 
  appContainer.appendChild(content);

  // notify the main app controller
  onPageLoadCallback(hash);
}

/**
 * Initializes the router.
 * @param {Function} onPageLoadCallback - Callback to execute after rendering the page.
 */
export function initRouter(onPageLoadCallback) {
  if (typeof onPageLoadCallback !== 'function') {
    throw new Error('onPageLoadCallback must be a function');
  }

  // listen to hash changes and initial page load
  window.addEventListener('hashchange', () => renderPage(onPageLoadCallback));
  window.addEventListener('load', () => renderPage(onPageLoadCallback));
}

/**
 * Programmatically navigate to a different route.
 * @param {string} path - The hash path to navigate to.
 */
export function navigateTo(path) {
  if (typeof path !== 'string') {
    throw new Error('Path must be a string');
  }
  window.location.hash = path;
}