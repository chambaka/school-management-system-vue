<script setup>
import { computed, onMounted, ref } from "vue";
import { peopleApi, asList } from "../../api/endpoints";
import Icon from "../../components/Icon.vue";
import ListSearch from "../../components/ListSearch.vue";
import UserLinkedRecords from "../../components/UserLinkedRecords.vue";
import SortTh from "../../components/SortTh.vue";
import { useAuthStore } from "../../stores/auth";
import { ROLE_LABELS } from "../../utils/roles";
import { isLoginLocked } from "../../utils/status";
import { useListSearch } from "../../utils/listSearch";
import { accountStatus, useTableSort } from "../../utils/tableSort";
import { useFeedback } from "../../composables/useFeedback";


const auth = useAuthStore();
const rows = ref([]);
const roleFilter = ref("");
const editing = ref(null);
const showLinks = ref(false);
const removing = ref(null);
const { error, ok } = useFeedback();

const isPlatformAdmin = computed(() => auth.role === "SUPER_ADMIN");
const canEnable = computed(() =>
  ["HEADMASTER", "SCHOOL_ADMIN", "ACADEMIC_MASTER", "SUPER_ADMIN"].includes(auth.role));
const canRemove = computed(() => auth.role === "HEADMASTER" || isPlatformAdmin.value);
const schoolId = computed(() => (isPlatformAdmin.value ? undefined : auth.user?.schoolId));
const schoolRoles = ["HEADMASTER", "SCHOOL_ADMIN", "ACADEMIC_MASTER", "ACCOUNTANT", "STAFF", "INVIGILATOR", "TEACHER", "PARENT", "STUDENT"];
const roles = computed(() => (isPlatformAdmin.value ? ["SUPER_ADMIN", ...schoolRoles] : schoolRoles));

function roleLabel(role) {
  return ROLE_LABELS[role] || role;
}

function schoolLabel(row) {
  return row.schoolName || (row.role === "SUPER_ADMIN" ? "Platform" : "");
}

const { query, filteredRows } = useListSearch(rows, (row) => [
  row.name, row.email, row.phone, roleLabel(row.role), schoolLabel(row), row.tenantName, accountStatus(row),
]);
const { sortKey, sortDir, toggleSort, sortedRows } = useTableSort(filteredRows, {
  name: (row) => row.name,
  email: (row) => row.email,
  school: schoolLabel,
  tenant: (row) => row.tenantName,
  role: (row) => roleLabel(row.role),
  status: accountStatus,
});

async function load() {
  error.value = "";
  try {
    const page = await peopleApi.schoolUsers({
      schoolId: schoolId.value,
      role: roleFilter.value || undefined,
      size: 200,
    });
    rows.value = asList(page);
  } catch (e) {
    error.value = e.message;
  }
}

async function unlock(row) {
  error.value = "";
  ok.value = "";
  try {
    await peopleApi.unlockUser(row.id, schoolId.value);
    ok.value = `${row.name} can sign in again.`;
    await load();
  } catch (e) {
    error.value = e.message;
  }
}

async function resetTwoFactor(row) {
  error.value = "";
  ok.value = "";
  try {
    await peopleApi.resetTwoFactor(row.id, schoolId.value);
    ok.value = `ShuleHub 2FA cleared for ${row.name}. They will set up Google Authenticator at next sign-in.`;
    await load();
  } catch (e) {
    error.value = e.message;
  }
}

async function resetPassword(row) {
  error.value = "";
  ok.value = "";
  try {
    const result = await peopleApi.resetPassword(row.id, schoolId.value);
    ok.value = result.smsSent
      ? `Temporary password sent by SMS for ${row.name}.`
      : `Password reset for ${row.name}.`;
    await load();
  } catch (e) {
    error.value = e.message;
  }
}

function canEnableRow(row) {
  return canEnable.value && row.id !== auth.user?.id && (row.role !== "SUPER_ADMIN" || isPlatformAdmin.value);
}

function canRemoveRow(row) {
  return canRemove.value && row.id !== auth.user?.id && row.role !== "SUPER_ADMIN";
}

async function setEnabled(row, enabled) {
  error.value = "";
  ok.value = "";
  try {
    await peopleApi.setUserEnabled(row.id, schoolId.value, enabled);
    ok.value = enabled ? `${row.name} can sign in.` : `${row.name} is disabled.`;
    if (editing.value?.id === row.id) editing.value = { ...editing.value, enabled };
    await load();
  } catch (e) {
    error.value = e.message;
  }
}

function openRemove(row) {
  removing.value = row;
}

