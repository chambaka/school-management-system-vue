import { defineStore } from "pinia";
import { publicApi } from "../api/endpoints";

export const useConfigStore = defineStore("config", {
  state: () => ({
    tenancyMode: "single",
    registrationEnabled: false,
    organizationName: "",
    ready: false,
  }),
  getters: {
    singleTenant: (s) => s.tenancyMode === "single",
  },
  actions: {
    async bootstrap() {
      try {
        const cfg = await publicApi.config();
        this.tenancyMode = cfg.tenancyMode === "single" ? "single" : "multi";
        this.registrationEnabled = Boolean(cfg.registrationEnabled);
        this.organizationName = cfg.organizationName || "";
      } catch {
        this.tenancyMode = "single";
        this.registrationEnabled = false;
        this.organizationName = "";
      }
      this.ready = true;
    },
  },
});
