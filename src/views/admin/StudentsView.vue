<script setup>
import { computed, nextTick, onMounted, onUnmounted, reactive, ref, watch } from "vue";
import { academicApi, peopleApi, asList } from "../../api/endpoints";
import AddressFields from "../../components/AddressFields.vue";
import Icon from "../../components/Icon.vue";
import ListSearch from "../../components/ListSearch.vue";
import PasswordStrengthInput from "../../components/PasswordStrengthInput.vue";
import PhoneInput from "../../components/PhoneInput.vue";
import { emptyAddress, encodeAddress, parseAddress } from "../../utils/address";
import {
  BLOOD_GROUPS, DEFAULT_NATIONALITY, INSURANCE_PROVIDERS, NATIONALITIES,
  joinEmergency, loadExtraInsuranceProviders, rememberInsuranceProvider, splitEmergency,
} from "../../utils/studentOptions";
import StudentPhoto from "../../components/StudentPhoto.vue";
import UserLinkedRecords from "../../components/UserLinkedRecords.vue";
import { useAuthStore } from "../../stores/auth";
import { useConfirmStore } from "../../stores/confirm";
import { statusLabel, isLoginLocked } from "../../utils/status";
import { useListSearch } from "../../utils/listSearch";
import { accountStatus, useTableSort } from "../../utils/tableSort";
import { useFeedback } from "../../composables/useFeedback";


const auth = useAuthStore();
const canEdit = computed(() => ["HEADMASTER", "SCHOOL_ADMIN", "ACADEMIC_MASTER"].includes(auth.role));
const canManage = computed(() => ["HEADMASTER", "SCHOOL_ADMIN", "ACADEMIC_MASTER"].includes(auth.role));
const rows = ref([]);
const { query, filteredRows } = useListSearch(rows, (s) => [
  s.name, s.firstName, s.lastName, s.email, s.admissionNo, s.phone,
  s.schoolClassName, s.sectionName, s.nationality, s.insuranceProvider, s.insuranceMembershipNo,
  s.parents?.map((p) => p.parentName),
  accountStatus(s),
]);
const { sortKey, sortDir, toggleSort, sortedRows } = useTableSort(filteredRows, {
  name: (row) => row.name,
  email: (row) => row.email,
  status: accountStatus,
});
const parentOptions = ref([]);
const showArchived = ref(false);
const linkOpen = ref(false);
const link = reactive({ studentId: "", parentId: "", relationship: "GUARDIAN" });
const classes = ref([]);
const years = ref([]);
const sections = ref([]);
const { error, warning } = useFeedback();
const open = ref(false);
const editingId = ref(null);
const editingAdm = ref("");
const passwordOk = ref(false);
const pendingPhoto = ref(null);
const pendingPreview = ref("");
const photoBust = ref(0);
const form = reactive({
  firstName: "", middleName: "", lastName: "", nationality: DEFAULT_NATIONALITY,
  email: "", password: "", phone: "",
  gender: "FEMALE", academicYearId: "", schoolClassId: "", sectionId: "",
  rollNumber: "", dateOfBirth: "", bloodGroup: "", admissionDate: "",
  emergencyName: "", emergencyPhone: "", medicalNotes: "",
  insuranceProvider: "", insuranceMembershipNo: "", insuranceExpiry: "",
});
const studentAddress = ref(emptyAddress());
const parentAddress = ref(emptyAddress());
const createParent = ref(false);
const parentPasswordOk = ref(false);
const parentForm = reactive({
  name: "", email: "", password: "", phone: "", occupation: "", relationship: "GUARDIAN",
});
const promoteOpen = ref(false);
const promoteFormEl = ref(null);
const promoteStudent = ref(null);
const promote = reactive({ action: "PROMOTE", academicYearId: "", schoolClassId: "", sectionId: "", notes: "" });
const promoteSections = ref([]);
const historyStudent = ref(null);
const historyRows = ref([]);
const historyLoading = ref(false);
const formEl = ref(null);
const confirm = useConfirmStore();

function linkedParent(student) {
  return student.parents?.[0] || null;
}

