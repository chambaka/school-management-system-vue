import { defineStore } from "pinia";
import { authApi, sessionApi } from "../api/endpoints";
import { clearTokens, getAccessToken, setTokens } from "../api/http";
import { useConfigStore } from "./config";

const USER_KEY = "shulehub.user";
const SESSION_STARTED_KEY = "shulehub.sessionStartedAt";

function readSessionStart() {
  const started = Number(localStorage.getItem(SESSION_STARTED_KEY));
  return Number.isFinite(started) && started > 0 ? started : null;
}

export function homeFor(role) {
  switch (role) {
    case "SUPER_ADMIN":
      return useConfigStore().singleTenant ? "/tenant/schools" : "/platform/tenants";
    case "ORGANIZATION_ADMIN":
      return "/tenant/schools";
    case "HEADMASTER":
    case "SCHOOL_ADMIN":
      return "/dashboard";
    case "ACADEMIC_MASTER":
      return "/dashboard";
    case "ACCOUNTANT":
      return "/dashboard";
    case "STAFF":
      return "/notices";
    case "INVIGILATOR":
      return "/exams";
    case "TEACHER":
      return "/teacher";
    case "STUDENT":
      return "/student";
    case "PARENT":
      return "/parent";
    default:
      return "/dashboard";
  }
}

export const useAuthStore = defineStore("auth", {
  state: () => ({
    user: null,
    ready: false,
    sessionStartedAt: null,
    accessToken: null,
  }),
  getters: {
    isAuthed: (s) => Boolean(s.user && s.accessToken),
    role: (s) => s.user?.role,
    hasRole: (s) => (roles) => roles.includes(s.user?.role),
  },
  actions: {
    hydrate() {
      try {
        const raw = localStorage.getItem(USER_KEY);
        this.user = raw ? JSON.parse(raw) : null;
      } catch {
        this.user = null;
      }
      this.sessionStartedAt = readSessionStart();
      this.accessToken = getAccessToken();
      if (this.user && !this.sessionStartedAt) this.markSessionStart();
      this.ready = true;
    },
    persist(user) {
      this.user = user;
      localStorage.setItem(USER_KEY, JSON.stringify(user));
    },
    markSessionStart() {
      const started = Date.now();
      this.sessionStartedAt = started;
      localStorage.setItem(SESSION_STARTED_KEY, String(started));
    },
    applyAuth(response, { startSession = false } = {}) {
      setTokens(response);
      this.accessToken = response.accessToken || getAccessToken();
      this.persist(response.user);
      if (startSession || !this.sessionStartedAt) this.markSessionStart();
      return response.user;
    },
    async login(payload) {
      const response = await authApi.login(payload);
      if (response.twoFactorRequired) return response;
      this.applyAuth(response, { startSession: true });
      return response;
    },
    async verifyTwoFactor(payload) {
      const response = await authApi.verifyTwoFactor(payload);
      this.applyAuth(response, { startSession: true });
      return response;
    },
    async register(payload) {
      return this.applyAuth(await authApi.register(payload), { startSession: true });
    },
    async switchSchool(payload) {
      return this.applyAuth(await sessionApi.switchSchool(payload));
    },
    async refreshMe() {
      if (!getAccessToken()) return null;
      const me = await authApi.me();
      this.persist(me);
      return me;
    },
    async logout() {
      const refreshToken = localStorage.getItem("shulehub.refreshToken");
      clearTokens();
      this.user = null;
      this.accessToken = null;
      this.sessionStartedAt = null;
      localStorage.removeItem(USER_KEY);
      localStorage.removeItem(SESSION_STARTED_KEY);
      if (!refreshToken) return;
      try {
        await authApi.logout({ refreshToken });
      } catch {
        // already signed out locally
      }
    },
  },
});
