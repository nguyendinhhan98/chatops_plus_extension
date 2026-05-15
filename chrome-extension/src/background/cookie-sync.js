import { CHATOPS_CONFIG, COOKIE_NAMES } from '../constants.js';

/**
 * Synchronizes Mattermost cookies with extension storage
 */
export async function syncCookies() {
  try {
    const config = await chrome.storage.local.get(['chatopsUrl']);
    const url = config.chatopsUrl || CHATOPS_CONFIG.DEFAULT_URL;
    
    const [authToken, csrfToken] = await Promise.all([
      chrome.cookies.get({ url, name: COOKIE_NAMES.AUTH_TOKEN }),
      chrome.cookies.get({ url, name: COOKIE_NAMES.CSRF_TOKEN })
    ]);

    if (authToken || csrfToken) {
      const updates = {};
      if (authToken) updates.cookie = `${COOKIE_NAMES.AUTH_TOKEN}=${authToken.value}`;
      if (csrfToken) updates.csrf = `${COOKIE_NAMES.CSRF_TOKEN}=${csrfToken.value}`;
      await chrome.storage.local.set(updates);
      console.log('[ChatOps Ext] Cookies auto-synced:', Object.keys(updates));
    }
  } catch (err) {
    console.warn('[ChatOps Ext] Cookie sync failed:', err);
  }
}

/**
 * Registers cookie change listeners
 */
export function setupCookieSync() {
  chrome.cookies.onChanged.addListener((changeInfo) => {
    // Only sync if the cookie is from the ChatOps domain and not being removed
    if (changeInfo.cookie.domain.includes(CHATOPS_CONFIG.DOMAIN) && !changeInfo.removed) {
      if ([COOKIE_NAMES.AUTH_TOKEN, COOKIE_NAMES.CSRF_TOKEN].includes(changeInfo.cookie.name)) {
        syncCookies();
      }
    }
  });
}
