<script setup>
import { computed, onMounted, ref } from "vue";
import HomeAlerts from "../../components/HomeAlerts.vue";
import StudentPhoto from "../../components/StudentPhoto.vue";
import { academicApi, noticeApi, notificationApi, peopleApi } from "../../api/endpoints";
import { slotLabel, slotsForToday } from "../../utils/schedule";
import { useFeedback } from "../../composables/useFeedback";


const me = ref(null);
const slots = ref([]);
const notices = ref([]);
const alerts = ref([]);
const { error } = useFeedback();

const todaySlots = computed(() => slotsForToday(slots.value));

onMounted(async () => {
  try {
    me.value = await peopleApi.teacherMe();
    slots.value = await academicApi.timetableByTeacher(me.value.id);
    notices.value = await noticeApi.list();
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
          <h1>Habari, {{ me?.name || "teacher" }}</h1>
          <p class="sub">{{ [me?.department || "School", me?.employeeId].filter(Boolean).join(" · ") }}</p>
        </div>
      </div>
    </div>
    <div class="grid grid-3">
      <article class="glass stat"><small>Classes today</small><strong>{{ todaySlots.length }}</strong></article>
      <article class="glass stat"><small>Unread alerts</small><strong>{{ alerts.filter((n) => !n.read).length }}</strong></article>
      <article class="glass stat"><small>Notices</small><strong>{{ notices.length }}</strong></article>
    </div>
    <div class="grid grid-2">
      <article class="glass card">
        <h3>Today’s classes</h3>
        <p v-for="s in todaySlots" :key="s.id">{{ slotLabel(s) }}</p>
        <p v-if="!todaySlots.length" class="empty">No classes scheduled today.</p>
        <div class="row-actions">
          <router-link class="btn" to="/attendance">Mark attendance</router-link>
          <router-link class="btn" to="/grades">Enter grades</router-link>
          <router-link class="btn" to="/assignments">Assignments</router-link>
        </div>
      </article>
      <HomeAlerts :alerts="alerts" to="/alerts" />
    </div>
    <article class="glass card">
      <h3>Notices</h3>
      <p v-for="n in notices.slice(0, 4)" :key="n.id">{{ n.title }}</p>
      <p v-if="!notices.length" class="empty">No notices.</p>
      <router-link class="linkish" to="/messages">Message a parent</router-link>
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
