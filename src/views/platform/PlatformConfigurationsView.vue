<script setup>
import { computed, onMounted, ref } from "vue";
import { auditApi } from "../../api/endpoints";

const events = ref([]);
const error = ref("");
const saving = ref("");
const bulkBusy = ref(false);

const groups = computed(() => {
  const order = ["Auth", "Finance", "HTTP trail"];
  const map = new Map();
  for (const event of events.value) {
    if (!map.has(event.group)) map.set(event.group, []);
    map.get(event.group).push(event);
  }
  return order.filter((name) => map.has(name)).map((name) => ({ name, items: map.get(name) }));
});

async function load() {
  error.value = "";
  try {
    const audit = await auditApi.settings();
    events.value = audit.events || [];
  } catch (e) {
    error.value = e.message;
  }
}

async function toggle(item) {
  saving.value = item.action;
  error.value = "";
  try {
    const updated = await auditApi.setEnabled(item.action, !item.enabled);
    events.value = events.value.map((row) => (row.action === updated.action ? updated : row));
  } catch (e) {
    error.value = e.message;
  } finally {
    saving.value = "";
  }
}

async function setAll(enabled) {
  bulkBusy.value = true;
  error.value = "";
  try {
    const data = await auditApi.replaceSettings(events.value.map((row) => ({
      action: row.action,
      enabled,
    })));
    events.value = data.events || [];
  } catch (e) {
    error.value = e.message;
  } finally {
    bulkBusy.value = false;
  }
}

onMounted(load);
</script>

<template>
  <section class="page">
    <div class="page-head">
      <div>
        <h1>Configurations</h1>
        <p class="sub">Choose which events are written to the audit trail.</p>
      </div>
      <div class="row-actions">
        <button class="btn" type="button" :disabled="bulkBusy || !events.length" v-confirm="'Turn on every audit event?'" @click="setAll(true)">Enable all</button>
        <button class="btn btn-ghost" type="button" :disabled="bulkBusy || !events.length" v-confirm="'Turn off every audit event?'" @click="setAll(false)">Disable all</button>
      </div>
    </div>
    <p v-if="error" class="banner banner-error">{{ error }}</p>
    <div v-for="group in groups" :key="group.name" class="glass card group">
      <h2>{{ group.name }}</h2>
      <ul>
        <li v-for="item in group.items" :key="item.action">
          <div>
            <strong>{{ item.label }}</strong>
            <small>{{ item.action }}</small>
            <p>{{ item.description }}</p>
          </div>
          <button
            class="btn"
            :class="item.enabled ? '' : 'btn-ghost'"
            type="button"
            :disabled="saving === item.action || bulkBusy"
            v-confirm="item.enabled ? `Turn off ${item.label}?` : `Turn on ${item.label}?`"
            @click="toggle(item)"
          >
            {{ item.enabled ? "On" : "Off" }}
          </button>
        </li>
      </ul>
    </div>
  </section>
</template>

<style scoped>
.group { margin-bottom: 1rem; }
.group h2 { margin: 0 0 0.85rem; font-size: 1.15rem; }
.group ul { list-style: none; margin: 0; padding: 0; display: grid; gap: 0.55rem; }
.group li {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.75rem 0.2rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}
.group li:last-child { border-bottom: 0; }
.group strong { display: block; }
.group small {
  display: block;
  margin-top: 0.15rem;
  color: var(--primary);
  font-size: 0.68rem;
  font-weight: 800;
  letter-spacing: 0.06em;
}
.group p {
  margin: 0.25rem 0 0;
  color: var(--muted);
  font-size: 0.86rem;
}
.group .btn { min-width: 4.6rem; flex-shrink: 0; }
</style>
