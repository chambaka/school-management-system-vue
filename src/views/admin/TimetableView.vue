<script setup>
import { computed, nextTick, onMounted, onUnmounted, reactive, ref, watch } from "vue";
import { academicApi, availabilityApi, peopleApi, asList } from "../../api/endpoints";
import Icon from "../../components/Icon.vue";
import { useAuthStore } from "../../stores/auth";
import { useConfirmStore } from "../../stores/confirm";
import { useFeedback } from "../../composables/useFeedback";


const auth = useAuthStore();
const confirm = useConfirmStore();
const canManage = computed(() => ["HEADMASTER", "ACADEMIC_MASTER"].includes(auth.role));
const canListTeachers = computed(() => ["HEADMASTER", "SCHOOL_ADMIN", "ACADEMIC_MASTER"].includes(auth.role));

const DAYS = [
  { id: "MONDAY", short: "Mon" },
  { id: "TUESDAY", short: "Tue" },
  { id: "WEDNESDAY", short: "Wed" },
  { id: "THURSDAY", short: "Thu" },
  { id: "FRIDAY", short: "Fri" },
];

const tab = ref("week");
const years = ref([]);
const sections = ref([]);
const subjects = ref([]);
const classrooms = ref([]);
const teachers = ref([]);
const allocations = ref([]);
const slots = ref([]);
const periods = ref([]);
const locked = ref(false);
const { error, info } = useFeedback();
const sectionId = ref("");
const yearId = ref("");
const formOpen = ref(false);
const editingId = ref(null);
const formEl = ref(null);
const periodFormOpen = ref(false);
const periodFormEl = ref(null);
const periodForm = reactive({ name: "", startTime: "08:00", endTime: "08:40", kind: "LESSON", sortOrder: 1 });
const editingPeriodIndex = ref(null);
const bellDragFrom = ref(null);
const bellDragOver = ref(null);
const form = reactive({
  academicYearId: "", sectionId: "", subjectId: "", teacherId: "",
  dayOfWeek: "MONDAY", startTime: "08:00", endTime: "08:40", room: "",
});
const windows = ref([]);
const sortedWindows = computed(() => {
  const rank = (day) => {
    const index = DAYS.findIndex((d) => d.id === day);
    return index < 0 ? DAYS.length : index;
  };
  return [...windows.value].sort((a, b) => {
    const byDay = rank(a.dayOfWeek) - rank(b.dayOfWeek);
    if (byDay !== 0) return byDay;
    return String(a.startTime || "").localeCompare(String(b.startTime || ""));
  });
});
const hoursFormOpen = ref(false);
const hoursFormEl = ref(null);
const editingHoursId = ref(null);
const avail = reactive({ teacherId: "", dayOfWeek: "MONDAY", startTime: "08:00", endTime: "16:00" });

function timeInput(value) {
  return value ? String(value).slice(0, 5) : "";
}

const selectedYear = computed(() => years.value.find((y) => String(y.id) === String(yearId.value)));
const selectedSection = computed(() => sections.value.find((s) => String(s.id) === String(sectionId.value)));
const yearSections = computed(() => {
  if (!yearId.value) return sections.value;
  return sections.value.filter((s) => !s.academicYearId || String(s.academicYearId) === String(yearId.value));
});
const lessonPeriods = computed(() => periods.value.filter((p) => p.kind === "LESSON"));
const breakPeriods = computed(() => periods.value.filter((p) => p.kind === "BREAK"));
const savedPeriods = computed(() => periods.value.filter((p) => p.id != null));
const periodRows = computed(() => {
  if (lessonPeriods.value.length) return lessonPeriods.value;
  const unique = [...new Set(slots.value.map((s) => timeInput(s.startTime)))].sort();
  return unique.map((start, i) => {
    const match = slots.value.find((s) => timeInput(s.startTime) === start);
    return { id: `t-${start}`, name: `P${i + 1}`, startTime: start, endTime: timeInput(match?.endTime) };
  });
});
const sectionAllocations = computed(() => {
  if (!sectionId.value || !yearId.value) return [];
  const klassId = selectedSection.value?.schoolClassId;
  return allocations.value.filter((a) =>
    String(a.academicYearId) === String(yearId.value)
    && String(a.schoolClassId) === String(klassId)
    && (a.sectionId == null || String(a.sectionId) === String(sectionId.value)),
  );
});
const filledCount = computed(() => slots.value.length);
const emptyHint = computed(() => {
  if (!years.value.length) return "Add a school year in Academics first.";
  if (!sections.value.length) return "Add a class and a section (A, B) in Academics first.";
  if (!sectionId.value) return "Pick a class section to see its week.";
  if (!slots.value.length && canManage.value && !sectionAllocations.value.length) {
    return "No lessons yet. Allocate teachers to this class in Academics → Teachers, then generate — or click an empty cell.";
  }
  if (!slots.value.length && canManage.value) {
    return "No lessons yet. Generate from allocations, or click an empty cell to add one.";
  }
  if (!slots.value.length) return "No lessons on this week yet.";
  return "";
});

