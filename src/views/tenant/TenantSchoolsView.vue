<script setup>
import { onMounted, ref } from "vue";
import { tenantApi } from "../../api/endpoints";
import { officersPath, openSchool } from "../../utils/openSchool";
import { statusLabel } from "../../utils/status";
import { useAuthStore } from "../../stores/auth";
import { useConfigStore } from "../../stores/config";

const auth = useAuthStore();
const config = useConfigStore();
const tenant = ref(null);
const schools = ref([]);
const error = ref("");
const renaming = ref(false);
const editingName = ref(false);
const orgName = ref("");

async function load() {
  tenant.value = await tenantApi.current();
  schools.value = await tenantApi.schools();
  orgName.value = tenant.value?.name || "";
}

onMounted(async () => {
  try {
    await load();
  } catch (e) {
    error.value = e.message;
  }
});

async function renameOrganization() {
  error.value = "";
  renaming.value = true;
  try {
    tenant.value = await tenantApi.rename({ name: orgName.value.trim() });
    editingName.value = false;
  } catch (e) {
    error.value = e.message;
  } finally {
    renaming.value = false;
  }
}

function cancelRename() {
  orgName.value = tenant.value?.name || "";
  editingName.value = false;
}

async function enterSchool(school) {
  try {
    await openSchool(school);
  } catch (e) {
    error.value = e.message;
  }
}
</script>

<template>
  <section class="page">
    <div class="page-head">
      <div>
        <p class="kicker">Organization</p>
        <form v-if="editingName" class="rename" data-confirm="Save this organization name?" @submit.prevent="renameOrganization">
          <input v-model="orgName" required maxlength="150" aria-label="Organization name" />
          <button class="btn" :disabled="renaming || !orgName.trim()">{{ renaming ? "Saving…" : "Save name" }}</button>
          <button class="btn btn-ghost" type="button" :disabled="renaming" @click="cancelRename">Cancel</button>
        </form>
        <template v-else>
          <h1>{{ tenant?.name || "Organization" }}</h1>
          <p class="sub">
            {{ schools.length === 1 ? "1 school in this organization" : `${schools.length} schools in this organization` }}
          </p>
        </template>
      </div>
      <div v-if="!editingName && tenant" class="row-actions">
        <router-link v-if="tenant.status === 'ACTIVE'" class="btn" to="/tenant/schools/new">Add school</router-link>
        <button class="btn btn-ghost" type="button" @click="editingName = true">
          Rename organization
        </button>
      </div>
    </div>
    <p v-if="error" class="banner banner-error">{{ error }}</p>
    <p v-if="!schools.length" class="banner">No schools yet. Add the first one, then open it to run the school.</p>
    <div class="grid grid-2">
      <article v-for="s in schools" :key="s.id" class="glass card">
        <p class="kicker">School</p>
        <h3>{{ s.name }}</h3>
        <p class="org">
          <span>Organization</span>
          {{ tenant?.name || "This organization" }}
        </p>
        <span class="chip">{{ statusLabel(s.status) }}</span>
        <div class="row-actions" style="margin-top:0.8rem">
          <router-link
            v-if="s.status === 'ACTIVE'"
            class="btn"
            :to="officersPath(s, auth.role, config.singleTenant)"
          >Officers</router-link>
          <button
            v-if="auth.role === 'HEADMASTER'"
            class="btn btn-ghost"
            type="button"
            v-confirm="`Open ${s.name}?`"
            @click="enterSchool(s)"
          >Open school</button>
        </div>
      </article>
    </div>
  </section>
</template>

<style scoped>
.kicker {
  margin: 0 0 0.25rem;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--primary);
  font-size: 0.7rem;
  font-weight: 800;
}
h3 { margin: 0 0 0.55rem; }
.org {
  margin: 0 0 0.7rem;
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
  margin-top: 0.35rem;
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
