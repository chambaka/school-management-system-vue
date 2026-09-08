import { api, request } from "./http";

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
  schools: () => api.get("/api/v1/tenants/current/schools"),
  addSchool: (body) => api.post("/api/v1/tenants/current/schools", body),
  platformList: () => api.get("/api/v1/platform/tenants"),
  platformGet: (id) => api.get(`/api/v1/platform/tenants/${id}`),
  platformCreate: (body) => api.post("/api/v1/platform/tenants", body),
  platformUpdate: (id, body) => api.put(`/api/v1/platform/tenants/${id}`, body),
  platformDelete: (id) => api.del(`/api/v1/platform/tenants/${id}`),
  platformSchools: (id) => api.get(`/api/v1/platform/tenants/${id}/schools`),
  platformAddSchool: (id, body) => api.post(`/api/v1/platform/tenants/${id}/schools`, body),
};

export const sessionApi = {
  switchSchool: (body) => request("/api/v1/auth/switch-school", { method: "POST", body }),
};

export const academicApi = {
  years: () => api.get("/api/v1/academic-years"),
  createYear: (body) => api.post("/api/v1/academic-years", body),
  setCurrentYear: (id) => api.post(`/api/v1/academic-years/${id}/current`),
  classes: (academicYearId) => api.get(`/api/v1/classes${q({ academicYearId })}`),
  createClass: (body) => api.post("/api/v1/classes", body),
  deleteClass: (id) => api.del(`/api/v1/classes/${id}`),
  sections: (schoolClassId) => api.get(`/api/v1/sections${q({ schoolClassId })}`),
  timetableByTeacher: (teacherId) => api.get(`/api/v1/timetable/teacher/${teacherId}`),
  createSection: (body) => api.post("/api/v1/sections", body),
  deleteSection: (id) => api.del(`/api/v1/sections/${id}`),
  subjects: () => api.get("/api/v1/subjects"),
  createSubject: (body) => api.post("/api/v1/subjects", body),
  deleteSubject: (id) => api.del(`/api/v1/subjects/${id}`),
  departments: () => api.get("/api/v1/departments"),
  createDepartment: (body) => api.post("/api/v1/departments", body),
  classrooms: () => api.get("/api/v1/classrooms"),
  createClassroom: (body) => api.post("/api/v1/classrooms", body),
  updateClassroom: (id, body) => api.put(`/api/v1/classrooms/${id}`, body),
  deleteClassroom: (id) => api.del(`/api/v1/classrooms/${id}`),
  allocations: (params) => api.get(`/api/v1/allocations${q(params)}`),
  createAllocation: (body) => api.post("/api/v1/allocations", body),
  deleteAllocation: (id) => api.del(`/api/v1/allocations/${id}`),
  timetable: (params) => api.get(`/api/v1/timetable${q(params)}`),
  createSlot: (body) => api.post("/api/v1/timetable", body),
  updateSlot: (id, body) => api.put(`/api/v1/timetable/${id}`, body),
  deleteSlot: (id) => api.del(`/api/v1/timetable/${id}`),
  exams: () => api.get("/api/v1/exams"),
  createExam: (body) => api.post("/api/v1/exams", body),
  publishExam: (id, published = true) => api.post(`/api/v1/exams/${id}/publish${q({ published })}`),
  examSubjects: (id) => api.get(`/api/v1/exams/${id}/subjects`),
  addExamSubject: (id, body) => api.post(`/api/v1/exams/${id}/subjects`, body),
  grades: (params) => api.get(`/api/v1/grades${q(params)}`),
  saveGrade: (body) => api.post("/api/v1/grades", body),
};

export const peopleApi = {
  students: (params) => api.get(`/api/v1/students${q(params)}`),
  student: (id) => api.get(`/api/v1/students/${id}`),
  createStudent: (body) => api.post("/api/v1/students", body),
  updateStudent: (id, body) => api.put(`/api/v1/students/${id}`, body),
  studentMe: () => api.get("/api/v1/students/me"),
  reportCard: (id, examId) => api.get(`/api/v1/students/${id}/report-card${q({ examId })}`),
  myReportCard: (examId) => api.get(`/api/v1/students/me/report-card${q({ examId })}`),
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
};

export const attendanceApi = {
  markStudents: (body) => api.post("/api/v1/attendance/students", body),
  markTeachers: (body) => api.post("/api/v1/attendance/teachers", body),
  studentsDaily: (params) => api.get(`/api/v1/attendance/students/daily${q(params)}`),
  mySummary: (params) => api.get(`/api/v1/attendance/me/summary${q(params)}`),
};

export const financeApi = {
  fees: (params) => api.get(`/api/v1/fees${q(params)}`),
  createFee: (body) => api.post("/api/v1/fees", body),
  invoices: (params) => api.get(`/api/v1/invoices${q(params)}`),
  generate: (body) => api.post("/api/v1/invoices/generate", body),
  studentInvoices: (studentId) => api.get(`/api/v1/invoices/students/${studentId}`),
  studentBalance: (studentId) => api.get(`/api/v1/invoices/students/${studentId}/balance`),
  myInvoices: () => api.get("/api/v1/invoices/me"),
  pay: (body) => api.post("/api/v1/payments", body),
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
