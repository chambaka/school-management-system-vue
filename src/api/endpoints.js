import { api, downloadFile, request, viewFile } from "./http";

const q = (params = {}) => {
  const usp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") usp.set(k, v);
  });
  const s = usp.toString();
  return s ? `?${s}` : "";
};

export function asList(data) {
  if (Array.isArray(data)) return data;
  return data?.content || [];
}

export const authApi = {
  login: (body) => request("/api/v1/auth/login", { method: "POST", body, skipAuth: true }),
  register: (body) => request("/api/v1/auth/register-school", { method: "POST", body, skipAuth: true }),
  me: () => api.get("/api/v1/auth/me"),
  changePassword: (body) => request("/api/v1/auth/change-password", { method: "POST", body }),
  passwordRules: () => request("/api/v1/auth/password-rules", { skipAuth: true }),
  forgot: (body) => request("/api/v1/auth/forgot-password", { method: "POST", body, skipAuth: true }),
  verifyCode: (body) => request("/api/v1/auth/forgot-password/verify", { method: "POST", body, skipAuth: true }),
  reset: (body) => request("/api/v1/auth/reset-password", { method: "POST", body, skipAuth: true }),
  logout: (body) => request("/api/v1/auth/logout", { method: "POST", body, skipAuth: true }),
  permissions: () => api.get("/api/v1/me/permissions"),
  verifyTwoFactor: (body) => request("/api/v1/auth/login/2fa", { method: "POST", body, skipAuth: true }),
  resetTwoFactor: () => api.post("/api/v1/auth/reset-2fa"),
};

export const brandingApi = {
  bySlug: (slug) => request(`/api/v1/public/branding/${slug}`, { skipAuth: true }),
  byHost: (host) => request(`/api/v1/public/branding?host=${encodeURIComponent(host)}`, { skipAuth: true }),
};

export const publicApi = {
  config: () => request("/api/v1/public/config", { skipAuth: true }),
};

export const schoolApi = {
  current: () => api.get("/api/v1/schools/current"),
  updateCurrent: (body) => api.put("/api/v1/schools/current", body),
  platformList: () => api.get("/api/v1/platform/schools"),
  platformUpdate: (id, body) => api.put(`/api/v1/platform/schools/${id}`, body),
  platformDelete: (id) => api.del(`/api/v1/platform/schools/${id}`),
};

export const tenantApi = {
  current: () => api.get("/api/v1/tenants/current"),
  rename: (body) => api.put("/api/v1/tenants/current", body),
  updateProfile: (body) => api.put("/api/v1/tenants/current/profile", body),
  overview: () => api.get("/api/v1/tenants/current/overview"),
  audit: (params) => api.get(`/api/v1/tenants/current/audit${q(params)}`),
  schools: () => api.get("/api/v1/tenants/current/schools"),
  addSchool: (body) => api.post("/api/v1/tenants/current/schools", body),
  renameSchool: (id, body) => api.put(`/api/v1/tenants/current/schools/${id}`, body),
  setSchoolStatus: (id, body) => api.put(`/api/v1/tenants/current/schools/${id}/status`, body),
  platformList: () => api.get("/api/v1/platform/tenants"),
  platformGet: (id) => api.get(`/api/v1/platform/tenants/${id}`),
  platformCreate: (body) => api.post("/api/v1/platform/tenants", body),
  platformUpdate: (id, body) => api.put(`/api/v1/platform/tenants/${id}`, body),
  platformDelete: (id) => api.del(`/api/v1/platform/tenants/${id}`),
  platformSchools: (id) => api.get(`/api/v1/platform/tenants/${id}/schools`),
  platformAddSchool: (id, body) => api.post(`/api/v1/platform/tenants/${id}/schools`, body),
  platformAdmins: (id) => api.get(`/api/v1/platform/tenants/${id}/admins`),
  platformCreateAdmin: (id, body) => api.post(`/api/v1/platform/tenants/${id}/admins`, body),
  currentAdmins: () => api.get("/api/v1/tenants/current/admins"),
  createCurrentAdmin: (body) => api.post("/api/v1/tenants/current/admins", body),
};

export const sessionApi = {
  switchSchool: (body) => request("/api/v1/auth/switch-school", { method: "POST", body }),
};

