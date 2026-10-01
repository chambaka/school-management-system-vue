<script setup>
import { computed, nextTick, onMounted, onUnmounted, reactive, ref, watch } from "vue";
import { academicApi, asList, peopleApi } from "../../api/endpoints";
import Icon from "../../components/Icon.vue";
import ListSearch from "../../components/ListSearch.vue";
import { useAuthStore } from "../../stores/auth";
import { useConfirmStore } from "../../stores/confirm";
import { useListSearch } from "../../utils/listSearch";
import { useFeedback } from "../../composables/useFeedback";
import { teachesSubject } from "../../utils/allocations";

const auth = useAuthStore();
const confirm = useConfirmStore();
const canManage = computed(() => ["HEADMASTER", "ACADEMIC_MASTER"].includes(auth.role));
const canEnter = computed(() => ["HEADMASTER", "ACADEMIC_MASTER", "TEACHER"].includes(auth.role));
const isHead = computed(() => auth.role === "HEADMASTER");

const exams = ref([]);
const years = ref([]);
const yearId = ref("");
const terms = ref([]);
const classes = ref([]);
const subjects = ref([]);
const rooms = ref([]);
const teachers = ref([]);
const myAllocations = ref([]);
const papers = ref([]);
const scheduleReady = ref({});
const gradesReady = ref({});
const seats = ref([]);
const classStudents = ref([]);
const selected = ref(null);
const seatsPaperId = ref("");
const seatsMessage = ref("");
const creating = ref(false);
const editingExamId = ref(null);
const papersOpen = ref(false);
const paperFormOpen = ref(false);
const editingPaperId = ref(null);
const formEl = ref(null);
const papersEl = ref(null);
const { error } = useFeedback();
const EXAM_TYPES = [
  { value: "MIDTERM", label: "Midterm" },
  { value: "SEMI_TERMINAL", label: "Semi-terminal" },
  { value: "TERMINAL", label: "Terminal" },
  { value: "OTHER", label: "Other" },
];
const EXAM_TYPE_FOR_SAVE = {
  MIDTERM: "MIDTERM",
  SEMI_TERMINAL: "SEMI_TERMINAL",
  TERMINAL: "FINAL",
  OTHER: "OTHER",
};

const form = reactive({
  academicYearId: "", academicTermId: "", schoolClassId: "", name: "Midterm",
  assessmentComponent: "MIDTERM", startDate: "", endDate: "",
});
const paper = reactive({
  subjectId: "", maxMarks: 100, passMarks: 40, examDate: "", startTime: "", endTime: "", venue: "", invigilatorId: "",
});

async function loadTerms() {
  if (!form.academicYearId) {
    terms.value = [];
    return;
  }
  [terms.value, classes.value] = await Promise.all([
    academicApi.terms(form.academicYearId),
    academicApi.classes(form.academicYearId),
  ]);
}

function defaultYearId(list = years.value) {
  return list.find((y) => y.currentYear)?.id || list[0]?.id || "";
}

const selectedYear = computed(() => years.value.find((y) => String(y.id) === String(yearId.value)));

function resetForm() {
  editingExamId.value = null;
  form.academicYearId = yearId.value ? String(yearId.value) : String(defaultYearId() || "");
  form.academicTermId = "";
  form.schoolClassId = "";
  form.name = "Midterm";
  form.assessmentComponent = "MIDTERM";
  form.startDate = "";
  form.endDate = "";
}

function closeCreate() {
  if (confirm.open) return;
  creating.value = false;
  editingExamId.value = null;
}

async function openCreate() {
  error.value = "";
  resetForm();
  creating.value = true;
  await loadTerms();
}

async function openEdit(exam) {
  error.value = "";
  editingExamId.value = exam.id;
  form.academicYearId = exam.academicYearId || "";
  form.academicTermId = exam.academicTermId || "";
  form.schoolClassId = exam.schoolClassId || "";
  form.name = exam.name || "";
  form.assessmentComponent = componentFromExam(exam);
  form.startDate = exam.startDate || "";
  form.endDate = exam.endDate || "";
  creating.value = true;
  await loadTerms();
}

async function loadInvigilators() {
  if (["HEADMASTER", "SCHOOL_ADMIN", "ACADEMIC_MASTER"].includes(auth.role)) {
    teachers.value = asList(await peopleApi.teachers({ size: 200 }));
    return;
  }
  const rows = asList(await academicApi.allocations());
  const seen = new Map();
  for (const row of rows) {
    if (row.teacherId != null && !seen.has(row.teacherId)) {
      seen.set(row.teacherId, { id: row.teacherId, name: row.teacherName });
    }
  }
  teachers.value = [...seen.values()];
}

