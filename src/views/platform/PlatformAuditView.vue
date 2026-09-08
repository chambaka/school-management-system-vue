<script setup>
import { onMounted, ref } from "vue";
import { auditApi } from "../../api/endpoints";

const rows = ref([]);
const error = ref("");
const action = ref("");

const actions = [
  "",
  "FEE_CREATED",
  "INVOICE_GENERATED",
  "PAYMENT_RECORDED",
  "INVOICE_VIEWED",
  "BALANCE_VIEWED",
  "CREATE",
  "UPDATE",
  "LOGIN",
  "ACCESS_DENIED",
];

async function load() {
  try {
    rows.value = (await auditApi.platform({ action: action.value, size: 50 })).content || [];
  } catch (e) {
    error.value = e.message;
  }
}

onMounted(load);
</script>

<template>
  <section class="page">
    <div class="page-head"><div><h1>Platform audit</h1><p class="sub">Across all schools, including finance</p></div></div>
    <p v-if="error" class="banner banner-error">{{ error }}</p>
    <label class="field">
      <span>Action</span>
      <select v-model="action" @change="load">
        <option value="">All</option>
        <option v-for="a in actions.filter(Boolean)" :key="a" :value="a">{{ a }}</option>
      </select>
    </label>
    <div class="glass card table-wrap">
      <table>
        <thead><tr><th>When</th><th>Scope</th><th>Corr</th><th>Actor</th><th>Action</th><th>Summary</th></tr></thead>
        <tbody>
          <tr v-for="r in rows" :key="r.id">
            <td>{{ r.createdAt }}</td>
            <td>{{ r.scope }}</td>
            <td>{{ r.correctionId }}</td>
            <td>{{ r.actorEmail }}</td>
            <td>{{ r.action }}</td>
            <td>
              <div>{{ r.summary }}</div>
              <div v-if="r.details" class="details">{{ r.details }}</div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>

<style scoped>
.details { margin-top: 0.25rem; color: var(--muted); font-size: 0.8rem; word-break: break-word; }
.field { max-width: 20rem; margin-bottom: 1rem; }
</style>
