<script setup>
import { computed, onMounted, reactive, ref } from "vue";
import { peopleApi, asList } from "../../api/endpoints";
import Icon from "../../components/Icon.vue";
import PasswordStrengthInput from "../../components/PasswordStrengthInput.vue";
import PhoneInput from "../../components/PhoneInput.vue";
import { statusLabel } from "../../utils/status";

const parents = ref([]);
const students = ref([]);
const showArchived = ref(false);
const error = ref("");
const open = ref(false);
const linkOpen = ref(false);
const editingId = ref(null);
const passwordOk = ref(false);
const form = reactive({ name: "", email: "", password: "", phone: "", occupation: "", address: "" });
const link = reactive({ studentId: "", parentId: "", relationship: "GUARDIAN", primaryContact: true });

function relationLabel(value) {
  if (!value) return "";
  return value.charAt(0) + value.slice(1).toLowerCase();
}

const unlinkedStudents = computed(() =>
  students.value.filter((s) => !s.parents?.length && s.status !== "ARCHIVED"),
);

const editingChildren = computed(() => {
  const parent = parents.value.find((p) => String(p.id) === String(editingId.value));
  return parent?.children || [];
});

function resetForm() {
  form.name = "";
  form.email = "";
  form.password = "";
  form.phone = "";
  form.occupation = "";
  form.address = "";
  passwordOk.value = false;
  editingId.value = null;
}

async function load() {
  error.value = "";
  try {
    const [plist, spage] = await Promise.all([
      peopleApi.parents({ size: 100, archived: showArchived.value }),
      peopleApi.students({ size: 100 }),
    ]);
    parents.value = asList(plist);
    students.value = (spage.content || []).filter((s) => s.status !== "ARCHIVED");
  } catch (e) {
    error.value = e.message;
  }
}

function toggleAdd() {
  if (open.value && !editingId.value) {
    open.value = false;
    resetForm();
    return;
  }
  resetForm();
  open.value = true;
}

function startEdit(parent) {
  editingId.value = parent.id;
  form.name = parent.name || "";
  form.email = parent.email || "";
  form.password = "";
  form.phone = parent.phone || "";
  form.occupation = parent.occupation || "";
  form.address = parent.address || "";
  passwordOk.value = false;
  open.value = true;
}

function closeForm() {
  open.value = false;
  resetForm();
}

async function save() {
  error.value = "";
  try {
    if (editingId.value) {
      await peopleApi.updateParent(editingId.value, {
        name: form.name,
        phone: form.phone,
        occupation: form.occupation,
        address: form.address,
      });
    } else {
      await peopleApi.createParent(form);
    }
    closeForm();
    await load();
  } catch (e) {
    error.value = e.message;
  }
}

async function doLink() {
  error.value = "";
  try {
    await peopleApi.linkParent(link.studentId, {
      parentId: Number(link.parentId),
      relationship: link.relationship,
      primaryContact: link.primaryContact,
    });
    link.studentId = "";
    link.parentId = "";
    linkOpen.value = false;
    await load();
  } catch (e) {
    error.value = e.message;
  }
}

function openLink(parent) {
  link.parentId = String(parent.id);
  link.studentId = "";
  link.relationship = "GUARDIAN";
  linkOpen.value = true;
}

async function setArchived(value) {
  showArchived.value = value;
  await load();
}

async function unlink(parent, child) {
  error.value = "";
  try {
    await peopleApi.unlinkParent(child.studentId, parent.id);
    await load();
  } catch (e) {
    error.value = e.message;
  }
}

async function archive(parent) {
  error.value = "";
  try {
    await peopleApi.archiveParent(parent.id);
    await load();
  } catch (e) {
    error.value = e.message;
  }
}

async function restore(parent) {
  error.value = "";
  try {
    await peopleApi.restoreParent(parent.id);
    await load();
  } catch (e) {
    error.value = e.message;
  }
}

onMounted(load);
</script>

