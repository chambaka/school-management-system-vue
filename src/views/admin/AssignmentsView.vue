<script setup>
import { computed, onMounted, reactive, ref } from "vue";
import { academicApi, assignmentApi, asList, peopleApi } from "../../api/endpoints";
import Icon from "../../components/Icon.vue";
import ListSearch from "../../components/ListSearch.vue";
import { useAuthStore } from "../../stores/auth";
import { useListSearch } from "../../utils/listSearch";
import { useFeedback } from "../../composables/useFeedback";
import { teachesSubject } from "../../utils/allocations";

const auth = useAuthStore();
const canWrite = computed(() => ["HEADMASTER", "ACADEMIC_MASTER", "TEACHER"].includes(auth.role));
const isAcademicOfficer = computed(() => ["HEADMASTER", "ACADEMIC_MASTER"].includes(auth.role));
const isStudent = computed(() => auth.role === "STUDENT");
const isParent = computed(() => auth.role === "PARENT");
const rows = ref([]);
const knownWork = ref({});
const myAllocations = ref([]);
const children = ref([]);
const { query, filteredRows } = useListSearch(rows, (a) => [
  a.title, a.subjectName, a.schoolClassName, a.sectionName, a.instructions, a.dueDate, a.teacherName, a.status,
  ...documents(a).map((doc) => doc.fileName),
  myWork(a)?.notes, myWork(a)?.attachmentName,
  ...historyOf(a).map((row) => row.notes),
  ...historyOf(a).map((row) => row.attachmentName),
  ...historyOf(a).map((row) => row.studentName),
  ...myDocuments(a).map((doc) => doc.fileName),
]);
const classes = ref([]);
const sections = ref([]);
const subjects = ref([]);
const { error, ok } = useFeedback();
const creating = ref(false);
const editingId = ref(null);
const marking = ref(null);
const submitting = ref(null);
const composing = ref(false);
const composeKey = ref(0);
const reviewing = ref(null);
const docsFor = ref(null);
const marksLoading = ref(false);
const savingMarkId = ref(null);
const refreshing = ref("");
const markStudents = ref([]);
const markSubmissions = ref([]);
const markDrafts = reactive({});
const form = reactive({ schoolClassId: "", sectionId: "", subjectId: "", title: "", instructions: "", dueDate: "" });
const submit = reactive({ notes: "", file: null });

const canCreate = computed(() => canWrite.value && myAllocations.value.length);
const formClasses = computed(() => isAcademicOfficer.value ? classes.value : allocatedClasses.value);
const formSubjects = computed(() => {
  if (isAcademicOfficer.value) return subjects.value;
  return allocatedSubjects.value;
});

const allocatedClasses = computed(() => {
  const ids = new Set(myAllocations.value.map((row) => String(row.schoolClassId)));
  return classes.value.filter((item) => ids.has(String(item.id)));
});

const allocatedSubjects = computed(() => {
  return subjects.value.filter((subject) => teachesSubject(myAllocations.value, {
    classId: form.schoolClassId || undefined,
    subjectId: subject.id,
  }));
});

function teachesAssignment(assignment) {
  return teachesSubject(myAllocations.value, {
    classId: assignment.schoolClassId,
    subjectId: assignment.subjectId,
    sectionId: assignment.sectionId,
  });
}

function isDraft(assignment) {
  return assignment.status === "DRAFT";
}

function canMutate(assignment) {
  if (!canWrite.value) return false;
  if (isAcademicOfficer.value) return true;
  return teachesAssignment(assignment) && isDraft(assignment);
}

function canLock(assignment) {
  if (!canWrite.value || assignment.status !== "DRAFT") return false;
  return isAcademicOfficer.value || teachesAssignment(assignment);
}

function canPublish(assignment) {
  if (!canWrite.value || assignment.status !== "LOCKED") return false;
  return isAcademicOfficer.value || teachesAssignment(assignment);
}

function canEnterMarks(assignment) {
  return canWrite.value && assignment.status === "PUBLISHED" && teachesAssignment(assignment);
}

function showActions(assignment) {
  return canMutate(assignment) || canLock(assignment) || canPublish(assignment);
}

function showSubmissions(assignment) {
  return isStudent.value || canWrite.value || isParent.value;
}

function submissionsLabel(assignment) {
  if (isStudent.value || isParent.value) {
    const count = historyOf(assignment).length;
    if (!count) return "Not submitted yet";
    if (count === 1) return "1 attempt";
    return `${count} attempts`;
  }
  return canEnterMarks(assignment) ? "Enter CA marks" : "View work";
}

function statusLabel(status) {
  if (status === "LOCKED") return "Locked";
  if (status === "PUBLISHED") return "Published";
  return "Draft";
}

function statusChip(status) {
  if (status === "LOCKED") return "chip chip-warn";
  if (status === "PUBLISHED") return "chip chip-gold";
  return "chip";
}

function resetForm() {
  form.schoolClassId = "";
  form.sectionId = "";
  form.subjectId = "";
  form.title = "";
  form.instructions = "";
  form.dueDate = "";
  sections.value = [];
}

function openAdd() {
  editingId.value = null;
  resetForm();
  creating.value = true;
}

async function openEdit(assignment) {
  editingId.value = assignment.id;
  form.schoolClassId = assignment.schoolClassId || "";
  form.sectionId = assignment.sectionId || "";
  form.subjectId = assignment.subjectId || "";
  form.title = assignment.title || "";
  form.instructions = assignment.instructions || "";
  form.dueDate = assignment.dueDate || "";
  creating.value = true;
  sections.value = form.schoolClassId ? await academicApi.sections(form.schoolClassId) : [];
}

function closeAdd() {
  creating.value = false;
  editingId.value = null;
}

function closeMarks() {
  marking.value = null;
  markStudents.value = [];
  markSubmissions.value = [];
  for (const key of Object.keys(markDrafts)) delete markDrafts[key];
}

function closeSubmit() {
  submitting.value = null;
  closeNewSubmission();
}

function closeReview() {
  reviewing.value = null;
}

function submissionOf(row) {
  if (!row) return null;
  return {
    id: row.id,
    assignmentId: row.assignmentId ?? row.assignment_id,
    studentId: row.studentId ?? row.student_id,
    studentName: row.studentName ?? row.student_name,
    notes: row.notes || "",
    attachmentName: (row.attachmentName ?? row.attachment_name) || "",
    marksObtained: row.marksObtained ?? row.marks_obtained ?? null,
    submittedAt: row.submittedAt ?? row.submitted_at ?? null,
    attempt: row.attempt ?? null,
    attachments: asList(row.attachments),
  };
}

