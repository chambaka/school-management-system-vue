import { defineStore } from "pinia";
import { brandingApi } from "../api/endpoints";

function applyTheme(branding) {
  const root = document.documentElement;
  if (branding?.primaryColor) root.style.setProperty("--primary", branding.primaryColor);
  if (branding?.secondaryColor) root.style.setProperty("--secondary", branding.secondaryColor);
  if (branding?.accentColor) root.style.setProperty("--accent", branding.accentColor);
  if (branding?.name) document.title = `${branding.name} · ShuleHub`;
  else document.title = "ShuleHub · School Management System";
}

function applyDefaults() {
  applyTheme({
    primaryColor: "#F5C451",
    secondaryColor: "#2EE6C8",
    accentColor: "#FF4D8D",
  });
  document.title = "ShuleHub · School Management System";
}

const PLATFORM_HOSTS = new Set(["shulehub.apexglobe.co.tz"]);

export function hostName(host) {
  const value = (host || "").trim().toLowerCase();
  if (value.startsWith("[")) {
    const end = value.indexOf("]");
    return end > 1 ? value.slice(1, end) : value;
  }
  const first = value.indexOf(":");
  const last = value.lastIndexOf(":");
  if (first > 0 && first === last) return value.slice(0, first);
  return value;
}

export function isPlatformHost(host) {
  return PLATFORM_HOSTS.has(hostName(host));
}

export function isLoopbackHost(host) {
  const name = hostName(host);
  return name === "localhost" || name === "127.0.0.1" || name === "0.0.0.0" || name === "::1";
}

export const useBrandingStore = defineStore("branding", {
  state: () => ({
    current: null,
    organizationName: "",
  }),
  actions: {
    setOrganizationName(name) {
      this.organizationName = name || "";
    },
    applySchool(school) {
      if (!school) {
        this.current = null;
        applyDefaults();
        return;
      }
      this.current = school;
      if (school.slug) localStorage.setItem("shulehub.slug", school.slug);
      applyTheme(school);
    },
    async bootstrap() {
      const slug = new URLSearchParams(window.location.search).get("school")
        || localStorage.getItem("shulehub.slug");
      try {
        if (slug) {
          this.current = await brandingApi.bySlug(slug);
        } else if (!isLoopbackHost(window.location.host) && !isPlatformHost(window.location.host)) {
          this.current = await brandingApi.byHost(window.location.host);
        } else {
          this.current = null;
        }
        if (this.current?.slug) localStorage.setItem("shulehub.slug", this.current.slug);
        applyTheme(this.current);
      } catch {
        localStorage.removeItem("shulehub.slug");
        this.current = null;
        applyDefaults();
      }
    },
  },
});
