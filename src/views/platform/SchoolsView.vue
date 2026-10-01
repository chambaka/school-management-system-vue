<script setup>
import { onMounted, ref } from "vue";
import { schoolApi, tenantApi } from "../../api/endpoints";
import Icon from "../../components/Icon.vue";
import ListSearch from "../../components/ListSearch.vue";
import { useListSearch } from "../../utils/listSearch";
import { officersPath } from "../../utils/openSchool";
import { statusLabel } from "../../utils/status";
import { useAuthStore } from "../../stores/auth";
import { useConfigStore } from "../../stores/config";
import { useFeedback } from "../../composables/useFeedback";


const auth = useAuthStore();
const config = useConfigStore();

const schools = ref([]);
const tenantSlugs = ref({});
const { query, filteredRows } = useListSearch(schools, (s) => [
  s.name, s.slug, s.tenantName, tenantSlugs.value[s.tenantId], statusLabel(s.status),
]);
const { error } = useFeedback();
const renamingId = ref(null);
const schoolName = ref("");
const savingName = ref(false);

function organizationSlug(school) {
  return tenantSlugs.value[school.tenantId] || "";
}

async function load() {
  const [schoolRows, tenantRows] = await Promise.all([
    schoolApi.platformList(),
    tenantApi.platformList().catch(() => []),
  ]);
  schools.value = schoolRows;
  tenantSlugs.value = Object.fromEntries((tenantRows || []).map((tenant) => [tenant.id, tenant.slug]));
}

onMounted(async () => {
  try {
    await load();
  } catch (e) {
    error.value = e.message;
  }
});

function startRename(school) {
  error.value = "";
  renamingId.value = school.id;
  schoolName.value = school.name || "";
}

function cancelRename() {
  renamingId.value = null;
  schoolName.value = "";
}

async function saveName(school) {
  error.value = "";
  savingName.value = true;
  try {
    await schoolApi.platformUpdate(school.id, { name: schoolName.value.trim() });
    await load();
    cancelRename();
  } catch (e) {
    error.value = e.message;
  } finally {
    savingName.value = false;
  }
}

async function setStatus(school, status) {
  try {
    await schoolApi.platformUpdate(school.id, { status });
    await load();
  } catch (e) {
    error.value = e.message;
  }
}

async function deleteSchool(school) {
  try {
    await schoolApi.platformDelete(school.id);
    await load();
  } catch (e) {
    error.value = e.message;
  }
}
</script>

<template>
  <section class="page">
    <div class="page-head">
      <div>
        <h1>Schools</h1>
        <p class="sub">Each school belongs to one organization. Those names are listed separately below.</p>
      </div>
      <ListSearch v-model="query" placeholder="Search schools" />
    </div>
    <p v-if="!error && !filteredRows.length" class="banner">{{ query.trim() ? "No schools match that search." : "No schools yet." }}</p>
    <div class="grid grid-2">
      <article v-for="s in filteredRows" :key="s.id" class="glass card school">
        <div class="card-head">
          <div>
            <p class="kicker">School</p>
            <form
              v-if="renamingId === s.id"
              class="rename"
              data-confirm="Save this school name?"
              @submit.prevent="saveName(s)"
            >
              <input v-model="schoolName" required maxlength="150" aria-label="School name" />
              <button class="btn" :disabled="savingName || !schoolName.trim()">{{ savingName ? "Saving…" : "Save name" }}</button>
              <button class="btn btn-ghost" type="button" :disabled="savingName" @click="cancelRename">Cancel</button>
            </form>
            <h3 v-else>{{ s.name }}</h3>
          </div>
          <span class="chip">{{ statusLabel(s.status) }}</span>
        </div>
        <p v-if="s.slug" class="slug">School slug · {{ s.slug }}</p>
        <p class="org">
          <span>Organization</span>
          {{ s.tenantName || "Unknown organization" }}
        </p>
        <p v-if="organizationSlug(s)" class="slug">Organization slug · {{ organizationSlug(s) }}</p>
        <p v-if="s.customDomain" class="sub">Domain · {{ s.customDomain }}</p>
        <div class="row-actions">
          <router-link
            v-if="s.status === 'ACTIVE'"
            class="btn"
            :to="officersPath(s, auth.role, config.singleTenant)"
          >Officers</router-link>
          <button
            v-if="renamingId !== s.id"
            class="btn btn-ghost"
            type="button"
            @click="startRename(s)"
          >Rename</button>
          <button
            class="btn btn-teal"
            type="button"
            :disabled="s.status === 'ACTIVE'"
            v-confirm="`Activate ${s.name}?`"
            @click="setStatus(s, 'ACTIVE')"
          >Activate</button>
          <button
            class="btn btn-ghost"
            type="button"
            :disabled="s.status !== 'ACTIVE'"
            v-confirm="`Suspend ${s.name}?`"
            @click="setStatus(s, 'SUSPENDED')"
          >Suspend</button>
          <button
            class="icon-btn"
            type="button"
            :aria-label="`Delete ${s.name}`"
            title="Delete"
            v-confirm="{ message: `Delete ${s.name}? The school will be archived and all of its users will be removed from live. Data is kept.`, danger: true }"
            @click="deleteSchool(s)"
          ><Icon name="trash" /></button>
        </div>
      </article>
    </div>
  </section>
</template>

<style scoped>
.school h3 { margin: 0 0 0.35rem; }
.slug {
  margin: 0 0 0.55rem;
  color: var(--muted);
  font-size: 0.82rem;
  font-weight: 650;
}
.kicker {
  margin: 0 0 0.2rem;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--primary);
  font-size: 0.68rem;
  font-weight: 800;
}
.org {
  margin: 0 0 0.55rem;
  color: var(--text);
  font-weight: 650;
}
.org span {
  display: block;
  margin-bottom: 0.15rem;
  color: var(--muted);
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
.rename {
  display: flex;
  flex-wrap: wrap;
  gap: 0.55rem;
  align-items: center;
  margin: 0 0 0.75rem;
}
.rename input {
  min-width: min(100%, 16rem);
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(4, 10, 22, 0.42);
  color: var(--text);
  border-radius: 14px;
  padding: 0.7rem 0.9rem;
}
</style>
