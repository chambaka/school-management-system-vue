<script setup>
import { computed, onMounted, reactive, ref } from "vue";
import { academicApi, attendanceApi, lessonApi, peopleApi, asList } from "../../api/endpoints";
import ListSearch from "../../components/ListSearch.vue";
import { useAuthStore } from "../../stores/auth";
import { useListSearch } from "../../utils/listSearch";
import { useFeedback } from "../../composables/useFeedback";


const auth = useAuthStore();
const canEnter = computed(() => ["ACADEMIC_MASTER", "TEACHER"].includes(auth.role));
const canStaff = computed(() => ["HEADMASTER", "SCHOOL_ADMIN", "ACADEMIC_MASTER"].includes(auth.role));

const today = new Date().toISOString().slice(0, 10);
const tab = ref("students");
const date = ref(today);
const sections = ref([]);
const students = ref([]);
const teachers = ref([]);
const subjects = ref([]);
const sectionId = ref("");
const slotId = ref("");
const slots = ref([]);
const marks = ref({});
const staffMarks = ref({});
const logs = ref([]);
const { error, ok } = useFeedback();
const lesson = reactive({ subjectId: "", topic: "", objectives: "", materials: "", homework: "" });

onMounted(async () => {
  try {
    const classes = await academicApi.classes();
    sections.value = (await Promise.all(classes.map((c) => academicApi.sections(c.id)))).flat();
    subjects.value = await academicApi.subjects();
    if (canStaff.value) {
      teachers.value = asList(await peopleApi.teachers({ size: 200 }));
    }
  } catch (e) {
    error.value = e.message;
  }
});

const roster = computed(() => students.value.filter((s) => !sectionId.value || String(s.sectionId) === String(sectionId.value)));
const { query, filteredRows: visibleRoster } = useListSearch(roster, (s) => [s.name, s.admissionNo]);
const { query: staffQuery, filteredRows: visibleTeachers } = useListSearch(teachers, (t) => [t.name, t.email, t.employeeId]);
const { query: logQuery, filteredRows: visibleLogs } = useListSearch(logs, (l) => [l.subjectName, l.topic, l.teacherName, l.homework]);

async function loadSlots() {
  slots.value = sectionId.value ? await academicApi.timetable({ sectionId: sectionId.value }) : [];
  if (slotId.value && !slots.value.some((s) => String(s.id) === String(slotId.value))) {
    slotId.value = "";
  }
}

async function loadStudents() {
  students.value = (await peopleApi.students({ size: 200 })).content || [];
  await loadSlots();
  const existing = sectionId.value
    ? await attendanceApi.studentsDaily({
      sectionId: sectionId.value,
      date: date.value,
      timetableSlotId: slotId.value || undefined,
    })
    : [];
  marks.value = {};
  for (const s of roster.value) {
    const hit = existing.find((e) => e.studentId === s.id);
    marks.value[s.id] = hit?.status || "PRESENT";
  }
}

async function loadStaff() {
  const existing = await attendanceApi.teachersDaily({ date: date.value });
  staffMarks.value = {};
  for (const t of teachers.value) {
    const hit = existing.find((e) => e.teacherId === t.id);
    staffMarks.value[t.id] = hit?.status || "PRESENT";
  }
}

async function loadLogs() {
  if (!sectionId.value) {
    logs.value = [];
    return;
  }
  logs.value = await lessonApi.list({ sectionId: sectionId.value, date: date.value });
}

async function saveStudents() {
  ok.value = "";
  try {
    await attendanceApi.markStudents({
      sectionId: Number(sectionId.value),
      date: date.value,
      timetableSlotId: slotId.value ? Number(slotId.value) : null,
      entries: roster.value.map((s) => ({ studentId: s.id, status: marks.value[s.id] || "PRESENT" })),
    });
    ok.value = "Student register saved. Absences notify parents by SMS.";
  } catch (e) {
    error.value = e.message;
  }
}

async function saveStaff() {
  ok.value = "";
  try {
    await attendanceApi.markTeachers({
      date: date.value,
      entries: teachers.value.map((t) => ({ teacherId: t.id, status: staffMarks.value[t.id] || "PRESENT" })),
    });
    ok.value = "Staff register saved.";
  } catch (e) {
    error.value = e.message;
  }
}

async function saveLesson() {
  ok.value = "";
  try {
    await lessonApi.create({
      sectionId: Number(sectionId.value),
      subjectId: Number(lesson.subjectId),
      lessonDate: date.value,
      topic: lesson.topic,
      objectives: lesson.objectives || null,
      materials: lesson.materials || null,
      homework: lesson.homework || null,
    });
    lesson.topic = "";
    lesson.objectives = "";
    lesson.materials = "";
    lesson.homework = "";
    await loadLogs();
    ok.value = "Lesson log saved.";
  } catch (e) {
    error.value = e.message;
  }
}

async function onFilters() {
  error.value = "";
  if (tab.value === "students") await loadStudents();
  if (tab.value === "staff") await loadStaff();
  if (tab.value === "lessons") await loadLogs();
}
</script>

