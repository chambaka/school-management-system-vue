<script setup>
import { computed, onMounted, reactive, ref } from "vue";
import { academicApi, notificationApi, peopleApi, reportApi, asList } from "../../api/endpoints";
import ListSearch from "../../components/ListSearch.vue";
import { useAuthStore } from "../../stores/auth";
import { useListSearch } from "../../utils/listSearch";
import { useFeedback } from "../../composables/useFeedback";


const auth = useAuthStore();
const exams = ref([]);
const students = ref([]);
const years = ref([]);
const examId = ref("");
const studentId = ref("");
const termYearId = ref("");
const termId = ref("");
const termStudentId = ref("");
const termPreview = ref(null);
const termPreviews = ref([]);
const termLooked = ref(false);
const termTerms = ref([]);
const isAccountant = computed(() => auth.role === "ACCOUNTANT");
const canTerm = computed(() => ["HEADMASTER", "SCHOOL_ADMIN", "ACADEMIC_MASTER", "TEACHER"].includes(auth.role));
const canReportCard = canTerm;
const pageSub = computed(() => (
  isAccountant.value
    ? "Fee defaulters, collections, and enrolment history"
    : "PDF/CSV exports, enrolment history, and alerts"
));
const inbox = ref([]);
const { error, ok } = useFeedback();
const history = ref([]);
const { query, filteredRows: filteredHistory } = useListSearch(history, (row) => [
  row.studentName, row.admissionNo, actionLabel(row.action), row.academicYearName,
  row.schoolClassName, row.sectionName, row.notes,
]);
const historyBusy = ref(false);
const historyShownKey = ref("");
const filters = reactive({ studentId: "", academicYearId: "", action: "" });

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

function historyParams() {
  return {
    studentId: filters.studentId || undefined,
    academicYearId: filters.academicYearId || undefined,
    action: filters.action || undefined,
  };
}

function historyKey() {
  return `${filters.studentId}|${filters.academicYearId}|${filters.action}`;
}

const historyReady = computed(() => !historyBusy.value && historyShownKey.value === historyKey());

onMounted(async () => {
  try {
    const jobs = [
      isAccountant.value ? Promise.resolve([]) : academicApi.exams().catch(() => []),
      isAccountant.value ? Promise.resolve([]) : notificationApi.inbox().catch(() => []),
      academicApi.years().catch(() => []),
    ];
    if (["HEADMASTER", "SCHOOL_ADMIN", "ACADEMIC_MASTER", "TEACHER", "ACCOUNTANT"].includes(auth.role)) {
      jobs.push(peopleApi.students({ size: 200 }));
    }
    const [examRows, notes, yearRows, studentPage] = await Promise.all(jobs);
    exams.value = examRows;
    inbox.value = notes;
    years.value = yearRows || [];
    students.value = studentPage?.content || [];
    await loadHistory();
    const current = years.value.find((y) => y.currentYear) || years.value[0];
    if (current && canTerm.value) {
      termYearId.value = current.id;
      await loadTermYears();
    }
  } catch (e) {
    error.value = e.message;
  }
});

async function loadTermYears() {
  termTerms.value = [];
  termId.value = "";
  if (!termYearId.value) return;
  try {
    termTerms.value = await academicApi.terms(termYearId.value);
    const currentTerm = termTerms.value.find((t) => t.currentTerm);
    if (currentTerm) termId.value = currentTerm.id;
  } catch (e) {
    error.value = e.message;
  }
}

const visibleTermReports = computed(() => (termPreview.value ? [termPreview.value] : termPreviews.value));
const termShownKey = ref("");

function termKey() {
  return `${termYearId.value}|${termId.value}|${termStudentId.value}`;
}

const termReady = computed(() => termLooked.value && termShownKey.value === termKey());