function newestFirst(rows) {
  return [...rows].sort((left, right) => {
    const rightAt = Date.parse(right?.submittedAt || "") || 0;
    const leftAt = Date.parse(left?.submittedAt || "") || 0;
    if (rightAt !== leftAt) return rightAt - leftAt;
    return Number(right?.id || 0) - Number(left?.id || 0);
  });
}

function historyOf(assignment) {
  const listed = asList(assignment?.mySubmissionHistory || assignment?.my_submission_history)
    .map(submissionOf)
    .filter(Boolean);
  const latest = submissionOf(assignment?.mySubmission || assignment?.my_submission);
  const known = knownWork.value[Number(assignment?.id)];
  const merged = new Map();
  for (const row of [...listed, latest, known]) {
    if (!row) continue;
    const key = row.id == null ? `new-${row.submittedAt}` : String(row.id);
    if (!merged.has(key)) merged.set(key, row);
  }
  return newestFirst([...merged.values()]);
}

function myWork(assignment) {
  return historyOf(assignment)[0] || null;
}

function rememberWork(assignmentId, row) {
  const work = submissionOf({ ...row, assignmentId: row?.assignmentId ?? row?.assignment_id ?? assignmentId });
  if (!work || !Number.isFinite(Number(assignmentId))) return null;
  knownWork.value = { ...knownWork.value, [Number(assignmentId)]: work };
  return work;
}

function attachMine(assignments, mine) {
  const byAssignment = new Map();
  for (const row of asList(mine)) {
    const work = submissionOf({ ...row, assignmentId: row?.assignmentId ?? row?.assignment_id });
    const id = Number(work?.assignmentId);
    if (!Number.isFinite(id)) continue;
    const list = byAssignment.get(id) || [];
    list.push(work);
    byAssignment.set(id, list);
  }
  return asList(assignments).map((assignment) => {
    const unique = [];
    const seen = new Set();
    for (const row of newestFirst([
      ...asList(assignment.mySubmissionHistory || assignment.my_submission_history).map(submissionOf).filter(Boolean),
      ...asList(byAssignment.get(Number(assignment.id))),
      submissionOf(assignment.mySubmission || assignment.my_submission),
      knownWork.value[Number(assignment.id)],
    ].filter(Boolean))) {
      const key = row.id == null ? `new-${row.submittedAt}` : String(row.id);
      if (seen.has(key)) continue;
      seen.add(key);
      unique.push(row);
    }
    return {
      ...assignment,
      mySubmission: unique[0] || null,
      mySubmissionHistory: unique,
    };
  });
}

function formatWhen(at) {
  if (!at) return "";
  return String(at).replace("T", " ").replace("Z", "").slice(0, 16);
}

function submittedWhen(assignment) {
  return formatWhen(myWork(assignment)?.submittedAt);
}

function openSubmit(assignment) {
  submit.notes = "";
  submit.file = null;
  composing.value = false;
  submitting.value = assignment;
}

function openNewSubmission() {
  submit.notes = "";
  submit.file = null;
  composeKey.value += 1;
  composing.value = true;
}

function closeNewSubmission() {
  composing.value = false;
  submit.notes = "";
  submit.file = null;
}

function myDocuments(assignment) {
  const docs = [];
  const seen = new Set();
  for (const row of historyOf(assignment)) {
    const attachments = asList(row.attachments);
    if (attachments.length) {
      for (const doc of attachments) {
        const fileName = doc.fileName || doc.file_name || "";
        const key = `${row.id || "row"}-${doc.id || fileName}`;
        if (!fileName || seen.has(key)) continue;
        seen.add(key);
        docs.push({
          id: doc.id,
          fileName,
          submissionId: row.id,
          studentId: row.studentId,
          attempt: row.attempt,
        });
      }
      continue;
    }
    if (!row.attachmentName) continue;
    const key = `${row.id || "row"}-${row.attachmentName}`;
    if (seen.has(key)) continue;
    seen.add(key);
    docs.push({
      id: null,
      fileName: row.attachmentName,
      submissionId: row.id,
      studentId: row.studentId,
      attempt: row.attempt,
    });
  }
  return docs;
}

function openDocs(assignment) {
  docsFor.value = assignment;
}

function closeDocs() {
  docsFor.value = null;
}

async function refreshDocs() {
  const assignment = docsFor.value;
  if (!assignment || refreshing.value) return;
  refreshing.value = "docs";
  try {
    await load();
    syncOpen(assignment.id, docsFor);
  } catch (e) {
    error.value = e.message;
  } finally {
    refreshing.value = "";
  }
}

async function refreshSubmissions() {
  if (refreshing.value) return;
  refreshing.value = "submissions";
  try {
    if (submitting.value) {
      const id = submitting.value.id;
      const nextKnown = { ...knownWork.value };
      delete nextKnown[Number(id)];
      knownWork.value = nextKnown;
      await load();
      syncOpen(id, submitting);
    } else if (reviewing.value) {
      children.value = asList(await peopleApi.myChildren().catch(() => []));
      await openReview(reviewing.value);
    } else if (marking.value) {
      await reloadMarks(marking.value, false);
    }
  } catch (e) {
    error.value = e.message;
  } finally {
    refreshing.value = "";
  }
}

function syncOpen(id, target) {
  if (!target.value) return;
  const next = rows.value.find((row) => Number(row.id) === Number(id));
  if (next) target.value = next;
}

function openSubmissions(assignment) {
  if (isStudent.value) {
    openSubmit(assignment);
    return;
  }
  if (isParent.value) {
    openReview(assignment);
    return;
  }
  openMarks(assignment);
}

async function openReview(assignment) {
  reviewing.value = assignment;
  try {
    const listed = asList(await assignmentApi.submissions(assignment.id)).map(submissionOf).filter(Boolean);
    const next = {
      ...assignment,
      mySubmission: listed[0] || null,
      mySubmissionHistory: listed,
    };
    reviewing.value = next;
    rows.value = rows.value.map((item) => (Number(item.id) === Number(assignment.id) ? next : item));
  } catch (e) {
    error.value = e.message;
  }
}

