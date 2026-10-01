<script setup>
import { computed, onMounted, reactive, ref } from "vue";
import ListSearch from "../../components/ListSearch.vue";
import PhoneInput from "../../components/PhoneInput.vue";
import { tenantApi } from "../../api/endpoints";
import { useListSearch } from "../../utils/listSearch";
import { officersPath } from "../../utils/openSchool";
import { statusLabel } from "../../utils/status";
import { useAuthStore } from "../../stores/auth";
import { useBrandingStore } from "../../stores/branding";
import { useConfigStore } from "../../stores/config";
import { useFeedback } from "../../composables/useFeedback";


const auth = useAuthStore();
const branding = useBrandingStore();
const config = useConfigStore();
const tenant = ref(null);
const schools = ref([]);
const overview = ref({});
const editingProfile = ref(false);
const savingProfile = ref(false);
const savingStatusId = ref(null);
const profile = reactive({
  email: "",
  phone: "",
  country: "",
  timezone: "Africa/Dar_es_Salaam",
  currency: "TZS",
  termsPerYear: 4,
});
const { query, filteredRows } = useListSearch(schools, (s) => [s.name, s.slug, tenant.value?.slug, statusLabel(s.status)]);
const { error } = useFeedback();
const renaming = ref(false);
const editingName = ref(false);
const orgName = ref("");
const renamingId = ref(null);
const schoolName = ref("");
const savingName = ref(false);
const canAddSchool = computed(() => auth.role === "SUPER_ADMIN" || auth.role === "ORGANIZATION_ADMIN");
const canRenameOrganization = computed(() => auth.role === "SUPER_ADMIN" || auth.role === "ORGANIZATION_ADMIN");
const canCreateOrganizationAdmin = computed(() => auth.role === "SUPER_ADMIN");

function fillProfile(row) {
  profile.email = row?.email || "";
  profile.phone = row?.phone || "";
  profile.country = row?.country || "";
  profile.timezone = row?.timezone || "Africa/Dar_es_Salaam";
  profile.currency = row?.currency || "TZS";
  profile.termsPerYear = row?.termsPerYear || 4;
}

function schoolStats(school) {
  return overview.value[school.id] || null;
}

function money(amount) {
  const value = Number(amount || 0);
  return `${value.toLocaleString("en-TZ")} TZS`;
}

