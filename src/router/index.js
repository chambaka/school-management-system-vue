import { createRouter, createWebHistory } from "vue-router";
import { useAuthStore, homeFor } from "../stores/auth";
import { useConfigStore } from "../stores/config";
import { ACCOUNTANT_FINANCE_HOME } from "../utils/financeNav";

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
      { path: "dashboard", component: () => import("../views/admin/DashboardView.vue"), meta: { roles: ["HEADMASTER", "SCHOOL_ADMIN", "ACADEMIC_MASTER", "ACCOUNTANT"] } },
      { path: "students", component: () => import("../views/admin/StudentsView.vue"), meta: { roles: ["HEADMASTER", "SCHOOL_ADMIN", "ACADEMIC_MASTER", "TEACHER", "ACCOUNTANT", "STAFF"] } },
      { path: "users", component: () => import("../views/admin/SchoolUsersView.vue"), meta: { roles: ["HEADMASTER", "SCHOOL_ADMIN", "ACADEMIC_MASTER", "SUPER_ADMIN"] } },
      { path: "teachers", component: () => import("../views/admin/TeachersView.vue"), meta: { roles: ["HEADMASTER", "SCHOOL_ADMIN", "ACADEMIC_MASTER"] } },
      { path: "parents", component: () => import("../views/admin/ParentsView.vue"), meta: { roles: ["HEADMASTER", "SCHOOL_ADMIN", "ACADEMIC_MASTER"] } },
      { path: "academics", component: () => import("../views/admin/AcademicsView.vue"), meta: { roles: ["HEADMASTER", "SCHOOL_ADMIN", "ACADEMIC_MASTER"] } },
      { path: "timetable", component: () => import("../views/admin/TimetableView.vue"), meta: { roles: ["HEADMASTER", "SCHOOL_ADMIN", "ACADEMIC_MASTER", "TEACHER", "STAFF", "INVIGILATOR"] } },
      { path: "exams", component: () => import("../views/admin/ExamsView.vue"), meta: { roles: ["HEADMASTER", "SCHOOL_ADMIN", "ACADEMIC_MASTER", "TEACHER", "INVIGILATOR"] } },
      { path: "grades", component: () => import("../views/admin/GradesView.vue"), meta: { roles: ["HEADMASTER", "ACADEMIC_MASTER", "TEACHER"] } },
      { path: "assignments", component: () => import("../views/admin/AssignmentsView.vue"), meta: { roles: ["HEADMASTER", "SCHOOL_ADMIN", "ACADEMIC_MASTER", "TEACHER", "STUDENT", "PARENT"] } },
      { path: "attendance", component: () => import("../views/admin/AttendanceView.vue"), meta: { roles: ["HEADMASTER", "SCHOOL_ADMIN", "ACADEMIC_MASTER", "TEACHER", "STAFF"] } },
      { path: "finance", component: () => import("../views/admin/FinanceView.vue"), meta: { roles: ["HEADMASTER", "SCHOOL_ADMIN", "ACCOUNTANT", "PARENT"], financeSection: "all" } },
      { path: "finance/fees/structures", component: () => import("../views/admin/FinanceView.vue"), meta: { roles: ["HEADMASTER", "SCHOOL_ADMIN", "ACCOUNTANT"], financeSection: "fee-structures" } },
      { path: "finance/fees/structure", redirect: "/finance/fees/structures" },
      { path: "finance/invoices", component: () => import("../views/admin/FinanceView.vue"), meta: { roles: ["HEADMASTER", "ACCOUNTANT"], financeSection: "invoices" } },
      { path: "finance/invoices/generate", redirect: "/finance/invoices" },
      { path: "finance/payments/record", component: () => import("../views/admin/FinanceView.vue"), meta: { roles: ["ACCOUNTANT"], financeSection: "record-payment" } },
      { path: "finance/payments/discount", component: () => import("../views/admin/FinanceView.vue"), meta: { roles: ["ACCOUNTANT"], financeSection: "discount" } },
      { path: "finance/ledger", component: () => import("../views/admin/FinanceView.vue"), meta: { roles: ["HEADMASTER", "SCHOOL_ADMIN", "ACCOUNTANT", "PARENT"], financeSection: "ledger" } },
      { path: "reports", component: () => import("../views/admin/ReportsView.vue"), meta: { roles: ["HEADMASTER", "SCHOOL_ADMIN", "ACADEMIC_MASTER", "ACCOUNTANT", "TEACHER"] } },
      { path: "messages", component: () => import("../views/MessagesView.vue"), meta: { roles: ["HEADMASTER", "SCHOOL_ADMIN", "ACADEMIC_MASTER", "TEACHER", "ACCOUNTANT", "PARENT"] } },
      { path: "notices", component: () => import("../views/admin/NoticesView.vue") },
      { path: "branding", component: () => import("../views/admin/BrandingView.vue"), meta: { roles: ["HEADMASTER", "SCHOOL_ADMIN"] } },
      { path: "security", component: () => import("../views/auth/ChangePasswordView.vue") },
      { path: "audit", component: () => import("../views/admin/AuditView.vue"), meta: { roles: ["HEADMASTER", "SCHOOL_ADMIN", "ACADEMIC_MASTER", "ACCOUNTANT"] } },
      { path: "tenant/schools", component: () => import("../views/tenant/TenantSchoolsView.vue"), meta: { roles: ["ORGANIZATION_ADMIN", "SUPER_ADMIN"] } },
      { path: "tenant/audit", component: () => import("../views/tenant/OrganizationAuditView.vue"), meta: { roles: ["ORGANIZATION_ADMIN", "SUPER_ADMIN"] } },
      { path: "tenant/schools/new", component: () => import("../views/platform/AddSchoolView.vue"), meta: { roles: ["ORGANIZATION_ADMIN", "SUPER_ADMIN"] } },
      { path: "tenant/admins/new", component: () => import("../views/platform/CreateOrganizationAdminView.vue"), meta: { roles: ["SUPER_ADMIN"] } },
      { path: "tenant/schools/:schoolId/officers", component: () => import("../views/admin/SchoolAdminsView.vue"), meta: { roles: ["HEADMASTER", "SCHOOL_ADMIN", "ACADEMIC_MASTER", "ORGANIZATION_ADMIN", "SUPER_ADMIN"] } },
      { path: "platform/tenants", component: () => import("../views/platform/TenantsView.vue"), meta: { roles: ["SUPER_ADMIN"] } },
      { path: "platform/tenants/new", component: () => import("../views/platform/CreateTenantView.vue"), meta: { roles: ["SUPER_ADMIN"] } },
      { path: "platform/tenants/:tenantId/schools/new", component: () => import("../views/platform/AddSchoolView.vue"), meta: { roles: ["SUPER_ADMIN"] } },
      { path: "platform/tenants/:tenantId/admins/new", component: () => import("../views/platform/CreateOrganizationAdminView.vue"), meta: { roles: ["SUPER_ADMIN"] } },
      { path: "report-card", component: () => import("../views/student/ReportCardView.vue"), meta: { roles: ["HEADMASTER", "SCHOOL_ADMIN", "ACADEMIC_MASTER", "TEACHER", "STUDENT", "PARENT"] } },
      { path: "teacher", component: () => import("../views/teacher/TeacherHomeView.vue"), meta: { roles: ["TEACHER"] } },
      { path: "alerts", component: () => import("../views/teacher/AlertsView.vue"), meta: { roles: ["TEACHER"] } },
      { path: "student", component: () => import("../views/student/StudentHomeView.vue"), meta: { roles: ["STUDENT"] } },
      { path: "invoices", component: () => import("../views/student/StudentInvoicesView.vue"), meta: { roles: ["STUDENT"] } },
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
  "/users",
  "/teachers",
  "/parents",
  "/academics",
  "/timetable",
  "/exams",
  "/grades",
  "/assignments",
  "/attendance",
  "/finance",
  "/reports",
  "/alerts",
  "/messages",
  "/notices",
  "/branding",
  "/audit",
  "/report-card",
]);

