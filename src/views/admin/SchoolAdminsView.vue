<script setup>
import { computed, onMounted, reactive, ref } from "vue";
import { useRoute } from "vue-router";
import { peopleApi, asList } from "../../api/endpoints";
import Icon from "../../components/Icon.vue";
import UserLinkedRecords from "../../components/UserLinkedRecords.vue";
import ListSearch from "../../components/ListSearch.vue";
import PasswordStrengthInput from "../../components/PasswordStrengthInput.vue";
import PhoneInput from "../../components/PhoneInput.vue";
import SortTh from "../../components/SortTh.vue";
import { useAuthStore } from "../../stores/auth";
import { useConfigStore } from "../../stores/config";
import { ROLE_LABELS } from "../../utils/roles";
import { isLoginLocked } from "../../utils/status";
import { useListSearch } from "../../utils/listSearch";
import { accountStatus, useTableSort } from "../../utils/tableSort";
import { useFeedback } from "../../composables/useFeedback";


const auth = useAuthStore();
const config = useConfigStore();
const route = useRoute();
const rows = ref([]);
const { error } = useFeedback();
const open = ref(false);
const editingId = ref(null);
const showLinks = ref(false);
const passwordOk = ref(false);
const canManage = ["HEADMASTER", "SCHOOL_ADMIN", "ORGANIZATION_ADMIN", "SUPER_ADMIN"].includes(auth.role);
const canAccountActions = ["HEADMASTER", "SCHOOL_ADMIN", "ACADEMIC_MASTER", "ORGANIZATION_ADMIN", "SUPER_ADMIN"].includes(auth.role);
const schoolId = computed(() => Number(route.params.schoolId));
const schoolName = computed(() => route.query.name || "this school");
const backTo = computed(() => {
  if (auth.role === "SUPER_ADMIN" && !config.singleTenant) return "/platform/schools";
  if (auth.role === "ORGANIZATION_ADMIN" || auth.role === "SUPER_ADMIN") return "/tenant/schools";
  return "/dashboard";
});
const form = reactive({ name: "", email: "", password: "", phone: "", role: "HEADMASTER" });
const canSaveCreate = computed(() => (form.password ? passwordOk.value : Boolean(form.phone)));
const { query, filteredRows } = useListSearch(rows, (row) => [
  row.name, row.email, row.phone, ROLE_LABELS[row.role] || row.role, accountStatus(row),
]);
const { sortKey, sortDir, toggleSort, sortedRows } = useTableSort(filteredRows, {
  name: (row) => row.name,
  email: (row) => row.email,
  role: (row) => ROLE_LABELS[row.role] || row.role,
  status: accountStatus,
});

function resetForm() {
  form.name = "";
  form.email = "";
  form.password = "";
  form.phone = "";
  form.role = "HEADMASTER";
  passwordOk.value = false;
  editingId.value = null;
  showLinks.value = false;
}

function cancelForm() {
  open.value = false;
  resetForm();
}

function toggleAdd() {
  if (open.value && !editingId.value) {
    open.value = false;
    resetForm();
    return;
  }
  resetForm();
  open.value = true;
}

function startEdit(row) {
  editingId.value = row.id;
  form.name = row.name || "";
  form.email = row.email || "";
  form.password = "";
  form.phone = row.phone || "";
  form.role = row.role || "HEADMASTER";
  passwordOk.value = true;
  open.value = true;
}

async function load() {
  try {
    rows.value = asList(await peopleApi.schoolAdmins({ schoolId: schoolId.value, size: 100 }));
  } catch (e) {
    error.value = e.message;
  }
}

async function save() {
  error.value = "";
  try {
    if (editingId.value) {
      await peopleApi.updateSchoolAdmin(schoolId.value, editingId.value, {
        name: form.name,
        phone: form.phone,
        role: form.role,
      });
    } else {
      await peopleApi.createSchoolAdmin(schoolId.value, {
        ...form,
        password: form.password?.trim() || null,
      });
    }
    open.value = false;
    resetForm();
    await load();
  } catch (e) {
    error.value = e.message;
  }
}

async function setEnabled(row, enabled) {
  error.value = "";
  try {
    await peopleApi.updateSchoolAdmin(schoolId.value, row.id, { enabled });
    await load();
  } catch (e) {
    error.value = e.message;
  }
}

async function unlock(row) {
  error.value = "";
  try {
    await peopleApi.unlockUser(row.id, schoolId.value);
    await load();
  } catch (e) {
    error.value = e.message;
  }
}

async function resetTwoFactor(row) {
  error.value = "";
  try {
    await peopleApi.resetTwoFactor(row.id, schoolId.value);
    await load();
  } catch (e) {
    error.value = e.message;
  }
}

