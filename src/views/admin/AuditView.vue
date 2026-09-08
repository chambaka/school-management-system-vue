<script setup>
import { onMounted, ref } from "vue";
import { auditApi } from "../../api/endpoints";

const rows = ref([]);
const correctionId = ref("");
const action = ref("");
const error = ref("");

const actions = [
  "",
  "FEE_CREATED",
  "FEE_LISTED",
  "INVOICE_GENERATED",
  "INVOICE_LISTED",
  "INVOICE_VIEWED",
  "PAYMENT_RECORDED",
  "PAYMENT_LISTED",
  "PAYMENT_VIEWED",
  "BALANCE_VIEWED",
  "CREATE",
  "UPDATE",
  "DELETE",
  "ACCESS",
  "ACCESS_DENIED",
  "LOGIN",
  "PASSWORD_CHANGE",
  "PASSWORD_RESET",
  "PASSWORD_RESET_REQUESTED",
];

async function load() {
  try {
    const page = await auditApi.tenant({
      correctionId: correctionId.value,
      action: action.value,
      size: 40,
    });
    rows.value = page.content || [];
  } catch (e) {
    error.value = e.message;
  }
}

onMounted(load);
</script>

<template>
  <section class="page">
    <div class="page-head"><div><h1>Audit trail</h1><p class="sub">Every fee, invoice, and payment is logged with amounts</p></div></div>
    <p v-if="error" class="banner banner-error">{{ error }}</p>
    <div class="grid grid-2">
      <label class="field"><span>Correction ID</span><input v-model="correctionId" @change="load" /></label>
      <label class="field"><span>Action</span>
        <select v-model="action" @change="load">
          <option value="">All</option>
          <option v-for="a in actions.filter(Boolean)" :key="a" :value="a">{{ a }}</option>
        </select>
      </label>
    </div>
    <div class="glass card table-wrap">
      <table>
        <thead><tr><th>When</th><th>Corr</th><th>Actor</th><th>Action</th><th>Resource</th><th>Summary</th></tr></thead>
        <tbody>
          <tr v-for="r in rows" :key="r.id">
            <td>{{ r.createdAt }}</td>
            <td><span class="chip-gold chip">{{ r.correctionId }}</span></td>
            <td>{{ r.actorEmail }} <span v-if="r.actorRole" class="muted">{{ r.actorRole }}</span></td>
            <td>{{ r.action }}</td>
            <td>{{ r.resourceType }}:{{ r.resourceId }}</td>
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
.muted { color: var(--muted); font-size: 0.8rem; margin-left: 0.35rem; }
.details { margin-top: 0.25rem; color: var(--muted); font-size: 0.8rem; word-break: break-word; }
</style>
