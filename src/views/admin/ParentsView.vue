<script setup>
import { computed, nextTick, onMounted, onUnmounted, reactive, ref, watch } from "vue";
import { peopleApi, asList } from "../../api/endpoints";
import AddressFields from "../../components/AddressFields.vue";
import Icon from "../../components/Icon.vue";
import UserLinkedRecords from "../../components/UserLinkedRecords.vue";
import ListSearch from "../../components/ListSearch.vue";
import PasswordStrengthInput from "../../components/PasswordStrengthInput.vue";
import PhoneInput from "../../components/PhoneInput.vue";
import SortTh from "../../components/SortTh.vue";
import { useConfirmStore } from "../../stores/confirm";
import { statusLabel, isLoginLocked } from "../../utils/status";
import { useListSearch } from "../../utils/listSearch";
import { accountStatus, useTableSort } from "../../utils/tableSort";
import { useFeedback } from "../../composables/useFeedback";
import { emptyAddress, encodeAddress, formatAddress, parseAddress } from "../../utils/address";


const parents = ref([]);
const { query, filteredRows } = useListSearch(parents, (p) => [
  p.name, p.email, p.phone, p.occupation, formatAddress(p.address),
  p.children?.map((c) => [c.studentName, c.studentAdmissionNo]),
  accountStatus(p),
]);
const { sortKey, sortDir, toggleSort, sortedRows } = useTableSort(filteredRows, {
  name: (row) => row.name,
  email: (row) => row.email,
  status: accountStatus,
});
const students = ref([]);
const showArchived = ref(false);
const { error } = useFeedback();
const open = ref(false);
const linkOpen = ref(false);
const editingId = ref(null);
const passwordOk = ref(false);
const form = reactive({ name: "", email: "", password: "", phone: "", occupation: "" });
const address = ref(emptyAddress());
const link = reactive({ studentId: "", parentId: "", relationship: "GUARDIAN", primaryContact: true });
const formEl = ref(null);
const confirm = useConfirmStore();

function relationLabel(value) {
  if (!value) return "";
  return value.charAt(0) + value.slice(1).toLowerCase();
}

const unlinkedStudents = computed(() =>
  students.value.filter((s) => !s.parents?.length && s.status !== "ARCHIVED"),
);
const canSaveCreate = computed(() => (form.password ? passwordOk.value : Boolean(form.phone)));

const showLinks = ref(false);
const editingParent = computed(() => parents.value.find((p) => String(p.id) === String(editingId.value)) || null);
const editingChildren = computed(() => editingParent.value?.children || []);

