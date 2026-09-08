<script setup>
import { computed, onMounted, reactive, ref } from "vue";
import { academicApi, peopleApi, asList } from "../../api/endpoints";
import Icon from "../../components/Icon.vue";
import { useAuthStore } from "../../stores/auth";

const auth = useAuthStore();
const canManage = ["HEADMASTER", "ACADEMIC_MASTER"].includes(auth.role);

const years = ref([]);
const classes = ref([]);
const sections = ref([]);
const subjects = ref([]);
const classrooms = ref([]);
const teachers = ref([]);
const allocations = ref([]);
const allocOpen = ref(false);
const error = ref("");
const editingClassroomId = ref(null);
const yearForm = reactive({ name: "", startDate: "", endDate: "", currentYear: true });
const classForm = reactive({ academicYearId: "", name: "", code: "", displayOrder: 1 });
const sectionForm = reactive({ schoolClassId: "", name: "A", capacity: 40, classTeacherId: "" });
const subjectForm = reactive({ name: "", code: "" });
const classroomForm = reactive({ name: "", code: "", capacity: "", building: "", notes: "" });
const allocForm = reactive({ teacherId: "", subjectId: "", schoolClassId: "", academicYearId: "", sectionId: "" });
const allocSections = computed(() =>
  sections.value.filter((s) => !allocForm.schoolClassId || String(s.schoolClassId) === String(allocForm.schoolClassId)),
);

function yearName(id) {
  return years.value.find((y) => String(y.id) === String(id))?.name || "";
}

async function loadAllocations() {
  allocations.value = asList(await academicApi.allocations());
}

async function load() {
  try {
    const [yearList, classList, subjectList, classroomList, teacherPage, allocList] = await Promise.all([
      academicApi.years(),
      academicApi.classes(),
      academicApi.subjects(),
      academicApi.classrooms(),
      peopleApi.teachers({ size: 100 }),
      academicApi.allocations(),
    ]);
    years.value = yearList;
    classes.value = classList;
    subjects.value = subjectList;
    classrooms.value = asList(classroomList);
    teachers.value = asList(teacherPage);
    allocations.value = asList(allocList);
    const sectionLists = await Promise.all(classList.map((c) => academicApi.sections(c.id)));
    sections.value = sectionLists.flat();
  } catch (e) {
    error.value = e.message;
  }
}

async function addYear() {
  error.value = "";
  try {
    await academicApi.createYear(yearForm);
    await load();
  } catch (e) {
    error.value = e.message;
  }
}
async function addClass() {
  error.value = "";
  try {
    await academicApi.createClass({ ...classForm, academicYearId: Number(classForm.academicYearId), displayOrder: Number(classForm.displayOrder) });
    await load();
  } catch (e) {
    error.value = e.message;
  }
}
async function addSection() {
  error.value = "";
  try {
    await academicApi.createSection({
      ...sectionForm,
      schoolClassId: Number(sectionForm.schoolClassId),
      classTeacherId: sectionForm.classTeacherId ? Number(sectionForm.classTeacherId) : null,
      capacity: Number(sectionForm.capacity),
    });
    await load();
  } catch (e) {
    error.value = e.message;
  }
}
async function addSubject() {
  error.value = "";
  try {
    await academicApi.createSubject(subjectForm);
    await load();
  } catch (e) {
    error.value = e.message;
  }
}
async function addAlloc() {
  error.value = "";
  try {
    const created = await academicApi.createAllocation({
      teacherId: Number(allocForm.teacherId),
      subjectId: Number(allocForm.subjectId),
      schoolClassId: Number(allocForm.schoolClassId),
      academicYearId: Number(allocForm.academicYearId),
      sectionId: allocForm.sectionId ? Number(allocForm.sectionId) : null,
    });
    if (created?.id) {
      allocations.value = [created, ...asList(allocations.value).filter((row) => row.id !== created.id)];
    }
    allocForm.teacherId = "";
    allocForm.subjectId = "";
    allocForm.schoolClassId = "";
    allocForm.academicYearId = "";
    allocForm.sectionId = "";
    allocOpen.value = false;
    try {
      await loadAllocations();
    } catch (e) {
      error.value = e.message;
    }
  } catch (e) {
    error.value = e.message;
  }
}
async function removeAllocation(item) {
  error.value = "";
  try {
    await academicApi.deleteAllocation(item.id);
    await load();
  } catch (e) {
    error.value = e.message;
  }
}
async function removeClass(item) {
  error.value = "";
  try {
    await academicApi.deleteClass(item.id);
    await load();
  } catch (e) {
    error.value = e.message;
  }
}
async function removeSection(item) {
  error.value = "";
  try {
    await academicApi.deleteSection(item.id);
    await load();
  } catch (e) {
    error.value = e.message;
  }
}
async function removeSubject(item) {
  error.value = "";
  try {
    await academicApi.deleteSubject(item.id);
    await load();
  } catch (e) {
    error.value = e.message;
  }
}

