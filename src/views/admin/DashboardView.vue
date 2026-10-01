<script setup>
import { computed, onMounted, ref } from "vue";
import HomeAlerts from "../../components/HomeAlerts.vue";
import Icon from "../../components/Icon.vue";
import { dashboardApi, notificationApi } from "../../api/endpoints";
import { useAuthStore } from "../../stores/auth";
import { useBrandingStore } from "../../stores/branding";
import { useFeedback } from "../../composables/useFeedback";


const auth = useAuthStore();
const branding = useBrandingStore();
const isAccountant = computed(() => auth.role === "ACCOUNTANT");
const showFinance = computed(() => auth.role !== "ACADEMIC_MASTER");
const stats = ref({
  students: 0, teachers: 0, invoices: 0, notices: 0, exams: 0,
  pendingApprovals: 0, unpublishedExams: 0, absentToday: 0, outstandingFees: 0, tasks: [],
});
const alerts = ref([]);
const { error } = useFeedback();

onMounted(async () => {
  try {
    stats.value = await dashboardApi.snapshot();
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
      <div>
        <p class="kicker">{{ isAccountant ? "Finance home" : "Admin cockpit" }}</p>
        <h1>Good day, {{ auth.user?.name }}</h1>
        <p class="sub">{{ branding.current?.name || "School" }} · live snapshot</p>
      </div>
    </div>
    <div class="grid grid-3">
      <article class="glass stat"><small>Students</small><strong>{{ stats.students }}</strong></article>
      <article v-if="!isAccountant" class="glass stat"><small>Teachers</small><strong>{{ stats.teachers }}</strong></article>
      <article class="glass stat"><small>Invoices</small><strong>{{ stats.invoices }}</strong></article>
      <article class="glass stat"><small>Notices</small><strong>{{ stats.notices }}</strong></article>
      <article v-if="!isAccountant" class="glass stat"><small>Exams</small><strong>{{ stats.exams }}</strong></article>
      <article v-if="!isAccountant" class="glass stat"><small>Pending approvals</small><strong>{{ stats.pendingApprovals }}</strong></article>
      <article v-if="!isAccountant" class="glass stat"><small>Unpublished exams</small><strong>{{ stats.unpublishedExams }}</strong></article>
      <article v-if="!isAccountant" class="glass stat"><small>Absent today</small><strong>{{ stats.absentToday }}</strong></article>
      <article class="glass stat"><small>Fees outstanding</small><strong>{{ stats.outstandingFees }}</strong></article>
    </div>
    <div class="home-actions">
      <router-link v-if="!isAccountant" class="btn" to="/attendance">
        <Icon name="check" />
        Attendance
      </router-link>
      <router-link v-if="!isAccountant" class="btn" to="/exams">
        <Icon name="list" />
        Exams
      </router-link>
      <router-link v-if="!isAccountant" class="btn" to="/timetable">
        <Icon name="calendar" />
        Timetable
      </router-link>
      <router-link v-if="showFinance" class="btn" to="/finance">
        <Icon name="coin" />
        Finance
      </router-link>
    </div>
    <div class="grid grid-2">
      <article class="glass card">
        <div class="card-head">
          <h3>Today’s tasks</h3>
        </div>
        <p v-for="(task, i) in stats.tasks" :key="i">{{ task }}</p>
        <p v-if="!stats.tasks?.length" class="empty">Nothing waiting right now.</p>
      </article>
      <HomeAlerts :alerts="alerts" to="/reports" />
    </div>
  </section>
</template>

<style scoped>
.kicker {
  margin: 0 0 0.25rem;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--primary);
  font-size: 0.7rem;
  font-weight: 800;
}
.home-actions {
  display: flex;
  flex-wrap: nowrap;
  gap: 0.85rem;
  margin: 1.5rem 0 1.35rem;
}
.home-actions .btn {
  flex: 1 1 0;
  min-width: 0;
  text-decoration: none;
  min-height: 2.75rem;
  padding: 0.7rem 0.55rem;
  white-space: nowrap;
}
@media (max-width: 720px) {
  .home-actions {
    gap: 0.5rem;
    margin-top: 1.25rem;
  }
  .home-actions .btn {
    font-size: 0.72rem;
    padding: 0.55rem 0.3rem;
    gap: 0.3rem;
  }
}
</style>
