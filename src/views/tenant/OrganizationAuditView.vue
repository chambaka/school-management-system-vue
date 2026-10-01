<script setup>
import { onMounted, ref } from "vue";
import { tenantApi } from "../../api/endpoints";
import ListSearch from "../../components/ListSearch.vue";
import { useListSearch } from "../../utils/listSearch";
import { useFeedback } from "../../composables/useFeedback";

const rows = ref([]);
const { query, filteredRows } = useListSearch(rows, (row) => [
  row.actorEmail, row.actorRole, row.action, row.resourceType, row.summary, row.httpPath, row.correctionId,
]);
const { error } = useFeedback();

async function load() {
  try {
    const page = await tenantApi.audit({ size: 40 });
    rows.value = page.content || [];
  } catch (e) {
    error.value = e.message;
  }
}

onMounted(load);
</script>

<template>
  <section class="page">
    <div class="page-head">
      <div>
        <h1>Organization audit</h1>
        <p class="sub">Organization profile, schools, and officer changes</p>
      </div>
      <ListSearch v-model="query" placeholder="Search audit log" />
    </div>
    <p v-if="!filteredRows.length" class="banner">{{ query.trim() ? "No audit rows match that search." : "No organization changes have been recorded yet." }}</p>
    <div v-else class="glass card table-wrap">
      <table>
        <thead>
          <tr><th>When</th><th class="corr">Correction ID</th><th>Who</th><th>Action</th><th>What</th><th>Summary</th></tr>
        </thead>
        <tbody>
          <tr v-for="row in filteredRows" :key="row.id">
            <td>{{ row.createdAt }}</td>
            <td class="corr"><span class="corr-id">{{ row.correctionId || "—" }}</span></td>
            <td>{{ row.actorEmail || "—" }}</td>
            <td>{{ row.action }}</td>
            <td>{{ row.resourceType }}</td>
            <td>{{ row.summary }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>
