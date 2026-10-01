<script setup>
import { computed, nextTick, onMounted, onUnmounted, reactive, ref, watch } from "vue";
import { academicApi, curriculumApi, peopleApi, asList } from "../../api/endpoints";
import Icon from "../../components/Icon.vue";
import ListSearch from "../../components/ListSearch.vue";
import { useAuthStore } from "../../stores/auth";
import { useConfirmStore } from "../../stores/confirm";
import { matchesSearch } from "../../utils/listSearch";
import { useFeedback } from "../../composables/useFeedback";


const auth = useAuthStore();
const confirm = useConfirmStore();
const canManage = ["HEADMASTER", "SCHOOL_ADMIN", "ACADEMIC_MASTER"].includes(auth.role);
const canManageBuildings = ["HEADMASTER", "SCHOOL_ADMIN"].includes(auth.role);
const canManageGrading = ["HEADMASTER", "ACADEMIC_MASTER"].includes(auth.role);

const TABS = [
  { id: "years", label: "Years & terms" },
  { id: "classes", label: "Classes" },
  { id: "subjects", label: "Subjects" },
  { id: "rooms", label: "Rooms" },
  { id: "teachers", label: "Teachers" },
  { id: "results", label: "Results" },
  { id: "grading", label: "Grading" },
];

const tab = ref("years");
const query = ref("");
const panel = ref("");
const formEl = ref(null);
const years = ref([]);
const classes = ref([]);
const sections = ref([]);
const subjects = ref([]);
const classrooms = ref([]);
const buildings = ref([]);
const teachers = ref([]);
const allocations = ref([]);
const { error } = useFeedback();
const sectionStudents = ref(null);
const editingClassroomId = ref(null);
const editingBuildingId = ref(null);
const editingYearId = ref(null);
const editingTermId = ref(null);
const editingSubjectId = ref(null);
const editingTopicId = ref(null);
const editingAllocId = ref(null);
const yearForm = reactive({ name: "", startDate: "", endDate: "", currentYear: true });
const classForm = reactive({ academicYearId: "", name: "", code: "", displayOrder: 1 });
const sectionForm = reactive({ schoolClassId: "", name: "A", capacity: 40, classTeacherId: "" });
const subjectForm = reactive({ name: "", code: "", description: "" });
const classroomForm = reactive({ name: "", code: "", capacity: "", buildingId: "", notes: "" });
const buildingForm = reactive({ name: "", notes: "" });
const allocForm = reactive({ teacherId: "", subjectId: "", schoolClassId: "", academicYearId: "", sectionId: "" });
const terms = ref([]);
const weights = ref([]);
const bands = ref([]);
const termForm = reactive({ academicYearId: "", name: "Term 1", startDate: "", endDate: "", currentTerm: true });
const weightForm = reactive({
  academicYearId: "", academicTermId: "", subjectId: "",
  midtermWeight: 10, semiExamWeight: 90, semiResultWeight: 50, terminalExamWeight: 50,
});
const bandForm = reactive({ letter: "", minPercent: "", maxPercent: "", points: "" });
const editingBandIndex = ref(null);
const topics = ref([]);
const topicForm = reactive({ subjectId: "", schoolClassId: "", title: "", objectives: "", sortOrder: 1 });
const focusYearId = ref("");

const allocSections = computed(() =>
  sections.value.filter((s) => !allocForm.schoolClassId || String(s.schoolClassId) === String(allocForm.schoolClassId)),
);
const currentYear = computed(() => years.value.find((y) => y.currentYear) || years.value[0] || null);
const focusTerms = computed(() => {
  if (!focusYearId.value) return terms.value;
  return terms.value.filter((t) => String(t.academicYearId) === String(focusYearId.value) || String(t.academicYearName) === yearName(focusYearId.value));
});
const classesWithSections = computed(() =>
  classes.value.map((c) => ({
    ...c,
    yearLabel: c.academicYearName || yearName(c.academicYearId),
    sections: sections.value.filter((s) => String(s.schoolClassId) === String(c.id)),
  })),
);
const visibleYears = computed(() => years.value.filter((y) => matchesSearch(query.value, y.name, y.startDate, y.endDate)));
const visibleTerms = computed(() => focusTerms.value.filter((t) => matchesSearch(query.value, t.name, t.startDate, t.endDate)));
const visibleClasses = computed(() => classesWithSections.value.filter((c) =>
  matchesSearch(query.value, c.name, c.code, c.yearLabel, ...(c.sections || []).map((s) => s.name)),
));
const visibleSubjects = computed(() => subjects.value.filter((s) => matchesSearch(query.value, s.name, s.code)));
const visibleTopics = computed(() => topics.value.filter((t) => matchesSearch(query.value, t.title, t.objectives, t.subjectName, t.schoolClassName)));
const visibleRooms = computed(() => classrooms.value.filter((r) => matchesSearch(query.value, r.name, r.code, r.building)));
const visibleBuildings = computed(() => buildings.value.filter((b) => matchesSearch(query.value, b.name, b.notes)));
const visibleAllocations = computed(() => allocations.value.filter((a) =>
  matchesSearch(query.value, a.teacherName, a.subjectName, a.schoolClassName, a.sectionName, yearName(a.academicYearId)),
));
const visibleBands = computed(() => bands.value.filter((b) =>
  matchesSearch(query.value, b.letter, `${b.minPercent}-${b.maxPercent}`, b.points),
));
const bandsSaved = computed(() => bands.value.some((b) => b.id != null));
const panelTitle = computed(() => {
  switch (panel.value) {
    case "year": return editingYearId.value ? "Edit year" : "Add year";
    case "term": return editingTermId.value ? "Edit term" : "Add term";
    case "class": return "Add class";
    case "section": return "Add section";
    case "subject": return editingSubjectId.value ? "Edit subject" : "Add subject";
    case "topic": return editingTopicId.value ? "Edit curriculum topic" : "Add curriculum topic";
    case "classroom": return editingClassroomId.value ? "Edit classroom" : "Add classroom";
    case "building": return editingBuildingId.value ? "Edit building" : "Add building";
    case "alloc": return editingAllocId.value ? "Edit teacher allocation" : "Allocate teacher";
    case "band": return editingBandIndex.value != null ? "Edit grading band" : "Add grading band";
    default: return "";
  }
});
const panelConfirm = computed(() => {
  switch (panel.value) {
    case "year": return editingYearId.value ? "Save changes to this year?" : "Add this academic year?";
    case "term": return editingTermId.value ? "Save changes to this term?" : "Add this term?";
    case "class": return "Add this class?";
    case "section": return "Add this section?";
    case "subject": return editingSubjectId.value ? "Save changes to this subject?" : "Add this subject?";
    case "topic": return editingTopicId.value ? "Save changes to this topic?" : "Add this curriculum topic?";
    case "classroom": return editingClassroomId.value ? "Save changes to this classroom?" : "Add this classroom?";
    case "building": return editingBuildingId.value ? "Save changes to this building?" : "Add this building?";
    case "alloc": return editingAllocId.value ? "Save changes to this allocation?" : "Allocate this teacher?";
    case "band": return editingBandIndex.value != null ? "Save this grading band for this school?" : "Add this grading band for this school?";
    default: return "";
  }
});

