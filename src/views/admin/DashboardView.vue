<script setup>
import { onMounted, ref } from "vue";
import { peopleApi, financeApi, noticeApi, academicApi, asList } from "../../api/endpoints";
import { useAuthStore } from "../../stores/auth";
import { useBrandingStore } from "../../stores/branding";

const auth = useAuthStore();
const branding = useBrandingStore();
const stats = ref({ students: 0, teachers: 0, invoices: 0, notices: 0, exams: 0 });
const error = ref("");

async function count(loader, pick) {
  try {
    return pick(await loader());
  } catch {
    return 0;
  }
}

onMounted(async () => {
  try {
    const [students, teachers, invoices, notices, exams] = await Promise.all([
      count(() => peopleApi.students({ size: 1 }), (d) => d.totalElements ?? d.content?.length ?? 0),
      count(() => peopleApi.teachers(), (d) => d.totalElements ?? asList(d).length),
      count(() => financeApi.invoices({ size: 1 }), (d) => d.totalElements ?? 0),
      count(() => noticeApi.list(), (d) => d.length ?? 0),
      count(() => academicApi.exams(), (d) => d.length ?? 0),
    ]);
    stats.value = { students, teachers, invoices, notices, exams };
  } catch (e) {
    error.value = e.message;
  }
});
</script>

<template>
  <section class="page">
    <div class="page-head">
      <div>
        <p class="kicker">Admin cockpit</p>
        <h1>Good day, {{ auth.user?.name }}</h1>
        <p class="sub">{{ branding.current?.name || "School" }} · live snapshot</p>
      </div>
    </div>
    <p v-if="error" class="banner banner-error">{{ error }}</p>
    <div class="grid grid-3">
      <article class="glass stat"><small>Students</small><strong>{{ stats.students }}</strong></article>
      <article class="glass stat"><small>Teachers</small><strong>{{ stats.teachers }}</strong></article>
      <article class="glass stat"><small>Invoices</small><strong>{{ stats.invoices }}</strong></article>
      <article class="glass stat"><small>Notices</small><strong>{{ stats.notices }}</strong></article>
      <article class="glass stat"><small>Exams</small><strong>{{ stats.exams }}</strong></article>
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
</style>
