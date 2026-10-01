<script setup>
import { computed, nextTick, onMounted, onUnmounted, reactive, ref, watch } from "vue";
import { academicApi, peopleApi, qualificationApi, asList } from "../../api/endpoints";
import Icon from "../../components/Icon.vue";
import ListSearch from "../../components/ListSearch.vue";
import PasswordStrengthInput from "../../components/PasswordStrengthInput.vue";
import PhoneInput from "../../components/PhoneInput.vue";
import StudentPhoto from "../../components/StudentPhoto.vue";
import UserLinkedRecords from "../../components/UserLinkedRecords.vue";
import { useAuthStore } from "../../stores/auth";
import { useConfirmStore } from "../../stores/confirm";
import { statusLabel, isLoginLocked } from "../../utils/status";
import { useListSearch } from "../../utils/listSearch";
import { accountStatus, useTableSort } from "../../utils/tableSort";
import { useFeedback } from "../../composables/useFeedback";


const auth = useAuthStore();
const canManage = computed(() => ["HEADMASTER", "SCHOOL_ADMIN", "ACADEMIC_MASTER"].includes(auth.role));
const rows = ref([]);
const { query, filteredRows } = useListSearch(rows, (t) => [
  t.name, t.email, t.employeeId, t.phone, t.department, t.qualification, t.specialization, accountStatus(t),
]);
const { sortKey, sortDir, toggleSort, sortedRows } = useTableSort(filteredRows, {
  name: (row) => row.name,
  email: (row) => row.email,
  status: accountStatus,
});
const departments = ref([]);
const qualifications = ref([]);
const showArchived = ref(false);
const { error } = useFeedback();
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
const formEl = ref(null);
const confirm = useConfirmStore();

const qualificationOptions = computed(() => {
  const names = qualifications.value.map((row) => row.name);
  const current = form.qualification;
  if (current && !names.some((name) => name.toLowerCase() === current.toLowerCase())) {
    return [{ id: "current", name: current }, ...qualifications.value];
  }
  return qualifications.value;
});

const showLinks = ref(false);
const allocations = ref([]);
const editingTeacher = computed(() => rows.value.find((t) => String(t.id) === String(editingId.value)) || null);
const editPhotoUrl = computed(() => editingTeacher.value?.photoUrl || "");
const canSaveCreate = computed(() => (form.password ? passwordOk.value : Boolean(form.phone)));

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
  showLinks.value = false;
  allocations.value = [];
  clearPendingPhoto();
}

async function load() {
  error.value = "";
  try {
    const [teacherPage, departmentList, qualificationList] = await Promise.all([
      peopleApi.teachers({ size: 100, archived: showArchived.value }),
      academicApi.departments(),
      qualificationApi.list().catch(() => []),
    ]);
    rows.value = asList(teacherPage);
    departments.value = departmentList;
    qualifications.value = qualificationList || [];
  } catch (e) {
    error.value = e.message;
  }
}

function openAdd() {
  error.value = "";
  resetForm();
  open.value = true;
}

function startEdit(teacher) {
  error.value = "";
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
  loadAllocations(teacher.id);
}

async function loadAllocations(teacherId) {
  if (!teacherId) {
    allocations.value = [];
    return;
  }
  try {
    allocations.value = asList(await academicApi.allocations({ teacherId }));
  } catch (e) {
    allocations.value = [];
    error.value = e.message;
  }
}

function allocationLabel(row) {
  return [row.subjectName, row.schoolClassName, row.sectionName].filter(Boolean).join(" · ");
}

async function removeAllocation(row) {
  error.value = "";
  try {
    await academicApi.deleteAllocation(row.id);
    allocations.value = allocations.value.filter((item) => item.id !== row.id);
  } catch (e) {
    error.value = e.message;
  }
}

async function onLinksChanged() {
  await load();
  if (editingId.value) await loadAllocations(editingId.value);
}

function closeForm() {
  if (confirm.open) return;
  open.value = false;
  resetForm();
}

function onFormKey(event) {
  if (!open.value || confirm.open) return;
  if (event.key === "Escape") closeForm();
}

