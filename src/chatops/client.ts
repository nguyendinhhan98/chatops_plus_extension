import axios, { AxiosInstance, AxiosError } from 'axios';
import { config } from '../config.js';

let authToken: string | null = config.token ?? null;

/**
 * Tạo Axios instance trỏ đến ChatOps API.
 * Tự động inject Cookie và CSRF token vào mỗi request.
 */
function createAxiosInstance(): AxiosInstance {
  const url = new URL(config.chatopsUrl);
  const hostname = url.hostname;

  const instance = axios.create({
    baseURL: `${config.chatopsUrl}/api/v4`,
    headers: {
      'content-type': 'text/plain;charset=UTF-8',
      'x-requested-with': 'XMLHttpRequest',
      'authority': hostname,
      'origin': config.chatopsUrl,
      'referer': config.chatopsUrl,
      'accept': '*/*',
    },
    timeout: 30_000,
  });

  // Inject auth header trước mỗi request
  instance.interceptors.request.use((reqConfig) => {
    console.error(`[ChatOps API] Calling: ${reqConfig.method?.toUpperCase()} ${reqConfig.url}`);

    if (config.cookie) {
      // Định dạng: MMAUTHTOKEN=...
      reqConfig.headers['cookie'] = config.cookie;
    }

    if (config.csrf) {
      // ChatOps yêu cầu CSRF token trong header x-csrf-token
      reqConfig.headers['x-csrf-token'] = config.csrf.replace('MMCSRF=', '');
    }

    if (authToken && !config.cookie) {
      reqConfig.headers['Authorization'] = `Bearer ${authToken}`;
    }
    return reqConfig;
  });

  // Xử lý lỗi HTTP phổ biến
  instance.interceptors.response.use(
    (res) => res,
    (error: AxiosError) => {
      const status = error.response?.status;
      const data = error.response?.data as { message?: string } | undefined;
      const message = data?.message ?? error.message;

      if (status === 401) {
        throw new Error(`Xác thực thất bại (401): ${message}. Kiểm tra Cookie (MMAUTHTOKEN=) hoặc CSRF (MMCSRF=).`);
      }
      if (status === 403) {
        throw new Error(`Không có quyền truy cập (403): ${message}.`);
      }
      if (status === 404) {
        throw new Error(`Không tìm thấy (404): ${message}`);
      }
      throw new Error(`ChatOps API lỗi (${status ?? 'unknown'}): ${message}`);
    }
  );

  return instance;
}

export const httpClient = createAxiosInstance();

async function loginWithCredentials(): Promise<void> {
  if (!config.username || !config.password) {
    throw new Error('Thiếu thông tin đăng nhập: cung cấp Cookie (MMAUTHTOKEN=) + CSRF (MMCSRF=)');
  }

  try {
    const res = await httpClient.post<{ id: string }>(
      '/users/login',
      {
        login_id: config.username,
        password: config.password,
      },
      {
        transformRequest: [(data) => JSON.stringify(data)],
        headers: { 'Content-Type': 'application/json' },
      }
    );

    const token = res.headers['token'] || res.headers['Token'];
    if (!token) {
      throw new Error('Đăng nhập thành công nhưng không nhận được session token');
    }

    authToken = token as string;
    console.error('  ✅ Đăng nhập ChatOps thành công');
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`Đăng nhập ChatOps thất bại: ${message}`);
  }
}

export async function ensureAuthenticated(): Promise<void> {
  if (config.cookie) return;
  if (!authToken) {
    await loginWithCredentials();
  }
}
