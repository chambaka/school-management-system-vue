import { createRouter, createWebHistory } from "vue-router";
import { useAuthStore, homeFor } from "../stores/auth";
import { useConfigStore } from "../stores/config";

const routes = [
  { path: "/login", component: () => import("../views/auth/LoginView.vue"), meta: { guest: true } },
  { path: "/register", component: () => import("../views/auth/RegisterView.vue"), meta: { guest: true } },
  { path: "/forgot", component: () => import("../views/auth/ForgotView.vue"), meta: { guest: true } },
  { path: "/forgot/code", component: () => import("../views/auth/ForgotCodeView.vue"), meta: { guest: true } },
  { path: "/forgot/reset", component: () => import("../views/auth/ForgotResetView.vue"), meta: { guest: true } },
  {
    path: "/",
    component: () => import("../layouts/AppShell.vue"),
    meta: { auth: true },
    children: [
      { path: "", redirect: "/home" },
      { path: "home", component: () => import("../views/HomeRedirect.vue") },
      { path: "dashboard", component: () => import("../views/admin/DashboardView.vue"), meta: { roles: ["HEADMASTER", "ACADEMIC_MASTER", "ACCOUNTANT"] } },
      { path: "students", component: () => import("../views/admin/StudentsView.vue"), meta: { roles: ["HEADMASTER", "ACADEMIC_MASTER", "TEACHER", "ACCOUNTANT"] } },
      { path: "teachers", component: () => import("../views/admin/TeachersView.vue"), meta: { roles: ["HEADMASTER", "ACADEMIC_MASTER"] } },
      { path: "parents", component: () => import("../views/admin/ParentsView.vue"), meta: { roles: ["HEADMASTER", "ACADEMIC_MASTER"] } },
      { path: "academics", component: () => import("../views/admin/AcademicsView.vue"), meta: { roles: ["HEADMASTER", "ACADEMIC_MASTER"] } },
      { path: "timetable", component: () => import("../views/admin/TimetableView.vue"), meta: { roles: ["HEADMASTER", "ACADEMIC_MASTER", "TEACHER"] } },
      { path: "exams", component: () => import("../views/admin/ExamsView.vue"), meta: { roles: ["HEADMASTER", "ACADEMIC_MASTER", "TEACHER"] } },
      { path: "grades", component: () => import("../views/admin/GradesView.vue"), meta: { roles: ["HEADMASTER", "ACADEMIC_MASTER", "TEACHER"] } },
      { path: "attendance", component: () => import("../views/admin/AttendanceView.vue"), meta: { roles: ["HEADMASTER", "ACADEMIC_MASTER", "TEACHER"] } },
      { path: "finance", component: () => import("../views/admin/FinanceView.vue"), meta: { roles: ["HEADMASTER", "ACADEMIC_MASTER", "ACCOUNTANT", "PARENT"] } },
      { path: "messages", component: () => import("../views/MessagesView.vue"), meta: { roles: ["HEADMASTER", "ACADEMIC_MASTER", "TEACHER", "ACCOUNTANT", "PARENT"] } },
      { path: "notices", component: () => import("../views/admin/NoticesView.vue") },
      { path: "branding", component: () => import("../views/admin/BrandingView.vue"), meta: { roles: ["HEADMASTER"] } },
      { path: "security", component: () => import("../views/auth/ChangePasswordView.vue") },
      { path: "audit", component: () => import("../views/admin/AuditView.vue"), meta: { roles: ["HEADMASTER", "ACADEMIC_MASTER", "ACCOUNTANT"] } },
      { path: "tenant/schools", component: () => import("../views/tenant/TenantSchoolsView.vue"), meta: { roles: ["HEADMASTER", "SUPER_ADMIN"] } },
      { path: "tenant/schools/new", component: () => import("../views/platform/AddSchoolView.vue"), meta: { roles: ["HEADMASTER", "SUPER_ADMIN"] } },
      { path: "tenant/schools/:schoolId/officers", component: () => import("../views/admin/SchoolAdminsView.vue"), meta: { roles: ["HEADMASTER", "SUPER_ADMIN"] } },
      { path: "platform/tenants", component: () => import("../views/platform/TenantsView.vue"), meta: { roles: ["SUPER_ADMIN"] } },
      { path: "platform/tenants/new", component: () => import("../views/platform/CreateTenantView.vue"), meta: { roles: ["SUPER_ADMIN"] } },
      { path: "platform/tenants/:tenantId/schools/new", component: () => import("../views/platform/AddSchoolView.vue"), meta: { roles: ["SUPER_ADMIN"] } },
      { path: "report-card", component: () => import("../views/student/ReportCardView.vue"), meta: { roles: ["HEADMASTER", "ACADEMIC_MASTER", "TEACHER", "STUDENT", "PARENT"] } },
      { path: "teacher", component: () => import("../views/teacher/TeacherHomeView.vue"), meta: { roles: ["TEACHER"] } },
      { path: "student", component: () => import("../views/student/StudentHomeView.vue"), meta: { roles: ["STUDENT"] } },
      { path: "parent", component: () => import("../views/parent/ParentHomeView.vue"), meta: { roles: ["PARENT"] } },
      { path: "platform/schools", component: () => import("../views/platform/SchoolsView.vue"), meta: { roles: ["SUPER_ADMIN"] } },
      { path: "platform/schools/:schoolId/officers", component: () => import("../views/admin/SchoolAdminsView.vue"), meta: { roles: ["SUPER_ADMIN"] } },
      { path: "platform/audit", component: () => import("../views/platform/PlatformAuditView.vue"), meta: { roles: ["SUPER_ADMIN"] } },
      { path: "platform/configurations", component: () => import("../views/platform/PlatformConfigurationsView.vue"), meta: { roles: ["SUPER_ADMIN"] } },
    ],
  },
  { path: "/:pathMatch(.*)*", redirect: "/login" },
];

const schoolScopedPaths = new Set([
  "/dashboard",
  "/students",
  "/teachers",
  "/parents",
  "/academics",
  "/timetable",
  "/exams",
  "/grades",
  "/attendance",
  "/finance",
  "/messages",
  "/notices",
  "/branding",
  "/audit",
  "/report-card",
]);

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior: () => ({ top: 0 }),
});

function orgAdmin(auth, config) {
  return auth.role === "HEADMASTER" || (config.singleTenant && auth.role === "SUPER_ADMIN");
}

router.beforeEach(async (to) => {
  const auth = useAuthStore();
  const config = useConfigStore();
  if (!auth.ready) auth.hydrate();
  if (!config.ready) await config.bootstrap();
  if (config.singleTenant && to.path === "/register") return "/login";
  if (config.singleTenant && to.path.startsWith("/platform")) return homeFor(auth.role);
  if (to.path === "/admins") {
    return auth.role === "SUPER_ADMIN" && !config.singleTenant ? "/platform/schools" : "/tenant/schools";
  }
  if (to.meta.guest && auth.isAuthed) return homeFor(auth.role);
  if (to.meta.auth && !auth.isAuthed) return { path: "/login", query: { next: to.fullPath } };
  if (to.meta.roles && !to.meta.roles.includes(auth.role)
      && !(config.singleTenant && auth.role === "SUPER_ADMIN" && to.meta.roles.includes("HEADMASTER"))) {
    return homeFor(auth.role);
  }
  if (orgAdmin(auth, config) && !auth.user?.schoolId && schoolScopedPaths.has(to.path)) {
    return "/tenant/schools";
  }
  return true;
});

export default router;
