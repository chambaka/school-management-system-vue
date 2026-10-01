<script setup>
import { computed, onMounted, ref } from "vue";
import HomeAlerts from "../../components/HomeAlerts.vue";
import StudentPhoto from "../../components/StudentPhoto.vue";
import { academicApi, assignmentApi, attendanceApi, financeApi, noticeApi, notificationApi, peopleApi } from "../../api/endpoints";
import { dueSoon, lastDaysRange, slotLabel, slotsForToday } from "../../utils/schedule";
import { useFeedback } from "../../composables/useFeedback";


const me = ref(null);
const invoices = ref([]);
const notices = ref([]);
const alerts = ref([]);
const assignments = ref([]);
const summary = ref(null);
const slots = ref([]);
const { error } = useFeedback();

function alreadySubmitted(assignment) {
  const history = assignment?.mySubmissionHistory || assignment?.my_submission_history;
  if (Array.isArray(history) && history.length) return true;
  return Boolean(assignment?.mySubmission || assignment?.my_submission);
}

const todaySlots = computed(() => slotsForToday(slots.value));
const upcoming = computed(() => dueSoon(assignments.value.filter((assignment) => !alreadySubmitted(assignment))));
const openInvoices = computed(() => invoices.value.filter((i) => i.status !== "PAID" && i.status !== "CANCELLED"));

onMounted(async () => {
  try {
    me.value = await peopleApi.studentMe();
    const range = lastDaysRange();
    [invoices.value, notices.value, summary.value] = await Promise.all([
      financeApi.myInvoices(),
      noticeApi.list(),
      attendanceApi.mySummary(range),
    ]);
    try { assignments.value = await assignmentApi.list(); } catch { assignments.value = []; }
    if (me.value.sectionId) {
      slots.value = await academicApi.timetable({ sectionId: me.value.sectionId });
    }
  } catch (e) {
    error.value = e.message;
  }
  try {
    alerts.value = await notificationApi.inbox();
  } catch {
    alerts.value = [];
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
    <div class="grid grid-3">
      <article class="glass stat">
        <small>Attendance this week</small>
        <strong>{{ summary ? `${Math.round(summary.attendancePercent)}%` : "—" }}</strong>
      </article>
      <router-link class="glass stat" to="/invoices">
        <small>Open invoices</small>
        <strong>{{ openInvoices.length }}</strong>
      </router-link>
      <article class="glass stat">
        <small>Due assignments</small>
        <strong>{{ upcoming.length }}</strong>
      </article>
    </div>
    <div class="grid grid-2">
      <article class="glass card">
        <h3>Today’s timetable</h3>
        <p v-for="s in todaySlots" :key="s.id">{{ slotLabel(s) }}</p>
        <p v-if="!todaySlots.length" class="empty">No classes scheduled today.</p>
      </article>
      <HomeAlerts :alerts="alerts" />
    </div>
    <article class="glass card">
      <h3>Due soon</h3>
      <p v-for="a in upcoming" :key="a.id">{{ a.dueDate }} · {{ a.title }} · {{ a.subjectName }}</p>
      <p v-if="!upcoming.length" class="empty">No upcoming assignments.</p>
      <router-link class="linkish" to="/assignments">All assignments</router-link>
    </article>
    <article class="glass card">
      <h3>Fees</h3>
      <p v-for="i in openInvoices" :key="i.id">{{ i.invoiceNumber }} · {{ i.balance }} {{ i.status }}</p>
      <p v-if="!openInvoices.length" class="empty">No open invoices.</p>
      <router-link class="linkish" to="/invoices">All invoices</router-link>
    </article>
    <article class="glass card">
      <h3>Notices</h3>
      <p v-for="n in notices.slice(0, 4)" :key="n.id">{{ n.title }}</p>
      <p v-if="!notices.length" class="empty">No notices.</p>
    </article>
    <div class="row-actions">
      <router-link class="linkish" to="/report-card">Report card</router-link>
    </div>
  </section>
</template>

<style scoped>
.home-ident {
  display: flex;
  align-items: center;
  gap: 1rem;
}
a.stat {
  color: inherit;
  text-decoration: none;
}
</style>
