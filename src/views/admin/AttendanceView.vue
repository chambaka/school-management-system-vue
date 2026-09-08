<script setup>
import { computed, onMounted, ref } from "vue";
import { academicApi, attendanceApi, peopleApi } from "../../api/endpoints";
import { useAuthStore } from "../../stores/auth";

const auth = useAuthStore();
const canEnter = computed(() => ["ACADEMIC_MASTER", "TEACHER"].includes(auth.role));

const today = new Date().toISOString().slice(0, 10);
const date = ref(today);
const sections = ref([]);
const students = ref([]);
const sectionId = ref("");
const marks = ref({});
const error = ref("");
const ok = ref("");

onMounted(async () => {
  try {
    const classes = await academicApi.classes();
    sections.value = (await Promise.all(classes.map((c) => academicApi.sections(c.id)))).flat();
  } catch (e) {
    error.value = e.message;
  }
});

const roster = computed(() => students.value.filter((s) => !sectionId.value || String(s.sectionId) === String(sectionId.value)));

async function loadStudents() {
  students.value = (await peopleApi.students({ size: 200 })).content || [];
  const existing = sectionId.value
    ? await attendanceApi.studentsDaily({ sectionId: sectionId.value, date: date.value })
    : [];
  marks.value = {};
  for (const s of roster.value) {
    const hit = existing.find((e) => e.studentId === s.id);
    marks.value[s.id] = hit?.status || "PRESENT";
  }
}

async function save() {
  ok.value = "";
  try {
    await attendanceApi.markStudents({
      sectionId: Number(sectionId.value),
      date: date.value,
      entries: roster.value.map((s) => ({ studentId: s.id, status: marks.value[s.id] || "PRESENT" })),
    });
    ok.value = "Attendance saved.";
  } catch (e) {
    error.value = e.message;
  }
}
</script>

<template>
  <section class="page">
    <div class="page-head"><div><h1>Attendance</h1><p class="sub">Mark the register</p></div></div>
    <p v-if="error" class="banner banner-error">{{ error }}</p>
    <p v-if="ok" class="banner banner-ok">{{ ok }}</p>
    <div class="grid grid-2">
      <label class="field"><span>Date</span><input v-model="date" type="date" @change="loadStudents" /></label>
      <label class="field"><span>Section</span>
        <select v-model="sectionId" @change="loadStudents">
          <option disabled value="">Choose</option>
          <option v-for="s in sections" :key="s.id" :value="s.id">{{ s.schoolClassName }} {{ s.name }}</option>
        </select>
      </label>
    </div>
    <div class="glass card">
      <div v-for="s in roster" :key="s.id" class="row">
        <strong>{{ s.name }}</strong>
        <select v-model="marks[s.id]" :disabled="!canEnter">
          <option>PRESENT</option><option>LATE</option><option>ABSENT</option><option>EXCUSED</option>
        </select>
      </div>
      <p v-if="!roster.length" class="empty">Choose a section.</p>
      <button
        v-if="canEnter"
        class="btn"
        type="button"
        :disabled="!sectionId"
        v-confirm="'Save this attendance register?'"
        @click="save"
      >Save register</button>
    </div>
  </section>
</template>

<style scoped>
.row { display: flex; justify-content: space-between; gap: 1rem; align-items: center; padding: 0.55rem 0; border-bottom: 1px solid rgba(255,255,255,.06); }
.row select { background: rgba(4,10,22,.55); color: inherit; border-radius: 10px; padding: 0.4rem; border: 1px solid rgba(255,255,255,.1); }
.btn { margin-top: 1rem; }
</style>
