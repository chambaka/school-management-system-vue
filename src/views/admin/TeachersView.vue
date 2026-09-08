<script setup>
import { computed, onMounted, reactive, ref } from "vue";
import { academicApi, peopleApi, asList } from "../../api/endpoints";
import Icon from "../../components/Icon.vue";
import PasswordStrengthInput from "../../components/PasswordStrengthInput.vue";
import PhoneInput from "../../components/PhoneInput.vue";
import StudentPhoto from "../../components/StudentPhoto.vue";
import { useAuthStore } from "../../stores/auth";
import { statusLabel } from "../../utils/status";

const auth = useAuthStore();
const canManage = computed(() => ["HEADMASTER", "ACADEMIC_MASTER"].includes(auth.role));
const rows = ref([]);
const departments = ref([]);
const showArchived = ref(false);
const error = ref("");
const open = ref(false);
const editingId = ref(null);
const passwordOk = ref(false);
const pendingPhoto = ref(null);
const pendingPreview = ref("");
const photoBust = ref(0);
const form = reactive({
  name: "", email: "", password: "", phone: "", employeeId: "",
  department: "", qualification: "", specialization: "",
});

const editingTeacher = computed(() => rows.value.find((t) => String(t.id) === String(editingId.value)) || null);
const editPhotoUrl = computed(() => editingTeacher.value?.photoUrl || "");

function clearPendingPhoto() {
  if (pendingPreview.value) URL.revokeObjectURL(pendingPreview.value);
  pendingPreview.value = "";
  pendingPhoto.value = null;
}

function resetForm() {
  form.name = "";
  form.email = "";
  form.password = "";
  form.phone = "";
  form.employeeId = "";
  form.department = "";
  form.qualification = "";
  form.specialization = "";
  passwordOk.value = false;
  editingId.value = null;
  clearPendingPhoto();
}

