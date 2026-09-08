import { defineStore } from "pinia";
import { authApi, sessionApi } from "../api/endpoints";
import { clearTokens, getAccessToken, setTokens } from "../api/http";
import { useConfigStore } from "./config";

const USER_KEY = "shulehub.user";

export function homeFor(role) {
  switch (role) {
    case "SUPER_ADMIN":
      return useConfigStore().singleTenant ? "/tenant/schools" : "/platform/tenants";
    case "HEADMASTER":
      return "/dashboard";
    case "ACADEMIC_MASTER":
      return "/dashboard";
    case "ACCOUNTANT":
      return "/finance";
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
  }),
  getters: {
    isAuthed: (s) => Boolean(s.user && getAccessToken()),
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
      this.ready = true;
    },
    persist(user) {
      this.user = user;
      localStorage.setItem(USER_KEY, JSON.stringify(user));
    },
    applyAuth(response) {
      setTokens(response);
      this.persist(response.user);
      return response.user;
    },
    async login(payload) {
      return this.applyAuth(await authApi.login(payload));
    },
    async register(payload) {
      return this.applyAuth(await authApi.register(payload));
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
    logout() {
      clearTokens();
      this.user = null;
      localStorage.removeItem(USER_KEY);
    },
  },
});
