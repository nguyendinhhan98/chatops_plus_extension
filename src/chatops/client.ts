import axios, { AxiosInstance, AxiosError } from 'axios';
import { config } from '../config.js';

let authToken: string | null = config.token ?? null;

/**
 * Create a pre-configured Axios instance pointing at the ChatOps API.
 * Injects Cookie and CSRF (MMCSRF= format) based on available config.
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

  // Inject auth headers before each request
  instance.interceptors.request.use((reqConfig) => {
    // Debug log for monitoring
    console.error(`[ChatOps API] Calling: ${reqConfig.method?.toUpperCase()} ${reqConfig.url}`);

    if (config.cookie) {
      // Expects MMAUTHTOKEN=... format
      reqConfig.headers['cookie'] = config.cookie;
    }
    
    if (config.csrf) {
      // ChatOps often requires the token in x-csrf-token header.
      // We handle the MMCSRF= prefix if provided.
      reqConfig.headers['x-csrf-token'] = config.csrf.replace('MMCSRF=', '');
    }

    if (authToken && !config.cookie) {
      reqConfig.headers['Authorization'] = `Bearer ${authToken}`;
    }
    return reqConfig;
  });

  // Handle common errors
  instance.interceptors.response.use(
    (res) => res,
    (error: AxiosError) => {
      const status = error.response?.status;
      const data = error.response?.data as { message?: string } | undefined;
      const message = data?.message ?? error.message;

      if (status === 401) {
        throw new Error(`Authentication failed (401): ${message}. Check your ChatOps Cookie (MMAUTHTOKEN=) or CSRF (MMCSRF=).`);
      }
      if (status === 403) {
        throw new Error(`Access forbidden (403): ${message}. Insufficient permissions.`);
      }
      if (status === 404) {
        throw new Error(`Not found (404): ${message}`);
      }
      throw new Error(`ChatOps API error (${status ?? 'unknown'}): ${message}`);
    }
  );

  return instance;
}

export const httpClient = createAxiosInstance();

async function loginWithCredentials(): Promise<void> {
  if (!config.username || !config.password) {
    throw new Error('ChatOps credentials missing: provide Cookie (MMAUTHTOKEN=) + CSRF (MMCSRF=)');
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
      throw new Error('Login successful but no session token returned');
    }

    authToken = token as string;
    console.error('  ✅ Logged in to ChatOps successfully');
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`ChatOps login failed: ${message}`);
  }
}

export async function ensureAuthenticated(): Promise<void> {
  if (config.cookie) return; 
  if (!authToken) {
    await loginWithCredentials();
  }
}