function relationLabel(value) {
  if (!value) return "";
  return value.charAt(0) + value.slice(1).toLowerCase();
}

function actionLabel(value) {
  switch (value) {
    case "PROMOTE": return "Promoted";
    case "REPEAT": return "Repeated";
    case "GRADUATE": return "Graduated";
    case "TRANSFER": return "Transferred";
    default: return value || "";
  }
}

function formatDate(value) {
  if (!value) return "—";
  return String(value).slice(0, 10);
}

const showLinks = ref(false);
const editingStudent = computed(() => rows.value.find((s) => String(s.id) === String(editingId.value)) || null);
const editingParent = computed(() => (editingStudent.value ? linkedParent(editingStudent.value) : null));
const editPhotoUrl = computed(() => editingStudent.value?.photoUrl || "");
const canSaveParent = computed(() => {
  if (!createParent.value) return true;
  if (!parentForm.name.trim() || !parentForm.email.trim()) return false;
  return parentForm.password ? parentPasswordOk.value : Boolean(parentForm.phone);
});

function composeName(first, middle, last) {
  return [first, middle, last].map((part) => (part || "").trim()).filter(Boolean).join(" ");
}

function splitName(full) {
  const parts = (full || "").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return { firstName: "", middleName: "", lastName: "" };
  if (parts.length === 1) return { firstName: parts[0], middleName: "", lastName: "" };
  if (parts.length === 2) return { firstName: parts[0], middleName: "", lastName: parts[1] };
  return { firstName: parts[0], middleName: parts.slice(1, -1).join(" "), lastName: parts[parts.length - 1] };
}

const displayName = computed(() => composeName(form.firstName, form.middleName, form.lastName));
const nationalityOptions = computed(() => {
  const rows = NATIONALITIES.slice();
  if (form.nationality && !rows.includes(form.nationality)) rows.unshift(form.nationality);
  return rows;
});
const bloodGroupOptions = computed(() => {
  const rows = BLOOD_GROUPS.slice();
  if (form.bloodGroup && !rows.includes(form.bloodGroup)) rows.unshift(form.bloodGroup);
  return rows;
});
const extraInsuranceProviders = ref(loadExtraInsuranceProviders());
const newInsuranceProvider = ref("");
const insuranceProviderOptions = computed(() => {
  const byName = new Map();
  const add = (name) => {
    const trimmed = String(name || "").trim();
    if (!trimmed || trimmed === "__add__") return;
    const key = trimmed.toLowerCase();
    if (!byName.has(key)) byName.set(key, trimmed);
  };
  INSURANCE_PROVIDERS.forEach(add);
  extraInsuranceProviders.value.forEach(add);
  rows.value.forEach((student) => add(student.insuranceProvider));
  add(form.insuranceProvider);
  return [...byName.values()].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
});

function addInsuranceProvider() {
  const saved = rememberInsuranceProvider(newInsuranceProvider.value);
  if (!saved) return;
  extraInsuranceProviders.value = loadExtraInsuranceProviders();
  form.insuranceProvider = saved;
  newInsuranceProvider.value = "";
}

function insuranceProviderForSave() {
  if (form.insuranceProvider !== "__add__") return form.insuranceProvider.trim() || null;
  const saved = rememberInsuranceProvider(newInsuranceProvider.value);
  if (!saved) return null;
  extraInsuranceProviders.value = loadExtraInsuranceProviders();
  form.insuranceProvider = saved;
  newInsuranceProvider.value = "";
  return saved;
}
const canSaveCreate = computed(() => (
  Boolean(form.firstName.trim() && form.lastName.trim())
  && (form.password ? passwordOk.value : Boolean(form.phone))
  && canSaveParent.value
));

function clearPendingPhoto() {
  if (pendingPreview.value) URL.revokeObjectURL(pendingPreview.value);
  pendingPreview.value = "";
  pendingPhoto.value = null;
}

