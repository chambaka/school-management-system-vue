<script setup>
import { computed, ref } from "vue";
import { useRoute } from "vue-router";
import Icon from "./Icon.vue";
import { usePwaInstall } from "../composables/usePwaInstall";

const route = useRoute();
const { visible, canPrompt, showIosTip, install, dismiss } = usePwaInstall();
const loading = ref(false);

const guestRoute = computed(() =>
  ["/login", "/register", "/forgot", "/forgot/code", "/forgot/reset"].some((path) =>
    route.path === path || route.path.startsWith(`${path}/`),
  ),
);

async function onInstall() {
  loading.value = true;
  try {
    await install();
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div
    v-if="visible"
    class="pwa-banner glass"
    :class="{ guest: guestRoute }"
    role="status"
  >
    <div class="copy">
      <strong>Install ShuleHub</strong>
      <p v-if="canPrompt">Add the app to your home screen for faster access.</p>
      <p v-else-if="showIosTip">
        Tap <b>Share</b> then <b>Add to Home Screen</b>.
      </p>
    </div>
    <div class="actions">
      <button
        v-if="canPrompt"
        class="btn install"
        type="button"
        :disabled="loading"
        @click="onInstall"
      >
        {{ loading ? "Opening…" : "Install" }}
        <Icon name="download" />
      </button>
      <button class="dismiss" type="button" aria-label="Dismiss" @click="dismiss">×</button>
    </div>
  </div>
</template>

<style scoped>
.pwa-banner {
  position: fixed;
  left: max(0.75rem, env(safe-area-inset-left, 0px));
  right: max(0.75rem, env(safe-area-inset-right, 0px));
  bottom: calc(5.35rem + env(safe-area-inset-bottom, 0px));
  z-index: 40;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.85rem;
  padding: 0.85rem 0.9rem;
  border-radius: 18px;
  border-color: color-mix(in srgb, var(--primary) 34%, transparent);
  box-shadow: 0 18px 40px rgba(0, 0, 0, 0.42);
}

.pwa-banner.guest {
  bottom: calc(0.85rem + env(safe-area-inset-bottom, 0px));
}

.copy {
  min-width: 0;
}

.copy strong {
  display: block;
  font-size: 0.92rem;
}

.copy p {
  margin: 0.2rem 0 0;
  color: var(--muted);
  font-size: 0.78rem;
  line-height: 1.35;
}

.copy b { color: var(--primary); }

.actions {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  flex-shrink: 0;
}

.install {
  padding: 0.62rem 0.95rem;
  font-size: 0.82rem;
}

.dismiss {
  width: 2.2rem;
  height: 2.2rem;
  border: 0;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.06);
  color: var(--muted);
  font-size: 1.35rem;
  line-height: 1;
  cursor: pointer;
}

.dismiss:hover { color: var(--text); }

@media (min-width: 900px) {
  .pwa-banner,
  .pwa-banner.guest {
    left: auto;
    right: max(1.2rem, env(safe-area-inset-right, 0px));
    bottom: max(1.2rem, env(safe-area-inset-bottom, 0px));
    width: min(24rem, calc(100vw - 2.4rem));
  }
}
</style>