function resetForm() {
  form.name = "";
  form.email = "";
  form.password = "";
  form.phone = "";
  form.occupation = "";
  address.value = emptyAddress();
  passwordOk.value = false;
  editingId.value = null;
  showLinks.value = false;
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

function openAdd() {
  error.value = "";
  resetForm();
  linkOpen.value = false;
  open.value = true;
}

function startEdit(parent) {
  error.value = "";
  linkOpen.value = false;
  editingId.value = parent.id;
  form.name = parent.name || "";
  form.email = parent.email || "";
  form.password = "";
  form.phone = parent.phone || "";
  form.occupation = parent.occupation || "";
  address.value = parseAddress(parent.address);
  passwordOk.value = false;
  open.value = true;
}

function closeForm() {
  if (confirm.open) return;
  open.value = false;
  resetForm();
}

function onFormKey(event) {
  if (!open.value || confirm.open) return;
  if (event.key === "Escape") closeForm();
}

watch(open, async (isOpen) => {
  document.body.style.overflow = isOpen ? "hidden" : "";
  if (!isOpen) return;
  await nextTick();
  formEl.value?.querySelector("input:not([disabled])")?.focus();
});

onUnmounted(() => {
  document.body.style.overflow = "";
  window.removeEventListener("keydown", onFormKey, true);
});

async function save() {
  error.value = "";
  const packed = encodeAddress(address.value);
  if (!packed) {
    error.value = "Enter region, district, ward, and street.";
    return;
  }
  try {
    if (editingId.value) {
      await peopleApi.updateParent(editingId.value, {
        name: form.name,
        phone: form.phone,
        occupation: form.occupation,
        address: packed,
      });
    } else {
      await peopleApi.createParent({
        ...form,
        password: form.password?.trim() || null,
        address: packed,
      });
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
    const updated = await peopleApi.restoreParent(parent.id);
    showArchived.value = false;
    await load();
    if (updated && !parents.value.some((row) => String(row.id) === String(updated.id))) {
      parents.value = [updated, ...parents.value];
    }
  } catch (e) {
    error.value = e.message;
  }
}

async function unlock(parent) {
  error.value = "";
  try {
    await peopleApi.unlockUser(parent.userId);
    await load();
  } catch (e) {
    error.value = e.message;
  }
}

async function resetTwoFactor(parent) {
  error.value = "";
  try {
    await peopleApi.resetTwoFactor(parent.userId);
    await load();
  } catch (e) {
    error.value = e.message;
  }
}

async function resetPassword(parent) {
  error.value = "";
  try {
    await peopleApi.resetPassword(parent.userId);
    await load();
  } catch (e) {
    error.value = e.message;
  }
}

onMounted(() => {
  window.addEventListener("keydown", onFormKey, true);
  load();
});
</script>

<template>
  <section class="page">
    <div class="page-head">
      <div><h1>Parents</h1><p class="sub">Guardians and links</p></div>
      <div class="head-actions">
        <ListSearch v-model="query" placeholder="Search parents" />
        <label class="check">
          <input type="checkbox" :checked="showArchived" @change="setArchived($event.target.checked)" />
          Show archived
        </label>
        <button class="btn btn-ghost" type="button" @click="linkOpen = !linkOpen">Link student</button>
        <button class="btn add-btn" type="button" @click="openAdd">
          <Icon name="plus" />
          Add parent
        </button>
      </div>
    </div>
    <Teleport to="body">
      <div
        v-if="open"
        class="form-scrim"
        role="presentation"
        @click.self="closeForm"
      >
        <form
          ref="formEl"
          class="glass card form-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="parent-form-title"
          :data-confirm="editingId ? 'Save changes to this parent?' : 'Save this parent?'"
          @submit.prevent="save"
        >
          <div class="form-head">
            <div>
              <h3 id="parent-form-title">{{ editingId ? `Edit ${form.name || "parent"}` : "Add parent" }}</h3>
              <p v-if="editingId && editingChildren.length" class="sub">
                Students · {{ editingChildren.map((c) => c.studentName).join(", ") }}
              </p>
              <p v-else-if="editingId" class="sub">No students linked</p>
            </div>
            <div class="form-tools">
              <button
                v-if="editingParent?.userId"
                class="icon-btn"
                type="button"
                aria-label="Linked records"
                title="Linked records"
                :aria-pressed="showLinks"
                @click="showLinks = !showLinks"
              >
                <Icon name="link" />
              </button>
              <button class="btn btn-ghost" type="button" @click="closeForm">Close</button>
            </div>
          </div>
          <div class="grid grid-2">
            <label class="field"><span>Name</span><input v-model="form.name" required /></label>
            <label class="field"><span>Email</span><input v-model="form.email" type="email" required :disabled="Boolean(editingId)" /></label>
            <PhoneInput v-model="form.phone" :required="!editingId && !form.password" />
            <label class="field"><span>Occupation</span><input v-model="form.occupation" /></label>
            <AddressFields v-model="address" />
          </div>
          <PasswordStrengthInput
            v-if="!editingId"
            v-model="form.password"
            label="Password (optional)"
            hint="Leave blank to generate a temporary password and send it by SMS to their phone."
            :email="form.email"
            :name="form.name"
            @valid-change="passwordOk = $event"
          />
          <UserLinkedRecords v-if="showLinks && editingParent?.userId" :user-id="editingParent.userId" @changed="load" />
          <div class="row-actions form-footer">
            <button class="btn" :disabled="!editingId && !canSaveCreate">{{ editingId ? "Save changes" : "Save parent" }}</button>
            <button class="btn btn-ghost" type="button" @click="closeForm">Cancel</button>
          </div>
        </form>
      </div>
    </Teleport>
    <form v-if="linkOpen && !open" class="glass card" data-confirm="Link this parent to the student?" @submit.prevent="doLink">
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
    <div v-if="!open" class="glass card">
      <div class="people-toolbar">
        <SortTh bare column="name" label="Name" :active="sortKey" :dir="sortDir" @toggle="toggleSort" />
        <SortTh bare column="email" label="Email" :active="sortKey" :dir="sortDir" @toggle="toggleSort" />
        <SortTh bare column="status" label="Status" :active="sortKey" :dir="sortDir" @toggle="toggleSort" />
      </div>
      <ul class="people-list">
        <li v-for="p in sortedRows" :key="p.id" class="person-card">
          <div class="person-top no-photo">
            <div class="person-who">
              <strong>{{ p.name }}</strong>
              <div class="person-facts">
                <span>{{ p.email || "No email" }}</span>
                <span>{{ p.phone || "No phone" }}</span>
              </div>
            </div>
            <div class="person-status">
              <span class="chip">{{ statusLabel(p.status) }}</span>
              <span v-if="isLoginLocked(p)" class="chip chip-warn">Locked</span>
              <span v-if="p.totpEnabled" class="chip">2FA</span>
            </div>
          </div>
          <div class="person-bottom">
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
                  v-if="isLoginLocked(p)"
                  type="button"
                  class="btn btn-ghost"
                  v-confirm="`Unlock ${p.name}? They will be able to sign in again immediately.`"
                  @click="unlock(p)"
                >Unlock</button>
                <button
                  v-if="p.totpEnabled"
                  type="button"
                  class="btn btn-ghost"
                  v-confirm="{ message: `Reset ShuleHub 2FA for ${p.name}? They will set up Google Authenticator again at next sign-in.`, danger: true }"
                  @click="resetTwoFactor(p)"
                >Reset 2FA</button>
                <button
                  type="button"
                  class="btn btn-ghost"
                  v-confirm="{ message: `Reset password for ${p.name}? A temporary password will be sent by SMS if they have a phone.`, confirmLabel: 'Reset password', danger: true }"
                  @click="resetPassword(p)"
                >Reset password</button>
                <button
                  v-if="p.status !== 'ARCHIVED'"
                  type="button"
                  class="btn btn-ghost"
                  v-confirm="{ message: `Deactivate ${p.name}? They will be archived and can be restored later.`, confirmLabel: 'Deactivate', danger: true }"
                  @click="archive(p)"
                >Deactivate</button>
                <button
                  v-else
                  type="button"
                  class="btn btn-ghost"
                  v-confirm="{ message: `Restore ${p.name}? They will appear in the live list again.`, confirmLabel: 'Restore' }"
                  @click="restore(p)"
                >Restore</button>
              </div>
          </div>
        </li>
      </ul>
      <p v-if="!sortedRows.length" class="empty">{{ query.trim() ? "No parents match that search." : (showArchived ? "No archived parents." : "No parents yet.") }}</p>
    </div>
  </section>
</template>

<style scoped>
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
.table-wrap .row-actions .btn {
  flex: 0 0 auto;
  padding: 0.25rem 0.7rem;
  font-size: 0.8rem;
}
.head-actions {
  display: flex;
  align-items: center;
  gap: 0.85rem;
  flex-wrap: wrap;
}
.add-btn {
  min-height: 2.75rem;
  padding: 0.7rem 1.2rem;
  font-size: 0.95rem;
}
.add-btn :deep(.ico) {
  width: 1.1rem;
  height: 1.1rem;
}
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
  width: min(48rem, 100%);
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
.form-tools {
  display: flex;
  align-items: center;
  gap: 0.4rem;
}
.form-modal .form-footer .btn {
  padding: 0.88rem 1.25rem;
  font-size: inherit;
}
</style>
