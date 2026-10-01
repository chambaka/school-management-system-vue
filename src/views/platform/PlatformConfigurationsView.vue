<script setup>
import { computed, onMounted, reactive, ref } from "vue";
import { auditApi, qualificationApi, tenantApi, twoFactorApi } from "../../api/endpoints";
import Icon from "../../components/Icon.vue";
import ListSearch from "../../components/ListSearch.vue";
import { matchesSearch } from "../../utils/listSearch";
import { useFeedback } from "../../composables/useFeedback";


const events = ref([]);
const tenants = ref([]);
const qualifications = ref([]);
const twoFactor = ref({ name: "ShuleHub 2FA", description: "", schools: [] });
const { error } = useFeedback();
const saving = ref("");
const bulkBusy = ref(false);
const query = ref("");
const qualForm = reactive({ name: "" });
const editingQualId = ref(null);

const visibleTenants = computed(() => {
  const q = query.value;
  const titleHit = matchesSearch(q, "terms per school year", "terms", "academic year");
  return tenants.value.filter((tenant) => titleHit || matchesSearch(
    q,
    tenant.name,
    `${tenant.termsPerYear || 4} terms`,
    tenant.schoolCount === 1 ? "1 school" : `${tenant.schoolCount || 0} schools`,
  ));
});

const visibleSchools = computed(() => {
  const q = query.value;
  const titleHit = matchesSearch(q, twoFactor.value.name, "2fa", "authenticator", "google");
  return (twoFactor.value.schools || []).filter((school) => titleHit || matchesSearch(
    q,
    school.schoolName,
    school.tenantName,
    school.enabled ? "on" : "off",
  ));
});

const qualificationTitleHit = computed(() =>
  matchesSearch(query.value, "teacher qualifications", "qualification", "diploma", "degree"),
);

const visibleQualifications = computed(() => {
  if (qualificationTitleHit.value) return qualifications.value;
  return qualifications.value.filter((row) => matchesSearch(query.value, row.name));
});

const showQualificationsCard = computed(() =>
  !query.value.trim() || qualificationTitleHit.value || visibleQualifications.value.length > 0,
);

const groups = computed(() => {
  const order = ["Auth", "Finance", "HTTP trail"];
  const map = new Map();
  for (const event of events.value) {
    if (!matchesSearch(query.value, event.group, event.label, event.action, event.description, event.enabled ? "on" : "off")) {
      continue;
    }
    if (!map.has(event.group)) map.set(event.group, []);
    map.get(event.group).push(event);
  }
  return order.filter((name) => map.has(name)).map((name) => ({ name, items: map.get(name) }));
});

const hasResults = computed(() =>
  visibleTenants.value.length > 0
  || visibleSchools.value.length > 0
  || groups.value.length > 0
  || showQualificationsCard.value,
);

async function load() {
  error.value = "";
  try {
    const [audit, factor, organizations, catalog] = await Promise.all([
      auditApi.settings(),
      twoFactorApi.settings(),
      tenantApi.platformList(),
      qualificationApi.list(),
    ]);
    events.value = audit.events || [];
    tenants.value = organizations || [];
    qualifications.value = catalog || [];
    twoFactor.value = {
      name: factor.name || "ShuleHub 2FA",
      description: factor.description || "",
      schools: factor.schools || [],
    };
  } catch (e) {
    error.value = e.message;
  }
}

function resetQualForm() {
  editingQualId.value = null;
  qualForm.name = "";
}

function startEditQual(row) {
  editingQualId.value = row.id;
  qualForm.name = row.name;
}

async function saveQual() {
  const name = qualForm.name.trim();
  if (!name) return;
  saving.value = editingQualId.value ? `qual-${editingQualId.value}` : "qual-new";
  error.value = "";
  try {
    if (editingQualId.value) {
      const updated = await qualificationApi.update(editingQualId.value, { name });
      qualifications.value = qualifications.value.map((row) => (row.id === updated.id ? updated : row));
    } else {
      const created = await qualificationApi.create({ name });
      qualifications.value = [...qualifications.value, created];
    }
    resetQualForm();
  } catch (e) {
    error.value = e.message;
  } finally {
    saving.value = "";
  }
}

async function removeQual(row) {
  saving.value = `qual-${row.id}`;
  error.value = "";
  try {
    await qualificationApi.delete(row.id);
    qualifications.value = qualifications.value.filter((item) => item.id !== row.id);
    if (editingQualId.value === row.id) resetQualForm();
  } catch (e) {
    error.value = e.message;
  } finally {
    saving.value = "";
  }
}

async function setTermsPerYear(tenant, termsPerYear) {
  if ((tenant.termsPerYear || 4) === termsPerYear) return;
  saving.value = `terms-${tenant.id}`;
  error.value = "";
  try {
    const updated = await tenantApi.platformUpdate(tenant.id, { termsPerYear });
    tenants.value = tenants.value.map((row) => (
      row.id === tenant.id ? { ...row, termsPerYear: updated.termsPerYear } : row
    ));
  } catch (e) {
    error.value = e.message;
  } finally {
    saving.value = "";
  }
}

