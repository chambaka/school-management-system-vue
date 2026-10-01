<script setup>
import { computed, ref } from "vue";
import { academicApi, asList } from "../../api/endpoints";
import Icon from "../../components/Icon.vue";
import ListSearch from "../../components/ListSearch.vue";
import { useListSearch } from "../../utils/listSearch";
import { useFeedback } from "../../composables/useFeedback";
import { useConfirmStore } from "../../stores/confirm";
import { teachesSubject } from "../../utils/allocations";


const exams = ref([]);
const subjects = ref([]);
const myAllocations = ref([]);
const years = ref([]);
const terms = ref([]);
const classes = ref([]);
const examId = ref("");
const subjectId = ref("");
const grid = ref(null);
const gridRows = computed(() => grid.value?.rows || []);
const { query, filteredRows: visibleGridRows } = useListSearch(gridRows, (row) => [
  row.studentName, row.admissionNo, row.letterGrade,
]);
const drafts = ref({});
const termForm = ref({ academicYearId: "", academicTermId: "", schoolClassId: "", subjectId: "" });
const termRows = ref([]);
const { query: termQuery, filteredRows: visibleTermRows } = useListSearch(termRows, (row) => [
  row.studentName, row.admissionNo, row.letterGrade,
]);
const termLoaded = ref(false);
const termOpen = ref(false);
const { error, ok } = useFeedback();

const selectedExam = computed(() => exams.value.find((exam) => String(exam.id) === String(examId.value)));
const marksFrozen = computed(() => {
  if (grid.value && typeof grid.value.marksEditable === "boolean") {
    return !grid.value.marksEditable;
  }
  const status = selectedExam.value?.approvalStatus;
  return status === "VERIFIED" || status === "APPROVED" || status === "PUBLISHED";
});

const canEnterMarks = computed(() => {
  const exam = selectedExam.value;
  if (!exam || !subjectId.value) return false;
  return teachesSubject(myAllocations.value, {
    classId: exam.schoolClassId,
    subjectId: subjectId.value,
    yearId: exam.academicYearId,
  });
});

const marksLocked = computed(() => marksFrozen.value || !canEnterMarks.value);

const markSubjects = computed(() => {
  const exam = selectedExam.value;
  if (!exam || !myAllocations.value.length) return subjects.value;
  return subjects.value.filter((subject) => teachesSubject(myAllocations.value, {
    classId: exam.schoolClassId,
    subjectId: subject.id,
    yearId: exam.academicYearId,
  }));
});

const termSummary = computed(() => {
  const year = years.value.find((item) => item.id === termForm.value.academicYearId);
  const term = terms.value.find((item) => item.id === termForm.value.academicTermId);
  const schoolClass = classes.value.find((item) => item.id === termForm.value.schoolClassId);
  const subject = subjects.value.find((item) => item.id === termForm.value.subjectId);
  return [year?.name, term?.name || "Whole year", schoolClass?.name, subject?.name].filter(Boolean).join(" · ");
});

async function boot() {
  try {
    const [examRows, subjectRows, yearRows, allocationRows] = await Promise.all([
      academicApi.exams(),
      academicApi.subjects(),
      academicApi.years().catch(() => []),
      academicApi.myAllocations().catch(() => []),
    ]);
    exams.value = examRows;
    subjects.value = subjectRows;
    years.value = yearRows || [];
    myAllocations.value = asList(allocationRows);
    const current = years.value.find((y) => y.currentYear) || years.value[0];
    if (current) {
      termForm.value.academicYearId = current.id;
      await onYearChange();
    }
  } catch (e) {
    error.value = e.message;
  }
}
boot();

async function onYearChange() {
  terms.value = [];
  classes.value = [];
  termForm.value.academicTermId = "";
  termForm.value.schoolClassId = "";
  if (!termForm.value.academicYearId) return;
  try {
    const [termRows, classRows] = await Promise.all([
      academicApi.terms(termForm.value.academicYearId).catch(() => []),
      academicApi.classes(termForm.value.academicYearId).catch(() => []),
    ]);
    terms.value = termRows || [];
    classes.value = classRows || [];
    const currentTerm = terms.value.find((t) => t.currentTerm);
    if (currentTerm) termForm.value.academicTermId = currentTerm.id;
  } catch (e) {
    error.value = e.message;
  }
}

