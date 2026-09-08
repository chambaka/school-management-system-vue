<script setup>
import { onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import { tenantApi } from "../../api/endpoints";
import Icon from "../../components/Icon.vue";
import { useConfigStore } from "../../stores/config";
import { officersPath } from "../../utils/openSchool";
import { statusLabel } from "../../utils/status";
import { useAuthStore } from "../../stores/auth";

const auth = useAuthStore();

const router = useRouter();
const config = useConfigStore();
const tenants = ref([]);
const schoolsByTenant = ref({});
const error = ref("");

function schoolCountLabel(count) {
  if (!count) return "No schools yet";
  if (count === 1) return "1 school in this organization";
  return `${count} schools in this organization`;
}

async function load() {
  tenants.value = await tenantApi.platformList();
  const map = {};
  await Promise.all(tenants.value.map(async (t) => {
    map[t.id] = await tenantApi.platformSchools(t.id);
  }));
  schoolsByTenant.value = map;
}

onMounted(async () => {
  if (config.singleTenant) {
    await router.replace("/tenant/schools");
    return;
  }
  try {
    await load();
  } catch (e) {
    if (e.status === 403) {
      await router.replace("/tenant/schools");
      return;
    }
    error.value = e.message;
  }
});

async function setStatus(tenant, status) {
  try {
    await tenantApi.platformUpdate(tenant.id, { status });
    await load();
  } catch (e) {
    error.value = e.message;
  }
}

async function deleteOrganization(tenant) {
  try {
    await tenantApi.platformDelete(tenant.id);
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
        <h1>Tenants</h1>
        <p class="sub">Platform organizations. Each tenant can own one or more schools.</p>
      </div>
      <router-link class="btn" to="/platform/tenants/new">Create tenant</router-link>
    </div>
    <p v-if="error" class="banner banner-error">{{ error }}</p>
    <p v-if="!error && !tenants.length" class="banner">No tenants yet. Create the first organization.</p>
    <div class="grid">
      <article v-for="t in tenants" :key="t.id" class="glass card tenant">
        <header class="tenant-head">
          <div class="title">
            <p class="org-label">Organization</p>
            <h3>{{ t.name }}</h3>
            <p class="count">{{ schoolCountLabel(t.schoolCount) }}</p>
          </div>
          <span class="chip">{{ statusLabel(t.status) }}</span>
        </header>
        <p class="schools-label">Schools</p>
        <ul class="schools">
          <li v-for="s in (schoolsByTenant[t.id] || [])" :key="s.id">
            <span class="school-name">
              <Icon name="school" />
              {{ s.name }}
            </span>
            <span class="school-actions">
              <span class="chip tiny">{{ statusLabel(s.status) }}</span>
              <router-link
                v-if="s.status === 'ACTIVE'"
                class="btn btn-tiny"
                :to="officersPath(s, auth.role, config.singleTenant)"
              >Officers</router-link>
            </span>
          </li>
          <li v-if="!(schoolsByTenant[t.id] || []).length" class="empty">No schools have been added yet</li>
        </ul>
        <div class="row-actions">
          <router-link v-if="t.status === 'ACTIVE'" class="btn" :to="`/platform/tenants/${t.id}/schools/new`">Add school</router-link>
          <button class="btn btn-teal" type="button" v-confirm="`Activate ${t.name}?`" @click="setStatus(t, 'ACTIVE')">Activate</button>
          <button class="btn btn-ghost" type="button" v-confirm="`Suspend ${t.name}?`" @click="setStatus(t, 'SUSPENDED')">Suspend</button>
          <button
            class="btn btn-danger"
            type="button"
            v-confirm="{ message: `Delete ${t.name}? The organization, its schools, and all of their users will be archived and removed from live. Data is kept.`, danger: true }"
            @click="deleteOrganization(t)"
          >Delete</button>
        </div>
      </article>
    </div>
  </section>
</template>

<style scoped>
.tenant {
  display: grid;
  gap: 0.85rem;
}
.tenant-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
}
.org-label,
.schools-label {
  margin: 0;
  color: var(--muted);
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
.title h3 {
  margin: 0;
  font-size: 1.35rem;
  letter-spacing: -0.02em;
}
.count {
  margin: 0.4rem 0 0;
  color: var(--muted);
  font-size: 0.95rem;
}
.schools {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 0.45rem;
}
.schools li {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.7rem 0.85rem;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.06);
}
.school-name {
  display: inline-flex;
  align-items: center;
  gap: 0.55rem;
  font-weight: 650;
}
.school-name :deep(svg) {
  width: 1rem;
  height: 1rem;
  opacity: 0.75;
}
.empty {
  color: var(--muted);
  border-style: dashed;
}
.tiny {
  font-size: 0.62rem;
  padding: 0.2rem 0.55rem;
}
.school-actions {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
}
.btn-tiny {
  padding: 0.28rem 0.7rem;
  font-size: 0.75rem;
}
</style>
