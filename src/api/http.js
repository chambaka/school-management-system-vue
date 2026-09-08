import { correctionId, rememberCorrectionId } from "../utils/correctionId";

const TOKEN_KEY = "shulehub.accessToken";
const REFRESH_KEY = "shulehub.refreshToken";

export function apiBase() {
  return import.meta.env.VITE_API_BASE || "";
}

export function getAccessToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function getRefreshToken() {
  return localStorage.getItem(REFRESH_KEY);
}

export function setTokens({ accessToken, refreshToken }) {
  if (accessToken) localStorage.setItem(TOKEN_KEY, accessToken);
  if (refreshToken) localStorage.setItem(REFRESH_KEY, refreshToken);
}

export function clearTokens() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_KEY);
}

async function parseBody(response) {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export function apiError(body, fallback = "Request failed") {
  if (!body) return fallback;
  if (typeof body === "string") return body;
  if (body.message) return body.message;
  if (body.errors?.[0]?.message) return body.errors[0].message;
  return fallback;
}

let refreshing = null;

async function refreshAccess() {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return null;
  if (!refreshing) {
    refreshing = request("/api/v1/auth/refresh", {
      method: "POST",
      body: { refreshToken },
      skipAuth: true,
      skipRefresh: true,
    })
      .then((data) => {
        setTokens(data);
        return data.accessToken;
      })
      .catch(() => {
        clearTokens();
        return null;
      })
      .finally(() => {
        refreshing = null;
      });
  }
  return refreshing;
}

export async function request(path, options = {}) {
  const {
    method = "GET",
    body,
    skipAuth = false,
    skipRefresh = false,
    headers: extra = {},
  } = options;

  const headers = {
    Accept: "application/json",
    "X-Correction-Id": correctionId(),
    ...extra,
  };
  const isForm = typeof FormData !== "undefined" && body instanceof FormData;
  if (body !== undefined && !isForm) headers["Content-Type"] = "application/json";
  const token = getAccessToken();
  if (!skipAuth && token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(`${apiBase()}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : isForm ? body : JSON.stringify(body),
  });

  rememberCorrectionId(response.headers.get("X-Correction-Id"));
  const data = await parseBody(response);

  if (response.status === 401 && !skipRefresh && !skipAuth) {
    const next = await refreshAccess();
    if (next) return request(path, { ...options, skipRefresh: true });
  }

  if (!response.ok) {
    const error = new Error(apiError(data, `HTTP ${response.status}`));
    error.status = response.status;
    error.body = data;
    throw error;
  }
  return data;
}

export const api = {
  get: (path) => request(path),
  post: (path, body) => request(path, { method: "POST", body }),
  put: (path, body) => request(path, { method: "PUT", body }),
  del: (path) => request(path, { method: "DELETE" }),
};
