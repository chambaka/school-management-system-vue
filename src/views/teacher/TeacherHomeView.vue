<script setup>
import { onMounted, ref } from "vue";
import { academicApi, noticeApi, peopleApi } from "../../api/endpoints";
import StudentPhoto from "../../components/StudentPhoto.vue";

const me = ref(null);
const slots = ref([]);
const notices = ref([]);
const error = ref("");

onMounted(async () => {
  try {
    me.value = await peopleApi.teacherMe();
    slots.value = await academicApi.timetableByTeacher(me.value.id);
    notices.value = await noticeApi.list();
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
          <h1>Habari, {{ me?.name || "teacher" }}</h1>
          <p class="sub">{{ me?.department || "School" }} · {{ me?.employeeId }}</p>
        </div>
      </div>
    </div>
    <p v-if="error" class="banner banner-error">{{ error }}</p>
    <div class="grid grid-2">
      <article class="glass card">
        <h3>Today’s classes</h3>
        <p v-for="s in slots" :key="s.id">{{ s.dayOfWeek }} {{ s.startTime }} · {{ s.subjectName }} · {{ s.schoolClassName }} {{ s.sectionName }}</p>
        <p v-if="!slots.length" class="empty">No timetable slots yet.</p>
        <router-link class="btn" to="/attendance">Mark attendance</router-link>
        <router-link class="linkish" to="/messages">Message a parent</router-link>
      </article>
      <article class="glass card">
        <h3>Notices</h3>
        <p v-for="n in notices.slice(0, 4)" :key="n.id">{{ n.title }}</p>
        <router-link class="linkish" to="/grades">Enter grades</router-link>
      </article>
    </div>
  </section>
</template>

<style scoped>
.home-ident {
  display: flex;
  align-items: center;
  gap: 1rem;
}
</style>
