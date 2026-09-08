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
const canEdit = computed(() => ["HEADMASTER", "ACADEMIC_MASTER"].includes(auth.role));
const canManage = computed(() => ["HEADMASTER", "ACADEMIC_MASTER"].includes(auth.role));
const rows = ref([]);
const parentOptions = ref([]);
const showArchived = ref(false);
const linkOpen = ref(false);
const link = reactive({ studentId: "", parentId: "", relationship: "GUARDIAN" });
const classes = ref([]);
const years = ref([]);
const sections = ref([]);
const error = ref("");
const open = ref(false);
const editingId = ref(null);
const editingAdm = ref("");
const passwordOk = ref(false);
const pendingPhoto = ref(null);
const pendingPreview = ref("");
const photoBust = ref(0);
const form = reactive({
  name: "", email: "", password: "", phone: "",
  gender: "FEMALE", academicYearId: "", schoolClassId: "", sectionId: "",
});

function linkedParent(student) {
  return student.parents?.[0] || null;
}

function relationLabel(value) {
  if (!value) return "";
  return value.charAt(0) + value.slice(1).toLowerCase();
}

const editingStudent = computed(() => rows.value.find((s) => String(s.id) === String(editingId.value)) || null);
const editingParent = computed(() => (editingStudent.value ? linkedParent(editingStudent.value) : null));
const editPhotoUrl = computed(() => editingStudent.value?.photoUrl || "");

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
  form.gender = "FEMALE";
  form.academicYearId = "";
  form.schoolClassId = "";
  form.sectionId = "";
  sections.value = [];
  passwordOk.value = false;
  editingId.value = null;
  editingAdm.value = "";
  clearPendingPhoto();
}

async function load() {
  error.value = "";
  try {
    const [page, yearList, classList, parentPage] = await Promise.all([
      peopleApi.students({ size: 50, archived: showArchived.value }),
      academicApi.years(),
      academicApi.classes(),
      canManage.value ? peopleApi.parents({ size: 100 }) : Promise.resolve([]),
    ]);
    rows.value = page.content || [];
    years.value = yearList;
    classes.value = classList;
    parentOptions.value = asList(parentPage).filter((p) => p.status !== "ARCHIVED");
  } catch (e) {
    error.value = e.message;
  }
}

async function onClass() {
  form.sectionId = "";
  sections.value = form.schoolClassId ? await academicApi.sections(form.schoolClassId) : [];
}

function toggleAdmit() {
  if (open.value && !editingId.value) {
    open.value = false;
    resetForm();
    return;
  }
  resetForm();
  open.value = true;
}

async function startEdit(student) {
  clearPendingPhoto();
  editingId.value = student.id;
  editingAdm.value = student.admissionNo || "";
  form.name = student.name || "";
  form.email = student.email || "";
  form.password = "";
  form.phone = student.phone || "";
  form.gender = student.gender || "FEMALE";
  form.academicYearId = student.academicYearId ? String(student.academicYearId) : "";
  form.schoolClassId = student.schoolClassId ? String(student.schoolClassId) : "";
  open.value = true;
  sections.value = form.schoolClassId ? await academicApi.sections(form.schoolClassId) : [];
  form.sectionId = student.sectionId ? String(student.sectionId) : "";
}

function closeForm() {
  open.value = false;
  resetForm();
}

