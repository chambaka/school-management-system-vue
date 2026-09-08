<script setup>
import { computed, onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import HaloCrest from "../components/HaloCrest.vue";
import Icon from "../components/Icon.vue";
import { schoolApi } from "../api/endpoints";
import { useAuthStore, homeFor } from "../stores/auth";
import { useBrandingStore } from "../stores/branding";
import { useConfigStore } from "../stores/config";
import { correctionId } from "../utils/correctionId";
import {
  ACADEMIC_STAFF,
  AUDIT,
  DASHBOARD,
  EXAMS,
  FINANCE,
  HEADMASTER,
  MESSAGES,
  NOTICES,
  PEOPLE_MANAGE,
  ROLE_LABELS,
  STUDENT_DIRECTORY,
  SUPER_ADMIN,
  TEACHER_MANAGE,
  TIMETABLE,
} from "../utils/roles";

const auth = useAuthStore();
const branding = useBrandingStore();
const config = useConfigStore();
const route = useRoute();
const router = useRouter();
const moreOpen = ref(false);

const schoolScoped = new Set([
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
    { to: "/parent", label: "Home", roles: ["PARENT"], icon: "home" },
    { to: "/platform/tenants", label: "Tenants", roles: [SUPER_ADMIN], icon: "users" },
    { to: "/platform/schools", label: "Schools", roles: [SUPER_ADMIN], icon: "school" },
    { to: "/platform/configurations", label: "Config", roles: [SUPER_ADMIN], icon: "settings" },
    { to: "/tenant/schools", label: "Schools", roles: [HEADMASTER], icon: "school" },
    { to: "/students", label: "Students", roles: STUDENT_DIRECTORY, icon: "users" },
    { to: "/teachers", label: "Teachers", roles: TEACHER_MANAGE, icon: "user" },
    { to: "/parents", label: "Parents", roles: PEOPLE_MANAGE, icon: "users" },
    { to: "/academics", label: "Academics", roles: PEOPLE_MANAGE, icon: "book" },
    { to: "/timetable", label: "Timetable", roles: TIMETABLE, icon: "calendar" },
    { to: "/exams", label: "Exams", roles: EXAMS, icon: "list" },
    { to: "/grades", label: "Grades", roles: EXAMS, icon: "check" },
    { to: "/attendance", label: "Attendance", roles: ACADEMIC_STAFF, icon: "check" },
    { to: "/finance", label: "Finance", roles: FINANCE, icon: "coin" },
    { to: "/messages", label: "Messages", roles: MESSAGES, icon: "bell" },
    { to: "/notices", label: "Notices", roles: NOTICES, icon: "bell" },
    { to: "/report-card", label: "Report", roles: ["STUDENT", "PARENT"], icon: "book" },
    { to: "/branding", label: "Branding", roles: ["HEADMASTER"], icon: "palette" },
    { to: "/audit", label: "Audit", roles: AUDIT, icon: "search" },
    { to: "/platform/audit", label: "Audit", roles: [SUPER_ADMIN], icon: "search" },
    { to: "/security", label: "Security", roles: [...DASHBOARD, "TEACHER", "STUDENT", "PARENT", SUPER_ADMIN], icon: "shield" },
  ];
  return all.filter((item) => {
    if (!item.roles.includes(role)) return false;
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
  mobileTabs.value.more.some((item) => route.path === item.to || route.path.startsWith(`${item.to}/`)),
);

const organizationName = computed(() => {
  if (branding.current?.tenantName) return branding.current.tenantName;
  if (auth.role === "SUPER_ADMIN" && !auth.user?.schoolId) return "Platform";
  return "Organization";
});

const schoolName = computed(() => {
  if (branding.current?.name) return branding.current.name;
  if (auth.role === "SUPER_ADMIN" && !auth.user?.schoolId) return "ShuleHub";
  return "School";
});

const roleLabel = computed(() => ROLE_LABELS[auth.role] || auth.role || "");

watch(() => route.fullPath, () => {
  moreOpen.value = false;
});

async function loadSchoolBranding() {
  if (!auth.user?.schoolId) return;
  try {
    branding.applySchool(await schoolApi.current());
  } catch {
    // keep ShuleHub defaults on localhost and unmapped hosts
  }
}

onMounted(loadSchoolBranding);
watch(() => auth.user?.schoolId, loadSchoolBranding);

function logout() {
  moreOpen.value = false;
  auth.logout();
  router.push("/login");
}
</script>

<template>
  <div class="shell">
    <aside class="side glass">
      <router-link :to="homeFor(auth.role)" class="logo">
        <img v-if="branding.current?.logoUrl" :src="branding.current.logoUrl" alt="" />
        <HaloCrest v-else :size="44" />
        <div>
          <small>{{ organizationName }}</small>
          <strong>{{ schoolName }}</strong>
          <span v-if="roleLabel" class="role">{{ roleLabel }}</span>
        </div>
      </router-link>
      <nav>
        <router-link v-for="item in nav" :key="item.to" :to="item.to">
          <i><Icon :name="item.icon" /></i>
          {{ item.label }}
        </router-link>
      </nav>
      <div class="who">
        <p>{{ auth.user?.name }}</p>
        <small>{{ roleLabel }} · {{ correctionId() }}</small>
        <button class="btn btn-ghost" type="button" v-confirm="'Sign out of ShuleHub?'" @click="logout">Sign out</button>
      </div>
    </aside>
    <div class="main">
      <header class="top">
        <div>
          <strong>{{ schoolName }}</strong>
          <small>{{ roleLabel }} · {{ organizationName }}</small>
        </div>
        <button class="btn btn-ghost" type="button" v-confirm="'Sign out of ShuleHub?'" @click="logout">Sign out</button>
      </header>
      <router-view />
    </div>
    <nav class="tabs glass" :style="{ gridTemplateColumns: `repeat(${mobileTabs.tabs.length + (mobileTabs.more.length ? 1 : 0)}, 1fr)` }">
      <router-link v-for="item in mobileTabs.tabs" :key="item.to" :to="item.to">
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
          <router-link v-for="item in mobileTabs.more" :key="item.to" :to="item.to">
            <i><Icon :name="item.icon" /></i>
            {{ item.label }}
          </router-link>
        </nav>
        <button class="btn btn-ghost" type="button" v-confirm="'Sign out of ShuleHub?'" @click="logout">Sign out</button>
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
  align-items: center;
  color: inherit;
  margin-bottom: 1.35rem;
}
.logo img { width: 42px; height: 42px; border-radius: 50%; }
.logo small { display: block; color: var(--primary); letter-spacing: 0.16em; font-size: 0.62rem; font-weight: 800; }
.logo strong { display: block; font-size: 0.92rem; }
.logo .role {
  display: block;
  margin-top: 0.2rem;
  color: var(--muted);
  font-size: 0.72rem;
  font-weight: 700;
}
.side nav { display: grid; gap: 0.2rem; }
.side nav a {
  color: var(--muted);
  padding: 0.58rem 0.6rem;
  border-radius: 14px;
  display: flex;
  align-items: center;
  gap: 0.65rem;
  font-weight: 650;
}
.side nav a i {
  width: 1.7rem;
  height: 1.7rem;
  border-radius: 9px;
  display: grid;
  place-items: center;
  background: rgba(255,255,255,.04);
}
.side nav a.router-link-active {
  background: color-mix(in srgb, var(--primary) 14%, transparent);
  color: var(--text);
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--primary) 28%, transparent);
}
.side nav a.router-link-active i {
  background: color-mix(in srgb, var(--primary) 22%, transparent);
  color: var(--primary);
}
.who { margin-top: auto; padding-top: 1rem; color: var(--muted); font-size: 0.78rem; }
.who p { margin: 0 0 0.2rem; color: var(--text); font-weight: 700; }
.who .btn { margin-top: 0.7rem; width: 100%; }
.top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: calc(0.9rem + env(safe-area-inset-top, 0px)) 1rem 0.9rem;
}
.top small { display: block; color: var(--muted); }
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
  color: var(--muted);
  text-align: center;
  font-size: 0.6rem;
  font-weight: 800;
  display: grid;
  justify-items: center;
  gap: 0.15rem;
  min-height: 44px;
  background: none;
  border: 0;
  cursor: pointer;
  font-family: inherit;
  padding: 0.15rem 0;
}
.tabs a.router-link-active,
.more-tab.active { color: var(--primary); }
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
  color: var(--text);
  padding: 0.72rem 0.65rem;
  border-radius: 14px;
  display: flex;
  align-items: center;
  gap: 0.7rem;
  font-weight: 700;
  min-height: 44px;
}
.more-sheet nav a i {
  width: 1.7rem;
  height: 1.7rem;
  border-radius: 9px;
  display: grid;
  place-items: center;
  background: rgba(255,255,255,.04);
  color: var(--primary);
}
.more-sheet nav a.router-link-active {
  background: color-mix(in srgb, var(--primary) 14%, transparent);
}
.more-sheet .btn { width: 100%; margin-top: 0.7rem; }
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