export const academicApi = {
  years: () => api.get("/api/v1/academic-years"),
  createYear: (body) => api.post("/api/v1/academic-years", body),
  updateYear: (id, body) => api.put(`/api/v1/academic-years/${id}`, body),
  setCurrentYear: (id) => api.post(`/api/v1/academic-years/${id}/current`),
  deleteYear: (id) => api.del(`/api/v1/academic-years/${id}`),
  classes: (academicYearId) => api.get(`/api/v1/classes${q({ academicYearId })}`),
  createClass: (body) => api.post("/api/v1/classes", body),
  deleteClass: (id) => api.del(`/api/v1/classes/${id}`),
  sections: (schoolClassId) => api.get(`/api/v1/sections${q({ schoolClassId })}`),
  timetableByTeacher: (teacherId) => api.get(`/api/v1/timetable/teacher/${teacherId}`),
  createSection: (body) => api.post("/api/v1/sections", body),
  deleteSection: (id) => api.del(`/api/v1/sections/${id}`),
  subjects: () => api.get("/api/v1/subjects"),
  createSubject: (body) => api.post("/api/v1/subjects", body),
  updateSubject: (id, body) => api.put(`/api/v1/subjects/${id}`, body),
  deleteSubject: (id) => api.del(`/api/v1/subjects/${id}`),
  departments: () => api.get("/api/v1/departments"),
  createDepartment: (body) => api.post("/api/v1/departments", body),
  classrooms: () => api.get("/api/v1/classrooms"),
  createClassroom: (body) => api.post("/api/v1/classrooms", body),
  updateClassroom: (id, body) => api.put(`/api/v1/classrooms/${id}`, body),
  deleteClassroom: (id) => api.del(`/api/v1/classrooms/${id}`),
  buildings: () => api.get("/api/v1/buildings"),
  createBuilding: (body) => api.post("/api/v1/buildings", body),
  updateBuilding: (id, body) => api.put(`/api/v1/buildings/${id}`, body),
  deleteBuilding: (id) => api.del(`/api/v1/buildings/${id}`),
  allocations: (params) => api.get(`/api/v1/allocations${q(params)}`),
  myAllocations: () => api.get("/api/v1/allocations/mine"),
  createAllocation: (body) => api.post("/api/v1/allocations", body),
  updateAllocation: (id, body) => api.put(`/api/v1/allocations/${id}`, body),
  deleteAllocation: (id) => api.del(`/api/v1/allocations/${id}`),
  terms: (academicYearId) => api.get(`/api/v1/academic-terms${q({ academicYearId })}`),
  createTerm: (body) => api.post("/api/v1/academic-terms", body),
  updateTerm: (id, body) => api.put(`/api/v1/academic-terms/${id}`, body),
  deleteTerm: (id) => api.del(`/api/v1/academic-terms/${id}`),
  weights: (academicYearId) => api.get(`/api/v1/result-config/weights${q({ academicYearId })}`),
  saveWeight: (body) => api.post("/api/v1/result-config/weights", body),
  gradingBands: () => api.get("/api/v1/result-config/grading-bands"),
  replaceGradingBands: (body) => api.put("/api/v1/result-config/grading-bands", body),
  timetable: (params) => api.get(`/api/v1/timetable${q(params)}`),
  createSlot: (body) => api.post("/api/v1/timetable", body),
  updateSlot: (id, body) => api.put(`/api/v1/timetable/${id}`, body),
  deleteSlot: (id) => api.del(`/api/v1/timetable/${id}`),
  generateTimetable: (params) => api.post(`/api/v1/timetable/generate${q(params)}`),
  lockTimetable: (params) => api.post(`/api/v1/timetable/lock${q(params)}`),
  timetableLock: (params) => api.get(`/api/v1/timetable/lock${q(params)}`),
  bellPeriods: () => api.get("/api/v1/bell-periods"),
  createBellPeriod: (body) => api.post("/api/v1/bell-periods", body),
  updateBellPeriod: (id, body) => api.put(`/api/v1/bell-periods/${id}`, body),
  deleteBellPeriod: (id) => api.del(`/api/v1/bell-periods/${id}`),
  exams: (academicYearId) => api.get(`/api/v1/exams${q({ academicYearId })}`),
  createExam: (body) => api.post("/api/v1/exams", body),
  updateExam: (id, body) => api.put(`/api/v1/exams/${id}`, body),
  deleteExam: (id) => api.del(`/api/v1/exams/${id}`),
  submitExam: (id) => api.post(`/api/v1/exams/${id}/submit`),
  verifyExam: (id) => api.post(`/api/v1/exams/${id}/verify`),
  approveExam: (id) => api.post(`/api/v1/exams/${id}/approve`),
  rejectExam: (id, note) => api.post(`/api/v1/exams/${id}/reject${q({ note })}`),
  publishExam: (id, published = true) => api.post(`/api/v1/exams/${id}/publish${q({ published })}`),
  examSubjects: (id) => api.get(`/api/v1/exams/${id}/subjects`),
  addExamSubject: (id, body) => api.post(`/api/v1/exams/${id}/subjects`, body),
  updateExamSubject: (id, paperId, body) => api.put(`/api/v1/exams/${id}/subjects/${paperId}`, body),
  deleteExamSubject: (id, paperId) => api.del(`/api/v1/exams/${id}/subjects/${paperId}`),
  generateExamSchedule: (id) => api.post(`/api/v1/exams/${id}/schedule`),
  lockExamSchedule: (id, locked = true) => api.post(`/api/v1/exams/${id}/schedule/lock${q({ locked })}`),
  examSeats: (examSubjectId) => api.get(`/api/v1/exams/subjects/${examSubjectId}/seats`),
  grades: (params) => api.get(`/api/v1/grades${q(params)}`),
  gradeGrid: (params) => api.get(`/api/v1/grades/grid${q(params)}`),
  saveGrade: (body) => api.post("/api/v1/grades", body),
  saveGradesBulk: (body) => api.post("/api/v1/grades/bulk", body),
  deleteGrade: (params) => api.del(`/api/v1/grades${q(params)}`),
  gradeTemplate: (params) => downloadFile(`/api/v1/grades/template${q(params)}`, "grades-template.xlsx"),
  importGrades: (examId, subjectId, file) => {
    const body = new FormData();
    body.append("file", file);
    return request(`/api/v1/grades/import${q({ examId, subjectId })}`, { method: "POST", body });
  },
  termResult: (params) => api.get(`/api/v1/grades/term-result${q(params)}`),
  classTermResults: (params) => api.get(`/api/v1/grades/term-results${q(params)}`),
};

