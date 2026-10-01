<script setup>
import { onMounted, reactive, ref } from "vue";
import { noticeApi } from "../../api/endpoints";
import ListSearch from "../../components/ListSearch.vue";
import { useAuthStore } from "../../stores/auth";
import { useListSearch } from "../../utils/listSearch";
import { useFeedback } from "../../composables/useFeedback";


const auth = useAuthStore();
const notices = ref([]);
const { query, filteredRows } = useListSearch(notices, (n) => [
  n.title, n.content, n.audience, n.createdByName, n.published ? "published" : "draft",
]);
const { error } = useFeedback();
const form = reactive({ title: "", content: "", audience: "ALL", published: true });
const canWrite = ["HEADMASTER", "SCHOOL_ADMIN", "ACADEMIC_MASTER", "TEACHER", "ACCOUNTANT", "STAFF"].includes(auth.role);

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
    <div class="page-head">
      <div><h1>Notices</h1><p class="sub">School board</p></div>
      <ListSearch v-model="query" placeholder="Search notices" />
    </div>
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
    <p v-if="!filteredRows.length" class="empty">{{ query.trim() ? "No notices match that search." : "No notices yet." }}</p>
    <article v-for="n in filteredRows" :key="n.id" class="glass card">
      <div class="card-head">
        <div>
          <h3>{{ n.title }}</h3>
          <p class="sub">{{ n.createdByName }} · {{ n.published ? "Published" : "Draft" }}</p>
        </div>
        <span class="chip">{{ n.audience }}</span>
      </div>
      <p>{{ n.content }}</p>
    </article>
  </section>
</template>
