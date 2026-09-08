<script setup>
import { onBeforeUnmount, ref, watch } from "vue";
import { apiBase, getAccessToken } from "../api/http";

const props = defineProps({
  personId: { type: [Number, String], required: true },
  photoUrl: { type: String, default: "" },
  name: { type: String, default: "" },
  bust: { type: [Number, String], default: 0 },
  size: { type: String, default: "md" },
});

const src = ref("");
let objectUrl = "";

function initials() {
  const parts = (props.name || "?").trim().split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] || "?";
  const second = parts.length > 1 ? parts[1][0] : "";
  return (first + second).toUpperCase();
}

function revoke() {
  if (objectUrl) {
    URL.revokeObjectURL(objectUrl);
    objectUrl = "";
  }
}

async function load() {
  revoke();
  src.value = "";
  if (!props.photoUrl) return;
  const token = getAccessToken();
  if (!token) return;
  try {
    const sep = props.photoUrl.includes("?") ? "&" : "?";
    const res = await fetch(`${apiBase()}${props.photoUrl}${sep}t=${encodeURIComponent(String(props.bust || 0))}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return;
    objectUrl = URL.createObjectURL(await res.blob());
    src.value = objectUrl;
  } catch {
    src.value = "";
  }
}

watch(() => [props.personId, props.photoUrl, props.bust], load, { immediate: true });
onBeforeUnmount(revoke);
</script>

<template>
  <span class="avatar" :class="size" :title="name" aria-hidden="true">
    <img v-if="src" :src="src" :alt="name" />
    <span v-else>{{ initials() }}</span>
  </span>
</template>

<style scoped>
.avatar {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  flex-shrink: 0;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.14);
  color: var(--primary);
  font-weight: 800;
  line-height: 1;
}
.avatar.md {
  width: 2.5rem;
  height: 2.5rem;
  font-size: 0.78rem;
}
.avatar.sm {
  width: 2.15rem;
  height: 2.15rem;
  font-size: 0.68rem;
}
.avatar.lg {
  width: 5.5rem;
  height: 5.5rem;
  font-size: 1.35rem;
}
.avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
</style>
