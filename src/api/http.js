import { correctionId, rememberCorrectionId } from "../utils/correctionId";

const TOKEN_KEY = "shulehub.accessToken";
const REFRESH_KEY = "shulehub.refreshToken";
let tokenEpoch = 0;

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
  tokenEpoch += 1;
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
  const epoch = tokenEpoch;
  if (!refreshing) {
    refreshing = request("/api/v1/auth/refresh", {
      method: "POST",
      body: { refreshToken },
      skipAuth: true,
      skipRefresh: true,
    })
      .then((data) => {
        if (epoch !== tokenEpoch) return null;
        setTokens(data);
        return data.accessToken;
      })
      .catch(() => {
        if (epoch === tokenEpoch) clearTokens();
        return null;
      })
      .finally(() => {
        refreshing = null;
      });
  }
  return refreshing;
}

export function tryRefreshSession() {
  return refreshAccess();
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

async function fetchFileBlob(path) {
  const headers = {
    Accept: "*/*",
    "X-Correction-Id": correctionId(),
  };
  const token = getAccessToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  let response = await fetch(`${apiBase()}${path}`, { headers });
  rememberCorrectionId(response.headers.get("X-Correction-Id"));
  if (response.status === 401) {
    const next = await refreshAccess();
    if (next) {
      headers.Authorization = `Bearer ${next}`;
      response = await fetch(`${apiBase()}${path}`, { headers });
      rememberCorrectionId(response.headers.get("X-Correction-Id"));
    }
  }
  if (!response.ok) {
    const data = await parseBody(response);
    const error = new Error(apiError(data, `HTTP ${response.status}`));
    error.status = response.status;
    error.body = data;
    throw error;
  }
  return response.blob();
}

function saveBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export async function downloadFile(path, filename) {
  saveBlob(await fetchFileBlob(path), filename);
}

export async function viewFile(path, filename) {
  const blob = await fetchFileBlob(path);
  const url = URL.createObjectURL(blob);
  const opened = window.open(url, "_blank", "noopener");
  if (!opened) {
    saveBlob(blob, filename);
    URL.revokeObjectURL(url);
    return;
  }
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

export const api = {
  get: (path) => request(path),
  post: (path, body) => request(path, { method: "POST", body }),
  put: (path, body) => request(path, { method: "PUT", body }),
  del: (path) => request(path, { method: "DELETE" }),
};