async function toggleTwoFactor(school) {
  saving.value = `2fa-${school.schoolId}`;
  error.value = "";
  try {
    const updated = await twoFactorApi.setEnabled(school.schoolId, !school.enabled);
    twoFactor.value.schools = twoFactor.value.schools.map((row) => (
      row.schoolId === updated.schoolId ? updated : row
    ));
  } catch (e) {
    error.value = e.message;
  } finally {
    saving.value = "";
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
        <p class="sub">Platform settings. Only a platform admin can change these.</p>
      </div>
      <div class="row-actions">
        <ListSearch v-model="query" placeholder="Search configurations" />
        <button class="btn" type="button" :disabled="bulkBusy || !events.length" v-confirm="'Turn on every audit event?'" @click="setAll(true)">Enable all</button>
        <button class="btn btn-ghost" type="button" :disabled="bulkBusy || !events.length" v-confirm="'Turn off every audit event?'" @click="setAll(false)">Disable all</button>
      </div>
    </div>
    <p v-if="query.trim() && !hasResults" class="banner">No settings match that search.</p>
    <div v-if="showQualificationsCard" class="glass card group">
      <h2>Teacher qualifications</h2>
      <p class="intro">These names appear in the Qualification dropdown when a school adds or edits a teacher. Add Diploma, Degree, or whatever your schools use.</p>
      <form class="qual-form" @submit.prevent="saveQual">
        <input class="input" v-model="qualForm.name" :placeholder="editingQualId ? 'Rename qualification' : 'Add qualification'" maxlength="150" />
        <button class="btn" type="submit" :disabled="!qualForm.name.trim() || saving.startsWith('qual-') || bulkBusy">
          {{ editingQualId ? "Save" : "Add" }}
        </button>
        <button v-if="editingQualId" class="btn btn-ghost" type="button" @click="resetQualForm">Cancel</button>
      </form>
      <p v-if="!visibleQualifications.length" class="empty">{{ query.trim() ? "No qualifications match that search." : "No qualifications yet." }}</p>
      <ul v-else>
        <li v-for="row in visibleQualifications" :key="row.id">
          <div>
            <strong>{{ row.name }}</strong>
          </div>
          <div class="row-actions">
            <button
              class="icon-btn"
              type="button"
              :aria-label="`Edit ${row.name}`"
              title="Edit qualification"
              :disabled="saving.startsWith('qual-') || bulkBusy"
              @click="startEditQual(row)"
            ><Icon name="pen" /></button>
            <button
              class="icon-btn"
              type="button"
              :aria-label="`Delete ${row.name}`"
              title="Delete"
              :disabled="saving.startsWith('qual-') || bulkBusy"
              v-confirm="{ message: `Delete ${row.name}? Teachers who already have it keep the name.`, danger: true }"
              @click="removeQual(row)"
            ><Icon name="trash" /></button>
          </div>
        </li>
      </ul>
    </div>
    <div v-if="visibleTenants.length || (!query.trim() && !tenants.length)" class="glass card group">
      <h2>Terms per school year</h2>
      <p class="intro">Choose 2 or 4 terms for each organization. New academic years get that many terms automatically. Existing years are left as they are.</p>
      <p v-if="!visibleTenants.length" class="empty">{{ query.trim() ? "No organizations match that search." : "No organizations yet." }}</p>
      <ul>
        <li v-for="tenant in visibleTenants" :key="tenant.id">
          <div>
            <strong>{{ tenant.name }}</strong>
            <small>{{ tenant.schoolCount === 1 ? "1 school" : `${tenant.schoolCount || 0} schools` }}</small>
            <p>New years in this organization will be split into {{ tenant.termsPerYear || 4 }} terms.</p>
          </div>
          <div class="term-picks">
            <button
              v-for="count in [2, 4]"
              :key="count"
              class="btn"
              :class="(tenant.termsPerYear || 4) === count ? '' : 'btn-ghost'"
              type="button"
              :disabled="saving === `terms-${tenant.id}` || bulkBusy"
              v-confirm="`Use ${count} terms for new school years in ${tenant.name}?`"
              @click="setTermsPerYear(tenant, count)"
            >{{ count }} terms</button>
          </div>
        </li>
      </ul>
    </div>
    <div v-if="visibleSchools.length || (!query.trim() && !twoFactor.schools.length)" class="glass card group">
      <h2>ShuleHub 2FA</h2>
      <p class="intro">{{ twoFactor.description || "Turn Google Authenticator on or off for each school." }}</p>
      <p v-if="!visibleSchools.length" class="empty">{{ query.trim() ? "No schools match that search." : "No schools yet." }}</p>
      <ul>
        <li v-for="school in visibleSchools" :key="school.schoolId">
          <div>
            <strong>{{ school.schoolName }}</strong>
            <small>{{ school.tenantName || "GOOGLE AUTHENTICATOR" }}</small>
            <p>Users at this school {{ school.enabled ? "must" : "do not" }} enter a Google Authenticator code after their password.</p>
          </div>
          <button
            class="btn"
            :class="school.enabled ? '' : 'btn-ghost'"
            type="button"
            :disabled="saving === `2fa-${school.schoolId}` || bulkBusy"
            v-confirm="school.enabled
              ? `Turn off ShuleHub 2FA for ${school.schoolName}?`
              : `Turn on ShuleHub 2FA for ${school.schoolName}? Users there will need Google Authenticator at the next sign-in.`"
            @click="toggleTwoFactor(school)"
          >
            {{ school.enabled ? "On" : "Off" }}
          </button>
        </li>
      </ul>
    </div>
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
.intro {
  margin: -0.35rem 0 0.85rem;
  color: var(--muted);
  font-size: 0.86rem;
}
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
.term-picks {
  display: inline-flex;
  gap: 0.45rem;
  flex-shrink: 0;
}
.qual-form {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin: 0 0 0.85rem;
}
.qual-form input {
  flex: 1 1 14rem;
  min-width: 0;
}
</style>