async function applyPhoto(studentId, file) {
  const updated = await peopleApi.uploadStudentPhoto(studentId, file);
  const row = rows.value.find((s) => String(s.id) === String(studentId));
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
      const updated = await peopleApi.deleteStudentPhoto(editingId.value);
      const row = rows.value.find((s) => String(s.id) === String(editingId.value));
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
      await peopleApi.updateStudent(editingId.value, {
        name: form.name,
        phone: form.phone,
        gender: form.gender,
        academicYearId: Number(form.academicYearId) || null,
        schoolClassId: Number(form.schoolClassId) || null,
        sectionId: Number(form.sectionId) || null,
      });
    } else {
      const created = await peopleApi.createStudent({
        ...form,
        academicYearId: Number(form.academicYearId) || null,
        schoolClassId: Number(form.schoolClassId) || null,
        sectionId: Number(form.sectionId) || null,
      });
      if (pendingPhoto.value) {
        try {
          await applyPhoto(created.id, pendingPhoto.value);
        } catch (photoErr) {
          closeForm();
          await load();
          error.value = `Student saved, but the photo could not be uploaded: ${photoErr.message}`;
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

function openLink(student) {
  link.studentId = String(student.id);
  link.parentId = "";
  link.relationship = "GUARDIAN";
  linkOpen.value = true;
}

async function doLink() {
  error.value = "";
  try {
    await peopleApi.linkParent(link.studentId, {
      parentId: Number(link.parentId),
      relationship: link.relationship,
      primaryContact: true,
    });
    linkOpen.value = false;
    await load();
  } catch (e) {
    error.value = e.message;
  }
}

async function unlink(student, parent) {
  error.value = "";
  try {
    await peopleApi.unlinkParent(student.id, parent.parentId);
    await load();
  } catch (e) {
    error.value = e.message;
  }
}

async function suspend(student) {
  error.value = "";
  try {
    await peopleApi.suspendStudent(student.id);
    await load();
  } catch (e) {
    error.value = e.message;
  }
}

async function archive(student) {
  error.value = "";
  try {
    await peopleApi.archiveStudent(student.id);
    await load();
  } catch (e) {
    error.value = e.message;
  }
}

async function restore(student) {
  error.value = "";
  try {
    await peopleApi.restoreStudent(student.id);
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
      <div><h1>Students</h1><p class="sub">Directory and admission</p></div>
      <div class="row-actions">
        <label class="check">
          <input type="checkbox" :checked="showArchived" @change="setArchived($event.target.checked)" />
          Show archived
        </label>
        <button v-if="canEdit" class="btn" type="button" @click="toggleAdmit">
          {{ open && !editingId ? "Close" : "Admit student" }}
        </button>
      </div>
    </div>
    <p v-if="error" class="banner banner-error">{{ error }}</p>
    <form
      v-if="open"
      class="glass card"
      :data-confirm="editingId ? 'Save changes to this student?' : 'Admit this student?'"
      @submit.prevent="save"
    >
      <h3>{{ editingId ? `Edit ${form.name || "student"}` : "Admit student" }}</h3>
      <p v-if="editingAdm" class="sub">Admission no · {{ editingAdm }}</p>
      <p v-if="editingParent" class="sub">
        Parent · {{ editingParent.parentName }}
        <template v-if="editingParent.relationship"> ({{ relationLabel(editingParent.relationship) }})</template>
      </p>
      <p v-else-if="editingId" class="sub">No parent linked</p>
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
            v-confirm="{ message: 'Remove this student photo?', danger: true }"
            @click="removePhoto"
          >Remove photo</button>
          <p class="sub">JPEG, PNG, or WebP · up to 2 MB</p>
        </div>
      </div>
      <div class="grid grid-2">
        <label class="field"><span>Name</span><input v-model="form.name" required /></label>
        <label class="field"><span>Email</span><input v-model="form.email" type="email" required :disabled="Boolean(editingId)" /></label>
        <PhoneInput v-model="form.phone" />
        <label class="field">
          <span>Year</span>
          <select v-model="form.academicYearId"><option value="">—</option><option v-for="y in years" :key="y.id" :value="y.id">{{ y.name }}</option></select>
        </label>
        <label class="field">
          <span>Class</span>
          <select v-model="form.schoolClassId" @change="onClass"><option value="">—</option><option v-for="c in classes" :key="c.id" :value="c.id">{{ c.name }}</option></select>
        </label>
        <label class="field">
          <span>Section</span>
          <select v-model="form.sectionId"><option value="">—</option><option v-for="s in sections" :key="s.id" :value="s.id">{{ s.name }}</option></select>
        </label>
        <label class="field">
          <span>Gender</span>
          <select v-model="form.gender"><option>FEMALE</option><option>MALE</option><option>OTHER</option></select>
        </label>
      </div>
      <PasswordStrengthInput v-if="!editingId" v-model="form.password" :email="form.email" :name="form.name" @valid-change="passwordOk = $event" />
      <div class="row-actions">
        <button class="btn" :disabled="!editingId && !passwordOk">{{ editingId ? "Save changes" : "Save student" }}</button>
        <button class="btn btn-ghost" type="button" @click="closeForm">Cancel</button>
      </div>
    </form>
    <form v-if="linkOpen" class="glass card" data-confirm="Link this parent to the student?" @submit.prevent="doLink">
      <h3>Link parent</h3>
      <div class="grid grid-2">
        <label class="field">
          <span>Parent</span>
          <select v-model="link.parentId" required>
            <option disabled value="">Choose</option>
            <option v-for="p in parentOptions" :key="p.id" :value="p.id">{{ p.name }}</option>
          </select>
        </label>
        <label class="field">
          <span>Relationship</span>
          <select v-model="link.relationship">
            <option>FATHER</option><option>MOTHER</option><option>GUARDIAN</option><option>OTHER</option>
          </select>
        </label>
      </div>
      <div class="row-actions">
        <button class="btn">Link parent</button>
        <button class="btn btn-ghost" type="button" @click="linkOpen = false">Cancel</button>
      </div>
    </form>
    <div class="glass card table-wrap">
      <table>
        <thead><tr><th>Adm</th><th>Name</th><th>Parent</th><th>Class</th><th>Status</th><th></th></tr></thead>
        <tbody>
          <tr v-for="s in rows" :key="s.id">
            <td>{{ s.admissionNo }}</td>
            <td>
              <div class="name-cell">
                <StudentPhoto :person-id="s.id" :photo-url="s.photoUrl" :name="s.name" :bust="photoBust" size="sm" />
                <span>{{ s.name }}</span>
              </div>
            </td>
            <td>
              <div v-if="linkedParent(s)" class="link-cell">
                <router-link :to="`/parents`" class="name-link">{{ linkedParent(s).parentName }}</router-link>
                <span class="sub">{{ relationLabel(linkedParent(s).relationship) }}</span>
                <button
                  v-if="canManage"
                  type="button"
                  class="link-btn"
                  v-confirm="{ message: `Unlink ${linkedParent(s).parentName} from ${s.name}?`, danger: true }"
                  @click="unlink(s, linkedParent(s))"
                >Unlink</button>
              </div>
              <div v-else class="link-cell">
                <span class="sub">No parent</span>
                <button v-if="canManage" type="button" class="link-btn" @click="openLink(s)">Link</button>
              </div>
            </td>
            <td>{{ s.schoolClassName }} {{ s.sectionName }}</td>
            <td><span class="chip">{{ statusLabel(s.status) }}</span></td>
            <td>
              <div class="row-actions wrap">
                <button
                  v-if="canEdit"
                  class="icon-btn"
                  type="button"
                  :aria-label="`Edit ${s.name}`"
                  title="Edit student"
                  @click="startEdit(s)"
                >
                  <Icon name="pen" />
                </button>
                <router-link
                  class="icon-btn"
                  :to="`/messages?studentId=${s.id}`"
                  :aria-label="`Message ${s.name}`"
                  title="Message"
                >
                  <Icon name="message" />
                </router-link>
                <button
                  v-if="canManage && s.status === 'ACTIVE'"
                  type="button"
                  class="btn btn-ghost"
                  v-confirm="`Suspend ${s.name}? They will not be able to sign in.`"
                  @click="suspend(s)"
                >Suspend</button>
                <button
                  v-if="canManage && s.status !== 'ARCHIVED'"
                  type="button"
                  class="btn btn-ghost"
                  v-confirm="{ message: `Deactivate ${s.name}? They will be archived and can be restored later.`, danger: true }"
                  @click="archive(s)"
                >Deactivate</button>
                <button
                  v-if="canManage && s.status && s.status !== 'ACTIVE'"
                  type="button"
                  class="btn btn-ghost"
                  v-confirm="`Restore ${s.name}?`"
                  @click="restore(s)"
                >Restore</button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
      <p v-if="!rows.length" class="empty">{{ showArchived ? "No archived students." : "No students yet." }}</p>
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
a.icon-btn {
  text-decoration: none;
  color: var(--primary);
}
h3 { margin: 0 0 0.35rem; }
.check {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  color: var(--muted);
  font-size: 0.85rem;
}
.link-cell {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.15rem;
}
.name-link {
  color: var(--primary);
  text-decoration: none;
  font-weight: 650;
}
.name-link:hover { text-decoration: underline; }
.link-btn {
  border: 0;
  background: transparent;
  color: var(--primary);
  cursor: pointer;
  padding: 0;
  font-size: 0.75rem;
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
</style>
