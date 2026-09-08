<script setup>
import { ref } from "vue";
import { academicApi, peopleApi } from "../../api/endpoints";

const exams = ref([]);
const subjects = ref([]);
const students = ref([]);
const grades = ref([]);
const examId = ref("");
const subjectId = ref("");
const drafts = ref({});
const error = ref("");

async function boot() {
  try {
    exams.value = await academicApi.exams();
    subjects.value = await academicApi.subjects();
    students.value = (await peopleApi.students({ size: 200 })).content || [];
  } catch (e) {
    error.value = e.message;
  }
}
boot();

async function loadGrades() {
  if (!examId.value) return;
  grades.value = await academicApi.grades({ examId: examId.value });
  drafts.value = {};
  for (const g of grades.value) drafts.value[`${g.studentId}-${g.subjectId}`] = g.marksObtained;
}

async function save(student) {
  try {
    await academicApi.saveGrade({
      examId: Number(examId.value),
      studentId: student.id,
      subjectId: Number(subjectId.value),
      marksObtained: Number(drafts.value[`${student.id}-${subjectId.value}`] || 0),
    });
    await loadGrades();
  } catch (e) {
    error.value = e.message;
  }
}
</script>

<template>
  <section class="page">
    <div class="page-head"><div><h1>Grades</h1><p class="sub">Enter marks by exam and subject</p></div></div>
    <p v-if="error" class="banner banner-error">{{ error }}</p>
    <div class="grid grid-2">
      <label class="field"><span>Exam</span>
        <select v-model="examId" @change="loadGrades">
          <option disabled value="">Choose</option>
          <option v-for="e in exams" :key="e.id" :value="e.id">{{ e.name }} · {{ e.schoolClassName }}</option>
        </select>
      </label>
      <label class="field"><span>Subject</span>
        <select v-model="subjectId">
          <option disabled value="">Choose</option>
          <option v-for="s in subjects" :key="s.id" :value="s.id">{{ s.name }}</option>
        </select>
      </label>
    </div>
    <div class="glass card table-wrap">
      <table>
        <thead><tr><th>Student</th><th>Marks</th><th></th></tr></thead>
        <tbody>
          <tr v-for="s in students" :key="s.id">
            <td>{{ s.name }}</td>
            <td><input class="input" type="number" v-model="drafts[`${s.id}-${subjectId}`]" /></td>
            <td><button class="btn btn-ghost" type="button" :disabled="!examId || !subjectId" v-confirm="`Save marks for ${s.name}?`" @click="save(s)">Save</button></td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>