function slotAt(day, period) {
  return slots.value.find((s) => s.dayOfWeek === day && timeInput(s.startTime) === timeInput(period.startTime));
}

function resetForm() {
  form.academicYearId = yearId.value || "";
  form.sectionId = sectionId.value || "";
  form.subjectId = "";
  form.teacherId = "";
  form.dayOfWeek = "MONDAY";
  form.startTime = "08:00";
  form.endTime = "08:40";
  form.room = "";
  editingId.value = null;
}

function closeForm() {
  if (confirm.open) return;
  formOpen.value = false;
  resetForm();
}

function openForm(extras = {}) {
  error.value = "";
  resetForm();
  if (extras.day) form.dayOfWeek = extras.day;
  if (extras.period) {
    form.startTime = timeInput(extras.period.startTime);
    form.endTime = timeInput(extras.period.endTime || extras.period.startTime);
  }
  formOpen.value = true;
}

function startEdit(slot) {
  error.value = "";
  editingId.value = slot.id;
  form.academicYearId = slot.academicYearId ? String(slot.academicYearId) : yearId.value;
  form.sectionId = slot.sectionId ? String(slot.sectionId) : sectionId.value;
  form.subjectId = slot.subjectId ? String(slot.subjectId) : "";
  form.teacherId = slot.teacherId ? String(slot.teacherId) : "";
  form.dayOfWeek = slot.dayOfWeek || "MONDAY";
  form.startTime = timeInput(slot.startTime);
  form.endTime = timeInput(slot.endTime);
  form.room = slot.room || "";
  formOpen.value = true;
}

function onCell(day, period) {
  if (!canManage.value || locked.value) return;
  const slot = slotAt(day, period);
  if (slot) startEdit(slot);
  else openForm({ day, period });
}

function slotBody() {
  return {
    ...form,
    academicYearId: Number(form.academicYearId),
    sectionId: Number(form.sectionId),
    subjectId: Number(form.subjectId),
    teacherId: Number(form.teacherId),
    startTime: form.startTime.length === 5 ? `${form.startTime}:00` : form.startTime,
    endTime: form.endTime.length === 5 ? `${form.endTime}:00` : form.endTime,
    room: form.room || null,
  };
}

function slotLabel(slot) {
  const klass = [slot.schoolClassName, slot.sectionName].filter(Boolean).join(" ");
  return `${slot.subjectName} on ${slot.dayOfWeek} ${timeInput(slot.startTime)}${klass ? ` for ${klass}` : ""}`;
}

async function loadMeta() {
  const [yearList, classList, subjectList, classroomList, teacherPage, bellList, allocList, hourList] = await Promise.all([
    academicApi.years(),
    academicApi.classes(),
    academicApi.subjects(),
    academicApi.classrooms(),
    canListTeachers.value ? peopleApi.teachers({ size: 100 }) : Promise.resolve({ content: [] }),
    academicApi.bellPeriods(),
    academicApi.allocations().catch(() => []),
    availabilityApi.list().catch(() => []),
  ]);
  years.value = yearList;
  subjects.value = subjectList;
  classrooms.value = asList(classroomList);
  teachers.value = asList(teacherPage);
  periods.value = bellList || [];
  allocations.value = asList(allocList);
  windows.value = asList(hourList);
  const sectionLists = await Promise.all(classList.map(async (c) => {
    const rows = asList(await academicApi.sections(c.id));
    return rows.map((s) => ({
      ...s,
      academicYearId: c.academicYearId,
      schoolClassName: s.schoolClassName || c.name,
      schoolClassId: s.schoolClassId || c.id,
    }));
  }));
  sections.value = sectionLists.flat();
  const current = yearList.find((y) => y.currentYear) || yearList[0];
  if (current && !yearId.value) yearId.value = String(current.id);
}

async function loadSlots() {
  if (!sectionId.value) {
    slots.value = [];
    locked.value = false;
    return;
  }
  slots.value = await academicApi.timetable({ sectionId: sectionId.value });
  const year = yearId.value || slots.value[0]?.academicYearId;
  if (year) {
    yearId.value = String(year);
    locked.value = (await academicApi.timetableLock({ sectionId: sectionId.value, academicYearId: year })).locked;
  }
}

async function save() {
  error.value = "";
  try {
    if (editingId.value) {
      await academicApi.updateSlot(editingId.value, slotBody());
    } else {
      await academicApi.createSlot(slotBody());
    }
    sectionId.value = form.sectionId;
    closeForm();
    await loadSlots();
  } catch (e) {
    error.value = e.message;
  }
}

async function removeSlot(slot) {
  error.value = "";
  try {
    await academicApi.deleteSlot(slot.id);
    if (editingId.value === slot.id) closeForm();
    await loadSlots();
  } catch (e) {
    error.value = e.message;
  }
}

