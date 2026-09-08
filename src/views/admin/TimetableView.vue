<script setup>
import { computed, onMounted, reactive, ref, watch } from "vue";
import { academicApi, peopleApi } from "../../api/endpoints";
import Icon from "../../components/Icon.vue";
import { useAuthStore } from "../../stores/auth";

const auth = useAuthStore();
const canManage = computed(() => auth.role === "ACADEMIC_MASTER");

const days = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"];
const years = ref([]);
const sections = ref([]);
const subjects = ref([]);
const classrooms = ref([]);
const teachers = ref([]);
const slots = ref([]);
const error = ref("");
const sectionId = ref("");
const formOpen = ref(false);
const editingId = ref(null);
const form = reactive({
  academicYearId: "", sectionId: "", subjectId: "", teacherId: "",
  dayOfWeek: "MONDAY", startTime: "08:00", endTime: "08:40", room: "",
});

function timeInput(value) {
  return value ? String(value).slice(0, 5) : "";
}

function resetForm() {
  form.academicYearId = "";
  form.sectionId = sectionId.value || "";
  form.subjectId = "";
  form.teacherId = "";
  form.dayOfWeek = "MONDAY";
  form.startTime = "08:00";
  form.endTime = "08:40";
  form.room = "";
  editingId.value = null;
}

async function loadMeta() {
  const [yearList, classList, subjectList, classroomList, teacherPage] = await Promise.all([
    academicApi.years(),
    academicApi.classes(),
    academicApi.subjects(),
    academicApi.classrooms(),
    peopleApi.teachers({ size: 100 }),
  ]);
  years.value = yearList;
  subjects.value = subjectList;
  classrooms.value = Array.isArray(classroomList) ? classroomList : classroomList.content || [];
  teachers.value = Array.isArray(teacherPage) ? teacherPage : teacherPage.content || [];
  sections.value = (await Promise.all(classList.map((c) => academicApi.sections(c.id)))).flat();
}

async function loadSlots() {
  if (!sectionId.value) return;
  slots.value = await academicApi.timetable({ sectionId: sectionId.value });
}

watch(sectionId, loadSlots);

function openForm() {
  error.value = "";
  if (formOpen.value && !editingId.value) {
    closeForm();
    return;
  }
  resetForm();
  formOpen.value = true;
}

function closeForm() {
  formOpen.value = false;
  resetForm();
}

function startEdit(slot) {
  error.value = "";
  editingId.value = slot.id;
  form.academicYearId = slot.academicYearId ? String(slot.academicYearId) : "";
  form.sectionId = slot.sectionId ? String(slot.sectionId) : "";
  form.subjectId = slot.subjectId ? String(slot.subjectId) : "";
  form.teacherId = slot.teacherId ? String(slot.teacherId) : "";
  form.dayOfWeek = slot.dayOfWeek || "MONDAY";
  form.startTime = timeInput(slot.startTime);
  form.endTime = timeInput(slot.endTime);
  form.room = slot.room || "";
  formOpen.value = true;
}

function slotBody() {
  return {
    ...form,
    academicYearId: Number(form.academicYearId),
    sectionId: Number(form.sectionId),
    subjectId: Number(form.subjectId),
    teacherId: Number(form.teacherId),
    startTime: form.startTime.length === 5 ? `${form.startTime}:00` : form.startTime,
    endTime: form.endTime.length === 5 ? `${form.endTime}:00` : form.endTime,
    room: form.room || null,
  };
}

async function save() {
  error.value = "";
  try {
    if (editingId.value) {
      await academicApi.updateSlot(editingId.value, slotBody());
    } else {
      await academicApi.createSlot(slotBody());
    }
    sectionId.value = form.sectionId;
    closeForm();
    await loadSlots();
  } catch (e) {
    error.value = e.message;
  }
}

function slotLabel(slot) {
  const klass = [slot.schoolClassName, slot.sectionName].filter(Boolean).join(" ");
  return `${slot.subjectName} on ${slot.dayOfWeek} ${slot.startTime}${klass ? ` for ${klass}` : ""}`;
}

async function removeSlot(slot) {
  error.value = "";
  try {
    await academicApi.deleteSlot(slot.id);
    await loadSlots();
  } catch (e) {
    error.value = e.message;
  }
}

onMounted(async () => {
  try {
    await loadMeta();
  } catch (e) {
    error.value = e.message;
  }
});
</script>

