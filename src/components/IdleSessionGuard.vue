<script setup>
import { computed } from "vue";
import { storeToRefs } from "pinia";
import { useRouter } from "vue-router";
import { tryRefreshSession } from "../api/http";
import { useIdleSession } from "../composables/useIdleSession";
import { useAuthStore } from "../stores/auth";

const router = useRouter();
const auth = useAuthStore();
const { isAuthed } = storeToRefs(auth);

const {
  warningOpen,
  secondsLeft,
  loggingOut,
  staySignedIn,
  signOutNow,
} = useIdleSession({
  isActive: isAuthed,
  onStaySignedIn: async () => {
    const token = await tryRefreshSession();
    if (token) auth.accessToken = token;
  },
  onIdleLogout: async () => {
    const current = router.currentRoute.value;
    try {
      await auth.logout();
    } catch {
      /* already signed out locally */
    }
    if (current.path === "/login") return;
    const query = { idle: "1" };
    if (current.fullPath && current.fullPath !== "/" && current.path !== "/login") {
      query.next = current.fullPath;
    }
    await router.replace({ path: "/login", query });
  },
});

const warnMessage = computed(() => {
  const s = Math.max(0, Number(secondsLeft.value) || 0);
  const unit = s === 1 ? "second" : "seconds";
  return `You've been inactive. You'll be signed out in ${s} ${unit} unless you stay signed in.`;
});
</script>

<template>
  <Teleport to="body">
    <div
      v-if="warningOpen"
      class="confirm-scrim"
      role="presentation"
    >
      <div
        class="confirm-card glass"
        role="dialog"
        aria-modal="true"
        aria-labelledby="idle-session-title"
        aria-describedby="idle-session-message"
      >
        <p class="kicker">Session</p>
        <h2 id="idle-session-title">Still there?</h2>
        <p id="idle-session-message">{{ warnMessage }}</p>
        <div class="row-actions">
          <button class="btn btn-ghost" type="button" :disabled="loggingOut" @click="signOutNow">
            Sign out
          </button>
          <button
            id="idle-session-stay"
            class="btn"
            type="button"
            :disabled="loggingOut"
            @click="staySignedIn"
          >
            Stay signed in
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.confirm-scrim {
  position: fixed;
  inset: 0;
  z-index: 90;
  display: grid;
  place-items: center;
  padding: 1.25rem;
  background: rgba(4, 10, 22, 0.72);
}
.confirm-card {
  width: min(28rem, 100%);
  padding: 1.25rem 1.3rem 1.15rem;
}
.kicker {
  margin: 0 0 0.25rem;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--primary);
  font-size: 0.68rem;
  font-weight: 800;
}
h2 {
  margin: 0 0 0.55rem;
  font-size: 1.35rem;
}
p {
  margin: 0 0 1.1rem;
  color: var(--muted);
}
.row-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.6rem;
}
</style>
