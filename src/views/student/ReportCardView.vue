<script setup>
import { computed, onMounted, ref } from "vue";
import { academicApi, peopleApi, reportApi } from "../../api/endpoints";
import { useAuthStore } from "../../stores/auth";
import { useRoute } from "vue-router";
import { useFeedback } from "../../composables/useFeedback";


const auth = useAuthStore();
const route = useRoute();
const exams = ref([]);
const examId = ref("");
const card = ref(null);
const children = ref([]);
const studentId = ref(route.query.studentId || "");
const emptyHint = ref("");
const { error, info } = useFeedback();
const canExport = computed(() => ["HEADMASTER", "SCHOOL_ADMIN", "ACADEMIC_MASTER", "TEACHER"].includes(auth.role));
const isFamily = computed(() => ["STUDENT", "PARENT"].includes(auth.role));
const selectedExam = computed(() => exams.value.find((exam) => String(exam.id) === String(examId.value)));

function isUnpublishedMessage(message) {
  const text = String(message || "").toLowerCase();
  return text.includes("not yet published") || text.includes("no published") || text.includes("no report");
}

function showEmpty(message) {
  emptyHint.value = message;
  info.value = message;
}

onMounted(async () => {
  try {
    if (auth.role === "PARENT") {
      children.value = await peopleApi.myChildren();
      if (!studentId.value && children.value[0]?.studentId) {
        studentId.value = children.value[0].studentId;
      }
    }
    exams.value = await academicApi.exams();
    if (exams.value[0]) {
      examId.value = exams.value[0].id;
      await load();
    } else if (isFamily.value) {
      showEmpty("No report has been published yet.");
    }
  } catch (e) {
    if (isUnpublishedMessage(e.message)) {
      showEmpty("No report has been published yet.");
      return;
    }
    error.value = e.message;
  }
});

async function load() {
  if (!examId.value) return;
  error.value = "";
  emptyHint.value = "";
  try {
    if (auth.role === "STUDENT") {
      card.value = await peopleApi.myReportCard(examId.value);
      return;
    }
    if (!studentId.value) {
      showEmpty(auth.role === "PARENT"
        ? "No report has been published yet."
        : "Pick a student from the parent home or students list.");
      return;
    }
    card.value = await peopleApi.reportCard(studentId.value, examId.value);
  } catch (e) {
    card.value = null;
    if (isUnpublishedMessage(e.message)) {
      showEmpty("No report has been published yet.");
      return;
    }
    error.value = e.message;
  }
}

async function download(kind) {
  try {
    const params = { examId: examId.value };
    if (auth.role !== "STUDENT") params.studentId = route.query.studentId || card.value?.studentId;
    if (kind === "csv") await reportApi.reportCardCsv(params);
    else await reportApi.reportCardPdf(params);
  } catch (e) {
    error.value = e.message;
  }
}

async function downloadTerm() {
  try {
    const exam = selectedExam.value;
    if (!exam?.academicYearId) {
      error.value = "This exam has no academic year, so a term result cannot be exported.";
      return;
    }
    const params = {
      academicYearId: exam.academicYearId,
      academicTermId: exam.academicTermId || undefined,
      format: "pdf",
    };
    if (auth.role !== "STUDENT") params.studentId = route.query.studentId || card.value?.studentId;
    await reportApi.termResult(params);
  } catch (e) {
    error.value = e.message;
  }
}
</script>

<template>
  <section class="page">
    <div class="page-head"><div><h1>Report card</h1><p class="sub">Exam marks and combined term result</p></div></div>
    <label v-if="auth.role === 'PARENT' && children.length > 1" class="field" style="max-width:320px">
      <span>Child</span>
      <select v-model="studentId" @change="load">
        <option v-for="child in children" :key="child.studentId" :value="child.studentId">{{ child.studentName }}</option>
      </select>
    </label>
    <label class="field" style="max-width:320px">
      <span>Exam</span>
      <select v-model="examId" @change="load">
        <option v-for="e in exams" :key="e.id" :value="e.id">{{ e.name }} <template v-if="!e.published">(unpublished)</template></option>
      </select>
    </label>
    <p v-if="!card && emptyHint" class="empty">{{ emptyHint }}</p>
    <article v-if="card" class="glass card">
      <span :class="card.published ? 'chip' : 'chip-warn chip'">{{ card.published ? "Published" : "Not published" }}</span>
      <h2 class="serif">{{ card.studentName }}</h2>
      <p class="sub">{{ card.admissionNo }} · {{ card.className }} {{ card.sectionName }} · {{ card.examName }}</p>
      <table>
        <thead><tr><th>Subject</th><th>Marks</th><th>Max</th><th>Pass</th></tr></thead>
        <tbody>
          <tr v-for="s in card.subjects" :key="s.id">
            <td>{{ s.subjectName }}</td>
            <td>{{ s.marksObtained }}</td>
            <td>{{ s.maxMarks }}</td>
            <td>{{ s.passed ? "Yes" : "No" }}</td>
          </tr>
        </tbody>
      </table>
      <p><strong>{{ card.overallGrade }}</strong> · GPA {{ card.gpa ?? "—" }} · Position {{ card.classPosition ?? "—" }} · {{ card.percentage }}%</p>
      <h3>Term result</h3>
      <p class="sub">Midterm + semi-terminal, then that result + terminal exam. Missing or unpublished papers count as 0.</p>
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
          <tr v-for="row in card.termResults || []" :key="row.subjectId">
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
      <p v-if="!(card.termResults || []).length" class="empty">No term result yet for this year.</p>
      <div class="row-actions">
        <button class="btn btn-ghost" type="button" @click="download('pdf')">Download report card</button>
        <button v-if="canExport" class="btn btn-ghost" type="button" @click="download('csv')">Report card CSV</button>
        <button v-if="selectedExam" class="btn btn-ghost" type="button" @click="downloadTerm">Download combined term scores</button>
      </div>
    </article>
  </section>
</template>
