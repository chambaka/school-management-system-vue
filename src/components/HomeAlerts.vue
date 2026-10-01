<script setup>
import { computed } from "vue";

const props = defineProps({
  alerts: { type: Array, default: () => [] },
  to: { type: String, default: "" },
});

function isPosted(alert) {
  return alert?.title === "Assignment posted" || alert?.title === "New assignment";
}

function alertKey(alert) {
  if (alert?.title === "Assignment submitted") return `submission:${alert.id}`;
  return `${alert?.title || ""}\n${alert?.body || ""}`;
}

function alertWhen(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value).replace("T", " ").slice(0, 16);
  return date.toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const unique = computed(() => {
  const seen = new Set();
  const items = [];
  for (const alert of props.alerts || []) {
    const key = alertKey(alert);
    if (seen.has(key)) continue;
    seen.add(key);
    items.push(alert);
  }
  return items;
});
const unread = computed(() => unique.value.filter((alert) => !alert.read));
const shown = computed(() => {
  const posted = unique.value.filter(isPosted);
  const submissions = unique.value.filter((alert) => alert.title === "Assignment submitted").slice(0, 5);
  const other = unique.value.filter((alert) => !isPosted(alert) && alert.title !== "Assignment submitted" && !alert.read);
  return [...posted, ...submissions, ...other];
});
</script>

<template>
  <article class="glass card">
    <h3>Alerts</h3>
    <p v-if="unread.length" class="sub">{{ unread.length }} unread</p>
    <p v-for="n in shown" :key="n.id" class="alert-line">
      <span>{{ n.title }}<template v-if="n.body"> · {{ n.body }}</template></span>
      <span v-if="alertWhen(n.createdAt)" class="alert-date">{{ alertWhen(n.createdAt) }}</span>
    </p>
    <p v-if="!shown.length" class="empty">No notifications.</p>
    <router-link v-if="to" class="linkish" :to="to">All alerts</router-link>
  </article>
</template>

<style scoped>
.alert-line {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 0.35rem 0.7rem;
}
.alert-date {
  color: #1a1203;
  background: linear-gradient(135deg, #ffe08a, var(--primary) 50%, #d7a227);
  border-radius: 999px;
  padding: 0.12rem 0.5rem;
  font-size: 0.75rem;
  font-weight: 800;
}
</style>
