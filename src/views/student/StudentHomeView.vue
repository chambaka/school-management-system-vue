<script setup>
import { onMounted, ref } from "vue";
import { academicApi, attendanceApi, financeApi, noticeApi, peopleApi } from "../../api/endpoints";
import StudentPhoto from "../../components/StudentPhoto.vue";

const me = ref(null);
const invoices = ref([]);
const notices = ref([]);
const summary = ref(null);
const slots = ref([]);
const error = ref("");

onMounted(async () => {
  try {
    me.value = await peopleApi.studentMe();
    invoices.value = await financeApi.myInvoices();
    notices.value = await noticeApi.list();
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - 7);
    const iso = (d) => d.toISOString().slice(0, 10);
    summary.value = await attendanceApi.mySummary({ start: iso(start), end: iso(end) });
    if (me.value.sectionId) {
      slots.value = await academicApi.timetable({ sectionId: me.value.sectionId });
    }
  } catch (e) {
    error.value = e.message;
  }
});
</script>

<template>
  <section class="page">
    <div class="page-head">
      <div class="home-ident">
        <StudentPhoto v-if="me" :person-id="me.id" :photo-url="me.photoUrl" :name="me.name" size="lg" />
        <div>
          <h1>Good morning, {{ me?.name || "student" }}</h1>
          <p class="sub">{{ me?.schoolClassName }} {{ me?.sectionName }} · {{ me?.admissionNo }}</p>
        </div>
      </div>
    </div>
    <p v-if="error" class="banner banner-error">{{ error }}</p>
    <div class="grid grid-2">
      <article class="glass stat">
        <small>Attendance this week</small>
        <strong>{{ summary ? `${Math.round(summary.attendancePercent)}%` : "—" }}</strong>
      </article>
      <article class="glass stat">
        <small>Open invoices</small>
        <strong>{{ invoices.length }}</strong>
      </article>
    </div>
    <article class="glass card">
      <h3>Timetable</h3>
      <p v-for="s in slots.slice(0, 6)" :key="s.id">{{ s.dayOfWeek }} {{ s.startTime }} · {{ s.subjectName }} · {{ s.schoolClassName }} {{ s.sectionName }}</p>
    </article>
    <article class="glass card">
      <h3>Fees</h3>
      <p v-for="i in invoices" :key="i.id">{{ i.invoiceNumber }} · {{ i.balance }} {{ i.status }}</p>
    </article>
    <article class="glass card">
      <h3>Notices</h3>
      <p v-for="n in notices.slice(0, 4)" :key="n.id">{{ n.title }}</p>
    </article>
  </section>
</template>

<style scoped>
.home-ident {
  display: flex;
  align-items: center;
  gap: 1rem;
}
</style>
