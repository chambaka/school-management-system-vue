<script setup>
import { onMounted, ref } from "vue";
import { financeApi, noticeApi, peopleApi } from "../../api/endpoints";

const children = ref([]);
const notices = ref([]);
const balances = ref({});
const error = ref("");

onMounted(async () => {
  try {
    children.value = await peopleApi.myChildren();
    notices.value = await noticeApi.list();
    for (const child of children.value) {
      try {
        balances.value[child.studentId] = await financeApi.studentBalance(child.studentId);
      } catch {
        balances.value[child.studentId] = { outstanding: "—" };
      }
    }
  } catch (e) {
    error.value = e.message;
  }
});
</script>

<template>
  <section class="page">
    <div class="page-head"><div><h1>Your children</h1><p class="sub">Fees, notices, and reports</p></div></div>
    <p v-if="error" class="banner banner-error">{{ error }}</p>
    <article v-for="c in children" :key="c.id" class="glass card">
      <h3>{{ c.studentName }}</h3>
      <p class="sub">{{ c.relationship }}</p>
      <p>Outstanding: {{ balances[c.studentId]?.outstanding ?? "—" }} TZS</p>
      <router-link class="linkish" :to="`/messages?studentId=${c.studentId}`">Messages</router-link>
      <router-link class="linkish" :to="`/report-card?studentId=${c.studentId}`">Open report card</router-link>
    </article>
    <article class="glass card">
      <h3>Notices</h3>
      <p v-for="n in notices" :key="n.id">{{ n.title }}</p>
    </article>
  </section>
</template>
