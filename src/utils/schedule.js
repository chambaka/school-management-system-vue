export function weekdayToday() {
  return ["SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"][new Date().getDay()];
}

export function isoDate(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function lastDaysRange(days = 7) {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - days);
  return { start: isoDate(start), end: isoDate(end) };
}

export function slotsForToday(slots) {
  const day = weekdayToday();
  return [...(slots || [])]
    .filter((s) => s.dayOfWeek === day)
    .sort((a, b) => String(a.startTime || "").localeCompare(String(b.startTime || "")));
}

export function dueSoon(assignments, limit = 5) {
  const today = isoDate();
  return [...(assignments || [])]
    .filter((a) => a.dueDate && a.dueDate >= today)
    .sort((a, b) => String(a.dueDate).localeCompare(String(b.dueDate)))
    .slice(0, limit);
}

export function slotLabel(slot) {
  const when = [slot.startTime, slot.endTime].filter(Boolean).join("–");
  const where = [slot.subjectName, slot.schoolClassName, slot.sectionName].filter(Boolean).join(" · ");
  return [when, where].filter(Boolean).join(" · ");
}
