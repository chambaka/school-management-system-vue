<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import HaloCrest from "../components/HaloCrest.vue";
import Icon from "../components/Icon.vue";
import AccountantFinanceNav from "../components/AccountantFinanceNav.vue";
import { schoolApi, tenantApi } from "../api/endpoints";
import { useAuthStore, homeFor } from "../stores/auth";
import { useBrandingStore } from "../stores/branding";
import { useConfigStore } from "../stores/config";
import { useConfirmStore } from "../stores/confirm";
import { formatSessionElapsed } from "../utils/sessionClock";
import { ACCOUNTANT_FINANCE_HOME } from "../utils/financeNav";
import {
  ACADEMIC_STAFF,
  ACCOUNTANT,
  AUDIT,
  DASHBOARD,
  ASSIGNMENTS,
  EXAMS,
  FINANCE,
  HEADMASTER,
  ORGANIZATION_ADMIN,
  MESSAGES,
  NOTICES,
  PEOPLE_MANAGE,
  REPORTS,
  ROLE_LABELS,
  STUDENT_DIRECTORY,
  SUPER_ADMIN,
  TEACHER_MANAGE,
  TIMETABLE,
} from "../utils/roles";

const auth = useAuthStore();
const branding = useBrandingStore();
const config = useConfigStore();
const confirm = useConfirmStore();
const route = useRoute();
const router = useRouter();
const moreOpen = ref(false);

const schoolScoped = new Set([
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
  "/messages",
  "/notices",
  "/report-card",
  "/branding",
  "/audit",
]);

const nav = computed(() => {
  const role = config.singleTenant && auth.role === SUPER_ADMIN ? "HEADMASTER" : auth.role;
  const hasSchool = Boolean(auth.user?.schoolId);
  const all = [
    { to: "/dashboard", label: "Home", roles: DASHBOARD, icon: "home" },
    { to: "/teacher", label: "Home", roles: ["TEACHER"], icon: "home" },
    { to: "/student", label: "Home", roles: ["STUDENT"], icon: "home" },
    { to: "/invoices", label: "Invoices", roles: ["STUDENT"], icon: "coin" },
    { to: "/parent", label: "Home", roles: ["PARENT"], icon: "home" },
    { to: "/platform/tenants", label: "Tenants", roles: [SUPER_ADMIN], icon: "users" },
    { to: "/platform/schools", label: "Schools", roles: [SUPER_ADMIN], icon: "school" },
    { to: "/platform/configurations", label: "Config", roles: [SUPER_ADMIN], icon: "settings", platformAdmin: true },
    { to: "/tenant/schools", label: "Schools", roles: [ORGANIZATION_ADMIN], icon: "school", orgMenu: true },
    { to: "/tenant/audit", label: "Audit", roles: [ORGANIZATION_ADMIN], icon: "search", orgMenu: true },
    { to: "/students", label: "Students", roles: STUDENT_DIRECTORY, icon: "users" },
    { to: "/users", label: "Users", roles: [...PEOPLE_MANAGE, SUPER_ADMIN], icon: "user" },
    { to: `/tenant/schools/${auth.user?.schoolId || 0}/officers`, label: "Officers", roles: [HEADMASTER, "SCHOOL_ADMIN"], icon: "user", needsSchool: true },
    { to: "/teachers", label: "Teachers", roles: TEACHER_MANAGE, icon: "user" },
    { to: "/parents", label: "Parents", roles: PEOPLE_MANAGE, icon: "users" },
    { to: "/academics", label: "Academics", roles: PEOPLE_MANAGE, icon: "book" },
    { to: "/timetable", label: "Timetable", roles: TIMETABLE, icon: "calendar" },
    { to: "/exams", label: "Exams", roles: EXAMS, icon: "list" },
    { to: "/grades", label: "Grades", roles: ["HEADMASTER", "ACADEMIC_MASTER", "TEACHER"], icon: "check" },
    { to: "/assignments", label: "Assignments", roles: ASSIGNMENTS, icon: "list" },
    { to: "/attendance", label: "Attendance", roles: [...ACADEMIC_STAFF, "STAFF"], icon: "check" },
    { to: "/finance", label: "Finance", roles: FINANCE, icon: "coin", matchPrefix: "/finance", tree: role === ACCOUNTANT },
    { to: "/reports", label: "Reports", roles: REPORTS, icon: "book" },
    { to: "/messages", label: "Messages", roles: MESSAGES, icon: "bell" },
    { to: "/notices", label: "Notices", roles: NOTICES, icon: "bell" },
    { to: "/report-card", label: "Report", roles: ["STUDENT", "PARENT"], icon: "book" },
    { to: "/branding", label: "Branding", roles: ["HEADMASTER", "SCHOOL_ADMIN"], icon: "palette" },
    { to: "/audit", label: "Audit", roles: AUDIT, icon: "search" },
    { to: "/platform/audit", label: "Audit", roles: [SUPER_ADMIN], icon: "search" },
    { to: "/security", label: "Security", roles: [...DASHBOARD, "TEACHER", "STAFF", "INVIGILATOR", "STUDENT", "PARENT", SUPER_ADMIN, ORGANIZATION_ADMIN], icon: "shield" },
  ];
  return all.filter((item) => {
    if (item.orgMenu && auth.role === SUPER_ADMIN) return config.singleTenant;
    const effective = item.platformAdmin ? auth.role : role;
    if (!item.roles.includes(effective)) return false;
    if (item.needsSchool && !hasSchool) return false;
    if (role === "HEADMASTER" && !hasSchool && schoolScoped.has(item.to) && auth.role !== SUPER_ADMIN) return false;
    return true;
  });
});

