<script setup>
import { nextTick, onMounted, onUnmounted, watch } from "vue";
import { useNoticeStore } from "../stores/notice";

const notice = useNoticeStore();

watch(
  () => notice.open,
  async (open) => {
    if (!open) return;
    await nextTick();
    document.getElementById("halo-notice-ok")?.focus();
  },
);

function onKey(event) {
  if (!notice.open) return;
  if (event.key === "Escape" || event.key === "Enter") {
    event.preventDefault();
    notice.close();
  }
}

onMounted(() => window.addEventListener("keydown", onKey));
onUnmounted(() => window.removeEventListener("keydown", onKey));
</script>

<template>
  <Teleport to="body">
    <div
      v-if="notice.open"
      class="notice-scrim"
      role="presentation"
      @click.self="notice.close()"
    >
      <div
        class="notice-card glass"
        :class="`is-${notice.type}`"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="halo-notice-title"
        aria-describedby="halo-notice-message"
      >
        <p class="kicker">{{ notice.type }}</p>
        <h2 id="halo-notice-title">{{ notice.title }}</h2>
        <p id="halo-notice-message">{{ notice.message }}</p>
        <div class="row-actions">
          <button id="halo-notice-ok" class="btn" type="button" @click="notice.close()">
            OK
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.notice-scrim {
  position: fixed;
  inset: 0;
  z-index: 90;
  display: grid;
  place-items: center;
  padding: 1.25rem;
  background: rgba(4, 10, 22, 0.72);
}
.notice-card {
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
.is-error .kicker { color: #ff8b98; }
.is-warning .kicker { color: #f5c451; }
.is-success .kicker { color: var(--secondary); }
h2 {
  margin: 0 0 0.55rem;
  font-size: 1.35rem;
}
p {
  margin: 0 0 1.1rem;
  color: var(--muted);
  white-space: pre-wrap;
}
.row-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.6rem;
}
.is-error .btn { background: #c4455a; color: #fff; }
.is-warning .btn { background: #c49214; color: #1a1406; }
</style>