function childRows(assignment) {
  const work = historyOf(assignment);
  const byId = new Map();
  for (const child of children.value) {
    const id = child.studentId ?? child.student_id;
    if (id == null) continue;
    byId.set(String(id), {
      id,
      name: child.studentName || child.student_name || child.name || "Student",
      admissionNo: child.studentAdmissionNo || child.admissionNo || "",
      work: [],
    });
  }
  for (const row of work) {
    if (row.studentId == null) continue;
    const key = String(row.studentId);
    if (!byId.has(key)) {
      byId.set(key, { id: row.studentId, name: row.studentName || "Student", admissionNo: "", work: [] });
    }
    byId.get(key).work.push(row);
  }
  return [...byId.values()].map((child) => ({ ...child, work: newestFirst(child.work) }));
}

function documentsOf(workRows) {
  const docs = [];
  const seen = new Set();
  for (const row of workRows) {
    const attachments = asList(row.attachments);
    if (attachments.length) {
      for (const doc of attachments) {
        const fileName = doc.fileName || doc.file_name || "";
        const key = `${row.id || "row"}-${doc.id || fileName}`;
        if (!fileName || seen.has(key)) continue;
        seen.add(key);
        docs.push({
          id: doc.id,
          fileName,
          submissionId: row.id,
          studentId: row.studentId,
          attempt: row.attempt,
        });
      }
      continue;
    }
    if (!row.attachmentName) continue;
    const key = `${row.id || "row"}-${row.attachmentName}`;
    if (seen.has(key)) continue;
    seen.add(key);
    docs.push({
      id: null,
      fileName: row.attachmentName,
      submissionId: row.id,
      studentId: row.studentId,
      attempt: row.attempt,
    });
  }
  return docs;
}

async function load() {
  const listed = asList(await assignmentApi.list());
  if (isStudent.value) {
    const mine = await assignmentApi.mySubmissions().catch(() => []);
    let next = attachMine(listed, mine);
    const missing = next.filter((assignment) => !myWork(assignment));
    if (missing.length) {
      const extras = await Promise.all(missing.map(async (assignment) => {
        const row = await assignmentApi.mySubmission(assignment.id).catch(() => null);
        return row ? { ...row, assignmentId: assignment.id } : null;
      }));
      next = attachMine(next, extras.filter(Boolean));
    }
    rows.value = next;
  } else {
    rows.value = listed;
  }
  if (isParent.value) {
    children.value = asList(await peopleApi.myChildren().catch(() => []));
  }
  if (canWrite.value) {
    const [classRows, subjectRows, allocationRows] = await Promise.all([
      academicApi.classes(),
      academicApi.subjects(),
      academicApi.myAllocations().catch(() => []),
    ]);
    classes.value = classRows;
    subjects.value = subjectRows;
    myAllocations.value = asList(allocationRows);
  }
}

async function onClass() {
  form.sectionId = "";
  sections.value = form.schoolClassId ? await academicApi.sections(form.schoolClassId) : [];
}

async function save() {
  ok.value = "";
  const body = {
    schoolClassId: Number(form.schoolClassId),
    sectionId: form.sectionId ? Number(form.sectionId) : null,
    subjectId: Number(form.subjectId),
    title: form.title,
    instructions: form.instructions || null,
    dueDate: form.dueDate,
  };
  try {
    if (editingId.value) {
      await assignmentApi.update(editingId.value, body);
      ok.value = "Assignment updated.";
    } else {
      await assignmentApi.create(body);
      ok.value = "Assignment saved as a draft.";
    }
    closeAdd();
    await load();
  } catch (e) {
    error.value = e.message;
  }
}

async function lockAssignment(assignment) {
  try {
    await assignmentApi.lock(assignment.id);
    await load();
    ok.value = "Assignment locked.";
  } catch (e) {
    error.value = e.message;
  }
}

async function publishAssignment(assignment) {
  try {
    await assignmentApi.publish(assignment.id);
    await load();
    ok.value = "Assignment published.";
  } catch (e) {
    error.value = e.message;
  }
}

async function removeAssignment(assignment) {
  try {
    await assignmentApi.remove(assignment.id);
    await load();
    ok.value = "Assignment deleted.";
  } catch (e) {
    error.value = e.message;
  }
}

const ATTACH_ACCEPT = "image/jpeg,image/png,image/webp,image/gif,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.rtf,.odt";

function documents(assignment) {
  if (assignment?.attachments?.length) return assignment.attachments;
  if (assignment?.attachmentName) return [{ id: null, fileName: assignment.attachmentName }];
  return [];
}

function documentCountLabel(assignment) {
  const count = documents(assignment).length;
  if (count === 0) return "None attached";
  if (count === 1) return "1 document";
  return `${count} documents`;
}

async function attach(id, event) {
  const files = [...(event.target.files || [])];
  event.target.value = "";
  if (!files.length) return;
  try {
    for (const file of files) {
      await assignmentApi.attach(id, file);
    }
    await load();
    syncOpen(id, docsFor);
    ok.value = files.length === 1 ? "Document attached." : `${files.length} documents attached.`;
  } catch (e) {
    error.value = e.message;
    await load();
    syncOpen(id, docsFor);
  }
}

async function openAttachment(assignment, doc, mode = "view") {
  const filename = doc?.fileName || assignment.attachmentName || "assignment";
  try {
    if (doc?.id) {
      await assignmentApi.fileById(assignment.id, doc.id, filename, mode);
      return;
    }
    await assignmentApi.file(assignment.id, filename, mode);
  } catch (e) {
    error.value = e.message;
  }
}

async function removeFile(assignment, doc) {
  if (!doc?.id) return;
  try {
    await assignmentApi.removeFile(assignment.id, doc.id);
    await load();
    syncOpen(assignment.id, docsFor);
    ok.value = "Document removed.";
  } catch (e) {
    error.value = e.message;
  }
}

function submissionsFor(studentId) {
  return newestFirst(markSubmissions.value.filter((row) => String(row.studentId) === String(studentId)));
}

function submissionFor(studentId) {
  return submissionsFor(studentId)[0] || null;
}