function resetForm() {
  form.firstName = "";
  form.middleName = "";
  form.lastName = "";
  form.nationality = DEFAULT_NATIONALITY;
  form.email = "";
  form.password = "";
  form.phone = "";
  form.gender = "FEMALE";
  form.academicYearId = "";
  form.schoolClassId = "";
  form.sectionId = "";
  form.rollNumber = "";
  form.dateOfBirth = "";
  form.bloodGroup = "";
  form.admissionDate = "";
  studentAddress.value = emptyAddress();
  form.emergencyName = "";
  form.emergencyPhone = "";
  form.medicalNotes = "";
  form.insuranceProvider = "";
  form.insuranceMembershipNo = "";
  form.insuranceExpiry = "";
  newInsuranceProvider.value = "";
  sections.value = [];
  passwordOk.value = false;
  editingId.value = null;
  showLinks.value = false;
  editingAdm.value = "";
  createParent.value = false;
  parentPasswordOk.value = false;
  parentForm.name = "";
  parentForm.email = "";
  parentForm.password = "";
  parentForm.phone = "";
  parentForm.occupation = "";
  parentAddress.value = emptyAddress();
  parentForm.relationship = "GUARDIAN";
  clearPendingPhoto();
}

async function load() {
  error.value = "";
  try {
    const [page, yearResult, classResult, parentPage] = await Promise.all([
      peopleApi.students({ size: 50, archived: showArchived.value }),
      academicApi.years().catch(() => []),
      academicApi.classes().catch(() => []),
      canManage.value ? peopleApi.parents({ size: 100 }) : Promise.resolve([]),
    ]);
    rows.value = page.content || [];
    years.value = yearResult;
    classes.value = classResult;
    parentOptions.value = asList(parentPage).filter((p) => p.status !== "ARCHIVED");
  } catch (e) {
    error.value = e.message;
  }
}

async function onClass() {
  form.sectionId = "";
  sections.value = form.schoolClassId ? await academicApi.sections(form.schoolClassId) : [];
}

function openAdmit() {
  error.value = "";
  resetForm();
  open.value = true;
}

async function startEdit(student) {
  error.value = "";
  clearPendingPhoto();
  editingId.value = student.id;
  editingAdm.value = student.admissionNo || "";
  if (student.firstName || student.lastName) {
    form.firstName = student.firstName || "";
    form.middleName = student.middleName || "";
    form.lastName = student.lastName || "";
  } else {
    Object.assign(form, splitName(student.name));
  }
  form.nationality = student.nationality || DEFAULT_NATIONALITY;
  form.email = student.email || "";
  form.password = "";
  form.phone = student.phone || "";
  form.gender = student.gender || "FEMALE";
  form.academicYearId = student.academicYearId ? String(student.academicYearId) : "";
  form.schoolClassId = student.schoolClassId ? String(student.schoolClassId) : "";
  form.rollNumber = student.rollNumber || "";
  form.dateOfBirth = student.dateOfBirth || "";
  form.bloodGroup = student.bloodGroup || "";
  form.admissionDate = student.admissionDate || "";
  studentAddress.value = parseAddress(student.address);
  const emergency = splitEmergency(student.emergencyContact);
  form.emergencyName = emergency.name;
  form.emergencyPhone = emergency.phone;
  form.medicalNotes = student.medicalNotes || "";
  form.insuranceProvider = student.insuranceProvider || "";
  form.insuranceMembershipNo = student.insuranceMembershipNo || "";
  form.insuranceExpiry = student.insuranceExpiry || "";
  newInsuranceProvider.value = "";
  open.value = true;
  sections.value = form.schoolClassId ? await academicApi.sections(form.schoolClassId) : [];
  form.sectionId = student.sectionId ? String(student.sectionId) : "";
}

function closeForm() {
  if (confirm.open) return;
  open.value = false;
  resetForm();
}

function openPromote(student) {
  error.value = "";
  previewRows.value = [];
  promoteStudent.value = student;
  promoteOpen.value = true;
}

function closePromote() {
  if (confirm.open) return;
  promoteOpen.value = false;
  promoteStudent.value = null;
  previewRows.value = [];
}

function onFormKey(event) {
  if (confirm.open) return;
  if (event.key !== "Escape") return;
  if (promoteOpen.value) {
    closePromote();
    return;
  }
  if (open.value) closeForm();
}

