/**
 * ChatOps API HTTP Client — Chrome Extension
 *
 * Dùng fetch() thay vì axios.
 * Auth được inject tự động từ Chrome Storage (cookie + CSRF).
 */

/** @type {{ chatopsUrl: string, cookie: string, csrf: string, teamName: string } | null} */
let cachedConfig = null;

/**
 * Đọc config từ Chrome Storage.
 * Cache lại để tránh gọi storage liên tục.
 */
export async function getConfig() {
  if (cachedConfig) return cachedConfig;
  return new Promise((resolve) => {
    chrome.storage.local.get(
      ['chatopsUrl', 'cookie', 'csrf', 'teamName'],
      (result) => {
        cachedConfig = {
          chatopsUrl: (result.chatopsUrl || 'https://chat.runsystem.vn').replace(/\/$/, ''),
          cookie: result.cookie || '',
          csrf: result.csrf || '',
          teamName: result.teamName || 'dn',
        };
        resolve(cachedConfig);
      }
    );
  });
}

/**
 * Reset config cache — gọi khi user thay đổi settings.
 */
export function resetConfigCache() {
  cachedConfig = null;
}

/**
 * Gọi ChatOps API v4.
 *
 * @param {string} endpoint - Đường dẫn API (vd: '/users/me')
 * @param {RequestInit & { params?: Record<string, string> }} options - fetch options
 * @returns {Promise<any>} Response data (JSON parsed)
 */
export async function apiCall(endpoint, options = {}) {
  const config = await getConfig();
  const baseURL = `${config.chatopsUrl}/api/v4`;

  // Xây dựng URL với query params nếu có
  let url = `${baseURL}${endpoint}`;
  if (options.params) {
    const qs = new URLSearchParams(options.params).toString();
    url += `?${qs}`;
  }

  // Xây dựng headers với auth
  const headers = {
    'content-type': 'application/json',
    'x-requested-with': 'XMLHttpRequest',
    accept: '*/*',
    ...(options.headers || {}),
  };

  // Inject Cookie + CSRF
  if (config.cookie) {
    headers['cookie'] = config.cookie;
  }
  if (config.csrf) {
    headers['x-csrf-token'] = config.csrf.replace('MMCSRF=', '');
  }

  console.log(`[ChatOps API] ${options.method || 'GET'} ${endpoint}`);

  const response = await fetch(url, {
    ...options,
    headers,
    credentials: 'include', // Tự động gửi cookie nếu trên cùng domain
  });

  // Xử lý lỗi HTTP
  if (!response.ok) {
    let errorMsg = '';
    try {
      const errorData = await response.json();
      errorMsg = errorData.message || response.statusText;
    } catch {
      errorMsg = response.statusText;
    }

    switch (response.status) {
      case 401:
        throw new Error(`Xác thực thất bại (401): ${errorMsg}. Kiểm tra Cookie hoặc CSRF trong Settings.`);
      case 403:
        throw new Error(`Không có quyền truy cập (403): ${errorMsg}.`);
      case 404:
        throw new Error(`Không tìm thấy (404): ${errorMsg}`);
      default:
        throw new Error(`ChatOps API lỗi (${response.status}): ${errorMsg}`);
    }
  }

  // Parse JSON response
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    return response.json();
  }
  return response.text();
}

/**
 * GET request helper.
 */
export function apiGet(endpoint, params) {
  return apiCall(endpoint, { method: 'GET', params });
}

/**
 * POST request helper.
 */
export function apiPost(endpoint, body) {
  return apiCall(endpoint, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}