export const peopleApi = {
  students: (params) => api.get(`/api/v1/students${q(params)}`),
  student: (id) => api.get(`/api/v1/students/${id}`),
  createStudent: (body) => api.post("/api/v1/students", body),
  updateStudent: (id, body) => api.put(`/api/v1/students/${id}`, body),
  studentMe: () => api.get("/api/v1/students/me"),
  reportCard: (id, examId) => api.get(`/api/v1/students/${id}/report-card${q({ examId })}`),
  myReportCard: (examId) => api.get(`/api/v1/students/me/report-card${q({ examId })}`),
  termReport: (id, params) => api.get(`/api/v1/students/${id}/term-report${q(params)}`),
  termReports: (params) => api.get(`/api/v1/students/term-reports${q(params)}`),
  myTermReport: (params) => api.get(`/api/v1/students/me/term-report${q(params)}`),
  promoteStudents: (body) => api.post("/api/v1/students/promote", body),
  previewPromote: (body) => api.post("/api/v1/students/promotions/preview", body),
  enrolments: (params) => api.get(`/api/v1/students/enrolments${q(params)}`),
  studentEnrolments: (id) => api.get(`/api/v1/students/${id}/enrolments`),
  studentParents: (id) => api.get(`/api/v1/students/${id}/parents`),
  linkParent: (id, body) => api.post(`/api/v1/students/${id}/parents`, body),
  unlinkParent: (studentId, parentId) => api.del(`/api/v1/students/${studentId}/parents/${parentId}`),
  suspendStudent: (id) => api.post(`/api/v1/students/${id}/suspend`),
  archiveStudent: (id) => api.post(`/api/v1/students/${id}/archive`),
  restoreStudent: (id) => api.post(`/api/v1/students/${id}/restore`),
  uploadStudentPhoto: (id, file) => {
    const body = new FormData();
    body.append("file", file);
    return request(`/api/v1/students/${id}/photo`, { method: "POST", body });
  },
  deleteStudentPhoto: (id) => api.del(`/api/v1/students/${id}/photo`),
  teachers: (params) => api.get(`/api/v1/teachers${q(params)}`),
  parents: (params) => api.get(`/api/v1/parents${q(params)}`),
  teacherMe: () => api.get("/api/v1/teachers/me"),
  createTeacher: (body) => api.post("/api/v1/teachers", body),
  updateTeacher: (id, body) => api.put(`/api/v1/teachers/${id}`, body),
  archiveTeacher: (id) => api.post(`/api/v1/teachers/${id}/archive`),
  restoreTeacher: (id) => api.post(`/api/v1/teachers/${id}/restore`),
  uploadTeacherPhoto: (id, file) => {
    const body = new FormData();
    body.append("file", file);
    return request(`/api/v1/teachers/${id}/photo`, { method: "POST", body });
  },
  deleteTeacherPhoto: (id) => api.del(`/api/v1/teachers/${id}/photo`),
  schoolAdmins: (params) => api.get(`/api/v1/school-admins${q(params)}`),
  createSchoolAdmin: (schoolId, body) => api.post(`/api/v1/school-admins${q({ schoolId })}`, body),
  updateSchoolAdmin: (schoolId, id, body) => api.put(`/api/v1/school-admins/${id}${q({ schoolId })}`, body),
  createParent: (body) => api.post("/api/v1/parents", body),
  updateParent: (id, body) => api.put(`/api/v1/parents/${id}`, body),
  archiveParent: (id) => api.post(`/api/v1/parents/${id}/archive`),
  restoreParent: (id) => api.post(`/api/v1/parents/${id}/restore`),
  parentChildren: (id) => api.get(`/api/v1/parents/${id}/children`),
  myChildren: () => api.get("/api/v1/parents/me/children"),
  unlockUser: (userId, schoolId) => api.post(`/api/v1/users/${userId}/unlock${q({ schoolId })}`),
  resetTwoFactor: (userId, schoolId) => api.post(`/api/v1/users/${userId}/reset-2fa${q({ schoolId })}`),
  resetPassword: (userId, schoolId, body) => api.post(`/api/v1/users/${userId}/reset-password${q({ schoolId })}`, body || {}),
  schoolUsers: (params) => api.get(`/api/v1/users${q(params)}`),
  setUserEnabled: (userId, schoolId, enabled) =>
    api.post(`/api/v1/users/${userId}/enabled${q({ schoolId })}`, { enabled }),
  userLinks: (userId, schoolId) => api.get(`/api/v1/users/${userId}/links${q({ schoolId })}`),
  removeUserLink: (userId, schoolId, body) =>
    request(`/api/v1/users/${userId}/links${q({ schoolId })}`, { method: "DELETE", body }),
  removeUser: (userId, schoolId) => api.del(`/api/v1/users/${userId}${q({ schoolId })}`),
};

