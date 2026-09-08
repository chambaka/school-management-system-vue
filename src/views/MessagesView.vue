<script setup>
import { computed, onMounted, reactive, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { messageApi, peopleApi } from "../api/endpoints";
import { useAuthStore } from "../stores/auth";

const auth = useAuthStore();
const route = useRoute();
const router = useRouter();

const error = ref("");
const students = ref([]);
const children = ref([]);
const thread = ref([]);
const studentId = ref(route.query.studentId ? String(route.query.studentId) : "");
const form = reactive({ body: "", notifyParentsSms: false });

const isParent = computed(() => auth.role === "PARENT");
const canSms = computed(() => ["HEADMASTER", "ACADEMIC_MASTER"].includes(auth.role));
const selectedName = computed(() => {
  const fromStudents = students.value.find((s) => String(s.id) === studentId.value);
  if (fromStudents) return fromStudents.name;
  const fromChildren = children.value.find((c) => String(c.studentId) === studentId.value);
  return fromChildren?.studentName || "Student";
});

async function loadDirectory() {
  if (isParent.value) {
    children.value = await peopleApi.myChildren();
    if (!studentId.value && children.value.length) {
      studentId.value = String(children.value[0].studentId);
    }
    return;
  }
  const page = await peopleApi.students({ size: 100 });
  students.value = page.content || [];
  const parentId = route.query.parentId;
  if (!studentId.value && parentId) {
    const links = await peopleApi.parentChildren(parentId);
    if (links.length) {
      studentId.value = String(links[0].studentId);
      router.replace({ path: "/messages", query: { studentId: studentId.value } });
    } else {
      error.value = "This parent is not linked to a student yet. Link a student first.";
    }
    return;
  }
  if (!studentId.value && students.value.length) {
    studentId.value = String(students.value[0].id);
  }
}

async function loadThread() {
  if (!studentId.value) {
    thread.value = [];
    return;
  }
  thread.value = await messageApi.forStudent(studentId.value);
}

async function send() {
  error.value = "";
  try {
    await messageApi.post(studentId.value, {
      body: form.body,
      notifyParentsSms: canSms.value && form.notifyParentsSms,
    });
    form.body = "";
    form.notifyParentsSms = false;
    await loadThread();
  } catch (e) {
    error.value = e.message;
  }
}

function onStudentChange() {
  router.replace({ path: "/messages", query: studentId.value ? { studentId: studentId.value } : {} });
}

watch(studentId, async () => {
  try {
    await loadThread();
  } catch (e) {
    error.value = e.message;
  }
});

onMounted(async () => {
  try {
    await loadDirectory();
    await loadThread();
  } catch (e) {
    error.value = e.message;
  }
});
</script>

<template>
  <section class="page">
    <div class="page-head">
      <div>
        <h1>Messages</h1>
        <p class="sub">{{ isParent ? "Notes about your children — reply here" : "Comments to a student. Parents see the thread and can reply." }}</p>
      </div>
    </div>
    <p v-if="error" class="banner banner-error">{{ error }}</p>
    <label class="field">
      <span>{{ isParent ? "Child" : "Student" }}</span>
      <select v-if="isParent" v-model="studentId" @change="onStudentChange">
        <option disabled value="">Choose</option>
        <option v-for="c in children" :key="c.studentId" :value="String(c.studentId)">{{ c.studentName }}</option>
      </select>
      <select v-else v-model="studentId" @change="onStudentChange">
        <option disabled value="">Choose</option>
        <option v-for="s in students" :key="s.id" :value="String(s.id)">{{ s.name }} · {{ s.admissionNo }}</option>
      </select>
    </label>
    <div v-if="studentId" class="glass card thread">
      <h3>{{ selectedName }}</h3>
      <p v-if="!thread.length" class="empty">No messages yet.</p>
      <article v-for="m in thread" :key="m.id" class="bubble" :class="m.authorRole === 'PARENT' ? 'from-parent' : 'from-staff'">
        <header>
          <strong>{{ m.authorName }}</strong>
          <span class="chip">{{ m.authorRole }}</span>
          <span class="sub">{{ m.createdAt }}</span>
        </header>
        <p>{{ m.body }}</p>
        <p v-if="m.notifyParentsSms" class="sub">
          SMS to parents: {{ m.smsSent }} sent · {{ m.smsFailed }} failed · {{ m.smsSkipped }} skipped
        </p>
      </article>
      <form class="composer" :data-confirm="isParent ? 'Send this reply?' : 'Post this comment?'" @submit.prevent="send">
        <label class="field">
          <span>{{ isParent ? "Reply" : "Comment" }}</span>
          <textarea v-model="form.body" rows="3" required maxlength="2000" placeholder="Write a note…" />
        </label>
        <label v-if="canSms" class="check">
          <input v-model="form.notifyParentsSms" type="checkbox" />
          Also SMS linked parents that there is a message to read and reply
        </label>
        <button class="btn">{{ isParent ? "Send reply" : "Post comment" }}</button>
      </form>
    </div>
  </section>
</template>

<style scoped>
.thread { display: flex; flex-direction: column; gap: 0.75rem; }
.bubble { padding: 0.75rem 1rem; border-radius: 12px; background: rgba(255,255,255,0.04); }
.bubble header { display: flex; gap: 0.5rem; align-items: baseline; flex-wrap: wrap; margin-bottom: 0.35rem; }
.from-parent { border-left: 3px solid var(--gold, #F5C451); }
.from-staff { border-left: 3px solid var(--teal, #2aa8a1); }
.composer { margin-top: 0.5rem; }
.check { display: flex; gap: 0.5rem; align-items: center; color: var(--muted); margin: 0.5rem 0 1rem; }
</style>