async function generate() {
  error.value = "";
  try {
    await academicApi.generateTimetable({ sectionId: sectionId.value, academicYearId: yearId.value });
    await loadSlots();
  } catch (e) {
    error.value = e.message;
  }
}

async function toggleLock() {
  error.value = "";
  try {
    const res = await academicApi.lockTimetable({
      sectionId: sectionId.value,
      academicYearId: yearId.value,
      locked: !locked.value,
    });
    locked.value = res.locked;
    info.value = res.locked ? "This week is locked." : "This week is unlocked.";
  } catch (e) {
    error.value = e.message;
  }
}

function dayLabel(id) {
  return DAYS.find((d) => d.id === id)?.short || id;
}

function teacherName(row) {
  return row.teacherName
    || teachers.value.find((t) => String(t.id) === String(row.teacherId))?.name
    || "Teacher";
}

function windowLabel(row) {
  return `${teacherName(row)} ${dayLabel(row.dayOfWeek)} ${timeInput(row.startTime)}–${timeInput(row.endTime)}`;
}

function resetHoursForm() {
  avail.teacherId = "";
  avail.dayOfWeek = "MONDAY";
  avail.startTime = "08:00";
  avail.endTime = "16:00";
  editingHoursId.value = null;
}

function closeHoursForm() {
  if (confirm.open) return;
  hoursFormOpen.value = false;
  resetHoursForm();
}

function openAddHours() {
  error.value = "";
  resetHoursForm();
  hoursFormOpen.value = true;
}

function startEditHours(row) {
  error.value = "";
  editingHoursId.value = row.id;
  avail.teacherId = row.teacherId ? String(row.teacherId) : "";
  avail.dayOfWeek = row.dayOfWeek || "MONDAY";
  avail.startTime = timeInput(row.startTime) || "08:00";
  avail.endTime = timeInput(row.endTime) || "16:00";
  hoursFormOpen.value = true;
}

function hoursBody() {
  return {
    teacherId: Number(avail.teacherId),
    dayOfWeek: avail.dayOfWeek,
    startTime: asApiTime(avail.startTime),
    endTime: asApiTime(avail.endTime),
  };
}

const hoursConfirm = computed(() => {
  if (editingHoursId.value) return "Save changes to these hours?";
  if (avail.dayOfWeek === "WEEKDAYS") return "Save these hours for Monday through Friday?";
  return "Save these teacher hours?";
});

const hoursHint = computed(() =>
  !editingHoursId.value && avail.dayOfWeek === "WEEKDAYS"
    ? "Generate only places this teacher inside this window on Monday through Friday."
    : "Generate only places this teacher inside this window on that day."
);

async function loadWindows() {
  windows.value = asList(await availabilityApi.list());
}

async function saveHours() {
  error.value = "";
  try {
    if (editingHoursId.value) {
      await availabilityApi.update(editingHoursId.value, hoursBody());
    } else if (avail.dayOfWeek === "WEEKDAYS") {
      const body = hoursBody();
      for (const day of DAYS) {
        await availabilityApi.create({ ...body, dayOfWeek: day.id });
      }
    } else {
      await availabilityApi.create(hoursBody());
    }
    closeHoursForm();
    await loadWindows();
  } catch (e) {
    error.value = e.message;
    if (!editingHoursId.value && avail.dayOfWeek === "WEEKDAYS") {
      try {
        await loadWindows();
      } catch {
        // Keep the save error on screen.
      }
    }
  }
}

async function removeWindow(row) {
  error.value = "";
  try {
    await availabilityApi.delete(row.id);
    if (editingHoursId.value === row.id) closeHoursForm();
    await loadWindows();
  } catch (e) {
    error.value = e.message;
  }
}

function asApiTime(value) {
  const time = timeInput(value);
  return time.length === 5 ? `${time}:00` : time;
}

function periodPayload(row, index) {
  return {
    name: row.name,
    startTime: asApiTime(row.startTime),
    endTime: asApiTime(row.endTime),
    kind: row.kind,
    sortOrder: row.sortOrder || index + 1,
  };
}

function resetPeriodForm() {
  periodForm.name = "";
  periodForm.startTime = "08:00";
  periodForm.endTime = "08:40";
  periodForm.kind = "LESSON";
  periodForm.sortOrder = (savedPeriods.value.length || periods.value.length || 0) + 1;
  editingPeriodIndex.value = null;
}

function closePeriodForm() {
  if (confirm.open) return;
  periodFormOpen.value = false;
  resetPeriodForm();
}

function openAddPeriod() {
  error.value = "";
  resetPeriodForm();
  periodFormOpen.value = true;
}

function startEditPeriod(period, index) {
  error.value = "";
  editingPeriodIndex.value = index;
  periodForm.name = period.name || "";
  periodForm.startTime = timeInput(period.startTime);
  periodForm.endTime = timeInput(period.endTime);
  periodForm.kind = period.kind || "LESSON";
  periodForm.sortOrder = period.sortOrder || index + 1;
  periodFormOpen.value = true;
}