export const locationApi = {
  regions: () => api.get("/api/v1/location/regions"),
  districts: (regionId) => api.get(`/api/v1/location/districts${q({ regionId })}`),
  wards: (districtId) => api.get(`/api/v1/location/wards${q({ districtId })}`),
};

export const attendanceApi = {
  markStudents: (body) => api.post("/api/v1/attendance/students", body),
  markTeachers: (body) => api.post("/api/v1/attendance/teachers", body),
  studentsDaily: (params) => api.get(`/api/v1/attendance/students/daily${q(params)}`),
  teachersDaily: (params) => api.get(`/api/v1/attendance/teachers/daily${q(params)}`),
  studentSummary: (studentId, params) => api.get(`/api/v1/attendance/students/${studentId}/summary${q(params)}`),
  mySummary: (params) => api.get(`/api/v1/attendance/me/summary${q(params)}`),
};

export const lessonApi = {
  list: (params) => api.get(`/api/v1/lesson-logs${q(params)}`),
  create: (body) => api.post("/api/v1/lesson-logs", body),
};

export const assignmentApi = {
  list: () => api.get("/api/v1/assignments"),
  create: (body) => api.post("/api/v1/assignments", body),
  update: (id, body) => api.put(`/api/v1/assignments/${id}`, body),
  remove: (id) => api.del(`/api/v1/assignments/${id}`),
  lock: (id) => api.post(`/api/v1/assignments/${id}/lock`),
  publish: (id) => api.post(`/api/v1/assignments/${id}/publish`),
  attach: (id, file) => {
    const body = new FormData();
    body.append("file", file);
    return request(`/api/v1/assignments/${id}/file`, { method: "POST", body });
  },
  file: (id, filename, mode = "download") => {
    const path = `/api/v1/assignments/${id}/file`;
    const name = filename || "assignment";
    return mode === "view" ? viewFile(path, name) : downloadFile(path, name);
  },
  fileById: (id, fileId, filename, mode = "download") => {
    const path = `/api/v1/assignments/${id}/files/${fileId}`;
    const name = filename || "assignment";
    return mode === "view" ? viewFile(path, name) : downloadFile(path, name);
  },
  removeFile: (id, fileId) => api.del(`/api/v1/assignments/${id}/files/${fileId}`),
  submissionFile: (id, studentId, filename, mode = "download", submissionId, fileId) => {
    const path = fileId && submissionId
      ? `/api/v1/assignments/${id}/submissions/${studentId}/attempts/${submissionId}/files/${fileId}`
      : submissionId
        ? `/api/v1/assignments/${id}/submissions/${studentId}/attempts/${submissionId}/file`
        : `/api/v1/assignments/${id}/submissions/${studentId}/file`;
    const name = filename || "submission";
    return mode === "view" ? viewFile(path, name) : downloadFile(path, name);
  },
  attachMine: (id, file) => {
    const body = new FormData();
    body.append("file", file);
    return request(`/api/v1/assignments/${id}/mine/files`, { method: "POST", body });
  },
  marks: (id, studentId, marks) => api.post(`/api/v1/assignments/${id}/marks${q({ studentId, marks })}`),
  submit: (id, file, notes) => {
    const body = new FormData();
    if (file) body.append("file", file);
    if (notes) body.append("notes", notes);
    return request(`/api/v1/assignments/${id}/submit`, { method: "POST", body });
  },
  submissions: (id) => api.get(`/api/v1/assignments/${id}/submissions`),
  mySubmissions: () => api.get("/api/v1/assignments/me/submissions"),
  mySubmission: (id) => api.get(`/api/v1/assignments/${id}/mine`),
};