async function load() {
  error.value = "";
  try {
    const [teacherPage, departmentList] = await Promise.all([
      peopleApi.teachers({ size: 100, archived: showArchived.value }),
      academicApi.departments(),
    ]);
    rows.value = asList(teacherPage);
    departments.value = departmentList;
  } catch (e) {
    error.value = e.message;
  }
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

function startEdit(teacher) {
  clearPendingPhoto();
  editingId.value = teacher.id;
  form.name = teacher.name || "";
  form.email = teacher.email || "";
  form.password = "";
  form.phone = teacher.phone || "";
  form.employeeId = teacher.employeeId || "";
  form.department = teacher.department || "";
  form.qualification = teacher.qualification || "";
  form.specialization = teacher.specialization || "";
  passwordOk.value = false;
  open.value = true;
}

function closeForm() {
  open.value = false;
  resetForm();
}

async function applyPhoto(teacherId, file) {
  const updated = await peopleApi.uploadTeacherPhoto(teacherId, file);
  const row = rows.value.find((t) => String(t.id) === String(teacherId));
  if (row) row.photoUrl = updated.photoUrl;
  photoBust.value += 1;
  return updated;
}

async function onPhotoPicked(event) {
  const file = event.target.files?.[0];
  event.target.value = "";
  if (!file) return;
  if (file.size > 2 * 1024 * 1024) {
    error.value = "Photo must be 2 MB or smaller";
    return;
  }
  error.value = "";
  if (editingId.value) {
    try {
      await applyPhoto(editingId.value, file);
    } catch (e) {
      error.value = e.message;
    }
    return;
  }
  clearPendingPhoto();
  pendingPhoto.value = file;
  pendingPreview.value = URL.createObjectURL(file);
}

async function removePhoto() {
  error.value = "";
  try {
    if (editingId.value && editPhotoUrl.value) {
      const updated = await peopleApi.deleteTeacherPhoto(editingId.value);
      const row = rows.value.find((t) => String(t.id) === String(editingId.value));
      if (row) row.photoUrl = updated.photoUrl;
      photoBust.value += 1;
    }
    clearPendingPhoto();
  } catch (e) {
    error.value = e.message;
  }
}

async function save() {
  error.value = "";
  try {
    if (editingId.value) {
      await peopleApi.updateTeacher(editingId.value, {
        name: form.name,
        phone: form.phone,
        qualification: form.qualification,
        specialization: form.specialization,
        department: form.department,
      });
    } else {
      const created = await peopleApi.createTeacher(form);
      if (pendingPhoto.value) {
        try {
          await applyPhoto(created.id, pendingPhoto.value);
        } catch (photoErr) {
          closeForm();
          await load();
          error.value = `Teacher saved, but the photo could not be uploaded: ${photoErr.message}`;
          return;
        }
      }
    }
    closeForm();
    await load();
  } catch (e) {
    error.value = e.message;
  }
}

async function setArchived(value) {
  showArchived.value = value;
  await load();
}

async function archive(teacher) {
  error.value = "";
  try {
    await peopleApi.archiveTeacher(teacher.id);
    await load();
  } catch (e) {
    error.value = e.message;
  }
}

async function restore(teacher) {
  error.value = "";
  try {
    await peopleApi.restoreTeacher(teacher.id);
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
      <div><h1>Teachers</h1><p class="sub">Staff directory</p></div>
      <div class="row-actions">
        <label class="check">
          <input type="checkbox" :checked="showArchived" @change="setArchived($event.target.checked)" />
          Show archived
        </label>
        <button v-if="canManage" class="btn" type="button" @click="toggleAdd">
          {{ open && !editingId ? "Close" : "Add teacher" }}
        </button>
      </div>
    </div>
    <p v-if="error" class="banner banner-error">{{ error }}</p>
    <form
      v-if="open"
      class="glass card"
      :data-confirm="editingId ? 'Save changes to this teacher?' : 'Save this teacher?'"
      @submit.prevent="save"
    >
      <h3>{{ editingId ? `Edit ${form.name || "teacher"}` : "Add teacher" }}</h3>
      <p v-if="editingId" class="sub">Employee ID · {{ form.employeeId }}</p>
      <div class="photo-block">
        <img v-if="pendingPreview" class="preview-photo" :src="pendingPreview" alt="" />
        <StudentPhoto
          v-else-if="editingId"
          :person-id="editingId"
          :photo-url="editPhotoUrl"
          :name="form.name"
          :bust="photoBust"
          size="lg"
        />
        <span v-else class="avatar-placeholder" aria-hidden="true">{{ (form.name || "?").trim().charAt(0).toUpperCase() }}</span>
        <div class="photo-actions">
          <label class="btn btn-ghost file-btn">
            {{ editPhotoUrl || pendingPreview ? "Change photo" : "Upload photo" }}
            <input type="file" accept="image/jpeg,image/png,image/webp" @change="onPhotoPicked" />
          </label>
          <button
            v-if="editPhotoUrl || pendingPreview"
            class="btn btn-ghost"
            type="button"
            v-confirm="{ message: 'Remove this teacher photo?', danger: true }"
            @click="removePhoto"
          >Remove photo</button>
          <p class="sub">JPEG, PNG, or WebP · up to 2 MB</p>
        </div>
      </div>
      <div class="grid grid-2">
        <label class="field"><span>Name</span><input v-model="form.name" required /></label>
        <label v-if="!editingId" class="field"><span>Employee ID</span><input v-model="form.employeeId" required /></label>
        <label class="field"><span>Email</span><input v-model="form.email" type="email" required :disabled="Boolean(editingId)" /></label>
        <PhoneInput v-model="form.phone" />
        <label class="field"><span>Department</span>
          <select v-model="form.department">
            <option value="">None</option>
            <option v-for="d in departments" :key="d.id" :value="d.name">{{ d.name }}</option>
          </select>
        </label>
        <label class="field"><span>Qualification</span><input v-model="form.qualification" /></label>
        <label class="field"><span>Specialization</span><input v-model="form.specialization" /></label>
      </div>
      <p v-if="!departments.length" class="sub">No departments yet. Defaults are created with the school.</p>
      <PasswordStrengthInput v-if="!editingId" v-model="form.password" :email="form.email" :name="form.name" @valid-change="passwordOk = $event" />
      <div class="row-actions">
        <button class="btn" :disabled="!editingId && !passwordOk">{{ editingId ? "Save changes" : "Save teacher" }}</button>
        <button class="btn btn-ghost" type="button" @click="closeForm">Cancel</button>
      </div>
    </form>
    <div class="glass card table-wrap">
      <table>
        <thead><tr><th>ID</th><th>Name</th><th>Dept</th><th>Status</th><th></th></tr></thead>
        <tbody>
          <tr v-for="t in rows" :key="t.id">
            <td>{{ t.employeeId }}</td>
            <td>
              <div class="name-cell">
                <StudentPhoto :person-id="t.id" :photo-url="t.photoUrl" :name="t.name" :bust="photoBust" size="sm" />
                <div>
                  <div>{{ t.name }}</div>
                  <div class="sub">{{ t.email }}</div>
                </div>
              </div>
            </td>
            <td>{{ t.department }}</td>
            <td><span class="chip">{{ statusLabel(t.status) }}</span></td>
            <td>
              <div class="row-actions wrap">
                <button
                  v-if="canManage"
                  class="icon-btn"
                  type="button"
                  :aria-label="`Edit ${t.name}`"
                  title="Edit teacher"
                  @click="startEdit(t)"
                >
                  <Icon name="pen" />
                </button>
                <button
                  v-if="canManage && t.status !== 'ARCHIVED'"
                  type="button"
                  class="btn btn-ghost"
                  v-confirm="{ message: `Deactivate ${t.name}? They will be archived and can be restored later.`, danger: true }"
                  @click="archive(t)"
                >Deactivate</button>
                <button
                  v-else-if="canManage"
                  type="button"
                  class="btn btn-ghost"
                  v-confirm="`Restore ${t.name}?`"
                  @click="restore(t)"
                >Restore</button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
      <p v-if="!rows.length" class="empty">{{ showArchived ? "No archived teachers." : "No teachers yet." }}</p>
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
.check {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  color: var(--muted);
  font-size: 0.85rem;
}
.name-cell {
  display: flex;
  align-items: center;
  gap: 0.65rem;
}
.photo-block {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin: 0.85rem 0 1.1rem;
}
.photo-actions {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.4rem;
}
.file-btn { position: relative; cursor: pointer; }
.file-btn input {
  position: absolute;
  inset: 0;
  opacity: 0;
  cursor: pointer;
}
.preview-photo,
.avatar-placeholder {
  width: 5.5rem;
  height: 5.5rem;
  border-radius: 50%;
  object-fit: cover;
  flex-shrink: 0;
  border: 1px solid rgba(255, 255, 255, 0.14);
}
.avatar-placeholder {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.08);
  color: var(--primary);
  font-weight: 800;
  font-size: 1.35rem;
}
.wrap { flex-wrap: wrap; }
.row-actions .btn {
  flex: 0 0 auto;
  padding: 0.25rem 0.7rem;
  font-size: 0.8rem;
}
h3 { margin: 0 0 0.35rem; }
</style>