async function persistDefaultDay(rows) {
  for (let i = 0; i < rows.length; i += 1) {
    await academicApi.createBellPeriod(periodPayload(rows[i], i));
  }
  periods.value = await academicApi.bellPeriods();
}

async function savePeriod() {
  error.value = "";
  try {
    const draft = {
      name: periodForm.name.trim(),
      startTime: periodForm.startTime,
      endTime: periodForm.endTime,
      kind: periodForm.kind,
      sortOrder: Number(periodForm.sortOrder) || (editingPeriodIndex.value ?? periods.value.length) + 1,
    };
    const current = editingPeriodIndex.value != null ? periods.value[editingPeriodIndex.value] : null;
    if (current?.id) {
      await academicApi.updateBellPeriod(current.id, periodPayload(draft, editingPeriodIndex.value));
      periods.value = await academicApi.bellPeriods();
    } else if (!savedPeriods.value.length) {
      const rows = periods.value.map((row) => ({ ...row }));
      if (current) rows[editingPeriodIndex.value] = draft;
      else rows.push(draft);
      await persistDefaultDay(rows);
    } else {
      await academicApi.createBellPeriod(periodPayload(draft, periods.value.length));
      periods.value = await academicApi.bellPeriods();
    }
    closePeriodForm();
  } catch (e) {
    error.value = e.message;
  }
}

async function saveBellOrder(rows) {
  const previous = periods.value;
  const ordered = rows.map((row, index) => ({ ...row, sortOrder: index + 1 }));
  periods.value = ordered;
  try {
    if (ordered.some((row) => row.id)) {
      await Promise.all(ordered.filter((row) => row.id).map((row) => academicApi.updateBellPeriod(row.id, {
        name: row.name,
        startTime: asApiTime(row.startTime),
        endTime: asApiTime(row.endTime),
        kind: row.kind,
        sortOrder: row.sortOrder,
      })));
      periods.value = await academicApi.bellPeriods();
    } else {
      await persistDefaultDay(ordered);
    }
  } catch (e) {
    error.value = e.message;
    periods.value = previous;
  }
}

function onBellPointerDown(index, event) {
  if (!canManage.value || event.button > 0) return;
  bellDragFrom.value = index;
  bellDragOver.value = index;
  event.currentTarget.setPointerCapture(event.pointerId);
}

function onBellPointerMove(event) {
  if (bellDragFrom.value == null) return;
  const row = document.elementFromPoint(event.clientX, event.clientY)?.closest("[data-bell-index]");
  if (!row) return;
  const index = Number(row.dataset.bellIndex);
  if (!Number.isNaN(index)) bellDragOver.value = index;
}

async function onBellPointerUp() {
  const from = bellDragFrom.value;
  const to = bellDragOver.value;
  bellDragFrom.value = null;
  bellDragOver.value = null;
  if (from == null || to == null || from === to) return;
  const next = periods.value.slice();
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  await saveBellOrder(next);
}

function onBellPointerCancel() {
  bellDragFrom.value = null;
  bellDragOver.value = null;
}

async function removePeriod(period, index) {
  error.value = "";
  try {
    if (period.id) {
      await academicApi.deleteBellPeriod(period.id);
      periods.value = await academicApi.bellPeriods();
    } else {
      await persistDefaultDay(periods.value.filter((_, i) => i !== index));
    }
    if (editingPeriodIndex.value === index) closePeriodForm();
  } catch (e) {
    error.value = e.message;
  }
}

function onFormKey(event) {
  if (confirm.open) return;
  if (event.key !== "Escape") return;
  if (periodFormOpen.value) closePeriodForm();
  else if (hoursFormOpen.value) closeHoursForm();
  else if (formOpen.value) closeForm();
}

watch(sectionId, () => {
  loadSlots().catch((e) => { error.value = e.message; });
});

watch(yearId, () => {
  if (sectionId.value && !yearSections.value.some((s) => String(s.id) === String(sectionId.value))) {
    sectionId.value = "";
  }
  if (sectionId.value) {
    loadSlots().catch((e) => { error.value = e.message; });
  }
});

watch([formOpen, periodFormOpen, hoursFormOpen], async ([lessonOpen, periodOpen, hoursOpen]) => {
  document.body.style.overflow = lessonOpen || periodOpen || hoursOpen ? "hidden" : "";
  if (periodOpen) {
    await nextTick();
    periodFormEl.value?.querySelector("input, select")?.focus();
    return;
  }
  if (hoursOpen) {
    await nextTick();
    hoursFormEl.value?.querySelector("select, input")?.focus();
    return;
  }
  if (!lessonOpen) return;
  await nextTick();
  formEl.value?.querySelector("select, input")?.focus();
});

onUnmounted(() => {
  document.body.style.overflow = "";
  window.removeEventListener("keydown", onFormKey, true);
});