function yearName(id) {
  return years.value.find((y) => String(y.id) === String(id))?.name || "";
}

function closePanel() {
  if (confirm.open) return;
  panel.value = "";
  resetClassroomForm();
  resetBuildingForm();
  resetYearForm();
  resetTermForm();
  resetSubjectForm();
  resetTopicForm();
  resetAllocForm();
  resetBandForm();
}

function openPanel(kind, extras = {}) {
  error.value = "";
  if (kind === "class" && currentYear.value && !classForm.academicYearId) {
    classForm.academicYearId = String(currentYear.value.id);
  }
  if (kind === "year" && !extras.edit) {
    resetYearForm();
  }
  if (kind === "term" && !extras.edit) {
    resetTermForm();
    termForm.academicYearId = String(extras.yearId || focusYearId.value || currentYear.value?.id || "");
  }
  if (kind === "section" && extras.classId) {
    sectionForm.schoolClassId = String(extras.classId);
  }
  if (kind === "alloc" && !extras.edit) {
    resetAllocForm();
    if (currentYear.value && !allocForm.academicYearId) {
      allocForm.academicYearId = String(currentYear.value.id);
    }
  }
  if (kind === "classroom" && !extras.edit) {
    resetClassroomForm();
  }
  if (kind === "building" && !extras.edit) {
    resetBuildingForm();
  }
  if (kind === "subject" && !extras.edit) {
    resetSubjectForm();
  }
  if (kind === "topic" && !extras.edit) {
    resetTopicForm();
  }
  if (kind === "band" && !extras.edit) {
    resetBandForm();
  }
  panel.value = kind;
}

async function loadAllocations() {
  allocations.value = asList(await academicApi.allocations());
}

async function load() {
  try {
    const [yearList, classList, subjectList, classroomList, buildingList, teacherPage, allocList] = await Promise.all([
      academicApi.years(),
      academicApi.classes(),
      academicApi.subjects(),
      academicApi.classrooms(),
      academicApi.buildings().catch(() => []),
      peopleApi.teachers({ size: 100 }),
      academicApi.allocations(),
    ]);
    years.value = yearList;
    classes.value = classList;
    subjects.value = subjectList;
    classrooms.value = asList(classroomList);
    buildings.value = asList(buildingList);
    teachers.value = asList(teacherPage);
    allocations.value = asList(allocList);
    const sectionLists = await Promise.all(classList.map((c) => academicApi.sections(c.id)));
    sections.value = sectionLists.flat();
    const yearId = yearList.find((y) => y.currentYear)?.id || yearList[0]?.id;
    if (yearId) {
      if (!focusYearId.value) focusYearId.value = String(yearId);
      termForm.academicYearId = focusYearId.value;
      if (!weightForm.academicYearId) weightForm.academicYearId = String(yearId);
      terms.value = await academicApi.terms(focusYearId.value);
      weights.value = await academicApi.weights(weightForm.academicYearId || yearId);
    }
    bands.value = await academicApi.gradingBands();
    topics.value = await curriculumApi.list().catch(() => []);
  } catch (e) {
    error.value = e.message;
  }
}

async function selectYear(year) {
  focusYearId.value = String(year.id);
  termForm.academicYearId = String(year.id);
  try {
    terms.value = await academicApi.terms(year.id);
  } catch (e) {
    error.value = e.message;
  }
}

function resetYearForm() {
  yearForm.name = "";
  yearForm.startDate = "";
  yearForm.endDate = "";
  yearForm.currentYear = true;
  editingYearId.value = null;
}

function startEditYear(year) {
  editingYearId.value = year.id;
  yearForm.name = year.name || "";
  yearForm.startDate = year.startDate || "";
  yearForm.endDate = year.endDate || "";
  yearForm.currentYear = !!year.currentYear;
  openPanel("year", { edit: true });
}

async function saveYear() {
  error.value = "";
  try {
    if (editingYearId.value) {
      await academicApi.updateYear(editingYearId.value, yearForm);
    } else {
      await academicApi.createYear(yearForm);
    }
    closePanel();
    await load();
  } catch (e) {
    error.value = e.message;
  }
}

async function makeCurrentYear(year) {
  const ok = await confirm.ask({
    message: `Make ${year.name} the current year?`,
    confirmLabel: "Make current",
  });
  if (!ok) return;
  error.value = "";
  try {
    await academicApi.setCurrentYear(year.id);
    years.value = years.value.map((item) => ({
      ...item,
      currentYear: String(item.id) === String(year.id),
    }));
    await load();
  } catch (e) {
    error.value = e.message;
  }
}

async function removeYear(year) {
  error.value = "";
  try {
    await academicApi.deleteYear(year.id);
    if (String(focusYearId.value) === String(year.id)) {
      focusYearId.value = "";
    }
    await load();
  } catch (e) {
    error.value = e.message;
  }
}

async function removeTerm(term) {
  error.value = "";
  try {
    await academicApi.deleteTerm(term.id);
    await load();
  } catch (e) {
    error.value = e.message;
  }
}

async function addClass() {
  error.value = "";
  try {
    await academicApi.createClass({
      ...classForm,
      academicYearId: Number(classForm.academicYearId),
      displayOrder: Number(classForm.displayOrder),
    });
    classForm.name = "";
    classForm.code = "";
    closePanel();
    await load();
  } catch (e) {
    error.value = e.message;
  }
}

async function addSection() {
  error.value = "";
  try {
    await academicApi.createSection({
      ...sectionForm,
      schoolClassId: Number(sectionForm.schoolClassId),
      classTeacherId: sectionForm.classTeacherId ? Number(sectionForm.classTeacherId) : null,
      capacity: Number(sectionForm.capacity),
    });
    sectionForm.name = "A";
    closePanel();
    await load();
  } catch (e) {
    error.value = e.message;
  }
}

function resetSubjectForm() {
  subjectForm.name = "";
  subjectForm.code = "";
  subjectForm.description = "";
  editingSubjectId.value = null;
}

function startEditSubject(subject) {
  editingSubjectId.value = subject.id;
  subjectForm.name = subject.name || "";
  subjectForm.code = subject.code || "";
  subjectForm.description = subject.description || "";
  openPanel("subject", { edit: true });
}

async function saveSubject() {
  error.value = "";
  try {
    if (editingSubjectId.value) {
      await academicApi.updateSubject(editingSubjectId.value, subjectForm);
    } else {
      await academicApi.createSubject(subjectForm);
    }
    closePanel();
    await load();
  } catch (e) {
    error.value = e.message;
  }
}

function resetTopicForm() {
  topicForm.subjectId = "";
  topicForm.schoolClassId = "";
  topicForm.title = "";
  topicForm.objectives = "";
  topicForm.sortOrder = 1;
  editingTopicId.value = null;
}

