<script setup>
import { computed, nextTick, onMounted, onUnmounted, reactive, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { messageApi, peopleApi } from "../api/endpoints";
import { useAuthStore } from "../stores/auth";
import { useConfirmStore } from "../stores/confirm";
import { useFeedback } from "../composables/useFeedback";


const auth = useAuthStore();
const confirm = useConfirmStore();
const route = useRoute();
const router = useRouter();

const { error } = useFeedback();
const students = ref([]);
const children = ref([]);
const thread = ref([]);
const studentId = ref(route.query.studentId ? String(route.query.studentId) : "");
const form = reactive({ body: "", notifyParentsSms: false });
const composerOpen = ref(false);
const formEl = ref(null);

const isParent = computed(() => auth.role === "PARENT");
const canSms = computed(() => ["HEADMASTER", "SCHOOL_ADMIN", "ACADEMIC_MASTER"].includes(auth.role));
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
  const ok = await confirm.ask({
    message: isParent.value ? "Send this reply?" : "Post this comment?",
    confirmLabel: isParent.value ? "Send reply" : "Post comment",
  });
  if (!ok) {
    closeComposer();
    return;
  }
  try {
    await messageApi.post(studentId.value, {
      body: form.body,
      notifyParentsSms: canSms.value && form.notifyParentsSms,
    });
    closeComposer();
    await loadThread();
  } catch (e) {
    error.value = e.message;
  }
}

function clearComposer() {
  form.body = "";
  form.notifyParentsSms = false;
}

function openComposer() {
  error.value = "";
  composerOpen.value = true;
}

function closeComposer() {
  if (confirm.open) confirm.settle(false);
  composerOpen.value = false;
  clearComposer();
  error.value = "";
}

function cancelCompose(event) {
  event?.preventDefault();
  event?.stopPropagation();
  closeComposer();
}

function onComposerKey(event) {
  if (!composerOpen.value || confirm.open) return;
  if (event.key === "Escape") closeComposer();
}

watch(composerOpen, async (isOpen) => {
  document.body.style.overflow = isOpen ? "hidden" : "";
  if (!isOpen) return;
  await nextTick();
  formEl.value?.querySelector("textarea")?.focus();
});

onUnmounted(() => {
  document.body.style.overflow = "";
  window.removeEventListener("keydown", onComposerKey, true);
});

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
  window.addEventListener("keydown", onComposerKey, true);
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
      <button class="btn add-btn" type="button" @click="openComposer">
        {{ isParent ? "Write reply" : "Write comment" }}
      </button>
    </div>
    <Teleport to="body">
      <div
        v-if="composerOpen"
        class="form-scrim"
        role="presentation"
        @click.self="closeComposer"
      >
        <form
          ref="formEl"
          class="glass card form-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="comment-form-title"
          data-no-confirm
          @submit.prevent="send"
        >
          <div class="form-head">
            <div>
              <h3 id="comment-form-title">{{ isParent ? "Write reply" : "Write comment" }}</h3>
              <p class="sub">{{ selectedName }}</p>
            </div>
            <button class="btn btn-ghost" type="button" @click="closeComposer">Close</button>
          </div>
          <label class="field">
            <span>{{ isParent ? "Reply" : "Comment" }}</span>
            <textarea v-model="form.body" rows="4" required maxlength="2000" placeholder="Write a note…" />
          </label>
          <label v-if="canSms" class="check">
            <input v-model="form.notifyParentsSms" type="checkbox" />
            Also SMS linked parents that there is a message to read and reply
          </label>
          <div class="row-actions form-footer">
            <button class="btn" type="submit">{{ isParent ? "Send reply" : "Post comment" }}</button>
            <button class="btn btn-ghost" type="button" @click.prevent.stop="cancelCompose">Cancel</button>
          </div>
        </form>
      </div>
    </Teleport>
  </section>
</template>

<style scoped>
.thread { display: flex; flex-direction: column; gap: 0.75rem; }
.bubble { padding: 0.75rem 1rem; border-radius: 12px; background: rgba(255,255,255,0.04); }
.bubble header { display: flex; gap: 0.5rem; align-items: baseline; flex-wrap: wrap; margin-bottom: 0.35rem; }
.from-parent { border-left: 3px solid var(--gold, #F5C451); }
.from-staff { border-left: 3px solid var(--teal, #2aa8a1); }
.add-btn { align-self: flex-start; margin-top: 0.35rem; }
.check { display: flex; gap: 0.5rem; align-items: center; color: var(--muted); margin: 0.5rem 0 1rem; }
.row-actions { display: flex; flex-wrap: wrap; gap: 0.6rem; }
.form-scrim {
  position: fixed;
  inset: 0;
  z-index: 70;
  display: grid;
  place-items: start center;
  padding: 1.25rem 1.25rem calc(5.5rem + env(safe-area-inset-bottom, 0px));
  overflow: auto;
  background: rgba(4, 10, 22, 0.72);
}
.form-modal {
  width: min(40rem, 100%);
  margin: auto 0;
}
.form-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
  margin-bottom: 0.35rem;
}
.form-head .btn {
  flex: 0 0 auto;
  padding: 0.45rem 0.85rem;
  font-size: 0.8rem;
}
.form-modal .form-footer .btn {
  padding: 0.88rem 1.25rem;
  font-size: inherit;
}
h3 { margin: 0 0 0.35rem; }
</style>