watch(open, async (isOpen) => {
  document.body.style.overflow = isOpen ? "hidden" : "";
  if (!isOpen) return;
  await nextTick();
  formEl.value?.querySelector("input:not([disabled])")?.focus();
});

onUnmounted(() => {
  document.body.style.overflow = "";
  window.removeEventListener("keydown", onFormKey, true);
});

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
        employeeId: form.employeeId.trim() || "",
      });
    } else {
      const created = await peopleApi.createTeacher({
        ...form,
        employeeId: form.employeeId.trim() || null,
        password: form.password?.trim() || null,
      });
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
    const updated = await peopleApi.restoreTeacher(teacher.id);
    showArchived.value = false;
    await load();
    if (updated && !rows.value.some((row) => String(row.id) === String(updated.id))) {
      rows.value = [updated, ...rows.value];
    }
  } catch (e) {
    error.value = e.message;
  }
}

async function unlock(teacher) {
  error.value = "";
  try {
    await peopleApi.unlockUser(teacher.userId);
    await load();
  } catch (e) {
    error.value = e.message;
  }
}

async function resetTwoFactor(teacher) {
  error.value = "";
  try {
    await peopleApi.resetTwoFactor(teacher.userId);
    await load();
  } catch (e) {
    error.value = e.message;
  }
}

async function resetPassword(teacher) {
  error.value = "";
  try {
    await peopleApi.resetPassword(teacher.userId);
    await load();
  } catch (e) {
    error.value = e.message;
  }
}

onMounted(() => {
  window.addEventListener("keydown", onFormKey, true);
  load();
});
</script>

