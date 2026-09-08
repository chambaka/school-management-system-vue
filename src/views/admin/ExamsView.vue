<script setup>
import { onMounted, reactive, ref } from "vue";
import { academicApi } from "../../api/endpoints";

const exams = ref([]);
const years = ref([]);
const classes = ref([]);
const subjects = ref([]);
const papers = ref([]);
const selected = ref(null);
const error = ref("");
const form = reactive({
  academicYearId: "", schoolClassId: "", name: "Midterm", examType: "MIDTERM", startDate: "", endDate: "",
});
const paper = reactive({ subjectId: "", maxMarks: 100, passMarks: 40, examDate: "" });

async function load() {
  [exams.value, years.value, classes.value, subjects.value] = await Promise.all([
    academicApi.exams(), academicApi.years(), academicApi.classes(), academicApi.subjects(),
  ]);
}

async function create() {
  try {
    await academicApi.createExam({
      ...form,
      academicYearId: Number(form.academicYearId),
      schoolClassId: Number(form.schoolClassId),
    });
    await load();
  } catch (e) {
    error.value = e.message;
  }
}

async function openExam(exam) {
  selected.value = exam;
  papers.value = await academicApi.examSubjects(exam.id);
}

async function addPaper() {
  await academicApi.addExamSubject(selected.value.id, {
    subjectId: Number(paper.subjectId),
    maxMarks: Number(paper.maxMarks),
    passMarks: Number(paper.passMarks),
    examDate: paper.examDate || null,
  });
  papers.value = await academicApi.examSubjects(selected.value.id);
}

async function publish(id) {
  try {
    await academicApi.publishExam(id, true);
    await load();
  } catch (e) {
    error.value = e.message;
  }
}

onMounted(async () => {
  try { await load(); } catch (e) { error.value = e.message; }
});
</script>

<template>
  <section class="page">
    <div class="page-head"><div><h1>Exams</h1><p class="sub">Planner and papers</p></div></div>
    <p v-if="error" class="banner banner-error">{{ error }}</p>
    <form class="glass card" data-confirm="Create this exam?" @submit.prevent="create">
      <div class="grid grid-2">
        <label class="field"><span>Year</span>
          <select v-model="form.academicYearId" required>
            <option disabled value="">Choose</option>
            <option v-for="y in years" :key="y.id" :value="y.id">{{ y.name }}</option>
          </select>
        </label>
        <label class="field"><span>Class</span>
          <select v-model="form.schoolClassId" required>
            <option disabled value="">Choose</option>
            <option v-for="c in classes" :key="c.id" :value="c.id">{{ c.name }}</option>
          </select>
        </label>
        <label class="field"><span>Name</span><input v-model="form.name" required /></label>
        <label class="field"><span>Type</span>
          <select v-model="form.examType">
            <option>QUIZ</option><option>MIDTERM</option><option>FINAL</option><option>ASSIGNMENT</option><option>OTHER</option>
          </select>
        </label>
        <label class="field"><span>Start</span><input v-model="form.startDate" type="date" required /></label>
        <label class="field"><span>End</span><input v-model="form.endDate" type="date" required /></label>
      </div>
      <button class="btn">Create exam</button>
    </form>
    <div class="grid grid-2">
      <article v-for="exam in exams" :key="exam.id" class="glass card">
        <h3>{{ exam.name }}</h3>
        <p class="sub">{{ exam.examType }} · {{ exam.schoolClassName }}</p>
        <span :class="exam.published ? 'chip' : 'chip-warn chip'">{{ exam.published ? "Published" : "Draft" }}</span>
        <div class="row-actions" style="margin-top:0.8rem">
          <button class="btn btn-ghost" @click="openExam(exam)">Papers</button>
          <button v-if="!exam.published" class="btn btn-teal" type="button" v-confirm="`Publish ${exam.name}? Students will see the results.`" @click="publish(exam.id)">Publish</button>
        </div>
      </article>
    </div>
    <form v-if="selected" class="glass card" data-confirm="Add this exam paper?" @submit.prevent="addPaper">
      <h3>Papers · {{ selected.name }}</h3>
      <div class="grid grid-2">
        <label class="field"><span>Subject</span>
          <select v-model="paper.subjectId" required>
            <option disabled value="">Choose</option>
            <option v-for="s in subjects" :key="s.id" :value="s.id">{{ s.name }}</option>
          </select>
        </label>
        <label class="field"><span>Max</span><input v-model="paper.maxMarks" type="number" /></label>
        <label class="field"><span>Pass</span><input v-model="paper.passMarks" type="number" /></label>
        <label class="field"><span>Date</span><input v-model="paper.examDate" type="date" /></label>
      </div>
      <button class="btn">Add paper</button>
      <ul><li v-for="p in papers" :key="p.id">{{ p.subjectName }} · {{ p.maxMarks }}/{{ p.passMarks }}</li></ul>
    </form>
  </section>
</template>