onMounted(async () => {
  window.addEventListener("keydown", onFormKey, true);
  try {
    await loadMeta();
  } catch (e) {
    error.value = e.message;
  }
});
</script>

<template>
  <section class="page">
    <div class="page-head">
      <div>
        <h1>Timetable</h1>
        <p class="sub">One week for one class section. Rows are periods. A filled cell is a lesson.</p>
      </div>
    </div>

    <div class="toolbar glass">
      <label class="field compact">
        <span>Year</span>
        <select v-model="yearId">
          <option disabled value="">Choose</option>
          <option v-for="y in years" :key="y.id" :value="y.id">{{ y.name }}</option>
        </select>
      </label>
      <label class="field compact">
        <span>Section</span>
        <select v-model="sectionId">
          <option value="">Choose class section</option>
          <option v-for="s in yearSections" :key="s.id" :value="s.id">{{ s.schoolClassName }} {{ s.name }}</option>
        </select>
      </label>
      <div class="toolbar-meta">
        <span v-if="locked" class="chip">Locked</span>
        <span v-if="sectionId" class="count">{{ filledCount }} lesson{{ filledCount === 1 ? "" : "s" }}</span>
      </div>
      <div class="toolbar-actions">
        <button
          v-if="canManage && sectionId && yearId"
          class="btn btn-ghost"
          type="button"
          :disabled="locked"
          v-confirm="'Replace this week with lessons from Academics allocations?'"
          @click="generate"
        >Generate week</button>
        <button
          v-if="canManage && sectionId && yearId"
          class="btn btn-ghost"
          type="button"
          v-confirm="locked ? 'Unlock so this week can be edited?' : 'Lock this week? No one can change slots until you unlock.'"
          @click="toggleLock"
        >{{ locked ? "Unlock" : "Lock" }}</button>
        <button
          v-if="canManage && sectionId && !locked"
          class="btn"
          type="button"
          @click="openForm()"
        >
          <Icon name="plus" />
          Add lesson
        </button>
      </div>
    </div>

    <div class="tabs" role="tablist">
      <button class="btn" :class="{ 'btn-ghost': tab !== 'week' }" type="button" role="tab" :aria-selected="tab === 'week'" @click="tab = 'week'">Week</button>
      <button v-if="canManage" class="btn" :class="{ 'btn-ghost': tab !== 'bells' }" type="button" role="tab" :aria-selected="tab === 'bells'" @click="tab = 'bells'">Bell times</button>
      <button v-if="canManage" class="btn" :class="{ 'btn-ghost': tab !== 'hours' }" type="button" role="tab" :aria-selected="tab === 'hours'" @click="tab = 'hours'">Teacher hours</button>
    </div>

    <div v-if="tab === 'week'">
      <p v-if="!sectionId" class="empty glass">{{ emptyHint }}</p>
      <div v-else class="glass card grid-card">
        <div class="grid-head">
          <div>
            <h2>{{ selectedSection?.schoolClassName }} {{ selectedSection?.name }}</h2>
            <p class="sub">{{ selectedYear?.name }} · click a cell to {{ locked || !canManage ? "view" : "add or edit a lesson" }}</p>
          </div>
        </div>
        <p v-if="emptyHint && !slots.length" class="hint">{{ emptyHint }}</p>
        <div v-if="periodRows.length" class="table-wrap">
          <div class="tt" :style="{ gridTemplateColumns: `5.6rem repeat(${DAYS.length}, minmax(7rem, 1fr))` }">
            <div class="tt-head corner">Period</div>
            <div v-for="d in DAYS" :key="d.id" class="tt-head">{{ d.short }}</div>
            <template v-for="period in periodRows" :key="period.id || period.startTime">
              <div class="tt-time">
                <strong>{{ period.name }}</strong>
                <small>{{ timeInput(period.startTime) }}–{{ timeInput(period.endTime) }}</small>
              </div>
              <div
                v-for="d in DAYS"
                :key="`${d.id}-${period.startTime}`"
                class="tt-cell"
                :class="{ filled: slotAt(d.id, period), empty: !slotAt(d.id, period), clickable: canManage && !locked }"
                role="button"
                :tabindex="canManage && !locked ? 0 : -1"
                :aria-label="slotAt(d.id, period) ? `Edit ${slotLabel(slotAt(d.id, period))}` : `Add lesson ${d.short} ${period.name}`"
                @click="onCell(d.id, period)"
                @keydown.enter.prevent="onCell(d.id, period)"
              >
                <template v-if="slotAt(d.id, period)">
                  <strong>{{ slotAt(d.id, period).subjectName }}</strong>
                  <span>{{ slotAt(d.id, period).teacherName }}</span>
                  <span v-if="slotAt(d.id, period).room" class="room">{{ slotAt(d.id, period).room }}</span>
                  <button
                    v-if="canManage && !locked"
                    class="icon-btn cell-del"
                    type="button"
                    :aria-label="`Delete ${slotLabel(slotAt(d.id, period))}`"
                    title="Delete"
                    v-confirm="{ message: `Delete ${slotLabel(slotAt(d.id, period))}?`, danger: true }"
                    @click.stop="removeSlot(slotAt(d.id, period))"
                  ><Icon name="trash" /></button>
                </template>
                <span v-else-if="canManage && !locked" class="add-hint"><Icon name="plus" /></span>
              </div>
            </template>
          </div>
        </div>
        <ul v-if="breakPeriods.length" class="breaks">
          <li v-for="b in breakPeriods" :key="b.id || b.name">
            {{ b.name }} · {{ timeInput(b.startTime) }}–{{ timeInput(b.endTime) }}
          </li>
        </ul>
      </div>
    </div>

    <div v-else-if="tab === 'bells'" class="stack">
      <div class="glass card">
        <div class="card-head">
          <div>
            <h2>Bell times</h2>
            <p class="sub">These rows appear on every class week. A <strong>lesson</strong> period is a teaching row. A <strong>break</strong> is rest time, not a lesson. <template v-if="canManage">Drag a row by its handle to change the order.</template></p>
          </div>
          <button v-if="canManage" class="btn add-btn" type="button" @click="openAddPeriod">
            <Icon name="plus" /> Add period
          </button>
        </div>
        <p v-if="!savedPeriods.length" class="hint">P1–P8 below are defaults until you save times for this school.</p>
        <ul class="plain-list">
          <li
            v-for="(p, index) in periods"
            :key="p.id || `${p.name}-${p.startTime}`"
            class="row bell-row"
            :class="{ dragging: bellDragFrom === index, 'drop-target': bellDragOver === index && bellDragFrom !== index }"
            :data-bell-index="index"
          >
            <div class="row-main">
              <strong>{{ p.name }}</strong>
              <p class="sub">{{ p.kind === "BREAK" ? "Break" : "Lesson period" }} · {{ timeInput(p.startTime) }}–{{ timeInput(p.endTime) }}</p>
            </div>
            <div class="row-actions">
              <button
                v-if="canManage"
                class="icon-btn drag-handle"
                type="button"
                :data-bell-handle="index"
                title="Drag up or down"
                :aria-label="`Drag ${p.name} up or down`"
                @pointerdown="onBellPointerDown(index, $event)"
                @pointermove="onBellPointerMove"
                @pointerup="onBellPointerUp"
                @pointercancel="onBellPointerCancel"
              ><Icon name="more" /></button>
              <button
                class="icon-btn"
                type="button"
                :aria-label="`Edit ${p.name}`"
                title="Edit period"
                @click="startEditPeriod(p, index)"
              ><Icon name="pen" /></button>
              <button
                class="icon-btn"
                type="button"
                :aria-label="`Delete ${p.name}`"
                title="Delete"
                v-confirm="{ message: `Delete ${p.name}?`, danger: true }"
                @click="removePeriod(p, index)"
              ><Icon name="trash" /></button>
            </div>
          </li>
        </ul>
      </div>
    </div>

    <div v-else-if="tab === 'hours'" class="stack">
      <div class="glass card">
        <div class="card-head">
          <div>
            <h2>Teacher hours</h2>
            <p class="sub">Optional. If a teacher has hours, Generate only places them inside those windows. Leave empty to treat them as free all day.</p>
          </div>
          <button v-if="canManage" class="btn add-btn" type="button" @click="openAddHours">
            <Icon name="plus" /> Add teacher hours
          </button>
        </div>
        <p v-if="!windows.length" class="hint">No teacher hours yet. Teachers without hours are treated as free all day.</p>
        <ul v-else class="plain-list">
          <li v-for="w in sortedWindows" :key="w.id" class="row">
            <div>
              <strong>{{ teacherName(w) }}</strong>
              <p class="sub">{{ dayLabel(w.dayOfWeek) }} · {{ timeInput(w.startTime) }}–{{ timeInput(w.endTime) }}</p>
            </div>
            <div v-if="canManage" class="row-actions">
              <button
                class="icon-btn"
                type="button"
                :aria-label="`Edit ${windowLabel(w)}`"
                title="Edit hours"
                @click="startEditHours(w)"
              ><Icon name="pen" /></button>
              <button
                class="icon-btn"
                type="button"
                :aria-label="`Delete ${windowLabel(w)}`"
                title="Delete"
                v-confirm="{ message: `Delete ${windowLabel(w)}?`, danger: true }"
                @click="removeWindow(w)"
              ><Icon name="trash" /></button>
            </div>
          </li>
        </ul>
      </div>
    </div>

    <Teleport to="body">
      <div
        v-if="formOpen && !locked"
        class="form-scrim"
        role="presentation"
        @click.self="closeForm"
      >
        <form
          ref="formEl"
          class="glass card form-modal"
          role="dialog"
          aria-modal="true"
          :data-confirm="editingId ? 'Save changes to this lesson?' : 'Add this lesson to the week?'"
          @submit.prevent="save"
        >
          <div class="form-head">
            <div>
              <h3>{{ editingId ? "Edit lesson" : "Add lesson" }}</h3>
              <p class="sub">A lesson is one slot: subject, teacher, day, and period time.</p>
            </div>
            <button class="btn btn-ghost" type="button" @click="closeForm">Close</button>
          </div>
          <div class="grid grid-2">
            <label class="field"><span>Subject</span>
              <select v-model="form.subjectId" required>
                <option disabled value="">Choose</option>
                <option v-for="s in subjects" :key="s.id" :value="s.id">{{ s.name }}</option>
              </select>
            </label>
            <label class="field"><span>Teacher</span>
              <select v-model="form.teacherId" required>
                <option disabled value="">Choose</option>
                <option v-for="t in teachers" :key="t.id" :value="t.id">{{ t.name }}</option>
              </select>
            </label>
            <label class="field"><span>Day</span>
              <select v-model="form.dayOfWeek">
                <option v-for="d in DAYS" :key="d.id" :value="d.id">{{ d.short }}</option>
              </select>
            </label>
            <label class="field"><span>Room</span>
              <select v-model="form.room">
                <option value="">No room</option>
                <option v-for="r in classrooms" :key="r.id" :value="r.name">
                  {{ r.name }}<template v-if="r.building"> · {{ r.building }}</template>
                </option>
              </select>
            </label>
            <label class="field"><span>Starts</span><input v-model="form.startTime" type="time" required /></label>
            <label class="field"><span>Ends</span><input v-model="form.endTime" type="time" required /></label>
          </div>
          <div class="row-actions form-footer">
            <button class="btn">{{ editingId ? "Save lesson" : "Add lesson" }}</button>
            <button class="btn btn-ghost" type="button" @click="closeForm">Cancel</button>
          </div>
        </form>
      </div>
      <div
        v-if="periodFormOpen"
        class="form-scrim"
        role="presentation"
        @click.self="closePeriodForm"
      >
        <form
          ref="periodFormEl"
          class="glass card form-modal"
          role="dialog"
          aria-modal="true"
          :data-confirm="editingPeriodIndex != null ? 'Save changes to this period?' : 'Add this period to the school day?'"
          @submit.prevent="savePeriod"
        >
          <div class="form-head">
            <div>
              <h3>{{ editingPeriodIndex != null ? "Edit period" : "Add period" }}</h3>
              <p class="sub">Name, type, and the start and end of this bell.</p>
            </div>
            <button class="btn btn-ghost" type="button" @click="closePeriodForm">Close</button>
          </div>
          <div class="grid grid-2">
            <label class="field"><span>Name</span><input v-model="periodForm.name" required placeholder="P1" /></label>
            <label class="field"><span>Type</span>
              <select v-model="periodForm.kind">
                <option value="LESSON">Lesson</option>
                <option value="BREAK">Break</option>
              </select>
            </label>
            <label class="field"><span>Start</span><input v-model="periodForm.startTime" type="time" required /></label>
            <label class="field"><span>End</span><input v-model="periodForm.endTime" type="time" required /></label>
          </div>
          <div class="row-actions form-footer">
            <button class="btn">{{ editingPeriodIndex != null ? "Save period" : "Add period" }}</button>
            <button class="btn btn-ghost" type="button" @click="closePeriodForm">Cancel</button>
          </div>
        </form>
      </div>
    </Teleport>

    <Teleport to="body">
      <div
        v-if="hoursFormOpen"
        class="form-scrim"
        role="presentation"
        @click.self="closeHoursForm"
      >
        <form
          ref="hoursFormEl"
          class="glass card form-modal"
          role="dialog"
          aria-modal="true"
          :data-confirm="hoursConfirm"
          @submit.prevent="saveHours"
        >
          <div class="form-head">
            <div>
              <h2>{{ editingHoursId ? "Edit teacher hours" : "Add teacher hours" }}</h2>
              <p class="sub">{{ hoursHint }}</p>
            </div>
            <button class="btn btn-ghost" type="button" @click="closeHoursForm">Close</button>
          </div>
          <label class="field"><span>Teacher</span>
            <select v-model="avail.teacherId" required>
              <option disabled value="">Choose</option>
              <option v-for="t in teachers" :key="t.id" :value="String(t.id)">{{ t.name }}</option>
            </select>
          </label>
          <label class="field"><span>Day</span>
            <select v-model="avail.dayOfWeek">
              <option v-if="!editingHoursId" value="WEEKDAYS">Monday to Friday</option>
              <option v-for="d in DAYS" :key="d.id" :value="d.id">{{ d.short }}</option>
            </select>
          </label>
          <div class="hours-form">
            <label class="field"><span>From</span><input v-model="avail.startTime" type="time" required /></label>
            <label class="field"><span>To</span><input v-model="avail.endTime" type="time" required /></label>
          </div>
          <div class="row-actions form-footer">
            <button class="btn">{{ editingHoursId ? "Save hours" : avail.dayOfWeek === "WEEKDAYS" ? "Add Monday to Friday" : "Add hours" }}</button>
            <button class="btn btn-ghost" type="button" @click="closeHoursForm">Cancel</button>
          </div>
        </form>
      </div>
    </Teleport>
  </section>