<template>
  <section class="page">
    <div class="page-head">
      <div>
        <p class="directory-label"><Icon name="users" /> Staff directory</p>
        <h1>Teachers</h1>
      </div>
      <div class="head-actions">
        <ListSearch v-model="query" placeholder="Search teachers" />
        <label class="check">
          <input type="checkbox" :checked="showArchived" @change="setArchived($event.target.checked)" />
          Show archived
        </label>
        <button v-if="canManage" class="btn add-btn" type="button" @click="openAdd">
          <Icon name="plus" />
          Add teacher
        </button>
      </div>
    </div>
    <Teleport to="body">
      <div
        v-if="open"
        class="form-scrim"
        role="presentation"
        @click.self="closeForm"
      >
        <form
          ref="formEl"
          class="glass card form-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="teacher-form-title"
          :data-confirm="editingId ? 'Save changes to this teacher?' : 'Save this teacher?'"
          @submit.prevent="save"
        >
          <div class="form-head">
            <div>
              <h3 id="teacher-form-title">{{ editingId ? `Edit ${form.name || "teacher"}` : "Add teacher" }}</h3>
              <p v-if="editingId && form.employeeId" class="sub">Employee ID · {{ form.employeeId }}</p>
            </div>
            <div class="form-tools">
              <button
                v-if="editingTeacher?.userId"
                class="icon-btn"
                type="button"
                aria-label="Linked records"
                title="Linked records"
                :aria-pressed="showLinks"
                @click="showLinks = !showLinks"
              >
                <Icon name="link" />
              </button>
              <button class="btn btn-ghost" type="button" @click="closeForm">Close</button>
            </div>
          </div>
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
        <label class="field"><span>Employee ID</span><input v-model="form.employeeId" placeholder="Optional" /></label>
        <label class="field"><span>Email</span><input v-model="form.email" type="email" required :disabled="Boolean(editingId)" /></label>
        <PhoneInput v-model="form.phone" :required="!editingId && !form.password" />
        <label class="field"><span>Department</span>
          <select v-model="form.department">
            <option value="">None</option>
            <option v-for="d in departments" :key="d.id" :value="d.name">{{ d.name }}</option>
          </select>
        </label>
        <label class="field"><span>Qualification</span>
          <select v-model="form.qualification">
            <option value="">None</option>
            <option v-for="q in qualificationOptions" :key="q.id" :value="q.name">{{ q.name }}</option>
          </select>
        </label>
        <label class="field"><span>Specialization</span><input v-model="form.specialization" /></label>
      </div>
      <p v-if="!departments.length" class="sub">No departments yet. Defaults are created with the school.</p>
      <p v-if="!qualifications.length" class="sub">No qualifications yet. A platform admin adds them under Configurations.</p>
      <section v-if="editingId" class="allocations" aria-label="Allocations">
        <h4>Allocations</h4>
        <p v-if="!allocations.length" class="sub">No subject allocations for this teacher.</p>
        <ul v-else class="entity-list">
          <li v-for="row in allocations" :key="row.id" class="entity-item">
            <div>
              <strong>{{ row.subjectName }}</strong>
              <span class="sub">{{ [row.schoolClassName, row.sectionName].filter(Boolean).join(" · ") }}</span>
            </div>
            <button
              v-if="canManage"
              class="icon-btn"
              type="button"
              :aria-label="`Remove ${allocationLabel(row)}`"
              title="Remove allocation"
              v-confirm="{ message: `Remove ${allocationLabel(row)}?`, confirmLabel: 'Remove', danger: true }"
              @click="removeAllocation(row)"
            >
              <Icon name="trash" />
            </button>
          </li>
        </ul>
      </section>
      <PasswordStrengthInput
        v-if="!editingId"
        v-model="form.password"
        label="Password (optional)"
        hint="Leave blank to generate a temporary password and send it by SMS to their phone."
        :email="form.email"
        :name="form.name"
        @valid-change="passwordOk = $event"
      />
          <UserLinkedRecords v-if="showLinks && editingTeacher?.userId" :user-id="editingTeacher.userId" @changed="onLinksChanged" />
          <div class="row-actions form-footer">
            <button class="btn" :disabled="!editingId && !canSaveCreate">{{ editingId ? "Save changes" : "Save teacher" }}</button>
            <button class="btn btn-ghost" type="button" @click="closeForm">Cancel</button>
          </div>
        </form>
      </div>
    </Teleport>
    <div class="glass card">
      <div class="people-toolbar sort-actions">
        <button
          type="button"
          class="btn"
          :aria-pressed="sortKey === 'name'"
          title="Sort by name"
          @click="toggleSort('name')"
        >
          <Icon name="user" />
          Name
          <span v-if="sortKey === 'name'" class="sort-ind" aria-hidden="true">{{ sortDir === "desc" ? "↓" : "↑" }}</span>
        </button>
        <button
          type="button"
          class="btn"
          :aria-pressed="sortKey === 'email'"
          title="Sort by email"
          @click="toggleSort('email')"
        >
          <Icon name="mail" />
          Email
          <span v-if="sortKey === 'email'" class="sort-ind" aria-hidden="true">{{ sortDir === "desc" ? "↓" : "↑" }}</span>
        </button>
        <button
          type="button"
          class="btn"
          :aria-pressed="sortKey === 'status'"
          title="Sort by status"
          @click="toggleSort('status')"
        >
          <Icon name="check" />
          Status
          <span v-if="sortKey === 'status'" class="sort-ind" aria-hidden="true">{{ sortDir === "desc" ? "↓" : "↑" }}</span>
        </button>
      </div>
      <ul class="people-list">
        <li v-for="t in sortedRows" :key="t.id" class="person-card">
          <div class="person-top">
            <StudentPhoto :person-id="t.id" :photo-url="t.photoUrl" :name="t.name" :bust="photoBust" size="sm" />
            <div class="person-who">
              <div class="person-name">
                <strong>{{ t.name }}</strong>
                <span class="person-phone">{{ t.phone || "No phone" }}</span>
              </div>
              <div class="person-facts">
                <span>{{ t.employeeId || "No employee ID" }}</span>
                <span>{{ t.department || "No department" }}</span>
                <span>{{ t.email || "No email" }}</span>
              </div>
            </div>
            <div class="person-status">
              <span class="chip">{{ statusLabel(t.status) }}</span>
              <span v-if="isLoginLocked(t)" class="chip chip-warn">Locked</span>
              <span v-if="t.totpEnabled" class="chip">2FA</span>
            </div>
          </div>
          <div class="person-bottom">
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
                  v-if="canManage && isLoginLocked(t)"
                  type="button"
                  class="btn btn-ghost"
                  v-confirm="`Unlock ${t.name}? They will be able to sign in again immediately.`"
                  @click="unlock(t)"
                >Unlock</button>
                <button
                  v-if="canManage && t.totpEnabled"
                  type="button"
                  class="btn btn-ghost"
                  v-confirm="{ message: `Reset ShuleHub 2FA for ${t.name}? They will set up Google Authenticator again at next sign-in.`, danger: true }"
                  @click="resetTwoFactor(t)"
                >Reset 2FA</button>
                <button
                  v-if="canManage"
                  type="button"
                  class="btn btn-ghost"
                  v-confirm="{ message: `Reset password for ${t.name}? A temporary password will be sent by SMS if they have a phone.`, confirmLabel: 'Reset password', danger: true }"
                  @click="resetPassword(t)"
                >Reset password</button>
                <button
                  v-if="canManage && t.status !== 'ARCHIVED'"
                  type="button"
                  class="icon-btn"
                  :aria-label="`Delete ${t.name}`"
                  title="Delete"
                  v-confirm="{ message: `Delete ${t.name}? They will be archived and can be restored later.`, confirmLabel: 'Delete', danger: true }"
                  @click="archive(t)"
                ><Icon name="trash" /></button>
                <button
                  v-else-if="canManage"
                  type="button"
                  class="btn btn-ghost"
                  v-confirm="{ message: `Restore ${t.name}? They will appear in the live list again.`, confirmLabel: 'Restore' }"
                  @click="restore(t)"
                >Restore</button>
              </div>
          </div>
        </li>
      </ul>
      <p v-if="!sortedRows.length" class="empty">{{ query.trim() ? "No teachers match that search." : (showArchived ? "No archived teachers." : "No teachers yet.") }}</p>
    </div>
  </section>
