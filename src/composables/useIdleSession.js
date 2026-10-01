import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import { getIdleSessionConfig } from "../config/idleSession";

const ACTIVITY_EVENTS = [
  "mousemove",
  "mousedown",
  "keydown",
  "scroll",
  "touchstart",
  "wheel",
];

/** Ignore activity storms; reset at most this often. */
const ACTIVITY_THROTTLE_MS = 2000;

/**
 * Tracks UI idle time while authenticated and surfaces a warn → logout flow.
 *
 * @param {{
 *   isActive: import('vue').Ref<boolean> | import('vue').ComputedRef<boolean>,
 *   onIdleLogout: () => void | Promise<void>,
 *   onStaySignedIn?: () => void | Promise<void>,
 * }} options
 */
export function useIdleSession(options) {
  const config = getIdleSessionConfig();
  const warningOpen = ref(false);
  const secondsLeft = ref(0);
  const loggingOut = ref(false);

  let warnTimer = null;
  let logoutTimer = null;
  let countdownTimer = null;
  let lastActivityAt = 0;
  let listening = false;

  const enabled = computed(() => config.enabled && Boolean(options.isActive?.value));

  function clearTimers() {
    if (warnTimer) clearTimeout(warnTimer);
    if (logoutTimer) clearTimeout(logoutTimer);
    if (countdownTimer) clearInterval(countdownTimer);
    warnTimer = null;
    logoutTimer = null;
    countdownTimer = null;
  }

  function closeWarning() {
    warningOpen.value = false;
    secondsLeft.value = 0;
    if (countdownTimer) {
      clearInterval(countdownTimer);
      countdownTimer = null;
    }
  }

  function startCountdown(ms) {
    const endsAt = Date.now() + ms;
    secondsLeft.value = Math.max(1, Math.ceil(ms / 1000));
    if (countdownTimer) clearInterval(countdownTimer);
    countdownTimer = setInterval(() => {
      const left = Math.max(0, endsAt - Date.now());
      secondsLeft.value = Math.ceil(left / 1000);
      if (left <= 0 && countdownTimer) {
        clearInterval(countdownTimer);
        countdownTimer = null;
      }
    }, 250);
  }

  async function forceLogout() {
    if (loggingOut.value) return;
    loggingOut.value = true;
    clearTimers();
    closeWarning();
    try {
      await options.onIdleLogout();
    } finally {
      loggingOut.value = false;
    }
  }

  function armTimers() {
    clearTimers();
    closeWarning();
    if (!enabled.value) return;

    const { timeoutMs, warnMs } = config;
    const warnAfter = Math.max(0, timeoutMs - warnMs);

    if (warnMs > 0 && warnAfter > 0) {
      warnTimer = setTimeout(() => {
        warningOpen.value = true;
        startCountdown(warnMs);
      }, warnAfter);
    }

    logoutTimer = setTimeout(() => {
      void forceLogout();
    }, timeoutMs);
  }

  function onActivity() {
    if (!enabled.value || loggingOut.value) return;
    // While the warning is open, only explicit "Stay signed in" should extend —
    // otherwise background mouse jitter dismisses the prompt silently.
    if (warningOpen.value) return;

    const now = Date.now();
    if (now - lastActivityAt < ACTIVITY_THROTTLE_MS) return;
    lastActivityAt = now;
    armTimers();
  }

  function onVisibility() {
    if (!enabled.value || loggingOut.value) return;
    if (document.visibilityState === "visible") {
      onActivity();
    }
  }

  function attachListeners() {
    if (listening || typeof window === "undefined") return;
    listening = true;
    for (const ev of ACTIVITY_EVENTS) {
      window.addEventListener(ev, onActivity, { passive: true, capture: true });
    }
    document.addEventListener("visibilitychange", onVisibility);
  }

  function detachListeners() {
    if (!listening || typeof window === "undefined") return;
    listening = false;
    for (const ev of ACTIVITY_EVENTS) {
      window.removeEventListener(ev, onActivity, { capture: true });
    }
    document.removeEventListener("visibilitychange", onVisibility);
  }

  async function staySignedIn() {
    if (loggingOut.value) return;
    closeWarning();
    lastActivityAt = 0;
    armTimers();
    try {
      await options.onStaySignedIn?.();
    } catch {
      /* stay signed in still resets idle even if refresh fails */
    }
  }

  function sync() {
    if (enabled.value) {
      attachListeners();
      armTimers();
    } else {
      detachListeners();
      clearTimers();
      closeWarning();
    }
  }

  watch(
    () => options.isActive?.value,
    () => sync(),
    { immediate: true },
  );

  onMounted(() => sync());
  onUnmounted(() => {
    detachListeners();
    clearTimers();
    closeWarning();
  });

  return {
    enabled,
    warningOpen,
    secondsLeft,
    loggingOut,
    staySignedIn,
    signOutNow: forceLogout,
    idleTimeoutMs: config.timeoutMs,
    idleWarnMs: config.warnMs,
  };
}