<template>
  <section class="page">
    <div class="page-head">
      <div><h1>Parents</h1><p class="sub">Guardians and links</p></div>
      <div class="row-actions">
        <label class="check">
          <input type="checkbox" :checked="showArchived" @change="setArchived($event.target.checked)" />
          Show archived
        </label>
        <button class="btn btn-ghost" type="button" @click="linkOpen = !linkOpen">Link student</button>
        <button class="btn" type="button" @click="toggleAdd">
          {{ open && !editingId ? "Close" : "Add parent" }}
        </button>
      </div>
    </div>
    <p v-if="error" class="banner banner-error">{{ error }}</p>
    <form
      v-if="open"
      class="glass card"
      :data-confirm="editingId ? 'Save changes to this parent?' : 'Save this parent?'"
      @submit.prevent="save"
    >
      <h3>{{ editingId ? `Edit ${form.name || "parent"}` : "Add parent" }}</h3>
      <p v-if="editingId && editingChildren.length" class="sub">
        Students · {{ editingChildren.map((c) => c.studentName).join(", ") }}
      </p>
      <p v-else-if="editingId" class="sub">No students linked</p>
      <div class="grid grid-2">
        <label class="field"><span>Name</span><input v-model="form.name" required /></label>
        <label class="field"><span>Email</span><input v-model="form.email" type="email" required :disabled="Boolean(editingId)" /></label>
        <PhoneInput v-model="form.phone" />
        <label class="field"><span>Occupation</span><input v-model="form.occupation" /></label>
        <label class="field"><span>Address</span><input v-model="form.address" /></label>
      </div>
      <PasswordStrengthInput v-if="!editingId" v-model="form.password" :email="form.email" :name="form.name" @valid-change="passwordOk = $event" />
      <div class="row-actions">
        <button class="btn" :disabled="!editingId && !passwordOk">{{ editingId ? "Save changes" : "Save parent" }}</button>
        <button class="btn btn-ghost" type="button" @click="closeForm">Cancel</button>
      </div>
    </form>
    <form v-if="linkOpen" class="glass card" data-confirm="Link this parent to the student?" @submit.prevent="doLink">
      <div class="grid grid-2">
        <label class="field">
          <span>Student</span>
          <select v-model="link.studentId" required>
            <option disabled value="">Choose</option>
            <option v-for="s in unlinkedStudents" :key="s.id" :value="s.id">{{ s.name }} · {{ s.admissionNo }}</option>
          </select>
        </label>
        <label class="field">
          <span>Parent</span>
          <select v-model="link.parentId" required>
            <option disabled value="">Choose</option>
            <option v-for="p in parents.filter((row) => row.status !== 'ARCHIVED')" :key="p.id" :value="p.id">{{ p.name }}</option>
          </select>
        </label>
        <label class="field">
          <span>Relationship</span>
          <select v-model="link.relationship">
            <option>FATHER</option><option>MOTHER</option><option>GUARDIAN</option><option>OTHER</option>
          </select>
        </label>
      </div>
      <p v-if="!unlinkedStudents.length" class="sub">Every live student already has a parent.</p>
      <button class="btn">Link</button>
    </form>
    <div class="glass card table-wrap">
      <table>
        <thead><tr><th>Name</th><th>Students</th><th>Phone</th><th>Status</th><th></th></tr></thead>
        <tbody>
          <tr v-for="p in parents" :key="p.id">
            <td>
              <div>{{ p.name }}</div>
              <div class="sub">{{ p.email }}</div>
            </td>
            <td>
              <div v-if="p.children?.length" class="link-cell">
                <ul class="links">
                  <li v-for="c in p.children" :key="c.id">
                    <router-link class="name-link" :to="`/students`">{{ c.studentName }}</router-link>
                    <span class="sub">{{ c.studentAdmissionNo }} · {{ relationLabel(c.relationship) }}</span>
                    <button
                      type="button"
                      class="link-btn"
                      v-confirm="{ message: `Unlink ${p.name} from ${c.studentName}?`, danger: true }"
                      @click="unlink(p, c)"
                    >Unlink</button>
                  </li>
                </ul>
                <button v-if="p.status !== 'ARCHIVED'" type="button" class="link-btn" @click="openLink(p)">Add student</button>
              </div>
              <div v-else class="link-cell">
                <span class="sub">No students</span>
                <button v-if="p.status !== 'ARCHIVED'" type="button" class="link-btn" @click="openLink(p)">Link</button>
              </div>
            </td>
            <td>{{ p.phone }}</td>
            <td><span class="chip">{{ statusLabel(p.status) }}</span></td>
            <td>
              <div class="row-actions wrap">
                <button
                  class="icon-btn"
                  type="button"
                  :aria-label="`Edit ${p.name}`"
                  title="Edit parent"
                  @click="startEdit(p)"
                >
                  <Icon name="pen" />
                </button>
                <router-link
                  class="icon-btn"
                  :to="`/messages?parentId=${p.id}`"
                  :aria-label="`Message ${p.name}`"
                  title="Message"
                >
                  <Icon name="message" />
                </router-link>
                <button
                  v-if="p.status !== 'ARCHIVED'"
                  type="button"
                  class="btn btn-ghost"
                  v-confirm="{ message: `Deactivate ${p.name}? They will be archived and can be restored later.`, danger: true }"
                  @click="archive(p)"
                >Deactivate</button>
                <button
                  v-else
                  type="button"
                  class="btn btn-ghost"
                  v-confirm="`Restore ${p.name}?`"
                  @click="restore(p)"
                >Restore</button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
      <p v-if="!parents.length" class="empty">{{ showArchived ? "No archived parents." : "No parents yet." }}</p>
    </div>
  </section>
</template>

<style scoped>
.icon-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  padding: 0;
  border: 0;
  border-radius: 10px;
  background: transparent;
  color: var(--primary);
  cursor: pointer;
}
.icon-btn:hover {
  background: rgba(255, 255, 255, 0.06);
}
a.icon-btn {
  text-decoration: none;
  color: var(--primary);
}
h3 { margin: 0 0 0.35rem; }
.check {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  color: var(--muted);
  font-size: 0.85rem;
}
.links {
  margin: 0 0 0.25rem;
  padding: 0;
  list-style: none;
}
.links li {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.1rem;
  margin-bottom: 0.45rem;
}
.name-link {
  color: var(--primary);
  text-decoration: none;
  font-weight: 650;
}
.name-link:hover { text-decoration: underline; }
.link-cell {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.15rem;
}
.link-btn {
  border: 0;
  background: transparent;
  color: var(--primary);
  cursor: pointer;
  padding: 0;
  font-size: 0.75rem;
}
.wrap { flex-wrap: wrap; }
.row-actions .btn {
  flex: 0 0 auto;
  padding: 0.25rem 0.7rem;
  font-size: 0.8rem;
}
</style>