async function reloadMarks(assignment, resetDrafts) {
  const previous = {};
  if (!resetDrafts) {
    for (const student of markStudents.value) {
      previous[student.id] = {
        draft: markDrafts[student.id],
        saved: submissionFor(student.id)?.marksObtained ?? "",
      };
    }
  }
  const [studentPage, submissions] = await Promise.all([
    peopleApi.students({ classId: assignment.schoolClassId, size: 300 }),
    assignmentApi.submissions(assignment.id),
  ]);
  const submitted = submissions || [];
  const submittedIds = new Set(submitted.map((row) => String(row.studentId ?? row.student_id)));
  const page = studentPage.content || [];
  const pageIds = new Set(page.map((student) => String(student.id)));
  let roster = page;
  if (assignment.sectionId) {
    roster = roster.filter((student) => String(student.sectionId) === String(assignment.sectionId));
  }
  const list = roster.filter((student) => submittedIds.has(String(student.id)));
  const known = new Set(list.map((student) => String(student.id)));
  for (const row of submitted) {
    const id = row.studentId ?? row.student_id;
    if (id == null || known.has(String(id)) || pageIds.has(String(id))) continue;
    known.add(String(id));
    list.push({
      id,
      name: row.studentName || row.student_name || "Student",
      admissionNo: row.admissionNo || row.admission_no || "",
      sectionName: row.sectionName || row.section_name || "",
    });
  }
  markStudents.value = list;
  markSubmissions.value = submitted;
  for (const student of list) {
    const saved = submissionFor(student.id)?.marksObtained ?? "";
    const prior = previous[student.id];
    const dirty = prior && String(prior.draft ?? "") !== String(prior.saved ?? "");
    markDrafts[student.id] = !resetDrafts && dirty ? prior.draft : saved;
  }
}

async function openMarks(assignment) {
  marking.value = assignment;
  markStudents.value = [];
  markSubmissions.value = [];
  for (const key of Object.keys(markDrafts)) delete markDrafts[key];
  marksLoading.value = true;
  try {
    await reloadMarks(assignment, true);
  } catch (e) {
    error.value = e.message;
  } finally {
    marksLoading.value = false;
  }
}

async function saveStudentMarks(student) {
  const assignment = marking.value;
  if (!assignment || !student) return;
  const next = markDrafts[student.id];
  if (next === "" || next == null) {
    error.value = "Enter a mark.";
    return;
  }
  savingMarkId.value = student.id;
  ok.value = "";
  try {
    await assignmentApi.marks(assignment.id, student.id, next);
    ok.value = `Marks saved for ${student.name}.`;
    await reloadMarks(assignment, false);
  } catch (e) {
    error.value = e.message;
  } finally {
    savingMarkId.value = null;
  }
}

function onSubmitFile(event) {
  submit.file = event.target.files?.[0] || null;
}

async function openMyFile(assignment, work, mode, doc) {
  const row = work || myWork(assignment);
  const fileName = doc?.fileName || row?.attachmentName;
  const studentId = row?.studentId || doc?.studentId;
  if (!studentId || !fileName) return;
  try {
    await assignmentApi.submissionFile(
      assignment.id,
      studentId,
      fileName,
      mode,
      doc?.submissionId || row?.id,
      doc?.id,
    );
  } catch (e) {
    error.value = e.message;
  }
}

async function addMyDocs(event) {
  const assignment = submitting.value;
  const files = [...(event.target.files || [])];
  event.target.value = "";
  if (!assignment || !files.length) return;
  try {
    let saved = null;
    for (const file of files) {
      saved = await assignmentApi.attachMine(assignment.id, file);
    }
    if (saved) rememberWork(assignment.id, { ...saved, assignmentId: assignment.id });
    rows.value = attachMine(rows.value, [saved].filter(Boolean));
    syncOpen(assignment.id, submitting);
    await load().catch(() => {});
    syncOpen(assignment.id, submitting);
    ok.value = files.length === 1 ? "Document attached." : `${files.length} documents attached.`;
  } catch (e) {
    error.value = e.message;
  }
}

async function submitWork() {
  const assignment = submitting.value;
  if (!assignment) return;
  ok.value = "";
  try {
    const saved = await assignmentApi.submit(assignment.id, submit.file, submit.notes);
    const work = rememberWork(assignment.id, {
      ...saved,
      assignmentId: saved?.assignmentId ?? saved?.assignment_id ?? assignment.id,
      notes: saved?.notes || submit.notes,
      attachmentName: (saved?.attachmentName ?? saved?.attachment_name) || submit.file?.name || "",
      studentId: saved?.studentId ?? saved?.student_id,
      submittedAt: saved?.submittedAt ?? saved?.submitted_at ?? new Date().toISOString(),
      attempt: saved?.attempt,
    });
    closeNewSubmission();
    rows.value = attachMine(rows.value, [work]);
    await load().catch(() => {});
    syncOpen(assignment.id, submitting);
    ok.value = "Assignment submitted.";
  } catch (e) {
    error.value = e.message;
  }
}

onMounted(async () => {
  try { await load(); } catch (e) { error.value = e.message; }
});
</script>