async function load() {
  tenant.value = await tenantApi.current();
  branding.setOrganizationName(tenant.value?.name || "");
  fillProfile(tenant.value);
  schools.value = await tenantApi.schools();
  orgName.value = tenant.value?.name || "";
  try {
    const rows = await tenantApi.overview();
    overview.value = Object.fromEntries((rows || []).map((row) => [row.schoolId, row]));
  } catch {
    overview.value = {};
  }
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
    branding.setOrganizationName(tenant.value?.name || "");
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

async function saveProfile() {
  error.value = "";
  savingProfile.value = true;
  try {
    tenant.value = await tenantApi.updateProfile({
      email: profile.email,
      phone: profile.phone,
      country: profile.country,
      timezone: profile.timezone,
      currency: profile.currency,
      termsPerYear: Number(profile.termsPerYear),
    });
    fillProfile(tenant.value);
    editingProfile.value = false;
  } catch (e) {
    error.value = e.message;
  } finally {
    savingProfile.value = false;
  }
}

function cancelProfile() {
  fillProfile(tenant.value);
  editingProfile.value = false;
}

async function setSchoolStatus(school, status) {
  error.value = "";
  savingStatusId.value = school.id;
  try {
    const updated = await tenantApi.setSchoolStatus(school.id, { status });
    schools.value = schools.value.map((item) => (item.id === school.id ? { ...item, ...updated } : item));
  } catch (e) {
    error.value = e.message;
  } finally {
    savingStatusId.value = null;
  }
}

function startSchoolRename(school) {
  error.value = "";
  renamingId.value = school.id;
  schoolName.value = school.name || "";
}

function cancelSchoolRename() {
  renamingId.value = null;
  schoolName.value = "";
}

async function saveSchoolName(school) {
  error.value = "";
  savingName.value = true;
  try {
    const updated = await tenantApi.renameSchool(school.id, { name: schoolName.value.trim() });
    schools.value = schools.value.map((item) => (item.id === school.id ? { ...item, ...updated } : item));
    if (auth.user?.schoolId && String(auth.user.schoolId) === String(school.id) && branding.current) {
      branding.applySchool({ ...branding.current, name: updated.name });
    }
    cancelSchoolRename();
  } catch (e) {
    error.value = e.message;
  } finally {
    savingName.value = false;
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
          <p v-if="tenant?.slug" class="slug">Slug · {{ tenant.slug }}</p>
          <p class="sub">
            {{ schools.length === 1 ? "1 school in this organization" : `${schools.length} schools in this organization` }}
          </p>
        </template>
      </div>
      <div v-if="!editingName && tenant" class="row-actions">
        <ListSearch v-model="query" placeholder="Search schools" />
        <router-link v-if="canAddSchool && tenant.status === 'ACTIVE'" class="btn" to="/tenant/schools/new">Add school</router-link>
        <router-link v-if="canCreateOrganizationAdmin" class="btn btn-ghost" to="/tenant/admins/new">Add organization admin</router-link>
        <button v-if="canRenameOrganization" class="btn btn-ghost" type="button" @click="editingProfile = !editingProfile">
          {{ editingProfile ? "Close profile" : "Organization profile" }}
        </button>
        <button v-if="canRenameOrganization" class="btn btn-ghost" type="button" @click="editingName = true">
          Rename organization
        </button>
      </div>
    </div>
    <form v-if="editingProfile && tenant" class="glass card profile" data-confirm="Save this organization profile?" @submit.prevent="saveProfile">
      <h3>Organization profile</h3>
      <div class="grid grid-2">
        <label class="field"><span>Email</span><input v-model="profile.email" type="email" /></label>
        <PhoneInput v-model="profile.phone" />
        <label class="field"><span>Country</span><input v-model="profile.country" maxlength="80" /></label>
        <label class="field"><span>Timezone</span><input v-model="profile.timezone" required maxlength="60" /></label>
        <label class="field"><span>Currency</span><input v-model="profile.currency" required maxlength="8" /></label>
        <label class="field"><span>Terms per year</span>
          <select v-model="profile.termsPerYear">
            <option :value="2">2</option>
            <option :value="4">4</option>
          </select>
        </label>
      </div>
      <div class="row-actions">
        <button class="btn" :disabled="savingProfile">{{ savingProfile ? "Saving…" : "Save profile" }}</button>
        <button class="btn btn-ghost" type="button" :disabled="savingProfile" @click="cancelProfile">Cancel</button>
      </div>
    </form>
    <p v-if="!filteredRows.length" class="banner">
      {{ query.trim()
        ? "No schools match that search."
        : (canAddSchool
          ? "No schools yet. Add the first one, then open it to run the school."
          : "No schools yet. Add the first school, then appoint a headmaster to run it.") }}
    </p>
    <div class="grid grid-2">
      <article v-for="s in filteredRows" :key="s.id" class="glass card">
        <div class="card-head">
          <div>
            <p class="kicker">School</p>
            <form
              v-if="renamingId === s.id"
              class="rename"
              data-confirm="Save this school name?"
              @submit.prevent="saveSchoolName(s)"
            >
              <input v-model="schoolName" required maxlength="150" aria-label="School name" />
              <button class="btn" :disabled="savingName || !schoolName.trim()">{{ savingName ? "Saving…" : "Save name" }}</button>
              <button class="btn btn-ghost" type="button" :disabled="savingName" @click="cancelSchoolRename">Cancel</button>
            </form>
            <h3 v-else>{{ s.name }}</h3>
          </div>
          <span class="chip">{{ statusLabel(s.status) }}</span>
        </div>
        <p v-if="s.slug" class="slug">Slug · {{ s.slug }}</p>
        <p class="org">
          <span>Organization</span>
          {{ tenant?.name || "This organization" }}
        </p>
        <p v-if="schoolStats(s)" class="stats">
          {{ schoolStats(s).students }} students · {{ schoolStats(s).teachers }} teachers
          <br />
          {{ schoolStats(s).unpublishedExams }} exams not yet published · {{ money(schoolStats(s).outstandingFees) }} outstanding
        </p>
        <div class="row-actions">
          <router-link
            v-if="s.status === 'ACTIVE'"
            class="btn"
            :to="officersPath(s, auth.role, config.singleTenant)"
          >Officers</router-link>
          <button
            v-if="renamingId !== s.id && s.status === 'ACTIVE'"
            class="btn btn-ghost"
            type="button"
            @click="startSchoolRename(s)"
          >Rename</button>
          <button
            v-if="s.status === 'ACTIVE'"
            class="btn btn-ghost"
            type="button"
            :disabled="savingStatusId === s.id"
            v-confirm="`Suspend ${s.name}? People at this school will not be able to sign in until it is active again.`"
            @click="setSchoolStatus(s, 'SUSPENDED')"
          >Suspend</button>
          <button
            v-if="s.status === 'SUSPENDED'"
            class="btn"
            type="button"
            :disabled="savingStatusId === s.id"
            v-confirm="`Activate ${s.name}?`"
            @click="setSchoolStatus(s, 'ACTIVE')"
          >Activate</button>
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
h3 { margin: 0 0 0.35rem; }
.slug {
  margin: 0 0 0.45rem;
  color: var(--muted);
  font-size: 0.82rem;
  font-weight: 650;
}
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
.profile h3 { margin: 0 0 0.8rem; }
.stats {
  margin: 0.7rem 0 0;
  color: var(--muted);
  font-size: 0.88rem;
  font-weight: 650;
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