function startEditTopic(topic) {
  editingTopicId.value = topic.id;
  topicForm.subjectId = String(topic.subjectId || "");
  topicForm.schoolClassId = topic.schoolClassId ? String(topic.schoolClassId) : "";
  topicForm.title = topic.title || "";
  topicForm.objectives = topic.objectives || "";
  topicForm.sortOrder = topic.sortOrder || 1;
  openPanel("topic", { edit: true });
}

function topicPayload() {
  return {
    subjectId: Number(topicForm.subjectId),
    schoolClassId: topicForm.schoolClassId ? Number(topicForm.schoolClassId) : null,
    title: topicForm.title,
    objectives: topicForm.objectives || null,
    sortOrder: Number(topicForm.sortOrder) || 0,
  };
}

async function saveTopic() {
  error.value = "";
  try {
    if (editingTopicId.value) {
      await curriculumApi.update(editingTopicId.value, topicPayload());
    } else {
      await curriculumApi.create(topicPayload());
    }
    closePanel();
    await load();
  } catch (e) {
    error.value = e.message;
  }
}

async function removeTopic(topic) {
  error.value = "";
  try {
    await curriculumApi.delete(topic.id);
    await load();
  } catch (e) {
    error.value = e.message;
  }
}

function resetTermForm() {
  termForm.academicYearId = "";
  termForm.name = "Term 1";
  termForm.startDate = "";
  termForm.endDate = "";
  termForm.currentTerm = true;
  editingTermId.value = null;
}

function startEditTerm(term) {
  editingTermId.value = term.id;
  termForm.academicYearId = String(term.academicYearId || focusYearId.value || "");
  termForm.name = term.name || "Term 1";
  termForm.startDate = term.startDate || "";
  termForm.endDate = term.endDate || "";
  termForm.currentTerm = !!term.currentTerm;
  openPanel("term", { edit: true });
}

function termPayload() {
  return {
    academicYearId: Number(termForm.academicYearId),
    name: termForm.name,
    startDate: termForm.startDate,
    endDate: termForm.endDate,
    currentTerm: termForm.currentTerm,
  };
}

async function saveTerm() {
  error.value = "";
  try {
    if (editingTermId.value) {
      await academicApi.updateTerm(editingTermId.value, termPayload());
    } else {
      await academicApi.createTerm(termPayload());
    }
    closePanel();
    await load();
  } catch (e) {
    error.value = e.message;
  }
}

async function saveWeights() {
  error.value = "";
  try {
    await academicApi.saveWeight({
      academicYearId: Number(weightForm.academicYearId),
      academicTermId: weightForm.academicTermId ? Number(weightForm.academicTermId) : null,
      subjectId: weightForm.subjectId ? Number(weightForm.subjectId) : null,
      midtermWeight: Number(weightForm.midtermWeight),
      semiExamWeight: Number(weightForm.semiExamWeight),
      semiResultWeight: Number(weightForm.semiResultWeight),
      terminalExamWeight: Number(weightForm.terminalExamWeight),
    });
    await load();
  } catch (e) {
    error.value = e.message;
  }
}

function resetBandForm() {
  bandForm.letter = "";
  bandForm.minPercent = "";
  bandForm.maxPercent = "";
  bandForm.points = "";
  editingBandIndex.value = null;
}

function startEditBand(band, index) {
  editingBandIndex.value = index;
  bandForm.letter = band.letter || "";
  bandForm.minPercent = String(band.minPercent ?? "");
  bandForm.maxPercent = String(band.maxPercent ?? "");
  bandForm.points = String(band.points ?? "");
  openPanel("band", { edit: true });
}

function bandRows() {
  return bands.value.map((band, index) => ({
    minPercent: Number(band.minPercent),
    maxPercent: Number(band.maxPercent),
    letter: band.letter,
    points: Number(band.points),
    sortOrder: band.sortOrder || index + 1,
  }));
}

async function persistBands(rows) {
  const saved = await academicApi.replaceGradingBands(rows.map((row, index) => ({
    ...row,
    sortOrder: index + 1,
  })));
  bands.value = saved;
}

async function saveBand() {
  error.value = "";
  try {
    const next = bandRows();
    const row = {
      minPercent: Number(bandForm.minPercent),
      maxPercent: Number(bandForm.maxPercent),
      letter: bandForm.letter.trim(),
      points: Number(bandForm.points),
      sortOrder: 0,
    };
    if (editingBandIndex.value != null && next[editingBandIndex.value]) {
      next[editingBandIndex.value] = row;
    } else {
      next.push(row);
    }
    next.sort((a, b) => b.minPercent - a.minPercent);
    await persistBands(next);
    closePanel();
  } catch (e) {
    error.value = e.message;
  }
}

async function removeBand(index) {
  error.value = "";
  try {
    await persistBands(bandRows().filter((_, i) => i !== index));
  } catch (e) {
    error.value = e.message;
  }
}

async function saveDefaultBands() {
  error.value = "";
  try {
    await persistBands(bandRows());
  } catch (e) {
    error.value = e.message;
  }
}

function resetAllocForm() {
  allocForm.teacherId = "";
  allocForm.subjectId = "";
  allocForm.schoolClassId = "";
  allocForm.academicYearId = "";
  allocForm.sectionId = "";
  editingAllocId.value = null;
}

function startEditAlloc(item) {
  editingAllocId.value = item.id;
  allocForm.teacherId = String(item.teacherId || "");
  allocForm.subjectId = String(item.subjectId || "");
  allocForm.schoolClassId = String(item.schoolClassId || "");
  allocForm.academicYearId = String(item.academicYearId || "");
  allocForm.sectionId = item.sectionId ? String(item.sectionId) : "";
  openPanel("alloc", { edit: true });
}

function allocPayload() {
  return {
    teacherId: Number(allocForm.teacherId),
    subjectId: Number(allocForm.subjectId),
    schoolClassId: Number(allocForm.schoolClassId),
    academicYearId: Number(allocForm.academicYearId),
    sectionId: allocForm.sectionId ? Number(allocForm.sectionId) : null,
  };
}

async function saveAlloc() {
  error.value = "";
  try {
    if (editingAllocId.value) {
      await academicApi.updateAllocation(editingAllocId.value, allocPayload());
    } else {
      const created = await academicApi.createAllocation(allocPayload());
      if (created?.id) {
        allocations.value = [created, ...asList(allocations.value).filter((row) => row.id !== created.id)];
      }
    }
    closePanel();
    try {
      await loadAllocations();
    } catch (e) {
      error.value = e.message;
    }
  } catch (e) {
    error.value = e.message;
  }
}

async function removeAllocation(item) {
  error.value = "";
  try {
    await academicApi.deleteAllocation(item.id);
    await load();
  } catch (e) {
    error.value = e.message;
  }
}

async function removeClass(item) {
  error.value = "";
  try {
    await academicApi.deleteClass(item.id);
    await load();
  } catch (e) {
    error.value = e.message;
  }
}

