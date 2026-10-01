<script setup>
import { computed, onMounted, ref } from "vue";
import HomeAlerts from "../../components/HomeAlerts.vue";
import Icon from "../../components/Icon.vue";
import { assignmentApi, attendanceApi, financeApi, noticeApi, notificationApi, peopleApi } from "../../api/endpoints";
import { dueSoon, lastDaysRange } from "../../utils/schedule";
import { useFeedback } from "../../composables/useFeedback";


const children = ref([]);
const notices = ref([]);
const alerts = ref([]);
const assignments = ref([]);
const balances = ref({});
const attendance = ref({});
const { error } = useFeedback();

const upcoming = computed(() => dueSoon(assignments.value));

onMounted(async () => {
  const range = lastDaysRange();
  try {
    children.value = await peopleApi.myChildren();
    notices.value = await noticeApi.list();
    try { assignments.value = await assignmentApi.list(); } catch { assignments.value = []; }
    for (const child of children.value) {
      try {
        balances.value[child.studentId] = await financeApi.studentBalance(child.studentId);
      } catch {
        balances.value[child.studentId] = { outstanding: "—" };
      }
      try {
        attendance.value[child.studentId] = await attendanceApi.studentSummary(child.studentId, range);
      } catch {
        attendance.value[child.studentId] = null;
      }
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
    <div class="page-head"><div><h1>Your children</h1><p class="sub">Today’s snapshot: fees, attendance, and alerts</p></div></div>
    <article v-for="c in children" :key="c.id" class="glass card">
      <h3>{{ c.studentName }}</h3>
      <p class="sub">{{ c.relationship }}</p>
      <p>Outstanding: {{ balances[c.studentId]?.outstanding ?? "—" }} TZS</p>
      <p>
        Attendance this week:
        {{ attendance[c.studentId] ? `${Math.round(attendance[c.studentId].attendancePercent)}%` : "—" }}
      </p>
      <div class="row-actions child-actions">
        <router-link class="btn" :to="`/messages?studentId=${c.studentId}`">
          <Icon name="message" />
          Messages
        </router-link>
        <router-link class="btn" :to="`/report-card?studentId=${c.studentId}`">
          <Icon name="book" />
          Report card
        </router-link>
        <router-link class="btn" to="/assignments">
          <Icon name="list" />
          Assignments
        </router-link>
        <router-link class="btn" to="/finance">
          <Icon name="coin" />
          Fee ledger
        </router-link>
      </div>
    </article>
    <div class="grid grid-2">
      <article class="glass card">
        <h3>Due soon</h3>
        <p v-for="a in upcoming" :key="a.id">{{ a.dueDate }} · {{ a.title }} · {{ a.subjectName }}</p>
        <p v-if="!upcoming.length" class="empty">No upcoming assignments.</p>
      </article>
      <HomeAlerts :alerts="alerts" />
    </div>
    <article class="glass card">
      <h3>Notices</h3>
      <p v-for="n in notices" :key="n.id">{{ n.title }}</p>
      <p v-if="!notices.length" class="empty">No notices.</p>
    </article>
  </section>
</template>

<style scoped>
.child-actions {
  margin-top: 0.85rem;
}
.child-actions .btn {
  text-decoration: none;
  min-height: 2.75rem;
}
</style>