</template>

<style scoped>
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
.table-wrap .row-actions .btn {
  flex: 0 0 auto;
  padding: 0.25rem 0.7rem;
  font-size: 0.8rem;
}
.head-actions {
  display: flex;
  align-items: center;
  gap: 0.85rem;
  flex-wrap: wrap;
}
.add-btn {
  min-height: 2.75rem;
  padding: 0.7rem 1.2rem;
  font-size: 0.95rem;
}
.add-btn :deep(.ico) {
  width: 1.1rem;
  height: 1.1rem;
}
h3 { margin: 0 0 0.35rem; }
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
.form-modal {
  width: min(48rem, 100%);
  margin: auto 0;
}
.form-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
  margin-bottom: 0.35rem;
}
.form-head .btn {
  flex: 0 0 auto;
  padding: 0.45rem 0.85rem;
  font-size: 0.8rem;
}
.form-tools {
  display: flex;
  align-items: center;
  gap: 0.4rem;
}
.form-modal .form-footer .btn {
  padding: 0.88rem 1.25rem;
  font-size: inherit;
}
.allocations {
  display: grid;
  gap: 0.55rem;
  margin: 0.85rem 0 0;
  padding-top: 0.85rem;
  border-top: 1px solid color-mix(in srgb, currentColor 12%, transparent);
}
.allocations h4 {
  margin: 0;
  font-size: 0.95rem;
}
.entity-item { margin: 0; }
.person-name {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 0.2rem 0.75rem;
}
.person-phone {
  color: var(--muted);
  font-size: 0.92rem;
  font-weight: 650;
}
.person-bottom {
  grid-template-columns: 1fr;
}
.directory-label {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  margin: 0 0 0.45rem;
  padding: 0.38rem 0.9rem;
  border-radius: 999px;
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #1a1203;
  background: linear-gradient(135deg, #ffe08a, var(--primary) 46%, #d7a227);
  box-shadow: 0 8px 20px color-mix(in srgb, var(--primary) 28%, transparent);
}
.directory-label :deep(.ico) {
  width: 0.95rem;
  height: 0.95rem;
}
.sort-actions {
  gap: 0.55rem;
}
.sort-actions .btn {
  min-height: 2.75rem;
}
.sort-actions .btn[aria-pressed="true"] {
  box-shadow:
    0 0 0 3px color-mix(in srgb, var(--primary) 55%, white),
    0 10px 28px color-mix(in srgb, var(--primary) 32%, transparent);
}
.sort-ind {
  font-size: 0.95rem;
  line-height: 1;
}
</style>