async function loadTermPreview() {
  ok.value = "";
  if (!termYearId.value) {
    error.value = "Pick a year for the term result.";
    return;
  }
  const params = {
    academicYearId: termYearId.value,
    academicTermId: termId.value || undefined,
  };
  try {
    if (!termStudentId.value) {
      termPreview.value = null;
      termPreviews.value = asList(await peopleApi.termReports(params));
    } else {
      termPreviews.value = [];
      termPreview.value = await peopleApi.termReport(termStudentId.value, params);
    }
    termLooked.value = true;
    termShownKey.value = termKey();
  } catch (e) {
    termPreview.value = null;
    termPreviews.value = [];
    termLooked.value = false;
    termShownKey.value = "";
    error.value = e.message;
  }
}

async function downloadTerm(format) {
  ok.value = "";
  if (!termReady.value) {
    error.value = "Show the term result before exporting it.";
    return;
  }
  if (!termYearId.value) {
    error.value = "Pick a year for the term result.";
    return;
  }
  try {
    await reportApi.termResult({
      studentId: termStudentId.value || undefined,
      academicYearId: termYearId.value,
      academicTermId: termId.value || undefined,
      format,
    });
    ok.value = "Download started.";
  } catch (e) {
    error.value = e.message;
  }
}

async function loadHistory() {
  historyBusy.value = true;
  error.value = "";
  try {
    history.value = asList(await peopleApi.enrolments(historyParams()));
    historyShownKey.value = historyKey();
  } catch (e) {
    historyShownKey.value = "";
    error.value = e.message;
  } finally {
    historyBusy.value = false;
  }
}

async function markRead(item) {
  try {
    await notificationApi.markRead(item.id);
    item.read = true;
  } catch (e) {
    error.value = e.message;
  }
}

const exportForm = reactive({ from: "", to: "", start: "", end: "", format: "csv" });
const schoolKind = ref(auth.role === "ACCOUNTANT" ? "defaulters" : "merit");
const schoolRows = ref([]);
const schoolShown = ref("");
const schoolShownKey = ref("");
const card = ref(null);
const cardShownKey = ref("");

function cardKey() {
  return `${examId.value}|${studentId.value}`;
}

function schoolKey() {
  if (schoolKind.value === "merit") return `merit|${examId.value}`;
  if (schoolKind.value === "collections") return `collections|${exportForm.from}|${exportForm.to}`;
  if (schoolKind.value === "attendance") return `attendance|${exportForm.start}|${exportForm.end}`;
  return "defaulters";
}

const cardReady = computed(() => Boolean(card.value) && cardShownKey.value === cardKey());
const schoolReady = computed(() => schoolShown.value !== "" && schoolShownKey.value === schoolKey());

async function showReportCard() {
  ok.value = "";
  if (!examId.value || !studentId.value) {
    error.value = "Pick an exam and a student for the report card.";
    return;
  }
  try {
    card.value = await peopleApi.reportCard(studentId.value, examId.value);
    cardShownKey.value = cardKey();
  } catch (e) {
    card.value = null;
    cardShownKey.value = "";
    error.value = e.message;
  }
}

async function download(kind) {
  ok.value = "";
  if (!cardReady.value) {
    error.value = "Show the report card before exporting it.";
    return;
  }
  try {
    const params = { examId: examId.value, studentId: studentId.value };
    if (kind === "xlsx") await reportApi.reportCardXlsx(params);
    else if (kind === "csv") await reportApi.reportCardCsv(params);
    else await reportApi.reportCardPdf(params);
    ok.value = "Download started.";
  } catch (e) {
    error.value = e.message;
  }
}

function paidAtLabel(value) {
  if (!value) return "—";
  return String(value).replace("T", " ").replace("Z", "").slice(0, 16);
}