function isSchoolScoped(path) {
  if (schoolScopedPaths.has(path)) return true;
  for (const prefix of schoolScopedPaths) {
    if (path.startsWith(`${prefix}/`)) return true;
  }
  return false;
}

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior: () => ({ top: 0 }),
});

function orgAdmin(auth, config) {
  return auth.role === "ORGANIZATION_ADMIN" || (config.singleTenant && auth.role === "SUPER_ADMIN");
}

router.beforeEach(async (to) => {
  const auth = useAuthStore();
  const config = useConfigStore();
  if (!auth.ready) auth.hydrate();
  if (!config.ready) await config.bootstrap();
  if (config.singleTenant && to.path === "/register") return "/login";
  if (config.singleTenant && to.path.startsWith("/platform") && to.path !== "/platform/configurations") {
    return homeFor(auth.role);
  }
  if (to.path === "/admins") {
    return auth.role === "SUPER_ADMIN" && !config.singleTenant ? "/platform/schools" : "/tenant/schools";
  }
  if (to.meta.guest && auth.isAuthed) return homeFor(auth.role);
  if (to.meta.auth && !auth.isAuthed) return { path: "/login", query: { next: to.fullPath } };
  if (to.meta.roles && !to.meta.roles.includes(auth.role)
      && !(config.singleTenant && auth.role === "SUPER_ADMIN" && to.meta.roles.includes("HEADMASTER"))) {
    return homeFor(auth.role);
  }
  if (auth.role === "ACCOUNTANT" && to.path === "/finance") {
    return ACCOUNTANT_FINANCE_HOME;
  }
  const platformUsers = auth.role === "SUPER_ADMIN" && to.path === "/users";
  if (!platformUsers && orgAdmin(auth, config) && !auth.user?.schoolId && isSchoolScoped(to.path)) {
    return "/tenant/schools";
  }
  return true;
});

export default router;