async function loadGrid() {
  ok.value = "";
  if (!examId.value || !subjectId.value) return;
  try {
    grid.value = await academicApi.gradeGrid({ examId: examId.value, subjectId: subjectId.value });
    drafts.value = {};
    for (const row of grid.value.rows || []) {
      drafts.value[row.studentId] = row.marksObtained ?? "";
    }
  } catch (e) {
    error.value = e.message;
  }
}

async function saveAll() {
  ok.value = "";
  if (marksFrozen.value) {
    error.value = "Marks are frozen after verification. Reject the exam to unlock them.";
    return;
  }
  if (!canEnterMarks.value) {
    error.value = "Only the allocated teacher of this subject for this class can submit marks.";
    return;
  }
  try {
    const entries = (grid.value?.rows || [])
      .filter((row) => drafts.value[row.studentId] !== "" && drafts.value[row.studentId] != null)
      .map((row) => ({
        studentId: row.studentId,
        marksObtained: Number(drafts.value[row.studentId]),
      }));
    if (!entries.length) {
      error.value = "Enter at least one mark.";
      return;
    }
    await academicApi.saveGradesBulk({
      examId: Number(examId.value),
      subjectId: Number(subjectId.value),
      entries,
    });
    await loadGrid();
    ok.value = "Marks saved. Positions and averages updated.";
  } catch (e) {
    error.value = e.message;
  }
}

async function downloadTemplate() {
  ok.value = "";
  if (!examId.value || !subjectId.value) {
    error.value = "Pick an exam and subject before downloading the template.";
    return;
  }
  try {
    await academicApi.gradeTemplate({ examId: examId.value, subjectId: subjectId.value });
  } catch (e) {
    error.value = e.message;
  }
}

async function importExcel(event) {
  const input = event.target;
  const file = input.files?.[0];
  input.value = "";
  ok.value = "";
  if (!file) return;
  if (!examId.value || !subjectId.value) {
    error.value = "Pick an exam and subject before importing.";
    return;
  }
  if (marksFrozen.value) {
    error.value = "Marks are frozen after verification. Reject the exam to unlock them.";
    return;
  }
  if (!canEnterMarks.value) {
    error.value = "Only the allocated teacher of this subject for this class can submit marks.";
    return;
  }
  const confirmed = await useConfirmStore().ask(
    "Import marks from this Excel file? Marks in the file replace marks already saved for those students."
  );
  if (!confirmed) return;
  try {
    const result = await academicApi.importGrades(examId.value, subjectId.value, file);
    if (result?.problems?.length) {
      error.value = result.problems.join(" ");
      return;
    }
    await loadGrid();
    const saved = result?.saved ?? 0;
    ok.value = saved === 1 ? "Imported 1 mark." : `Imported ${saved} marks.`;
  } catch (e) {
    error.value = e.message;
  }
}

async function removeGrade(row) {
  ok.value = "";
  if (marksFrozen.value) {
    error.value = "Marks are frozen after verification. Reject the exam to unlock them.";
    return;
  }
  if (!canEnterMarks.value) {
    error.value = "Only the allocated teacher of this subject for this class can submit marks.";
    return;
  }
  try {
    await academicApi.deleteGrade({
      examId: examId.value,
      studentId: row.studentId,
      subjectId: subjectId.value,
    });
    await loadGrid();
    ok.value = `Removed marks for ${row.studentName}.`;
  } catch (e) {
    error.value = e.message;
  }
}

function mark(value) {
  return value == null || value === "" ? "—" : value;
}

function openTermResults() {
  termOpen.value = true;
}

function closeTermResults() {
  termOpen.value = false;
}