<template>
  <section class="page">
    <div class="page-head">
      <div>
        <h1>Timetable</h1>
        <p class="sub">Weekly grid by section</p>
      </div>
      <button v-if="canManage" class="btn" type="button" @click="openForm">
        {{ formOpen && !editingId ? "Close" : "Add a slot" }}
      </button>
    </div>
    <p v-if="error" class="banner banner-error">{{ error }}</p>
    <label class="field" style="max-width:280px">
      <span>Section</span>
      <select v-model="sectionId">
        <option disabled value="">Choose</option>
        <option v-for="s in sections" :key="s.id" :value="s.id">{{ s.schoolClassName }} {{ s.name }}</option>
      </select>
    </label>
    <div class="glass card table-wrap">
      <table>
        <thead><tr><th>Day</th><th>Time</th><th>Class</th><th>Subject</th><th>Teacher</th><th>Room</th><th></th></tr></thead>
        <tbody>
          <tr v-for="slot in slots" :key="slot.id">
            <td>{{ slot.dayOfWeek }}</td>
            <td>{{ slot.startTime }}–{{ slot.endTime }}</td>
            <td>{{ slot.schoolClassName }} {{ slot.sectionName }}</td>
            <td>{{ slot.subjectName }}</td>
            <td>{{ slot.teacherName }}</td>
            <td>{{ slot.room }}</td>
            <td>
              <div v-if="canManage" class="row-actions">
                <button
                  class="icon-btn"
                  type="button"
                  :aria-label="`Edit ${slotLabel(slot)}`"
                  title="Edit slot"
                  @click="startEdit(slot)"
                >
                  <Icon name="pen" />
                </button>
                <button
                  class="icon-btn"
                  type="button"
                  :aria-label="`Delete ${slotLabel(slot)}`"
                  title="Delete slot"
                  v-confirm="{ message: `Delete ${slotLabel(slot)}?`, danger: true }"
                  @click="removeSlot(slot)"
                >
                  <Icon name="trash" />
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
      <p v-if="!slots.length" class="empty">Pick a section.</p>
    </div>
    <form
      v-if="canManage && formOpen"
      class="glass card"
      :data-confirm="editingId ? 'Save changes to this timetable slot?' : 'Save this timetable slot?'"
      @submit.prevent="save"
    >
      <h3>{{ editingId ? "Edit slot" : "Add slot" }}</h3>
      <div class="grid grid-2">
        <label class="field"><span>Year</span>
          <select v-model="form.academicYearId" required>
            <option disabled value="">Choose</option>
            <option v-for="y in years" :key="y.id" :value="y.id">{{ y.name }}</option>
          </select>
        </label>
        <label class="field"><span>Section</span>
          <select v-model="form.sectionId" required>
            <option disabled value="">Choose</option>
            <option v-for="s in sections" :key="s.id" :value="s.id">{{ s.schoolClassName }} {{ s.name }}</option>
          </select>
        </label>
        <label class="field"><span>Subject</span>
          <select v-model="form.subjectId" required>
            <option disabled value="">Choose</option>
            <option v-for="s in subjects" :key="s.id" :value="s.id">{{ s.name }}</option>
          </select>
        </label>
        <label class="field"><span>Teacher</span>
          <select v-model="form.teacherId" required>
            <option disabled value="">Choose</option>
            <option v-for="t in teachers" :key="t.id" :value="t.id">{{ t.name }}</option>
          </select>
        </label>
        <label class="field"><span>Day</span>
          <select v-model="form.dayOfWeek"><option v-for="d in days" :key="d">{{ d }}</option></select>
        </label>
        <label class="field"><span>Start</span><input v-model="form.startTime" type="time" required /></label>
        <label class="field"><span>End</span><input v-model="form.endTime" type="time" required /></label>
        <label class="field"><span>Room</span>
          <select v-model="form.room">
            <option value="">None</option>
            <option v-for="r in classrooms" :key="r.id" :value="r.name">
              {{ r.name }}<template v-if="r.building"> · {{ r.building }}</template>
            </option>
          </select>
        </label>
        <p v-if="!classrooms.length" class="sub">Add classrooms on Academics to pick a room here.</p>
      </div>
      <div class="row-actions">
        <button class="btn">{{ editingId ? "Save changes" : "Save slot" }}</button>
        <button class="btn btn-ghost" type="button" @click="closeForm">Cancel</button>
      </div>
    </form>
  </section>
</template>

<style scoped>
.row-actions {
  display: flex;
  align-items: center;
  gap: 0.2rem;
}
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
h3 { margin: 0 0 0.35rem; }
</style>