watch([open, promoteOpen], async ([admitOpen, promoOpen]) => {
  document.body.style.overflow = admitOpen || promoOpen ? "hidden" : "";
  await nextTick();
  if (promoOpen) {
    promoteFormEl.value?.querySelector("select, input")?.focus();
    return;
  }
  if (admitOpen) {
    formEl.value?.querySelector("input:not([disabled])")?.focus();
  }
});

onUnmounted(() => {
  document.body.style.overflow = "";
  window.removeEventListener("keydown", onFormKey, true);
});

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

function packedAddress(addr) {
  const encoded = encodeAddress(addr);
  if (!encoded) {
    error.value = "Enter region, district, ward, and street.";
    return null;
  }
  return encoded;
}

async function save() {
  error.value = "";
  const address = packedAddress(studentAddress.value);
  if (!address) return;
  const parentPacked = !editingId.value && createParent.value ? packedAddress(parentAddress.value) : null;
  if (!editingId.value && createParent.value && !parentPacked) return;
  try {
    if (editingId.value) {
      await peopleApi.updateStudent(editingId.value, {
        name: displayName.value,
        firstName: form.firstName.trim(),
        middleName: form.middleName.trim() || null,
        lastName: form.lastName.trim(),
        nationality: form.nationality || null,
        phone: form.phone,
        gender: form.gender,
        rollNumber: form.rollNumber || null,
        dateOfBirth: form.dateOfBirth || null,
        bloodGroup: form.bloodGroup || null,
        address,
        emergencyContact: joinEmergency(form.emergencyName, form.emergencyPhone) || null,
        medicalNotes: form.medicalNotes || null,
        insuranceProvider: insuranceProviderForSave(),
        insuranceMembershipNo: form.insuranceMembershipNo || null,
        insuranceExpiry: form.insuranceExpiry || null,
        academicYearId: Number(form.academicYearId) || null,
        schoolClassId: Number(form.schoolClassId) || null,
        sectionId: Number(form.sectionId) || null,
      });
    } else {
      const created = await peopleApi.createStudent({
        ...form,
        name: displayName.value,
        firstName: form.firstName.trim(),
        middleName: form.middleName.trim() || null,
        lastName: form.lastName.trim(),
        password: form.password?.trim() || null,
        rollNumber: form.rollNumber || null,
        dateOfBirth: form.dateOfBirth || null,
        bloodGroup: form.bloodGroup || null,
        admissionDate: form.admissionDate || null,
        address,
        emergencyContact: joinEmergency(form.emergencyName, form.emergencyPhone) || null,
        medicalNotes: form.medicalNotes || null,
        insuranceProvider: insuranceProviderForSave(),
        insuranceMembershipNo: form.insuranceMembershipNo || null,
        insuranceExpiry: form.insuranceExpiry || null,
        academicYearId: Number(form.academicYearId) || null,
        schoolClassId: Number(form.schoolClassId) || null,
        sectionId: Number(form.sectionId) || null,
        parent: createParent.value
          ? {
            name: parentForm.name,
            email: parentForm.email,
            password: parentForm.password?.trim() || null,
            phone: parentForm.phone || null,
            occupation: parentForm.occupation || null,
            address: parentPacked,
            relationship: parentForm.relationship,
          }
          : null,
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
    const updated = await peopleApi.restoreStudent(student.id);
    showArchived.value = false;
    await load();
    if (updated && !rows.value.some((row) => String(row.id) === String(updated.id))) {
      rows.value = [updated, ...rows.value];
    }
  } catch (e) {
    error.value = e.message;
  }
}

async function unlock(student) {
  error.value = "";
  try {
    await peopleApi.unlockUser(student.userId);
    await load();
  } catch (e) {
    error.value = e.message;
  }
}

async function resetTwoFactor(student) {
  error.value = "";
  try {
    await peopleApi.resetTwoFactor(student.userId);
    await load();
  } catch (e) {
    error.value = e.message;
  }
}

async function resetPassword(student) {
  error.value = "";
  try {
    const result = await peopleApi.resetPassword(student.userId);
    error.value = "";
    await load();
    if (!result.smsSent) {
      warning.value = `Password reset for ${student.name}. No SMS was sent (missing phone).`;
    }
  } catch (e) {
    error.value = e.message;
  }
}

async function onPromoteClass() {
  promote.sectionId = "";
  promoteSections.value = promote.schoolClassId ? await academicApi.sections(promote.schoolClassId) : [];
}

const previewRows = ref([]);

function promotePayload() {
  return {
    studentIds: promoteStudent.value ? [Number(promoteStudent.value.id)] : [],
    action: promote.action,
    academicYearId: promote.academicYearId ? Number(promote.academicYearId) : null,
    schoolClassId: promote.schoolClassId ? Number(promote.schoolClassId) : null,
    sectionId: promote.sectionId ? Number(promote.sectionId) : null,
    notes: promote.notes || null,
  };
}

async function previewPromote() {
  error.value = "";
  try {
    previewRows.value = await peopleApi.previewPromote(promotePayload());
  } catch (e) {
    error.value = e.message;
  }
}

async function doPromote() {
  error.value = "";
  try {
    await peopleApi.promoteStudents(promotePayload());
    closePromote();
    await load();
    if (historyStudent.value) await openHistory(historyStudent.value);
  } catch (e) {
    error.value = e.message;
  }
}

async function openHistory(student) {
  error.value = "";
  historyStudent.value = student;
  historyLoading.value = true;
  try {
    historyRows.value = await peopleApi.studentEnrolments(student.id);
  } catch (e) {
    error.value = e.message;
    historyRows.value = [];
  } finally {
    historyLoading.value = false;
  }
}

function closeHistory() {
  historyStudent.value = null;
  historyRows.value = [];
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
        <p class="directory-label"><Icon name="users" /> Directory and admission</p>
        <h1>Students</h1>
      </div>
      <div class="row-actions">
        <ListSearch v-model="query" placeholder="Search students" />
        <label class="check">
          <input type="checkbox" :checked="showArchived" @change="setArchived($event.target.checked)" />
          Show archived
        </label>
        <button v-if="canEdit" class="btn" type="button" @click="openAdmit">Admit student</button>
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
          aria-labelledby="student-form-title"
          :data-confirm="editingId ? 'Save changes to this student?' : 'Admit this student?'"
          @submit.prevent="save"
        >
          <div class="form-head">
            <div>
              <h3 id="student-form-title">{{ editingId ? `Edit ${displayName || "student"}` : "Admit student" }}</h3>
              <p v-if="editingAdm" class="sub">Admission no · {{ editingAdm }}</p>
              <p v-if="editingParent" class="sub">
                Parent · {{ editingParent.parentName }}
                <template v-if="editingParent.relationship"> ({{ relationLabel(editingParent.relationship) }})</template>
              </p>
              <p v-else-if="editingId" class="sub">No parent linked</p>
            </div>
            <div class="form-tools">
              <button
                v-if="editingStudent?.userId"
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
              :name="displayName"
              :bust="photoBust"
              size="lg"
            />
            <span v-else class="avatar-placeholder" aria-hidden="true">{{ (displayName || "?").charAt(0).toUpperCase() }}</span>
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
            <label class="field"><span>First name</span><input v-model="form.firstName" required /></label>
            <label class="field"><span>Middle name</span><input v-model="form.middleName" /></label>
            <label class="field"><span>Last name</span><input v-model="form.lastName" required /></label>
            <label class="field"><span>Nationality</span>
              <select v-model="form.nationality" required>
                <option v-for="nation in nationalityOptions" :key="nation" :value="nation">{{ nation }}</option>
              </select>
            </label>
            <label class="field"><span>Email</span><input v-model="form.email" type="email" required :disabled="Boolean(editingId)" /></label>
            <PhoneInput v-model="form.phone" :required="!editingId && !form.password" />
            <label class="field">
              <span>Year</span>
              <select v-model="form.academicYearId"><option value="">No year</option><option v-for="y in years" :key="y.id" :value="y.id">{{ y.name }}</option></select>
            </label>
            <label class="field">
              <span>Class</span>
              <select v-model="form.schoolClassId" @change="onClass"><option value="">No class</option><option v-for="c in classes" :key="c.id" :value="c.id">{{ c.name }}</option></select>
            </label>
            <label class="field">
              <span>Section</span>
              <select v-model="form.sectionId"><option value="">No section</option><option v-for="s in sections" :key="s.id" :value="s.id">{{ s.name }}</option></select>
            </label>
            <label class="field">
              <span>Gender</span>
              <select v-model="form.gender"><option>FEMALE</option><option>MALE</option><option>OTHER</option></select>
            </label>
            <label class="field"><span>Roll no</span><input v-model="form.rollNumber" /></label>
            <label class="field"><span>Date of birth</span><input v-model="form.dateOfBirth" type="date" /></label>
            <label class="field"><span>Blood group</span>
              <select v-model="form.bloodGroup">
                <option value="">Choose</option>
                <option v-for="group in bloodGroupOptions" :key="group" :value="group">{{ group }}</option>
              </select>
            </label>
            <label v-if="!editingId" class="field"><span>Admission date</span><input v-model="form.admissionDate" type="date" /></label>
            <AddressFields v-model="studentAddress" />
            <label class="field"><span>Emergency contact name</span><input v-model="form.emergencyName" /></label>
            <PhoneInput v-model="form.emergencyPhone" label="Emergency contact phone" />
            <label class="field">
              <span>Insurance provider</span>
              <select v-model="form.insuranceProvider">
                <option value="">Choose</option>
                <option v-for="provider in insuranceProviderOptions" :key="provider" :value="provider">{{ provider }}</option>
                <option value="__add__">Add provider…</option>
              </select>
            </label>
            <label v-if="form.insuranceProvider === '__add__'" class="field provider-add">
              <span>New provider</span>
              <span class="provider-add-row">
                <input
                  v-model="newInsuranceProvider"
                  maxlength="120"
                  placeholder="Provider name"
                  @keydown.enter.prevent="addInsuranceProvider"
                />
                <button class="btn" type="button" @click="addInsuranceProvider">Add</button>
              </span>
            </label>
            <label class="field"><span>Insurance membership number</span><input v-model="form.insuranceMembershipNo" maxlength="60" /></label>
            <label class="field"><span>Insurance expiry</span><input v-model="form.insuranceExpiry" type="date" /></label>
            <label class="field"><span>Medical notes</span><input v-model="form.medicalNotes" /></label>
          </div>
          <PasswordStrengthInput
            v-if="!editingId"
            v-model="form.password"
            label="Password (optional)"
            hint="Leave blank to generate a temporary password and send it by SMS to their phone."
            :email="form.email"
            :name="displayName"
            @valid-change="passwordOk = $event"
          />
          <div v-if="!editingId" class="parent-admit">
            <label class="check">
              <input v-model="createParent" type="checkbox" />
              Create parent now
            </label>
            <div v-if="createParent" class="grid grid-2">
              <label class="field"><span>Parent name</span><input v-model="parentForm.name" required /></label>
              <label class="field"><span>Parent email</span><input v-model="parentForm.email" type="email" required /></label>
              <PhoneInput v-model="parentForm.phone" :required="!parentForm.password" />
              <label class="field">
                <span>Relationship</span>
                <select v-model="parentForm.relationship">
                  <option>FATHER</option><option>MOTHER</option><option>GUARDIAN</option><option>OTHER</option>
                </select>
              </label>
              <label class="field"><span>Occupation</span><input v-model="parentForm.occupation" /></label>
              <AddressFields v-model="parentAddress" />
              <PasswordStrengthInput
                v-model="parentForm.password"
                label="Parent password (optional)"
                hint="Leave blank to generate a temporary password and send it by SMS to the parent phone."
                :email="parentForm.email"
                :name="parentForm.name"
                @valid-change="parentPasswordOk = $event"
              />
            </div>
          </div>
          <UserLinkedRecords v-if="showLinks && editingStudent?.userId" :user-id="editingStudent.userId" @changed="load" />
          <div class="row-actions form-footer">
            <button class="btn" :disabled="!editingId && !canSaveCreate">{{ editingId ? "Save changes" : "Save student" }}</button>
            <button class="btn btn-ghost" type="button" @click="closeForm">Cancel</button>
          </div>
        </form>
      </div>
    </Teleport>
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
        <li v-for="s in sortedRows" :key="s.id" class="person-card">
          <div class="person-top">
            <StudentPhoto :person-id="s.id" :photo-url="s.photoUrl" :name="s.name" :bust="photoBust" size="sm" />
            <div class="person-who">
              <strong>{{ s.name }}</strong>
              <div class="person-facts">
                <span>{{ s.admissionNo || "No admission no" }}</span>
                <span>{{ s.schoolClassName || "No class" }}<template v-if="s.sectionName"> {{ s.sectionName }}</template></span>
                <span>{{ s.email || "No email" }}</span>
              </div>
            </div>
            <div class="person-status">
              <span class="chip">{{ statusLabel(s.status) }}</span>
              <span v-if="isLoginLocked(s)" class="chip chip-warn">Locked</span>
              <span v-if="s.totpEnabled" class="chip">2FA</span>
            </div>
          </div>
          <div class="person-bottom">
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
            <div class="row-actions wrap">
                <button
                  v-if="canManage && s.status === 'ACTIVE'"
                  class="btn"
                  type="button"
                  @click="openPromote(s)"
                >Promote</button>
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
                  :to="`/report-card?studentId=${s.id}`"
                  :aria-label="`Report card for ${s.name}`"
                  title="Report card"
                >
                  <Icon name="book" />
                </router-link>
                <button
                  class="icon-btn"
                  type="button"
                  :aria-label="`Enrolment history for ${s.name}`"
                  title="Enrolment history"
                  @click="openHistory(s)"
                >
                  <Icon name="list" />
                </button>
                <button
                  v-if="canManage && isLoginLocked(s)"
                  type="button"
                  class="btn btn-ghost"
                  v-confirm="`Unlock ${s.name}? They will be able to sign in again immediately.`"
                  @click="unlock(s)"
                >Unlock</button>
                <button
                  v-if="canManage && s.totpEnabled"
                  type="button"
                  class="btn btn-ghost"
                  v-confirm="{ message: `Reset ShuleHub 2FA for ${s.name}? They will set up Google Authenticator again at next sign-in.`, danger: true }"
                  @click="resetTwoFactor(s)"
                >Reset 2FA</button>
                <button
                  v-if="canManage"
                  type="button"
                  class="btn btn-ghost"
                  v-confirm="{ message: `Reset password for ${s.name}? A temporary password will be sent by SMS if they have a phone.`, confirmLabel: 'Reset password', danger: true }"
                  @click="resetPassword(s)"
                >Reset password</button>
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
                  v-confirm="{ message: `Deactivate ${s.name}? They will be archived and can be restored later.`, confirmLabel: 'Deactivate', danger: true }"
                  @click="archive(s)"
                >Deactivate</button>
                <button
                  v-if="canManage && s.status && s.status !== 'ACTIVE'"
                  type="button"
                  class="btn btn-ghost"
                  v-confirm="{ message: `Restore ${s.name}? They will appear in the live list again.`, confirmLabel: 'Restore' }"
                  @click="restore(s)"
                >Restore</button>
              </div>
          </div>
        </li>
      </ul>
      <p v-if="!sortedRows.length" class="empty">{{ query.trim() ? "No students match that search." : (showArchived ? "No archived students." : "No students yet.") }}</p>
    </div>
    <article v-if="historyStudent" class="glass card">
      <div class="page-head">
        <div>
          <h3>Enrolment history</h3>
          <p class="sub">{{ historyStudent.admissionNo }} · {{ historyStudent.name }}. Placement at the time of each action.</p>
        </div>
        <button class="btn btn-ghost" type="button" @click="closeHistory">Close</button>
      </div>
      <p v-if="historyLoading" class="empty">Loading history…</p>
      <div v-else class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Action</th>
              <th>Year</th>
              <th>Class</th>
              <th>Section</th>
              <th>Notes</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in historyRows" :key="row.id">
              <td>{{ formatDate(row.effectiveDate) }}</td>
              <td><span class="chip">{{ actionLabel(row.action) }}</span></td>
              <td>{{ row.academicYearName || "—" }}</td>
              <td>{{ row.schoolClassName || "—" }}</td>
              <td>{{ row.sectionName || "—" }}</td>
              <td>{{ row.notes || "—" }}</td>
            </tr>
          </tbody>
        </table>
        <p v-if="!historyRows.length" class="empty">No promotion, repeat, or graduation records yet.</p>
      </div>
    </article>
    <Teleport to="body">
      <div
        v-if="promoteOpen"
        class="form-scrim"
        role="presentation"
        @click.self="closePromote"
      >
        <form
          ref="promoteFormEl"
          class="glass card form-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="promote-form-title"
          data-confirm="Apply this promotion action?"
          @submit.prevent="doPromote"
        >
          <div class="form-head">
            <div>
              <h3 id="promote-form-title">{{ promoteStudent ? `Promote ${promoteStudent.name}` : "Promote" }}</h3>
              <p v-if="promoteStudent" class="sub">
                {{ promoteStudent.admissionNo }}
                · {{ promoteStudent.schoolClassName || "No class" }}<template v-if="promoteStudent.sectionName"> {{ promoteStudent.sectionName }}</template>
              </p>
            </div>
            <button class="btn btn-ghost" type="button" @click="closePromote">Close</button>
          </div>
          <div class="grid grid-2">
            <label class="field"><span>Action</span>
              <select v-model="promote.action">
                <option value="PROMOTE">Promote</option>
                <option value="REPEAT">Repeat</option>
                <option value="GRADUATE">Graduate</option>
                <option value="TRANSFER">Transfer</option>
              </select>
            </label>
            <label class="field"><span>{{ promote.action === "REPEAT" ? "Year (next year if blank)" : "Year" }}</span>
              <select v-model="promote.academicYearId">
                <option value="">{{ promote.action === "REPEAT" ? "Next academic year" : "—" }}</option>
                <option v-for="y in years" :key="y.id" :value="y.id">{{ y.name }}</option>
              </select>
            </label>
            <label class="field"><span>Class</span>
              <select v-model="promote.schoolClassId" @change="onPromoteClass">
                <option value="">—</option>
                <option v-for="c in classes" :key="c.id" :value="c.id">{{ c.name }}</option>
              </select>
            </label>
            <label class="field"><span>Section</span>
              <select v-model="promote.sectionId">
                <option value="">—</option>
                <option v-for="s in promoteSections" :key="s.id" :value="s.id">{{ s.name }}</option>
              </select>
            </label>
            <label class="field"><span>Notes</span><input v-model="promote.notes" /></label>
          </div>
          <div v-if="previewRows.length" class="table-wrap">
            <table>
              <thead><tr><th>Student</th><th>From</th><th>To</th><th>Action</th></tr></thead>
              <tbody>
                <tr v-for="row in previewRows" :key="row.studentId">
                  <td>{{ row.admissionNo }} {{ row.studentName }}</td>
                  <td>{{ row.fromClass }} {{ row.fromSection }}</td>
                  <td>{{ row.toClass }} {{ row.toSection }}</td>
                  <td>{{ row.action }}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div class="row-actions form-footer">
            <button class="btn btn-ghost" type="button" :disabled="!promoteStudent" @click="previewPromote">Preview</button>
            <button class="btn" :disabled="!promoteStudent">Apply</button>
            <button class="btn btn-ghost" type="button" @click="closePromote">Cancel</button>
          </div>
        </form>
      </div>
    </Teleport>
  </section>
</template>

<style scoped>
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
.parent-admit {
  margin: 1rem 0 0.4rem;
  padding-top: 0.85rem;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
}
.parent-admit .check { margin-bottom: 0.7rem; }
.provider-add-row {
  display: flex;
  gap: 0.5rem;
}
.provider-add-row input { flex: 1; min-width: 0; }
.provider-add-row .btn { white-space: nowrap; }
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
.page-head .row-actions .btn {
  padding: 0.88rem 1.25rem;
  font-size: inherit;
}
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
  padding: 0.7rem 1.2rem;
  font-size: 0.95rem;
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