<template>
  <section class="page">
    <div class="page-head">
      <div>
        <h1>Assignments</h1>
        <p class="sub">Homework and continuous assessment</p>
      </div>
      <div class="head-actions">
        <ListSearch v-model="query" placeholder="Search assignments" />
        <button v-if="canCreate" class="btn add-btn" type="button" @click="openAdd">
          <Icon name="plus" />
          Add assignment
        </button>
      </div>
    </div>
    <p v-if="canWrite && !canCreate" class="sub">Only the allocated teacher of a subject for a class can create assignments.</p>
    <p v-if="!filteredRows.length" class="empty">{{ query.trim() ? "No assignments match that search." : "No assignments yet." }}</p>
    <article v-for="a in filteredRows" :key="a.id" class="glass card assignment-card">
      <div class="assignment-row">
        <div class="assignment-main">
          <h3>{{ a.title }}</h3>
          <p class="sub">{{ a.subjectName }} · {{ a.schoolClassName }} {{ a.sectionName || "" }}</p>
          <p class="posted-by">
            <Icon name="user" />
            Posted by {{ a.teacherName || "Unknown teacher" }}
          </p>
          <p v-if="a.instructions" class="assignment-notes">{{ a.instructions }}</p>
          <p v-if="canWrite && teachesAssignment(a) && !isAcademicOfficer && !isDraft(a)" class="sub">
            Locked or published. Only the academic master can edit or delete this assignment.
          </p>
        </div>
        <div class="assignment-controls">
          <div class="assignment-status">
            <span :class="statusChip(a.status)">{{ statusLabel(a.status) }}</span>
            <span class="chip">Due {{ a.dueDate }}</span>
            <span v-if="(isStudent || isParent) && myWork(a)" class="chip chip-gold">Submitted</span>
          </div>
          <div v-if="showActions(a)" class="row-actions wrap">
            <button
              v-if="canMutate(a)"
              class="icon-btn"
              type="button"
              :aria-label="`Edit ${a.title}`"
              title="Edit assignment"
              @click="openEdit(a)"
            >
              <Icon name="pen" />
            </button>
            <button
              v-if="canLock(a)"
              class="btn btn-ghost"
              type="button"
              title="Lock this assignment when it is ready to publish"
              v-confirm="{ message: `Lock ${a.title}? Teachers will not be able to edit or delete it.`, confirmLabel: 'Lock' }"
              @click="lockAssignment(a)"
            >
              <Icon name="lock" />
              Lock
            </button>
            <button
              v-if="canPublish(a)"
              class="btn btn-teal publish-btn"
              type="button"
              title="Publish this assignment to students and parents"
              v-confirm="{ message: `Publish ${a.title}? Students and parents will see it.`, confirmLabel: 'Publish' }"
              @click="publishAssignment(a)"
            >
              Publish
            </button>
            <button
              v-if="canMutate(a)"
              class="icon-btn"
              type="button"
              :aria-label="`Delete ${a.title}`"
              title="Delete assignment"
              v-confirm="{ message: `Delete ${a.title}? This cannot be undone.`, confirmLabel: 'Delete', danger: true }"
              @click="removeAssignment(a)"
            >
              <Icon name="trash" />
            </button>
          </div>
        </div>
      </div>
      <div class="card-tools">
        <button
          class="btn btn-teal docs-btn"
          type="button"
          :title="documentCountLabel(a)"
          @click="openDocs(a)"
        >
          <Icon name="book" />
          Documents
          <span class="tool-count">{{ documents(a).length }}</span>
        </button>
        <button
          v-if="showSubmissions(a)"
          class="btn btn-teal docs-btn"
          type="button"
          :title="submissionsLabel(a)"
          @click="openSubmissions(a)"
        >
          <Icon name="list" />
          Submissions
          <span v-if="isStudent || isParent" class="tool-count">{{ historyOf(a).length }}</span>
        </button>
      </div>
    </article>

    <Teleport to="body">
      <div v-if="creating" class="form-scrim" role="presentation" @click.self="closeAdd">
        <form
          class="glass card form-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="assignment-form-title"
          :data-confirm="editingId ? 'Save changes to this assignment?' : 'Save this assignment as a draft?'"
          @submit.prevent="save"
        >
          <div class="form-head">
            <div>
              <h3 id="assignment-form-title">{{ editingId ? "Edit assignment" : "Add assignment" }}</h3>
              <p class="sub">{{ editingId ? "Update the class, due date, or instructions." : "Saved as a draft. Lock it when it is ready, then publish." }}</p>
            </div>
            <button class="btn btn-ghost" type="button" @click="closeAdd">Close</button>
          </div>
          <div class="grid grid-2">
            <label class="field"><span>Class</span>
              <select v-model="form.schoolClassId" required @change="onClass">
                <option disabled value="">Choose</option>
                <option v-for="c in formClasses" :key="c.id" :value="c.id">{{ c.name }}</option>
              </select>
            </label>
            <label class="field"><span>Section</span>
              <select v-model="form.sectionId">
                <option value="">Whole class</option>
                <option v-for="s in sections" :key="s.id" :value="s.id">{{ s.name }}</option>
              </select>
            </label>
            <label class="field"><span>Subject</span>
              <select v-model="form.subjectId" required>
                <option disabled value="">Choose</option>
                <option v-for="s in formSubjects" :key="s.id" :value="s.id">{{ s.name }}</option>
              </select>
            </label>
            <label class="field"><span>Due</span><input v-model="form.dueDate" type="date" required /></label>
            <label class="field span-2"><span>Title</span><input v-model="form.title" required /></label>
          </div>
          <label class="field instructions">
            <span>Instructions</span>
            <textarea v-model="form.instructions" rows="6" maxlength="2000" placeholder="What students should do"></textarea>
          </label>
          <div class="row-actions form-footer">
            <button class="btn">{{ editingId ? "Save changes" : "Save draft" }}</button>
            <button class="btn btn-ghost" type="button" @click="closeAdd">Cancel</button>
          </div>
        </form>
      </div>

      <div v-if="marking" class="form-scrim" role="presentation" @click.self="closeMarks">
        <div
          class="glass card form-modal marks-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="ca-marks-title"
        >
          <div class="form-head">
            <div>
              <h3 id="ca-marks-title">Submissions</h3>
              <p class="sub">{{ marking.title }} · {{ marking.subjectName }} · {{ marking.schoolClassName }} {{ marking.sectionName || "" }}</p>
            </div>
            <div class="form-head-tools">
              <button
                class="icon-btn"
                type="button"
                title="Refresh"
                aria-label="Refresh submissions"
                :disabled="refreshing === 'submissions'"
                @click="refreshSubmissions"
              >
                <Icon name="refresh" :class="{ spin: refreshing === 'submissions' }" />
              </button>
              <button class="btn btn-ghost" type="button" @click="closeMarks">Close</button>
            </div>
          </div>
          <p v-if="marksLoading" class="empty">Loading submissions…</p>
          <p v-else-if="!markStudents.length" class="empty">No submissions yet.</p>
          <ul v-else class="entity-list mark-list">
            <li v-for="student in markStudents" :key="student.id" class="entity-item">
              <div>
                <strong>{{ student.name }}</strong>
                <span class="sub">{{ student.admissionNo || "No admission no" }}<template v-if="student.sectionName"> · {{ student.sectionName }}</template></span>
                <span v-if="submissionsFor(student.id).length" class="sub">
                  {{ submissionsFor(student.id).length }} attempt{{ submissionsFor(student.id).length === 1 ? "" : "s" }}
                  <template v-if="submissionFor(student.id)?.attachmentName"> · latest {{ submissionFor(student.id).attachmentName }}</template>
                </span>
                <span v-for="row in submissionsFor(student.id).slice(0, 3)" :key="row.id || row.submittedAt" class="attempt-line">
                  <span class="attempt-label">Attempt {{ row.attempt || "" }}</span>
                  <span class="sub">{{ formatWhen(row.submittedAt) }}<template v-if="row.notes"> · {{ row.notes }}</template></span>
                </span>
                <div v-if="submissionFor(student.id)?.attachmentName" class="doc-actions">
                  <button
                    class="btn btn-ghost view-doc"
                    type="button"
                    @click="openMyFile(marking, submissionFor(student.id), 'view')"
                  >
                    <Icon name="eye" />
                    View
                  </button>
                  <button
                    class="btn btn-ghost view-doc"
                    type="button"
                    @click="openMyFile(marking, submissionFor(student.id), 'download')"
                  >
                    <Icon name="download" />
                    Download
                  </button>
                </div>
              </div>
              <div v-if="canEnterMarks(marking)" class="mark-save">
                <label class="field mark-field">
                  <span>Marks</span>
                  <input v-model="markDrafts[student.id]" type="number" min="0" step="0.5" />
                </label>
                <button
                  class="btn"
                  type="button"
                  :disabled="savingMarkId === student.id"
                  v-confirm="`Save marks for ${student.name}?`"
                  @click="saveStudentMarks(student)"
                >
                  {{ savingMarkId === student.id ? "Saving…" : "Save marks" }}
                </button>
              </div>
            </li>
          </ul>
          <div v-if="!marksLoading" class="row-actions form-footer">
            <button class="btn btn-ghost" type="button" @click="closeMarks">Done</button>
          </div>
        </div>
      </div>

      <div v-if="reviewing" class="form-scrim" role="presentation" @click.self="closeReview">
        <div
          class="glass card form-modal docs-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="parent-submissions-title"
        >
          <div class="form-head">
            <div>
              <h3 id="parent-submissions-title">Submissions</h3>
              <p class="sub">{{ reviewing.title }} · {{ reviewing.subjectName }} · {{ reviewing.schoolClassName }} {{ reviewing.sectionName || "" }}</p>
            </div>
            <div class="form-head-tools">
              <button
                class="icon-btn"
                type="button"
                title="Refresh"
                aria-label="Refresh submissions"
                :disabled="refreshing === 'submissions'"
                @click="refreshSubmissions"
              >
                <Icon name="refresh" :class="{ spin: refreshing === 'submissions' }" />
              </button>
              <button class="btn btn-ghost" type="button" @click="closeReview">Close</button>
            </div>
          </div>
          <ul v-if="childRows(reviewing).length" class="entity-list mark-list">
            <li v-for="child in childRows(reviewing)" :key="child.id" class="entity-item">
              <div>
                <strong>{{ child.name }}</strong>
                <span v-if="child.admissionNo" class="sub">{{ child.admissionNo }}</span>
                <template v-if="child.work.length">
                  <span class="sub">
                    {{ child.work.length }} attempt{{ child.work.length === 1 ? "" : "s" }}
                    · latest {{ formatWhen(child.work[0].submittedAt) }}
                  </span>
                  <p v-if="child.work[0].notes" class="assignment-notes">{{ child.work[0].notes }}</p>
                  <p v-else class="empty-docs">No notes.</p>
                  <p v-if="child.work[0].marksObtained != null" class="sub">Marks: {{ child.work[0].marksObtained }}</p>
                  <ul v-if="documentsOf(child.work).length" class="docs docs-form-list">
                    <li v-for="doc in documentsOf(child.work)" :key="doc.id || doc.fileName">
                      <div>
                        <span class="doc-name">{{ doc.fileName }}</span>
                        <p v-if="doc.attempt" class="attempt-label">Attempt {{ doc.attempt }}</p>
                      </div>
                      <div class="doc-actions">
                        <button class="btn btn-ghost view-doc" type="button" @click="openMyFile(reviewing, child.work[0], 'view', doc)">
                          <Icon name="eye" />
                          View
                        </button>
                        <button class="btn btn-ghost view-doc" type="button" @click="openMyFile(reviewing, child.work[0], 'download', doc)">
                          <Icon name="download" />
                          Download
                        </button>
                      </div>
                    </li>
                  </ul>
                  <div v-if="child.work.length > 1" class="attempt-history">
                    <h5>Previous attempts</h5>
                    <ul class="docs">
                      <li v-for="row in child.work.slice(1)" :key="row.id || row.submittedAt">
                        <div>
                          <span class="attempt-line">
                            <span class="attempt-label">Attempt {{ row.attempt || "" }}</span>
                            <span class="sub">{{ formatWhen(row.submittedAt) }}</span>
                          </span>
                          <p v-if="row.notes" class="assignment-notes">{{ row.notes }}</p>
                          <p v-if="row.marksObtained != null" class="sub">Marks: {{ row.marksObtained }}</p>
                        </div>
                      </li>
                    </ul>
                  </div>
                </template>
                <p v-else class="empty-docs">Not submitted yet.</p>
              </div>
            </li>
          </ul>
          <p v-else class="empty-docs">No children linked to this assignment.</p>
          <div class="row-actions form-footer">
            <button class="btn btn-ghost" type="button" @click="closeReview">Done</button>
          </div>
        </div>
      </div>

      <div v-if="docsFor" class="form-scrim" role="presentation" @click.self="closeDocs">
        <div
          class="glass card form-modal docs-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="assignment-docs-title"
        >
          <div class="form-head">
            <div>
              <h3 id="assignment-docs-title">Documents</h3>
              <p class="sub">{{ docsFor.title }} · {{ documentCountLabel(docsFor) }}</p>
            </div>
            <div class="form-head-tools">
              <button
                class="icon-btn"
                type="button"
                title="Refresh"
                aria-label="Refresh documents"
                :disabled="refreshing === 'docs'"
                @click="refreshDocs"
              >
                <Icon name="refresh" :class="{ spin: refreshing === 'docs' }" />
              </button>
              <button class="btn btn-ghost" type="button" @click="closeDocs">Close</button>
            </div>
          </div>
          <ul v-if="documents(docsFor).length" class="docs docs-form-list">
            <li v-for="doc in documents(docsFor)" :key="doc.id || doc.fileName">
              <span class="doc-name">{{ doc.fileName }}</span>
              <div class="doc-actions">
                <button
                  class="btn btn-ghost view-doc"
                  type="button"
                  :title="`View ${doc.fileName}`"
                  @click="openAttachment(docsFor, doc, 'view')"
                >
                  <Icon name="eye" />
                  View
                </button>
                <button
                  class="btn btn-ghost view-doc"
                  type="button"
                  :title="`Download ${doc.fileName}`"
                  @click="openAttachment(docsFor, doc, 'download')"
                >
                  <Icon name="download" />
                  Download
                </button>
                <button
                  v-if="canMutate(docsFor) && doc.id"
                  class="icon-btn"
                  type="button"
                  :aria-label="`Remove ${doc.fileName}`"
                  title="Remove document"
                  v-confirm="{ message: `Remove ${doc.fileName} from this assignment?`, confirmLabel: 'Remove', danger: true }"
                  @click="removeFile(docsFor, doc)"
                >
                  <Icon name="trash" />
                </button>
              </div>
            </li>
          </ul>
          <p v-else class="empty-docs">No documents attached.</p>
          <div class="row-actions form-footer">
            <label v-if="canMutate(docsFor)" class="btn docs-add-btn">
              <Icon name="plus" />
              Add document
              <input type="file" multiple :accept="ATTACH_ACCEPT" @change="attach(docsFor.id, $event)" />
            </label>
            <button class="btn btn-ghost" type="button" @click="closeDocs">Done</button>
          </div>
        </div>
      </div>

      <div v-if="submitting" class="form-scrim" role="presentation" @click.self="closeSubmit">
        <div
          class="glass card form-modal docs-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="submit-work-title"
        >
          <div class="form-head">
            <div>
              <h3 id="submit-work-title">Submissions</h3>
              <p class="sub">{{ submitting.title }} · due {{ submitting.dueDate }}</p>
            </div>
            <div class="form-head-tools">
              <button
                class="icon-btn"
                type="button"
                title="Refresh"
                aria-label="Refresh submissions"
                :disabled="refreshing === 'submissions'"
                @click="refreshSubmissions"
              >
                <Icon name="refresh" :class="{ spin: refreshing === 'submissions' }" />
              </button>
              <button class="btn btn-ghost" type="button" @click="closeSubmit">Close</button>
            </div>
          </div>
          <div class="your-work-summary">
            <div class="documents-head">
              <div>
                <h4>Your work</h4>
                <p class="sub">{{ myWork(submitting) ? `${historyOf(submitting).length} attempt${historyOf(submitting).length === 1 ? "" : "s"} · latest ${submittedWhen(submitting)}` : "Not submitted yet" }}</p>
              </div>
              <span v-if="myWork(submitting)" class="attempt-label">{{ historyOf(submitting).length > 1 ? `Attempt ${myWork(submitting).attempt || historyOf(submitting).length}` : "Submitted" }}</span>
            </div>
            <template v-if="myWork(submitting)">
              <p v-if="myWork(submitting).notes" class="assignment-notes">{{ myWork(submitting).notes }}</p>
              <p v-else class="empty-docs">No notes.</p>
              <p v-if="myWork(submitting).marksObtained != null" class="sub">Marks: {{ myWork(submitting).marksObtained }}</p>
              <div v-if="historyOf(submitting).length > 1" class="attempt-history">
                <h5>Previous attempts</h5>
                <ul class="docs">
                  <li v-for="row in historyOf(submitting).slice(1)" :key="row.id || row.submittedAt">
                    <div>
                      <span class="attempt-line">
                        <span class="attempt-label">Attempt {{ row.attempt || "" }}</span>
                        <span class="sub">{{ formatWhen(row.submittedAt) }}</span>
                      </span>
                      <p v-if="row.notes" class="assignment-notes">{{ row.notes }}</p>
                      <p v-else class="empty-docs">No notes.</p>
                      <p v-if="row.marksObtained != null" class="sub">Marks: {{ row.marksObtained }}</p>
                    </div>
                  </li>
                </ul>
              </div>
            </template>
            <p v-else class="empty-docs">You have not submitted this assignment yet.</p>
            <h4>Your documents</h4>
            <ul v-if="myDocuments(submitting).length" class="docs docs-form-list">
              <li v-for="doc in myDocuments(submitting)" :key="doc.id || doc.fileName">
                <div>
                  <span class="doc-name">{{ doc.fileName }}</span>
                  <p v-if="doc.attempt" class="attempt-label">Attempt {{ doc.attempt }}</p>
                </div>
                <div class="doc-actions">
                  <button class="btn btn-ghost view-doc" type="button" @click="openMyFile(submitting, null, 'view', doc)">
                    <Icon name="eye" />
                    View
                  </button>
                  <button class="btn btn-ghost view-doc" type="button" @click="openMyFile(submitting, null, 'download', doc)">
                    <Icon name="download" />
                    Download
                  </button>
                </div>
              </li>
            </ul>
            <p v-else class="empty-docs">No documents attached yet.</p>
            <label class="btn docs-add-btn">
              <Icon name="plus" />
              Add document
              <input type="file" multiple :accept="ATTACH_ACCEPT" @change="addMyDocs" />
            </label>
          </div>
          <div class="row-actions form-footer">
            <button class="btn" type="button" @click="openNewSubmission">
              <Icon name="plus" />
              Add submission
            </button>
            <button class="btn btn-ghost" type="button" @click="closeSubmit">Done</button>
          </div>
        </div>
      </div>

      <div v-if="composing && submitting" class="form-scrim compose-scrim" role="presentation" @click.self="closeNewSubmission">
        <form
          class="glass card form-modal docs-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="new-submission-title"
          data-confirm="Submit this assignment?"
          @submit.prevent="submitWork"
        >
          <div class="form-head">
            <div>
              <h3 id="new-submission-title">New submission</h3>
              <p class="sub">{{ submitting.title }} · due {{ submitting.dueDate }}</p>
            </div>
            <button class="btn btn-ghost" type="button" @click="closeNewSubmission">Close</button>
          </div>
          <label class="field submit-notes">
            <span>Notes</span>
            <textarea v-model="submit.notes" rows="6" maxlength="2000" placeholder="What you completed, or anything the teacher should know"></textarea>
          </label>
          <label class="field">
            <span>File (document or image)</span>
            <input :key="composeKey" type="file" :accept="ATTACH_ACCEPT" @change="onSubmitFile" />
          </label>
          <div class="row-actions form-footer">
            <button class="btn">Submit</button>
            <button class="btn btn-ghost" type="button" @click="closeNewSubmission">Cancel</button>
          </div>
        </form>
      </div>
    </Teleport>
  </section>