export const financeApi = {
  fees: (params) => api.get(`/api/v1/fees${q(params)}`),
  createFee: (body) => api.post("/api/v1/fees", body),
  updateFee: (id, body) => api.put(`/api/v1/fees/${id}`, body),
  deleteFee: (id) => api.del(`/api/v1/fees/${id}`),
  invoices: (params) => api.get(`/api/v1/invoices${q(params)}`),
  generate: (body) => api.post("/api/v1/invoices/generate", body),
  deleteInvoiceItem: (invoiceId, itemId) => api.del(`/api/v1/invoices/${invoiceId}/items/${itemId}`),
  studentInvoices: (studentId) => api.get(`/api/v1/invoices/students/${studentId}`),
  studentBalance: (studentId) => api.get(`/api/v1/invoices/students/${studentId}/balance`),
  studentLedger: (studentId) => api.get(`/api/v1/invoices/students/${studentId}/ledger`),
  ledgerEntries: (studentId) => api.get(`/api/v1/ledger/students/${studentId}`),
  applyDiscount: (id, body) => api.post(`/api/v1/invoices/${id}/discount`, body),
  myInvoices: () => api.get("/api/v1/invoices/me"),
  pay: (body) => api.post("/api/v1/payments", body),
  paymentsForInvoice: (invoiceId) => api.get(`/api/v1/payments/invoice/${invoiceId}`),
  receiptPdf: (id) => downloadFile(`/api/v1/payments/${id}/receipt.pdf`, `receipt-${id}.pdf`),
};

export const dashboardApi = {
  snapshot: () => api.get("/api/v1/dashboard"),
};

export const notificationApi = {
  inbox: () => api.get("/api/v1/notifications"),
  markRead: (id) => api.post(`/api/v1/notifications/${id}/read`),
};

