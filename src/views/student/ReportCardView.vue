<script setup>
import { onMounted, ref } from "vue";
import { useRoute } from "vue-router";
import { academicApi, peopleApi } from "../../api/endpoints";
import { useAuthStore } from "../../stores/auth";

const auth = useAuthStore();
const route = useRoute();
const exams = ref([]);
const examId = ref("");
const card = ref(null);
const error = ref("");

onMounted(async () => {
  try {
    exams.value = await academicApi.exams();
    if (exams.value[0]) {
      examId.value = exams.value[0].id;
      await load();
    }
  } catch (e) {
    error.value = e.message;
  }
});

async function load() {
  if (!examId.value) return;
  try {
    if (auth.role === "STUDENT") {
      card.value = await peopleApi.myReportCard(examId.value);
    } else {
      const studentId = route.query.studentId;
      if (!studentId) {
        error.value = "Pick a student from the parent home or students list.";
        return;
      }
      card.value = await peopleApi.reportCard(studentId, examId.value);
    }
  } catch (e) {
    error.value = e.message;
  }
}
</script>

<template>
  <section class="page">
    <div class="page-head"><div><h1>Report card</h1><p class="sub">Published exam results</p></div></div>
    <p v-if="error" class="banner banner-error">{{ error }}</p>
    <label class="field" style="max-width:320px">
      <span>Exam</span>
      <select v-model="examId" @change="load">
        <option v-for="e in exams" :key="e.id" :value="e.id">{{ e.name }}</option>
      </select>
    </label>
    <article v-if="card" class="glass card">
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
      <p><strong>{{ card.overallGrade }}</strong> · {{ card.percentage }}% · {{ card.totalObtained }}/{{ card.totalMax }}</p>
    </article>
  </section>
</template>