</template>

<style scoped>
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
.assignment-status {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  align-items: center;
  gap: 0.4rem;
}
.posted-by {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  margin: 0.45rem 0 0;
  color: var(--text);
  font-size: 0.92rem;
  font-weight: 600;
}
.posted-by :deep(.ico) {
  color: var(--secondary);
}
.assignment-card {
  gap: 0;
  padding: 0;
}
.assignment-row,
.documents-head,
.docs li {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: start;
  gap: 0.85rem 1rem;
}
.assignment-row {
  padding: 1.2rem 1.3rem 1.1rem;
}
.assignment-main {
  display: grid;
  gap: 0.3rem;
  min-width: 0;
}
.assignment-main h3 { margin: 0; }
.assignment-main .sub { margin: 0; }
.assignment-notes { margin: 0.35rem 0 0; }
.assignment-controls {
  display: grid;
  justify-items: end;
  align-content: start;
  gap: 0.7rem;
  max-width: 22rem;
}
.assignment-card .row-actions {
  justify-content: flex-end;
  align-items: center;
}
.assignment-card .btn,
.assignment-card .file-btn {
  min-height: 2.2rem;
  height: 2.2rem;
  padding: 0 0.95rem;
  font-size: 0.85rem;
}
.assignment-card .btn-ghost,
.assignment-card .file-btn {
  box-shadow: none;
}
.card-tools {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.65rem;
  padding: 0.9rem 1.3rem 1.15rem;
  border-top: 1px solid var(--stroke-strong);
  background: var(--inset);
}
.assignment-card .docs-btn {
  height: 2.55rem;
  min-height: 2.55rem;
  padding: 0 1.1rem;
  font-weight: 800;
}
.tool-count {
  margin-left: 0.15rem;
  font-weight: 650;
  opacity: 0.85;
}
.assignment-card .publish-btn {
  height: 2.55rem;
  min-height: 2.55rem;
  padding: 0 1.2rem;
  font-size: 0.92rem;
  font-weight: 800;
  color: #04221c;
  background: linear-gradient(135deg, #7ef0dd, var(--secondary));
  box-shadow: 0 10px 28px color-mix(in srgb, var(--secondary) 42%, transparent);
  opacity: 1;
}
.docs-add-btn {
  position: relative;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
}
.docs-add-btn input {
  position: absolute;
  inset: 0;
  opacity: 0;
  cursor: pointer;
}
.docs-modal {
  width: min(46rem, 100%);
}
.docs-form-list {
  margin: 0.4rem 0 1rem;
}
.attempt-line {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.35rem 0.5rem;
}
.attempt-label {
  display: inline-flex;
  align-items: center;
  width: fit-content;
  margin: 0;
  padding: 0.22rem 0.62rem;
  border-radius: 999px;
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: #1a1203;
  background: linear-gradient(135deg, #ffe08a, var(--primary) 50%, #d7a227);
  border: 1px solid #ffe08a;
  box-shadow: 0 6px 16px color-mix(in srgb, var(--primary) 35%, transparent);
}
.assignment-card .chip-gold {
  background: linear-gradient(135deg, #ffe08a, var(--primary) 50%, #d7a227);
  color: #1a1203;
  border-color: #ffe08a;
}
.assignment-card .btn :deep(.ico),
.assignment-card .file-btn :deep(.ico) {
  width: 1rem;
  height: 1rem;
}
.your-work-summary {
  display: grid;
  gap: 0.7rem;
  margin: 0 0 1rem;
  padding: 0.9rem 0 1rem;
  border-bottom: 1px solid var(--stroke-strong);
}
.your-work-summary h4 {
  margin: 0.4rem 0 0;
  font-size: 0.95rem;
}
.documents-head {
  align-items: center;
}
.documents-head h4 {
  margin: 0;
  font-size: 0.95rem;
}
.documents-head .sub {
  margin: 0.2rem 0 0;
}
.empty-docs {
  margin: 0;
  color: var(--muted);
  font-size: 0.9rem;
}
.attempt-history {
  display: grid;
  gap: 0.45rem;
  margin-top: 0.7rem;
}
.attempt-history h5 {
  margin: 0;
  font-size: 0.88rem;
}
.file-btn { position: relative; cursor: pointer; display: inline-flex; align-items: center; }
.file-btn input { position: absolute; inset: 0; opacity: 0; cursor: pointer; }
.docs {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.docs li {
  align-items: center;
  min-width: 0;
  padding: 0.55rem 0;
  border: 0;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 0;
  background: transparent;
}
.docs li:first-child {
  border-top: 0;
  padding-top: 0;
}
.doc-name {
  min-width: 0;
  overflow-wrap: anywhere;
  font-size: 0.92rem;
  font-weight: 600;
}
.doc-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  flex-wrap: wrap;
  gap: 0.4rem;
}
.instructions { margin: 0.85rem 0 1rem; }
.instructions textarea {
  min-height: 9rem;
  resize: vertical;
  line-height: 1.45;
}
.span-2 { grid-column: 1 / -1; }
.compose-scrim { z-index: 80; }
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
  width: min(44rem, 100%);
  margin: auto 0;
}
.marks-modal { width: min(48rem, 100%); }
.form-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
  margin-bottom: 0.7rem;
}
.form-head h3 { margin: 0; }
.form-head-tools {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  flex: 0 0 auto;
}
.form-head-tools .icon-btn:disabled {
  opacity: 0.65;
  cursor: wait;
}
.form-head-tools :deep(.spin) {
  animation: spin 0.7s linear infinite;
}
@keyframes spin {
  to { transform: rotate(360deg); }
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
.submit-notes textarea {
  min-height: 10rem;
  resize: vertical;
  line-height: 1.45;
}
.mark-list { margin-top: 0.4rem; }
.mark-save {
  display: flex;
  align-items: flex-end;
  gap: 0.55rem;
}
.mark-save .btn {
  margin: 0;
  min-height: 2.4rem;
  padding: 0.45rem 0.8rem;
  font-size: 0.82rem;
}
.mark-field {
  margin: 0;
  min-width: 7rem;
}
.mark-field input { width: 6.5rem; }
@media (max-width: 720px) {
  .assignment-row,
  .documents-head,
  .docs li {
    grid-template-columns: 1fr;
  }
  .assignment-status,
  .assignment-controls,
  .assignment-card .row-actions,
  .doc-actions {
    justify-content: flex-start;
    justify-items: start;
  }
}
</style>