</template>

<style scoped>
.toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: 0.75rem 1rem;
  padding: 0.85rem 1rem;
  margin-bottom: 0.85rem;
}
.compact { margin: 0; min-width: 10rem; }
.compact :deep(select),
.compact select { min-height: 2.6rem; padding: 0.45rem 0.7rem; }
.toolbar-meta {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-left: auto;
  min-height: 2.6rem;
}
.count { color: var(--muted); font-size: 0.82rem; font-weight: 700; }
.toolbar-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem;
}
.tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem;
  margin-bottom: 0.85rem;
}
.tabs .btn { padding: 0.5rem 0.95rem; font-size: 0.85rem; }
.stack { display: grid; gap: 1rem; }
.card-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
  flex-wrap: wrap;
  margin-bottom: 0.55rem;
}
.add-btn { min-height: 2.5rem; padding: 0.55rem 1rem; }
.grid-card { padding: 1rem 1.05rem 1.1rem; }
.grid-head h2 { margin: 0; font-size: 1.15rem; }
.hint {
  margin: 0.55rem 0 0.75rem;
  color: var(--muted);
  font-size: 0.86rem;
}
.tt {
  display: grid;
  gap: 0.4rem;
  min-width: 640px;
}
.tt-head {
  font-size: 0.72rem;
  font-weight: 800;
  color: var(--muted);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  padding: 0 0.2rem 0.15rem;
}
.tt-head.corner { color: var(--muted); }
.tt-time { padding: 0.35rem 0.15rem 0; }
.tt-time strong { display: block; font-size: 0.82rem; }
.tt-time small { display: block; color: var(--muted); font-size: 0.68rem; }
.tt-cell {
  position: relative;
  min-height: 4.4rem;
  border-radius: 12px;
  padding: 0.45rem 0.5rem;
  background: rgba(255, 255, 255, 0.035);
  border: 1px solid rgba(255, 255, 255, 0.07);
  font-size: 0.78rem;
  text-align: left;
  color: inherit;
  width: 100%;
}
.tt-cell.filled {
  background: color-mix(in srgb, var(--primary) 12%, rgba(6, 16, 32, 0.55));
  border-color: color-mix(in srgb, var(--primary) 28%, transparent);
}
.tt-cell.clickable { cursor: pointer; }
.tt-cell.clickable:hover {
  border-color: color-mix(in srgb, var(--primary) 55%, white);
}
.tt-cell:not(.clickable) { cursor: default; }
.tt-cell strong { display: block; font-size: 0.84rem; line-height: 1.25; }
.tt-cell span { display: block; color: var(--muted); margin-top: 0.12rem; }
.tt-cell .room { font-size: 0.7rem; }
.add-hint {
  display: grid;
  place-items: center;
  height: 100%;
  min-height: 3.2rem;
  color: color-mix(in srgb, var(--muted) 70%, transparent);
}
.add-hint :deep(.ico) { width: 1rem; height: 1rem; }
.cell-del {
  position: absolute;
  top: 0.25rem;
  right: 0.25rem;
  display: inline-flex;
}
.breaks {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  list-style: none;
  margin: 0.85rem 0 0;
  padding: 0;
  color: var(--muted);
  font-size: 0.78rem;
}
.breaks li {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 999px;
  padding: 0.2rem 0.65rem;
}
.plain-list { margin-top: 0.75rem; }
.row { align-items: center; }
.row-main { flex: 1; min-width: 0; }
.drag-handle { cursor: grab; touch-action: none; }
.drag-handle:active { cursor: grabbing; }
.bell-row.dragging { opacity: 0.45; }
.bell-row.drop-target {
  border-radius: 0.45rem;
  box-shadow: inset 0 0 0 2px color-mix(in srgb, var(--primary) 70%, white);
}
.hours-form {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.7rem;
  margin-top: 0.75rem;
}
.hours-form .btn { align-self: end; }
h2 { margin: 0 0 0.25rem; }
h3 { margin: 0 0 0.35rem; }
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
.form-modal { width: min(40rem, 100%); margin: auto 0; }
.form-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
  margin-bottom: 0.7rem;
}
.form-head .btn { flex: 0 0 auto; padding: 0.45rem 0.85rem; font-size: 0.8rem; }
.form-footer .btn { padding: 0.88rem 1.25rem; }
@media (max-width: 720px) {
  .toolbar-meta { margin-left: 0; }
  .hours-form { grid-template-columns: 1fr; }
}
</style>