const roomChoices = computed(() => {
  const rows = rooms.value.slice();
  if (paper.venue && !rows.some((room) => room.name === paper.venue)) {
    rows.unshift({ id: `saved-${paper.venue}`, name: paper.venue });
  }
  return rows;
});

async function loadLookups() {
  const [yearList, subjectList, classroomList] = await Promise.all([
    academicApi.years(),
    academicApi.subjects(),
    academicApi.classrooms().catch(() => []),
  ]);
  years.value = yearList;
  subjects.value = subjectList;
  rooms.value = asList(classroomList);
  try {
    await loadInvigilators();
  } catch {
    teachers.value = [];
  }
  try {
    myAllocations.value = asList(await academicApi.myAllocations());
  } catch {
    myAllocations.value = [];
  }
  if (!yearId.value || !years.value.some((y) => String(y.id) === String(yearId.value))) {
    yearId.value = defaultYearId();
  }
}

async function loadExams() {
  if (!yearId.value) {
    exams.value = [];
    classes.value = [];
    return;
  }
  [exams.value, classes.value] = await Promise.all([
    academicApi.exams(yearId.value),
    academicApi.classes(yearId.value),
  ]);
  await Promise.all([markScheduleReady(), markGradesReady()]);
}

function hasPapers(exam) {
  return (exam.subjects || []).length > 0;
}

function noPapersTitle(exam, other) {
  if (!hasPapers(exam)) return "Add a paper before using this";
  return other || undefined;
}

function canLockSchedule(exam) {
  if (typeof exam.hasSchedule === "boolean") return exam.hasSchedule;
  return scheduleReady.value[exam.id] === true;
}

async function markScheduleReady() {
  if (!canManage.value || exams.value.every((exam) => typeof exam.hasSchedule === "boolean")) {
    scheduleReady.value = {};
    return;
  }
  const ready = {};
  await Promise.all(exams.value.map(async (exam) => {
    try {
      const rows = await academicApi.examSubjects(exam.id);
      ready[exam.id] = rows.length > 0 && rows.every((paper) => paper.examDate && paper.startTime);
    } catch {
      ready[exam.id] = false;
    }
  }));
  scheduleReady.value = ready;
}

function canSendForChecking(exam) {
  if (typeof exam.gradesEntered === "boolean") return exam.gradesEntered;
  return gradesReady.value[exam.id] === true;
}

async function markGradesReady() {
  const waiting = exams.value.filter((exam) => exam.approvalStatus === "DRAFT" || exam.approvalStatus === "REJECTED");
  if (!canEnter.value || !waiting.length || waiting.every((exam) => typeof exam.gradesEntered === "boolean")) {
    gradesReady.value = {};
    return;
  }
  const ready = {};
  await Promise.all(waiting.map(async (exam) => {
    try {
      const rows = await academicApi.grades({ examId: exam.id });
      ready[exam.id] = rows.length > 0;
    } catch {
      ready[exam.id] = false;
    }
  }));
  gradesReady.value = ready;
}

async function load() {
  await loadLookups();
  await loadExams();
}

async function onYearChange() {
  try {
    await loadExams();
  } catch (e) {
    error.value = e.message;
  }
}

async function create() {
  error.value = "";
  const allClasses = form.schoolClassId === "ALL";
  const classIds = allClasses ? classes.value.map((row) => row.id) : [form.schoolClassId];
  if (!classIds.length) {
    error.value = "Add a class for this year before creating an exam.";
    return;
  }
  try {
    const body = {
      academicYearId: Number(form.academicYearId),
      academicTermId: form.academicTermId ? Number(form.academicTermId) : null,
      name: form.name,
      examType: EXAM_TYPE_FOR_SAVE[form.assessmentComponent] || "OTHER",
      assessmentComponent: form.assessmentComponent,
      startDate: form.startDate,
      endDate: form.endDate,
    };
    if (editingExamId.value) {
      await academicApi.updateExam(editingExamId.value, { ...body, schoolClassId: Number(form.schoolClassId) });
    } else {
      for (const id of classIds) {
        await academicApi.createExam({ ...body, schoolClassId: Number(id) });
      }
    }
    closeCreate();
    await load();
  } catch (e) {
    error.value = e.message;
    if (allClasses) {
      try {
        await loadExams();
      } catch {
        // Keep the save error on screen.
      }
    }
  }
}

const canEditPapers = computed(() => canEnter.value && selected.value && !selected.value.scheduleLocked);

function teachesPaper(subjectId) {
  if (!selected.value) return false;
  return teachesSubject(myAllocations.value, {
    classId: selected.value.schoolClassId,
    subjectId,
    yearId: selected.value.academicYearId,
  });
}

const paperSubjects = computed(() => {
  if (!selected.value) return [];
  return subjects.value.filter((subject) => teachesPaper(subject.id));
});