const mobileTabs = computed(() => {
  const items = nav.value;
  if (items.length <= 5) return { tabs: items, more: [] };
  return { tabs: items.slice(0, 4), more: items.slice(4) };
});

const moreActive = computed(() =>
  mobileTabs.value.more.some((item) => isNavActive(item)),
);

const financeOpen = ref(false);

watch(() => route.path, (path) => {
  if (path.startsWith("/finance") && auth.role === ACCOUNTANT) financeOpen.value = true;
}, { immediate: true });

function isNavActive(item) {
  const prefix = item.matchPrefix || item.to;
  return route.path === prefix || route.path.startsWith(`${prefix}/`);
}

function financeTo(item) {
  return item.tree ? ACCOUNTANT_FINANCE_HOME : item.to;
}

function onFinanceParent() {
  if (route.path.startsWith("/finance")) {
    financeOpen.value = !financeOpen.value;
    return;
  }
  financeOpen.value = true;
  router.push(ACCOUNTANT_FINANCE_HOME);
}

const isPlatformAdmin = computed(() => auth.role === SUPER_ADMIN);
const isOrganizationAdmin = computed(() => auth.role === ORGANIZATION_ADMIN);

const organizationName = computed(() => {
  if (isPlatformAdmin.value || isOrganizationAdmin.value) return "";
  if (branding.current?.tenantName) return branding.current.tenantName;
  return "Organization";
});

const schoolName = computed(() => {
  if (isPlatformAdmin.value) return "ShuleHub";
  if (isOrganizationAdmin.value) return branding.organizationName || "Organization";
  if (branding.current?.name) return branding.current.name;
  return "School";
});

const roleLabel = computed(() => ROLE_LABELS[auth.role] || auth.role || "");
const displayName = computed(() => (isPlatformAdmin.value ? "" : auth.user?.name || ""));
const now = ref(Date.now());
let sessionTick = 0;
const sessionElapsed = computed(() => (
  isPlatformAdmin.value ? "" : formatSessionElapsed(auth.sessionStartedAt, now.value)
));

watch(() => route.fullPath, () => {
  moreOpen.value = false;
});

async function loadOrganizationName() {
  if (!isOrganizationAdmin.value) return;
  try {
    const tenant = await tenantApi.current();
    branding.setOrganizationName(tenant?.name || "");
  } catch {
    branding.setOrganizationName("");
  }
}

async function loadSchoolBranding() {
  if (!auth.user?.schoolId) return;
  try {
    branding.applySchool(await schoolApi.current());
  } catch {
    // keep ShuleHub defaults on localhost and unmapped hosts
  }
}

onMounted(() => {
  loadOrganizationName();
  loadSchoolBranding();
  sessionTick = window.setInterval(() => {
    now.value = Date.now();
  }, 1000);
});
onUnmounted(() => {
  window.clearInterval(sessionTick);
});
watch(() => auth.user?.schoolId, loadSchoolBranding);
watch(() => auth.role, loadOrganizationName);