function closeRemove() {
  removing.value = null;
}

async function confirmRemove() {
  const row = removing.value;
  if (!row) return;
  error.value = "";
  ok.value = "";
  try {
    await peopleApi.removeUser(row.id, schoolId.value);
    ok.value = `${row.name} and their allocations and links were deleted.`;
    closeRemove();
    if (editing.value?.id === row.id) closeEdit();
    await load();
  } catch (e) {
    error.value = e.message;
  }
}

function openEdit(row) {
  editing.value = row;
  showLinks.value = false;
}

function closeEdit() {
  editing.value = null;
  showLinks.value = false;
}

onMounted(load);
</script>

<template>
  <section class="page">
    <div class="page-head">
      <div>
        <h1>Users</h1>
        <p class="sub">{{ isPlatformAdmin
          ? "Every login on the platform. Enable or disable sign-in, unlock, reset 2FA, or delete a login."
          : "Every login at this school. Enable or disable sign-in. Remove deletes the login and its allocations and links." }}</p>
      </div>
      <div class="head-tools">
        <ListSearch v-model="query" placeholder="Search users" />
        <label class="field filter">
          <span>Role</span>
          <select v-model="roleFilter" @change="load">
            <option value="">All roles</option>
            <option v-for="role in roles" :key="role" :value="role">{{ roleLabel(role) }}</option>
          </select>
        </label>
      </div>
    </div>
    <div class="glass card">
      <div class="people-toolbar">
        <SortTh bare column="name" label="Name" :active="sortKey" :dir="sortDir" @toggle="toggleSort" />
        <SortTh bare column="email" label="Email" :active="sortKey" :dir="sortDir" @toggle="toggleSort" />
        <SortTh v-if="isPlatformAdmin" bare column="school" label="School" :active="sortKey" :dir="sortDir" @toggle="toggleSort" />
        <SortTh v-if="isPlatformAdmin" bare column="tenant" label="Tenant" :active="sortKey" :dir="sortDir" @toggle="toggleSort" />
        <SortTh bare column="role" label="Role" :active="sortKey" :dir="sortDir" @toggle="toggleSort" />
        <SortTh bare column="status" label="Status" :active="sortKey" :dir="sortDir" @toggle="toggleSort" />
      </div>
      <ul class="people-list">
        <li v-for="row in sortedRows" :key="row.id" class="person-card">
          <div class="person-top no-photo">
            <div class="person-who">
              <strong>{{ row.name }}</strong>
              <div class="person-facts">
                <span>{{ roleLabel(row.role) }}</span>
                <span>{{ row.email || "No email" }}</span>
                <span>{{ row.phone || "No phone" }}</span>
                <span v-if="isPlatformAdmin">{{ schoolLabel(row) || "No school" }}</span>
                <span v-if="isPlatformAdmin">{{ row.tenantName || "No organization" }}</span>
              </div>
            </div>
            <div class="person-status">
              <span class="chip">{{ row.enabled ? "Active" : "Disabled" }}</span>
              <span v-if="isLoginLocked(row)" class="chip chip-warn">Locked</span>
              <span v-if="row.totpEnabled" class="chip">2FA</span>
            </div>
          </div>
          <div class="person-bottom">
            <p class="sub">Login account</p>
            <div class="row-actions wrap">
                <button
                  class="icon-btn"
                  type="button"
                  :aria-label="`Edit ${row.name}`"
                  title="Edit user"
                  @click="openEdit(row)"
                >
                  <Icon name="pen" />
                </button>
                <button
                  v-if="isLoginLocked(row)"
                  class="btn btn-ghost"
                  type="button"
                  v-confirm="`Unlock ${row.name}? They will be able to sign in again immediately.`"
                  @click="unlock(row)"
                >Unlock</button>
                <button
                  v-if="row.totpEnabled"
                  class="btn btn-ghost"
                  type="button"
                  v-confirm="{ message: `Reset ShuleHub 2FA for ${row.name}? They will set up Google Authenticator again at next sign-in.`, danger: true }"
                  @click="resetTwoFactor(row)"
                >Reset 2FA</button>
                <button
                  class="btn btn-ghost"
                  type="button"
                  v-confirm="{ message: `Reset password for ${row.name}? A temporary password will be sent by SMS if they have a phone.`, confirmLabel: 'Reset password', danger: true }"
                  @click="resetPassword(row)"
                >Reset password</button>
                <button
                  v-if="canEnableRow(row)"
                  class="btn btn-ghost"
                  type="button"
                  v-confirm="row.enabled ? `Disable ${row.name}? They will not be able to sign in.` : `Enable ${row.name}? They will be able to sign in.`"
                  @click="setEnabled(row, !row.enabled)"
                >{{ row.enabled ? "Disable" : "Enable" }}</button>
                <button
                  v-if="canRemoveRow(row)"
                  class="btn btn-ghost"
                  type="button"
                  @click="openRemove(row)"
                >Remove</button>
              </div>
          </div>
        </li>
      </ul>
      <p v-if="!sortedRows.length" class="empty">{{ query.trim() ? "No users match that search." : "No users found." }}</p>
    </div>
    <Teleport to="body">
      <div v-if="editing" class="form-scrim" role="presentation" @click.self="closeEdit">
        <div class="glass card form-modal" role="dialog" aria-modal="true" :aria-labelledby="'user-edit-title'">
          <div class="form-head">
            <div>
              <h3 id="user-edit-title">Edit {{ editing.name }}</h3>
              <p class="sub">{{ roleLabel(editing.role) }} · {{ editing.enabled ? "Active" : "Disabled" }}</p>
            </div>
            <div class="form-tools">
              <button
                class="icon-btn"
                type="button"
                aria-label="Linked records"
                title="Linked records"
                :aria-pressed="showLinks"
                @click="showLinks = !showLinks"
              >
                <Icon name="link" />
              </button>
              <button
                v-if="canEnableRow(editing)"
                class="btn btn-ghost"
                type="button"
                v-confirm="editing.enabled ? `Disable ${editing.name}? They will not be able to sign in.` : `Enable ${editing.name}? They will be able to sign in.`"
                @click="setEnabled(editing, !editing.enabled)"
              >{{ editing.enabled ? "Disable" : "Enable" }}</button>
              <button
                v-if="canRemoveRow(editing)"
                class="btn btn-ghost"
                type="button"
                @click="openRemove(editing)"
              >Remove</button>
              <button class="btn btn-ghost" type="button" @click="closeEdit">Close</button>
            </div>
          </div>
          <div class="grid grid-2">
            <p class="field"><span>Name</span><strong>{{ editing.name }}</strong></p>
            <p class="field"><span>Email</span><strong>{{ editing.email }}</strong></p>
            <p class="field"><span>Phone</span><strong>{{ editing.phone || "—" }}</strong></p>
            <p class="field"><span>Role</span><strong>{{ roleLabel(editing.role) }}</strong></p>
          </div>
          <UserLinkedRecords v-if="showLinks" :user-id="editing.id" :school-id="schoolId" />
        </div>
      </div>
    </Teleport>
    <Teleport to="body">
      <div v-if="removing" class="form-scrim warn-scrim" role="presentation" @click.self="closeRemove">
        <div class="glass card form-modal" role="dialog" aria-modal="true" aria-labelledby="user-remove-title">
          <div class="form-head">
            <div>
              <h3 id="user-remove-title">Delete {{ removing.name }}?</h3>
              <p class="sub">This deletes the login and every allocation and parent or student link listed below. Teacher, student, or parent profiles stay.</p>
            </div>
            <button class="btn btn-ghost" type="button" @click="closeRemove">Cancel</button>
          </div>
          <UserLinkedRecords :user-id="removing.id" :school-id="schoolId" readonly />
          <div class="row-actions form-footer">
            <button class="btn btn-danger" type="button" @click="confirmRemove">Delete</button>
            <button class="btn btn-ghost" type="button" @click="closeRemove">Cancel</button>
          </div>
        </div>
      </div>
    </Teleport>
  </section>
</template>

<style scoped>
.head-tools {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: 0.7rem;
}
.filter { min-width: 12rem; margin: 0; }
.wrap { flex-wrap: wrap; }
.form-scrim {
  position: fixed;
  inset: 0;
  z-index: 70;
  display: grid;
  place-items: start center;
  padding: 1.25rem 1.25rem calc(5.5rem + env(safe-area-inset-bottom, 0px));
  overflow: auto;
  background: rgba(4, 10, 22, 0.72);
}
.form-modal { width: min(40rem, 100%); margin: auto 0; }
.form-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
  margin-bottom: 0.85rem;
}
.form-tools {
  display: flex;
  align-items: center;
  gap: 0.4rem;
}
.form-modal .field {
  display: grid;
  gap: 0.25rem;
}
.form-modal .field span { font-size: 0.8rem; color: var(--muted, inherit); }
.warn-scrim { z-index: 80; }
.form-footer { margin-top: 1rem; }
</style>