async function removeSection(item) {
  error.value = "";
  try {
    await academicApi.deleteSection(item.id);
    await load();
  } catch (e) {
    error.value = e.message;
  }
}

async function removeSubject(item) {
  error.value = "";
  try {
    await academicApi.deleteSubject(item.id);
    await load();
  } catch (e) {
    error.value = e.message;
  }
}

function classroomPayload() {
  return {
    name: classroomForm.name,
    code: classroomForm.code || null,
    capacity: classroomForm.capacity === "" || classroomForm.capacity == null ? null : Number(classroomForm.capacity),
    buildingId: classroomForm.buildingId ? Number(classroomForm.buildingId) : null,
    notes: classroomForm.notes || null,
  };
}

function resetClassroomForm() {
  classroomForm.name = "";
  classroomForm.code = "";
  classroomForm.capacity = "";
  classroomForm.buildingId = "";
  classroomForm.notes = "";
  editingClassroomId.value = null;
}

function startEditClassroom(item) {
  editingClassroomId.value = item.id;
  classroomForm.name = item.name || "";
  classroomForm.code = item.code || "";
  classroomForm.capacity = item.capacity ?? "";
  classroomForm.buildingId = item.buildingId
    ? String(item.buildingId)
    : String(buildings.value.find((b) => b.name === item.building)?.id || "");
  classroomForm.notes = item.notes || "";
  openPanel("classroom", { edit: true });
}

function resetBuildingForm() {
  buildingForm.name = "";
  buildingForm.notes = "";
  editingBuildingId.value = null;
}

function startEditBuilding(item) {
  editingBuildingId.value = item.id;
  buildingForm.name = item.name || "";
  buildingForm.notes = item.notes || "";
  openPanel("building", { edit: true });
}

async function saveBuilding() {
  error.value = "";
  try {
    const body = { name: buildingForm.name, notes: buildingForm.notes || null };
    if (editingBuildingId.value) {
      await academicApi.updateBuilding(editingBuildingId.value, body);
    } else {
      await academicApi.createBuilding(body);
    }
    resetBuildingForm();
    closePanel();
    await load();
  } catch (e) {
    error.value = e.message;
  }
}

async function removeBuilding(item) {
  error.value = "";
  try {
    await academicApi.deleteBuilding(item.id);
    if (editingBuildingId.value === item.id) {
      resetBuildingForm();
    }
    await load();
  } catch (e) {
    error.value = e.message;
  }
}

async function saveClassroom() {
  error.value = "";
  try {
    if (editingClassroomId.value) {
      await academicApi.updateClassroom(editingClassroomId.value, classroomPayload());
    } else {
      await academicApi.createClassroom(classroomPayload());
    }
    resetClassroomForm();
    closePanel();
    await load();
  } catch (e) {
    error.value = e.message;
  }
}

async function removeClassroom(item) {
  error.value = "";
  try {
    await academicApi.deleteClassroom(item.id);
    if (editingClassroomId.value === item.id) {
      resetClassroomForm();
    }
    await load();
  } catch (e) {
    error.value = e.message;
  }
}

function submitPanel() {
  switch (panel.value) {
    case "year": return saveYear();
    case "term": return saveTerm();
    case "class": return addClass();
    case "section": return addSection();
    case "subject": return saveSubject();
    case "topic": return saveTopic();
    case "classroom": return saveClassroom();
    case "building": return saveBuilding();
    case "alloc": return saveAlloc();
    case "band": return saveBand();
    default: return undefined;
  }
}

async function openSectionStudents(schoolClass, section) {
  sectionStudents.value = {
    title: `${schoolClass.name} ${section.name}`,
    rows: [],
    loading: true,
    message: "",
  };
  try {
    const rows = asList(await peopleApi.students({ classId: schoolClass.id, size: 500 }))
      .filter((student) => String(student.sectionId) === String(section.id))
      .sort((a, b) => String(a.name || "").localeCompare(String(b.name || "")));
    sectionStudents.value = {
      title: `${schoolClass.name} ${section.name}`,
      rows,
      loading: false,
      message: rows.length ? "" : `No students in ${schoolClass.name} ${section.name} yet.`,
    };
  } catch (e) {
    sectionStudents.value = {
      title: `${schoolClass.name} ${section.name}`,
      rows: [],
      loading: false,
      message: e.message,
    };
  }
}

function closeSectionStudents() {
  if (confirm.open) return;
  sectionStudents.value = null;
}

function onFormKey(event) {
  if (confirm.open || event.key !== "Escape") return;
  if (sectionStudents.value) closeSectionStudents();
  else if (panel.value) closePanel();
}

watch([panel, sectionStudents], async ([formOpen, studentsOpen]) => {
  document.body.style.overflow = formOpen || studentsOpen ? "hidden" : "";
  if (!formOpen) return;
  await nextTick();
  formEl.value?.querySelector("input:not([disabled]), select:not([disabled]), textarea")?.focus();
});

onUnmounted(() => {
  document.body.style.overflow = "";
  window.removeEventListener("keydown", onFormKey, true);
});

onMounted(() => {
  window.addEventListener("keydown", onFormKey, true);
  load();
});
</script>

