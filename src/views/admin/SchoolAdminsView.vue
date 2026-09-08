<script setup>
import { computed, onMounted, reactive, ref } from "vue";
import { useRoute } from "vue-router";
import { peopleApi, asList } from "../../api/endpoints";
import Icon from "../../components/Icon.vue";
import PasswordStrengthInput from "../../components/PasswordStrengthInput.vue";
import PhoneInput from "../../components/PhoneInput.vue";
import { useAuthStore } from "../../stores/auth";
import { useConfigStore } from "../../stores/config";

const auth = useAuthStore();
const config = useConfigStore();
const route = useRoute();
const rows = ref([]);
const error = ref("");
const open = ref(false);
const editingId = ref(null);
const passwordOk = ref(false);
const canManage = ["HEADMASTER", "SUPER_ADMIN"].includes(auth.role);
const schoolId = computed(() => Number(route.params.schoolId));
const schoolName = computed(() => route.query.name || "this school");
const backTo = computed(() => (
  auth.role === "SUPER_ADMIN" && !config.singleTenant ? "/platform/schools" : "/tenant/schools"
));
const form = reactive({ name: "", email: "", password: "", phone: "", role: "HEADMASTER" });

function resetForm() {
  form.name = "";
  form.email = "";
  form.password = "";
  form.phone = "";
  form.role = "HEADMASTER";
  passwordOk.value = false;
  editingId.value = null;
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
      await peopleApi.createSchoolAdmin(schoolId.value, form);
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
        <router-link class="btn btn-ghost" :to="backTo">Back to schools</router-link>
        <button v-if="canManage" class="btn" type="button" @click="toggleAdd">
          {{ open && !editingId ? "Close" : "Add officer" }}
        </button>
      </div>
    </div>
    <p v-if="error" class="banner banner-error">{{ error }}</p>
    <form
      v-if="open"
      class="glass card"
      :data-confirm="editingId ? 'Save changes to this school officer?' : 'Save this school officer?'"
      @submit.prevent="save"
    >
      <h3>{{ editingId ? "Edit officer" : "Add officer" }}</h3>
      <div class="grid grid-2">
        <label class="field"><span>Name</span><input v-model="form.name" required /></label>
        <label class="field"><span>Email</span><input v-model="form.email" type="email" required :disabled="Boolean(editingId)" /></label>
        <label class="field"><span>Role</span>
          <select v-model="form.role" required>
            <option value="HEADMASTER">Headmaster</option>
            <option value="ACADEMIC_MASTER">Academic master</option>
            <option value="ACCOUNTANT">Accountant</option>
          </select>
        </label>
        <PhoneInput v-model="form.phone" />
      </div>
      <PasswordStrengthInput
        v-if="!editingId"
        v-model="form.password"
        :email="form.email"
        :name="form.name"
        @valid-change="passwordOk = $event"
      />
      <div class="row-actions">
        <button class="btn" :disabled="!editingId && !passwordOk">
          {{ editingId ? "Save changes" : "Save officer" }}
        </button>
        <button v-if="editingId" class="btn btn-ghost" type="button" @click="cancelForm">Cancel</button>
      </div>
    </form>
    <div class="glass card table-wrap">
      <table>
        <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th></th></tr></thead>
        <tbody>
          <tr v-for="row in rows" :key="row.id">
            <td>{{ row.name }}</td>
            <td>{{ row.email }}</td>
            <td>{{ row.role }}</td>
            <td>{{ row.enabled ? "Active" : "Disabled" }}</td>
            <td>
              <div v-if="canManage" class="row-actions">
                <button
                  class="icon-btn"
                  type="button"
                  :aria-label="`Edit ${row.name}`"
                  title="Edit officer"
                  @click="startEdit(row)"
                >
                  <Icon name="pen" />
                </button>
                <button
                  v-if="row.id !== auth.user?.id"
                  class="btn btn-ghost"
                  type="button"
                  v-confirm="row.enabled ? `Disable ${row.name}?` : `Enable ${row.name}?`"
                  @click="setEnabled(row, !row.enabled)"
                >
                  {{ row.enabled ? "Disable" : "Enable" }}
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
      <p v-if="!rows.length" class="empty">No school officers yet.</p>
    </div>
  </section>
</template>

<style scoped>
.icon-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  padding: 0;
  border: 0;
  border-radius: 10px;
  background: transparent;
  color: var(--primary);
  cursor: pointer;
}
.icon-btn:hover {
  background: rgba(255, 255, 255, 0.06);
}
</style>