const canAddPaper = computed(() => canEditPapers.value && paperSubjects.value.length);

const invigilatorChoices = computed(() => {
  const rows = teachers.value.slice();
  if (paper.invigilatorId && !rows.some((t) => String(t.id) === String(paper.invigilatorId))) {
    const current = papers.value.find((row) => String(row.invigilatorId) === String(paper.invigilatorId));
    rows.unshift({ id: paper.invigilatorId, name: current?.invigilatorName || "Invigilator" });
  }
  return rows;
});

function paperBody() {
  return {
    subjectId: Number(paper.subjectId),
    maxMarks: Number(paper.maxMarks),
    passMarks: Number(paper.passMarks),
    examDate: paper.examDate || null,
    startTime: paper.startTime ? `${paper.startTime}:00` : null,
    endTime: paper.endTime ? `${paper.endTime}:00` : null,
    venue: paper.venue || null,
    invigilatorId: paper.invigilatorId ? Number(paper.invigilatorId) : null,
  };
}

function resetPaper() {
  paper.subjectId = "";
  paper.maxMarks = 100;
  paper.passMarks = 40;
  paper.examDate = "";
  paper.startTime = "";
  paper.endTime = "";
  paper.venue = "";
  paper.invigilatorId = "";
  editingPaperId.value = null;
}

function closePaperForm() {
  if (confirm.open) return;
  paperFormOpen.value = false;
  editingPaperId.value = null;
}

function dismissPapers() {
  if (confirm.open) return;
  paperFormOpen.value = false;
  editingPaperId.value = null;
  papersOpen.value = false;
  selected.value = null;
  papers.value = [];
  seats.value = [];
  classStudents.value = [];
  seatsPaperId.value = "";
  seatsMessage.value = "";
}

function closePapers() {
  if (confirm.open) return;
  if (paperFormOpen.value) {
    closePaperForm();
    return;
  }
  dismissPapers();
}

async function openExam(exam) {
  error.value = "";
  selected.value = exam;
  seats.value = [];
  classStudents.value = [];
  seatsPaperId.value = "";
  seatsMessage.value = "";
  paperFormOpen.value = false;
  resetPaper();
  papersOpen.value = true;
  try {
    papers.value = await academicApi.examSubjects(exam.id);
  } catch (e) {
    error.value = e.message;
  }
}

function openAddPaper() {
  resetPaper();
  paperFormOpen.value = true;
}

function openEditPaper(row) {
  paper.subjectId = row.subjectId;
  paper.maxMarks = row.maxMarks;
  paper.passMarks = row.passMarks;
  paper.examDate = row.examDate || "";
  paper.startTime = row.startTime ? String(row.startTime).slice(0, 5) : "";
  paper.endTime = row.endTime ? String(row.endTime).slice(0, 5) : "";
  paper.venue = row.venue || "";
  paper.invigilatorId = row.invigilatorId || "";
  editingPaperId.value = row.id;
  paperFormOpen.value = true;
}

async function savePaper() {
  if (!paper.invigilatorId) {
    error.value = "Choose an invigilator for this paper.";
    return;
  }
  try {
    if (editingPaperId.value) {
      await academicApi.updateExamSubject(selected.value.id, editingPaperId.value, paperBody());
    } else {
      await academicApi.addExamSubject(selected.value.id, paperBody());
    }
    closePaperForm();
    papers.value = await academicApi.examSubjects(selected.value.id);
    await load();
    selected.value = exams.value.find((e) => e.id === selected.value.id) || selected.value;
  } catch (e) {
    error.value = e.message;
  }
}

async function removePaper(row) {
  try {
    await academicApi.deleteExamSubject(selected.value.id, row.id);
    if (seatsPaperId.value === row.id) {
      seats.value = [];
      classStudents.value = [];
      seatsPaperId.value = "";
      seatsMessage.value = "";
    }
    papers.value = await academicApi.examSubjects(selected.value.id);
    await load();
    selected.value = exams.value.find((e) => e.id === selected.value.id) || selected.value;
  } catch (e) {
    error.value = e.message;
  }
}

async function run(action, id) {
  try {
    await action(id);
    await load();
    if (selected.value?.id === id) {
      selected.value = exams.value.find((e) => e.id === id) || selected.value;
      if (papersOpen.value) papers.value = await academicApi.examSubjects(id);
    }
  } catch (e) {
    error.value = e.message;
  }
}

async function generateSchedule(id) {
  await run(() => academicApi.generateExamSchedule(id), id);
}

async function lockSchedule(id, locked) {
  await run(() => academicApi.lockExamSchedule(id, locked), id);
}