async function showSchoolReport() {
  ok.value = "";
  const kind = schoolKind.value;
  if (kind === "merit" && !examId.value) {
    error.value = "Pick an exam for the merit list.";
    return;
  }
  if (kind === "attendance" && (!exportForm.start || !exportForm.end)) {
    error.value = "Pick the attendance dates.";
    return;
  }
  try {
    if (kind === "defaulters") schoolRows.value = asList(await reportApi.defaulterRows());
    else if (kind === "collections") {
      schoolRows.value = asList(await reportApi.collectionRows({
        from: exportForm.from || undefined,
        to: exportForm.to || undefined,
      }));
    } else if (kind === "merit") schoolRows.value = asList(await reportApi.meritRows({ examId: examId.value }));
    else schoolRows.value = asList(await reportApi.attendanceRows({ start: exportForm.start, end: exportForm.end }));
    schoolShown.value = kind;
    schoolShownKey.value = schoolKey();
  } catch (e) {
    schoolRows.value = [];
    schoolShown.value = "";
    schoolShownKey.value = "";
    error.value = e.message;
  }
}

async function downloadPack(kind) {
  ok.value = "";
  if (!schoolReady.value) {
    error.value = "Show the school report before exporting it.";
    return;
  }
  try {
    const format = exportForm.format;
    if (kind === "defaulters") await reportApi.defaulters({ format });
    else if (kind === "collections") await reportApi.collections({ format, from: exportForm.from || undefined, to: exportForm.to || undefined });
    else if (kind === "merit") await reportApi.meritList({ format, examId: examId.value });
    else await reportApi.attendance({ format, start: exportForm.start || undefined, end: exportForm.end || undefined });
    ok.value = "Download started.";
  } catch (e) {
    error.value = e.message;
  }
}

async function downloadHistory(kind) {
  ok.value = "";
  if (!historyReady.value) {
    error.value = "Show the enrolment history before exporting it.";
    return;
  }
  try {
    if (kind === "csv") await reportApi.enrolmentHistoryCsv(historyParams());
    else await reportApi.enrolmentHistoryPdf(historyParams());
    ok.value = "Download started.";
  } catch (e) {
    error.value = e.message;
  }
}
</script>

