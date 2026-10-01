export function allocationMatches(allocation, { classId, subjectId, yearId, sectionId } = {}) {
  if (classId != null && classId !== "" && String(allocation.schoolClassId) !== String(classId)) {
    return false;
  }
  if (subjectId != null && subjectId !== "" && String(allocation.subjectId) !== String(subjectId)) {
    return false;
  }
  if (yearId != null && yearId !== "" && allocation.academicYearId != null
      && String(allocation.academicYearId) !== String(yearId)) {
    return false;
  }
  if (sectionId == null || sectionId === "") {
    return true;
  }
  return allocation.sectionId == null || String(allocation.sectionId) === String(sectionId);
}

export function teachesSubject(allocations, params) {
  return (allocations || []).some((allocation) => allocationMatches(allocation, params));
}