<template>
  <section class="page">
    <div class="page-head">
      <div>
        <h1>Academics</h1>
        <p class="sub">Set up the school year, then classes, subjects, and who teaches what.</p>
      </div>
    </div>

    <div class="guide glass">
      <p class="guide-title">Set up in this order</p>
      <ol>
        <li>Year — terms are created automatically</li>
        <li>Term — adjust dates if needed</li>
        <li>Class</li>
        <li>Section</li>
        <li>Subject</li>
        <li>Allocate teacher</li>
      </ol>
    </div>

    <div class="stats">
      <article class="glass stat-mini"><small>Years</small><strong>{{ years.length }}</strong></article>
      <article class="glass stat-mini"><small>Classes</small><strong>{{ classes.length }}</strong></article>
      <article class="glass stat-mini"><small>Subjects</small><strong>{{ subjects.length }}</strong></article>
      <article class="glass stat-mini"><small>Allocations</small><strong>{{ allocations.length }}</strong></article>
    </div>

    <div class="tabs" role="tablist">
      <button
        v-for="item in TABS"
        :key="item.id"
        class="btn"
        :class="{ 'btn-ghost': tab !== item.id }"
        type="button"
        role="tab"
        :aria-selected="tab === item.id"
        @click="tab = item.id"
      >{{ item.label }}</button>
    </div>
    <ListSearch v-if="tab !== 'results'" v-model="query" placeholder="Search this list" />

    <div v-if="tab === 'years'" class="stack">
      <div class="glass card">
        <div class="card-head">
          <div>
            <h3>Academic years</h3>
            <p class="sub">The current year is used for admit, exams, and promotion.</p>
          </div>
          <button v-if="canManage" class="btn add-btn" type="button" @click="openPanel('year')">
            <Icon name="plus" /> Add year
          </button>
        </div>
        <p v-if="!visibleYears.length" class="empty">{{ query.trim() ? "No years match that search." : "No years yet. Add the current school year first." }}</p>
        <ul v-else class="plain-list">
          <li v-for="y in visibleYears" :key="y.id" class="row" :class="{ selected: String(y.id) === focusYearId }" @click="selectYear(y)">
            <div>
              <strong>{{ y.name }}</strong>
              <p class="sub">{{ y.startDate }} → {{ y.endDate }}</p>
            </div>
            <div class="row-actions">
              <span v-if="y.currentYear" class="chip">Current</span>
              <button
                v-else-if="canManage"
                type="button"
                class="btn btn-ghost"
                @click.stop="makeCurrentYear(y)"
              >Make current</button>
              <button
                v-if="canManage"
                class="icon-btn"
                type="button"
                :aria-label="`Edit year ${y.name}`"
                title="Edit year"
                @click.stop="startEditYear(y)"
              ><Icon name="pen" /></button>
              <button
                v-if="canManage"
                type="button"
                class="icon-btn"
                :aria-label="`Delete year ${y.name}`"
                title="Delete"
                v-confirm="{ message: `Delete year ${y.name}? Delete its terms and classes first.`, danger: true }"
                @click.stop="removeYear(y)"
              ><Icon name="trash" /></button>
            </div>
          </li>
        </ul>
      </div>
      <div class="glass card">
        <div class="card-head">
          <div>
            <h3>Terms</h3>
            <p class="sub">{{ yearName(focusYearId) || "Pick a year above" }}</p>
          </div>
          <button v-if="canManage && focusYearId" class="btn add-btn" type="button" @click="openPanel('term')">
            <Icon name="plus" /> Add term
          </button>
        </div>
        <p v-if="!visibleTerms.length" class="empty">{{ query.trim() ? "No terms match that search." : "No terms for this year yet." }}</p>
        <ul v-else class="plain-list">
          <li v-for="t in visibleTerms" :key="t.id" class="row">
            <div>
              <strong>{{ t.name }}</strong>
              <p class="sub">{{ t.startDate }} → {{ t.endDate }}</p>
            </div>
            <div class="row-actions">
              <span v-if="t.currentTerm" class="chip">Current</span>
              <button
                v-if="canManage"
                class="icon-btn"
                type="button"
                :aria-label="`Edit term ${t.name}`"
                title="Edit term"
                @click="startEditTerm(t)"
              ><Icon name="pen" /></button>
              <button
                v-if="canManage"
                type="button"
                class="icon-btn"
                :aria-label="`Delete term ${t.name}`"
                title="Delete"
                v-confirm="{ message: `Delete term ${t.name}?`, danger: true }"
                @click="removeTerm(t)"
              ><Icon name="trash" /></button>
            </div>
          </li>
        </ul>
      </div>
    </div>

    <div v-else-if="tab === 'classes'" class="stack">
      <div class="glass card">
        <div class="card-head">
          <div>
            <h3>Classes and sections</h3>
            <p class="sub">A class (Form 1) can have sections (A, B). Admit students into a section.</p>
          </div>
          <button v-if="canManage" class="btn add-btn" type="button" @click="openPanel('class')">
            <Icon name="plus" /> Add class
          </button>
        </div>
        <p v-if="!visibleClasses.length" class="empty">{{ query.trim() ? "No classes match that search." : "No classes yet. Add a year first, then a class." }}</p>
        <article v-for="c in visibleClasses" :key="c.id" class="class-block">
          <div class="row">
            <div>
              <strong>{{ c.name }}</strong>
              <p class="sub">{{ c.code }}<template v-if="c.yearLabel"> · {{ c.yearLabel }}</template></p>
            </div>
            <div v-if="canManage" class="row-actions">
              <button class="btn btn-ghost" type="button" @click="openPanel('section', { classId: c.id })">Add section</button>
              <button
                type="button"
                class="icon-btn"
                :aria-label="`Delete class ${c.name}`"
                title="Delete"
                v-confirm="{ message: `Delete class ${c.name}?`, danger: true }"
                @click="removeClass(c)"
              ><Icon name="trash" /></button>
            </div>
          </div>
          <p v-if="!c.sections.length" class="muted">No sections. Add A or B so you can admit students.</p>
          <ul v-else class="plain-list nested">
            <li v-for="s in c.sections" :key="s.id" class="row">
              <span>Section {{ s.name }}<template v-if="s.capacity"> · {{ s.capacity }} seats</template></span>
              <div class="row-actions">
                <button
                  class="btn btn-ghost"
                  type="button"
                  :aria-label="`View students in ${c.name} ${s.name}`"
                  @click="openSectionStudents(c, s)"
                >
                  <Icon name="users" /> Students
                </button>
                <button
                  v-if="canManage"
                  type="button"
                  class="icon-btn"
                  :aria-label="`Delete section ${c.name} ${s.name}`"
                  title="Delete"
                  v-confirm="{ message: `Delete section ${c.name} ${s.name}?`, danger: true }"
                  @click="removeSection(s)"
                ><Icon name="trash" /></button>
              </div>
            </li>
          </ul>
        </article>
      </div>
    </div>

    <div v-else-if="tab === 'subjects'" class="stack">
      <div class="glass card">
        <div class="card-head">
          <div>
            <h3>Subjects</h3>
            <p class="sub">Maths, English, Kiswahili — used on the timetable, exams, and allocations.</p>
          </div>
          <button v-if="canManage" class="btn add-btn" type="button" @click="openPanel('subject')">
            <Icon name="plus" /> Add subject
          </button>
        </div>
        <p v-if="!visibleSubjects.length" class="empty">{{ query.trim() ? "No subjects match that search." : "No subjects yet." }}</p>
        <ul v-else class="plain-list">
          <li v-for="s in visibleSubjects" :key="s.id" class="row">
            <span>{{ s.name }} <span class="sub">· {{ s.code }}</span></span>
            <div v-if="canManage" class="row-actions">
              <button
                class="icon-btn"
                type="button"
                :aria-label="`Edit subject ${s.name}`"
                title="Edit subject"
                @click="startEditSubject(s)"
              ><Icon name="pen" /></button>
              <button
                type="button"
                class="icon-btn"
                :aria-label="`Delete subject ${s.name}`"
                title="Delete"
                v-confirm="{ message: `Delete subject ${s.name}?`, danger: true }"
                @click="removeSubject(s)"
              ><Icon name="trash" /></button>
            </div>
          </li>
        </ul>
      </div>
      <div v-if="canManage" class="glass card">
        <div class="card-head">
          <div>
            <h3>Curriculum topics</h3>
            <p class="sub">Optional syllabus headings under a subject.</p>
          </div>
          <button class="btn add-btn" type="button" @click="openPanel('topic')">
            <Icon name="plus" /> Add topic
          </button>
        </div>
        <p v-if="!visibleTopics.length" class="empty">{{ query.trim() ? "No topics match that search." : "No topics yet." }}</p>
        <ul v-else class="plain-list">
          <li v-for="t in visibleTopics" :key="t.id" class="row">
            <div>
              <strong>{{ t.title }}</strong>
              <p class="sub">{{ t.subjectName }}<template v-if="t.schoolClassName"> · {{ t.schoolClassName }}</template></p>
              <p v-if="t.objectives" class="muted">{{ t.objectives }}</p>
            </div>
            <div class="row-actions">
              <button
                class="icon-btn"
                type="button"
                :aria-label="`Edit topic ${t.title}`"
                title="Edit topic"
                @click="startEditTopic(t)"
              ><Icon name="pen" /></button>
              <button
                class="icon-btn"
                type="button"
                :aria-label="`Delete topic ${t.title}`"
                title="Delete"
                v-confirm="{ message: `Delete topic ${t.title}?`, danger: true }"
                @click="removeTopic(t)"
              ><Icon name="trash" /></button>
            </div>
          </li>
        </ul>
      </div>
    </div>

    <div v-else-if="tab === 'rooms'" class="stack">
      <div class="glass card">
        <div class="card-head">
          <div>
            <h3>Buildings</h3>
            <p class="sub">Named by the headmaster or school admin, then picked when you add a room.</p>
          </div>
          <button v-if="canManageBuildings" class="btn add-btn" type="button" @click="openPanel('building')">
            <Icon name="plus" /> Add building
          </button>
        </div>
        <p v-if="!visibleBuildings.length" class="empty">{{ query.trim() ? "No buildings match that search." : (canManageBuildings ? "No buildings yet. Add Block A or the science block first." : "No buildings yet. Ask the headmaster or school admin to add one.") }}</p>
        <ul v-else class="plain-list">
          <li v-for="b in visibleBuildings" :key="b.id" class="row">
            <div>
              <strong>{{ b.name }}</strong>
              <p v-if="b.notes" class="muted">{{ b.notes }}</p>
            </div>
            <div v-if="canManageBuildings" class="row-actions">
              <button
                class="icon-btn"
                type="button"
                :aria-label="`Edit building ${b.name}`"
                title="Edit building"
                @click="startEditBuilding(b)"
              ><Icon name="pen" /></button>
              <button
                class="icon-btn"
                type="button"
                :aria-label="`Delete building ${b.name}`"
                title="Delete"
                v-confirm="{ message: `Delete building ${b.name}? Remove its rooms first.`, danger: true }"
                @click="removeBuilding(b)"
              ><Icon name="trash" /></button>
            </div>
          </li>
        </ul>
      </div>
      <div class="glass card">
        <div class="card-head">
          <div>
            <h3>Classrooms</h3>
            <p class="sub">Rooms for the timetable (Lab 1, Hall). Pick a building from the list above.</p>
          </div>
          <button v-if="canManage" class="btn add-btn" type="button" @click="openPanel('classroom')">
            <Icon name="plus" /> Add room
          </button>
        </div>
        <p v-if="!visibleRooms.length" class="empty">{{ query.trim() ? "No rooms match that search." : "No classrooms yet." }}</p>
        <ul v-else class="plain-list">
          <li v-for="r in visibleRooms" :key="r.id" class="row">
            <div>
              <strong>{{ r.name }}</strong>
              <p class="sub">
                <template v-if="r.code">{{ r.code }}</template>
                <template v-if="r.building"> · {{ r.building }}</template>
                <template v-if="r.capacity"> · {{ r.capacity }} seats</template>
              </p>
            </div>
            <span v-if="canManage" class="row-actions">
              <button class="icon-btn" type="button" :aria-label="`Edit ${r.name}`" title="Edit classroom" @click="startEditClassroom(r)">
                <Icon name="pen" />
              </button>
              <button
                type="button"
                class="icon-btn"
                :aria-label="`Delete classroom ${r.name}`"
                title="Delete"
                v-confirm="{ message: `Delete classroom ${r.name}?`, danger: true }"
                @click="removeClassroom(r)"
              ><Icon name="trash" /></button>
            </span>
          </li>
        </ul>
      </div>
    </div>

    <div v-else-if="tab === 'teachers'" class="stack">
      <div class="glass card">
        <div class="card-head">
          <div>
            <h3>Who teaches what</h3>
            <p class="sub">Link a teacher to a subject and class. Needed before the timetable.</p>
          </div>
          <button v-if="canManage" class="btn add-btn" type="button" @click="openPanel('alloc')">
            <Icon name="plus" /> Allocate teacher
          </button>
        </div>
        <p v-if="!visibleAllocations.length" class="empty">{{ query.trim() ? "No allocations match that search." : "No allocations yet. Add teachers and subjects first." }}</p>
        <ul v-else class="plain-list">
          <li v-for="a in visibleAllocations" :key="a.id" class="row">
            <div>
              <strong>{{ a.teacherName }}</strong>
              <p class="sub">
                {{ a.subjectName }} · {{ a.schoolClassName }}<template v-if="a.sectionName"> {{ a.sectionName }}</template>
                <template v-if="yearName(a.academicYearId)"> · {{ yearName(a.academicYearId) }}</template>
              </p>
            </div>
            <div v-if="canManage" class="row-actions">
              <button
                class="icon-btn"
                type="button"
                :aria-label="`Edit ${a.teacherName} on ${a.subjectName}`"
                title="Edit allocation"
                @click="startEditAlloc(a)"
              ><Icon name="pen" /></button>
              <button
                type="button"
                class="icon-btn"
                :aria-label="`Remove ${a.teacherName} from ${a.subjectName}`"
                title="Delete"
                v-confirm="{ message: `Remove ${a.teacherName} from ${a.subjectName}?`, confirmLabel: 'Remove', danger: true }"
                @click="removeAllocation(a)"
              ><Icon name="trash" /></button>
            </div>
          </li>
        </ul>
      </div>
    </div>

    <div v-else-if="tab === 'results'" class="stack">
      <form class="glass card" data-confirm="Save Appendix A weights?" @submit.prevent="saveWeights">
        <h3>Result weights</h3>
        <p class="sub">How midterm, semi, and terminal marks combine. Default: midterm 10% + semi exam 90% = semi result, then 50/50 with terminal.</p>
        <div class="grid grid-2">
          <label class="field"><span>Year</span>
            <select v-model="weightForm.academicYearId" required>
              <option disabled value="">Choose</option>
              <option v-for="y in years" :key="y.id" :value="y.id">{{ y.name }}</option>
            </select>
          </label>
          <label class="field"><span>Term</span>
            <select v-model="weightForm.academicTermId">
              <option value="">All terms</option>
              <option v-for="t in terms" :key="t.id" :value="t.id">{{ t.name }}</option>
            </select>
          </label>
          <label class="field"><span>Subject</span>
            <select v-model="weightForm.subjectId">
              <option value="">All subjects</option>
              <option v-for="s in subjects" :key="s.id" :value="s.id">{{ s.name }}</option>
            </select>
          </label>
          <label class="field"><span>Midterm %</span><input v-model="weightForm.midtermWeight" type="number" required /></label>
          <label class="field"><span>Semi exam %</span><input v-model="weightForm.semiExamWeight" type="number" required /></label>
          <label class="field"><span>Semi result %</span><input v-model="weightForm.semiResultWeight" type="number" required /></label>
          <label class="field"><span>Terminal %</span><input v-model="weightForm.terminalExamWeight" type="number" required /></label>
        </div>
        <button class="btn">Save weights</button>
        <ul v-if="weights.length" class="plain-list">
          <li v-for="w in weights" :key="w.id">{{ w.subjectName || "All subjects" }} · {{ w.midtermWeight }}/{{ w.semiExamWeight }} then {{ w.semiResultWeight }}/{{ w.terminalExamWeight }}</li>
        </ul>
      </form>
    </div>

    <div v-else-if="tab === 'grading'" class="stack">
      <div class="glass card">
        <div class="card-head">
          <div>
            <h3>Grading bands</h3>
            <p class="sub">These letters and mark ranges belong to this school only. Report cards and grades use them.</p>
          </div>
          <button v-if="canManageGrading" class="btn add-btn" type="button" @click="openPanel('band')">
            <Icon name="plus" /> Add band
          </button>
        </div>
        <p v-if="!bandsSaved" class="sub">A–F below is the default until this school saves its own bands.</p>
        <p v-if="!visibleBands.length" class="empty">{{ query.trim() ? "No bands match that search." : "No grading bands yet." }}</p>
        <ul v-else class="plain-list">
          <li v-for="b in visibleBands" :key="b.id || `${b.letter}-${b.minPercent}`" class="row">
            <div>
              <strong>{{ b.letter }}</strong>
              <p class="sub">{{ b.minPercent }}–{{ b.maxPercent }}% · {{ b.points }} points</p>
            </div>
            <div v-if="canManageGrading" class="row-actions">
              <button
                class="icon-btn"
                type="button"
                :aria-label="`Edit band ${b.letter}`"
                title="Edit band"
                @click="startEditBand(b, bands.indexOf(b))"
              ><Icon name="pen" /></button>
              <button
                class="icon-btn"
                type="button"
                :aria-label="`Delete band ${b.letter}`"
                title="Delete"
                v-confirm="{ message: `Delete band ${b.letter}?`, danger: true }"
                @click="removeBand(bands.indexOf(b))"
              ><Icon name="trash" /></button>
            </div>
          </li>
        </ul>
        <div v-if="canManageGrading && !bandsSaved && bands.length" class="row-actions" style="margin-top: 0.85rem;">
          <button
            class="btn"
            type="button"
            v-confirm="'Save these default bands for this school?'"
            @click="saveDefaultBands"
          >Save for this school</button>
        </div>
      </div>
    </div>

    <Teleport to="body">
      <div
        v-if="panel"
        class="form-scrim"
        role="presentation"
        @click.self="closePanel"
      >
        <form
          ref="formEl"
          class="glass card form-modal"
          role="dialog"
          aria-modal="true"
          :aria-labelledby="'academics-form-title'"
          :data-confirm="panelConfirm"
          @submit.prevent="submitPanel"
        >
          <div class="form-head">
            <h3 id="academics-form-title">{{ panelTitle }}</h3>
            <button class="btn btn-ghost" type="button" @click="closePanel">Close</button>
          </div>

          <template v-if="panel === 'year'">
            <label class="field"><span>Name</span><input v-model="yearForm.name" required placeholder="2026/2027" /></label>
            <label class="field"><span>Start</span><input v-model="yearForm.startDate" type="date" required /></label>
            <label class="field"><span>End</span><input v-model="yearForm.endDate" type="date" required /></label>
            <p v-if="!editingYearId" class="sub">Terms are created automatically from this organization's 2- or 4-term setting.</p>
          </template>

          <template v-else-if="panel === 'term'">
            <label class="field"><span>Year</span>
              <select v-model="termForm.academicYearId" required>
                <option disabled value="">Choose</option>
                <option v-for="y in years" :key="y.id" :value="y.id">{{ y.name }}</option>
              </select>
            </label>
            <label class="field"><span>Name</span><input v-model="termForm.name" required /></label>
            <label class="field"><span>Start</span><input v-model="termForm.startDate" type="date" required /></label>
            <label class="field"><span>End</span><input v-model="termForm.endDate" type="date" required /></label>
          </template>

          <template v-else-if="panel === 'class'">
            <label class="field"><span>Year</span>
              <select v-model="classForm.academicYearId" required>
                <option disabled value="">Choose</option>
                <option v-for="y in years" :key="y.id" :value="y.id">{{ y.name }}</option>
              </select>
            </label>
            <label class="field"><span>Name</span><input v-model="classForm.name" required placeholder="Form 3" /></label>
            <label class="field"><span>Code</span><input v-model="classForm.code" required placeholder="F3" /></label>
          </template>

          <template v-else-if="panel === 'section'">
            <label class="field"><span>Class</span>
              <select v-model="sectionForm.schoolClassId" required>
                <option disabled value="">Choose</option>
                <option v-for="c in classes" :key="c.id" :value="c.id">{{ c.name }}</option>
              </select>
            </label>
            <label class="field"><span>Name</span><input v-model="sectionForm.name" required placeholder="A" /></label>
            <label class="field"><span>Capacity</span><input v-model="sectionForm.capacity" type="number" min="1" /></label>
          </template>

          <template v-else-if="panel === 'subject'">
            <label class="field"><span>Name</span><input v-model="subjectForm.name" required placeholder="Mathematics" /></label>
            <label class="field"><span>Code</span><input v-model="subjectForm.code" required placeholder="MATH" /></label>
          </template>

          <template v-else-if="panel === 'topic'">
            <label class="field"><span>Subject</span>
              <select v-model="topicForm.subjectId" required>
                <option disabled value="">Choose</option>
                <option v-for="s in subjects" :key="s.id" :value="s.id">{{ s.name }}</option>
              </select>
            </label>
            <label class="field"><span>Class</span>
              <select v-model="topicForm.schoolClassId">
                <option value="">Any class</option>
                <option v-for="c in classes" :key="c.id" :value="c.id">{{ c.name }}</option>
              </select>
            </label>
            <label class="field"><span>Title</span><input v-model="topicForm.title" required /></label>
            <label class="field"><span>Objectives</span><input v-model="topicForm.objectives" /></label>
          </template>

          <template v-else-if="panel === 'classroom'">
            <label class="field"><span>Name</span><input v-model="classroomForm.name" required placeholder="Lab 1" /></label>
            <label class="field"><span>Code</span><input v-model="classroomForm.code" placeholder="L1" /></label>
            <label class="field"><span>Capacity</span><input v-model="classroomForm.capacity" type="number" min="1" placeholder="40" /></label>
            <label class="field"><span>Building</span>
              <select v-model="classroomForm.buildingId">
                <option value="">No building</option>
                <option v-for="b in buildings" :key="b.id" :value="String(b.id)">{{ b.name }}</option>
              </select>
            </label>
            <p v-if="!buildings.length" class="sub">{{ canManageBuildings ? "Add a building first, then pick it here." : "Ask the headmaster or school admin to add a building." }}</p>
            <label class="field"><span>Notes</span><input v-model="classroomForm.notes" /></label>
          </template>

          <template v-else-if="panel === 'building'">
            <label class="field"><span>Name</span><input v-model="buildingForm.name" required placeholder="Block A" /></label>
            <label class="field"><span>Notes</span><input v-model="buildingForm.notes" placeholder="Science wing" /></label>
          </template>

          <template v-else-if="panel === 'band'">
            <div class="grid grid-2">
              <label class="field"><span>Letter</span><input v-model="bandForm.letter" required maxlength="8" placeholder="A" /></label>
              <label class="field"><span>Points</span><input v-model="bandForm.points" type="number" step="0.01" min="0" required /></label>
              <label class="field"><span>From %</span><input v-model="bandForm.minPercent" type="number" min="0" max="100" required /></label>
              <label class="field"><span>To %</span><input v-model="bandForm.maxPercent" type="number" min="0" max="100" required /></label>
            </div>
          </template>

          <template v-else-if="panel === 'alloc'">
            <div class="grid grid-2">
              <label class="field"><span>Teacher</span>
                <select v-model="allocForm.teacherId" required>
                  <option disabled value="">Choose</option>
                  <option v-for="t in teachers" :key="t.id" :value="t.id">{{ t.name }}</option>
                </select>
              </label>
              <label class="field"><span>Subject</span>
                <select v-model="allocForm.subjectId" required>
                  <option disabled value="">Choose</option>
                  <option v-for="s in subjects" :key="s.id" :value="s.id">{{ s.name }}</option>
                </select>
              </label>
              <label class="field"><span>Class</span>
                <select v-model="allocForm.schoolClassId" required @change="allocForm.sectionId = ''">
                  <option disabled value="">Choose</option>
                  <option v-for="c in classes" :key="c.id" :value="c.id">{{ c.name }}</option>
                </select>
              </label>
              <label class="field"><span>Section</span>
                <select v-model="allocForm.sectionId">
                  <option value="">Whole class</option>
                  <option v-for="s in allocSections" :key="s.id" :value="s.id">{{ s.schoolClassName }} {{ s.name }}</option>
                </select>
              </label>
              <label class="field"><span>Year</span>
                <select v-model="allocForm.academicYearId" required>
                  <option disabled value="">Choose</option>
                  <option v-for="y in years" :key="y.id" :value="y.id">{{ y.name }}</option>
                </select>
              </label>
            </div>
          </template>

          <div class="row-actions form-footer">
            <button class="btn">{{
              panel === "classroom" && editingClassroomId ? "Save classroom"
                : panel === "building" && editingBuildingId ? "Save building"
                : panel === "year" && editingYearId ? "Save year"
                  : panel === "term" && editingTermId ? "Save term"
                    : panel === "subject" && editingSubjectId ? "Save subject"
                      : panel === "topic" && editingTopicId ? "Save topic"
                        : panel === "alloc" && editingAllocId ? "Save allocation"
                    : panelTitle
            }}</button>
            <button class="btn btn-ghost" type="button" @click="closePanel">Cancel</button>
          </div>
        </form>
      </div>
    </Teleport>
    <Teleport to="body">
      <div
        v-if="sectionStudents"
        class="form-scrim"
        role="presentation"
        @click.self="closeSectionStudents"
      >
        <div
          class="glass card form-modal student-pop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="section-students-title"
        >
          <div class="form-head">
            <div>
              <h3 id="section-students-title">{{ sectionStudents.title }}</h3>
              <p class="sub">{{ sectionStudents.loading ? "Loading students…" : `${sectionStudents.rows.length} student${sectionStudents.rows.length === 1 ? "" : "s"}` }}</p>
            </div>
            <button class="btn btn-ghost" type="button" @click="closeSectionStudents">Close</button>
          </div>
          <p v-if="sectionStudents.message" class="empty">{{ sectionStudents.message }}</p>
          <div v-else-if="!sectionStudents.loading" class="student-scroll">
            <table>
              <thead>
                <tr><th>Admission</th><th>Student</th><th>Roll</th></tr>
              </thead>
              <tbody>
                <tr v-for="student in sectionStudents.rows" :key="student.id">
                  <td>{{ student.admissionNo || "—" }}</td>
                  <td>{{ student.name }}</td>
                  <td>{{ student.rollNumber || "—" }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Teleport>
  </section>
</template>

<style scoped>
.guide {
  padding: 0.9rem 1.1rem;
  margin-bottom: 1rem;
}
.guide-title {
  margin: 0 0 0.35rem;
  font-weight: 800;
  font-size: 0.78rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--primary);
}
.guide ol {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem 0.55rem;
}
.guide li {
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 999px;
  padding: 0.22rem 0.7rem;
  font-size: 0.82rem;
}
.stats {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 0.7rem;
  margin-bottom: 1rem;
}
.stat-mini {
  padding: 0.75rem 0.9rem;
}
.stat-mini small {
  display: block;
  color: var(--muted);
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}
.stat-mini strong { font-size: 1.35rem; }
.tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem;
  margin-bottom: 0.75rem;
}
.list-search { margin-bottom: 1rem; }
.tabs .btn {
  padding: 0.55rem 0.95rem;
  font-size: 0.85rem;
}
.stack { display: grid; gap: 1rem; }
.card-head {
  flex-wrap: wrap;
}
.add-btn {
  min-height: 2.5rem;
  padding: 0.55rem 1rem;
  font-size: 0.9rem;
}
.plain-list.nested { margin-top: 0.55rem; }
.row.selected {
  border-color: color-mix(in srgb, var(--primary) 55%, white);
  background: rgba(245, 196, 81, 0.12);
}
.class-block {
  padding: 0.85rem 0.95rem;
  border: 1px solid var(--stroke-strong);
  border-radius: 14px;
  background: var(--inset);
}
.muted { color: var(--muted); font-size: 0.85rem; margin: 0.25rem 0 0; }
.row .btn {
  flex: 0 0 auto;
  padding: 0.25rem 0.7rem;
  font-size: 0.8rem;
}
h3 { margin: 0 0 0.25rem; }
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
  margin-bottom: 0.7rem;
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
.student-pop { width: min(36rem, 100%); }
.student-scroll {
  max-height: min(60vh, 28rem);
  overflow: auto;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
}
.student-scroll table { width: 100%; border-collapse: collapse; }
.student-scroll th,
.student-scroll td {
  text-align: left;
  padding: 0.65rem 0.8rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}
.student-scroll th {
  position: sticky;
  top: 0;
  background: #121a2b;
  font-size: 0.72rem;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--muted);
}
@media (max-width: 720px) {
  .stats { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
</style>