async function logout() {
  const ok = await confirm.ask({
    message: "Sign out of ShuleHub?",
    confirmLabel: "Sign out",
  });
  if (!ok) return;
  moreOpen.value = false;
  await auth.logout();
  await router.replace("/login");
}
</script>

<template>
  <div class="shell">
    <aside class="side glass">
      <router-link :to="homeFor(auth.role)" class="logo">
        <img v-if="!isPlatformAdmin && branding.current?.logoUrl" :src="branding.current.logoUrl" alt="" />
        <HaloCrest v-else :size="44" />
        <div>
          <small v-if="organizationName">{{ organizationName }}</small>
          <strong>{{ schoolName }}</strong>
          <span v-if="roleLabel" class="role">{{ roleLabel }}</span>
          <span v-if="displayName" class="who-name">{{ displayName }}</span>
          <time v-if="sessionElapsed" class="session" :title="`Signed in for ${sessionElapsed}`">{{ sessionElapsed }}</time>
        </div>
      </router-link>
      <nav>
        <template v-for="item in nav" :key="item.to">
          <div v-if="item.tree" class="nav-branch">
            <button
              class="nav-parent"
              type="button"
              :class="{ active: isNavActive(item) }"
              :aria-expanded="financeOpen"
              @click="onFinanceParent"
            >
              <i><Icon :name="item.icon" /></i>
              {{ item.label }}
              <span class="chevron" :class="{ open: financeOpen }"><Icon name="chevron" /></span>
            </button>
            <AccountantFinanceNav v-show="financeOpen" variant="side" />
          </div>
          <router-link v-else :to="item.to" :class="{ 'router-link-active': isNavActive(item) }">
            <i><Icon :name="item.icon" /></i>
            {{ item.label }}
          </router-link>
        </template>
      </nav>
      <div class="who">
        <button
          class="sign-out"
          type="button"
          title="Sign out"
          aria-label="Sign out"
          @click="logout"
        >
          <i><Icon name="logout" /></i>
          Sign out
        </button>
      </div>
    </aside>
    <div class="main">
      <header class="top">
        <div>
          <strong>{{ isPlatformAdmin ? "ShuleHub" : (displayName || schoolName) }}</strong>
          <small>
            <span v-if="roleLabel">{{ roleLabel }}</span>
            <span v-if="!isPlatformAdmin && roleLabel && sessionElapsed"> · </span>
            <time v-if="!isPlatformAdmin && sessionElapsed" :title="`Signed in for ${sessionElapsed}`">{{ sessionElapsed }}</time>
          </small>
        </div>
        <button
          class="sign-out icon-only"
          type="button"
          title="Sign out"
          aria-label="Sign out"
          @click="logout"
        >
          <Icon name="logout" />
        </button>
      </header>
      <router-view />
    </div>
    <nav class="tabs glass" :style="{ gridTemplateColumns: `repeat(${mobileTabs.tabs.length + (mobileTabs.more.length ? 1 : 0)}, 1fr)` }">
      <router-link
        v-for="item in mobileTabs.tabs"
        :key="item.to"
        :to="financeTo(item)"
        :class="{ 'router-link-active': isNavActive(item) }"
      >
        <Icon :name="item.icon" />
        <span>{{ item.label }}</span>
      </router-link>
      <button
        v-if="mobileTabs.more.length"
        class="more-tab"
        type="button"
        :class="{ active: moreOpen || moreActive }"
        @click="moreOpen = !moreOpen"
      >
        <Icon name="more" />
        <span>More</span>
      </button>
    </nav>
    <div v-if="moreOpen" class="more-scrim" @click.self="moreOpen = false">
      <div class="more-sheet glass" role="dialog" aria-label="More">
        <p class="more-title">More</p>
        <nav>
          <template v-for="item in mobileTabs.more" :key="item.to">
            <div v-if="item.tree" class="more-branch">
              <router-link :to="financeTo(item)" :class="{ 'router-link-active': isNavActive(item) }">
                <i><Icon :name="item.icon" /></i>
                {{ item.label }}
              </router-link>
            <AccountantFinanceNav variant="panel" />
            </div>
            <router-link v-else :to="item.to" :class="{ 'router-link-active': isNavActive(item) }">
              <i><Icon :name="item.icon" /></i>
              {{ item.label }}
            </router-link>
          </template>
        </nav>
        <button
          class="sign-out"
          type="button"
          title="Sign out"
          aria-label="Sign out"
          @click="logout"
        >
          <i><Icon name="logout" /></i>
          Sign out
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.shell { min-height: 100dvh; }
.side { display: none; }
.logo {
  display: flex;
  gap: 0.75rem;
  align-items: flex-start;
  color: inherit;
  margin-bottom: 1.35rem;
}
.logo img { width: 42px; height: 42px; border-radius: 50%; flex-shrink: 0; }
.logo small { display: block; color: var(--primary); letter-spacing: 0.16em; font-size: 0.62rem; font-weight: 800; }
.logo strong { display: block; font-size: 0.92rem; }
.logo .role {
  display: block;
  margin-top: 0.2rem;
  color: var(--muted);
  font-size: 0.72rem;
  font-weight: 700;
}
.logo .who-name {
  display: block;
  margin-top: 0.08rem;
  color: var(--text);
  font-size: 0.78rem;
  font-weight: 700;
  max-width: 11.5rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.logo .session {
  display: block;
  margin-top: 0.12rem;
  color: var(--muted);
  font-size: 0.68rem;
  font-weight: 650;
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.04em;
  opacity: 0.8;
}
.side nav { display: grid; gap: 0.15rem; overflow-y: auto; flex: 1; }
.side nav a,
.nav-parent {
  color: #f5c451;
  padding: 0.58rem 0.6rem;
  border-radius: 14px;
  border: 0;
  background: none;
  box-shadow: none;
  display: flex;
  align-items: center;
  gap: 0.65rem;
  font-weight: 800;
  letter-spacing: 0.045em;
  text-decoration: none;
  text-shadow:
    0 1px 0 #fff6d2,
    0 2px 0 #a97812,
    0 4px 8px rgba(0, 0, 0, 0.45);
}
.nav-parent {
  width: 100%;
  font: inherit;
  cursor: pointer;
  text-align: left;
}
.nav-parent .chevron {
  margin-left: auto;
  display: grid;
  place-items: center;
  transition: transform 0.15s ease;
}
.nav-parent .chevron.open { transform: rotate(180deg); }
.side nav a:hover,
.nav-parent:hover,
.side nav a:focus-visible,
.nav-parent:focus-visible {
  color: #ffe9a8;
  outline: none;
}
.nav-branch :deep(.fin-nav) {
  margin: 0.4rem -0.35rem 0.65rem 0.85rem;
  padding: 0.45rem 0.4rem 0.5rem;
  border-radius: 16px;
  background: color-mix(in srgb, var(--primary) 12%, rgba(6, 16, 31, 0.88));
  border: 1px solid color-mix(in srgb, var(--primary) 42%, transparent);
  box-shadow:
    10px 12px 28px rgba(0, 0, 0, 0.38),
    inset 0 1px 0 rgba(255, 255, 255, 0.14);
}
.side nav a i,
.nav-parent i {
  width: 1.7rem;
  height: 1.7rem;
  border-radius: 9px;
  display: grid;
  place-items: center;
  background: rgba(245, 196, 81, 0.1);
  color: #f5c451;
  box-shadow: none;
}
.side nav a.router-link-active,
.nav-parent.active {
  color: #fff4c8;
  background: none;
  box-shadow: none;
  text-shadow:
    0 1px 0 #fff,
    0 2px 0 #c9972a,
    0 0 14px rgba(255, 224, 138, 0.85);
}
.side nav a.router-link-active i,
.nav-parent.active i {
  background: rgba(255, 244, 200, 0.16);
  color: #fff4c8;
}
.more-branch { display: grid; gap: 0.2rem; }
.more-branch :deep(.fin-nav.panel) { margin: 0 0 0.35rem; }
.who { margin-top: auto; padding-top: 1rem; }
.sign-out {
  display: inline-flex;
  align-items: center;
  gap: 0.65rem;
  margin: 0;
  padding: 0.58rem 0.6rem;
  border: 0;
  border-radius: 14px;
  background: none;
  color: #f5c451;
  font: inherit;
  font-weight: 800;
  letter-spacing: 0.045em;
  cursor: pointer;
  text-align: left;
  text-shadow:
    0 1px 0 #fff6d2,
    0 2px 0 #a97812,
    0 4px 8px rgba(0, 0, 0, 0.45);
}
.sign-out i {
  width: 1.7rem;
  height: 1.7rem;
  border-radius: 9px;
  display: grid;
  place-items: center;
  background: rgba(245, 196, 81, 0.1);
  color: #f5c451;
}
.sign-out:hover,
.sign-out:focus-visible {
  color: #fff4c8;
  background: none;
  outline: none;
}
.who .sign-out {
  width: 100%;
}
.sign-out.icon-only {
  width: 2.6rem;
  height: 2.6rem;
  padding: 0;
  justify-content: center;
  color: var(--primary);
}
.sign-out.icon-only:hover,
.sign-out.icon-only:focus-visible {
  color: var(--primary);
}
.top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: calc(0.9rem + env(safe-area-inset-top, 0px)) 1rem 0.9rem;
}
.top small { display: block; color: var(--muted); }
.top time {
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.03em;
  opacity: 0.85;
}
.tabs {
  position: fixed;
  left: max(0.65rem, env(safe-area-inset-left, 0px));
  right: max(0.65rem, env(safe-area-inset-right, 0px));
  bottom: calc(0.65rem + env(safe-area-inset-bottom, 0px));
  display: grid;
  padding: 0.45rem 0.3rem;
  z-index: 20;
}
.tabs a,
.more-tab {
  color: #f5c451;
  text-align: center;
  font-size: 0.62rem;
  font-weight: 800;
  letter-spacing: 0.03em;
  display: grid;
  justify-items: center;
  gap: 0.15rem;
  min-height: 44px;
  margin: 0;
  border: 0;
  border-radius: 12px;
  cursor: pointer;
  font-family: inherit;
  padding: 0.15rem 0;
  text-decoration: none;
  background: none;
  box-shadow: none;
  text-shadow:
    0 1px 0 #fff6d2,
    0 2px 0 #a97812;
}
.tabs a.router-link-active,
.more-tab.active {
  color: #fff4c8;
  text-shadow:
    0 1px 0 #fff,
    0 0 10px rgba(255, 224, 138, 0.9);
}
.more-scrim {
  position: fixed;
  inset: 0;
  z-index: 30;
  background: rgba(4, 10, 22, 0.55);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  padding: 0 0.65rem calc(5.4rem + env(safe-area-inset-bottom, 0px));
}
.more-sheet {
  width: min(100%, 420px);
  padding: 1rem 0.9rem 1.1rem;
  margin-bottom: 0.35rem;
  max-height: min(70dvh, 520px);
  overflow: auto;
}
.more-title {
  margin: 0 0 0.65rem;
  color: var(--muted);
  font-size: 0.7rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
.more-sheet nav { display: grid; gap: 0.15rem; }
.more-sheet nav a {
  color: #f5c451;
  padding: 0.72rem 0.65rem;
  border-radius: 14px;
  border: 0;
  display: flex;
  align-items: center;
  gap: 0.7rem;
  font-weight: 800;
  letter-spacing: 0.045em;
  min-height: 44px;
  text-decoration: none;
  background: none;
  box-shadow: none;
  text-shadow:
    0 1px 0 #fff6d2,
    0 2px 0 #a97812,
    0 4px 8px rgba(0, 0, 0, 0.45);
}
.more-sheet nav a i {
  width: 1.7rem;
  height: 1.7rem;
  border-radius: 9px;
  display: grid;
  place-items: center;
  background: rgba(245, 196, 81, 0.1);
  color: #f5c451;
}
.more-sheet nav a.router-link-active {
  color: #fff4c8;
  background: none;
  text-shadow:
    0 1px 0 #fff,
    0 0 14px rgba(255, 224, 138, 0.85);
}
.more-sheet .sign-out { width: 100%; margin-top: 0.7rem; }
@media (min-width: 900px) {
  .shell { display: grid; grid-template-columns: 268px 1fr; }
  .side {
    display: flex;
    flex-direction: column;
    padding: 1.2rem 1rem;
    margin: 0.9rem 0 0.9rem 0.9rem;
    min-height: calc(100dvh - 1.8rem);
  }
  .tabs, .top, .more-scrim { display: none; }
}
</style>