<template>
  <section class="page">
    <div class="page-head"><div><h1>Reports</h1><p class="sub">{{ pageSub }}</p></div></div>
    <form class="glass card" @submit.prevent="loadHistory">
      <h3>Enrolment history</h3>
      <p class="sub">Promotions, repeats, graduations, and transfers. Placement is the class and year at the time of the action.</p>
      <div class="grid grid-2">
        <label class="field"><span>Student</span>
          <select v-model="filters.studentId" @change="loadHistory">
            <option value="">All students</option>
            <option v-for="s in students" :key="s.id" :value="s.id">{{ s.admissionNo }} · {{ s.name }}</option>
          </select>
        </label>
        <label class="field"><span>Year</span>
          <select v-model="filters.academicYearId" @change="loadHistory">
            <option value="">All years</option>
            <option v-for="y in years" :key="y.id" :value="y.id">{{ y.name }}</option>
          </select>
        </label>
        <label class="field"><span>Action</span>
          <select v-model="filters.action" @change="loadHistory">
            <option value="">All actions</option>
            <option value="PROMOTE">Promoted</option>
            <option value="REPEAT">Repeated</option>
            <option value="GRADUATE">Graduated</option>
            <option value="TRANSFER">Transferred</option>
          </select>
        </label>
      </div>
      <div class="row-actions">
        <button class="btn" type="submit" :disabled="historyBusy">{{ historyBusy ? "Loading…" : "Show" }}</button>
        <button class="btn btn-ghost" type="button" :disabled="!historyReady" title="Show the list first" @click="downloadHistory('pdf')">PDF</button>
        <button class="btn btn-ghost" type="button" :disabled="!historyReady" title="Show the list first" @click="downloadHistory('csv')">CSV / Excel</button>
      </div>
      <ListSearch v-model="query" placeholder="Search history" />
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Student</th>
              <th>Action</th>
              <th>Year</th>
              <th>Class</th>
              <th>Section</th>
              <th>Notes</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in filteredHistory" :key="row.id">
              <td>{{ formatDate(row.effectiveDate) }}</td>
              <td>{{ row.admissionNo }} {{ row.studentName }}</td>
              <td><span class="chip">{{ actionLabel(row.action) }}</span></td>
              <td>{{ row.academicYearName || "—" }}</td>
              <td>{{ row.schoolClassName || "—" }}</td>
              <td>{{ row.sectionName || "—" }}</td>
              <td>{{ row.notes || "—" }}</td>
            </tr>
          </tbody>
        </table>
        <p v-if="!filteredHistory.length && !historyBusy" class="empty">{{ query.trim() ? "No history matches that search." : "No enrolment history for these filters." }}</p>
      </div>
    </form>
    <form v-if="canTerm" class="glass card" @submit.prevent="loadTermPreview">
      <h3>Term result</h3>
      <p class="sub">Combined midterm, semi-terminal, and terminal scores for one student or every active student.</p>
      <div class="grid grid-2">
        <label class="field"><span>Year</span>
          <select v-model="termYearId" required @change="loadTermYears">
            <option disabled value="">Choose</option>
            <option v-for="y in years" :key="y.id" :value="y.id">{{ y.name }}</option>
          </select>
        </label>
        <label class="field"><span>Term</span>
          <select v-model="termId">
            <option value="">Whole year</option>
            <option v-for="t in termTerms" :key="t.id" :value="t.id">{{ t.name }}</option>
          </select>
        </label>
        <label class="field"><span>Student</span>
          <select v-model="termStudentId">
            <option value="">All students</option>
            <option v-for="s in students" :key="s.id" :value="s.id">{{ s.admissionNo }} · {{ s.name }}</option>
          </select>
        </label>
      </div>
      <div class="row-actions">
        <button class="btn" type="submit">Show</button>
        <button class="btn btn-ghost" type="button" :disabled="!termReady" title="Show the result first" @click="downloadTerm('pdf')">PDF</button>
        <button class="btn btn-ghost" type="button" :disabled="!termReady" title="Show the result first" @click="downloadTerm('csv')">CSV</button>
        <button class="btn btn-ghost" type="button" :disabled="!termReady" title="Show the result first" @click="downloadTerm('xlsx')">Excel</button>
      </div>
      <p v-if="!termReady" class="sub">Show the result, then export it.</p>
      <p v-if="termReady && !visibleTermReports.length" class="empty">No students to show.</p>
      <div v-for="report in (termReady ? visibleTermReports : [])" :key="report.studentId" class="table-wrap">
        <p><strong>{{ report.studentName }}</strong> · {{ report.admissionNo }} · {{ report.className || "—" }}</p>
        <p class="sub">Average {{ report.average ?? "—" }} · {{ report.overallGrade || "—" }}</p>
        <table>
          <thead>
            <tr>
              <th>Subject</th>
              <th>Midterm</th>
              <th>Semi exam</th>
              <th>Semi result</th>
              <th>Terminal exam</th>
              <th>Term result</th>
              <th>Grade</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in report.subjects || []" :key="`${report.studentId}-${row.subjectId}`">
              <td>{{ row.subjectName }}</td>
              <td>{{ row.midterm }}</td>
              <td>{{ row.semiTerminalExam }}</td>
              <td>{{ row.semiTerminalResult }}</td>
              <td>{{ row.terminalExam }}</td>
              <td><strong>{{ row.terminalResult }}</strong></td>
              <td>{{ row.letterGrade || "—" }}</td>
            </tr>
          </tbody>
        </table>
        <p v-if="!(report.subjects || []).length" class="empty">No exam components for this year yet.</p>
      </div>
    </form>
    <form v-if="canReportCard" class="glass card" @submit.prevent="showReportCard">
      <h3>Report card export</h3>
      <div class="grid grid-2">
        <label class="field"><span>Exam</span>
          <select v-model="examId" required>
            <option disabled value="">Choose</option>
            <option v-for="e in exams" :key="e.id" :value="e.id">{{ e.name }}</option>
          </select>
        </label>
        <label class="field"><span>Student</span>
          <select v-model="studentId" required>
            <option disabled value="">Choose</option>
            <option v-for="s in students" :key="s.id" :value="s.id">{{ s.name }}</option>
          </select>
        </label>
      </div>
      <div class="row-actions">
        <button class="btn" type="submit">Show</button>
        <button class="btn btn-ghost" type="button" :disabled="!cardReady" title="Show the report card first" @click="download('pdf')">PDF</button>
        <button class="btn btn-ghost" type="button" :disabled="!cardReady" title="Show the report card first" @click="download('csv')">CSV</button>
        <button class="btn btn-ghost" type="button" :disabled="!cardReady" title="Show the report card first" @click="download('xlsx')">Excel</button>
      </div>
      <p v-if="!cardReady" class="sub">Show the report card, then export it.</p>
      <div v-if="cardReady" class="table-wrap">
        <p>
          <strong>{{ card.studentName }}</strong>
          · {{ card.admissionNo }}
          · {{ card.className || "—" }}<template v-if="card.sectionName"> {{ card.sectionName }}</template>
          · {{ card.examName }}
        </p>
        <p class="sub">{{ card.overallGrade || "—" }} · GPA {{ card.gpa ?? "—" }} · Position {{ card.classPosition ?? "—" }} · {{ card.percentage ?? "—" }}% · {{ card.totalObtained ?? "—" }} / {{ card.totalMax ?? "—" }}</p>
        <table>
          <thead>
            <tr>
              <th>Subject</th>
              <th>Marks</th>
              <th>Max</th>
              <th>Pass</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in card.subjects || []" :key="row.id || row.subjectId">
              <td>{{ row.subjectName }}</td>
              <td>{{ row.marksObtained }}</td>
              <td>{{ row.maxMarks }}</td>
              <td>{{ row.passed ? "Yes" : "No" }}</td>
            </tr>
          </tbody>
        </table>
        <p v-if="!(card.subjects || []).length" class="empty">No marks for this exam yet.</p>
      </div>
    </form>
    <form class="glass card" @submit.prevent="showSchoolReport">
      <h3>School reports</h3>
      <div class="grid grid-2">
        <label class="field"><span>Report</span>
          <select v-model="schoolKind">
            <option v-if="!isAccountant" value="merit">Merit list</option>
            <option value="defaulters">Defaulters</option>
            <option value="collections">Collections</option>
            <option v-if="!isAccountant" value="attendance">Attendance</option>
          </select>
        </label>
        <label class="field"><span>Format</span>
          <select v-model="exportForm.format">
            <option value="csv">CSV</option>
            <option value="xlsx">Excel</option>
            <option value="pdf">PDF</option>
          </select>
        </label>
        <label v-if="!isAccountant" class="field"><span>Exam (merit)</span>
          <select v-model="examId">
            <option disabled value="">Choose</option>
            <option v-for="e in exams" :key="e.id" :value="e.id">{{ e.name }}</option>
          </select>
        </label>
        <label class="field"><span>Collections from</span><input v-model="exportForm.from" type="date" /></label>
        <label class="field"><span>Collections to</span><input v-model="exportForm.to" type="date" /></label>
        <label v-if="!isAccountant" class="field"><span>Attendance from</span><input v-model="exportForm.start" type="date" /></label>
        <label v-if="!isAccountant" class="field"><span>Attendance to</span><input v-model="exportForm.end" type="date" /></label>
      </div>
      <div class="row-actions">
        <button class="btn" type="submit">Show</button>
        <button class="btn btn-ghost" type="button" :disabled="!schoolReady" title="Show the report first" @click="downloadPack(schoolKind)">Download</button>
      </div>
      <p v-if="!schoolReady" class="sub">Show the report, then export it.</p>
      <div v-if="schoolReady && schoolShown === 'merit'" class="table-wrap">
        <table>
          <thead>
            <tr><th>Position</th><th>Admission</th><th>Student</th><th>Total</th><th>Percent</th><th>Grade</th></tr>
          </thead>
          <tbody>
            <tr v-for="row in schoolRows" :key="row.studentId">
              <td>{{ row.position }}</td>
              <td>{{ row.admissionNo }}</td>
              <td>{{ row.studentName }}</td>
              <td>{{ row.total }}</td>
              <td>{{ row.percentage }}</td>
              <td>{{ row.grade || "—" }}</td>
            </tr>
          </tbody>
        </table>
        <p v-if="!schoolRows.length" class="empty">No merit rows for this exam.</p>
      </div>
      <div v-else-if="schoolReady && schoolShown === 'defaulters'" class="table-wrap">
        <table>
          <thead>
            <tr><th>Invoice</th><th>Student</th><th>Total</th><th>Paid</th><th>Discount</th><th>Balance</th><th>Status</th></tr>
          </thead>
          <tbody>
            <tr v-for="row in schoolRows" :key="row.invoiceNumber">
              <td>{{ row.invoiceNumber }}</td>
              <td>{{ row.studentName }}</td>
              <td>{{ row.total }}</td>
              <td>{{ row.paid }}</td>
              <td>{{ row.discount }}</td>
              <td>{{ row.balance }}</td>
              <td>{{ row.status }}</td>
            </tr>
          </tbody>
        </table>
        <p v-if="!schoolRows.length" class="empty">No fee balances outstanding.</p>
      </div>
      <div v-else-if="schoolReady && schoolShown === 'collections'" class="table-wrap">
        <table>
          <thead>
            <tr><th>Receipt</th><th>Student</th><th>Amount</th><th>Method</th><th>Paid at</th></tr>
          </thead>
          <tbody>
            <tr v-for="row in schoolRows" :key="row.receiptNumber">
              <td>{{ row.receiptNumber }}</td>
              <td>{{ row.studentName }}</td>
              <td>{{ row.amount }}</td>
              <td>{{ row.method }}</td>
              <td>{{ paidAtLabel(row.paidAt) }}</td>
            </tr>
          </tbody>
        </table>
        <p v-if="!schoolRows.length" class="empty">No collections in this range.</p>
      </div>
      <div v-else-if="schoolReady && schoolShown === 'attendance'" class="table-wrap">
        <table>
          <thead>
            <tr><th>Student</th><th>Present</th><th>Absent</th><th>Late</th><th>Excused</th><th>Total</th><th>Percent</th></tr>
          </thead>
          <tbody>
            <tr v-for="row in schoolRows" :key="row.personId">
              <td>{{ row.name }}</td>
              <td>{{ row.present }}</td>
              <td>{{ row.absent }}</td>
              <td>{{ row.late }}</td>
              <td>{{ row.excused }}</td>
              <td>{{ row.total }}</td>
              <td>{{ row.attendancePercent }}</td>
            </tr>
          </tbody>
        </table>
        <p v-if="!schoolRows.length" class="empty">No attendance in this range.</p>
      </div>
    </form>
    <article v-if="!isAccountant" class="glass card">
      <h3>Alerts</h3>
      <p v-if="!inbox.length" class="empty">No notifications.</p>
      <div v-for="n in inbox" :key="n.id" class="row">
        <div>
          <strong>{{ n.title }}</strong>
          <p class="sub">{{ n.body }} · {{ n.category }}<template v-if="n.createdAt"> · {{ String(n.createdAt).replace("T", " ").replace("Z", "").slice(0, 16) }}</template></p>
        </div>
        <button v-if="!n.read" class="btn btn-ghost" type="button" @click="markRead(n)">Mark read</button>
      </div>
    </article>
  </section>
</template>

<style scoped>
.row { display: flex; justify-content: space-between; gap: 1rem; align-items: center; padding: 0.6rem 0; border-bottom: 1px solid rgba(255,255,255,.06); }
.list-search { margin: 0.85rem 0 0; }
.table-wrap { margin-top: 1rem; overflow-x: auto; }
</style>
