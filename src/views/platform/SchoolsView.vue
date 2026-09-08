<script setup>
import { onMounted, ref } from "vue";
import { schoolApi } from "../../api/endpoints";
import { officersPath } from "../../utils/openSchool";
import { statusLabel } from "../../utils/status";
import { useAuthStore } from "../../stores/auth";
import { useConfigStore } from "../../stores/config";

const auth = useAuthStore();
const config = useConfigStore();

const schools = ref([]);
const error = ref("");

onMounted(async () => {
  try {
    schools.value = await schoolApi.platformList();
  } catch (e) {
    error.value = e.message;
  }
});

async function setStatus(school, status) {
  try {
    await schoolApi.platformUpdate(school.id, { status });
    schools.value = await schoolApi.platformList();
  } catch (e) {
    error.value = e.message;
  }
}

async function deleteSchool(school) {
  try {
    await schoolApi.platformDelete(school.id);
    schools.value = await schoolApi.platformList();
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
    </div>
    <p v-if="error" class="banner banner-error">{{ error }}</p>
    <p v-if="!error && !schools.length" class="banner">No schools yet.</p>
    <div class="grid grid-2">
      <article v-for="s in schools" :key="s.id" class="glass card school">
        <p class="kicker">School</p>
        <h3>{{ s.name }}</h3>
        <p class="org">
          <span>Organization</span>
          {{ s.tenantName || "Unknown organization" }}
        </p>
        <p v-if="s.customDomain" class="sub">Domain · {{ s.customDomain }}</p>
        <span class="chip">{{ statusLabel(s.status) }}</span>
        <div class="row-actions" style="margin-top:0.8rem">
          <router-link
            v-if="s.status === 'ACTIVE'"
            class="btn"
            :to="officersPath(s, auth.role, config.singleTenant)"
          >Officers</router-link>
          <button class="btn btn-teal" type="button" v-confirm="`Activate ${s.name}?`" @click="setStatus(s, 'ACTIVE')">Activate</button>
          <button class="btn btn-ghost" type="button" v-confirm="`Suspend ${s.name}?`" @click="setStatus(s, 'SUSPENDED')">Suspend</button>
          <button
            class="btn btn-danger"
            type="button"
            v-confirm="{ message: `Delete ${s.name}? The school will be archived and all of its users will be removed from live. Data is kept.`, danger: true }"
            @click="deleteSchool(s)"
          >Delete</button>
        </div>
      </article>
    </div>
  </section>
</template>

<style scoped>
.school h3 { margin: 0 0 0.75rem; }
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
</style>