async function resetPassword(row) {
  error.value = "";
  try {
    await peopleApi.resetPassword(row.id, schoolId.value);
    await load();
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
        <h1>School officers</h1>
        <p class="sub">Headmaster, academic master, and accountant for {{ schoolName }}.</p>
      </div>
      <div class="row-actions">
        <ListSearch v-model="query" placeholder="Search officers" />
        <router-link class="btn btn-ghost" :to="backTo">{{ backTo === "/dashboard" ? "Back" : "Back to schools" }}</router-link>
        <button v-if="canManage" class="btn" type="button" @click="toggleAdd">
          {{ open && !editingId ? "Close" : "Add officer" }}
        </button>
      </div>
    </div>
    <form
      v-if="open"
      class="glass card"
      :data-confirm="editingId ? 'Save changes to this school officer?' : 'Save this school officer?'"
      @submit.prevent="save"
    >
      <div class="form-head">
        <h3>{{ editingId ? "Edit officer" : "Add officer" }}</h3>
        <button
          v-if="editingId"
          class="icon-btn"
          type="button"
          aria-label="Linked records"
          title="Linked records"
          :aria-pressed="showLinks"
          @click="showLinks = !showLinks"
        >
          <Icon name="link" />
        </button>
      </div>
      <div class="grid grid-2">
        <label class="field"><span>Name</span><input v-model="form.name" required /></label>
        <label class="field"><span>Email</span><input v-model="form.email" type="email" required :disabled="Boolean(editingId)" /></label>
        <label class="field"><span>Role</span>
          <select v-model="form.role" required>
            <option value="HEADMASTER">Headmaster</option>
            <option value="SCHOOL_ADMIN">School admin</option>
            <option value="ACADEMIC_MASTER">Academic master</option>
            <option value="ACCOUNTANT">Accountant</option>
            <option value="STAFF">Staff</option>
            <option value="INVIGILATOR">Invigilator</option>
          </select>
        </label>
        <PhoneInput v-model="form.phone" :required="!editingId && !form.password" />
      </div>
      <PasswordStrengthInput
        v-if="!editingId"
        v-model="form.password"
        label="Password (optional)"
        hint="Leave blank to generate a temporary password and send it by SMS to their phone."
        :email="form.email"
        :name="form.name"
        @valid-change="passwordOk = $event"
      />
      <UserLinkedRecords v-if="showLinks && editingId" :user-id="editingId" :school-id="schoolId" />
      <div class="row-actions">
        <button class="btn" :disabled="!editingId && !canSaveCreate">
          {{ editingId ? "Save changes" : "Save officer" }}
        </button>
        <button v-if="editingId" class="btn btn-ghost" type="button" @click="cancelForm">Cancel</button>
      </div>
    </form>
    <div class="glass card">
      <div class="people-toolbar">
        <SortTh bare column="name" label="Name" :active="sortKey" :dir="sortDir" @toggle="toggleSort" />
        <SortTh bare column="email" label="Email" :active="sortKey" :dir="sortDir" @toggle="toggleSort" />
        <SortTh bare column="role" label="Role" :active="sortKey" :dir="sortDir" @toggle="toggleSort" />
        <SortTh bare column="status" label="Status" :active="sortKey" :dir="sortDir" @toggle="toggleSort" />
      </div>
      <ul class="people-list">
        <li v-for="row in sortedRows" :key="row.id" class="person-card">
          <div class="person-top no-photo">
            <div class="person-who">
              <strong>{{ row.name }}</strong>
              <div class="person-facts">
                <span>{{ ROLE_LABELS[row.role] || row.role }}</span>
                <span>{{ row.email || "No email" }}</span>
                <span>{{ row.phone || "No phone" }}</span>
              </div>
            </div>
            <div class="person-status">
              <span class="chip">{{ row.enabled ? "Active" : "Disabled" }}</span>
              <span v-if="isLoginLocked(row)" class="chip chip-warn">Locked</span>
              <span v-if="row.totpEnabled" class="chip">2FA</span>
            </div>
          </div>
          <div class="person-bottom">
            <p class="sub">School officer</p>
            <div v-if="canAccountActions" class="row-actions">
                <button
                  v-if="canManage"
                  class="icon-btn"
                  type="button"
                  :aria-label="`Edit ${row.name}`"
                  title="Edit officer"
                  @click="startEdit(row)"
                >
                  <Icon name="pen" />
                </button>
                <button
                  v-if="isLoginLocked(row)"
                  class="btn btn-ghost"
                  type="button"
                  v-confirm="`Unlock ${row.name}? They will be able to sign in again immediately.`"
                  @click="unlock(row)"
                >
                  Unlock
                </button>
                <button
                  v-if="row.totpEnabled"
                  class="btn btn-ghost"
                  type="button"
                  v-confirm="{ message: `Reset ShuleHub 2FA for ${row.name}? They will set up Google Authenticator again at next sign-in.`, danger: true }"
                  @click="resetTwoFactor(row)"
                >
                  Reset 2FA
                </button>
                <button
                  class="btn btn-ghost"
                  type="button"
                  v-confirm="{ message: `Reset password for ${row.name}? A temporary password will be sent by SMS if they have a phone.`, confirmLabel: 'Reset password', danger: true }"
                  @click="resetPassword(row)"
                >
                  Reset password
                </button>
                <button
                  v-if="canManage && row.id !== auth.user?.id"
                  class="btn btn-ghost"
                  type="button"
                  v-confirm="row.enabled ? `Disable ${row.name}?` : `Enable ${row.name}?`"
                  @click="setEnabled(row, !row.enabled)"
                >
                  {{ row.enabled ? "Disable" : "Enable" }}
                </button>
              </div>
          </div>
        </li>
      </ul>
      <p v-if="!sortedRows.length" class="empty">{{ query.trim() ? "No officers match that search." : "No school officers yet." }}</p>
    </div>
  </section>
</template>

<style scoped>
.form-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  margin-bottom: 0.85rem;
}
</style>

