<script setup>
import { nextTick, onMounted, onUnmounted, watch } from "vue";
import { useConfirmStore } from "../stores/confirm";

const confirm = useConfirmStore();

watch(
  () => confirm.open,
  async (open) => {
    if (!open) return;
    await nextTick();
    document.getElementById("halo-confirm-ok")?.focus();
  },
);

function onKey(event) {
  if (!confirm.open) return;
  if (event.key === "Escape") confirm.settle(false);
}

onMounted(() => window.addEventListener("keydown", onKey));
onUnmounted(() => window.removeEventListener("keydown", onKey));
</script>

<template>
  <Teleport to="body">
    <div
      v-if="confirm.open"
      class="confirm-scrim"
      role="presentation"
      @click.self="confirm.settle(false)"
    >
      <div
        class="confirm-card glass"
        role="dialog"
        aria-modal="true"
        aria-labelledby="halo-confirm-title"
        aria-describedby="halo-confirm-message"
      >
        <p class="kicker">Confirmation</p>
        <h2 id="halo-confirm-title">{{ confirm.title }}</h2>
        <p id="halo-confirm-message">{{ confirm.message }}</p>
        <div class="row-actions">
          <button class="btn btn-ghost" type="button" @click="confirm.settle(false)">
            {{ confirm.cancelLabel }}
          </button>
          <button
            id="halo-confirm-ok"
            class="btn"
            :class="{ 'btn-danger': confirm.danger }"
            type="button"
            @click="confirm.settle(true)"
          >
            {{ confirm.confirmLabel }}
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
  z-index: 80;
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
