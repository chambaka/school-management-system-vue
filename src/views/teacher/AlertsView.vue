<script setup>
import { onMounted, ref } from "vue";
import { notificationApi } from "../../api/endpoints";
import { useFeedback } from "../../composables/useFeedback";

const alerts = ref([]);
const { error } = useFeedback();

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

onMounted(async () => {
  try {
    alerts.value = (await notificationApi.inbox()) || [];
  } catch (e) {
    error.value = e.message;
  }
});

async function markRead(item) {
  try {
    await notificationApi.markRead(item.id);
    item.read = true;
  } catch (e) {
    error.value = e.message;
  }
}
</script>

<template>
  <section class="page">
    <div class="page-head">
      <div>
        <h1>Alerts</h1>
        <p class="sub">{{ alerts.length }} alert{{ alerts.length === 1 ? "" : "s" }}</p>
      </div>
    </div>
    <article class="glass card">
      <p v-if="!alerts.length" class="empty">No alerts.</p>
      <div v-for="n in alerts" :key="n.id" class="row">
        <div>
          <strong>{{ n.title }}</strong>
          <p class="sub">
            {{ n.body }}
            <template v-if="alertWhen(n.createdAt)"> · {{ alertWhen(n.createdAt) }}</template>
          </p>
        </div>
        <button v-if="!n.read" class="btn btn-ghost" type="button" @click="markRead(n)">Mark read</button>
      </div>
    </article>
  </section>
</template>

<style scoped>
.row {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  align-items: center;
  padding: 0.75rem 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}
.row:last-child { border-bottom: 0; }
</style>