function classroomPayload() {
  return {
    name: classroomForm.name,
    code: classroomForm.code || null,
    capacity: classroomForm.capacity === "" || classroomForm.capacity == null ? null : Number(classroomForm.capacity),
    building: classroomForm.building || null,
    notes: classroomForm.notes || null,
  };
}

function resetClassroomForm() {
  classroomForm.name = "";
  classroomForm.code = "";
  classroomForm.capacity = "";
  classroomForm.building = "";
  classroomForm.notes = "";
  editingClassroomId.value = null;
}

function startEditClassroom(item) {
  editingClassroomId.value = item.id;
  classroomForm.name = item.name || "";
  classroomForm.code = item.code || "";
  classroomForm.capacity = item.capacity ?? "";
  classroomForm.building = item.building || "";
  classroomForm.notes = item.notes || "";
}

async function saveClassroom() {
  error.value = "";
  try {
    if (editingClassroomId.value) {
      await academicApi.updateClassroom(editingClassroomId.value, classroomPayload());
    } else {
      await academicApi.createClassroom(classroomPayload());
    }
    resetClassroomForm();
    await load();
  } catch (e) {
    error.value = e.message;
  }
}

async function removeClassroom(item) {
  error.value = "";
  try {
    await academicApi.deleteClassroom(item.id);
    if (editingClassroomId.value === item.id) {
      resetClassroomForm();
    }
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
        <h1>Academics</h1>
        <p class="sub">Years, classes, sections, subjects, classrooms, and teacher allocations</p>
      </div>
    </div>
    <p v-if="error" class="banner banner-error">{{ error }}</p>
    <div class="grid grid-2">
      <form class="glass card" data-confirm="Add this academic year?" @submit.prevent="addYear">
        <h3>New year</h3>
        <label class="field"><span>Name</span><input v-model="yearForm.name" required placeholder="2026/2027" /></label>
        <label class="field"><span>Start</span><input v-model="yearForm.startDate" type="date" required /></label>
        <label class="field"><span>End</span><input v-model="yearForm.endDate" type="date" required /></label>
        <button class="btn">Add year</button>
        <ul>
          <li v-for="y in years" :key="y.id">{{ y.name }} <span v-if="y.currentYear" class="chip-gold chip">current</span></li>
        </ul>
      </form>
      <form class="glass card" data-confirm="Add this class?" @submit.prevent="addClass">
        <h3>New class</h3>
        <label class="field"><span>Year</span>
          <select v-model="classForm.academicYearId" required>
            <option disabled value="">Choose</option>
            <option v-for="y in years" :key="y.id" :value="y.id">{{ y.name }}</option>
          </select>
        </label>
        <label class="field"><span>Name</span><input v-model="classForm.name" required placeholder="Form 3" /></label>
        <label class="field"><span>Code</span><input v-model="classForm.code" required placeholder="F3" /></label>
        <button class="btn">Add class</button>
        <ul>
          <li v-for="c in classes" :key="c.id" class="row">
            <span>{{ c.name }} · {{ c.code }}</span>
            <button v-if="canManage" type="button" class="btn btn-ghost" v-confirm="{ message: `Delete class ${c.name}?`, danger: true }" @click="removeClass(c)">Delete</button>
          </li>
        </ul>
      </form>
      <form class="glass card" data-confirm="Add this section?" @submit.prevent="addSection">
        <h3>New section</h3>
        <label class="field"><span>Class</span>
          <select v-model="sectionForm.schoolClassId" required>
            <option disabled value="">Choose</option>
            <option v-for="c in classes" :key="c.id" :value="c.id">{{ c.name }}</option>
          </select>
        </label>
        <label class="field"><span>Name</span><input v-model="sectionForm.name" required /></label>
        <button class="btn">Add section</button>
        <ul>
          <li v-for="s in sections" :key="s.id" class="row">
            <span>{{ s.schoolClassName }} {{ s.name }}</span>
            <button v-if="canManage" type="button" class="btn btn-ghost" v-confirm="{ message: `Delete section ${s.schoolClassName} ${s.name}?`, danger: true }" @click="removeSection(s)">Delete</button>
          </li>
        </ul>
      </form>
      <form class="glass card" data-confirm="Add this subject?" @submit.prevent="addSubject">
        <h3>New subject</h3>
        <label class="field"><span>Name</span><input v-model="subjectForm.name" required /></label>
        <label class="field"><span>Code</span><input v-model="subjectForm.code" required /></label>
        <button class="btn">Add subject</button>
        <ul>
          <li v-for="s in subjects" :key="s.id" class="row">
            <span>{{ s.name }} · {{ s.code }}</span>
            <button v-if="canManage" type="button" class="btn btn-ghost" v-confirm="{ message: `Delete subject ${s.name}?`, danger: true }" @click="removeSubject(s)">Delete</button>
          </li>
        </ul>
      </form>
      <form
        class="glass card"
        :data-confirm="editingClassroomId ? 'Save changes to this classroom?' : 'Add this classroom?'"
        @submit.prevent="saveClassroom"
      >
        <h3>{{ editingClassroomId ? "Edit classroom" : "New classroom" }}</h3>
        <label class="field"><span>Name</span><input v-model="classroomForm.name" required placeholder="Lab 1" /></label>
        <label class="field"><span>Code</span><input v-model="classroomForm.code" placeholder="L1" /></label>
        <label class="field"><span>Capacity</span><input v-model="classroomForm.capacity" type="number" min="1" placeholder="40" /></label>
        <label class="field"><span>Building</span><input v-model="classroomForm.building" placeholder="Block A" /></label>
        <label class="field"><span>Notes</span><input v-model="classroomForm.notes" placeholder="Optional" /></label>
        <div class="row-actions">
          <button class="btn">{{ editingClassroomId ? "Save classroom" : "Add classroom" }}</button>
          <button v-if="editingClassroomId" class="btn btn-ghost" type="button" @click="resetClassroomForm">Cancel</button>
        </div>
        <ul>
          <li v-for="r in classrooms" :key="r.id" class="row">
            <span>
              {{ r.name }}
              <template v-if="r.code"> · {{ r.code }}</template>
              <template v-if="r.building"> · {{ r.building }}</template>
              <template v-if="r.capacity"> · {{ r.capacity }} seats</template>
            </span>
            <span v-if="canManage" class="row-actions">
              <button class="icon-btn" type="button" :aria-label="`Edit ${r.name}`" title="Edit classroom" @click="startEditClassroom(r)">
                <Icon name="pen" />
              </button>
              <button type="button" class="btn btn-ghost" v-confirm="{ message: `Delete classroom ${r.name}?`, danger: true }" @click="removeClassroom(r)">Delete</button>
            </span>
          </li>
        </ul>
      </form>
    </div>
    <div v-if="canManage" class="row-actions alloc-actions">
      <button class="btn" type="button" @click="allocOpen = !allocOpen">
        {{ allocOpen ? "Close" : "Allocate teachers" }}
      </button>
    </div>
    <form v-if="allocOpen" class="glass card" data-confirm="Allocate this teacher?" @submit.prevent="addAlloc">
      <h3>Allocate teacher</h3>
      <div class="grid grid-2">
        <label class="field"><span>Teacher</span>
          <select v-model="allocForm.teacherId" required>
            <option disabled value="">Choose</option>
            <option v-for="t in teachers" :key="t.id" :value="t.id">{{ t.name }}</option>
          </select>
        </label>
        <label class="field"><span>Subject</span>
          <select v-model="allocForm.subjectId" required>
            <option disabled value="">Choose</option>
            <option v-for="s in subjects" :key="s.id" :value="s.id">{{ s.name }}</option>
          </select>
        </label>
        <label class="field"><span>Class</span>
          <select v-model="allocForm.schoolClassId" required @change="allocForm.sectionId = ''">
            <option disabled value="">Choose</option>
            <option v-for="c in classes" :key="c.id" :value="c.id">{{ c.name }}</option>
          </select>
        </label>
        <label class="field"><span>Section</span>
          <select v-model="allocForm.sectionId">
            <option value="">Whole class</option>
            <option v-for="s in allocSections" :key="s.id" :value="s.id">{{ s.schoolClassName }} {{ s.name }}</option>
          </select>
        </label>
        <label class="field"><span>Year</span>
          <select v-model="allocForm.academicYearId" required>
            <option disabled value="">Choose</option>
            <option v-for="y in years" :key="y.id" :value="y.id">{{ y.name }}</option>
          </select>
        </label>
      </div>
      <button class="btn">Allocate</button>
    </form>
    <div class="glass card">
      <h3>Teacher allocations</h3>
      <p v-if="!allocations.length" class="empty">No allocations yet.</p>
      <ul v-else>
        <li v-for="a in allocations" :key="a.id" class="row">
          <span>
            {{ a.teacherName }} → {{ a.subjectName }} / {{ a.schoolClassName }}<template v-if="a.sectionName"> {{ a.sectionName }}</template>
            <template v-if="yearName(a.academicYearId)"> · {{ yearName(a.academicYearId) }}</template>
          </span>
          <button
            v-if="canManage"
            type="button"
            class="btn btn-ghost"
            v-confirm="{ message: `Remove ${a.teacherName} from ${a.subjectName}?`, danger: true }"
            @click="removeAllocation(a)"
          >Delete</button>
        </li>
      </ul>
    </div>
  </section>
</template>

<style scoped>
.row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
}
.row .btn {
  flex: 0 0 auto;
  padding: 0.25rem 0.7rem;
  font-size: 0.8rem;
}
.alloc-actions {
  margin: 1.15rem 0 0.85rem;
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
</style>