export const reportApi = {
  reportCardPdf: (params) => downloadFile(`/api/v1/reports/report-card.pdf${q(params)}`, "report-card.pdf"),
  reportCardCsv: (params) => downloadFile(`/api/v1/reports/report-card.csv${q(params)}`, "report-card.csv"),
  enrolmentHistoryPdf: (params) => downloadFile(`/api/v1/reports/enrolment-history.pdf${q(params)}`, "enrolment-history.pdf"),
  enrolmentHistoryCsv: (params) => downloadFile(`/api/v1/reports/enrolment-history.csv${q(params)}`, "enrolment-history.csv"),
  reportCardXlsx: (params) => downloadFile(`/api/v1/reports/report-card.xlsx${q(params)}`, "report-card.xlsx"),
  defaulters: (params) => downloadFile(`/api/v1/reports/fees/defaulters${q(params)}`, `defaulters.${params.format || "csv"}`),
  defaulterRows: () => api.get("/api/v1/reports/fees/defaulters/rows"),
  collections: (params) => downloadFile(`/api/v1/reports/finance/collections${q(params)}`, `collections.${params.format || "csv"}`),
  collectionRows: (params) => api.get(`/api/v1/reports/finance/collections/rows${q(params)}`),
  meritList: (params) => downloadFile(`/api/v1/reports/merit-list${q(params)}`, `merit-list.${params.format || "csv"}`),
  meritRows: (params) => api.get(`/api/v1/reports/merit-list/rows${q(params)}`),
  attendance: (params) => downloadFile(`/api/v1/reports/attendance${q(params)}`, `attendance.${params.format || "csv"}`),
  attendanceRows: (params) => api.get(`/api/v1/reports/attendance/rows${q(params)}`),
  termResult: (params) => downloadFile(`/api/v1/reports/term-result${q(params)}`, `term-result.${params.format || "pdf"}`),
};

export const curriculumApi = {
  list: (params) => api.get(`/api/v1/curriculum${q(params)}`),
  create: (body) => api.post("/api/v1/curriculum", body),
  update: (id, body) => api.put(`/api/v1/curriculum/${id}`, body),
  delete: (id) => api.del(`/api/v1/curriculum/${id}`),
};

export const availabilityApi = {
  list: (teacherId) => api.get(`/api/v1/teacher-availability${q({ teacherId })}`),
  create: (body) => api.post("/api/v1/teacher-availability", body),
  update: (id, body) => api.put(`/api/v1/teacher-availability/${id}`, body),
  delete: (id) => api.del(`/api/v1/teacher-availability/${id}`),
};

export const notificationSettingsApi = {
  templates: () => api.get("/api/v1/notification-settings/templates"),
  saveTemplate: (body) => api.post("/api/v1/notification-settings/templates", body),
  preferences: () => api.get("/api/v1/notification-settings/preferences"),
  savePreference: (body) => api.post("/api/v1/notification-settings/preferences", body),
};

export const pushApi = {
  publicKey: () => api.get("/api/v1/push/public-key"),
  subscribe: (body) => api.post("/api/v1/push/subscribe", body),
};

export const noticeApi = {
  list: () => api.get("/api/v1/notices"),
  create: (body) => api.post("/api/v1/notices", body),
};

export const messageApi = {
  forStudent: (studentId) => api.get(`/api/v1/students/${studentId}/messages`),
  post: (studentId, body) => api.post(`/api/v1/students/${studentId}/messages`, body),
  inbox: () => api.get("/api/v1/messages/inbox"),
};

export const auditApi = {
  tenant: (params) => api.get(`/api/v1/audit-events${q(params)}`),
  tenantByCorr: (id) => api.get(`/api/v1/audit-events/${encodeURIComponent(id)}`),
  platform: (params) => api.get(`/api/v1/platform/audit-events${q(params)}`),
  settings: () => api.get("/api/v1/platform/audit-settings"),
  setEnabled: (action, enabled) => api.put(`/api/v1/platform/audit-settings/${action}`, { enabled }),
  replaceSettings: (events) => api.put("/api/v1/platform/audit-settings", { events }),
};

export const twoFactorApi = {
  settings: () => api.get("/api/v1/platform/two-factor"),
  setEnabled: (schoolId, enabled) => api.put(`/api/v1/platform/two-factor/${schoolId}`, { enabled }),
};

export const qualificationApi = {
  list: () => api.get("/api/v1/qualifications"),
  create: (body) => api.post("/api/v1/qualifications", body),
  update: (id, body) => api.put(`/api/v1/qualifications/${id}`, body),
  delete: (id) => api.del(`/api/v1/qualifications/${id}`),
};