async function removeExam(exam) {
  try {
    await academicApi.deleteExam(exam.id);
    if (selected.value?.id === exam.id) {
      papersOpen.value = false;
      paperFormOpen.value = false;
      selected.value = null;
      papers.value = [];
      seats.value = [];
      classStudents.value = [];
      seatsPaperId.value = "";
      seatsMessage.value = "";
    }
    await load();
  } catch (e) {
    error.value = e.message;
  }
}

function clock(value) {
  return value ? String(value).slice(0, 5) : "";
}

const schedulePapers = computed(() => [...papers.value].sort((a, b) => {
  const date = String(a.examDate || "9999-99-99").localeCompare(String(b.examDate || "9999-99-99"));
  if (date) return date;
  return clock(a.startTime).localeCompare(clock(b.startTime));
}));

const seatedPaper = computed(() => papers.value.find((paper) => paper.id === seatsPaperId.value));

async function loadSeats(paper) {
  error.value = "";
  seatsPaperId.value = paper.id;
  seatsMessage.value = "";
  try {
    seats.value = await academicApi.examSeats(paper.id);
    classStudents.value = [];
    if (!seats.value.length) {
      await showClassInsteadOfSeats(paper);
    }
  } catch (e) {
    seats.value = [];
    classStudents.value = [];
    seatsMessage.value = e.message;
  }
  await nextTick();
  papersEl.value?.querySelector(".seats-block")?.scrollIntoView({ block: "nearest" });
}

async function showClassInsteadOfSeats(paper) {
  const className = selected.value?.schoolClassName || "this class";
  if (!selected.value?.schoolClassId) {
    seatsMessage.value = `No saved seats for ${paper.subjectName}.`;
    return;
  }
  try {
    const rows = asList(await peopleApi.students({ classId: selected.value.schoolClassId, size: 200 }))
      .filter((student) => !student.status || student.status === "ACTIVE");
    classStudents.value = rows;
    seatsMessage.value = rows.length
      ? `${rows.length} active student${rows.length === 1 ? "" : "s"} in ${className}. Seat numbers are saved when you run Schedule.`
      : `No active students in ${className}.`;
  } catch (e) {
    seatsMessage.value = e.message;
  }
}

function componentFromExam(exam) {
  if (EXAM_TYPES.some((row) => row.value === exam?.assessmentComponent)) return exam.assessmentComponent;
  if (exam?.examType === "FINAL") return "TERMINAL";
  if (exam?.examType === "MIDTERM" || exam?.examType === "SEMI_TERMINAL") return exam.examType;
  return "OTHER";
}

function examTypeLabel(exam) {
  const value = componentFromExam(exam);
  return EXAM_TYPES.find((row) => row.value === value)?.label || value;
}

function statusChip(exam) {
  if (exam.published) return "Published";
  return exam.approvalStatus || "DRAFT";
}

function sendForCheckingConfirm(exam) {
  const again = exam.approvalStatus === "REJECTED" ? " again" : "";
  return `Send ${exam.name} for checking${again}? Marks can still be changed on Grades until it is verified.`;
}

const { query, filteredRows: filteredExams } = useListSearch(exams, (exam) => [
  exam.name, examTypeLabel(exam), exam.academicTermName,
  exam.schoolClassName, statusChip(exam),
]);

function onFormKey(event) {
  if (confirm.open) return;
  if (event.key !== "Escape") return;
  if (paperFormOpen.value) closePaperForm();
  else if (papersOpen.value) closePapers();
  else if (creating.value) closeCreate();
}

watch([creating, papersOpen, paperFormOpen], async ([createOpen, listOpen, formOpen]) => {
  document.body.style.overflow = createOpen || listOpen ? "hidden" : "";
  if (!createOpen && !formOpen) return;
  await nextTick();
  const root = formOpen ? papersEl.value : formEl.value;
  root?.querySelector("input:not([disabled]), select:not([disabled])")?.focus();
});

onMounted(async () => {
  window.addEventListener("keydown", onFormKey, true);
  try { await load(); } catch (e) { error.value = e.message; }
});

onUnmounted(() => {
  document.body.style.overflow = "";
  window.removeEventListener("keydown", onFormKey, true);
});
</script>

