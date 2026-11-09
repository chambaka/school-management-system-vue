import { computed, ref } from "vue";

const DISMISS_KEY = "shulehub.pwa.install.dismissed";

const deferred = ref(null);
const installed = ref(false);
const dismissed = ref(false);
let listening = false;

function isStandalone() {
  return (
    window.matchMedia("(display-mode: standalone)").matches
    || window.navigator.standalone === true
  );
}

function isIos() {
  const ua = window.navigator.userAgent || "";
  return /iphone|ipad|ipod/i.test(ua) || (ua.includes("Mac") && "ontouchend" in document);
}

function readDismissed() {
  try {
    return sessionStorage.getItem(DISMISS_KEY) === "1";
  } catch {
    return false;
  }
}

function onBeforeInstall(event) {
  event.preventDefault();
  deferred.value = event;
}

function onInstalled() {
  installed.value = true;
  deferred.value = null;
}

function ensureListeners() {
  if (listening || typeof window === "undefined") return;
  listening = true;
  installed.value = isStandalone();
  dismissed.value = readDismissed();
  window.addEventListener("beforeinstallprompt", onBeforeInstall);
  window.addEventListener("appinstalled", onInstalled);
}

ensureListeners();

export function usePwaInstall() {
  ensureListeners();

  const canPrompt = computed(() => Boolean(deferred.value) && !installed.value && !dismissed.value);
  const showIosTip = computed(() => isIos() && !installed.value && !dismissed.value);
  const visible = computed(() => canPrompt.value || showIosTip.value);

  async function install() {
    const event = deferred.value;
    if (!event) return false;
    deferred.value = null;
    const result = await event.prompt();
    const accepted = result?.outcome === "accepted";
    if (accepted) installed.value = true;
    return accepted;
  }

  function dismiss() {
    dismissed.value = true;
    try {
      sessionStorage.setItem(DISMISS_KEY, "1");
    } catch {
      // ignore storage failures
    }
  }

  return {
    canPrompt,
    showIosTip,
    visible,
    installed,
    install,
    dismiss,
  };
}