async function loadTermResults() {
  ok.value = "";
  if (!termForm.value.academicYearId || !termForm.value.schoolClassId || !termForm.value.subjectId) {
    error.value = "Pick a year, class, and subject for the term result.";
    return;
  }
  try {
    termRows.value = await academicApi.classTermResults({
      academicYearId: termForm.value.academicYearId,
      academicTermId: termForm.value.academicTermId || undefined,
      schoolClassId: termForm.value.schoolClassId,
      subjectId: termForm.value.subjectId,
    });
    termLoaded.value = true;
    termOpen.value = false;
  } catch (e) {
    termRows.value = [];
    termLoaded.value = false;
    error.value = e.message;
  }
}
</script>

<template>
  <section class="page">
    <div class="page-head">
      <div><h1>Grades</h1><p class="sub">Exam marks</p></div>
      <button class="btn" type="button" @click="openTermResults">Term Results</button>
    </div>
    <div class="grid grid-2">
      <label class="field"><span>Exam</span>
        <select v-model="examId" @change="loadGrid">
          <option disabled value="">Choose</option>
          <option v-for="e in exams" :key="e.id" :value="e.id">{{ e.name }} · {{ e.schoolClassName }} · {{ e.approvalStatus }}</option>
        </select>
      </label>
      <label class="field"><span>Subject</span>
        <select v-model="subjectId" @change="loadGrid">
          <option disabled value="">Choose</option>
          <option v-for="s in markSubjects" :key="s.id" :value="s.id">{{ s.name }}</option>
        </select>
      </label>
    </div>
    <p v-if="grid" class="sub">Average {{ grid.subjectAverage ?? "—" }} · Max {{ grid.maxMarks }} · Pass {{ grid.passMarks }}</p>
    <p v-if="grid && marksFrozen" class="sub freeze-note">Marks are frozen after verification. Reject the exam on Exams to unlock them.</p>
    <p v-else-if="grid && !canEnterMarks" class="sub freeze-note">Only the allocated teacher of this subject for this class can submit marks.</p>
    <div class="glass card table-wrap">
      <ListSearch v-if="grid" v-model="query" placeholder="Search students" />
      <table>
        <thead><tr><th>Adm</th><th>Student</th><th>Marks</th><th>Grade</th><th>Pos</th><th></th></tr></thead>
        <tbody>
          <tr v-for="row in visibleGridRows" :key="row.studentId">
            <td>{{ row.admissionNo }}</td>
            <td>{{ row.studentName }}</td>
            <td>
              <span v-if="marksLocked" class="mark-label">{{ mark(row.marksObtained) }}</span>
              <input v-else class="input" type="number" v-model="drafts[row.studentId]" />
            </td>
            <td>{{ row.letterGrade || "—" }}</td>
            <td>{{ row.classPosition || "—" }}</td>
            <td class="grade-actions">
              <button
                v-if="row.marksObtained != null && !marksLocked"
                class="icon-btn"
                type="button"
                :aria-label="`Delete marks for ${row.studentName}`"
                v-confirm="{ message: `Delete marks for ${row.studentName}?`, danger: true }"
                @click="removeGrade(row)"
              >
                <Icon name="trash" />
              </button>
            </td>
          </tr>
        </tbody>
      </table>
      <p v-if="!grid" class="empty">Pick an exam and subject.</p>
      <p v-else-if="!visibleGridRows.length" class="empty">No students match that search.</p>
      <div class="row-actions">
        <button class="btn btn-ghost" type="button" :disabled="!grid" @click="downloadTemplate">Download Excel template</button>
        <label class="btn btn-ghost file-btn" :class="{ 'is-disabled': !grid || marksLocked }">
          Import Excel
          <input
            type="file"
            accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            :disabled="!grid || marksLocked"
            @change="importExcel"
          />
        </label>
        <button class="btn" type="button" :disabled="!grid || marksLocked" v-confirm="'Save this marks grid?'" @click="saveAll">Save grid</button>
      </div>
      <p class="sub">The template lists this class. Fill the Marks column, then import. Blank cells stay as they are.</p>
    </div>
    <article v-if="termLoaded" class="glass card term-results">
      <h3>Term Results</h3>
      <p class="sub">{{ termSummary }}</p>
      <ListSearch v-model="termQuery" placeholder="Search students" />
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Adm</th>
              <th>Student</th>
              <th>Midterm</th>
              <th>Semi exam</th>
              <th>Semi result</th>
              <th>Terminal exam</th>
              <th>Term result</th>
              <th>Grade</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in visibleTermRows" :key="row.studentId">
              <td>{{ row.admissionNo || "—" }}</td>
              <td>{{ row.studentName }}</td>
              <td>{{ mark(row.midterm) }}</td>
              <td>{{ mark(row.semiTerminalExam) }}</td>
              <td>{{ mark(row.semiTerminalResult) }}</td>
              <td>{{ mark(row.terminalExam) }}</td>
              <td><strong>{{ mark(row.terminalResult) }}</strong></td>
              <td>{{ row.letterGrade || "—" }}</td>
            </tr>
          </tbody>
        </table>
        <p v-if="!visibleTermRows.length" class="empty">{{ termQuery.trim() ? "No students match that search." : "No students in this class." }}</p>
      </div>
    </article>
    <Teleport to="body">
      <div v-if="termOpen" class="form-scrim" role="presentation" @click.self="closeTermResults">
        <div class="glass card form-modal" role="dialog" aria-modal="true" aria-labelledby="term-results-title">
          <div class="form-head">
            <div>
              <h3 id="term-results-title">Term Results</h3>
              <p class="sub">Combined score: 10% midterm + 90% semi-terminal, then 50% of that + 50% terminal. An exam not yet taken is left out. Weights can be changed on Academics.</p>
            </div>
            <button class="btn btn-ghost" type="button" @click="closeTermResults">Close</button>
          </div>
          <div class="grid grid-2">
            <label class="field"><span>Year</span>
              <select v-model="termForm.academicYearId" @change="onYearChange">
                <option disabled value="">Choose</option>
                <option v-for="y in years" :key="y.id" :value="y.id">{{ y.name }}</option>
              </select>
            </label>
            <label class="field"><span>Term</span>
              <select v-model="termForm.academicTermId">
                <option value="">Whole year</option>
                <option v-for="t in terms" :key="t.id" :value="t.id">{{ t.name }}</option>
              </select>
            </label>
            <label class="field"><span>Class</span>
              <select v-model="termForm.schoolClassId">
                <option disabled value="">Choose</option>
                <option v-for="c in classes" :key="c.id" :value="c.id">{{ c.name }}</option>
              </select>
            </label>
            <label class="field"><span>Subject</span>
              <select v-model="termForm.subjectId">
                <option disabled value="">Choose</option>
                <option v-for="s in subjects" :key="s.id" :value="s.id">{{ s.name }}</option>
              </select>
            </label>
          </div>
          <div class="row-actions form-footer">
            <button class="btn" type="button" @click="loadTermResults">Term Results</button>
          </div>
        </div>
      </div>
    </Teleport>
  </section>
</template>

<style scoped>
.term-results { margin-top: 1.75rem; }
.freeze-note { color: var(--fair); font-weight: 700; }
.mark-label {
  display: inline-block;
  min-width: 2.5rem;
  font-weight: 800;
  color: var(--text);
}
.list-search { margin-bottom: 0.75rem; width: min(22rem, 100%); }
.grade-actions { width: 2.5rem; text-align: right; }
.file-btn { position: relative; overflow: hidden; }
.file-btn input {
  position: absolute;
  inset: 0;
  opacity: 0;
  cursor: pointer;
}
.file-btn.is-disabled { opacity: 0.5; pointer-events: none; }
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
.form-modal { width: min(40rem, 100%); margin: auto 0; }
.form-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
  margin-bottom: 0.85rem;
}
.form-head .btn { flex: 0 0 auto; padding: 0.45rem 0.85rem; font-size: 0.8rem; }
.form-footer { margin-top: 0.85rem; }
</style>