<template>
  <section class="page">
    <div class="page-head">
      <div>
        <h1>Exams</h1>
        <p class="sub">Exams and papers for the selected year.</p>
      </div>
      <div class="page-tools">
        <label class="year-pick">
          <Icon name="calendar" />
          <select v-model="yearId" aria-label="Academic year" @change="onYearChange">
            <option v-for="y in years" :key="y.id" :value="y.id">
              {{ y.name }}<template v-if="y.currentYear"> · current</template>
            </option>
          </select>
          <Icon name="chevron" />
        </label>
        <ListSearch v-model="query" placeholder="Search exams" />
        <button v-if="canManage" class="btn add-btn" type="button" @click="openCreate">
          <Icon name="plus" /> Create exam
        </button>
      </div>
    </div>
    <p v-if="!filteredExams.length" class="empty">{{ query.trim() ? "No exams match that search." : "No exams for this year yet." }}</p>
    <div v-else class="stack">
      <article class="glass card">
        <div class="card-head">
          <h3>{{ selectedYear?.name || "Exams" }}</h3>
          <span v-if="selectedYear?.currentYear" class="chip">Current year</span>
        </div>
        <div v-for="exam in filteredExams" :key="exam.id" class="exam-row">
            <div class="exam-main">
              <strong>{{ exam.name }}</strong>
              <p class="sub">{{ examTypeLabel(exam) }}</p>
            </div>
            <dl class="exam-meta">
              <div><dt>Term</dt><dd>{{ exam.academicTermName || "—" }}</dd></div>
              <div><dt>Start</dt><dd>{{ exam.startDate || "—" }}</dd></div>
              <div><dt>End</dt><dd>{{ exam.endDate || "—" }}</dd></div>
              <div><dt>Class / grade</dt><dd>{{ exam.schoolClassName || "—" }}</dd></div>
            </dl>
            <div class="exam-status">
              <span :class="exam.published ? 'chip' : 'chip-warn chip'">{{ statusChip(exam) }}</span>
              <span v-if="exam.scheduleLocked" class="chip">Schedule locked</span>
            </div>
            <div class="row-actions">
              <button class="btn btn-ghost" type="button" @click="openExam(exam)">Papers ({{ (exam.subjects || []).length }})</button>
              <span
                v-if="canEnter && (exam.approvalStatus === 'DRAFT' || exam.approvalStatus === 'REJECTED')"
                class="inactive-tip"
                :title="noPapersTitle(exam, canSendForChecking(exam) ? undefined : 'Enter marks on Grades before sending for checking')"
              >
                <button
                  class="btn btn-ghost"
                  type="button"
                  :disabled="!hasPapers(exam) || !canSendForChecking(exam)"
                  v-confirm="sendForCheckingConfirm(exam)"
                  @click="run(academicApi.submitExam, exam.id)"
                >Send for checking</button>
              </span>
              <span v-if="canManage && exam.approvalStatus === 'ENTERED'" class="inactive-tip" :title="noPapersTitle(exam)">
                <button class="btn btn-ghost" type="button" :disabled="!hasPapers(exam)" v-confirm="`Verify ${exam.name}?`" @click="run(academicApi.verifyExam, exam.id)">Verify</button>
              </span>
              <span
                v-if="canManage && ['ENTERED', 'VERIFIED', 'APPROVED', 'PUBLISHED'].includes(exam.approvalStatus)"
                class="inactive-tip"
                :title="noPapersTitle(exam)"
              >
                <button
                  class="btn btn-ghost"
                  type="button"
                  :disabled="!hasPapers(exam)"
                  v-confirm="exam.published ? `Return ${exam.name} to the teacher? Results will be unpublished.` : `Return ${exam.name} to the teacher?`"
                  @click="run((id) => academicApi.rejectExam(id, 'Returned for correction'), exam.id)"
                >Reject</button>
              </span>
              <span v-if="canManage && exam.approvalStatus === 'VERIFIED'" class="inactive-tip" :title="noPapersTitle(exam)">
                <button class="btn btn-ghost" type="button" :disabled="!hasPapers(exam)" v-confirm="`Approve ${exam.name}?`" @click="run(academicApi.approveExam, exam.id)">Approve</button>
              </span>
              <span v-if="canManage && exam.approvalStatus === 'APPROVED' && !exam.published" class="inactive-tip" :title="noPapersTitle(exam)">
                <button class="btn btn-teal" type="button" :disabled="!hasPapers(exam)" v-confirm="`Publish ${exam.name}? Students and parents will see results.`" @click="run((id) => academicApi.publishExam(id, true), exam.id)">Publish</button>
              </span>
              <span v-if="canManage && exam.published" class="inactive-tip" :title="noPapersTitle(exam)">
                <button class="btn btn-ghost" type="button" :disabled="!hasPapers(exam)" v-confirm="`Unpublish ${exam.name}? Students and parents will no longer see results.`" @click="run((id) => academicApi.publishExam(id, false), exam.id)">Unpublish</button>
              </span>
              <span
                v-if="canManage"
                class="inactive-tip"
                :title="noPapersTitle(exam, exam.scheduleLocked ? 'Unlock the exam before scheduling again' : undefined)"
              >
                <button
                  class="btn btn-ghost"
                  type="button"
                  :disabled="!hasPapers(exam) || exam.scheduleLocked"
                  v-confirm="`Auto-schedule papers for ${exam.name}?`"
                  @click="generateSchedule(exam.id)"
                >Schedule</button>
              </span>
              <span
                v-if="canManage && !exam.scheduleLocked"
                class="inactive-tip"
                :title="noPapersTitle(exam, canLockSchedule(exam) ? undefined : 'Schedule the papers before locking')"
              >
                <button
                  class="btn btn-ghost"
                  type="button"
                  :disabled="!hasPapers(exam) || !canLockSchedule(exam)"
                  v-confirm="`Lock the exam schedule?`"
                  @click="lockSchedule(exam.id, true)"
                >Lock</button>
              </span>
              <span v-if="canManage && exam.scheduleLocked" class="inactive-tip" :title="noPapersTitle(exam)">
                <button class="btn btn-ghost" type="button" :disabled="!hasPapers(exam)" v-confirm="`Unlock ${exam.name}? Papers can be changed again.`" @click="lockSchedule(exam.id, false)">Unlock</button>
              </span>
              <button
                v-if="canManage"
                class="icon-btn"
                type="button"
                :aria-label="`Edit ${exam.name}`"
                title="Edit exam"
                @click="openEdit(exam)"
              ><Icon name="pen" /></button>
              <button
                v-if="canManage"
                class="icon-btn"
                type="button"
                :aria-label="`Delete ${exam.name}`"
                title="Delete"
                v-confirm="{ message: `Delete exam ${exam.name}? Unpublish it and remove marks first if needed.`, danger: true }"
                @click="removeExam(exam)"
              ><Icon name="trash" /></button>
            </div>
            <p v-if="exam.approvalStatus === 'REJECTED' && exam.rejectionNote" class="sub">{{ exam.rejectionNote }}</p>
        </div>
      </article>
    </div>
    <Teleport to="body">
      <div
        v-if="papersOpen && selected"
        class="form-scrim"
        role="presentation"
        @click.self="dismissPapers"
      >
        <div
          ref="papersEl"
          class="glass card form-modal papers-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="papers-title"
        >
          <div class="form-head">
            <div>
              <h3 id="papers-title">Papers · {{ selected.name }}</h3>
              <p class="sub">{{ selected.schoolClassName }} · {{ examTypeLabel(selected) }}</p>
            </div>
            <button class="btn btn-ghost" type="button" @click="dismissPapers">Close</button>
          </div>
          <div class="row-actions">
            <button v-if="canAddPaper" class="btn add-btn" type="button" @click="openAddPaper">
              <Icon name="plus" /> Add paper
            </button>
            <p v-else-if="selected.scheduleLocked" class="sub">Schedule is locked. Unlock the exam to change papers.</p>
            <p v-else-if="canEnter && !paperSubjects.length" class="sub">Only the allocated teacher of a subject for this class can add papers.</p>
          </div>
          <p v-if="!papers.length && !paperFormOpen" class="empty">No papers yet. Add the first subject paper.</p>
          <div v-if="papers.length" class="seats-block">
            <h4>Schedule</h4>
            <div class="table-wrap">
              <table>
                <thead>
                  <tr><th>Subject</th><th>Date</th><th>Time</th><th>Room</th><th>Invigilator</th></tr>
                </thead>
                <tbody>
                  <tr v-for="p in schedulePapers" :key="`sched-${p.id}`" :class="{ 'seat-current': seatsPaperId === p.id }">
                    <td>{{ p.subjectName }}</td>
                    <td>{{ p.examDate || "—" }}</td>
                    <td>{{ p.startTime ? `${clock(p.startTime)}–${clock(p.endTime)}` : "—" }}</td>
                    <td>{{ p.venue || "—" }}</td>
                    <td>{{ p.invigilatorName || "—" }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p v-if="schedulePapers.every((p) => !p.examDate)" class="sub">Run Schedule on this exam to fill the date, time, room, and invigilator.</p>
          </div>
          <div v-if="papers.length" class="paper-list">
            <article v-for="p in papers" :key="p.id" class="paper-row">
              <div class="paper-main">
                <strong>{{ p.subjectName }}</strong>
                <p class="sub">
                  Max {{ p.maxMarks }} · Pass {{ p.passMarks }}
                  <template v-if="p.examDate"> · {{ p.examDate }} {{ p.startTime ? String(p.startTime).slice(0, 5) : "" }}</template>
                  <template v-if="p.venue"> · {{ p.venue }}</template>
                  <template v-if="p.invigilatorName"> · {{ p.invigilatorName }}</template>
                </p>
              </div>
              <div class="row-actions">
                <button class="btn btn-ghost" type="button" @click="loadSeats(p)">Seats</button>
                <button
                  v-if="canEditPapers && teachesPaper(p.subjectId)"
                  class="icon-btn"
                  type="button"
                  :aria-label="`Edit ${p.subjectName}`"
                  @click="openEditPaper(p)"
                >
                  <Icon name="pen" />
                </button>
                <button
                  v-if="canEditPapers && teachesPaper(p.subjectId)"
                  class="icon-btn"
                  type="button"
                  :aria-label="`Delete ${p.subjectName}`"
                  title="Delete"
                  v-confirm="{ message: `Delete paper ${p.subjectName}? Remove marks first if needed.`, danger: true }"
                  @click="removePaper(p)"
                >
                  <Icon name="trash" />
                </button>
              </div>
            </article>
          </div>
          <form
            v-if="paperFormOpen"
            class="paper-form"
            :data-confirm="editingPaperId ? 'Save this paper?' : 'Add this exam paper?'"
            @submit.prevent="savePaper"
          >
            <h4>{{ editingPaperId ? "Edit paper" : "Add paper" }}</h4>
            <div class="grid grid-2">
              <label class="field"><span>Subject</span>
                <select v-model="paper.subjectId" required>
                  <option disabled value="">Choose</option>
                  <option v-for="s in paperSubjects" :key="s.id" :value="s.id">{{ s.name }}</option>
                </select>
              </label>
              <label class="field"><span>Max</span><input v-model="paper.maxMarks" type="number" required /></label>
              <label class="field"><span>Pass</span><input v-model="paper.passMarks" type="number" required /></label>
              <label class="field"><span>Date</span><input v-model="paper.examDate" type="date" /></label>
              <label class="field"><span>Start</span><input v-model="paper.startTime" type="time" /></label>
              <label class="field"><span>End</span><input v-model="paper.endTime" type="time" /></label>
              <label class="field"><span>Room</span>
                <select v-model="paper.venue">
                  <option value="">No room</option>
                  <option v-for="r in roomChoices" :key="r.id" :value="r.name">
                    {{ r.name }}<template v-if="r.building"> · {{ r.building }}</template>
                  </option>
                </select>
                <small v-if="!rooms.length" class="sub">Add rooms in Academics → Rooms.</small>
              </label>
              <label class="field"><span>Invigilator</span>
                <select v-model="paper.invigilatorId" required>
                  <option disabled value="">Choose</option>
                  <option v-for="t in invigilatorChoices" :key="t.id" :value="t.id">{{ t.name }}</option>
                </select>
                <small v-if="!invigilatorChoices.length" class="sub">Add a teacher before you can assign an invigilator.</small>
              </label>
            </div>
            <div class="row-actions form-footer">
              <button class="btn btn-ghost" type="button" @click="closePaperForm">Cancel</button>
              <button class="btn" type="submit">{{ editingPaperId ? "Save paper" : "Add paper" }}</button>
            </div>
          </form>
          <div v-if="seatsPaperId" class="seats-block">
            <h4>Seats · {{ seatedPaper?.subjectName || "Paper" }}</h4>
            <p v-if="seatsMessage" class="empty">{{ seatsMessage }}</p>
            <div v-if="!seats.length && classStudents.length" class="table-wrap">
              <table>
                <thead><tr><th>Admission</th><th>Student</th><th>Class</th></tr></thead>
                <tbody>
                  <tr v-for="s in classStudents" :key="s.id">
                    <td>{{ s.admissionNo }}</td>
                    <td>{{ s.name }}</td>
                    <td>{{ s.schoolClassName || "—" }}<template v-if="s.sectionName"> {{ s.sectionName }}</template></td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div v-else-if="seats.length" class="table-wrap">
              <table>
                <thead><tr><th>Seat</th><th>Admission</th><th>Student</th></tr></thead>
                <tbody>
                  <tr v-for="s in seats" :key="s.id">
                    <td>{{ s.seatNumber }}</td>
                    <td>{{ s.admissionNo }}</td>
                    <td>{{ s.studentName }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </Teleport>
    <Teleport to="body">
      <div
        v-if="creating"
        class="form-scrim"
        role="presentation"
        @click.self="closeCreate"
      >
        <form
          ref="formEl"
          class="glass card form-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="exam-form-title"
          :data-confirm="editingExamId ? 'Save changes to this exam?' : form.schoolClassId === 'ALL' ? 'Create this exam for every class in this year?' : 'Create this exam?'"
          @submit.prevent="create"
        >
          <div class="form-head">
            <h3 id="exam-form-title">{{ editingExamId ? "Edit exam" : "Create exam" }}</h3>
            <button class="btn btn-ghost" type="button" @click="closeCreate">Close</button>
          </div>
          <div class="grid grid-2">
            <label class="field"><span>Year</span>
              <select v-model="form.academicYearId" required @change="loadTerms">
                <option disabled value="">Choose</option>
                <option v-for="y in years" :key="y.id" :value="y.id">{{ y.name }}</option>
              </select>
            </label>
            <label class="field"><span>Term</span>
              <select v-model="form.academicTermId">
                <option value="">None</option>
                <option v-for="t in terms" :key="t.id" :value="t.id">{{ t.name }}</option>
              </select>
            </label>
            <label class="field"><span>Class</span>
              <select v-model="form.schoolClassId" required>
                <option disabled value="">Choose</option>
                <option v-if="!editingExamId" value="ALL">All classes</option>
                <option v-for="c in classes" :key="c.id" :value="c.id">{{ c.name }}</option>
              </select>
              <small v-if="form.schoolClassId === 'ALL'" class="sub">Creates this exam for every class in the year. Each class keeps its own papers and marks.</small>
            </label>
            <label class="field"><span>Name</span><input v-model="form.name" required /></label>
            <label class="field"><span>Type</span>
              <select v-model="form.assessmentComponent">
                <option v-for="type in EXAM_TYPES" :key="type.value" :value="type.value">{{ type.label }}</option>
              </select>
            </label>
            <label class="field"><span>Start</span><input v-model="form.startDate" type="date" required /></label>
            <label class="field"><span>End</span><input v-model="form.endDate" type="date" required /></label>
          </div>
          <div class="row-actions form-footer">
            <button class="btn btn-ghost" type="button" @click="closeCreate">Cancel</button>
            <button class="btn" type="submit">{{ editingExamId ? "Save exam" : "Create exam" }}</button>
          </div>
        </form>
      </div>
    </Teleport>
  </section>
</template>

<style scoped>
.stack { display: grid; gap: 1rem; }
.page-tools {
  display: flex;
  align-items: center;
  gap: 0.7rem;
  flex-wrap: wrap;
}
.year-pick {
  position: relative;
  display: inline-flex;
  align-items: center;
  min-height: 2.5rem;
  min-width: 13.5rem;
  padding: 0 2.15rem 0 2.35rem;
  border: 1px solid var(--stroke);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.06);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.08);
}
.year-pick :deep(.ico) {
  position: absolute;
  width: 1rem;
  height: 1rem;
  pointer-events: none;
  color: color-mix(in srgb, var(--gold) 70%, white);
}
.year-pick :deep(.ico:first-child) { left: 0.85rem; }
.year-pick :deep(.ico:last-child) {
  right: 0.75rem;
  color: var(--muted);
}
.year-pick select {
  appearance: none;
  width: 100%;
  margin: 0;
  padding: 0.15rem 0.2rem;
  border: 0;
  background: transparent;
  color: var(--text);
  font: inherit;
  font-size: 0.92rem;
  font-weight: 700;
  outline: none;
  cursor: pointer;
}
.year-pick:focus-within {
  border-color: color-mix(in srgb, var(--gold) 55%, white);
  box-shadow: 0 0 0 4px color-mix(in srgb, var(--gold) 16%, transparent);
}
.card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  margin-bottom: 0.75rem;
}
.card-head h3 { margin: 0; }
.exam-row {
  display: grid;
  gap: 0.75rem;
  padding: 0.9rem 0;
  border-top: 1px solid var(--stroke);
}
.card-head + .exam-row { border-top: 0; padding-top: 0; }
.exam-main strong { font-size: 1.05rem; }
.exam-meta {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(8.5rem, 1fr));
  gap: 0.65rem 1rem;
  margin: 0;
}
.exam-meta dt {
  margin: 0;
  color: var(--muted);
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}
.exam-meta dd { margin: 0.15rem 0 0; }
.exam-status { display: flex; flex-wrap: wrap; gap: 0.4rem; }
.add-btn {
  min-height: 2.5rem;
  padding: 0.55rem 1rem;
  font-size: 0.9rem;
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
  width: min(40rem, 100%);
  margin: auto 0;
}
.form-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
  margin-bottom: 0.7rem;
}
.form-head h3 { margin: 0; }
.form-head .btn {
  flex: 0 0 auto;
  padding: 0.45rem 0.85rem;
  font-size: 0.8rem;
}
.form-footer { margin-top: 1rem; justify-content: flex-end; }
.papers-modal { width: min(46rem, 100%); }
.paper-list { display: grid; gap: 0.65rem; margin-top: 0.85rem; }
.paper-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 0;
  border-top: 1px solid var(--stroke);
}
.paper-row:first-child { border-top: 0; padding-top: 0; }
.paper-main strong { font-size: 1rem; }
.paper-form {
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid var(--stroke);
}
.paper-form h4,
.seats-block h4 { margin: 0 0 0.65rem; }
.seats-block { margin-top: 1rem; }
.seat-current td { background: rgba(245, 196, 81, 0.16); }
.inactive-tip {
  display: inline-flex;
}
.inactive-tip:has(button:disabled) {
  cursor: not-allowed;
}
.inactive-tip button:disabled {
  pointer-events: none;
}
</style>
