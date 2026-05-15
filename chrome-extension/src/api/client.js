import { CHATOPS_CONFIG } from '../constants.js';

/**
 * Fetches configuration from local storage
 * @returns {Promise<Object>} config
 */
export async function getConfig() {
  const defaults = {
    chatopsUrl: CHATOPS_CONFIG.DEFAULT_URL,
    cookie: '',
    csrf: '',
    teamName: CHATOPS_CONFIG.DEFAULT_TEAM
  };
  const res = await chrome.storage.local.get(['chatopsUrl', 'cookie', 'csrf', 'teamName']);
  return { ...defaults, ...res };
}

/**
 * Generic request wrapper with ChatOps headers
 */
export async function request(path, options = {}) {
  const config = await getConfig();
  const url = `${config.chatopsUrl}/api/v4${path}`;

  const headers = {
    'Content-Type': 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
    ...options.headers,
  };

  if (config.cookie) {
    headers['Authorization'] = `Bearer ${config.cookie.split('=')[1]}`;
  }
  if (config.csrf) {
    headers['X-CSRF-Token'] = config.csrf.split('=')[1];
  }

  const response = await fetch(url, { ...options, headers });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Unauthorized. Please check your connection or sync cookies.');
    }
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `API error: ${response.status}`);
  }

  return response.json();
}
