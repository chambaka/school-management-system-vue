/**
 * Client idle-session policy (SPA-only).
 *
 * Env (milliseconds):
 * - VITE_IDLE_TIMEOUT_MS — total idle before logout (default 20 min). Set 0 to disable.
 * - VITE_IDLE_WARN_MS — warning lead time before logout (default 2 min). Clamped below timeout.
 */

const DEFAULT_TIMEOUT_MS = 20 * 60 * 1000;
const DEFAULT_WARN_MS = 2 * 60 * 1000;

/**
 * @param {unknown} raw
 * @param {number} fallback
 */
function parseMs(raw, fallback) {
  if (raw === undefined || raw === null || String(raw).trim() === "") return fallback;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) return fallback;
  return Math.floor(n);
}

/**
 * @returns {{ enabled: boolean, timeoutMs: number, warnMs: number }}
 */
export function getIdleSessionConfig() {
  const timeoutMs = parseMs(import.meta.env.VITE_IDLE_TIMEOUT_MS, DEFAULT_TIMEOUT_MS);
  if (timeoutMs <= 0) {
    return { enabled: false, timeoutMs: 0, warnMs: 0 };
  }
  let warnMs = parseMs(import.meta.env.VITE_IDLE_WARN_MS, DEFAULT_WARN_MS);
  if (warnMs <= 0) warnMs = 0;
  if (warnMs >= timeoutMs) {
    warnMs = Math.min(DEFAULT_WARN_MS, Math.max(0, timeoutMs - 1000));
  }
  return { enabled: true, timeoutMs, warnMs };
}