<template>
  <section class="page">
    <div class="page-head"><div><h1>Attendance</h1><p class="sub">Registers, SMS absences, lesson logs</p></div></div>
    <div class="row-actions tabs">
      <button class="btn" :class="{ 'btn-ghost': tab !== 'students' }" type="button" @click="tab = 'students'; onFilters()">Students</button>
      <button v-if="canStaff" class="btn" :class="{ 'btn-ghost': tab !== 'staff' }" type="button" @click="tab = 'staff'; onFilters()">Staff</button>
      <button class="btn" :class="{ 'btn-ghost': tab !== 'lessons' }" type="button" @click="tab = 'lessons'; onFilters()">Lesson logs</button>
    </div>
    <div class="grid grid-2">
      <label class="field"><span>Date</span><input v-model="date" type="date" @change="onFilters" /></label>
      <label v-if="tab !== 'staff'" class="field"><span>Section</span>
        <select v-model="sectionId" @change="onFilters">
          <option disabled value="">Choose</option>
          <option v-for="s in sections" :key="s.id" :value="s.id">{{ s.schoolClassName }} {{ s.name }}</option>
        </select>
      </label>
      <label v-if="tab === 'students'" class="field"><span>Lesson</span>
        <select v-model="slotId" @change="onFilters">
          <option value="">Whole day</option>
          <option v-for="s in slots" :key="s.id" :value="s.id">{{ s.dayOfWeek }} {{ s.startTime }} {{ s.subjectName }}</option>
        </select>
      </label>
    </div>
    <div v-if="tab === 'students'" class="glass card">
      <ListSearch v-model="query" placeholder="Search students" />
      <div v-for="s in visibleRoster" :key="s.id" class="row">
        <strong>{{ s.name }}</strong>
        <select v-model="marks[s.id]" :disabled="!canEnter">
          <option>PRESENT</option><option>LATE</option><option>ABSENT</option><option>EXCUSED</option>
        </select>
      </div>
      <p v-if="!visibleRoster.length" class="empty">{{ query.trim() ? "No students match that search." : "Choose a section." }}</p>
      <button
        v-if="canEnter"
        class="btn"
        type="button"
        :disabled="!sectionId"
        v-confirm="'Save this attendance register? Absent students will trigger parent SMS.'"
        @click="saveStudents"
      >Save register</button>
    </div>
    <div v-if="tab === 'staff'" class="glass card">
      <ListSearch v-model="staffQuery" placeholder="Search staff" />
      <div v-for="t in visibleTeachers" :key="t.id" class="row">
        <strong>{{ t.name }}</strong>
        <select v-model="staffMarks[t.id]">
          <option>PRESENT</option><option>LATE</option><option>ABSENT</option><option>EXCUSED</option>
        </select>
      </div>
      <p v-if="!visibleTeachers.length" class="empty">{{ staffQuery.trim() ? "No staff match that search." : "No teachers yet." }}</p>
      <button class="btn" type="button" v-confirm="'Save the staff register?'" @click="saveStaff">Save staff register</button>
    </div>
    <div v-if="tab === 'lessons'">
      <form class="glass card" data-confirm="Save this lesson log?" @submit.prevent="saveLesson">
        <h3>Log a lesson</h3>
        <div class="grid grid-2">
          <label class="field"><span>Subject</span>
            <select v-model="lesson.subjectId" required>
              <option disabled value="">Choose</option>
              <option v-for="s in subjects" :key="s.id" :value="s.id">{{ s.name }}</option>
            </select>
          </label>
          <label class="field"><span>Topic</span><input v-model="lesson.topic" required /></label>
          <label class="field"><span>Objectives</span><input v-model="lesson.objectives" /></label>
          <label class="field"><span>Materials</span><input v-model="lesson.materials" /></label>
          <label class="field"><span>Homework</span><input v-model="lesson.homework" /></label>
        </div>
        <button class="btn" :disabled="!sectionId">Save log</button>
      </form>
      <ListSearch v-model="logQuery" placeholder="Search lesson logs" />
      <article v-for="l in visibleLogs" :key="l.id" class="glass card">
        <h3>{{ l.subjectName }} · {{ l.topic }}</h3>
        <p class="sub">{{ l.teacherName }} · {{ l.lessonDate }}</p>
        <p v-if="l.homework">Homework: {{ l.homework }}</p>
      </article>
      <p v-if="!visibleLogs.length" class="empty">{{ logQuery.trim() ? "No lesson logs match that search." : "No lesson logs for this date." }}</p>
    </div>
  </section>
</template>

<style scoped>
.list-search { width: 100%; margin-bottom: 0.75rem; }
.tabs { margin-bottom: 0.8rem; flex-wrap: wrap; }
.row { display: flex; justify-content: space-between; gap: 1rem; align-items: center; padding: 0.55rem 0; border-bottom: 1px solid rgba(255,255,255,.06); }
.row select { background: rgba(4,10,22,.55); color: inherit; border-radius: 10px; padding: 0.4rem; border: 1px solid rgba(255,255,255,.1); }
.btn { margin-top: 1rem; }
.tabs .btn { margin-top: 0; }
</style>
