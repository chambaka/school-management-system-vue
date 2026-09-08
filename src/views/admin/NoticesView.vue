<script setup>
import { onMounted, reactive, ref } from "vue";
import { noticeApi } from "../../api/endpoints";
import { useAuthStore } from "../../stores/auth";

const auth = useAuthStore();
const notices = ref([]);
const error = ref("");
const form = reactive({ title: "", content: "", audience: "ALL", published: true });
const canWrite = ["HEADMASTER", "ACADEMIC_MASTER", "TEACHER", "ACCOUNTANT"].includes(auth.role);

async function load() {
  notices.value = await noticeApi.list();
}

async function publish() {
  await noticeApi.create(form);
  form.title = "";
  form.content = "";
  await load();
}

onMounted(async () => {
  try { await load(); } catch (e) { error.value = e.message; }
});
</script>

<template>
  <section class="page">
    <div class="page-head"><div><h1>Notices</h1><p class="sub">School board</p></div></div>
    <p v-if="error" class="banner banner-error">{{ error }}</p>
    <form v-if="canWrite" class="glass card" data-confirm="Publish this notice?" @submit.prevent="publish">
      <label class="field"><span>Title</span><input v-model="form.title" required /></label>
      <label class="field"><span>Body</span><textarea v-model="form.content" rows="4" required /></label>
      <label class="field"><span>Audience</span>
        <select v-model="form.audience">
          <option>ALL</option><option>TEACHERS</option><option>STUDENTS</option><option>PARENTS</option><option>STAFF</option>
        </select>
      </label>
      <button class="btn">Publish notice</button>
    </form>
    <article v-for="n in notices" :key="n.id" class="glass card">
      <span class="chip">{{ n.audience }}</span>
      <h3>{{ n.title }}</h3>
      <p>{{ n.content }}</p>
      <small class="sub">{{ n.createdByName }} · {{ n.published ? "Published" : "Draft" }}</small>
    </article>
  </section>
</template>
